import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models import create_tables, get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    create_tables()


def test_chat_message_indexes_and_history_retrieval():
    conv_id = f"test-hist-{int(__import__('time').time())}"

    # Send a message to /chat/message
    resp = client.post("/chat/message", json={
        "conversation_id": conv_id,
        "message": "Mujhe 2 din se halka bukhar hai",
        "language_hint": "hindi",
        "patient_context": {"known_conditions": []}
    })
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["conversation_id"] == conv_id

    # Check that it appears in GET /chat/history
    hist_resp = client.get("/chat/history")
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
