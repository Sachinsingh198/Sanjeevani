import re
from typing import Tuple, Dict, Any, Optional


from app.core.clinical_lexicon import (
    SYMPTOM_KEYWORDS,
    GREETING_PATTERNS,
    ADVERSARIAL_PATTERNS,
)


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



LANGUAGE_REQUEST_PATTERNS = [
    r"\b(?:hindi|hinglish|garhwali|pahadi|gadwali|english|angrezi|bangla|bengali|tamil|telugu|gujarati|marathi|punjabi|odia|kannada|malayalam)\s+(?:m[ae]in|me|ma|te|lo|il)?\s*(?:batao|bataiye|batava|batawa|samjhao|samjhawa|bolo|bolawa|likho|kaho|kahawa|speak|explain|tell|translate)\b",
    r"\b(?:explain|translate|repeat|tell|speak)\s+(?:this\s+)?(?:in|into|to)?\s*(?:hindi|hinglish|garhwali|pahadi|english|bengali|bangla|tamil|telugu|gujarati|marathi|punjabi|odia|kannada|malayalam)\b",
    r"\b(?:hindi|hinglish|garhwali|english)\s+(?:please|kripya|me|mein|ma)\b",
    r"^(?:hindi|hinglish|garhwali|english)$",
    r"\b(?:isko|ise|yeh|ye|is|is sab|sabhi)\s+(?:hindi|garhwali|english|hinglish)\s+(?:m[ae]in|me|ma)\b",
    r"\b(?:hindi|garhwali|english)\s+version\b",
    r"\b(?:samajh\s+nahi\s+aaya|samjha\s+nahi|phir\s+se\s+batao|dubara\s+batao|repeat\s+please)\b",
]


def extract_requested_language(message: str) -> Optional[str]:
    """Detects if the user explicitly asks for a target language."""
    if not message:
        return None
    normalized = message.strip().lower()
    if re.search(r"\b(?:garhwali|pahadi|gadwali)\b", normalized):
        return "garhwali"
    if re.search(r"\b(?:hinglish)\b", normalized):
        return "hinglish"
    if re.search(r"\b(?:hindi|devanagari)\b", normalized):
        return "hindi"
    if re.search(r"\b(?:english|angrezi)\b", normalized):
        return "english"
    if re.search(r"\b(?:bangla|bengali)\b", normalized):
        return "bengali"
    if re.search(r"\b(?:tamil)\b", normalized):
        return "tamil"
    if re.search(r"\b(?:telugu)\b", normalized):
        return "telugu"
    return None


def is_language_request(message: str) -> bool:
    """Checks if message is an explicit request to switch language or explain in a language."""
    if not message:
        return False
    normalized = message.strip().lower()
    return any(re.search(pat, normalized) for pat in LANGUAGE_REQUEST_PATTERNS)


def classify_intent(message: str) -> str:
    """Classifies user input into GREETING, ADVERSARIAL, LANGUAGE_REQUEST, or CLINICAL."""
    normalized = message.strip().lower()

    if any(re.search(pat, normalized) for pat in ADVERSARIAL_PATTERNS):
        return "ADVERSARIAL"

    has_symptoms = has_symptom_mention(normalized)

    # If asking to explain in a specific language (e.g. 'hindi main batao') without presenting new symptoms
    if is_language_request(normalized) and not has_symptoms:
        return "LANGUAGE_REQUEST"

    # If the user is greeting, introducing themselves, or making casual conversation
    # WITHOUT stating any symptom, it is a GREETING.
    is_greeting = any(re.search(pat, normalized) for pat in GREETING_PATTERNS)
    if is_greeting and not has_symptoms:
        return "GREETING"

    return "CLINICAL"