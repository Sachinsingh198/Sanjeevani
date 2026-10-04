"""
Structured Clinical Symptom Profile & Intake Model.
Replaces unstructured text scraping with a strongly-typed clinical data structure.
"""

from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any
import re
import json

@dataclass
class StructuredSymptomProfile:
    chief_complaint: str = ""
    duration: Optional[str] = None
    onset: Optional[str] = None  # "sudden", "gradual"
    severity: Optional[str] = None  # "mild", "moderate", "severe"
    location: Optional[str] = None  # anatomical site
    character: Optional[str] = None  # "burning", "sharp", "throbbing", "dull"
    associated_symptoms: List[str] = field(default_factory=list)
    denied_symptoms: List[str] = field(default_factory=list)
    aggravating_factors: List[str] = field(default_factory=list)
    relieving_factors: List[str] = field(default_factory=list)
    previous_treatments: List[str] = field(default_factory=list)
    conversation_log: List[Dict[str, str]] = field(default_factory=list)

    def add_turn(self, role: str, text: str):
        self.conversation_log.append({"role": role, "text": text})

    def has_duration(self) -> bool:
        return bool(self.duration and self.duration.strip())

    def has_associated_symptoms(self) -> bool:
        return bool(len(self.associated_symptoms) > 0 or len(self.denied_symptoms) > 0)

    def is_clinically_sufficient(self) -> bool:
        """
        Evaluates whether intake meets clinical requirements to safely proceed to remedy synthesis.
        Strictly requires:
        1. An identified chief complaint
        2. Known duration/timeline (a doctor cannot prescribe without knowing acute vs chronic)
        3. Either confirmed denial of other symptoms, identified severity, or noted associated symptoms.
        """
        if not self.chief_complaint:
            return False
        if not self.has_duration():
            return False
        # Has duration and patient either denied other symptoms or specified severity/associated symptoms
        return bool(self.severity or len(self.associated_symptoms) > 0 or len(self.denied_symptoms) > 0)

    def update_from_narrative(self, text: str):
        """Extracts clinical entities using deterministic regex patterns."""
        if not text:
            return

        text_lower = text.lower().strip()

        # 1. Duration extraction (require explicit number or temporal anchor, not bare words)
        dur_match = re.search(
            r"\b((?:\d+|ek|do|teen|chaar|paanch|chhe|saat)\s*(?:din|hafte|mahine|ghante|days?|hours?|weeks?|months?)(?:\s*se)?|kal\s*se|aaj\s*se|parso\s*se|subah\s*se|shaam\s*se|raat\s*se|since\s*(?:yesterday|today|morning)|\d+\s*(?:din|hafte)|katga\s*din|kaba\s*bati)\b",
            text_lower
        )
        if dur_match and not self.duration:
            self.duration = dur_match.group(1).strip()

        # 2. Severity extraction
        if any(w in text_lower for w in ["bahut tez", "bohot tez", "severe", "asahniya", "intense", "ghano peed", "high"]):
            self.severity = "severe"
        elif any(w in text_lower for w in ["halka", "halki", "mild", "thoda", "thodi"]):
            if not self.severity:
                self.severity = "mild"
        elif any(w in text_lower for w in ["madhyam", "moderate", "theek theek"]):
            if not self.severity:
                self.severity = "moderate"

        # 3. Chief complaint anchoring
        if not self.chief_complaint:
            from app.core.clinical_ontology import get_symptom_data
            data = get_symptom_data(text_lower)
            if data and data.get("primary_category") != "general":
                self.chief_complaint = data.get("primary_category", "")

        # 4. Check global denial of other symptoms ("aur koi lakshan nahi", "bas yahi hai", "no other symptoms")
        if re.search(r"\b(?:aur koi (?:lakshan|takleef) nahi|koi aur nahi|kuch nahi|nahi hai|nahin hai|bas yahi|bas itna|no other|nothing else|only this)\b", text_lower):
            if "no_other_symptoms" not in self.denied_symptoms:
                self.denied_symptoms.append("no_other_symptoms")

        # 5. Associated and denied symptoms
        symptom_map = {
            "chakkar": "dizziness",
            "ulti": "nausea_vomiting",
            "vomiting": "vomiting",
            "bukhar": "fever",
            "fever": "fever",
            "khansi": "cough",
            "cough": "cough",
            "thand": "chills",
            "kapkapi": "chills",
            "jalan": "burning",
            "sujan": "swelling",
            "khujli": "itching",
            "sar dard": "headache",
            "naak behna": "runny_nose",
            "naak band": "nasal_block",
            "chheenk": "sneezing",
            "zukam": "cold",
            "zukaam": "cold",
            "jukham": "cold",
            "jukhaam": "cold",
            "sardi": "cold",
            "gale me kharash": "sore_throat",
            "kharash": "sore_throat",
            "badan dard": "body_ache"
        }

        complaint_related = {
            "cold_flu": {"cold", "nasal_block", "runny_nose", "sneezing"},
            "digestive": {"gas", "indigestion", "bloating", "acidity"},
            "headache": {"headache"},
            "fever": {"fever", "chills"}
        }
        related_set = complaint_related.get(self.chief_complaint, set())

        for token, sym_name in symptom_map.items():
            if token in text_lower:
                # Check if denied ("ulti nahi hai", "no vomiting", "vomiting nahi")
                if re.search(rf"\b(?:no|nahi|nahin|mat)\s+{re.escape(token)}\b|\b{re.escape(token)}\s+(?:nahi|nahin)\b", text_lower):
                    if sym_name not in self.denied_symptoms:
                        self.denied_symptoms.append(sym_name)
                else:
                    if sym_name != self.chief_complaint and sym_name not in related_set and sym_name not in self.associated_symptoms:
                        self.associated_symptoms.append(sym_name)

    def to_clinical_summary(self) -> str:
        """Generates a concise clinical summary for LLM context."""
        parts = [f"Chief Complaint: {self.chief_complaint or 'Unspecified'}"]
        if self.duration:
            parts.append(f"Duration: {self.duration}")
        if self.severity:
            parts.append(f"Severity: {self.severity}")
        if self.location:
            parts.append(f"Location: {self.location}")
        if self.associated_symptoms:
            parts.append(f"Associated Symptoms: {', '.join(self.associated_symptoms)}")
        if self.denied_symptoms:
            parts.append(f"Denied Symptoms: {', '.join(self.denied_symptoms)}")
        return " | ".join(parts)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "StructuredSymptomProfile":
        if not data:
            return cls()
        valid_fields = cls.__dataclass_fields__.keys()
        filtered = {k: v for k, v in data.items() if k in valid_fields}
        return cls(**filtered)
