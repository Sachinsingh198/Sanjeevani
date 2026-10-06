import json
import os
import re
from typing import Dict, Optional, List, Any
from app.config import settings
from app.core.logger import logger

from app.core.clinical_lexicon import GARHWALI_TOKENS, ENGLISH_COMMON_WORDS


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
        if not os.path.exists(lexicon_path) and os.path.exists(os.path.join("backend", lexicon_path)):
            lexicon_path = os.path.join("backend", lexicon_path)
        if not os.path.exists(dialogues_path) and os.path.exists(os.path.join("backend", dialogues_path)):
            dialogues_path = os.path.join("backend", dialogues_path)
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
                logger.info(f"[Bhashini] Loaded {len(self.lexicon)} Garhwali dialect translation rules.")
            except Exception as e:
                logger.error(f"[Bhashini] Error loading lexicon {self.lexicon_path}: {e}")
        else:
            logger.warning(f"[Bhashini] WARNING: Lexicon not found at {self.lexicon_path}")

    def _load_dialogues(self):
        """Loads curated clinical dialogue templates and grammar rules."""
        if os.path.exists(self.dialogues_path):
            try:
                with open(self.dialogues_path, "r", encoding="utf-8") as f:
                    self.dialogues_data = json.load(f)
                count = len(self.dialogues_data.get("clinical_dialogues", []))
                logger.info(f"[Bhashini] Loaded {count} curated Garhwali clinical dialogue modules.")
            except Exception as e:
                logger.error(f"[Bhashini] Error loading dialogues {self.dialogues_path}: {e}")

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
        Calls Sarvam Text Language Identification API (/text-lid)
        to identify Indian languages from Romanized or code-mixed input.
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
            with httpx.Client(timeout=2.0) as client:
                res = client.post(
                    "https://api.sarvam.ai/text-lid",
                    headers=headers,
                    json={"input": text[:250]},
                )
                if res.status_code == 200:
                    data = res.json()
                    code = data.get("language_code", "").lower()
                    if code.startswith("bn"):
                        return "bengali"
                    elif code.startswith("ta"):
                        return "tamil"
                    elif code.startswith("te"):
                        return "telugu"
                    elif code.startswith("mr"):
                        return "marathi"
                    elif code.startswith("gu"):
                        return "gujarati"
                    elif code.startswith("kn"):
                        return "kannada"
                    elif code.startswith("ml"):
                        return "malayalam"
                    elif code.startswith("pa"):
                        return "punjabi"
                    elif code.startswith("od") or code.startswith("or"):
                        return "odia"
                    elif code.startswith("en"):
                        return "english"
                    elif code.startswith("hi"):
                        return "hindi"
        except Exception:
            pass
        return None

    def detect_language(self, text: str, hint: Optional[str] = None) -> str:
        """
        High-accuracy auto-detection of user language across all Indian languages:
        Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia,
        Garhwali, Hindi, and English.
        """
        # 0. Check explicit user language hint first
        if hint:
            h = hint.lower().strip()
            hint_map = {
                "bn": "bengali", "bengali": "bengali",
                "ta": "tamil", "tamil": "tamil",
                "te": "telugu", "telugu": "telugu",
                "mr": "marathi", "marathi": "marathi",
                "gu": "gujarati", "gujarati": "gujarati",
                "kn": "kannada", "kannada": "kannada",
                "ml": "malayalam", "malayalam": "malayalam",
                "pa": "punjabi", "punjabi": "punjabi",
                "or": "odia", "od": "odia", "odia": "odia",
                "en": "english", "english": "english",
                "garhwali": "garhwali",
                "hi": "hindi", "hindi": "hindi",
            }
            if h in hint_map:
                return hint_map[h]

        if not text or not text.strip():
            return "hindi"

        lower_text = text.lower().strip()

        # 1. Unicode Script Range Detection for Indian Languages
        if re.search(r"[\u0980-\u09FF]", text):
            return "bengali"
        if re.search(r"[\u0B80-\u0BFF]", text):
            return "tamil"
        if re.search(r"[\u0C00-\u0C7F]", text):
            return "telugu"
        if re.search(r"[\u0C80-\u0CFF]", text):
            return "kannada"
        if re.search(r"[\u0D00-\u0D7F]", text):
            return "malayalam"
        if re.search(r"[\u0A80-\u0AFF]", text):
            return "gujarati"
        if re.search(r"[\u0A00-\u0A7F]", text):
            return "punjabi"
        if re.search(r"[\u0B00-\u0B7F]", text):
            return "odia"

        words = re.findall(r"[\w\u0900-\u097F]+", lower_text)
        if not words:
            return "hindi"

        # 2. Check for distinct Garhwali tokens / phrases
        garhwali_score = 0
        for token in GARHWALI_TOKENS:
            if " " in token:
                if token in lower_text:
                    garhwali_score += 3
            else:
                if token in words:
                    garhwali_score += 2

        for key in self.lexicon.keys():
            if " " in key:
                if key.lower() in lower_text:
                    garhwali_score += 3
            elif key.lower() in words:
                garhwali_score += 2

        if garhwali_score >= 3:
            return "garhwali"

        # 3. Check for Marathi (Devanagari distinctive keywords)
        marathi_markers = {"आहे", "नाही", "मला", "माझे", "होते", "त्रास", "कधीपासून", "डोकेदुखी", "ताप", "औषध", "डॉक्टर"}
        if any(w in marathi_markers for w in words):
            return "marathi"

        # 4. Check for English (Latin alphabet dominated with common English words)
        has_indic_script = any(re.search(r"[\u0900-\u0D7F]", w) for w in words)
        if not has_indic_script:
            english_hits = sum(1 for w in words if w in ENGLISH_COMMON_WORDS)
            if english_hits >= 2 or (len(words) <= 3 and english_hits >= 1):
                return "english"

            # For Romanized Indian languages (e.g. Banglish, Tanglish, Hinglish), consult Sarvam LID
            lid_lang = self._check_sarvam_lid(lower_text)
            if lid_lang:
                return lid_lang

        # 5. Default to Hindi (includes Devanagari Hindi and Hinglish)
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

    def clean_text_for_speech(self, text: str, target_lang: str = "hi") -> str:
        """
        Sanitizes text for TTS engines (Bhashini / Sarvam / Neural Indic).
        Crucially prevents Bhashini from pronouncing '!' as 'factorial',
        '*' as 'asterisk', '#' as 'hash', '@' as 'at the rate', etc.
        Strips emojis, markdown syntax, URLs, bullet points, brackets, and arithmetic symbols.
        """
        if not text:
            return ""

        t = text

        # 1. Normalize unicode hyphens and quotes
        t = t.replace('\u2011', ' ').replace('\u2013', ' ').replace('\u2014', ' ')
        t = t.replace('“', ' ').replace('”', ' ').replace('‘', ' ').replace('’', ' ')
        t = t.replace('"', ' ').replace("'", ' ')

        # 2. CRITICAL: Remove exclamation marks - Bhashini expands '!' into mathematical "factorial"
        t = re.sub(r"[!！]+", ". ", t)

        # 3. Strip URLs, links and email addresses
        t = re.sub(r"https?://\S+", "", t)
        t = re.sub(r"\b[\w.-]+@[\w.-]+\.\w+\b", "", t)
        t = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", t)

        # 4. Handle percentage numbers: "95%" -> "95 प्रतिशत" (Hindi) or "95 percent" (English)
        if target_lang and str(target_lang).lower().startswith("en"):
            t = re.sub(r"(\d+)\s*%", r"\1 percent", t)
        else:
            t = re.sub(r"(\d+)\s*%", r"\1 प्रतिशत", t)

        # 5. Handle numeric ranges: "7-10" -> "7 se 10" so TTS does not pronounce "minus"
        t = re.sub(r"(?<=\d)\s*[-–—]\s*(?=\d)", " se ", t)

        # 6. Remove internal clinical triage tags and headers
        t = re.sub(r"Tier\s+(Green|Yellow|Red)[^\n]*", "", t, flags=re.I)
        t = re.sub(r"(\b\d{3}\b)\s*\([^)]*\)", r"\1", t)
        t = re.sub(
            r"(Aapki Takleef|Sambhavit Jaanch\s*\(Diagnosis\)|Nuskha|Kaise Banayein|Kab Tak Lein|Dhyan Rakhein|Safety Verified|Ayurvedic Rationale)[:\s]*",
            "",
            t,
            flags=re.I
        )

        # 7. Strip Markdown syntax symbols (*, _, #, ~, `, >, [, ], {, }, |, \, ^, @, $)
        t = re.sub(r"[*_#`~>\[\]\{\}\|\^@$\\]", " ", t)

        # 8. Strip standalone math operators like +, =, / that TTS speaks aloud as "plus", "slash", "equals"
        t = re.sub(r"\s+[+=/]\s+", " ", t)
        t = re.sub(r"[+=/]", " ", t)

        # 9. Strip emojis and pictographs completely
        emoji_pattern = re.compile(
            "["
            "\U0001F600-\U0001F64F"  # emoticons
            "\U0001F300-\U0001F5FF"  # symbols & pictographs
            "\U0001F680-\U0001F6FF"  # transport & map
            "\U0001F1E0-\U0001F1FF"  # flags
            "\U00002702-\U000027B0"
            "\U000024C2-\U0001F251"
            "\U0001F900-\U0001F9FF"  # supplemental symbols
            "\U0001FA00-\U0001FA6F"  # chess, symbols
            "\U0001FA70-\U0001FAFF"
            "\U00002600-\U000026FF"  # misc symbols like ⚠️, ☕, ⚡
            "]+",
            flags=re.UNICODE
        )
        t = emoji_pattern.sub(" ", t)

        # 10. Replace bullet markers
        t = re.sub(r"\s+[-•*▪▫◦]\s+", ". ", t)
        t = re.sub(r"^\s*[-•*▪▫◦]\s+", "", t, flags=re.M)

        # 11. Normalize sentence boundaries and whitespace
        t = re.sub(r"\n+", ". ", t)
        t = re.sub(r"\s+", " ", t).strip()

        # 12. Clean repeated punctuation: "..", "...", "??", "?."
        t = re.sub(r"\.{2,}", ".", t)
        t = re.sub(r"\?{2,}", "?", t)
        t = re.sub(r"[.,;:\s]+$", ".", t)
        t = re.sub(r"^\s*[.,;:\s]+", "", t)

        return t.strip()

    def format_tts_payload(self, text: str, target_lang: str = "hi") -> Dict[str, str]:
        """
        Cleans markdown syntax, exclamation marks, and artifacts from LLM output for fluid speech.
        """
        clean_text = self.clean_text_for_speech(text, target_lang=target_lang)
        return {
            "clean_text": clean_text,
            "language": target_lang,
            "sample_rate": "16000"
        }


_default_voice_engine: Optional[BhashiniVoiceEngine] = None

def get_default_voice_engine() -> BhashiniVoiceEngine:
    global _default_voice_engine
    if _default_voice_engine is None:
        _default_voice_engine = BhashiniVoiceEngine()
    return _default_voice_engine

def clean_text_for_speech(text: str, language: str = "hi") -> str:
    """Module-level function to sanitize text for TTS to eliminate factorial and emoji artifacts."""
    return get_default_voice_engine().clean_text_for_speech(text, target_lang=language)