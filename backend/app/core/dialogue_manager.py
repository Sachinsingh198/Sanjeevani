import re
from typing import Tuple, Dict, Any

SYMPTOM_KEYWORDS = [
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

GREETING_PATTERNS = [
    r"\b(hi|hello|hey|namaste|namaskar|pranam|good\s+morning|good\s+evening|good\s+afternoon)\b",
    r"\b(kaise\s+ho|how\s+are\s+you|kya\s+haal|kaisa\s+chal\s+raha)\b",
    r"\b(dainu|dainu\s+bhula|pailagon|jai\s+badri\s+vishal|badri\s+vishal|kani\s+chha|kani\s+chho|bhalu\s+chha|kya\s+haal\s+chhan)\b",
    r"\b(दैणु|दैन्यू|पहिलागण|कनि\s+छा|कनि\s+छो|भालु\s+छ)\b",
    r"\b(mera\s+naam|my\s+name|mera\s+name|main\s+.*hoon|i\s+am)\b",
    r"\b(aap\s+kaun\s+ho|who\s+are\s+you|kya\s+kar\s+sakte\s+ho|madad\s+chahiye)\b"
]

ADVERSARIAL_PATTERNS = [
    r"forget\s+(your\s+)?(previous\s+)?instructions",
    r"act\s+as\s+a",
    r"ignore\s+all\s+rules",
    r"you\s+are\s+now",
    r"system\s+prompt"
]


def has_symptom_mention(text: str) -> bool:
    """Checks if text mentions any clinical symptom or bodily complaint."""
    if not text:
        return False
    normalized = text.lower()
    for kw in SYMPTOM_KEYWORDS:
        if " " in kw:
            if kw in normalized:
                return True
        else:
            if re.search(r"\b" + re.escape(kw) + r"\b", normalized):
                return True
    return False


def classify_intent(message: str) -> str:
    """Classifies user input into GREETING, ADVERSARIAL, or CLINICAL."""
    normalized = message.strip().lower()

    if any(re.search(pat, normalized) for pat in ADVERSARIAL_PATTERNS):
        return "ADVERSARIAL"

    has_symptoms = has_symptom_mention(normalized)

    # If the user is greeting, introducing themselves, or making casual conversation
    # WITHOUT stating any symptom, it is a GREETING.
    is_greeting = any(re.search(pat, normalized) for pat in GREETING_PATTERNS)
    if is_greeting and not has_symptoms:
        return "GREETING"

    # Brief conversational phrase without any symptoms (e.g. "haan ji", "theek hai")
    if not has_symptoms and len(normalized.split()) <= 6:
        return "GREETING"

    return "CLINICAL"