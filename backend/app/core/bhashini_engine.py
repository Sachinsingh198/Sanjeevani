import json
import os
import re
from typing import Dict, Optional, List
from app.config import settings

# Distinctive Garhwali tokens and morphological markers (Roman and Devanagari)
GARHWALI_TOKENS = {
    # Pronouns & determiners
    "miku", "twaku", "twari", "tyar", "tyeri", "hamuku", "wuku", "kwahi", "kwai", "kakkh", "kile", "kaba", "kanni",
    # Verbs & auxiliaries
    "chha", "chhi", "chhan", "chhe", "chhon", "chhonh", "huna", "auna", "karu", "kariya", "karnu", "leenu", "batava", "batawa",
    "ho ro chha", "ho rahyu chha", "hwa chha", "lagyun", "lagni",
    # Symptoms & anatomy
    "mund", "peed", "peer", "bhyo", "dhaad", "khutta", "haat", "aankhi", "aankhiyo", "syal", "krodh",
    # Greetings & cultural markers
    "dainu", "bhula", "bhuli", "pailagon", "badri vishal", "bhalu", "kani",
    # Devanagari tokens
    "छ", "छा", "छो", "छन", "छौं", "छौ", "भ्यो", "मुंड", "पीर", "पीड", "दैणु", "दैन्यू", "पहिलागण", "भूला", "कनि", "भालु",
    "त्वकु", "मिकु", "त्वरि", "त्यर", "हमुकु", "कख", "किले", "कब", "कन्नि", "खुट्टा", "धड़", "लग्यूँ", "औणा", "हूण", "बतावा"
}

ENGLISH_COMMON_WORDS = {
    "i", "my", "me", "am", "have", "has", "had", "pain", "throat", "headache", "fever", "cough",
    "cold", "stomach", "chest", "doctor", "please", "suggest", "remedy", "what", "how", "can",
    "take", "days", "since", "yesterday", "feeling", "weakness", "vomiting", "dizzy", "hello", "hi"
}


class BhashiniVoiceEngine:
    """
    Regional dialect normalization and voice pipeline bridge.
    Translates colloquial Garhwali / Kumaoni phrases into standardized medical terminology,
    provides language auto-detection (Garhwali vs Hindi vs English),
    and coordinates IndicASR / IndicTTS audio formatting.
    """
    def __init__(self, lexicon_path: str = "DATA/garhwali_lexicon.json"):
        self.lexicon_path = lexicon_path
        self.lexicon: Dict[str, str] = {}
        self._load_lexicon()

    def _load_lexicon(self):
        """Loads regional dialect phrase mappings from JSON."""
        if os.path.exists(self.lexicon_path):
            try:
                with open(self.lexicon_path, "r", encoding="utf-8") as f:
                    self.lexicon = json.load(f)
                print(f"[Bhashini] Loaded {len(self.lexicon)} Garhwali dialect translation rules.")
            except Exception as e:
                print(f"[Bhashini] Error loading lexicon {self.lexicon_path}: {e}")
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
            pattern = re.compile(re.escape(regional_phrase), re.IGNORECASE)
            normalized = pattern.sub(standard_term, normalized)

        return normalized.strip()

    def detect_language(self, text: str) -> str:
        """
        High-accuracy auto-detection of user language:
        Returns 'garhwali', 'english', or 'hindi'.
        """
        if not text or not text.strip():
            return "hindi"

        lower_text = text.lower().strip()
        words = re.findall(r"[\w\u0900-\u097F]+", lower_text)
        if not words:
            return "hindi"

        # 1. Check for distinct Garhwali tokens / phrases
        garhwali_score = 0
        for token in GARHWALI_TOKENS:
            if " " in token:
                if token in lower_text:
                    garhwali_score += 3
            else:
                if token in words:
                    garhwali_score += 2

        # Check lexicon keys
        for key in self.lexicon.keys():
            if key.lower() in lower_text:
                garhwali_score += 3

        if garhwali_score >= 2:
            return "garhwali"

        # 2. Check for English (Latin alphabet dominated with common English words)
        has_devanagari = any(re.search(r"[\u0900-\u097F]", w) for w in words)
        if not has_devanagari:
            english_hits = sum(1 for w in words if w in ENGLISH_COMMON_WORDS)
            english_ratio = english_hits / len(words)
            if english_hits >= 2 or (len(words) <= 3 and english_hits >= 1):
                return "english"

        # 3. Default to Hindi (includes Hinglish / Devanagari Hindi)
        return "hindi"

    def get_garhwali_guidance(self, is_devanagari: bool = False) -> str:
        """
        Provides prompt guidance and few-shot examples for authentic Garhwali dialogue.
        """
        if is_devanagari:
            return (
                "GARHWALI LANGUAGE GUIDANCE (गढ़वाली भाषा निर्देश):\n"
                "- आप उत्तराखंड की प्यारी, अनुभवी डॉक्टर 'संजीवनी' हैं।\n"
                "- रोगी से शुद्ध, मधुर गढ़वाली भाषा (देवनागरी लिपि) में बात करें।\n"
                "- मुख्य शब्द: 'त्वकु' (आपको), 'मिकु' (मुझे), 'त्वरि' (आपकी), 'छ/छा/छन' (है/हैं), 'भ्यो/पीर' (दर्द), 'मुंड' (सिर), 'खुट्टा' (पैर), 'बतावा' (बताइए), 'दैणु' (नमस्ते)।\n"
                "- हर संदेश में सिर्फ एक छोटा प्रश्न पूछें।\n"
            )
        else:
            return (
                "GARHWALI LANGUAGE GUIDANCE:\n"
                "- You are Dr. Sanjeevani, a warm, caring doctor in Uttarakhand speaking in authentic GARHWALI.\n"
                "- Speak in natural Garhwali (Roman script, as the patient used):\n"
                "  * Use authentic Garhwali pronouns & verbs: 'Twaku' (to you), 'Miku' (to me), 'Twari' (your), 'chha/chhi/chhan' (is/are), 'ho rahyu chha' (is happening), 'batava' (tell), 'bhyo / peer' (pain), 'mund' (head), 'dainu bhula' (hello friend).\n"
                "  * Example questions:\n"
                "    - Duration: 'Yeh takleef kab se ho rahyu chha? Kitna din hwai ge?'\n"
                "    - Fever: 'Kya saath ma bukhar ya kamzori bhi lagni chha?'\n"
                "    - History: 'Kya twaku pehle se High BP, acidity ya garbh (pregnancy) chha?'\n"
                "- Ask strictly ONE clear question at a time. Maximum 2 short sentences.\n"
            )

    def format_tts_payload(self, text: str, target_lang: str = "hi") -> Dict[str, str]:
        """
        Cleans markdown syntax (*, #, _, `) from LLM output to prevent TTS synthesis artifacts.
        """
        clean_text = re.sub(r"[*_#`]", "", text).strip()
        # Clean extra brackets and multiple newlines
        clean_text = re.sub(r"\n+", " ", clean_text)
        return {
            "clean_text": clean_text,
            "language": target_lang,
            "sample_rate": "16000"
        }