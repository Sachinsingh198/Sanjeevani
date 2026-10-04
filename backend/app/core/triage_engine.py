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
    1. Clause-bounded bi-directional negation detection (English prefix + Hindi postfix).
    2. Temporal awareness for prior cardiac/critical history.
    3. Flexible multi-word clinical discriminators (e.g., "pressure in chest", "seene me bahut tezz dard").
    """

    def __init__(self):
        self.negation_window = 20
        self.negation_cues: Set[str] = NEGATION_CUES
        self.red_patterns = RED_PATTERNS
        self.yellow_patterns = YELLOW_PATTERNS
        self.temporal_past_cues: Set[str] = {
            "pehle", "kal", "parso", "kuch din pehle", "earlier", "previously", "yesterday", "last night"
        }

    def _is_negated(self, text: str, match_start: int, match_end: int) -> bool:
        """
        Determines whether a clinical match is genuinely negated.
        1. Confines negation checking to the specific clause containing the match.
        2. Detects temporal markers: past-tense critical symptoms ("pehle tha, ab nahi")
           are NOT negated as they remain clinically urgent.
        3. Looks at 3 tokens before and 3 tokens after within the clause.
        """
        # Find clause boundaries around the match (commas, semicolons, conjunctions)
        clause_boundaries = [
            m.start() for m in re.finditer(r'[,;!?]|\b(?:lekin|par|magar|but|however|aur|aur\s+saath)\b', text, re.IGNORECASE)
        ]
        clause_start = max([0] + [b for b in clause_boundaries if b < match_start])
        # If clause boundary starts with delimiter/word, advance past it
        clause_end_candidates = [b for b in clause_boundaries if b > match_end]
        clause_end = min([len(text)] + clause_end_candidates) if clause_end_candidates else len(text)

        clause_text = text[clause_start:clause_end].strip().lower()

        # Check temporal past awareness:
        # If the symptom occurred earlier ("pehle dard tha, ab nahi hai"), it is a medical flag, NOT an absent symptom
        clause_tokens = set(re.findall(r"\b\w+\b", clause_text))
        if any(past_cue in clause_tokens for past_cue in self.temporal_past_cues):
            # Past critical occurrence reported -> do NOT negate
            return False

        # Match offset inside the clause
        rel_start = max(0, match_start - clause_start)
        rel_end = min(len(clause_text), match_end - clause_start)

        pre_clause = clause_text[:rel_start]
        post_clause = clause_text[rel_end:]

        pre_tokens = re.findall(r"\b\w+\b", pre_clause)
        post_tokens = re.findall(r"\b\w+\b", post_clause)

        # Check within 3 tokens before or after the match in the same clause
        if any(cue in pre_tokens[-3:] for cue in self.negation_cues):
            return True
        if any(cue in post_tokens[:3] for cue in self.negation_cues):
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