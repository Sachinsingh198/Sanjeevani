import re
from typing import Tuple, Dict, Any

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

    return "CLINICAL"