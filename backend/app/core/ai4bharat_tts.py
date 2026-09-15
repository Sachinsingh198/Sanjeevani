"""
Self-hosted AI4Bharat TTS engine — no Bhashini/ULCA account required.

Uses `ai4bharat/indic-parler-tts` (public model on Hugging Face, no login
or API key needed) running directly inside this process. This is the
"just works locally" alternative to the Bhashini hosted API, at the cost
of needing to download + run the model yourself.

TRADE-OFFS vs the Bhashini hosted API
--------------------------------------
+ No account creation, no API keys, nothing to configure to get started.
+ No per-request network call to an external service — fully offline
  once the model weights are cached.
- First call after the server boots triggers a one-time download of the
  model (a few GB) from huggingface.co. That needs an internet connection
  ONE TIME; after that the weights are cached locally
  (~/.cache/huggingface by default) and loading is instant.
- Inference is CPU/GPU-bound on YOUR machine. A CUDA GPU is strongly
  recommended — on CPU, expect several seconds per sentence. Set
  AI4BHARAT_TTS_DEVICE=cuda in .env if you have one.
Your chatbot's replies are Hindi written in Roman/Hinglish script
(e.g. "Aapko kya takleef ho rahi hai?"). Indic-Parler-TTS was trained
primarily on native-script (Devanagari) text, so feeding it raw
Hinglish gives noticeably worse pronunciation. This module tries to
fix that automatically, in order of preference:
  1. `ai4bharat-transliteration` (AI4Bharat's own, most accurate) - but
     it depends on `fairseq`, which needs a C/C++ compiler to build. On
     Windows without "Microsoft C++ Build Tools" installed, this package
     will fail to `pip install` - see SETUP below.
  2. `indic-transliteration` (pure Python, no compiler needed, installs
     cleanly everywhere including plain Windows) - a rule-based ITRANS
     scheme converter. Less context-aware than AI4Bharat's model, but a
     solid, zero-hassle fallback.
  3. If NEITHER is installed, we skip transliteration entirely and just
     speak the raw Hinglish text as-is. Still fully functional, just
     slightly less crisp pronunciation.

SETUP
-----
    pip install torch                          # or the CUDA build for your GPU
    pip install "parler-tts @ git+https://github.com/huggingface/parler-tts.git"
    pip install soundfile accelerate

    # Pick ONE transliteration backend (both optional):
    pip install indic-transliteration           # recommended on Windows -- pure Python, no compiler
    # -- or, on Linux/macOS/WSL with a C++ compiler available --
    pip install ai4bharat-transliteration        # more accurate, needs fairseq (C++ build)

No .env values are required to get a working (if slow, CPU) voice. You can
tune these in .env:
    AI4BHARAT_TTS_MODEL=ai4bharat/indic-parler-tts
    AI4BHARAT_TTS_DEVICE=cpu            # or "cuda" / "cuda:0"
    AI4BHARAT_HINDI_FEMALE_SPEAKER=Divya
    AI4BHARAT_HINDI_MALE_SPEAKER=Rohit

The speaker names above are the commonly documented named voices for
Hindi on the indic-parler-tts model card. If AI4Bharat updates the
supported speaker list, just change these two .env values — no code
change needed.
"""
from __future__ import annotations

import io
import base64
import logging
import asyncio
import threading
from typing import Optional, Dict, Any

from app.config import settings

logger = logging.getLogger("sanjeevani.ai4bharat_tts")

_DEVANAGARI_RANGE = range(0x0900, 0x097F + 1)


class TTSNotReadyError(RuntimeError):
    """Raised when synthesis is requested before the model has finished loading."""


class AI4BharatTTSEngine:
    """
    Lazily loads `ai4bharat/indic-parler-tts` in a background thread so the
    FastAPI app can boot immediately, then serves synthesis requests from
    that single cached model instance.
    """

    def __init__(self) -> None:
        self._model = None
        self._tokenizer = None
        self._description_tokenizer = None
        self._xlit_engine = None
        self._xlit_backend: Optional[str] = None  # "ai4bharat" | "indic_transliteration" | None
        self._device = settings.AI4BHARAT_TTS_DEVICE
        self._status = "not_loaded"  # not_loaded | loading | ready | failed
        self._error: Optional[str] = None
        self._load_lock = threading.Lock()

    # ------------------------------------------------------------------ #
    # Lifecycle
    # ------------------------------------------------------------------ #
    def start_background_load(self) -> None:
        """Call once at app startup (see main.py) so the model warms up
        while the rest of the app initializes, instead of stalling the
        very first user's request."""
        with self._load_lock:
            if self._status in ("loading", "ready"):
                return
            self._status = "loading"
        threading.Thread(target=self._load, daemon=True, name="ai4bharat-tts-loader").start()

    def _load(self) -> None:
        try:
            import torch  # noqa: F401
            from parler_tts import ParlerTTSForConditionalGeneration
            from transformers import AutoTokenizer

            model_name = settings.AI4BHARAT_TTS_MODEL
            logger.info(f"[AI4Bharat] Loading TTS model '{model_name}' on {self._device} "
                        f"(first run downloads weights from Hugging Face — this can take a while)...")

            import os
            token = settings.HF_TOKEN or os.getenv("HF_TOKEN") or None

            self._model = ParlerTTSForConditionalGeneration.from_pretrained(
                model_name, token=token
            ).to(self._device)
            self._tokenizer = AutoTokenizer.from_pretrained(model_name, token=token)
            self._description_tokenizer = AutoTokenizer.from_pretrained(
                self._model.config.text_encoder._name_or_path,
                token=token,
            )

            self._load_transliteration_backend()

            self._status = "ready"
            logger.info(f"[AI4Bharat] TTS model ready on {self._device}.")
        except Exception as e:
            self._status = "failed"
            self._error = str(e)
            logger.error(f"[AI4Bharat] Failed to load TTS model: {e}")

    def _load_transliteration_backend(self) -> None:
        """Tries AI4Bharat's own (best quality, needs a C++ compiler for
        `fairseq`), then falls back to `indic-transliteration` (pure
        Python, works everywhere including plain Windows), then gives up
        gracefully and speaks raw Hinglish text."""
        try:
            from ai4bharat.transliteration import XlitEngine
            self._xlit_engine = XlitEngine(beam_width=4, rescore=False)
            self._xlit_backend = "ai4bharat"
            logger.info("[AI4Bharat] Roman->Devanagari transliteration engine loaded (ai4bharat-transliteration).")
            return
        except Exception as e:
            logger.info(f"[AI4Bharat] ai4bharat-transliteration unavailable ({e}); trying indic-transliteration...")

        try:
            from indic_transliteration import sanscript
            self._xlit_engine = sanscript
            self._xlit_backend = "indic_transliteration"
            logger.info("[AI4Bharat] Roman->Devanagari transliteration engine loaded (indic-transliteration, pure Python).")
            return
        except Exception as e:
            logger.warning(
                f"[AI4Bharat] No transliteration backend available ({e}); "
                "Hinglish text will be spoken as-is (slightly lower pronunciation quality). "
                "Install `indic-transliteration` (pip install indic-transliteration) to fix this "
                "without needing a C++ compiler."
            )
            self._xlit_engine = None
            self._xlit_backend = None

    @property
    def status(self) -> Dict[str, Any]:
        return {"status": self._status, "device": self._device, "error": self._error}

    @status.setter
    def status(self, val: Dict[str, Any]) -> None:
        if isinstance(val, dict):
            self._status = val.get("status", self._status)
            self._device = val.get("device", self._device)
            self._error = val.get("error", self._error)

    @status.deleter
    def status(self) -> None:
        pass

    # ------------------------------------------------------------------ #
    # Synthesis
    # ------------------------------------------------------------------ #
    def _is_devanagari(self, text: str) -> bool:
        return any(ord(ch) in _DEVANAGARI_RANGE for ch in text)

    def _maybe_transliterate(self, text: str, lang_code: str) -> str:
        """Converts Roman-script Hindi/Hinglish to Devanagari for better
        pronunciation. No-ops if the transliteration engine isn't
        available, the language isn't Hindi, or the text is already in
        Devanagari."""
        if lang_code != "hi" or not self._xlit_engine or self._is_devanagari(text):
            return text
        try:
            if self._xlit_backend == "ai4bharat":
                result = self._xlit_engine.translit_sentence(text, lang_code)
                return result or text
            elif self._xlit_backend == "indic_transliteration":
                # ITRANS is the closest built-in scheme to casual Hinglish
                # spelling (e.g. "aap", "kaise", "hain"). It's a rule-based
                # scheme converter, not a smart model, so it won't be
                # perfect on every word — but it's dependency-light and
                # noticeably better than raw Roman text for TTS.
                sanscript = self._xlit_engine
                result = sanscript.transliterate(text, sanscript.ITRANS, sanscript.DEVANAGARI)
                return result or text
            return text
        except Exception as e:
            logger.warning(f"[AI4Bharat] Transliteration failed, using raw text: {e}")
            return text

    def _default_description(self, lang_code: str, gender: str) -> str:
        if lang_code == "hi":
            speaker = (
                settings.AI4BHARAT_HINDI_FEMALE_SPEAKER
                if gender == "female"
                else settings.AI4BHARAT_HINDI_MALE_SPEAKER
            )
        else:
            speaker = settings.AI4BHARAT_HINDI_FEMALE_SPEAKER  # model still handles English reasonably
        return (
            f"{speaker}'s voice is calm, warm and natural, speaking at a "
            "moderate pace with clear pronunciation. The recording is "
            "close-sounding with excellent audio quality and no background noise."
        )

    def synthesize_sync(
        self,
        text: str,
        language: str = "hi",
        gender: str = "female",
        description: Optional[str] = None,
    ) -> str:
        """Blocking synthesis call — always run this via a thread executor
        from async code (see `synthesize()` below)."""
        if self._status != "ready":
            raise TTSNotReadyError(f"TTS model not ready (status={self._status})")
        if not text or not text.strip():
            raise ValueError("Empty text passed to TTS.")

        import torch
        import soundfile as sf

        lang_code = "hi" if (language or "hi").lower() in ("hi", "hindi", "garhwali") else "en"
        clean_text = self._maybe_transliterate(text, lang_code)
        desc = description or self._default_description(lang_code, gender)

        desc_ids = self._description_tokenizer(desc, return_tensors="pt").input_ids.to(self._device)
        prompt_ids = self._tokenizer(clean_text, return_tensors="pt").input_ids.to(self._device)

        with torch.no_grad():
            generation = self._model.generate(input_ids=desc_ids, prompt_input_ids=prompt_ids)

        audio = generation.cpu().numpy().squeeze()

        buf = io.BytesIO()
        sf.write(buf, audio, self._model.config.sampling_rate, format="WAV")
        return base64.b64encode(buf.getvalue()).decode("utf-8")

    async def synthesize(
        self,
        text: str,
        language: str = "hi",
        gender: str = "female",
        description: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Async-friendly wrapper: runs the blocking model call in a
        worker thread so it doesn't block the FastAPI event loop."""
        loop = asyncio.get_event_loop()
        audio_b64 = await loop.run_in_executor(
            None, self.synthesize_sync, text, language, gender, description
        )
        lang_code = "hi" if (language or "hi").lower() in ("hi", "hindi", "garhwali") else "en"
        return {"audio_base64": audio_b64, "format": "wav", "language": lang_code}


# Single shared instance — the model must only be loaded once per process.
ai4bharat_tts_engine = AI4BharatTTSEngine()