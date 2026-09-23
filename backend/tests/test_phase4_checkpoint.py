import logging
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.core.hybrid_rag import HybridRemedyStore, get_shared_remedy_store

client = TestClient(app)


def test_normal_search_returns_remedies():
    store = get_shared_remedy_store()
    results = store.search_remedies("fever headache", limit=2)
    assert isinstance(results, list)
    assert len(results) > 0
    # Every result should have remedy_name
    for r in results:
        assert "remedy_name" in r
        assert "similarity_score" in r or "source" in r


def test_mocked_qdrant_failure_returns_fallback_keyword(caplog, capsys):
    store = get_shared_remedy_store()
    sanjeevani_logger = logging.getLogger("sanjeevani")
    sanjeevani_logger.addHandler(caplog.handler)

    try:
        # Mock client.query_points to raise TimeoutError
        with patch.object(store.client, "query_points", side_effect=TimeoutError("Qdrant query timed out")):
            with caplog.at_level(logging.WARNING, logger="sanjeevani"):
                results = store.search_remedies("fever cough cold", limit=2)

        # 1. Must return fallback remedies
        assert isinstance(results, list)
        assert len(results) > 0
        for r in results:
            assert r.get("source") == "fallback_keyword"

        # 2. Must log exact warning pattern
        expected_warning = "[RAG] Qdrant search timed out / failed, falling back to BM25 / keyword search"
        stdout_text = capsys.readouterr().out
        assert any(expected_warning in record.message for record in caplog.records) or expected_warning in stdout_text
    finally:
        sanjeevani_logger.removeHandler(caplog.handler)


def test_mocked_qdrant_none_returns_fallback_keyword(caplog, capsys):
    store = get_shared_remedy_store()
    sanjeevani_logger = logging.getLogger("sanjeevani")
    sanjeevani_logger.addHandler(caplog.handler)

    try:
        with patch.object(store, "client", None):
            with caplog.at_level(logging.WARNING, logger="sanjeevani"):
                results = store.search_remedies("digestive indigestion", limit=2)

        assert isinstance(results, list)
        assert len(results) > 0
        for r in results:
            assert r.get("source") == "fallback_keyword"

        expected_warning = "[RAG] Qdrant search timed out / failed, falling back to BM25 / keyword search"
        stdout_text = capsys.readouterr().out
        assert any(expected_warning in record.message for record in caplog.records) or expected_warning in stdout_text
    finally:
        sanjeevani_logger.removeHandler(caplog.handler)


def test_health_reflects_qdrant_status():
    # 1. Normal state should return 200 with database ok
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["database"] == "ok"
    assert "status" in data
    assert data["status"] in ("healthy", "degraded")

    # 2. Degraded state when Qdrant is unreachable: should return 200 with status: degraded (never 500)
    mock_store = MagicMock()
    mock_store.client.collection_exists.side_effect = Exception("Connection refused to Qdrant")
    
    app.state.remedy_store = mock_store
    try:
        with patch("app.core.hybrid_rag.get_shared_remedy_store", return_value=mock_store):
            resp_degraded = client.get("/health")
            assert resp_degraded.status_code == 200
            deg_data = resp_degraded.json()
            assert deg_data["status"] == "degraded"
            assert deg_data["qdrant"] == "unreachable"
            assert deg_data["degraded"] is True
    finally:
        app.state.remedy_store = get_shared_remedy_store()
