import re
from typing import List, Tuple, Set, Optional
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
    3. Flexible multi-word clinical discriminators across English, Hindi, and Devanagari.
    4. Multi-turn cross-context evaluation for emergent prolonged symptom risks.
    """

    def __init__(self):
        self.negation_window = 40
        self.negation_cues: Set[str] = set(NEGATION_CUES) | {"नहीं", "ना", "बिना", "मत", "कोई नहीं"}
        self.red_patterns = RED_PATTERNS
        self.yellow_patterns = YELLOW_PATTERNS
        self.temporal_past_cues: Set[str] = {
            "pehle", "kal", "parso", "kuch din pehle", "earlier", "previously", "yesterday", "last night"
        }

    def _is_negated(self, text: str, match_start: int, match_end: int) -> bool:
        """
        Determines whether a clinical match is genuinely negated.
        1. Evaluates preceding context bounded by contrastive delimiters (but, par, lekin, terminal punctuation).
        2. Evaluates succeeding context bounded by contrastive delimiters and lack-of-relief cues (aaram, rahat).
        3. Preserves temporal history ("pehle dard tha, ab nahi").
        """
        preceding_text = text[max(0, match_start - 60):match_start].lower()
        succeeding_text = text[match_end:min(len(text), match_end + 60)].lower()

        # Contrastive boundary delimiters that separate independent symptom clauses
        contrast_delim = r"[.;!?\n]|\b(?:par|lekin|magar|but|phir\s+bhi|jabki|halaanki|लेकिन|पर|मगर)\b"
        succeeding_delim = r"[.;!?\n]|\b(?:par|lekin|magar|but|phir\s+bhi|jabki|halaanki|लेकिन|पर|मगर|aaram|fayda|rahat|आराम|फायदा|राहत)\b"

        pre_segments = re.split(contrast_delim, preceding_text, flags=re.IGNORECASE)
        last_pre_segment = pre_segments[-1] if pre_segments else ""

        post_segments = re.split(succeeding_delim, succeeding_text, flags=re.IGNORECASE)
        first_post_segment = post_segments[0] if post_segments else ""

        # Check temporal past awareness:
        # If the symptom occurred earlier ("pehle dard tha, ab nahi hai"), it is a medical flag, NOT an absent symptom
        combined_clause = f"{last_pre_segment} {first_post_segment}"
        clause_tokens = set(re.findall(r"[^\s,.;!?]+", combined_clause))
        if any(past_cue in clause_tokens for past_cue in self.temporal_past_cues):
            return False

        # Token extraction using Unicode-friendly regex so Devanagari matras are intact
        pre_tokens = re.findall(r"[^\s,.;!?]+", last_pre_segment)
        post_tokens = re.findall(r"[^\s,.;!?]+", first_post_segment)

        # 1. Check multi-word negation cues in clause
        for cue in self.negation_cues:
            if " " in cue:
                if cue in last_pre_segment or cue in first_post_segment:
                    return True

        # 2. Check single-word negation cues within the contrast-bounded clause
        for cue in self.negation_cues:
            if " " not in cue:
                if cue in pre_tokens or cue in post_tokens[:4]:
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

    def evaluate_with_context(
        self,
        current_text: str,
        accumulated_notes: str = "",
        duration_days: Optional[int] = None
    ) -> Tuple[SeverityTier, List[str]]:
        """
        Multi-turn context evaluation helper:
        1. First evaluates current_text. If Red, return immediately.
        2. Evaluates accumulated_notes for Yellow-tier patterns or combined symptom + duration triggers.
        """
        tier_cur, flags_cur = self.evaluate(current_text)
        if tier_cur == SeverityTier.RED:
            return tier_cur, flags_cur

        # Extract only patient statements from accumulated_notes to ignore doctor's screening questions
        patient_notes_lines = []
        for line in accumulated_notes.splitlines():
            line_str = line.strip()
            if line_str.startswith("Doctor:") or line_str.startswith("Assistant:"):
                continue
            if line_str.startswith("Patient:"):
                line_str = line_str[len("Patient:"):].strip()
            if line_str:
                patient_notes_lines.append(line_str)
        patient_notes = " ".join(patient_notes_lines) if patient_notes_lines else accumulated_notes

        # Check combined symptom + duration triggers (>=3 days)
        dur_match = re.search(r"\b(?:[3-9]|\d{2,}|तीन|चार|पांच|पाँच)\s*(?:din|days|दिन)\b", current_text, re.IGNORECASE)
        is_prolonged = (duration_days is not None and duration_days >= 3) or bool(dur_match)

        combined_context = f"{patient_notes} {current_text}".lower()
        fever_or_vomit = any(
            sym in combined_context
            for sym in [
                "bukhar", "fever", "बुखार", "taap", "ताप",
                "ulti", "vomit", "vomiting", "उल्टी", "dast", "diarrhea", "दस्त"
            ]
        )

        if patient_notes and is_prolonged and fever_or_vomit:
            return SeverityTier.YELLOW, ["YELLOW_FLAG: prolonged_symptom_duration ('>=3 days')"]

        if tier_cur == SeverityTier.YELLOW:
            return tier_cur, flags_cur

        if patient_notes:
            tier_notes, flags_notes = self.evaluate(patient_notes)
            if tier_notes in (SeverityTier.RED, SeverityTier.YELLOW):
                return tier_notes, flags_notes

        return tier_cur, flags_cur