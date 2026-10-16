import json
import os
import re
from typing import Tuple, List, Dict, Any, Optional
import networkx as nx

class SafetyKnowledgeGraph:
    """
    Evaluates proposed botanical and Ayurvedic remedies against patient comorbidities,
    pregnancy, and pediatric/geriatric states using a directed contraindication graph
    and clinical lifecycle exclusion policies.
    """
    def __init__(self, data_path: str = "DATA/contraindications_graph.json"):
        self.graph = nx.DiGraph()
        self.lifecycle_exclusions: List[Dict[str, Any]] = []
        if not os.path.exists(data_path) and os.path.exists(os.path.join("backend", data_path)):
            data_path = os.path.join("backend", data_path)
        self.data_path = data_path
        self._load_and_build_graph()

    def _load_and_build_graph(self):
        """Loads contraindication rules and lifecycle exclusions from JSON and builds the graph."""
        if not os.path.exists(self.data_path):
            return

        with open(self.data_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.lifecycle_exclusions = data.get("lifecycle_exclusions", [])

        for rule in data.get("contraindications", []):
            herb = rule["herb"].lower()
            condition = rule["target_condition"].lower()
            self.graph.add_edge(
                herb,
                condition,
                severity=rule.get("severity", "HIGH"),
                reason=rule.get("reason", "Contraindicated for patient condition.")
            )

    def validate_lifecycle(
        self,
        remedy_text: str,
        age: Optional[int] = None,
        gender: Optional[str] = None,
        is_pregnant: Optional[bool] = None,
        is_lactating: Optional[bool] = None
    ) -> Tuple[bool, str]:
        """
        Validates candidate remedy against patient life stage (pregnancy, lactation, pediatric, geriatric).
        Returns:
            (is_safe: bool, reason: str)
        """
        if not remedy_text:
            return True, "Empty remedy text."

        remedy_lower = remedy_text.lower()

        for policy in self.lifecycle_exclusions:
            stage = policy.get("lifecycle", "")
            excluded = policy.get("excluded_herbs", [])
            severity = policy.get("severity", "HIGH")
            reason = policy.get("reason", "Contraindicated for patient lifecycle.")

            applies = False
            if stage == "pregnancy" and is_pregnant is True:
                applies = True
            elif stage == "lactation" and is_lactating is True:
                applies = True
            elif stage == "pediatric_under_2" and age is not None and age < 2:
                applies = True
            elif stage == "pediatric_under_5" and age is not None and age < 5:
                applies = True
            elif stage == "elderly_above_70" and age is not None and age >= 70:
                applies = True

            if applies:
                for herb in excluded:
                    herb_clean = herb.strip().lower()
                    # Check word boundary pattern to prevent partial token collisions
                    pattern = rf"\b{re.escape(herb_clean)}\b"
                    if re.search(pattern, remedy_lower):
                        return False, f"Lifecycle Exclusion [{severity}]: {reason} (Target: {herb})"

        return True, "Verified safe against lifecycle policies."

    CONDITION_SYNONYMS = {
        # Hypertension
        "bp": "hypertension",
        "high bp": "hypertension",
        "high blood pressure": "hypertension",
        "hypertension": "hypertension",
        "uchch raktchaap": "hypertension",
        "हाई बीपी": "hypertension",
        "उच्च रक्तचाप": "hypertension",

        # Hyperacidity / Peptic Ulcer
        "acidity": "hyperacidity/pepticulcer",
        "hyperacidity": "hyperacidity/pepticulcer",
        "ulcer": "hyperacidity/pepticulcer",
        "gastric ulcer": "hyperacidity/pepticulcer",
        "peptic ulcer": "hyperacidity/pepticulcer",
        "hyperacidity/pepticulcer": "hyperacidity/pepticulcer",
        "pet me jalan": "hyperacidity/pepticulcer",
        "khatti dakar": "hyperacidity/pepticulcer",
        "एसिडिटी": "hyperacidity/pepticulcer",
        "अल्सर": "hyperacidity/pepticulcer",
        "पेट में जलन": "hyperacidity/pepticulcer",

        # Pregnancy
        "pregnancy": "pregnancy",
        "pregnant": "pregnancy",
        "garbhavastha": "pregnancy",
        "garbhvati": "pregnancy",
        "गर्भावस्था": "pregnancy",
        "गर्भवती": "pregnancy",

        # Diabetes
        "diabetes": "diabetes",
        "sugar": "diabetes",
        "madhumeh": "diabetes",
        "blood sugar": "diabetes",
        "शुगर": "diabetes",
        "मधुमेह": "diabetes",

        # Infant Under 1 Year
        "infant": "infantunder1year",
        "infantunder1year": "infantunder1year",
        "baby": "infantunder1year",
        "newborn": "infantunder1year",
        "navjaat": "infantunder1year",
        "नवजात": "infantunder1year",

        # Ear Discharge
        "eardischarge": "eardischarge",
        "ear discharge": "eardischarge",
        "ear pus": "eardischarge",
        "pus from ear": "eardischarge",
        "kaan behna": "eardischarge",
        "kan behna": "eardischarge",
        "kaan se mavad": "eardischarge",
        "kaan se mad": "eardischarge",
        "kan se mavad": "eardischarge",
        "mavad": "eardischarge",
        "कान बहना": "eardischarge",
        "कान से मवाद": "eardischarge",
        "मवाद": "eardischarge",
    }

    def map_condition(self, condition: str) -> str:
        """Maps diverse clinical and colloquial condition expressions to canonical ontology keys."""
        if not condition:
            return ""
        cond_raw = condition.strip().lower()
        if cond_raw in self.CONDITION_SYNONYMS:
            return self.CONDITION_SYNONYMS[cond_raw]
        for k, v in self.CONDITION_SYNONYMS.items():
            if k in cond_raw:
                return v
        return cond_raw

    def validate_remedy(
        self,
        remedy_text: Any,
        patient_conditions: Optional[List[str]] = None,
        age: Optional[int] = None,
        gender: Optional[str] = None,
        is_pregnant: Optional[bool] = None,
        is_lactating: Optional[bool] = None,
        remedy_name: Optional[str] = None,
    ) -> Tuple[bool, str]:
        """
        Validates a candidate remedy against patient conditions and demographic lifecycle.
        Inspects both remedy_name and remedy_text for botanical contraindications.
        Returns:
            (is_safe: bool, reason: str)
        """
        # If passed a dictionary object directly, unpack remedy_name and remedy_text
        if isinstance(remedy_text, dict):
            remedy_dict = remedy_text
            remedy_name = remedy_dict.get("remedy_name", "") or remedy_name
            remedy_text = remedy_dict.get("remedy_text", "")

        full_text = f"{remedy_name or ''} {remedy_text or ''}".strip()
        if not full_text:
            return True, "Verified safe."

        # 1. Lifecycle validations (pregnancy, age constraints)
        # Infer pregnancy from conditions if not passed as boolean flag
        if is_pregnant is None and patient_conditions:
            conds_lower = " ".join(c.lower() for c in patient_conditions)
            if any(term in conds_lower for term in ["pregnant", "pregnancy", "garbh", "garbhavastha", "गर्भावस्था", "गर्भवती"]):
                is_pregnant = True

        safe_lifecycle, lifecycle_reason = self.validate_lifecycle(
            remedy_text=full_text,
            age=age,
            gender=gender,
            is_pregnant=is_pregnant,
            is_lactating=is_lactating
        )
        if not safe_lifecycle:
            return False, lifecycle_reason

        # 2. Comorbidity graph validations
        if not patient_conditions:
            return True, "No patient comorbidities specified. Verified safe."

        remedy_lower = full_text.lower()
        mapped_conditions = set()
        for c in patient_conditions:
            if c:
                canonical = self.map_condition(c)
                mapped_conditions.add(canonical)
                mapped_conditions.add(re.sub(r'[^a-z0-9]', '', canonical.lower()))
                mapped_conditions.add(re.sub(r'[^a-z0-9]', '', c.lower()))

        # Check explicit contraindicated_conditions on remedy dict if available
        if isinstance(remedy_text, dict) or "remedy_dict" in locals():
            r_dict = locals().get("remedy_dict") or (remedy_text if isinstance(remedy_text, dict) else {})
            for c_cond in r_dict.get("contraindicated_conditions", []):
                c_canon = self.map_condition(c_cond)
                c_norm = re.sub(r'[^a-z0-9]', '', c_cond.lower())
                c_canon_norm = re.sub(r'[^a-z0-9]', '', c_canon.lower())
                for cond in mapped_conditions:
                    if cond and (cond == c_canon or cond in c_norm or c_norm in cond or cond in c_canon_norm or c_canon_norm in cond):
                        return False, f"Contraindication Alert [CRITICAL]: Strictly contraindicated when {c_cond} is present."

        for herb, target_condition, attrs in self.graph.edges(data=True):
            herb_aliases = [alias.strip().lower() for alias in herb.split("/")]

            # Check if any alias of contraindicated herb is present in full_text
            herb_matched = False
            for alias in herb_aliases:
                if re.search(r"[\u0900-\u097F]", alias):
                    if alias in remedy_lower:
                        herb_matched = True
                        break
                else:
                    pattern = rf"\b{re.escape(alias)}\b"
                    if re.search(pattern, remedy_lower):
                        herb_matched = True
                        break

            if herb_matched:
                target_canonical = self.map_condition(target_condition)
                target_norm = re.sub(r'[^a-z0-9]', '', target_condition.lower())
                target_canon_norm = re.sub(r'[^a-z0-9]', '', target_canonical.lower())

                for cond in mapped_conditions:
                    if cond and (
                        cond == target_canonical
                        or cond in target_norm
                        or target_norm in cond
                        or cond in target_canon_norm
                        or target_canon_norm in cond
                    ):
                        severity = attrs.get("severity", "HIGH")
                        reason = attrs.get("reason", "Contraindication detected.")
                        return False, f"Contraindication Alert [{severity}]: {reason}"

        return True, "Verified safe against known patient conditions."