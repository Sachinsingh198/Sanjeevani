import pytest
from app.core.knowledge_graph import SafetyKnowledgeGraph

@pytest.fixture
def kg():
    return SafetyKnowledgeGraph(data_path="DATA/contraindications_graph.json")

def test_licorice_hypertension_blocked(kg):
    """Mulethi/Licorice must be blocked for patients with hypertension."""
    remedy_text = "Take Mulethi (Licorice) powder boiled in water twice daily."
    is_safe, reason = kg.validate_remedy(remedy_text, ["hypertension"])
    assert is_safe is False
    assert "pseudoaldosteronism" in reason

def test_ginger_ulcer_blocked(kg):
    """Ginger/Sunthi must be blocked for patients with hyperacidity or ulcers."""
    remedy_text = "Drink warm tea with crushed Sunthi (dry ginger) and black pepper."
    is_safe, reason = kg.validate_remedy(remedy_text, ["Hyperacidity/PepticUlcer"])
    assert is_safe is False
    assert "gastric mucosa" in reason or "Pitta" in reason

def test_vasa_pregnancy_blocked(kg):
    """Vasa/Adhatoda must be blocked for pregnant patients."""
    remedy_text = "Mix 1 tsp fresh Vasa (Adhatoda) leaf juice with honey."
    is_safe, reason = kg.validate_remedy(remedy_text, ["Pregnancy"])
    assert is_safe is False
    assert "uterotonic" in reason

def test_safe_condition_allowed(kg):
    """Jeera-Ajwain should pass safely for a patient with hypertension."""
    remedy_text = "Boil Jeera and Ajwain in water and sip after meals."
    is_safe, reason = kg.validate_remedy(remedy_text, ["hypertension"])
    assert is_safe is True
    assert "Verified safe" in reason