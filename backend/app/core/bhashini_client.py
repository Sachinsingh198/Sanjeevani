"""
Bhashini AI (Government of India / MeitY / AI4Bharat) Client
Handles Speech-to-Text (ASR) and Text-to-Speech (TTS) via ULCA / Dhruva inference pipelines.
Supports Indian languages with native regional accents and phoneme models.
"""

import os
import re
import asyncio
import base64
from typing import Optional, Dict, Any, Tuple
import httpx
from app.config import settings
from app.core.logger import logger


class BhashiniNotConfiguredError(RuntimeError):
    """Raised when Bhashini credentials are missing or incomplete."""
    pass


class BhashiniRequestError(RuntimeError):
    """Raised when Bhashini API returns an error."""
    pass


DRAVIDIAN_LANGUAGES = {"ta", "te", "kn", "ml"}

def normalize_bhashini_lang(language: str) -> str:
    if not language:
        return "hi"
    l = language.lower().strip()
    if l in ("hi", "hindi", "garhwali"):
        return "hi"
    if l in ("en", "english"):
        return "en"
    if l in ("bn", "bengali", "bangla"):
        return "bn"
    if l in ("ta", "tamil"):
        return "ta"
    if l in ("te", "telugu"):
        return "te"
    if l in ("mr", "marathi"):
        return "mr"
    if l in ("gu", "gujarati"):
        return "gu"
    if l in ("kn", "kannada"):
        return "kn"
    if l in ("ml", "malayalam"):
        return "ml"
    if l in ("pa", "punjabi"):
        return "pa"
    if l in ("or", "od", "odia", "oriya"):
        return "or"
    if l in ("as", "assamese"):
        return "as"
    return l[:2]


class BhashiniClient:
    """
    Async client for Bhashini ULCA / Dhruva Speech & Audio Services.
    Primary Voice Assistant engine with automatic fallback capabilities across all Indian languages.
    """

    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None
        self._cached_service_ids: Dict[str, str] = {
            "tts_indo_aryan": "ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4",
            "tts_dravidian": "ai4bharat/indic-tts-coqui-dravidian-gpu--t4",
            "asr_hi": "ai4bharat/conformer-hi-gpu--t4",
            "asr_en": "ai4bharat/conformer-hi-gpu--t4",
        }
        self._cached_callback_url: Optional[str] = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=12.0,
                limits=httpx.Limits(max_keepalive_connections=10, max_connections=20, keepalive_expiry=120.0),
            )
        return self._client

    @property
    def user_id(self) -> str:
        return (settings.BHASHINI_USER_ID or os.getenv("BHASHINI_USER_ID", "")).strip()

    @property
    def ulca_api_key(self) -> str:
        return (settings.BHASHINI_ULCA_API_KEY or os.getenv("BHASHINI_ULCA_API_KEY", "")).strip()

    @property
    def inference_api_key(self) -> str:
        k = (settings.BHASHINI_INFERENCE_API_KEY or os.getenv("BHASHINI_INFERENCE_API_KEY", "")).strip()
        if not k:
            candidate = os.getenv("BHASHINI_PIPELINE_ID", "")
            if candidate and (candidate.startswith("019") or candidate.startswith("0l9")):
                k = candidate.strip()
        return k

    @property
    def pipeline_id(self) -> str:
        return (settings.BHASHINI_PIPELINE_ID or "64392f96daac500b55c543cd").strip()

    @property
    def is_configured(self) -> bool:
        return bool(self.user_id and self.ulca_api_key and self.inference_api_key)

    async def get_service_config(self, task_type: str, language: str = "hi") -> Tuple[Optional[str], str]:
        """
        Retrieves the serviceId and callback inference URL for all Indian languages.
        Automatically maps to the appropriate Dravidian or Indo-Aryan GPU cluster.
        """
        lang = normalize_bhashini_lang(language)
        callback_url = self._cached_callback_url or settings.BHASHINI_INFERENCE_URL or "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"

        if task_type == "tts":
            # 1. Custom serviceId override from environment / settings
            custom_tts = getattr(settings, "BHASHINI_TTS_SERVICE_ID", None) or os.getenv("BHASHINI_TTS_SERVICE_ID")
            if custom_tts and str(custom_tts).strip():
                return str(custom_tts).strip(), callback_url

            if lang in DRAVIDIAN_LANGUAGES:
                return "ai4bharat/indic-tts-coqui-dravidian-gpu--t4", callback_url
            else:
                return "ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4", callback_url
        elif task_type == "asr":
            return "ai4bharat/conformer-hi-gpu--t4", callback_url

        return "ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4", callback_url

    async def transcribe(
        self,
        audio_bytes: bytes,
        content_type: str = "audio/wav",
        language: str = "hi"
    ) -> Dict[str, Any]:
        """
        Transcribes spoken audio into text using Bhashini ASR.
        """
        if not self.is_configured:
            raise BhashiniNotConfiguredError("Bhashini is not configured.")

        if not audio_bytes or len(audio_bytes) < 100:
            return {"transcript": "", "language_code": language, "provider": "bhashini", "confidence": 0.0}

        lang = normalize_bhashini_lang(language)
        service_id, callback_url = await self.get_service_config("asr", language=lang)
        if not service_id:
            raise BhashiniRequestError("Could not resolve Bhashini ASR service ID.")

        audio_format = "wav"
        if "webm" in content_type:
            audio_format = "webm"
        elif "mp4" in content_type or "m4a" in content_type:
            audio_format = "m4a"
        elif "mp3" in content_type:
            audio_format = "mp3"

        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "asr",
                    "config": {
                        "language": {"sourceLanguage": lang},
                        "serviceId": service_id,
                        "audioFormat": audio_format,
                        "samplingRate": 16000
                    }
                }
            ],
            "inputData": {
                "audio": [{"audioContent": audio_b64}]
            }
        }
        headers = {
            "Authorization": self.inference_api_key,
            "Content-Type": "application/json"
        }

        try:
            client = self._get_client()
            resp = await client.post(callback_url, json=payload, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                pipeline_resp = data.get("pipelineResponse", [])
                if pipeline_resp and "output" in pipeline_resp[0]:
                    transcript = pipeline_resp[0]["output"][0].get("source", "").strip()
                    return {
                        "transcript": transcript,
                        "language_code": lang,
                        "provider": "bhashini",
                        "confidence": 0.95
                    }
                raise BhashiniRequestError(f"Unexpected Bhashini ASR structure: {data}")
            else:
                raise BhashiniRequestError(f"Bhashini ASR failed with {resp.status_code}: {resp.text[:300]}")
        except Exception as e:
            if isinstance(e, BhashiniRequestError):
                raise
            raise BhashiniRequestError(f"Bhashini ASR request error: {e}")

    async def synthesize(
        self,
        text: str,
        language: str = "hi",
        gender: str = "female"
    ) -> Tuple[bytes, str]:
        """
        Synthesizes text into speech across all Indian languages using Bhashini TTS.
        Returns: (audio_bytes, "audio/wav")
        """
        if not self.is_configured:
            raise BhashiniNotConfiguredError("Bhashini is not configured.")

        clean_text = re.sub(r"[\[\]\(\)\{\}\*\_#\~>`]", " ", text)
        clean_text = re.sub(r"\s+", " ", clean_text).strip()
        if not clean_text:
            clean_text = "Namaste."

        lang = normalize_bhashini_lang(language)
        gender_code = "female" if gender.lower() == "female" else "male"

        service_id, callback_url = await self.get_service_config("tts", language=lang)
        if not service_id:
            raise BhashiniRequestError("Could not resolve Bhashini TTS service ID.")

        # Limit to 380 chars for optimal Dhruva Coqui inference
        tts_source = clean_text[:380]

        payload = {
            "pipelineTasks": [
                {
                    "taskType": "tts",
                    "config": {
                        "language": {"sourceLanguage": lang},
                        "serviceId": service_id,
                        "gender": gender_code
                    }
                }
            ],
            "inputData": {
                "input": [{"source": tts_source}]
            }
        }
        headers = {
            "Authorization": self.inference_api_key,
            "Content-Type": "application/json"
        }

        try:
            client = self._get_client()
            resp = await client.post(callback_url, json=payload, headers=headers)
            
            # If 500/502/503/504 returned, retry once with first sentence only
            if resp.status_code >= 500 and len(tts_source) > 120:
                logger.warning(f"[Bhashini TTS] Received {resp.status_code}, retrying with simplified first sentence...")
                first_sentence = re.split(r'[।?!.]', tts_source)[0].strip() or tts_source[:120]
                payload["inputData"]["input"] = [{"source": first_sentence}]
                await asyncio.sleep(0.2)
                resp = await client.post(callback_url, json=payload, headers=headers)

            if resp.status_code == 200:
                data = resp.json()
                pipeline_resp = data.get("pipelineResponse", [])
                if pipeline_resp and "audio" in pipeline_resp[0]:
                    audio_b64 = pipeline_resp[0]["audio"][0].get("audioContent", "")
                    if audio_b64:
                        return base64.b64decode(audio_b64), "audio/wav"
                raise BhashiniRequestError(f"Unexpected Bhashini TTS structure: {data}")
            else:
                raise BhashiniRequestError(f"Bhashini TTS returned {resp.status_code}: {resp.text[:300]}")
        except Exception as e:
            if isinstance(e, BhashiniRequestError):
                raise
            raise BhashiniRequestError(f"Bhashini TTS error: {e}")


# Shared singleton instance
bhashini_client = BhashiniClient()
