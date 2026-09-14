import pytest
from app.core.triage_engine import ClinicalTriageEngine, SeverityTier

@pytest.fixture
def engine():
    return ClinicalTriageEngine()

def test_emergency_chest_pain(engine):
    narrative = "Patient is experiencing heavy pressure in chest and sweating."
    tier, flags = engine.evaluate(narrative)
    assert tier == SeverityTier.RED
    assert any("cardiac_chest_pain" in f for f in flags)

def test_emergency_hindi_breathing(engine):
    narrative = "Mareezo ko saans lene me takleef ho rahi hai."
    tier, flags = engine.evaluate(narrative)
    assert tier == SeverityTier.RED
    assert any("acute_respiratory_distress" in f for f in flags)

def test_negation_handling_chest_pain(engine):
    """Ensure 'no chest pain' does NOT trigger RED tier."""
    narrative = "I have mild cough and sneezing, but no chest pain at all."
    tier, _ = engine.evaluate(narrative)
    assert tier == SeverityTier.GREEN

def test_negation_handling_hindi(engine):
    """Ensure Hindi negation 'seene me dard nahi' does NOT trigger RED tier."""
    narrative = "Halki khasi hai, par seene me dard nahi hai."
    tier, _ = engine.evaluate(narrative)
    assert tier == SeverityTier.GREEN

def test_yellow_tier_persistent_fever(engine):
    narrative = "I have had a continuous fever for 3 days and body weakness."
    tier, flags = engine.evaluate(narrative)
    assert tier == SeverityTier.YELLOW
    assert any("prolonged_fever" in f for f in flags)

def test_green_tier_routine_cold(engine):
    narrative = "Mujhe do din se gale me kharash aur halka zukaam hai."
    tier, _ = engine.evaluate(narrative)
    assert tier == SeverityTier.GREEN