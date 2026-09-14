import re
from typing import List, Tuple, Set
from enum import Enum

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

        self.negation_cues: Set[str] = {
            "no", "not", "without", "denies", "free of", "never",
            "nahi", "nahin", "koi nahi", "na", "bina", "mat"
        }

        # Red Tier Discriminator Patterns
        self.red_patterns = {
            "cardiac_chest_pain": [
                # Matches "chest pain", "chest pressure", "chest tightness"
                r"\bchest\s+(?:tightness|pressure|pain|discomfort)\b",
                # Matches "pressure in chest", "pain in chest", "tightness in my chest"
                r"\b(?:pressure|pain|tightness|heaviness)\s+(?:in\s+(?:the\s+|my\s+)?)?chest\b",
                # Matches Hindi variations: "seene me dard", "chhati me bahut tezz dard"
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

        # Yellow Tier Discriminator Patterns
        self.yellow_patterns = {
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