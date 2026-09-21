"""
Centralized Clinical Lexicon for Sanjeevani 2.0.
Contains single-source-of-truth definitions for:
- Clinical symptom keywords (English, Hindi, Hinglish, Garhwali, Devanagari)
- Dialectal tokens and morphological markers (Garhwali, English common terms)
- Triage MTS red and yellow discriminator pattern dictionaries
- Conversational intent and adversarial guardrail patterns
"""

from typing import Dict, List, Set

# ─────────────────────────────────────────────────────────────────────────────
# Symptom Keywords across English, Hindi/Hinglish, Garhwali, and Devanagari
# ─────────────────────────────────────────────────────────────────────────────
SYMPTOM_KEYWORDS: List[str] = [
    # English
    "pain", "ache", "aching", "fever", "feverish", "cough", "coughing", "cold",
    "headache", "migraine", "nausea", "vomit", "vomiting", "diarrhea", "constipation",
    "swelling", "swollen", "rash", "itching", "itchy", "burn", "burning", "cramp", "cramps",
    "fatigue", "tired", "weakness", "dizziness", "dizzy", "breath", "breathing",
    "shortness of breath", "chest pain", "sore throat", "stomach ache", "infection",
    # Hindi / Hinglish
    "dard", "peer", "peed", "bukhar", "taap", "khansi", "khang", "gala", "kanth",
    "sardi", "zukaam", "zukam", "chheenk", "chhik", "sar dard", "sir dard", "sar me dard",
    "pet", "pet dard", "jalan", "marod", "gas", "acidity", "apach", "badhazmi",
    "ulti", "dast", "kabz", "chakkar", "thakan", "thakawat", "kamzori",
    "sujan", "khujli", "saans", "ghutan", "seena", "seene", "badan dard", "chot",
    "behoshi", "neend", "peshab", "khoon", "pitta",
    # Garhwali / Regional
    "mund", "mund ma peed", "syal", "thand", "bhyo", "kapkapi", "pait", "gal",
    # Devanagari
    "दर्द", "पीर", "पीड़", "बुखार", "ताप", "खांसी", "खंग", "गला", "सर्दी", "जुकाम",
    "पेट", "उल्टी", "दस्त", "कब्ज", "गैस", "सिरदर्द", "चक्कर", "थकान", "कमजोरी",
    "सूजन", "खुजली", "सांस", "सीना", "खून", "मुंड", "स्याल", "जलन", "मरोड़"
]

# ─────────────────────────────────────────────────────────────────────────────
# Garhwali Dialect Tokens, Morphological Markers, Postpositions & Anatomical Terms
# ─────────────────────────────────────────────────────────────────────────────
GARHWALI_TOKENS: Set[str] = {
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

ENGLISH_COMMON_WORDS: Set[str] = {
    "i", "my", "me", "am", "have", "has", "had", "pain", "throat", "headache", "fever", "cough",
    "cold", "stomach", "chest", "doctor", "please", "suggest", "remedy", "what", "how", "can",
    "take", "days", "since", "yesterday", "feeling", "weakness", "vomiting", "dizzy", "hello", "hi"
}

# ─────────────────────────────────────────────────────────────────────────────
# Conversational Intent Patterns (Greeting & Adversarial Guardrails)
# ─────────────────────────────────────────────────────────────────────────────
GREETING_PATTERNS: List[str] = [
    r"\b(hi|hello|hey|namaste|namaskar|pranam|good\s+morning|good\s+evening|good\s+afternoon)\b",
    r"\b(kaise\s+ho|how\s+are\s+you|kya\s+haal|kaisa\s+chal\s+raha)\b",
    r"\b(dainu|dainu\s+bhula|pailagon|jai\s+badri\s+vishal|badri\s+vishal|kani\s+chha|kani\s+chho|bhalu\s+chha|kya\s+haal\s+chhan)\b",
    r"\b(दैणु|दैन्यू|पहिलागण|कनि\s+छा|कनि\s+छो|भालु\s+छ)\b",
    r"\b(mera\s+naam|my\s+name|mera\s+name|main\s+.*hoon|i\s+am)\b",
    r"\b(aap\s+kaun\s+ho|who\s+are\s+you|kya\s+kar\s+sakte\s+ho|madad\s+chahiye)\b"
]

ADVERSARIAL_PATTERNS: List[str] = [
    r"forget\s+(your\s+)?(previous\s+)?instructions",
    r"act\s+as\s+a",
    r"ignore\s+all\s+rules",
    r"you\s+are\s+now",
    r"system\s+prompt"
]

# ─────────────────────────────────────────────────────────────────────────────
# Triage MTS Engine Negation Cues & Pattern Vocabularies
# ─────────────────────────────────────────────────────────────────────────────
NEGATION_CUES: Set[str] = {
    "no", "not", "without", "denies", "free of", "never",
    "nahi", "nahin", "koi nahi", "na", "bina", "mat"
}

RED_PATTERNS: Dict[str, List[str]] = {
    "cardiac_chest_pain": [
        r"\bchest\s+(?:tightness|pressure|pain|discomfort)\b",
        r"\b(?:pressure|pain|tightness|heaviness)\s+(?:in\s+(?:the\s+|my\s+)?)?chest\b",
        r"\b(?:seene|chhati|dil)\s+(?:me\s+)?(?:\w+\s+){0,3}dard\b",
        r"\bleft\s+arm\s+pain\b",
        r"\bheart\s+pain\b"
    ],
    "acute_respiratory_distress": [
        r"\b(?:shortness\s+of\s+breath|difficulty\s+breathing|cannot\s+breathe|gasping)\b",
        r"\bsaans\s+(?:lene\s+me\s+)?(?:\w+\s+){0,2}(?:takleef|dikkat|phoolna)\b",
        r"\bdum\s+ghutna\b",
        r"\bghutan\s+ho\s+rahi\b"
    ],
    "altered_mental_status": [
        r"\b(?:unconscious|unresponsive|fainted|passed\s+out|seizure|convulsion)\b",
        r"\b(?:behosh|daura|chakkar\s+khakar\s+girna)\b"
    ],
    "severe_hemorrhage": [
        r"\b(?:heavy\s+bleeding|coughing\s+blood|vomiting\s+blood|bleeding\s+profusely)\b",
        r"\bkhoon\s+ki\s+(?:ulti|khasi)\b",
        r"\bzyada\s+khoon\s+behna\b"
    ],
    "infant_high_fever": [
        r"\b(?:infant|baby|newborn)\s+high\s+fever\b",
        r"\b(?:navjaat|chote\s+bachhe)\s+(?:ko\s+)?(?:\w+\s+){0,2}tezz\s+bukhar\b"
    ],
    "anaphylaxis_stroke": [
        r"\b(?:face\s+drooping|slurred\s+speech|throat\s+closing|lips\s+blue)\b",
        r"\b(?:chehra\s+tedha|gala\s+band\s+hona|muh\s+tedha)\b"
    ]
}

YELLOW_PATTERNS: Dict[str, List[str]] = {
    "prolonged_fever": [
        r"\bfever\s+(?:for\s+)?(?:[3-9]|\d{2,})\s+days\b",
        r"\b(?:[3-9]|\d{2,})\s+din\s+se\s+bukhar\b",
        r"\blagaatar\s+bukhar\b",
        r"\bpersistent\s+fever\b"
    ],
    "severe_localized_pain": [
        r"\bsevere\s+(?:abdominal|stomach)\s+pain\b",
        r"\bpet\s+me\s+(?:bahut\s+)?tezz\s+dard\b",
        r"\bsir\s+me\s+asahniya\s+dard\b",
        r"\bintense\s+headache\b"
    ],
    "dehydration_signs": [
        r"\b(?:no\s+urine|not\s+passing\s+urine|sunken\s+eyes|extreme\s+thirst)\b",
        r"\bpeshab\s+(?:band|na\s+aana)\b",
        r"\baankhe\s+dhasna\b"
    ],
    "persistent_vomiting": [
        r"\b(?:continuous|persistent|repeated)\s+vomiting\b",
        r"\blagaatar\s+ulti\b",
        r"\bbaar\s+baar\s+ulti\b"
    ]
}
