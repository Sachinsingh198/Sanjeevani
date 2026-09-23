import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models import get_db, create_tables, seed_default_admin
from app.core.auth import create_access_token
from app.core.analytics import log_analytics_event, get_analytics_summary
from app.core.limiter import limiter, rate_limit_bilingual_handler
from slowapi.errors import RateLimitExceeded
from unittest.mock import MagicMock

# Ensure tables exist
create_tables()
seed_default_admin()

client = TestClient(app)

@pytest.fixture
def admin_headers():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    admin_id = row[0] if row else 1
    token = create_access_token({"sub": "admin", "role": "admin", "user_id": admin_id})
    return {"Authorization": f"Bearer {token}"}


def test_chat_message_and_analytics_logging():
    """Hit /chat/message with a sample consultation and verify analytics event is logged with zero PII."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM analytics_events")
    count_before = cursor.fetchone()[0]
    conn.close()

    # 1. Send normal chat message with valid ChatRequest schema -> 200
    resp = client.post("/chat/message", json={
        "conversation_id": "test_consult_analytics_001",
        "message": "Namaste doctor, mujhe halka sirdard hai",
        "language_hint": "hi"
    })
    assert resp.status_code == 200

    # 2. Check SQLite: row appears in analytics_events with correct tier and language, NO PII
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM analytics_events")
    count_after = cursor.fetchone()[0]
    assert count_after > count_before

    cursor.execute("SELECT event_type, tier, language FROM analytics_events ORDER BY id DESC LIMIT 1")
    latest = cursor.fetchone()
    conn.close()

    assert latest is not None
    assert latest[0] in ["consultation_started", "emergency_escalated", "remedy_delivered"]
    assert latest[2] in ["hi", "hindi", "auto"]


def test_admin_analytics_summary_endpoint(admin_headers):
    """Verify GET /admin/analytics/summary returns the structured aggregate data when authenticated."""
    # Ensure at least a few test events exist
    log_analytics_event("consultation_started", tier="green", language="hi")
    log_analytics_event("emergency_escalated", tier="red", language="hi")
    log_analytics_event("remedy_delivered", tier="green", language="en")
    
    response = client.get("/admin/analytics/summary?days=30", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_events" in data
    assert "by_type" in data
    assert "by_tier" in data
    assert "by_language" in data
    assert "active_days" in data
    assert data["total_events"] >= 3
    assert data["by_tier"].get("red", 0) >= 1
    assert data["by_tier"].get("green", 0) >= 1


def test_analytics_event_schema_zero_pii():
    """Verify that analytics_events table contains strictly non-PII columns and no user text."""
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(analytics_events)")
        columns = [row[1] for row in cursor.fetchall()]
        
        # Verify schema
        assert "id" in columns
        assert "event_type" in columns
        assert "tier" in columns
        assert "language" in columns
        assert "created_at" in columns
        
        # Verify forbidden PII columns are NOT present
        forbidden_pii = ["name", "phone", "email", "query", "message", "symptoms", "ip_address"]
        for col in forbidden_pii:
            assert col not in columns, f"Forbidden PII column '{col}' found in analytics_events!"
            
        # Verify stored rows don't contain freeform medical text
        cursor.execute("SELECT event_type, tier, language FROM analytics_events ORDER BY id DESC LIMIT 5")
        rows = cursor.fetchall()
        valid_tiers = {None, "red", "yellow", "green"}
        for r in rows:
            val = r[1].lower() if r[1] is not None else None
            assert val in valid_tiers
    finally:
        conn.close()


def test_rate_limiting_chat_bilingual_response():
    """Verify that SlowAPI rate limit generates 429 with Retry-After and bilingual detail."""
    # 1. Normal request returns 200
    resp = client.post("/chat/message", json={
        "conversation_id": "test_limiter_sess_001",
        "message": "Namaste doctor",
        "language_hint": "hi"
    })
    assert resp.status_code == 200
    
    # 2. Force/mock rate limit exceeded on request handler -> 429 with Retry-After and bilingual message
    req = MagicMock()
    req.state = MagicMock()
    req.url.path = "/chat/message"
    exc = RateLimitExceeded(limit=MagicMock(detail="60/hour"))
    
    response_429 = rate_limit_bilingual_handler(req, exc)
    assert response_429.status_code == 429
    assert "Retry-After" in response_429.headers
    assert response_429.headers["Retry-After"] == "60"
    
    body = response_429.body.decode("utf-8")
    assert "Bahut zyada anurodh. Kripya thodi der baad koshish karein." in body
    assert "Too many requests. Please try again later." in body
