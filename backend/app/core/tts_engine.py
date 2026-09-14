import os
import io
import re
import hashlib
import asyncio
import httpx
from typing import Optional, Tuple
from app.config import settings
from app.core.bhashini_engine import BhashiniVoiceEngine

bhashini_engine = BhashiniVoiceEngine()

# Cache directory for synthesized audio
AUDIO_CACHE_DIR = os.path.join(os.getcwd(), "models_cache", "audio_tts")
os.makedirs(AUDIO_CACHE_DIR, exist_ok=True)

# Best-in-class Neural Indian Accent voices
INDIAN_VOICES = {
    "hindi": {
        "female": "hi-IN-SwaraNeural",
        "male": "hi-IN-MadhurNeural"
    },
    "garhwali": {
        "female": "hi-IN-SwaraNeural",
        "male": "hi-IN-MadhurNeural"
    },
    "english": {
        "female": "en-IN-NeerjaNeural",
        "male": "en-IN-PrabhatNeural"
    }
}


class IndicTTSEngine:
    """
    High-fidelity backend Text-to-Speech engine.
    Supports:
    1. Official Bhashini / AI4Bharat ULCA Inference Pipeline API (when credentials are provided).
    2. Neural Indian Accent Voice Engine (edge-tts) for 100% natural, authentic Indian accent
       without robotic artifacts or latency.
    """
    def __init__(self):
        # Bhashini / AI4Bharat Credentials from settings or environment
        self.bhashini_user_id = os.getenv("BHASHINI_USER_ID", "")
        self.bhashini_api_key = os.getenv("BHASHINI_API_KEY", "")
        self.bhashini_inference_key = os.getenv("BHASHINI_INFERENCE_KEY", "")
        self.bhashini_endpoint = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"

    def _get_cache_path(self, text: str, voice_name: str) -> str:
        h = hashlib.md5(f"{text}_{voice_name}".encode("utf-8")).hexdigest()
        return os.path.join(AUDIO_CACHE_DIR, f"{h}.mp3")

    def _clean_for_speech(self, text: str) -> str:
        """Removes markdown symbols, hashes, asterisks, URLs, and excessive whitespace."""
        cleaned = re.sub(r"[*_#`~>\[\]]", "", text)
        cleaned = re.sub(r"https?://\S+", "", cleaned)
        cleaned = re.sub(r"\n+", ". ", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned

    async def _synthesize_bhashini(self, text: str, language: str = "hi") -> Optional[bytes]:
        """Synthesizes speech via Bhashini / AI4Bharat ULCA API if credentials are configured."""
        if not (self.bhashini_user_id and self.bhashini_api_key):
            return None

        try:
            lang_code = "hi" if language in ("hi", "garhwali", "hindi") else "en"
            headers = {
                "User-Id": self.bhashini_user_id,
                "Authorization": self.bhashini_api_key,
                "Content-Type": "application/json"
            }
            if self.bhashini_inference_key:
                headers["ulcaApiKey"] = self.bhashini_inference_key

            payload = {
                "pipelineTasks": [
                    {
                        "taskType": "tts",
                        "config": {
                            "language": {"sourceLanguage": lang_code},
                            "gender": "female",
                            "samplingRate": 16000
                        }
                    }
                ],
                "inputData": {
                    "input": [{"source": text}]
                }
            }

            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(self.bhashini_endpoint, json=payload, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    import base64
                    audio_b64 = data["pipelineResponse"][0]["audio"][0]["audioContent"]
                    return base64.b64decode(audio_b64)
                else:
                    print(f"[Bhashini TTS] API responded with status {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[Bhashini TTS] Pipeline call failed: {e}")

        return None

    async def _synthesize_neural_indic(self, text: str, language: str = "hi", gender: str = "female") -> Optional[bytes]:
        """
        Synthesizes speech with authentic native Indian accent and cadence using edge-tts.
        """
        try:
            import edge_tts

            lang_key = "english" if language.lower() in ("en", "english") else "hindi"
            voice = INDIAN_VOICES.get(lang_key, {}).get(gender, "hi-IN-SwaraNeural")

            communicate = edge_tts.Communicate(text, voice)
            audio_buffer = io.BytesIO()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_buffer.write(chunk["data"])

            data = audio_buffer.getvalue()
            return data if len(data) > 0 else None
        except Exception as e:
            print(f"[Neural Indic TTS Error]: {e}")
            return None

    async def synthesize(self, text: str, language: str = "hi", gender: str = "female") -> Tuple[bytes, str]:
        """
        Main TTS entry point:
        1. Checks disk cache for instant playback.
        2. Tries Bhashini / AI4Bharat ULCA pipeline if API keys present.
        3. Falls back to high-fidelity Neural Indian Accent engine (edge-tts).
        Returns: (audio_bytes, content_type)
        """
        clean_text = self._clean_for_speech(text)
        if not clean_text:
            clean_text = "Namaste."

        lang_key = "english" if language.lower() in ("en", "english") else "hindi"
        voice_name = INDIAN_VOICES.get(lang_key, {}).get(gender, "hi-IN-SwaraNeural")
        cache_file = self._get_cache_path(clean_text, voice_name)

        # 1. Check disk cache
        if os.path.exists(cache_file) and os.path.getsize(cache_file) > 100:
            with open(cache_file, "rb") as f:
                return f.read(), "audio/mpeg"

        # 2. Try Bhashini / AI4Bharat ULCA if configured
        audio_data = await self._synthesize_bhashini(clean_text, language=language)

        # 3. Use Neural Indian Accent engine
        if not audio_data:
            audio_data = await self._synthesize_neural_indic(clean_text, language=language, gender=gender)

        if audio_data:
            try:
                with open(cache_file, "wb") as f:
                    f.write(audio_data)
            except Exception as e:
                print(f"[TTS Cache Error]: {e}")
            return audio_data, "audio/mpeg"

        raise RuntimeError("Failed to synthesize audio using any TTS provider.")
