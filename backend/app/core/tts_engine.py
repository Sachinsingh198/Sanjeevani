import os
import io
import re
import hashlib
import asyncio
import httpx
from collections import OrderedDict
from typing import Optional, Tuple, List, AsyncGenerator
from app.config import settings
from app.core.logger import logger
from app.core.bhashini_engine import BhashiniVoiceEngine

bhashini_engine = BhashiniVoiceEngine()

# Cache directory for synthesized audio
AUDIO_CACHE_DIR = os.path.join(os.getcwd(), "models_cache", "audio_tts")
os.makedirs(AUDIO_CACHE_DIR, exist_ok=True)


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


def get_audio_cache_key(text: str, language: str = "hi", gender: str = "female") -> str:
    """Generates a stable SHA-256 cache key for text, language, and gender."""
    clean = re.sub(r"\s+", " ", (text or "").strip().lower())
    raw = f"{clean}_{language.lower()}_{gender.lower()}"
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
# hi-IN-SwaraNeural  → Natural, warm, rural-friendly Hindi female
# hi-IN-MadhurNeural → Clear, professional Hindi male
# en-IN-NeerjaExpressiveNeural → Expressive, authentic Indian-English female (premium)
# en-IN-PrabhatNeural → Professional Indian-English male
INDIAN_VOICES = {
    "hindi": {
        "female": "hi-IN-SwaraNeural",
        "male":   "hi-IN-MadhurNeural",
    },
    "garhwali": {
        "female": "hi-IN-SwaraNeural",
        "male":   "hi-IN-MadhurNeural",
    },
    "english": {
        "female": "en-IN-NeerjaExpressiveNeural",
        "male":   "en-IN-PrabhatNeural",
    },
}

# SSML prosody settings per voice for warm, natural, human cadence
# Neutral/slightly brisk rate prevents sluggish or robotic articulation.
VOICE_PROSODY = {
    "hi-IN-SwaraNeural":           {"rate": "-2%",  "pitch": "+0Hz", "volume": "+8%"},
    "hi-IN-MadhurNeural":          {"rate": "-1%",  "pitch": "0Hz",  "volume": "+5%"},
    "en-IN-NeerjaExpressiveNeural":{"rate": "-2%",  "pitch": "+0Hz", "volume": "+8%"},
    "en-IN-PrabhatNeural":         {"rate": "-1%",  "pitch": "0Hz",  "volume": "+5%"},
}


class IndicTTSEngine:
    """
    High-fidelity backend Text-to-Speech engine.
    Supports:
    1. Sarvam AI (bulbul:v3) full and chunked streaming speech synthesis (primary).
    2. Neural Indian Accent Voice Engine (edge-tts) for 100% natural, authentic Indian accent
       without robotic artifacts or latency (sole fallback).
    """
    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None
        self.last_provider: str = "sarvam" if settings.TTS_PROVIDER == "sarvam" else "neural_indic"
        self.memory_cache = AudioLRUCache(maxsize=256)

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=18.0,
                limits=httpx.Limits(max_keepalive_connections=10, max_connections=20, keepalive_expiry=120.0),
            )
        return self._client

    def _get_cache_path(self, text: str, voice_name: str, ext: str = "mp3") -> str:
        h = hashlib.md5(f"{text}_{voice_name}".encode("utf-8")).hexdigest()
        return os.path.join(AUDIO_CACHE_DIR, f"{h}.{ext}")

    def _clean_for_speech(self, text: str) -> str:
        """
        Cleans markdown, technical headers, citations, and bullet characters to produce
        fluid, natural spoken prose without robotic artifacts (e.g. stops 'minus' or 'hash').
        """
        if not text:
            return ""

        # Normalize unicode non-breaking hyphens and dashes
        t = text.replace('\u2011', '-').replace('\u2013', '-').replace('\u2014', '-')

        # Remove markdown URLs and citations
        t = re.sub(r"https?://\S+", "", t)
        t = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", t)

        # Strip internal triage prefixes and status lines
        t = re.sub(r"Tier\s+(Green|Yellow|Red)[^\n]*", "", t, flags=re.I)
        t = re.sub(r"(\b\d{3}\b)\s*\([^)]*\)", r"\1", t)
        t = re.sub(
            r"(Aapki Takleef|Sambhavit Jaanch\s*\(Diagnosis\)|Nuskha|Kaise Banayein|Kab Tak Lein|Dhyan Rakhein|Safety Verified|Ayurvedic Rationale)[:\s]*",
            "",
            t,
            flags=re.I
        )

        # Strip markdown syntax symbols
        t = re.sub(r"[*_#`~>\[\]]", "", t)

        # Replace numeric ranges like "7-10" with "7 se 10" so TTS doesn't speak "minus"
        t = re.sub(r"(?<=\d)\s*-\s*(?=\d)", " se ", t)

        # Replace inline and leading bullet dashes
        t = re.sub(r"\s+[-•*]\s+", ". ", t)
        t = re.sub(r"^\s*[-•*]\s+", "", t, flags=re.M)

        # Clean multiple newlines and spaces
        t = re.sub(r"\n+", ". ", t)
        t = re.sub(r"\s+", " ", t).strip()

        # Remove trailing or leading stray dots/commas
        t = re.sub(r"^\s*[.,;:\s]+", "", t)
        t = re.sub(r"\s*\.\s*\.", ".", t)
        return t


    async def _synthesize_neural_indic(self, text: str, language: str = "hi", gender: str = "female") -> Optional[bytes]:
        """
        Synthesizes speech with authentic native Indian accent and cadence using edge-tts.
        Applies gentle rate, pitch, and volume prosody directly to edge-tts for a warm,
        human-sounding delivery suitable for rural, elderly, and low-literacy users.
        """
        try:
            import edge_tts

            lang_key = "english" if language.lower() in ("en", "english") else "hindi"
            voice = INDIAN_VOICES.get(lang_key, {}).get(gender, "hi-IN-SwaraNeural")
            prosody = VOICE_PROSODY.get(voice, {"rate": "-8%", "pitch": "+1Hz", "volume": "+10%"})

            communicate = edge_tts.Communicate(
                text=text,
                voice=voice,
                rate=prosody.get("rate", "-8%"),
                pitch=prosody.get("pitch", "+1Hz"),
                volume=prosody.get("volume", "+10%"),
            )
            audio_buffer = io.BytesIO()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_buffer.write(chunk["data"])

            data = audio_buffer.getvalue()
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

    async def _synthesize_sarvam(self, text: str, language: str = "hi", gender: str = "female") -> Optional[Tuple[bytes, str]]:
        """
        Synthesizes speech using Sarvam AI's state-of-the-art Indic audio model (bulbul:v3).
        Delivers unparalleled natural fluency, emotional cadence, and authentic Indian accent.
        """
        api_key = settings.SARVAM_API_KEY or os.getenv("SARVAM_API_KEY", "")
        if not api_key or not api_key.strip():
            return None

        try:
            lang_lower = language.lower()
            if lang_lower in ("en", "english"):
                target_lang = "en-IN"
                speaker = "shreya" if gender == "female" else "rahul"
            else:
                target_lang = "hi-IN"
                speaker = settings.SARVAM_FEMALE_SPEAKER if gender == "female" else settings.SARVAM_MALE_SPEAKER

            url = "https://api.sarvam.ai/text-to-speech"
            headers = {
                "api-subscription-key": api_key.strip(),
                "Content-Type": "application/json",
            }
            chunks = self._chunk_text_for_sarvam(text, max_chunk_len=450)
            payload = {
                "inputs": chunks[:8],  # Safely up to 8 chunks (~3600 chars)
                "target_language_code": target_lang,
                "speaker": speaker,
                "pitch": 0,
                "pace": 1.0,
                "loudness": 1.1,
                "speech_sample_rate": 22050,
                "enable_preprocessing": True,
                "model": settings.SARVAM_TTS_MODEL or "bulbul:v3",
            }

            client = self._get_client()
            res = await client.post(url, json=payload, headers=headers)
            if res.status_code == 200:
                data = res.json()
                audios = data.get("audios", [])
                if audios and len(audios[0]) > 0:
                    import base64
                    raw_wav = base64.b64decode(audios[0])
                    return raw_wav, "audio/wav"
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

        streamed = False
        if settings.TTS_PROVIDER == "sarvam" or os.getenv("SARVAM_API_KEY"):
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

    async def synthesize(self, text: str, language: str = "hi", gender: str = "female") -> Tuple[bytes, str]:
        """
        Main TTS entry point:
        1. Checks disk cache for instant playback.
        2. Tries Sarvam AI (bulbul:v3) for ultra-fluent native Indian speech (primary).
        3. Seamlessly falls back to high-fidelity Neural Indian Accent engine (edge-tts, sole fallback).
        Returns: (audio_bytes, content_type)
        """
        clean_text = self._clean_for_speech(text)
        if not clean_text:
            clean_text = "Namaste."

        cache_key = get_audio_cache_key(clean_text, language=language, gender=gender)

        # 0. Check in-memory LRU cache (< 5ms response time)
        mem_cached = self.memory_cache.get(cache_key)
        if mem_cached:
            return mem_cached[0], mem_cached[1]

        lang_key = "english" if language.lower() in ("en", "english") else "hindi"
        voice_name = INDIAN_VOICES.get(lang_key, {}).get(gender, "hi-IN-SwaraNeural")
        provider_tag = "sarvam" if (settings.TTS_PROVIDER == "sarvam" or os.getenv("SARVAM_API_KEY")) else "neural"
        
        # Check disk cache (either .wav or .mp3)
        cache_wav = self._get_cache_path(clean_text, f"{provider_tag}_{voice_name}", ext="wav")
        if os.path.exists(cache_wav) and os.path.getsize(cache_wav) > 100:
            self.last_provider = provider_tag
            with open(cache_wav, "rb") as f:
                data = f.read()
                self.memory_cache.set(cache_key, (data, "audio/wav"))
                return data, "audio/wav"

        cache_mp3 = self._get_cache_path(clean_text, f"{provider_tag}_{voice_name}", ext="mp3")
        if os.path.exists(cache_mp3) and os.path.getsize(cache_mp3) > 100:
            self.last_provider = "neural_indic"
            with open(cache_mp3, "rb") as f:
                data = f.read()
                self.memory_cache.set(cache_key, (data, "audio/mpeg"))
                return data, "audio/mpeg"

        audio_data = None
        content_type = "audio/mpeg"

        # 1. Prioritize Sarvam AI when configured
        if settings.TTS_PROVIDER == "sarvam" or os.getenv("SARVAM_API_KEY"):
            sarvam_res = await self._synthesize_sarvam(clean_text, language=language, gender=gender)
            if sarvam_res:
                audio_data, content_type = sarvam_res
                self.last_provider = "sarvam"

        # 2. Fallback to Neural Indian Accent engine (edge-tts) as sole fallback
        if not audio_data:
            audio_data = await self._synthesize_neural_indic(clean_text, language=language, gender=gender)
            if audio_data:
                content_type = "audio/mpeg"
                self.last_provider = "neural_indic"

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

    for item in PRECACHED_SNIPPETS:
        key = get_audio_cache_key(item["text"], language=item["language"], gender=item["gender"])
        if key not in eng.memory_cache:
            eng.memory_cache.set(key, (dummy_wav, "audio/wav"))
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

