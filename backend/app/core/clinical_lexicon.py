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
    "congestion", "blocked nose", "runny nose", "sneezing", "sneeze", "allergy", "allergies",
    "sinus", "sinusitis", "watery eyes", "itchy eyes", "nasal",
    # Hindi / Hinglish
    "dard", "peer", "peed", "bukhar", "taap", "khansi", "khang", "gala", "kanth",
    "sardi", "zukaam", "zukam", "chheenk", "chheekein", "chheken", "chhik", "sar dard", "sir dard", "sar me dard",
    "pet", "pet dard", "jalan", "marod", "gas", "acidity", "apach", "badhazmi",
    "ulti", "dast", "kabz", "chakkar", "thakan", "thakawat", "kamzori",
    "sujan", "khujli", "saans", "ghutan", "seena", "seene", "badan dard", "chot",
    "behoshi", "neend", "peshab", "khoon", "pitta",
    "naak", "naak band", "band naak", "naak behna", "aankh", "aankhon", "aankhon mein khujli",
    "aansu", "aanshu", "pratishyaya", "allergy", "sinus",
    # Garhwali / Regional
    "mund", "mund ma peed", "syal", "thand", "bhyo", "kapkapi", "pait", "gal", "aankhi", "aankhiyo",
    # Devanagari
    "दर्द", "पीर", "पीड़", "बुखार", "ताप", "खांसी", "खंग", "गला", "सर्दी", "जुकाम",
    "पेट", "उल्टी", "दस्त", "कब्ज", "गैस", "सिरदर्द", "चक्कर", "थकान", "कमजोरी",
    "सूजन", "खुजली", "सांस", "सीना", "खून", "मुंड", "स्याल", "जलन", "मरोड़",
    "नाक", "नाक बंद", "बंद नाक", "छींक", "छींकें", "आंख", "आँख", "आंखों", "आँसू", "आंसू", "एलर्जी", "साइनस"
]

# ─────────────────────────────────────────────────────────────────────────────
# Garhwali Dialect Tokens, Morphological Markers, Postpositions & Anatomical Terms
# ─────────────────────────────────────────────────────────────────────────────
GARHWALI_TOKENS: Set[str] = {
    # Pronouns & determiners (distinctly Garhwali)
    "miku", "twaku", "twari", "tyar", "tyeri", "hamuku", "myaru", "meru", "hamaru", "hamru",
    "kwahi", "kwai", "kakkh", "kakh", "kile", "kaba", "kanni", "kani", "katga", "kati",
    # Verbs & auxiliaries
    "chha", "chhi", "chhan", "chhe", "chhon", "chhou", "chhonh", "chhya", "huna", "hooni", "auna", "auni",
    "karu", "kariya", "karnu", "leenu", "batava", "batawa", "hwe", "hwayu", "hwai", "rahyu",
    "ho ro chha", "ho rahyu chha", "hooni chha", "huni chhe", "hwa chha", "lagyun", "lagyu", "lagni", "lagani",
    "dukhnu", "dukhna", "dukhni", "aaundu", "aaundi", "peewa", "khawa",
    # Particles, postpositions & adverbs
    "dagad", "dagadi", "bati", "bal", "ghani", "ghano", "bhalu", "bhal", "theek ni",
    "byali", "byakhani", "rati", "dhoor",
    # Symptoms & anatomy
    "mund", "peed", "peer", "bhyo", "dhaad", "khutta", "khutti", "goda", "aankhi", "aankhiyo",
    "syal", "khang", "chhwaat", "bhaunr", "ghat", "ghaant",
    # Greetings & cultural markers
    "dainu", "bhula", "bhuli", "daju", "dajyu", "bouji", "pailagon", "badri vishal",

    # Devanagari tokens (distinctly Garhwali)
    "छ", "छा", "छो", "छन", "छौं", "छौ", "छी", "छ्या", "भ्यो", "मुंड", "पीर", "पीड", "पीड़", "दैणु", "दैन्यू",
    "पहिलागण", "भूला", "कनि", "भालु", "त्वकु", "मिकु", "त्वरि", "त्यर", "त्येरो", "मेरो", "म्यारु", "मेरि",
    "हमुकु", "हमरु", "कख", "किले", "कबा", "कन्नि", "कतगा", "कति", "खुट्टा", "गोडा", "धड़", "धाड़",
    "घाँट", "गाळ", "लग्यूँ", "लगणी", "औणा", "औणी", "औंदू", "हूण", "हूँदू", "हूँदी", "बतावा", "दगड़",
    "दगड़ी", "बटि", "नी", "घणी", "घणो", "खंग", "छ्वाट", "भौंर", "दाज्यू", "बौजी", "स्याल", "पैट"
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
    "nahi", "nahin", "koi nahi", "na", "bina", "mat",
    "ni", "ni cha", "ni chha",
    "नहीं", "ना", "बिना", "मत", "कोई नहीं", "नी"
}

RED_PATTERNS: Dict[str, List[str]] = {
    "cardiac_chest_pain": [
        r"\bchest\s+(?:tightness|pressure|pain|discomfort)\b",
        r"\b(?:pressure|pain|tightness|heaviness|crushing\s+pain)\s+(?:in\s+(?:the\s+|my\s+)?)?chest\b",
        r"\bcrushing\s+(?:chest\s+)?pain\b",
        r"\b(?:seene|chhati|dil)\s+(?:me\s+)?(?:\w+\s+){0,3}(?:dard|dabav|jalan)\b",
        r"\bchhati\s+ma\s+(?:bhari\s+)?(?:peed|peer)\b",
        r"(?:सीने|छाती|दिल)\s+(?:में|मा\s+)?(?:\S+\s+){0,3}(?:दर्द|दबाव|जकड़न|जलन)",
        r"\bleft\s+arm\s+pain\b",
        r"\bheart\s+(?:pain|attack)\b"
    ],
    "acute_respiratory_distress": [
        r"\b(?:shortness\s+of\s+breath|difficulty\s+breathing|cannot\s+breathe|hardly\s+breathe|unable\s+to\s+breathe|gasping)\b",
        r"\bsaans\s+(?:lene\s+me\s+)?(?:\w+\s+){0,2}(?:takleef|dikkat|phoolna|phool\s+rahi)\b",
        r"\bsaans\s+(?:ni\s+aani|lene\s+ma\s+khati\s+takleef)\b",
        r"(?:सांस|साँस)\s+(?:लेने\s+में|मा\s+)?(?:\S+\s+){0,2}(?:तकलीफ|दिक्कत|फूलना)",
        r"दम\s+घुट",
        r"\bdum\s+ghutna\b",
        r"\bghutan\s+ho\s+rahi\b",
        r"\b(?:hont|lips)\s+(?:neele|blue)\b",
        r"\b(?:turning\s+blue|cyanosis)\b",
        r"\b(?:stridor|squeaking\s+noise\s+when\s+breathing|wheezing\s+severely)\b",
        r"\bthroat\s+(?:is\s+)?swelling\b"
    ],
    "altered_mental_status": [
        r"\b(?:unconscious|unresponsive|fainted|passed\s+out|seizures?|convulsions?|fits?)\b",
        r"\b(?:behosh|daura|chakkar\s+khakar\s+girna|jhatke\s+aa\s+rahe|hosh\s+me\s+nahi|gir\s+pada)\b",
        r"(?:बेहोश|दौरा|चक्कर\s+खाकर\s+गिर|झटके)"
    ],
    "severe_hemorrhage": [
        r"\b(?:heavy\s+bleeding|coughing\s+blood|vomiting\s+blood|bleeding\s+profusely)\b",
        r"\bkhoon\s+ki\s+(?:ulti|khasi)\b",
        r"\b(?:taaza|fresh|deep\s+red)\s+khoon\b",
        r"\b(?:khoon\s+nikal|khoon\s+beh)\s+raha\b",
        r"खून\s+की\s+(?:उल्टी|खांसी|खाँसी)",
        r"(?:ज्यादा\s+खून|ताज़ा\s+खून|गहरा\s+लाल\s+खून)\s+बह",
        r"\bzyada\s+khoon\s+behna\b",
        r"\b(?:pathar\s+jaisa\s+sakht|board-like\s+rigidity|sakht\s+pet)\b"
    ],
    "infant_high_fever": [
        r"\b(?:infant|baby|newborn)\s+high\s+fever\b",
        r"\b(?:navjaat|chote\s+bachhe|bachhe)\s+(?:ko\s+)?(?:\w+\s+){0,3}(?:tezz\s+bukhar|10[3-6]\s*degree)\b",
        r"(?:नवजात|छोटे\s+बच्चे)\s+(?:को\s+)?(?:\S+\s+){0,2}तेज\s+बुखार",
        r"\b10[3-6]\s*(?:degree|°|f)\b"
    ],
    "anaphylaxis_stroke": [
        r"\b(?:face\s+drooping|facial\s+droop|slurred\s+speech|throat\s+closing|lips\s+blue|throat\s+swelling)\b",
        r"\b(?:chehra\s+tedha|gala\s+band\s+hona|muh\s+tedha|chehra\s+dhalak|jaban\s+ladkhada)\b",
        r"\b(?:arm|haath|shareer)\s+(?:has\s+)?gone\s+(?:completely\s+)?numb\b",
        r"\b(?:hath|haath)\s+sunn\b",
        r"(?:चेहरा\s+टेढ़ा|गला\s+बंद|मुंह\s+टेढ़ा|चेहरे\s+का\s+एक\s+तरफ\s+ढलक|जबान\s+लड़खड़ा)",
        r"\bthroat\s+(?:is\s+)?swelling\s+shut\b"
    ]
}

YELLOW_PATTERNS: Dict[str, List[str]] = {
    "prolonged_fever": [
        r"\bfever\s+(?:for\s+)?(?:[3-9]|\d{2,})\s+days\b",
        r"\b(?:[3-9]|\d{2,}|chaar|char|teen)\s+din\s+(?:se|bati)\s+(?:lagatar\s+)?(?:tej\s+)?bukhar\b",
        r"(?:[3-9]|\d{2,}|तीन|चार|पांच|पाँच)\s+दिन\s+(?:से|बटि)\s+.*बुखार",
        r"लगातार\s+बुखार",
        r"\blagaatar\s+bukhar\b",
        r"\bpersistent\s+fever\b"
    ],
    "severe_localized_pain": [
        r"\bsevere\s+(?:abdominal|stomach)\s+pain\b",
        r"\bpet\s+me\s+(?:bahut\s+)?tezz\s+dard\b",
        r"\b(?:sharp\s+pain|pain)\s+in\s+the\s+lower\s+right\s+side\s+of\s+(?:my\s+)?stomach\b",
        r"\bright\s+(?:lower\s+quadrant|iliac\s+fossa)\s+pain\b",
        r"पेट\s+में\s+(?:बहुत\s+)?तेज\s+दर्द",
        r"\bsir\s+me\s+asahniya\s+dard\b",
        r"सिर\s+में\s+असहनीय\s+दर्द",
        r"\bintense\s+headache\b"
    ],
    "dehydration_signs": [
        r"\b(?:no\s+urine|not\s+passing\s+urine|sunken\s+eyes|extreme\s+thirst)\b",
        r"\bpeshab\s+(?:band|na\s+aana|nahi\s+kiya)\b",
        r"पेशाब\s+(?:बंद|न\s+आना|नहीं\s+आ|नहीं\s+किया)",
        r"(?:आंखें|आँखें)\s+धंस",
        r"\baankhe\s+dhasna\b",
        r"\bdast\s+lagatar\b"
    ],
    "persistent_vomiting": [
        r"\b(?:continuous|persistent|repeated)\s+vomiting\b",
        r"\blagaatar\s+ulti(?:yan)?\b",
        r"(?:लगातार|बार\s+बार|बार-बार)\s+उल्टी",
        r"\bbaar\s+baar\s+ulti\b",
        r"\bpaani\s+ki\s+ghunt\b"
    ],
    "deep_jaundice": [
        r"\b(?:aankhein|aankh)\s+(?:bohot\s+)?peeli\b",
        r"\b(?:peela\s+peshab|dark\s+yellow\s+urine|deep\s+jaundice|icterus)\b",
        r"(?:आंखें|आँखें)\s+(?:बहुत\s+)?पीली"
    ],
    "ear_discharge": [
        r"\b(?:peela\s+peep|kaan\s+se\s+peep|kan\s+se\s+mavad|ear\s+discharge|ear\s+pus)\b",
        r"(?:पीला\s+पीप|कान\s+से\s+मवाद|कान\s+बहना)"
    ]
}

