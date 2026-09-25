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

def test_backend_and_frontend_red_patterns_sync():
    """
    FAILURE WARNING: If this test fails, backend RED_PATTERNS in
    `app/core/clinical_lexicon.py` and frontend RED_PATTERNS in
    `frontend/src/lib/localTriageFallback.js` have diverged!
    If you add, rename, or change a Red-flag clinical category or pattern on one side,
    you MUST mirror it on the other side to keep client-side and server-side safety in sync.
    """
    from app.core.clinical_lexicon import RED_PATTERNS as BACKEND_RED_PATTERNS
    from pathlib import Path
    import re

    js_path = Path(__file__).resolve().parents[2] / "frontend" / "src" / "lib" / "localTriageFallback.js"
    assert js_path.exists(), f"Frontend fallback file not found at {js_path}"

    js_content = js_path.read_text(encoding="utf-8")

    # Extract categories defined in JS RED_PATTERNS
    match = re.search(r"export\s+const\s+RED_PATTERNS\s*=\s*\{([\s\S]*?)\n\};", js_content)
    assert match, "Could not find RED_PATTERNS in localTriageFallback.js"

    js_block = match.group(1)
    js_categories = set(re.findall(r"(\w+)\s*:\s*\[", js_block))
    backend_categories = set(BACKEND_RED_PATTERNS.keys())

    diff = backend_categories.symmetric_difference(js_categories)
    assert not diff, (
        f"CRITICAL CLINICAL SAFETY MISMATCH: Backend and frontend RED_PATTERNS categories diverged! "
        f"Difference: {diff}. If you add/change a category or regex on one side, "
        f"you MUST mirror it on the other side."
    )