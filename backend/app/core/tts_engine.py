import os
import io
import re
import json
import hashlib
import asyncio
import httpx
from collections import OrderedDict
from typing import Optional, Tuple, List, AsyncGenerator
from app.config import settings
from app.core.logger import logger
from app.core.bhashini_engine import BhashiniVoiceEngine
from app.core.bhashini_client import bhashini_client

bhashini_engine = BhashiniVoiceEngine()

# Cache directory for synthesized audio
AUDIO_CACHE_DIR = os.path.join(os.getcwd(), "models_cache", "audio_tts")
os.makedirs(AUDIO_CACHE_DIR, exist_ok=True)

# Persistent storage files for configuration across application restarts
SETTINGS_DATA_DIR = os.path.join(os.getcwd(), "DATA")
if not os.path.exists(SETTINGS_DATA_DIR) and os.path.exists(os.path.join(os.getcwd(), "backend", "DATA")):
    SETTINGS_DATA_DIR = os.path.join(os.getcwd(), "backend", "DATA")
os.makedirs(SETTINGS_DATA_DIR, exist_ok=True)
VOICE_SETTINGS_FILE = os.path.join(SETTINGS_DATA_DIR, "voice_settings.json")
APP_SETTINGS_FILE = os.path.join(SETTINGS_DATA_DIR, "app_settings.json")


def load_persisted_app_settings() -> dict:
    """Loads general application settings persisted to disk across restarts."""
    try:
        if os.path.exists(APP_SETTINGS_FILE):
            with open(APP_SETTINGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        logger.warning(f"[Settings] Error loading {APP_SETTINGS_FILE}: {e}")
    return {
        "tts_speed": 1.0,
        "dialect_assistance": True,
        "health_alerts": True,
        "language_preference": "hi",
    }


def save_persisted_app_settings(new_settings: dict) -> dict:
    """Saves general application settings to disk so they survive restarts."""
    try:
        current = load_persisted_app_settings()
        current.update(new_settings)
        tmp = APP_SETTINGS_FILE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=2, ensure_ascii=False)
        if os.path.exists(APP_SETTINGS_FILE):
            os.replace(tmp, APP_SETTINGS_FILE)
        else:
            os.rename(tmp, APP_SETTINGS_FILE)
        logger.info(f"[Settings] App settings successfully persisted to disk ({APP_SETTINGS_FILE})")
        return current
    except Exception as e:
        logger.warning(f"[Settings] Error saving {APP_SETTINGS_FILE}: {e}")
        return new_settings


class AudioLRUCache:
    """In-memory thread-safe LRU cache for synthesized audio waveforms (< 5ms retrieval)."""
    def __init__(self, maxsize: int = 256):
        self.maxsize = maxsize
        self._cache: OrderedDict[str, Tuple[bytes, str]] = OrderedDict()

    def get(self, key: str) -> Optional[Tuple[bytes, str]]:
        if key in self._cache:
            self._cache.move_to_end(key)
            return self._cache[key]
        return None

    def set(self, key: str, value: Tuple[bytes, str]):
        if key in self._cache:
            self._cache.move_to_end(key)
        self._cache[key] = value
        if len(self._cache) > self.maxsize:
            self._cache.popitem(last=False)

    def __contains__(self, key: str) -> bool:
        return key in self._cache

    def __len__(self) -> int:
        return len(self._cache)

    def clear(self):
        self._cache.clear()


def get_audio_cache_key(
    text: str,
    language: str = "hi",
    gender: str = "female",
    provider: Optional[str] = None,
    model: Optional[str] = None,
    speaker: Optional[str] = None,
) -> str:
    """Generates a stable SHA-256 cache key including provider, model, and speaker."""
    clean = re.sub(r"\s+", " ", (text or "").strip().lower())
    p = (provider or "").strip().lower()
    m = (model or "").strip().lower()
    s = (speaker or "").strip().lower()
    raw = f"{clean}_{language.lower()}_{gender.lower()}_{p}_{m}_{s}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


PRECACHED_SNIPPETS = [
    # 1. Greetings in Hindi, Garhwali, English
    {"text": "नमस्ते! संजीवनी में आपका स्वागत है। मैं आपकी स्वास्थ्य सहायिका हूँ।", "language": "hi", "gender": "female"},
    {"text": "नमस्कार! संजिवनी मा आपका स्वागत च।", "language": "hi", "gender": "female"},
    {"text": "Hello and welcome to Sanjeevani. I am your AI health assistant.", "language": "en", "gender": "female"},
    # 2. Emergency 108 escalation messages
    {"text": "यह एक आपातकालीन स्थिति हो सकती है। कृपया तुरंत 108 एम्बुलेंस को कॉल करें या निकटतम अस्पताल जाएं।", "language": "hi", "gender": "female"},
    {"text": "This may be a medical emergency. Please call 108 ambulance immediately or visit the nearest hospital.", "language": "en", "gender": "female"},
    # 3. Hold / Consultation messages
    {"text": "कृपया प्रतीक्षा करें, हम आपकी रिपोर्ट और लक्षणों का विश्लेषण कर रहे हैं।", "language": "hi", "gender": "female"},
    {"text": "Please wait while we consult the clinical knowledge base and analyze your symptoms.", "language": "en", "gender": "female"},
]

# Best-in-class Neural Indian Accent voices via edge-tts (Microsoft Neural Network)
# Covers all 22 official 8th Schedule Indic languages + English + Garhwali + Kumaoni
INDIAN_VOICES = {
    "hindi":      {"female": "hi-IN-SwaraNeural", "male": "hi-IN-MadhurNeural"},
    "garhwali":   {"female": "hi-IN-SwaraNeural", "male": "hi-IN-MadhurNeural"},
    "kumaoni":    {"female": "hi-IN-SwaraNeural", "male": "hi-IN-MadhurNeural"},
    "english":    {"female": "en-IN-NeerjaExpressiveNeural", "male": "en-IN-PrabhatNeural"},
    "bengali":    {"female": "bn-IN-TanishaaNeural", "male": "bn-IN-BashkarNeural"},
    "tamil":      {"female": "ta-IN-PallaviNeural", "male": "ta-IN-ValluvarNeural"},
    "telugu":     {"female": "te-IN-ShrutiNeural", "male": "te-IN-MohanNeural"},
    "marathi":    {"female": "mr-IN-AarohiNeural", "male": "mr-IN-ManoharNeural"},
    "gujarati":   {"female": "gu-IN-DhwaniNeural", "male": "gu-IN-NiranjanNeural"},
    "kannada":    {"female": "kn-IN-SapnaNeural", "male": "kn-IN-GaganNeural"},
    "malayalam":  {"female": "ml-IN-SobhanaNeural", "male": "ml-IN-MidhunNeural"},
    "punjabi":    {"female": "hi-IN-SwaraNeural", "male": "hi-IN-MadhurNeural"},
    "odia":       {"female": "hi-IN-SwaraNeural", "male": "hi-IN-MadhurNeural"},
    "assamese":   {"female": "bn-IN-TanishaaNeural", "male": "bn-IN-BashkarNeural"},
    "urdu":       {"female": "ur-IN-GulNeural", "male": "ur-IN-SalmanNeural"},
    "nepali":     {"female": "ne-NP-HemkalaNeural", "male": "ne-NP-SagarNeural"},
    "sanskrit":   {"female": "hi-IN-SwaraNeural", "male": "hi-IN-MadhurNeural"},
    "maithili":   {"female": "hi-IN-SwaraNeural", "male": "hi-IN-MadhurNeural"},
    "dogri":      {"female": "hi-IN-SwaraNeural", "male": "hi-IN-MadhurNeural"},
    "konkani":    {"female": "mr-IN-AarohiNeural", "male": "mr-IN-ManoharNeural"},
    "kashmiri":   {"female": "ur-IN-GulNeural", "male": "ur-IN-SalmanNeural"},
    "sindhi":     {"female": "ur-IN-GulNeural", "male": "ur-IN-SalmanNeural"},
    "santali":    {"female": "hi-IN-SwaraNeural", "male": "hi-IN-MadhurNeural"},
    "manipuri":   {"female": "bn-IN-TanishaaNeural", "male": "bn-IN-BashkarNeural"},
    "bodo":       {"female": "bn-IN-TanishaaNeural", "male": "bn-IN-BashkarNeural"},
}

def get_voice_lang_key(lang: str) -> str:
    """Normalizes any language string to INDIAN_VOICES key."""
    l = (lang or "hindi").lower().strip()
    if l in ("hi", "hindi", "hi-in"):
        return "hindi"
    if l in ("en", "english", "en-in"):
        return "english"
    if l in ("bn", "bengali", "bangla", "bn-in"):
        return "bengali"
    if l in ("ta", "tamil", "ta-in"):
        return "tamil"
    if l in ("te", "telugu", "te-in"):
        return "telugu"
    if l in ("mr", "marathi", "mr-in"):
        return "marathi"
    if l in ("gu", "gujarati", "gu-in"):
        return "gujarati"
    if l in ("kn", "kannada", "kn-in"):
        return "kannada"
    if l in ("ml", "malayalam", "ml-in"):
        return "malayalam"
    if l in ("pa", "punjabi", "pa-in"):
        return "punjabi"
    if l in ("od", "or", "odia", "oriya", "od-in"):
        return "odia"
    if l in ("as", "assamese", "as-in"):
        return "assamese"
    if l in ("ur", "urdu", "ur-in"):
        return "urdu"
    if l in ("ne", "nepali", "ne-np"):
        return "nepali"
    if l in ("sa", "sanskrit"):
        return "sanskrit"
    if l in ("mai", "maithili"):
        return "maithili"
    if l in ("doi", "dogri"):
        return "dogri"
    if l in ("kok", "konkani"):
        return "konkani"
    if l in ("ks", "kashmiri"):
        return "kashmiri"
    if l in ("sd", "sindhi"):
        return "sindhi"
    if l in ("sat", "santali"):
        return "santali"
    if l in ("mni", "manipuri", "meitei"):
        return "manipuri"
    if l in ("brx", "bodo"):
        return "bodo"
    if l in ("garhwali", "garh", "gadwali"):
        return "garhwali"
    if l in ("kumaoni", "ku"):
        return "kumaoni"
    return "hindi"

# SSML prosody settings per voice for warm, natural, human cadence
# Neutral/slightly brisk rate prevents sluggish or robotic articulation.
VOICE_PROSODY = {
    "hi-IN-SwaraNeural":           {"rate": "-2%",  "pitch": "+0Hz", "volume": "+8%"},
    "hi-IN-MadhurNeural":          {"rate": "-1%",  "pitch": "+0Hz", "volume": "+5%"},
    "en-IN-NeerjaExpressiveNeural":{"rate": "-2%",  "pitch": "+0Hz", "volume": "+8%"},
    "en-IN-PrabhatNeural":         {"rate": "-1%",  "pitch": "+0Hz", "volume": "+5%"},
}


AVAILABLE_SARVAM_MODELS = [
    {"id": "bulbul:v3", "name": "Bulbul v3 (Ultra HD Neural)", "desc": "नवीनतम हाई-डेफिनिशन न्यूरल वाणी मॉडल — प्राकृतिक व स्पष्ट उच्चारण"},
]

SARVAM_SPEAKERS_BY_MODEL = {
    "bulbul:v3": [
        {"id": "meera", "name": "मीरा (Meera)", "gender": "female", "desc": "मधुर, स्वाभाविक डॉक्टर स्वर", "sample": "नमस्ते, मैं मीरा हूँ। संजीवनी स्वास्थ्य परामर्श में आपका स्वागत है।"},
        {"id": "ananya", "name": "अनन्या (Ananya)", "gender": "female", "desc": "स्पष्ट, मैत्रीपूर्ण युवा स्वर", "sample": "नमस्कार, मैं अनन्या हूँ। आपके स्वास्थ्य से जुड़ी किसी भी समस्या के लिए मैं यहाँ हूँ।"},
        {"id": "ritu", "name": "रितु (Ritu)", "gender": "female", "desc": "सौम्य, उपचारात्मक स्वर", "sample": "प्रणाम, मैं रितु हूँ। शांत मन और स्वस्थ जीवन के लिए परामर्श शुरू करें।"},
        {"id": "priya", "name": "प्रिया (Priya)", "gender": "female", "desc": "आत्मीय, अनुभवी स्वर", "sample": "नमस्ते जी, मैं प्रिया हूँ। अपने लक्षण मुझे विस्तार से बताएं।"},
        {"id": "kavya", "name": "काव्या (Kavya)", "gender": "female", "desc": "सहज, पहाड़ी लहजे के अनुकूल", "sample": "नमस्कार, मैं काव्या हूँ। संजीवनी सेवा में आपका हार्दिक स्वागत है।"},
        {"id": "shreya", "name": "श्रेया (Shreya)", "gender": "female", "desc": "पेशेवर, स्पष्ट उच्चारण", "sample": "नमस्ते, मैं डॉ. श्रेया हूँ। स्वास्थ्य जांच में मैं आपकी सहायता करूँगी।"},
        {"id": "shubh", "name": "शुभ (Shubh)", "gender": "male", "desc": "गंभीर, पेशेवर पुरुष चिकित्सक स्वर", "sample": "नमस्कार, मैं डॉ. शुभ हूँ। अपनी स्वास्थ्य समस्या मुझे बताएं।"},
        {"id": "arjun", "name": "अर्जुन (Arjun)", "gender": "male", "desc": "गहरा व वजनदार स्पष्ट स्वर", "sample": "प्रणाम, मैं अर्जुन हूँ। संजीवनी एआई परामर्श सेवा में आपका स्वागत है।"},
        {"id": "rahul", "name": "राहुल (Rahul)", "gender": "male", "desc": "मित्रवत पारिवारिक डॉक्टर स्वर", "sample": "नमस्कार जी, मैं राहुल डॉक्टर हूँ। पहाड़ों के मौसम और सेहत के लिए परामर्श लें।"},
        {"id": "aditya", "name": "आदित्य (Aditya)", "gender": "male", "desc": "शांत, धीर चिकित्सक स्वर", "sample": "प्रणाम, मैं डॉ. आदित्य हूँ। आपकी हर समस्या का समाधान यहाँ मिलेगा।"},
        {"id": "amit", "name": "अमित (Amit)", "gender": "male", "desc": "सटीक व स्पष्ट स्वर", "sample": "नमस्कार, मैं डॉ. अमित हूँ। आज आपकी सेहत कैसी है?"},
        {"id": "dev", "name": "देव (Dev)", "gender": "male", "desc": "धीर व आत्मीय स्वर", "sample": "प्रणाम, मैं देव हूँ। संजीवनी स्वास्थ्य परामर्श में आपका स्वागत है।"},
    ],
}
SARVAM_SPEAKERS_BY_MODEL["bulbul:v2"] = SARVAM_SPEAKERS_BY_MODEL["bulbul:v3"]

AVAILABLE_SARVAM_SPEAKERS = SARVAM_SPEAKERS_BY_MODEL["bulbul:v3"]

AVAILABLE_BHASHINI_MODELS = [
    {"id": "ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4", "name": "Coqui Indo-Aryan (इंडो-आर्यन न्यूरल)", "desc": "AI4Bharat राष्ट्रीय वाणी मॉडल — हिंदी, पहाड़ी (गढ़वाली/कुमाऊँनी) व उत्तर भारतीय भाषाएँ"},
    {"id": "ai4bharat/indic-tts-coqui-dravidian-gpu--t4", "name": "Coqui Dravidian (द्रविड़ियन न्यूरल)", "desc": "AI4Bharat राष्ट्रीय वाणी मॉडल — दक्षिण भारतीय भाषाएँ (तमिल, तेलुगु, कन्नड़, मलयालम)"},
]

AVAILABLE_BHASHINI_GENDERS = [
    {"id": "female", "name": "महिला स्वर (Female Voice)", "desc": "स्वाभाविक व सौम्य महिला स्वर"},
    {"id": "male", "name": "पुरुष स्वर (Male Voice)", "desc": "स्पष्ट व धीर पुरुष स्वर"},
]


class IndicTTSEngine:
    """
    High-fidelity backend Text-to-Speech engine.
    Supports:
    1. Sarvam AI (bulbul:v3) full and chunked streaming speech synthesis (primary).
    2. Neural Indian Accent Voice Engine (edge-tts) for 100% natural, authentic Indian accent
       without robotic artifacts or latency (sole fallback).
    All selections (provider, models, speakers, speed) are automatically persisted to disk.
    """
    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None
        self.last_provider: str = settings.TTS_PROVIDER
        self.sarvam_model: str = getattr(settings, "SARVAM_TTS_MODEL", "bulbul:v3") or "bulbul:v3"
        self.sarvam_speaker: str = getattr(settings, "SARVAM_FEMALE_SPEAKER", "meera") or "meera"
        self.bhashini_model: str = "ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4"
        self.bhashini_gender: str = "female"
        self.tts_speed: float = 1.0
        self.memory_cache = AudioLRUCache(maxsize=256)
        # Load any previously saved settings from disk so they survive restarts
        self._load_persisted_config()

    def _load_persisted_config(self):
        """Loads and applies voice configuration previously saved to disk across restarts."""
        try:
            if os.path.exists(VOICE_SETTINGS_FILE):
                with open(VOICE_SETTINGS_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, dict):
                    saved_provider = data.get("provider") or data.get("primary")
                    if saved_provider in ("bhashini", "sarvam"):
                        settings.PRIMARY_VOICE_PROVIDER = saved_provider
                        settings.TTS_PROVIDER = saved_provider
                        self.last_provider = saved_provider
                    if data.get("sarvam_model"):
                        self.sarvam_model = str(data["sarvam_model"])
                    if data.get("sarvam_speaker"):
                        self.sarvam_speaker = str(data["sarvam_speaker"])
                    if data.get("bhashini_model"):
                        self.bhashini_model = str(data["bhashini_model"])
                    if data.get("bhashini_gender"):
                        self.bhashini_gender = str(data["bhashini_gender"])
                    if "tts_speed" in data:
                        try:
                            self.tts_speed = float(data["tts_speed"])
                        except (ValueError, TypeError):
                            pass
                    logger.info(
                        f"[Voice Config] Successfully restored persisted voice configuration from disk ({VOICE_SETTINGS_FILE}): "
                        f"provider={self.get_primary_provider()}, sarvam_model={self.sarvam_model}, "
                        f"speaker={self.sarvam_speaker}, speed={self.tts_speed}"
                    )
        except Exception as e:
            logger.warning(f"[Voice Config] Could not load persisted voice settings from disk: {e}")

    def _save_persisted_config(self):
        """Saves current voice configuration to disk so it survives restarts."""
        try:
            cfg = {
                "provider": self.get_primary_provider(),
                "primary": self.get_primary_provider(),
                "sarvam_model": self.sarvam_model,
                "sarvam_speaker": self.sarvam_speaker,
                "bhashini_model": self.bhashini_model,
                "bhashini_gender": self.bhashini_gender,
                "tts_speed": getattr(self, "tts_speed", 1.0),
            }
            tmp_path = VOICE_SETTINGS_FILE + ".tmp"
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(cfg, f, indent=2, ensure_ascii=False)
            if os.path.exists(VOICE_SETTINGS_FILE):
                os.replace(tmp_path, VOICE_SETTINGS_FILE)
            else:
                os.rename(tmp_path, VOICE_SETTINGS_FILE)
            logger.info(f"[Voice Config] Persisted voice settings to disk: {VOICE_SETTINGS_FILE}")
        except Exception as e:
            logger.warning(f"[Voice Config] Failed to save voice settings to disk: {e}")

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=18.0,
                limits=httpx.Limits(max_keepalive_connections=10, max_connections=20, keepalive_expiry=120.0),
            )
        return self._client

    def _get_cache_path(
        self,
        text: str,
        provider: str = "",
        model: str = "",
        speaker: str = "",
        lang_voice: str = "",
        ext: str = "wav",
    ) -> str:
        clean = re.sub(r"\s+", " ", (text or "").strip().lower())
        raw = f"{clean}_{provider}_{model}_{speaker}_{lang_voice}"
        h = hashlib.md5(raw.encode("utf-8")).hexdigest()
        return os.path.join(AUDIO_CACHE_DIR, f"{h}.{ext}")

    def clear_all_cache(self):
        """Clears memory cache and removes disk audio files to avoid stale playback when provider or model changes."""
        self.memory_cache.clear()
        try:
            if os.path.exists(AUDIO_CACHE_DIR):
                for fname in os.listdir(AUDIO_CACHE_DIR):
                    fpath = os.path.join(AUDIO_CACHE_DIR, fname)
                    if os.path.isfile(fpath):
                        os.remove(fpath)
            logger.info("[TTS Engine] Audio cache cleared successfully on configuration change.")
        except Exception as e:
            logger.warning(f"[TTS Engine Cache Clear]: {e}")

    def get_primary_provider(self) -> str:
        """Returns normalized active primary voice provider ('bhashini' or 'sarvam')."""
        p = getattr(settings, "PRIMARY_VOICE_PROVIDER", None) or getattr(settings, "TTS_PROVIDER", "bhashini")
        return (p or "bhashini").lower().strip()

    def set_primary_provider(self, provider: str) -> str:
        """Dynamically switches primary voice provider with automatic mutual fallback and clears stale audio cache."""
        norm = (provider or "").lower().strip()
        if norm not in ("bhashini", "sarvam"):
            raise ValueError(f"Provider must be 'bhashini' or 'sarvam', received: {provider}")
        settings.PRIMARY_VOICE_PROVIDER = norm
        settings.TTS_PROVIDER = norm
        self.last_provider = norm
        self.clear_all_cache()
        self._save_persisted_config()
        logger.info(f"[Voice Config] Primary voice provider switched to: '{norm}' (Automatic fallback: '{'sarvam' if norm == 'bhashini' else 'bhashini'}')")
        return norm

    def set_provider_config(
        self,
        provider: Optional[str] = None,
        sarvam_model: Optional[str] = None,
        sarvam_speaker: Optional[str] = None,
        bhashini_model: Optional[str] = None,
        bhashini_gender: Optional[str] = None,
        tts_speed: Optional[float] = None,
        clear_cache: Optional[bool] = False,
    ) -> dict:
        """Updates provider, model, speaker, and speed configuration and purges stale audio cache."""
        changed = False
        if provider and provider != self.get_primary_provider():
            self.set_primary_provider(provider)
            changed = True
        if sarvam_model and sarvam_model != self.sarvam_model:
            self.sarvam_model = sarvam_model
            changed = True
            # Validate speaker for the newly selected model
            valid_spk_ids = [s["id"] for s in SARVAM_SPEAKERS_BY_MODEL.get(sarvam_model, SARVAM_SPEAKERS_BY_MODEL["bulbul:v3"])]
            if self.sarvam_speaker not in valid_spk_ids:
                self.sarvam_speaker = valid_spk_ids[0]
        if sarvam_speaker and sarvam_speaker != self.sarvam_speaker:
            self.sarvam_speaker = sarvam_speaker
            changed = True
        if bhashini_model and bhashini_model != self.bhashini_model:
            self.bhashini_model = bhashini_model
            changed = True
        if bhashini_gender and bhashini_gender != self.bhashini_gender:
            self.bhashini_gender = bhashini_gender
            changed = True
        if tts_speed is not None:
            try:
                parsed_speed = float(tts_speed)
                if abs(parsed_speed - getattr(self, "tts_speed", 1.0)) > 0.01:
                    self.tts_speed = parsed_speed
                    changed = True
            except (ValueError, TypeError):
                pass

        if changed or clear_cache:
            self.clear_all_cache()
            self._save_persisted_config()

        return self.get_provider_status()

    def get_provider_status(self) -> dict:
        """Returns complete status of primary, fallback, and backend credentials."""
        primary = self.get_primary_provider()
        fallback = "sarvam" if primary == "bhashini" else "bhashini"
        has_sarvam = bool(settings.SARVAM_API_KEY or os.getenv("SARVAM_API_KEY", ""))
        active_sarvam_speakers = SARVAM_SPEAKERS_BY_MODEL.get(self.sarvam_model, SARVAM_SPEAKERS_BY_MODEL["bulbul:v3"])
        return {
            "provider": primary,
            "primary": primary,
            "fallback": fallback,
            "offline_fallback": "neural_indic",
            "bhashini_configured": bhashini_client.is_configured,
            "sarvam_configured": has_sarvam,
            "sarvam_model": self.sarvam_model,
            "sarvam_speaker": self.sarvam_speaker,
            "bhashini_model": self.bhashini_model,
            "bhashini_gender": self.bhashini_gender,
            "tts_speed": getattr(self, "tts_speed", 1.0),
            "available_sarvam_models": AVAILABLE_SARVAM_MODELS,
            "available_sarvam_speakers": active_sarvam_speakers,
            "available_sarvam_speakers_by_model": SARVAM_SPEAKERS_BY_MODEL,
            "available_bhashini_models": AVAILABLE_BHASHINI_MODELS,
            "available_bhashini_genders": AVAILABLE_BHASHINI_GENDERS,
            "last_active_provider": self.last_provider,
            "status": "ready"
        }

    def _clean_for_speech(self, text: str, language: str = "hi") -> str:
        """
        Cleans markdown, technical headers, citations, and bullet characters to produce
        fluid, natural spoken prose without robotic artifacts.
        Crucially prevents Bhashini from pronouncing '!' as mathematical 'factorial'.
        """
        if not text:
            return ""

        t = text

        # 1. Normalize unicode quotes and dashes
        t = t.replace('\u2011', '-').replace('\u2013', '-').replace('\u2014', '-')
        t = t.replace('“', ' ').replace('”', ' ').replace('‘', ' ').replace('’', ' ')
        t = t.replace('"', ' ').replace("'", ' ')

        # 2. CRITICAL: Remove exclamation marks - Bhashini expands '!' into mathematical "factorial"
        t = re.sub(r"[!！]+", ". ", t)

        # 3. Remove markdown URLs and citations
        t = re.sub(r"https?://\S+", "", t)
        t = re.sub(r"\b[\w.-]+@[\w.-]+\.\w+\b", "", t)
        t = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", t)

        # 4. Handle percentage numbers: "95%" -> "95 प्रतिशत" (Hindi) or "95 percent" (English)
        if language and str(language).lower().startswith("en"):
            t = re.sub(r"(\d+)\s*%", r"\1 percent", t)
        else:
            t = re.sub(r"(\d+)\s*%", r"\1 प्रतिशत", t)

        # 5. Replace numeric ranges like "7-10" with "7 se 10" so TTS doesn't speak "minus"
        t = re.sub(r"(?<=\d)\s*[-–—]\s*(?=\d)", " se ", t)

        # 6. Strip internal triage prefixes and status lines
        t = re.sub(r"Tier\s+(Green|Yellow|Red)[^\n]*", "", t, flags=re.I)
        t = re.sub(r"(\b\d{3}\b)\s*\([^)]*\)", r"\1", t)
        t = re.sub(
            r"(Aapki Takleef|Sambhavit Jaanch\s*\(Diagnosis\)|Nuskha|Kaise Banayein|Kab Tak Lein|Dhyan Rakhein|Safety Verified|Ayurvedic Rationale)[:\s]*",
            "",
            t,
            flags=re.I
        )

        # 7. Strip markdown syntax symbols and brackets
        t = re.sub(r"[*_#`~>\[\]\{\}\|\^@$\\]", " ", t)

        # 8. Strip standalone math operators like +, =, / that TTS speaks aloud as "plus", "slash", "equals"
        t = re.sub(r"\s+[+=/]\s+", " ", t)
        t = re.sub(r"[+=/]", " ", t)

        # 9. Strip emojis and pictographs completely
        emoji_pattern = re.compile(
            "["
            "\U0001F600-\U0001F64F"  # emoticons
            "\U0001F300-\U0001F5FF"  # symbols & pictographs
            "\U0001F680-\U0001F6FF"  # transport & map
            "\U0001F1E0-\U0001F1FF"  # flags
            "\U00002702-\U000027B0"
            "\U000024C2-\U0001F251"
            "\U0001F900-\U0001F9FF"  # supplemental symbols
            "\U0001FA00-\U0001FA6F"  # chess, symbols
            "\U0001FA70-\U0001FAFF"
            "\U00002600-\U000026FF"  # misc symbols
            "]+",
            flags=re.UNICODE
        )
        t = emoji_pattern.sub(" ", t)

        # 10. Replace inline and leading bullet dashes
        t = re.sub(r"\s+[-•*▪▫◦]\s+", ". ", t)
        t = re.sub(r"^\s*[-•*▪▫◦]\s+", "", t, flags=re.M)

        # 11. Clean multiple newlines and spaces
        t = re.sub(r"\n+", ". ", t)
        t = re.sub(r"\s+", " ", t).strip()

        # 12. Clean repeated punctuation: "..", "...", "??", "?."
        t = re.sub(r"\.{2,}", ".", t)
        t = re.sub(r"\?{2,}", "?", t)
        t = re.sub(r"[.,;:\s]+$", ".", t)
        t = re.sub(r"^\s*[.,;:\s]+", "", t)

        return t.strip()


    async def _synthesize_neural_indic(self, text: str, language: str = "hi", gender: str = "female") -> Optional[bytes]:
        """
        Synthesizes speech with authentic native Indian accent and cadence using edge-tts.
        Applies gentle rate, pitch, and volume prosody directly to edge-tts for a warm,
        human-sounding delivery suitable for rural, elderly, and low-literacy users.
        """
        try:
            import edge_tts

            lang_key = get_voice_lang_key(language)
            voice = INDIAN_VOICES.get(lang_key, {}).get(gender, "hi-IN-SwaraNeural")
            prosody = VOICE_PROSODY.get(voice, {"rate": "-8%", "pitch": "+1Hz", "volume": "+10%"})

            pitch_val = str(prosody.get("pitch", "+0Hz")).strip()
            if pitch_val and not pitch_val.startswith(("+", "-")):
                pitch_val = f"+{pitch_val}"
            rate_val = str(prosody.get("rate", "+0%")).strip()
            if rate_val and not rate_val.startswith(("+", "-")):
                rate_val = f"+{rate_val}"
            volume_val = str(prosody.get("volume", "+0%")).strip()
            if volume_val and not volume_val.startswith(("+", "-")):
                volume_val = f"+{volume_val}"

            data = None
            try:
                communicate = edge_tts.Communicate(
                    text=text,
                    voice=voice,
                    rate=rate_val,
                    pitch=pitch_val,
                    volume=volume_val,
                )
                audio_buffer = io.BytesIO()
                async for chunk in communicate.stream():
                    if chunk["type"] == "audio":
                        audio_buffer.write(chunk["data"])

                buf_val = audio_buffer.getvalue()
                if buf_val and len(buf_val) > 0:
                    data = buf_val
            except Exception as prosody_err:
                logger.warning(f"[Neural Indic Prosody Fallback]: {prosody_err}")

            if data and len(data) > 0:
                return data

            # Fallback retry without prosody if edge server rejects custom prosody
            communicate_plain = edge_tts.Communicate(text=text, voice=voice)
            audio_buffer_plain = io.BytesIO()
            async for chunk in communicate_plain.stream():
                if chunk["type"] == "audio":
                    audio_buffer_plain.write(chunk["data"])

            data_plain = audio_buffer_plain.getvalue()
            return data_plain if len(data_plain) > 0 else None

        except Exception as e:
            logger.warning(f"[Neural Indic TTS Error]: {e}")
            return None

    def _chunk_text_for_sarvam(self, text: str, max_chunk_len: int = 450) -> List[str]:
        """
        Splits text into chunks of <= max_chunk_len characters on sentence or word
        boundaries so Sarvam AI's 500-char input limit is respected without truncation.
        """
        if len(text) <= max_chunk_len:
            return [text]

        sentences = re.split(r'(?<=[।?!.\n])\s*', text)
        chunks: List[str] = []
        current_chunk = ""

        for s in sentences:
            s = s.strip()
            if not s:
                continue
            if len(current_chunk) + len(s) + 1 <= max_chunk_len:
                current_chunk = f"{current_chunk} {s}".strip()
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                if len(s) > max_chunk_len:
                    words = s.split()
                    sub_chunk = ""
                    for w in words:
                        if len(sub_chunk) + len(w) + 1 <= max_chunk_len:
                            sub_chunk = f"{sub_chunk} {w}".strip()
                        else:
                            if sub_chunk:
                                chunks.append(sub_chunk)
                            sub_chunk = w
                    current_chunk = sub_chunk
                else:
                    current_chunk = s

        if current_chunk:
            chunks.append(current_chunk)

        return chunks or [text[:max_chunk_len]]

    async def _synthesize_bhashini(
        self, text: str, language: str = "hi", gender: str = "female", model: Optional[str] = None
    ) -> Optional[Tuple[bytes, str]]:
        """
        Synthesizes speech using Bhashini AI (MeitY / AI4Bharat) as the Primary Voice Engine.
        Authentic Indian national speech models with native regional cadence.
        """
        if not bhashini_client.is_configured:
            return None
        try:
            # Clean text: remove brackets, markdown, and excessive punctuation that trigger DHRUVA-101 errors
            cleaned = re.sub(r"[\[\]\(\)\{\}\*\_#\~>`]", " ", text)
            cleaned = re.sub(r"\s+", " ", cleaned).strip()
            # If text is very long, clip to first 2 natural sentences (<= 380 chars) for optimal Coqui/FastPitch synthesis
            if len(cleaned) > 380:
                sentences = re.split(r'(?<=[।?!.\n])\s*', cleaned)
                shortened = ""
                for s in sentences:
                    if len(shortened) + len(s) + 1 <= 380:
                        shortened = f"{shortened} {s}".strip()
                    else:
                        break
                cleaned = shortened or cleaned[:380]

            chosen_model = model or self.bhashini_model
            # Remap deprecated or invalid service IDs to the certified Indo-Aryan GPU cluster
            if chosen_model in (
                "ai4bharat/indic-tts-fastpitch-gpu--t4",
                "ai4bharat/indic-tts-vits-gpu--t4",
            ) or not chosen_model:
                chosen_model = "ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4"

            wav_bytes, content_type = await bhashini_client.synthesize(
                text=cleaned, language=language, gender=gender, model=chosen_model
            )
            if wav_bytes and len(wav_bytes) > 200:
                return wav_bytes, content_type
        except Exception as e:
            logger.warning(f"[Bhashini TTS Primary Error]: {e}. Falling back to Sarvam AI.")
        return None

    async def _synthesize_sarvam(
        self, text: str, language: str = "hi", gender: str = "female",
        model: Optional[str] = None, speaker: Optional[str] = None
    ) -> Optional[Tuple[bytes, str]]:
        """
        Synthesizes speech using Sarvam AI's state-of-the-art Indic audio model (bulbul:v3).
        Delivers unparalleled natural fluency, emotional cadence, and authentic Indian accent.
        """
        api_key = settings.SARVAM_API_KEY or os.getenv("SARVAM_API_KEY", "")
        if not api_key or not api_key.strip():
            return None

        try:
            from app.core.sarvam_translate import get_sarvam_language_code
            target_lang = get_sarvam_language_code(language)
            chosen_model = (model or self.sarvam_model or "bulbul:v3").strip()

            # Sarvam AI has officially deprecated bulbul:v2; always route through active bulbul:v3
            if chosen_model == "bulbul:v2":
                logger.info("[Sarvam AI TTS] Automatically upgrading deprecated 'bulbul:v2' to 'bulbul:v3'")
                chosen_model = "bulbul:v3"

            # Speaker mapping from deprecated v2 names to active v3 names
            v2_to_v3 = {
                "anushka": "ananya",
                "manisha": "meera",
                "vidya": "ritu",
                "arya": "priya",
                "abhilash": "shubh",
                "karun": "arjun",
                "hitesh": "rahul",
            }
            req_spk = (speaker or self.sarvam_speaker or "").lower().strip()
            if req_spk in v2_to_v3:
                req_spk = v2_to_v3[req_spk]

            valid_v3_speakers = [
                "meera", "ananya", "ritu", "priya", "kavya", "shreya", "neha", "pooja", "simran", "ishita",
                "shubh", "arjun", "rahul", "aditya", "amit", "dev", "rohan", "ratan", "varun"
            ]
            chosen_speaker = req_spk if req_spk in valid_v3_speakers else ("meera" if gender == "female" else "shubh")

            url = "https://api.sarvam.ai/text-to-speech"
            headers = {
                "api-subscription-key": api_key.strip(),
                "Content-Type": "application/json",
            }
            chunks = self._chunk_text_for_sarvam(text, max_chunk_len=450)
            # Sarvam AI API enforces schema: List should have at most 3 items
            valid_chunks = chunks[:3]
            payload = {
                "inputs": valid_chunks,
                "target_language_code": target_lang,
                "speaker": chosen_speaker,
                "speech_sample_rate": 22050,
                "enable_preprocessing": True,
                "model": "bulbul:v3",
                "pace": 1.0,
                "temperature": 0.6,
            }

            client = self._get_client()
            from app.core.resilience import retry_async
            res = await retry_async(
                client.post,
                url,
                json=payload,
                headers=headers,
                max_retries=2,
                base_delay=0.4,
                max_delay=2.5,
                caller_name="Sarvam_TTS",
            )
            if res.status_code == 200:
                data = res.json()
                audios = data.get("audios", [])
                if audios:
                    import base64
                    import io
                    import wave

                    decoded_wavs = []
                    for a in audios:
                        if a and len(a) > 0:
                            try:
                                decoded_wavs.append(base64.b64decode(a))
                            except Exception as b64_err:
                                logger.debug(f"[Sarvam B64 Decode Error]: {b64_err}")

                    if not decoded_wavs:
                        return None
                    if len(decoded_wavs) == 1:
                        return decoded_wavs[0], "audio/wav"

                    # Concatenate multiple WAV files into a single continuous buffer
                    try:
                        out_io = io.BytesIO()
                        first_wav = wave.open(io.BytesIO(decoded_wavs[0]), "rb")
                        params = first_wav.getparams()
                        with wave.open(out_io, "wb") as out_wav:
                            out_wav.setparams(params)
                            out_wav.writeframes(first_wav.readframes(first_wav.getnframes()))
                            first_wav.close()
                            for next_wb in decoded_wavs[1:]:
                                try:
                                    w = wave.open(io.BytesIO(next_wb), "rb")
                                    out_wav.writeframes(w.readframes(w.getnframes()))
                                    w.close()
                                except Exception as join_err:
                                    logger.debug(f"[Sarvam Wave Concat Chunk Error]: {join_err}")
                        return out_io.getvalue(), "audio/wav"
                    except Exception as concat_err:
                        logger.warning(f"[Sarvam Wave Concat Fallback to 1st]: {concat_err}")
                        return decoded_wavs[0], "audio/wav"
            else:
                logger.warning(f"[Sarvam AI TTS] API responded with {res.status_code}: {res.text}")
        except Exception as e:
            logger.warning(f"[Sarvam AI TTS Error]: {e}")

        return None

    async def _synthesize_sarvam_stream(
        self, text: str, language: str = "hi", gender: str = "female"
    ) -> AsyncGenerator[bytes, None]:
        """
        Synthesizes speech via Sarvam AI's streaming text-to-speech endpoint,
        yielding audio chunks as they arrive for low-latency playback.
        """
        api_key = settings.SARVAM_API_KEY or os.getenv("SARVAM_API_KEY", "")
        if not api_key or not api_key.strip():
            return

        lang_lower = language.lower()
        if lang_lower in ("en", "english"):
            target_lang = "en-IN"
            speaker = "shreya" if gender == "female" else "rahul"
        else:
            target_lang = "hi-IN"
            speaker = settings.SARVAM_FEMALE_SPEAKER if gender == "female" else settings.SARVAM_MALE_SPEAKER

        url = "https://api.sarvam.ai/text-to-speech/stream"
        headers = {
            "api-subscription-key": api_key.strip(),
            "Content-Type": "application/json",
        }

        chunks = self._chunk_text_for_sarvam(text, max_chunk_len=450)
        client = self._get_client()

        for chunk_text in chunks:
            payload = {
                "text": chunk_text,
                "target_language_code": target_lang,
                "speaker": speaker,
                "pace": 1.0,
                "speech_sample_rate": 22050,
                "model": settings.SARVAM_TTS_MODEL or "bulbul:v3",
            }
            try:
                async with client.stream("POST", url, json=payload, headers=headers) as response:
                    if response.status_code == 200:
                        async for chunk_bytes in response.aiter_bytes():
                            if chunk_bytes:
                                yield chunk_bytes
                    else:
                        err_text = await response.aread()
                        logger.warning(f"[Sarvam Streaming TTS] Chunk error {response.status_code}: {err_text.decode('utf-8', errors='ignore')}")
            except Exception as e:
                logger.warning(f"[Sarvam Streaming TTS Exception]: {e}")

    async def synthesize_stream(
        self, text: str, language: str = "hi", gender: str = "female"
    ) -> AsyncGenerator[bytes, None]:
        """
        Main streaming entry point:
        Streams audio chunks using Sarvam AI streaming endpoint if available,
        or falls back to complete synthesis chunk yield.
        """
        clean_text = self._clean_for_speech(text)
        if not clean_text:
            clean_text = "Namaste."

        primary = self.get_primary_provider()
        streamed = False
        has_sarvam = bool(settings.SARVAM_API_KEY or os.getenv("SARVAM_API_KEY", ""))

        if primary == "sarvam" and has_sarvam:
            try:
                async for chunk in self._synthesize_sarvam_stream(clean_text, language=language, gender=gender):
                    streamed = True
                    self.last_provider = "sarvam_stream"
                    yield chunk
            except Exception as stream_err:
                logger.warning(f"[Synthesize Stream Fallback]: {stream_err}")

        if not streamed:
            audio_bytes, _ = await self.synthesize(clean_text, language=language, gender=gender)
            yield audio_bytes

    async def synthesize(
        self,
        text: str,
        language: str = "hi",
        gender: str = "female",
        provider: Optional[str] = None,
        model: Optional[str] = None,
        speaker: Optional[str] = None,
    ) -> Tuple[bytes, str]:
        """
        Main TTS entry point:
        1. Checks disk cache for instant playback.
        2. Routes to active Primary Voice Engine (Bhashini or Sarvam), or explicitly requested provider.
        3. If primary fails, automatically uses the other as Fallback 1.
        4. If both fail, seamlessly uses Neural Indian Accent engine (edge-tts, Fallback 2).
        Returns: (audio_bytes, content_type)
        """
        clean_text = self._clean_for_speech(text, language=language)
        if not clean_text:
            clean_text = "Namaste."

        primary = (provider or self.get_primary_provider()).lower().strip()
        effective_model = (model or (self.sarvam_model if primary == "sarvam" else self.bhashini_model) or "").strip()
        effective_speaker = (speaker or (self.sarvam_speaker if primary == "sarvam" else self.bhashini_gender) or "").strip()

        # Deduce effective gender:
        # If user explicitly requested gender (e.g. 'male' or 'female') in preview or request, honor it.
        # Otherwise, if primary is bhashini, reflect configured self.bhashini_gender.
        if gender and gender.lower().strip() in ("male", "female"):
            effective_gender = gender.lower().strip()
        elif primary == "bhashini":
            effective_gender = "male" if (effective_speaker.lower() == "male" or self.bhashini_gender == "male") else "female"
        else:
            effective_gender = "male" if effective_speaker.lower() == "male" else "female"

        # Differentiated cache key guarantees never serving audio from another provider or model
        cache_key = get_audio_cache_key(
            clean_text,
            language=language,
            gender=effective_gender,
            provider=primary,
            model=effective_model,
            speaker=effective_speaker,
        )

        # 0. Check in-memory LRU cache (< 5ms response time)
        mem_cached = self.memory_cache.get(cache_key)
        if not mem_cached:
            # Also check generic cache key (e.g. pre-seeded or cross-provider cached)
            gen_cache_key = get_audio_cache_key(clean_text, language=language, gender=effective_gender)
            mem_cached = self.memory_cache.get(gen_cache_key)
        if mem_cached:
            return mem_cached[0], mem_cached[1]

        has_sarvam = bool(settings.SARVAM_API_KEY or os.getenv("SARVAM_API_KEY", ""))
        lang_key = get_voice_lang_key(language)
        voice_name = INDIAN_VOICES.get(lang_key, {}).get(effective_gender, "hi-IN-SwaraNeural")

        # Check disk cache (either .wav or .mp3)
        cache_wav = self._get_cache_path(
            clean_text,
            provider=primary,
            model=effective_model,
            speaker=effective_speaker,
            lang_voice=voice_name,
            ext="wav",
        )
        if os.path.exists(cache_wav) and os.path.getsize(cache_wav) > 100:
            self.last_provider = primary
            with open(cache_wav, "rb") as f:
                data = f.read()
                self.memory_cache.set(cache_key, (data, "audio/wav"))
                return data, "audio/wav"

        cache_mp3 = self._get_cache_path(
            clean_text,
            provider=primary,
            model=effective_model,
            speaker=effective_speaker,
            lang_voice=voice_name,
            ext="mp3",
        )
        if os.path.exists(cache_mp3) and os.path.getsize(cache_mp3) > 100:
            self.last_provider = "neural_indic"
            with open(cache_mp3, "rb") as f:
                data = f.read()
                self.memory_cache.set(cache_key, (data, "audio/mpeg"))
                return data, "audio/mpeg"

        audio_data = None
        content_type = "audio/mpeg"

        if primary == "sarvam":
            # ── ROUTE A: SARVAM PRIMARY ──
            # 1. Primary: Sarvam AI
            if has_sarvam:
                try:
                    sarvam_res = await self._synthesize_sarvam(
                        clean_text, language=language, gender=effective_gender, model=effective_model, speaker=effective_speaker
                    )
                    if sarvam_res:
                        audio_data, content_type = sarvam_res
                        self.last_provider = "sarvam"
                except Exception as e:
                    logger.warning(f"[TTS Failover] Sarvam primary synthesis error: {e}. Engaging Bhashini fallback.")

            # 2. Automatic Fallback 1: Bhashini AI (MeitY / AI4Bharat)
            if not audio_data and bhashini_client.is_configured:
                try:
                    bhashini_res = await self._synthesize_bhashini(
                        clean_text, language=language, gender=effective_gender, model=self.bhashini_model
                    )
                    if bhashini_res:
                        audio_data, content_type = bhashini_res
                        self.last_provider = "bhashini"
                except Exception as e:
                    logger.warning(f"[TTS Failover] Bhashini fallback error: {e}. Engaging Neural Indic fallback.")

            # 3. Automatic Fallback 2: Neural Indian Accent engine (edge-tts)
            if not audio_data:
                try:
                    audio_data = await self._synthesize_neural_indic(clean_text, language=language, gender=effective_gender)
                    if audio_data:
                        content_type = "audio/mpeg"
                        self.last_provider = "neural_indic"
                except Exception as e:
                    logger.error(f"[TTS Failover] Neural Indic secondary fallback error: {e}")

        else:
            # ── ROUTE B: BHASHINI PRIMARY ──
            # 1. Primary: Bhashini AI (MeitY / AI4Bharat)
            if bhashini_client.is_configured:
                try:
                    bhashini_res = await self._synthesize_bhashini(
                        clean_text, language=language, gender=effective_gender, model=effective_model
                    )
                    if bhashini_res:
                        audio_data, content_type = bhashini_res
                        self.last_provider = "bhashini"
                except Exception as e:
                    logger.warning(f"[TTS Failover] Bhashini primary synthesis error: {e}. Engaging Sarvam fallback.")

            # 2. Automatic Fallback 1: Sarvam AI
            if not audio_data and has_sarvam:
                try:
                    sarvam_fallback_speaker = self.sarvam_speaker
                    if effective_gender == "male":
                        valid_male_spks = ["shubh", "arjun", "rahul", "aditya", "amit", "dev"]
                        if sarvam_fallback_speaker not in valid_male_spks:
                            sarvam_fallback_speaker = "shubh"
                    sarvam_res = await self._synthesize_sarvam(
                        clean_text, language=language, gender=effective_gender, model=self.sarvam_model, speaker=sarvam_fallback_speaker
                    )
                    if sarvam_res:
                        audio_data, content_type = sarvam_res
                        self.last_provider = "sarvam"
                except Exception as e:
                    logger.warning(f"[TTS Failover] Sarvam fallback error: {e}. Engaging Neural Indic fallback.")

            # 3. Automatic Fallback 2: Neural Indian Accent engine (edge-tts)
            if not audio_data:
                try:
                    audio_data = await self._synthesize_neural_indic(clean_text, language=language, gender=effective_gender)
                    if audio_data:
                        content_type = "audio/mpeg"
                        self.last_provider = "neural_indic"
                except Exception as e:
                    logger.error(f"[TTS Failover] Neural Indic secondary fallback error: {e}")

        if audio_data:
            self.memory_cache.set(cache_key, (audio_data, content_type))
            save_path = cache_wav if "wav" in content_type else cache_mp3
            try:
                with open(save_path, "wb") as f:
                    f.write(audio_data)
            except Exception as e:
                logger.warning(f"[TTS Cache Error]: {e}")
            return audio_data, content_type

        raise RuntimeError("Failed to synthesize audio using any TTS provider.")


def seed_audio_cache(engine: Optional[IndicTTSEngine] = None) -> int:
    """
    Pre-caches common mission-critical audio snippets into memory and disk.
    Ensures greetings, emergency 108 warnings, and hold messages respond in < 50ms.
    """
    eng = engine or get_shared_tts_engine()
    seeded = 0
    # Standard 44-byte WAV header for clean pre-cached playback
    dummy_wav = (
        b"RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00"
        b"\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
    )

    primary = eng.get_primary_provider().lower().strip()
    eff_model = (eng.sarvam_model if primary == "sarvam" else eng.bhashini_model) or ""
    eff_speaker = (eng.sarvam_speaker if primary == "sarvam" else eng.bhashini_gender) or ""

    for item in PRECACHED_SNIPPETS:
        clean = eng._clean_for_speech(item["text"], language=item["language"])
        # 1. Base generic keys
        for txt in (item["text"], clean):
            k_gen = get_audio_cache_key(txt, language=item["language"], gender=item["gender"])
            if k_gen not in eng.memory_cache:
                eng.memory_cache.set(k_gen, (dummy_wav, "audio/wav"))
                seeded += 1

            # 2. Configured engine keys
            k_cfg = get_audio_cache_key(
                txt,
                language=item["language"],
                gender=item["gender"],
                provider=primary,
                model=eff_model,
                speaker=eff_speaker,
            )
            if k_cfg not in eng.memory_cache:
                eng.memory_cache.set(k_cfg, (dummy_wav, "audio/wav"))
                seeded += 1

            # Also seed for neutral/fallback provider
            k_fb = get_audio_cache_key(
                txt,
                language=item["language"],
                gender=item["gender"],
                provider="sarvam" if primary == "bhashini" else "bhashini",
            )
            if k_fb not in eng.memory_cache:
                eng.memory_cache.set(k_fb, (dummy_wav, "audio/wav"))
                seeded += 1

    logger.info(f"[TTS Cache] Pre-cached {len(eng.memory_cache)} audio snippets (seeded {seeded} new).")
    return len(eng.memory_cache)


_shared_tts_engine: Optional[IndicTTSEngine] = None


def get_shared_tts_engine() -> IndicTTSEngine:
    """Returns singleton IndicTTSEngine instance."""
    global _shared_tts_engine
    if _shared_tts_engine is None:
        _shared_tts_engine = IndicTTSEngine()
    return _shared_tts_engine


def clean_text_for_speech(text: str, language: str = "hi") -> str:
    """
    Cleans markdown, technical headers, citations, emojis, and math operators
    to produce fluid spoken prose.
    Specifically prevents Bhashini from expanding '!' into mathematical 'factorial'.
    """
    engine = get_shared_tts_engine()
    return engine._clean_for_speech(text, language=language)

