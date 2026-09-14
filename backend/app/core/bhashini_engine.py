import json
import os
import re
from typing import Dict, Optional
from app.config import settings

class BhashiniVoiceEngine:
    """
    Regional dialect normalization and voice pipeline bridge.
    Translates colloquial Garhwali / Kumaoni phrases into standardized medical terminology
    and coordinates IndicASR / IndicTTS audio formatting.
    """
    def __init__(self, lexicon_path: str = "DATA/garhwali_lexicon.json"):
        self.lexicon_path = lexicon_path
        self.lexicon: Dict[str, str] = {}
        self._load_lexicon()

    def _load_lexicon(self):
        """Loads regional dialect phrase mappings from JSON."""
        if os.path.exists(self.lexicon_path):
            with open(self.lexicon_path, "r", encoding="utf-8") as f:
                self.lexicon = json.load(f)
            print(f"[Bhashini] Loaded {len(self.lexicon)} Garhwali dialect translation rules.")
        else:
            print(f"[Bhashini] WARNING: Lexicon not found at {self.lexicon_path}")

    def normalize_dialect(self, text: str) -> str:
        """
        Scans text for regional hill idioms and replaces them with standard clinical terms.
        Case-insensitive and preserves surrounding punctuation and sentence structure.
        """
        if not text or not self.lexicon:
            return text or ""

        normalized = text
        for regional_phrase, standard_term in self.lexicon.items():
            # Use regex to substitute whole phrase matches safely
            pattern = re.compile(re.escape(regional_phrase), re.IGNORECASE)
            normalized = pattern.sub(standard_term, normalized)

        return normalized.strip()

    def format_tts_payload(self, text: str, target_lang: str = "hi") -> Dict[str, str]:
        """
        Cleans markdown syntax (*, #, _, `) from LLM output to prevent TTS synthesis artifacts.
        """
        clean_text = re.sub(r"[*_#`]", "", text).strip()
        return {
            "clean_text": clean_text,
            "language": target_lang,
            "sample_rate": "16000"
        }