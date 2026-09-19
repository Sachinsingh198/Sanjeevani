"""
Sarvam AI Speech-to-Text (STT) Client
Model: saaras:v3
Supports code-mixed Hindi, Garhwali, and English spoken inputs from rural/semi-urban healthcare users.
"""

import os
from typing import Optional, Dict, Any
import httpx
from app.config import settings


class SarvamNotConfiguredError(RuntimeError):
    """Raised when SARVAM_API_KEY is not set or empty."""
    pass


class SarvamSTTRequestError(RuntimeError):
    """Raised when the Sarvam STT API returns an error or invalid response."""
    pass


class SarvamSTTClient:
    """
    Async client for Sarvam AI Speech-to-Text (Saaras v3) API.
    Replaces Web Speech API with native Indian dialect recognition.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key if api_key is not None else (settings.SARVAM_API_KEY or os.getenv("SARVAM_API_KEY", ""))
        self.endpoint = "https://api.sarvam.ai/speech-to-text"
        self._client: Optional[httpx.AsyncClient] = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=25.0,
                limits=httpx.Limits(max_keepalive_connections=10, max_connections=20, keepalive_expiry=120.0),
            )
        return self._client

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    async def transcribe_audio(
        self,
        audio_bytes: bytes,
        content_type: str = "audio/wav",
        model: str = "saaras:v3",
        mode: str = "codemix",
        language_code: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Transcribes raw audio bytes using Sarvam Saaras v3.
        
        Args:
            audio_bytes: Binary audio data (wav, webm, mp3, mp4, etc.)
            content_type: MIME type of audio (default: audio/wav)
            model: Sarvam STT model (default: "saaras:v3")
            mode: Recognition mode ("codemix" for natural Hindi/Garhwali/English switching)
            language_code: Optional hint (e.g., "hi-IN")
            
        Returns:
            Dict containing:
                - transcript: str
                - language_code: str
                - language_probability: Optional[float]
                - request_id: Optional[str]
        """
        if not self.is_configured:
            raise SarvamNotConfiguredError("SARVAM_API_KEY is not configured in environment or settings.")

        if not audio_bytes or len(audio_bytes) < 100:
            return {"transcript": "", "language_code": language_code or "hi-IN", "language_probability": 0.0}

        # Determine safe file extension
        ext = "wav"
        if "webm" in content_type:
            ext = "webm"
        elif "mp4" in content_type or "m4a" in content_type:
            ext = "m4a"
        elif "mp3" in content_type or "mpeg" in content_type:
            ext = "mp3"
        elif "ogg" in content_type:
            ext = "ogg"

        client = self._get_client()
        headers = {
            "api-subscription-key": self.api_key.strip(),
        }

        files = {
            "file": (f"speech_input.{ext}", audio_bytes, content_type),
        }
        data = {
            "model": model,
            "mode": mode,
        }
        if language_code:
            data["language_code"] = language_code

        try:
            response = await client.post(
                self.endpoint,
                headers=headers,
                files=files,
                data=data,
            )
        except Exception as net_err:
            raise SarvamSTTRequestError(f"Network error connecting to Sarvam STT: {net_err}") from net_err

        if response.status_code != 200:
            err_msg = f"Sarvam STT failed with status {response.status_code}: {response.text}"
            raise SarvamSTTRequestError(err_msg)

        try:
            result = response.json()
        except Exception as json_err:
            raise SarvamSTTRequestError(f"Failed to parse Sarvam STT JSON response: {json_err}") from json_err

        return {
            "transcript": result.get("transcript", "").strip(),
            "language_code": result.get("language_code", language_code or "hi-IN"),
            "language_probability": result.get("language_probability"),
            "request_id": result.get("request_id"),
        }

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()


# Shared singleton instance
sarvam_stt_client = SarvamSTTClient()
