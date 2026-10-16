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

def test_honey_infant_blocked(kg):
    """Honey/Madhu must be blocked for infants under 1 year due to botulism risk."""
    remedy_text = "Give 1 tsp Honey (Madhu) with warm water."
    is_safe, reason = kg.validate_remedy(remedy_text, ["infant"])
    assert is_safe is False
    assert "botulism" in reason.lower()

def test_sugar_diabetes_blocked(kg):
    """Concentrated sugar/misri must be blocked for diabetic patients."""
    remedy_text = "Mix Misri and Sharkara powder with warm milk."
    is_safe, reason = kg.validate_remedy(remedy_text, ["diabetes"])
    assert is_safe is False
    assert "glycemic" in reason.lower() or "sugar" in reason.lower() or "diabetes" in reason.lower()

def test_triphala_pregnancy_blocked(kg):
    """Triphala/Haritaki must be contraindicated during pregnancy."""
    remedy_text = "Take 1 tsp Triphala churna before bedtime."
    is_safe, reason = kg.validate_remedy(remedy_text, ["pregnancy"])
    assert is_safe is False

def test_guggulu_pregnancy_blocked(kg):
    """Guggulu must be contraindicated during pregnancy due to emmenagogue effects."""
    remedy_text = "Take Kanchnar Guggulu tablets with warm water."
    is_safe, reason = kg.validate_remedy(remedy_text, ["garbhavastha"])
    assert is_safe is False

def test_canonical_synonym_normalization(kg):
    """Test that canonical synonym mapping works for colloquial phrases like 'high bp' and 'pet me jalan'."""
    remedy_text = "Boil Licorice (Mulethi) root with water."
    is_safe, reason = kg.validate_remedy(remedy_text, ["high bp"])
    assert is_safe is False

    remedy_text_ginger = "Drink fresh ginger and black pepper decoction."
    is_safe_g, reason_g = kg.validate_remedy(remedy_text_ginger, ["pet me jalan"])
    assert is_safe_g is False