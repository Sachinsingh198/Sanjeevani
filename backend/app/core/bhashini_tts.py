"""
Bhashini (Digital India / MeitY) Text-to-Speech client.

WHY YOUR CURRENT INTEGRATION IS LIKELY FAILING
------------------------------------------------
Bhashini's public API is a TWO-STEP "ULCA" pipeline, not a single TTS call:

  1) POST https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline
     -> tells you WHICH service/model to use (serviceId) and hands you a
        short-lived `inferenceApiKey` + a `callbackUrl` to actually run it.

  2) POST <callbackUrl>   (this is normally
        https://dhruva-api.bhashini.gov.in/services/inference/pipeline)
     -> using the serviceId + inferenceApiKey from step 1, this is what
        actually returns base64 audio.

The most common reasons people say "it's not working":
  - Calling step 2's URL directly with your ULCA key instead of the
    per-session inferenceApiKey returned by step 1 (401/403).
  - Sending "hi-IN" style language codes instead of Bhashini's plain
    ISO codes ("hi", "ta", "kn", ...).
  - Doing this from the FRONTEND (browser) — Bhashini has no public CORS
    policy for this, and it also leaks your API keys. It must be called
    from the backend.
  - Requesting a language Bhashini doesn't actually serve (e.g. Garhwali —
    it is not one of the 22 scheduled languages Bhashini/Dhruva supports).
    We fall back to Hindi for Garhwali text, since Hindi TTS is
    intelligible to Garhwali speakers and normalization already
    converts most Garhwali phrases to Hindi upstream (bhashini_engine.py).
  - Re-discovering the pipeline (step 1) on every request — it's slow and
    rate-limited. We cache the discovered serviceId/callbackUrl/key per
    language for CACHE_TTL_SECONDS.

Get your credentials from https://bhashini.gov.in (or the Bhashini/ULCA
dashboard your project was issued) and set them as env vars:

    BHASHINI_USER_ID=...
    BHASHINI_ULCA_API_KEY=...
    BHASHINI_PIPELINE_ID=64392f96daac500b55c543cd   # public ASR/TTS/NMT pipeline
    BHASHINI_AUTH_URL=https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline

If these are missing, `is_configured` is False and `synthesize()` raises
`BhashiniNotConfigured` so the API layer can return a clean error instead
of a confusing stack trace.
"""
from __future__ import annotations

import time
import base64
import logging
from dataclasses import dataclass
from typing import Optional, Dict, Any

import httpx

from app.config import settings

logger = logging.getLogger("sanjeevani.bhashini_tts")

CACHE_TTL_SECONDS = 60 * 30  # 30 min — pipeline discovery rarely changes

# Bhashini only serves India's 22 scheduled languages. Garhwali is not
# among them, so we transparently map it to Hindi for TTS purposes.
LANGUAGE_FALLBACK = {
    "garhwali": "hi",
    "hindi": "hi",
    "hi": "hi",
    "en": "en",
    "english": "en",
}

DEFAULT_SAMPLING_RATE = 22050


class BhashiniNotConfigured(RuntimeError):
    pass


class BhashiniRequestError(RuntimeError):
    pass


@dataclass
class _PipelineHandle:
    service_id: str
    callback_url: str
    auth_header_name: str
    auth_header_value: str
    fetched_at: float

    def is_stale(self) -> bool:
        return (time.time() - self.fetched_at) > CACHE_TTL_SECONDS


class BhashiniTTSClient:
    """Thin async client around the Bhashini ULCA TTS pipeline."""

    def __init__(self) -> None:
        self.user_id = settings.BHASHINI_USER_ID
        self.ulca_api_key = settings.BHASHINI_ULCA_API_KEY
        self.pipeline_id = settings.BHASHINI_PIPELINE_ID
        self.auth_url = settings.BHASHINI_AUTH_URL
        self._cache: Dict[str, _PipelineHandle] = {}

    @property
    def is_configured(self) -> bool:
        return bool(self.user_id and self.ulca_api_key and self.pipeline_id)

    def _normalize_language(self, language: str) -> str:
        return LANGUAGE_FALLBACK.get((language or "hi").lower(), "hi")

    async def _discover_pipeline(self, client: httpx.AsyncClient, lang: str) -> _PipelineHandle:
        cached = self._cache.get(lang)
        if cached and not cached.is_stale():
            return cached

        headers = {
            "userID": self.user_id,
            "ulcaApiKey": self.ulca_api_key,
            "Content-Type": "application/json",
        }
        body = {
            "pipelineTasks": [
                {
                    "taskType": "tts",
                    "config": {"language": {"sourceLanguage": lang}},
                }
            ],
            "pipelineRequestConfig": {"pipelineId": self.pipeline_id},
        }

        resp = await client.post(self.auth_url, headers=headers, json=body, timeout=15.0)
        if resp.status_code != 200:
            raise BhashiniRequestError(
                f"Pipeline discovery failed ({resp.status_code}): {resp.text[:300]}"
            )

        data = resp.json()
        try:
            tts_config = next(
                t["config"] for t in data["pipelineResponseConfig"] if t["taskType"] == "tts"
            )
            service_id = tts_config[0]["serviceId"]
            endpoint = data["pipelineInferenceAPIEndPoint"]
            callback_url = endpoint["callbackUrl"]
            auth_header_name = endpoint["inferenceApiKey"]["name"]
            auth_header_value = endpoint["inferenceApiKey"]["value"]
        except (KeyError, IndexError, StopIteration) as e:
            raise BhashiniRequestError(
                f"Unexpected pipeline discovery response shape: {e}. Raw: {str(data)[:500]}"
            )

        handle = _PipelineHandle(
            service_id=service_id,
            callback_url=callback_url,
            auth_header_name=auth_header_name,
            auth_header_value=auth_header_value,
            fetched_at=time.time(),
        )
        self._cache[lang] = handle
        logger.info(f"[Bhashini] Discovered TTS pipeline for '{lang}': service={service_id}")
        return handle

    async def synthesize(
        self,
        text: str,
        language: str = "hi",
        gender: str = "female",
        sampling_rate: int = DEFAULT_SAMPLING_RATE,
    ) -> Dict[str, Any]:
        """
        Returns {"audio_base64": str, "format": "wav", "language": str}.
        Raises BhashiniNotConfigured / BhashiniRequestError on failure —
        callers should catch these and fall back gracefully.
        """
        if not self.is_configured:
            raise BhashiniNotConfigured(
                "Bhashini credentials missing. Set BHASHINI_USER_ID, "
                "BHASHINI_ULCA_API_KEY and BHASHINI_PIPELINE_ID."
            )
        if not text or not text.strip():
            raise BhashiniRequestError("Empty text passed to TTS.")

        lang = self._normalize_language(language)

        async with httpx.AsyncClient() as client:
            handle = await self._discover_pipeline(client, lang)

            infer_body = {
                "pipelineTasks": [
                    {
                        "taskType": "tts",
                        "config": {
                            "language": {"sourceLanguage": lang},
                            "serviceId": handle.service_id,
                            "gender": gender,
                            "samplingRate": sampling_rate,
                        },
                    }
                ],
                "inputData": {"input": [{"source": text}]},
            }
            infer_headers = {
                handle.auth_header_name: handle.auth_header_value,
                "Content-Type": "application/json",
            }

            resp = await client.post(
                handle.callback_url, headers=infer_headers, json=infer_body, timeout=30.0
            )

            if resp.status_code != 200:
                # Stale cached handle is the #1 cause of a sudden 401 here —
                # drop it and let the *next* call rediscover.
                self._cache.pop(lang, None)
                raise BhashiniRequestError(
                    f"TTS inference failed ({resp.status_code}): {resp.text[:300]}"
                )

            data = resp.json()
            try:
                audio_b64 = data["pipelineResponse"][0]["audio"][0]["audioContent"]
            except (KeyError, IndexError) as e:
                raise BhashiniRequestError(
                    f"Unexpected TTS response shape: {e}. Raw: {str(data)[:500]}"
                )

            return {"audio_base64": audio_b64, "format": "wav", "language": lang}

    @staticmethod
    def decode_audio(audio_base64: str) -> bytes:
        return base64.b64decode(audio_base64)


# Single shared instance — the pipeline cache is meant to be process-wide.
bhashini_tts_client = BhashiniTTSClient()