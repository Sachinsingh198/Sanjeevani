import json
import os
import re
from typing import Dict, Optional, List, Any
from app.config import settings

# Comprehensive Garhwali tokens, morphological markers, postpositions and vocabulary
GARHWALI_TOKENS = {
    # Pronouns & determiners
    "miku", "twaku", "twari", "tyar", "tyeri", "hamuku", "wuku", "myaru", "meru", "meri", "hamaru", "hamru",
    "kwahi", "kwai", "kakkh", "kakh", "kile", "kaba", "kab", "kanni", "kani", "katga", "kati",
    # Verbs & auxiliaries
    "chha", "chhi", "chhan", "chhe", "chhon", "chhou", "chhonh", "chhya", "huna", "hooni", "auna", "auni",
    "karu", "kariya", "karnu", "leenu", "batava", "batawa", "hwe", "hwayu", "hwai", "ge", "gye", "ro", "rahyu",
    "ho ro chha", "ho rahyu chha", "hooni chha", "huni chhe", "hwa chha", "lagyun", "lagyu", "lagni", "lagani",
    "dukhnu", "dukhna", "dukhni", "aaundu", "aaundi", "peewa", "khawa", "rakha",
    # Particles, postpositions & adverbs
    "dagad", "dagadi", "bati", "ma", "ni", "bal", "ghani", "ghano", "bhalu", "bhal", "theek ni",
    "byali", "byakhani", "rati", "dhoor", "khali", "ekdam",
    # Symptoms & anatomy
    "mund", "peed", "peer", "bhyo", "dhaad", "khutta", "khutti", "goda", "haat", "aankhi", "aankhiyo",
    "syal", "krodh", "marod", "khang", "chhwaat", "bhaunr", "ghat", "ghaant", "kanth", "jyu",
    # Greetings & cultural markers
    "dainu", "bhula", "bhuli", "daju", "dajyu", "bouji", "pailagon", "badri vishal",

    # Devanagari tokens
    "छ", "छा", "छो", "छन", "छौं", "छौ", "छी", "छ्या", "भ्यो", "मुंड", "पीर", "पीड", "पीड़", "दैणु", "दैन्यू",
    "पहिलागण", "भूला", "कनि", "भालु", "त्वकु", "मिकु", "त्वरि", "त्यर", "त्येरो", "मेरो", "म्यारु", "मेरि",
    "हमुकु", "हमरु", "कख", "किले", "कब", "कबा", "कन्नि", "कतगा", "कति", "खुट्टा", "गोडा", "धड़", "धाड़",
    "घाँट", "गाळ", "कंठ", "लग्यूँ", "लगणी", "औणा", "औणी", "औंदू", "हूण", "हूँदू", "हूँदी", "बतावा", "दगड़",
    "दगड़ी", "बटि", "नी", "घणी", "घणो", "खंग", "छ्वाट", "भौंर", "दाज्यू", "बौजी", "ज्यू", "स्याल", "पैट", "मरोड़"
}

ENGLISH_COMMON_WORDS = {
    "i", "my", "me", "am", "have", "has", "had", "pain", "throat", "headache", "fever", "cough",
    "cold", "stomach", "chest", "doctor", "please", "suggest", "remedy", "what", "how", "can",
    "take", "days", "since", "yesterday", "feeling", "weakness", "vomiting", "dizzy", "hello", "hi"
}


class BhashiniVoiceEngine:
    """
    Regional dialect normalization and voice pipeline bridge.
    Translates colloquial Garhwali phrases into standardized medical terminology,
    provides language auto-detection (Garhwali vs Hindi vs English),
    curates authentic Garhwali clinical dialogue context,
    and coordinates IndicASR / IndicTTS audio formatting.
    """
    def __init__(
        self,
        lexicon_path: str = "DATA/garhwali_lexicon.json",
        dialogues_path: str = "DATA/garhwali_clinical_dialogues.json"
    ):
        self.lexicon_path = lexicon_path
        self.dialogues_path = dialogues_path
        self.lexicon: Dict[str, str] = {}
        self.dialogues_data: Dict[str, Any] = {}
        self._load_lexicon()
        self._load_dialogues()

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

    def _load_dialogues(self):
        """Loads curated clinical dialogue templates and grammar rules."""
        if os.path.exists(self.dialogues_path):
            try:
                with open(self.dialogues_path, "r", encoding="utf-8") as f:
                    self.dialogues_data = json.load(f)
                count = len(self.dialogues_data.get("clinical_dialogues", []))
                print(f"[Bhashini] Loaded {count} curated Garhwali clinical dialogue modules.")
            except Exception as e:
                print(f"[Bhashini] Error loading dialogues {self.dialogues_path}: {e}")

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

    def _check_sarvam_lid(self, text: str) -> Optional[str]:
        """
        Lightweight fallback call to Sarvam Text Language Identification API (/text-lid)
        invoked ONLY when the local heuristic is borderline (garhwali_score == 1).
        """
        api_key = settings.SARVAM_API_KEY or os.getenv("SARVAM_API_KEY", "")
        if not api_key or not api_key.strip():
            return None

        try:
            import httpx
            headers = {
                "api-subscription-key": api_key.strip(),
                "Content-Type": "application/json",
            }
            with httpx.Client(timeout=1.5) as client:
                res = client.post(
                    "https://api.sarvam.ai/text-lid",
                    headers=headers,
                    json={"input": text[:250]},
                )
                if res.status_code == 200:
                    data = res.json()
                    code = data.get("language_code", "")
                    if code.startswith("en"):
                        return "english"
                    elif code.startswith("hi"):
                        return "hindi"
        except Exception:
            # Graceful degrade if offline or network failure
            pass
        return None

    def detect_language(self, text: str) -> str:
        """
        High-accuracy auto-detection of user language:
        Returns 'garhwali', 'english', or 'hindi'.
        First uses fast local heuristics; falls back to Sarvam LID when borderline.
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

        # Fallback check for borderline garhwali score using Sarvam LID
        if garhwali_score == 1:
            lid_lang = self._check_sarvam_lid(lower_text)
            if lid_lang:
                return lid_lang

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
        Provides strict grammatical guardrails for authentic Garhwali language synthesis.
        """
        if is_devanagari:
            return (
                "GARHWALI GRAMMAR & VOCABULARY RULES (गढ़वाली भाषा के नियम):\n"
                "1. परसर्ग (Postpositions) शुद्ध गढ़वाली प्रयोग करें:\n"
                "   - 'मा' (में के स्थान पर) -> जैसे 'मुंड मा', 'पैट मा', 'छाती मा'। कभी भी 'में' न लिखें!\n"
                "   - 'दगड़' / 'दगड़ी' (के साथ के स्थान पर) -> जैसे 'उलटी दगड़', 'बुखार दगड़'। कभी भी 'के साथ' न लिखें!\n"
                "   - 'बटि' (से के स्थान पर) -> जैसे 'कब बटि', 'रात बटि', 'ब्याळि बटि'।\n"
                "   - 'नी' (नहीं के स्थान पर) -> जैसे 'नी छ', 'नी औणी'। कभी भी 'नहीं' न लिखें!\n"
                "2. क्रियाएं (Verbs & Auxiliaries):\n"
                "   - 'छ/छा/छन' (है/हैं), 'छी' (थी), 'हो रयु छ' (हो रहा है), 'हूँदू छ' (होता है), 'लगणी छ' (लग रही है)।\n"
                "   - प्रश्नवाचक: 'कब/कबा' (कब), 'कख' (कहाँ), 'किले' (क्यों), 'कन्नि' (कैसे), 'कतगा' (कितना)।\n"
                "3. आदरसूचक सर्वनाम: 'त्वकु' (आपको), 'त्वरि' (आपकी), 'मिकु' (मुझे), 'हमार' (हमारा)।\n"
                "4. शैली: उत्तराखंड की दयालु, आत्मीय डॉक्टर संजीवनी की तरह बात करें। हर बार सिर्फ एक स्पष्ट प्रश्न पूछें।"
            )
        else:
            return (
                "AUTHENTIC GARHWALI GRAMMAR & VOCABULARY RULES (Roman Script):\n"
                "1. Strictly use authentic Garhwali postpositions:\n"
                "   - Use 'ma' (NEVER use Hindi 'mein') -> e.g. 'mund ma', 'pet ma', 'chhati ma'.\n"
                "   - Use 'dagad' or 'dagadi' (NEVER use Hindi 'ke saath') -> e.g. 'ulti dagad', 'bukhar dagad'.\n"
                "   - Use 'bati' (for since/from) -> e.g. 'kaba bati', 'kal bati', 'raat bati'.\n"
                "   - Use 'ni' (NEVER use Hindi 'nahi') -> e.g. 'ni chha', 'ulti ni chha'.\n"
                "2. Auxiliary verbs and Question words:\n"
                "   - Use 'chha' (is), 'chhan' (are), 'chhi' (was), 'ho rahyu chha' (is happening), 'lagnu chha' (feels).\n"
                "   - Question words: 'kaba bati' (since when), 'kakh' (where), 'kile' (why), 'kanni' (how), 'katga' (how much).\n"
                "   - Pronouns: 'Twaku' (to you), 'Twari' (your), 'Miku' (to me), 'Myaru / Meru' (my).\n"
                "3. Strictly avoid standard Hindi sentences with just 'chha' tagged onto the end. Use real Garhwali phrasing!\n"
                "4. Ask strictly ONE clear question at a time. Empathetic, calm rural doctor tone."
            )

    def get_curated_garhwali_context(self, query_or_notes: str, is_devanagari: bool = False) -> str:
        """
        Dynamically extracts symptom-specific authentic Garhwali dialogue exemplars
        and grammar anchors from the curated knowledge base.
        """
        text_lower = (query_or_notes or "").lower()
        dialogues = self.dialogues_data.get("clinical_dialogues", [])

        matched_exemplars = []
        for entry in dialogues:
            keywords = entry.get("keywords", [])
            if any(k.lower() in text_lower for k in keywords):
                if is_devanagari:
                    dev = entry.get("devanagari", {})
                    matched_exemplars.append(
                        f"नमूना ({entry.get('condition')}):\n"
                        f"- जांच प्रश्न: {dev.get('turn1_intake', '')}\n"
                        f"- चेतावनी जांच: {dev.get('turn2_probing', '')}\n"
                        f"- आंकलन (जांच): {dev.get('turn3_diagnosis', '')}"
                    )
                else:
                    rom = entry.get("roman", {})
                    matched_exemplars.append(
                        f"Exemplar ({entry.get('condition')}):\n"
                        f"- Intake Question: {rom.get('turn1_intake', '')}\n"
                        f"- Warning Probing: {rom.get('turn2_probing', '')}\n"
                        f"- Diagnosis Summary: {rom.get('turn3_diagnosis', '')}"
                    )

        # Fallback to general headache/fatigue exemplar if no specific symptom matched
        if not matched_exemplars and dialogues:
            entry = dialogues[0]
            if is_devanagari:
                dev = entry.get("devanagari", {})
                matched_exemplars.append(
                    f"नमूना:\n"
                    f"- जांच प्रश्न: {dev.get('turn1_intake', '')}\n"
                    f"- चेतावनी जांच: {dev.get('turn2_probing', '')}\n"
                    f"- आंकलन (जांच): {dev.get('turn3_diagnosis', '')}"
                )
            else:
                rom = entry.get("roman", {})
                matched_exemplars.append(
                    f"Exemplar:\n"
                    f"- Intake Question: {rom.get('turn1_intake', '')}\n"
                    f"- Warning Probing: {rom.get('turn2_probing', '')}\n"
                    f"- Diagnosis Summary: {rom.get('turn3_diagnosis', '')}"
                )

        return "\n\n".join(matched_exemplars[:2])

    def format_tts_payload(self, text: str, target_lang: str = "hi") -> Dict[str, str]:
        """
        Cleans markdown syntax (*, #, _, `) from LLM output to prevent TTS synthesis artifacts.
        """
        clean_text = re.sub(r"[*_#`]", "", text).strip()
        clean_text = re.sub(r"\n+", " ", clean_text)
        return {
            "clean_text": clean_text,
            "language": target_lang,
            "sample_rate": "16000"
        }