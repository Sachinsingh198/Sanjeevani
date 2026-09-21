import re
from typing import List, Tuple, Set
from enum import Enum
from app.core.clinical_lexicon import NEGATION_CUES, RED_PATTERNS, YELLOW_PATTERNS

class SeverityTier(str, Enum):
    GREEN = "Green"
    YELLOW = "Yellow"
    RED = "Red"

class ClinicalTriageEngine:
    """
    Deterministic clinical triage engine based on the Manchester Triage System (MTS).
    Evaluates urgency with:
    1. Bi-directional negation detection (English prefix + Hindi postfix).
    2. Flexible multi-word clinical discriminators (e.g., "pressure in chest", "seene me bahut tezz dard").
    """

    def __init__(self):
        self.negation_window = 35
        self.negation_cues: Set[str] = NEGATION_CUES
        self.red_patterns = RED_PATTERNS
        self.yellow_patterns = YELLOW_PATTERNS

    def _is_negated(self, text: str, match_start: int, match_end: int) -> bool:
        pre_start = max(0, match_start - self.negation_window)
        preceding_text = text[pre_start:match_start].lower()
        pre_tokens = re.findall(r"\b\w+\b", preceding_text)
        if any(cue in pre_tokens for cue in self.negation_cues):
            return True

        post_end = min(len(text), match_end + self.negation_window)
        succeeding_text = text[match_end:post_end].lower()
        post_tokens = re.findall(r"\b\w+\b", succeeding_text)
        if any(cue in post_tokens for cue in self.negation_cues):
            return True

        return False

    def evaluate(self, narrative: str) -> Tuple[SeverityTier, List[str]]:
        normalized = narrative.lower()
        matched_flags: List[str] = []

        # 1. Evaluate Red Tier (Priority 1: Emergency Life-Threats)
        for category, patterns in self.red_patterns.items():
            for pattern in patterns:
                for match in re.finditer(pattern, normalized):
                    if not self._is_negated(normalized, match.start(), match.end()):
                        matched_flags.append(f"RED_FLAG: {category} ('{match.group(0)}')")
                        return SeverityTier.RED, matched_flags

        # 2. Evaluate Yellow Tier (Priority 2: Sub-Acute Monitoring)
        for category, patterns in self.yellow_patterns.items():
            for pattern in patterns:
                for match in re.finditer(pattern, normalized):
                    if not self._is_negated(normalized, match.start(), match.end()):
                        matched_flags.append(f"YELLOW_FLAG: {category} ('{match.group(0)}')")

        if matched_flags:
            return SeverityTier.YELLOW, matched_flags

        # 3. Default to Green Tier (Routine / Self-Care)
        return SeverityTier.GREEN, ["GREEN_FLAG: Routine/Community level symptoms"]