"""
Sanjeevani Clinical & LLM Evaluation Framework
==============================================
Provides automated clinical safety, triage sensitivity, negation robustness,
contraindication filtering, and AYUSH retrieval grounding evaluations.
"""

from .evaluator import SanjeevaniEvaluator, EvaluationReport
from .metrics import (
    TriageSensitivityMetric,
    NegationHandlingMetric,
    ContraindicationSafetyMetric,
    AYUSHGroundingMetric,
    SocraticIntakeMetric,
    MultilingualFidelityMetric,
)

__all__ = [
    "SanjeevaniEvaluator",
    "EvaluationReport",
    "TriageSensitivityMetric",
    "NegationHandlingMetric",
    "ContraindicationSafetyMetric",
    "AYUSHGroundingMetric",
    "SocraticIntakeMetric",
    "MultilingualFidelityMetric",
]
