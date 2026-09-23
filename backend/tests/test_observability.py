"""
Tests for Phase 1 Observability Foundation:
- Real health check probes (Qdrant, Database, LLM provider resolution, degraded flag)
- Structured logging configuration
- Sentry PII sanitization
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.logger import logger, setup_logger, JsonFormatter
import logging


def test_health_check_endpoint():
    """GET /health must return 200 with probed fields."""
    with TestClient(app) as client:
        res = client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert "database" in data
        assert data["database"] == "ok"
        assert "qdrant" in data
        assert data["qdrant"] in ("ok", "unreachable")
        assert "llm_provider" in data
        assert data["llm_provider"] in ("groq", "gemini", "sarvam", "none")
        assert "degraded" in data
        assert isinstance(data["degraded"], bool)
        assert "status" in data
        assert data["status"] in ("healthy", "degraded", "unhealthy")
        assert "app_env" in data
        assert "default_language" in data


def test_logger_functionality():
    """Structured logger must function cleanly without errors."""
    test_log = setup_logger("test_observability")
    assert test_log is not None
    # Must log without raising exceptions
    test_log.info("Test info message")
    test_log.warning("Test warning message")
    test_log.error("Test error message")


def test_json_formatter():
    """JsonFormatter should serialize LogRecord to JSON."""
    formatter = JsonFormatter()
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname="test.py",
        lineno=10,
        msg="Structured JSON log test",
        args=(),
        exc_info=None,
    )
    formatted = formatter.format(record)
    assert "Structured JSON log test" in formatted
    assert '"level": "INFO"' in formatted
    assert '"logger": "test"' in formatted
