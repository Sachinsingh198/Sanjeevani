import pytest
import os
from app.core.hybrid_rag import HybridRemedyStore

@pytest.fixture(scope="module")
def remedy_store():
    # Initialize store (will auto-seed from DATA/remedies_dataset.json)
    return HybridRemedyStore(data_path="DATA/remedies_dataset.json")

def test_rag_initialization(remedy_store):
    """Ensure collection exists and is operational."""
    assert remedy_store.client.collection_exists(remedy_store.collection_name) is True

def test_cough_remedy_retrieval(remedy_store):
    """Querying cold/cough symptoms should retrieve Tulsi-Mulethi or Vasa remedies."""
    query = "Mujhe do din se gale me kharash aur sookhi khasi hai"
    results = remedy_store.search_remedies(query, limit=2)
    
    assert len(results) > 0
    top_remedy = results[0]
    
    # Assert essential fields are present in the payload
    assert "remedy_name" in top_remedy
    assert "remedy_text" in top_remedy
    assert "source" in top_remedy
    
    # Check that either Tulsi-Mulethi or Vasa is returned
    matched_names = [r["remedy_name"] for r in results]
    assert any("Tulsi" in name or "Vasa" in name for name in matched_names)

def test_indigestion_remedy_retrieval(remedy_store):
    """Querying bloating/gas should retrieve Jeera-Ajwain infusion."""
    query = "Pet me bahut gas aur bhari pan lag raha hai"
    results = remedy_store.search_remedies(query, limit=2)
    
    assert len(results) > 0
    matched_names = [r["remedy_name"] for r in results]
    assert any("Jeera" in name or "Ajwain" in name for name in matched_names)

def test_docx_classical_remedy_retrieval(remedy_store):
    """Querying high thirst / burning sensation fever should retrieve classical docx formulations."""
    query = "Tez bukhar jalan pyas lag rahi hai"
    results = remedy_store.search_remedies(query, limit=3)

    assert len(results) > 0
    sources = [r.get("source", "") for r in results]
    assert any("ayurveda_1.docx" in s for s in sources)