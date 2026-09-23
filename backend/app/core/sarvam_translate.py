"""
Sarvam AI Machine Translation Client
Model: mayura:v1
Translates canonical Hindi clinical dialogue and prescriptions to English.
"""

import os
from typing import Optional, Dict, Any
import httpx
from app.config import settings
from app.core.logger import logger


class SarvamTranslateClient:
    """
    Client for Sarvam AI Machine Translation (Mayura v1) API.
    Used to translate canonical Hindi responses into fluent English.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key if api_key is not None else (settings.SARVAM_API_KEY or os.getenv("SARVAM_API_KEY", ""))
        self.endpoint = "https://api.sarvam.ai/translate"
        self._client: Optional[httpx.AsyncClient] = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=15.0,
                limits=httpx.Limits(max_keepalive_connections=10, max_connections=20, keepalive_expiry=120.0),
            )
        return self._client

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    async def translate_text(
        self,
        text: str,
        source_language_code: str = "hi-IN",
        target_language_code: str = "en-IN",
        mode: str = "formal",
        model: str = "mayura:v1",
    ) -> str:
        """
        Translates text from source language (Hindi) to target language (English).
        Returns the translated string, or original text / basic fallback on failure.
        """
        if not text or not text.strip():
            return text

        if not self.is_configured:
            return self._fallback_translate(text, target_language_code)

        client = self._get_client()
        headers = {
            "api-subscription-key": self.api_key.strip(),
            "Content-Type": "application/json",
        }
        payload = {
            "input": text,
            "source_language_code": source_language_code,
            "target_language_code": target_language_code,
            "mode": mode,
            "model": model,
        }

        try:
            res = await client.post(self.endpoint, json=payload, headers=headers)
            if res.status_code == 200:
                data = res.json()
                translated = data.get("translated_text", "")
                if translated and translated.strip():
                    return translated.strip()
            logger.warning(f"[Sarvam Translate] API response {res.status_code}: {res.text[:200]}")
        except Exception as e:
            logger.warning(f"[Sarvam Translate] Request failed: {e}")

        return self._fallback_translate(text, target_language_code)

    def translate_text_sync(
        self,
        text: str,
        source_language_code: str = "hi-IN",
        target_language_code: str = "en-IN",
    ) -> str:
        """Synchronous version for non-async call sites."""
        if not text or not text.strip():
            return text

        if not self.is_configured:
            return self._fallback_translate(text, target_language_code)

        headers = {
            "api-subscription-key": self.api_key.strip(),
            "Content-Type": "application/json",
        }
        payload = {
            "input": text,
            "source_language_code": source_language_code,
            "target_language_code": target_language_code,
            "mode": "formal",
            "model": "mayura:v1",
        }

        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.post(self.endpoint, json=payload, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    translated = data.get("translated_text", "")
                    if translated and translated.strip():
                        return translated.strip()
        except Exception as e:
            logger.warning(f"[Sarvam Translate Sync] Request failed: {e}")

        return self._fallback_translate(text, target_language_code)

    def _fallback_translate(self, text: str, target_lang: str) -> str:
        """Basic fallback dictionary replacements for core clinical phrases if cloud translate is unreachable."""
        if "en" not in target_lang.lower():
            return text

        replacements = [
            (r"\bAapki Takleef\b", "Your Condition"),
            (r"\bSambhavit Jaanch\s*\(Diagnosis\)\b", "Clinical Assessment"),
            (r"\bNuskha\b", "Remedy"),
            (r"\bKaise Banayein\b", "How to Prepare"),
            (r"\bKab Tak Lein\b", "When to Take"),
            (r"\bDhyan Rakhein\b", "Precautions"),
            (r"\bAyurvedic Labh\b", "Ayurvedic Rationale"),
            (r"\b2 din mein aaram na aaye toh 104 par call karein ya PHC jaayein\b",
             "If you do not get relief within 2 days, please call 104 or visit your nearest PHC."),
            (r"\bAapko kya takleef ya lakshan mehsoos ho rahe hain\?.*",
             "What health symptoms or discomfort are you experiencing? Please describe freely."),
            (r"\bMaine aapki takleef sun li\.\b", "I have heard your concern."),
            (r"\bYeh sar dard kab se ho raha hai\?", "How long have you had this headache?"),
            (r"\bTheek hai\. Kya iske sath ulti ya chakkar jaisa bhi mehsoos ho raha hai\?",
             "Understood. Are you also feeling any nausea or dizziness with it?"),
        ]
        out = text
        import re
        for pat, rep in replacements:
            out = re.sub(pat, rep, out, flags=re.IGNORECASE)
        return out


sarvam_translate_client = SarvamTranslateClient()
