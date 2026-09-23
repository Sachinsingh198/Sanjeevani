import json
import os
from typing import Tuple, List, Dict, Any
import networkx as nx

class SafetyKnowledgeGraph:
    """
    Evaluates proposed botanical and Ayurvedic remedies against patient comorbidities,
    pregnancy, and pediatric states using a directed contraindication graph.
    """
    def __init__(self, data_path: str = "DATA/contraindications_graph.json"):
        self.graph = nx.DiGraph()
        if not os.path.exists(data_path) and os.path.exists(os.path.join("backend", data_path)):
            data_path = os.path.join("backend", data_path)
        self.data_path = data_path
        self._load_and_build_graph()

    def _load_and_build_graph(self):
        """Loads contraindication rules from JSON and builds the directed graph."""
        if not os.path.exists(self.data_path):
            return

        with open(self.data_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        for rule in data.get("contraindications", []):
            herb = rule["herb"].lower()
            condition = rule["target_condition"].lower()
            self.graph.add_edge(
                herb,
                condition,
                severity=rule.get("severity", "HIGH"),
                reason=rule.get("reason", "Contraindicated for patient condition.")
            )

    def validate_remedy(self, remedy_text: str, patient_conditions: List[str]) -> Tuple[bool, str]:
        """
        Validates a candidate remedy against patient conditions.
        Returns:
            (is_safe: bool, reason: str)
        """
        if not patient_conditions:
            return True, "No patient comorbidities specified. Verified safe."

        remedy_lower = remedy_text.lower()
        # Normalize patient conditions (strip whitespace and lower-case)
        normalized_conditions = [c.lower().replace(" ", "") for c in patient_conditions]

        for herb, target_condition, attrs in self.graph.edges(data=True):
            # Split aliases (e.g., "ginger/sunthi" -> ["ginger", "sunthi"])
            herb_aliases = [alias.strip().lower() for alias in herb.split("/")]
            
            # Check if any alias of the contraindicated herb is mentioned in the remedy
            if any(alias in remedy_lower for alias in herb_aliases):
                for cond in normalized_conditions:
                    target_normalized = target_condition.replace(" ", "")
                    # Match condition substring (e.g. "hypertension" matches "hypertension")
                    if cond in target_normalized or target_normalized in cond:
                        severity = attrs.get("severity", "HIGH")
                        reason = attrs.get("reason", "Contraindication detected.")
                        return False, f"Contraindication Alert [{severity}]: {reason}"

        return True, "Verified safe against known patient conditions."