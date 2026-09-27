import pytest
import asyncio
import json
import logging
from fastapi.testclient import TestClient
from app.main import app
from app.core.logger import JsonFormatter, setup_logger
from app.core.resilience import retry_sync, retry_async, calculate_backoff

client = TestClient(app)


def test_health_check_deep_readiness_probe():
    """Verify GET /health returns per-dependency latency and operational statuses."""
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()

    assert data["status"] in ("healthy", "degraded")
    assert "timestamp" in data
    assert "dependencies" in data
    deps = data["dependencies"]

    # 1. Database dependency
    assert "database" in deps
    assert deps["database"]["status"] == "ok"
    assert isinstance(deps["database"]["latency_ms"], (int, float))
    assert deps["database"]["latency_ms"] >= 0
    assert deps["database"]["engine"] in ("sqlite", "postgresql")

    # 2. Vector store dependency
    assert "vector_store" in deps
    assert deps["vector_store"]["status"] in ("ok", "unreachable")
    assert deps["vector_store"]["mode"] == "hybrid_rag"

    # 3. LLM providers dependency
    assert "llm_providers" in deps
    assert deps["llm_providers"]["status"] in ("ok", "none_configured")
    assert isinstance(deps["llm_providers"]["available"], list)

    # 4. Voice dependency
    assert "voice" in deps
    assert "tts_provider" in deps["voice"]
    assert "stt_provider" in deps["voice"]


def test_calculate_backoff_mechanics():
    """Verify exponential delay increases monotonically with attempt."""
    d0 = calculate_backoff(0, base_delay=0.1, max_delay=10.0, backoff_factor=2.0, jitter=False)
    d1 = calculate_backoff(1, base_delay=0.1, max_delay=10.0, backoff_factor=2.0, jitter=False)
    d2 = calculate_backoff(2, base_delay=0.1, max_delay=10.0, backoff_factor=2.0, jitter=False)

    assert d0 == 0.1
    assert d1 == 0.2
    assert d2 == 0.4

    # With jitter, delay should stay bounded within [0.5*delay, 1.0*delay]
    dj = calculate_backoff(2, base_delay=0.1, max_delay=10.0, backoff_factor=2.0, jitter=True)
    assert 0.2 <= dj <= 0.4


def test_retry_sync_success_on_retry():
    """Verify synchronous retry recovers when initial attempts fail."""
    attempts = 0

    def flaky_func():
        nonlocal attempts
        attempts += 1
        if attempts < 2:
            raise ConnectionError("Transient network failure")
        return "success"

    result = retry_sync(flaky_func, max_retries=2, base_delay=0.01, caller_name="TestSyncRetry")
    assert result == "success"
    assert attempts == 2


def test_retry_sync_exhaustion():
    """Verify synchronous retry raises last exception when all attempts fail."""
    attempts = 0

    def always_failing():
        nonlocal attempts
        attempts += 1
        raise TimeoutError("Remote server timed out")

    with pytest.raises(TimeoutError, match="Remote server timed out"):
        retry_sync(always_failing, max_retries=2, base_delay=0.01, caller_name="TestSyncExhaustion")

    assert attempts == 3  # Initial try + 2 retries


@pytest.mark.asyncio
async def test_retry_async_success_on_retry():
    """Verify asynchronous retry recovers when initial call fails."""
    attempts = 0

    async def flaky_async():
        nonlocal attempts
        attempts += 1
        if attempts < 2:
            raise RuntimeError("Temporary async glitch")
        return "async_success"

    result = await retry_async(flaky_async, max_retries=2, base_delay=0.01, caller_name="TestAsyncRetry")
    assert result == "async_success"
    assert attempts == 2


@pytest.mark.asyncio
async def test_retry_async_exhaustion():
    """Verify asynchronous retry raises last exception when max retries exceeded."""
    attempts = 0

    async def always_failing_async():
        nonlocal attempts
        attempts += 1
        raise ValueError("Permanent invalid payload")

    with pytest.raises(ValueError, match="Permanent invalid payload"):
        await retry_async(always_failing_async, max_retries=2, base_delay=0.01, caller_name="TestAsyncExhaustion")

    assert attempts == 3


def test_json_formatter_extra_fields():
    """Verify JsonFormatter serializes record attributes and extra metadata."""
    formatter = JsonFormatter()
    record = logging.LogRecord(
        name="sanjeevani.ops",
        level=logging.WARNING,
        pathname="ops.py",
        lineno=42,
        msg="External provider high latency warning",
        args=(),
        exc_info=None,
    )
    # Inject extra attributes
    record.provider = "sarvam_tts"
    record.latency_ms = 485.2

    formatted = formatter.format(record)
    parsed = json.loads(formatted)

    assert parsed["level"] == "WARNING"
    assert parsed["logger"] == "sanjeevani.ops"
    assert parsed["message"] == "External provider high latency warning"
    assert "extra" in parsed
    assert parsed["extra"]["provider"] == "sarvam_tts"
    assert parsed["extra"]["latency_ms"] == 485.2
    assert "timestamp" in parsed
