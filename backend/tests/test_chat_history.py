import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models import create_tables, get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    create_tables()


def test_chat_message_indexes_and_history_retrieval():
    from app.core.auth import create_access_token
    from app.models import seed_default_admin
    from app.db.session import get_db_connection
    from app.db.schema import users_table
    from sqlalchemy import select

    seed_default_admin()
    with get_db_connection() as conn:
        row = conn.execute(select(users_table.c.id).where(users_table.c.role == "patient")).fetchone()
        patient_id = row[0] if row else 3

    conv_id = f"test-hist-{int(__import__('time').time())}"
    token = create_access_token({"user_id": patient_id, "role": "patient"})
    auth_headers = {"Authorization": f"Bearer {token}"}

    # Send a message to /chat/message
    resp = client.post("/chat/message", json={
        "conversation_id": conv_id,
        "message": "Mujhe 2 din se halka bukhar hai",
        "language_hint": "hindi",
        "patient_context": {"known_conditions": []}
    }, headers=auth_headers)
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["conversation_id"] == conv_id

    # Check that it appears in GET /chat/history for the authenticated user
    hist_resp = client.get("/chat/history", headers=auth_headers)
    assert hist_resp.status_code == 200
    history = hist_resp.json()
    assert isinstance(history, list)
    matching = [h for h in history if h["conversation_id"] == conv_id]
    assert len(matching) > 0
    assert matching[0]["tier"] in ("Green", "Yellow", "Red")
    assert matching[0]["summary"] is not None

    # Check GET /chat/history/{conv_id}
    detail_resp = client.get(f"/chat/history/{conv_id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["conversation_id"] == conv_id
    assert "tier" in detail
    assert "flags" in detail
    assert "final_recommendation" in detail
    assert "turn_count" in detail
    assert "timestamp" in detail


def test_chat_history_not_found():
    resp = client.get("/chat/history/non-existent-unknown-conversation-xyz")
    assert resp.status_code == 404
