import re
from typing import Tuple, Dict, Any

GREETING_PATTERNS = [
    r"^(hi|hello|hey|namaste|pranam|namaskar|good\s+morning|good\s+evening)\b",
    r"^(kaise\s+ho|how\s+are\s+you|kya\s+haal\s+hai)\b",
    r"^(dainu|dainu\s+bhula|pailagon|jai\s+badri\s+vishal|badri\s+vishal|kani\s+chha|kani\s+chho|bhalu\s+chha|kya\s+haal\s+chhan)\b",
    r"^(दैणु|दैन्यू|पहिलागण|कनि\s+छा|कनि\s+छो|भालु\s+छ)\b"
]

ADVERSARIAL_PATTERNS = [
    r"forget\s+(your\s+)?(previous\s+)?instructions",
    r"act\s+as\s+a",
    r"ignore\s+all\s+rules",
    r"you\s+are\s+now",
    r"system\s+prompt"
]

def classify_intent(message: str) -> str:
    """Classifies user input into GREETING, ADVERSARIAL, or SYMPTOM_REPORT."""
    normalized = message.strip().lower()

    if any(re.search(pat, normalized) for pat in ADVERSARIAL_PATTERNS):
        return "ADVERSARIAL"

    if any(re.search(pat, normalized) for pat in GREETING_PATTERNS) and len(normalized.split()) <= 4:
        return "GREETING"

    return "CLINICAL"