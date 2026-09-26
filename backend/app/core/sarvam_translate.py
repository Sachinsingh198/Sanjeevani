"""
Sarvam AI Machine Translation Client
Model: mayura:v1 / sarvam-translate:v1
Translates canonical Hindi clinical dialogue, triage inquiries, and AYUSH prescriptions 
across all official and regional Indian languages.
Supported: Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia, English.
"""

import os
import re
import hashlib
from typing import Optional, Dict, Any
from collections import OrderedDict
import httpx
from app.config import settings
from app.core.logger import logger


# Mapping of standard language keys/codes to Sarvam AI BCP-47 language codes
SARVAM_LANGUAGE_CODES: Dict[str, str] = {
    "hindi": "hi-IN",
    "hi": "hi-IN",
    "english": "en-IN",
    "en": "en-IN",
    "bengali": "bn-IN",
    "bn": "bn-IN",
    "bangla": "bn-IN",
    "tamil": "ta-IN",
    "ta": "ta-IN",
    "telugu": "te-IN",
    "te": "te-IN",
    "marathi": "mr-IN",
    "mr": "mr-IN",
    "gujarati": "gu-IN",
    "gu": "gu-IN",
    "kannada": "kn-IN",
    "kn": "kn-IN",
    "malayalam": "ml-IN",
    "ml": "ml-IN",
    "punjabi": "pa-IN",
    "pa": "pa-IN",
    "odia": "od-IN",
    "oriya": "od-IN",
    "od": "od-IN",
    "or": "od-IN",
    "garhwali": "hi-IN",  # Garhwali is handled natively via dialect engine
}


def get_sarvam_language_code(language_name_or_code: str) -> str:
    """Resolves any language name, ISO-639-1 code, or BCP-47 tag to a Sarvam language code."""
    if not language_name_or_code:
        return "hi-IN"
    cleaned = language_name_or_code.lower().strip()
    if cleaned in SARVAM_LANGUAGE_CODES:
        return SARVAM_LANGUAGE_CODES[cleaned]
    # Check 2-letter prefix
    prefix = cleaned[:2]
    if prefix in SARVAM_LANGUAGE_CODES:
        return SARVAM_LANGUAGE_CODES[prefix]
    return "hi-IN"


class SarvamTranslateClient:
    """
    Client for Sarvam AI Machine Translation (Mayura v1).
    Used to translate clinical responses and triage dialogues into all Indian languages.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key if api_key is not None else (settings.SARVAM_API_KEY or os.getenv("SARVAM_API_KEY", ""))
        self.endpoint = "https://api.sarvam.ai/translate"
        self._client: Optional[httpx.AsyncClient] = None
        self._sync_client: Optional[httpx.Client] = None
        self._cache: OrderedDict[str, str] = OrderedDict()
        self._max_cache = 500

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=15.0,
                limits=httpx.Limits(max_keepalive_connections=10, max_connections=20, keepalive_expiry=120.0),
            )
        return self._client

    def _get_sync_client(self) -> httpx.Client:
        if self._sync_client is None or self._sync_client.is_closed:
            self._sync_client = httpx.Client(
                timeout=12.0,
                limits=httpx.Limits(max_keepalive_connections=10, max_connections=20, keepalive_expiry=120.0),
            )
        return self._sync_client

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    def _get_cache_key(self, text: str, source: str, target: str) -> str:
        raw = f"{text.strip()}_{source}_{target}"
        return hashlib.md5(raw.encode("utf-8")).hexdigest()

    async def translate_text(
        self,
        text: str,
        source_language_code: str = "hi-IN",
        target_language_code: str = "en-IN",
        mode: str = "formal",
        model: str = "mayura:v1",
    ) -> str:
        """
        Translates text from source language to target Indian language.
        Returns the translated string, or original text on failure.
        """
        if not text or not text.strip():
            return text

        src = get_sarvam_language_code(source_language_code)
        tgt = get_sarvam_language_code(target_language_code)

        # Skip translation if source matches target or target is Hindi and source is Hindi
        if src == tgt or (src.startswith("hi") and tgt.startswith("hi")):
            return text

        cache_key = self._get_cache_key(text, src, tgt)
        if cache_key in self._cache:
            self._cache.move_to_end(cache_key)
            return self._cache[cache_key]

        if not self.is_configured:
            return self._fallback_translate(text, tgt)

        client = self._get_client()
        headers = {
            "api-subscription-key": self.api_key.strip(),
            "Content-Type": "application/json",
        }
        payload = {
            "input": text[:950],
            "source_language_code": src,
            "target_language_code": tgt,
            "mode": mode,
            "model": model,
        }

        try:
            res = await client.post(self.endpoint, json=payload, headers=headers)
            if res.status_code == 200:
                data = res.json()
                translated = data.get("translated_text", "")
                if translated and translated.strip():
                    clean_res = translated.strip()
                    self._cache[cache_key] = clean_res
                    if len(self._cache) > self._max_cache:
                        self._cache.popitem(last=False)
                    return clean_res
            logger.warning(f"[Sarvam Translate] API response {res.status_code}: {res.text[:200]}")
        except Exception as e:
            logger.warning(f"[Sarvam Translate] Request failed: {e}")

        return self._fallback_translate(text, tgt)

    def translate_text_sync(
        self,
        text: str,
        source_language_code: str = "hi-IN",
        target_language_code: str = "en-IN",
    ) -> str:
        """Synchronous version for LangGraph nodes and synchronous pipelines."""
        if not text or not text.strip():
            return text

        src = get_sarvam_language_code(source_language_code)
        tgt = get_sarvam_language_code(target_language_code)

        if src == tgt or (src.startswith("hi") and tgt.startswith("hi")):
            return text

        cache_key = self._get_cache_key(text, src, tgt)
        if cache_key in self._cache:
            self._cache.move_to_end(cache_key)
            return self._cache[cache_key]

        if not self.is_configured:
            return self._fallback_translate(text, tgt)

        headers = {
            "api-subscription-key": self.api_key.strip(),
            "Content-Type": "application/json",
        }
        payload = {
            "input": text[:950],
            "source_language_code": src,
            "target_language_code": tgt,
            "mode": "formal",
            "model": "mayura:v1",
        }

        try:
            client = self._get_sync_client()
            res = client.post(self.endpoint, json=payload, headers=headers)
            if res.status_code == 200:
                data = res.json()
                translated = data.get("translated_text", "")
                if translated and translated.strip():
                    clean_res = translated.strip()
                    self._cache[cache_key] = clean_res
                    if len(self._cache) > self._max_cache:
                        self._cache.popitem(last=False)
                    return clean_res
            logger.warning(f"[Sarvam Translate Sync] Error {res.status_code}: {res.text[:150]}")
        except Exception as e:
            logger.warning(f"[Sarvam Translate Sync] Request failed: {e}")

        return self._fallback_translate(text, tgt)

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
        for pat, rep in replacements:
            out = re.sub(pat, rep, out, flags=re.IGNORECASE)
        return out


sarvam_translate_client = SarvamTranslateClient()
