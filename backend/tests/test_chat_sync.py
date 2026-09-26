import pytest
from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_chat_sync_offline_endpoint():
    payload = {
        "consultations": [
            {
                "conversation_id": "TEST-OFFLINE-SYNC-999",
                "summary": "Offline Consultation: Tulsi Kadha for dry cough",
                "tier": "Green",
                "user_message": "mujhe khansi hai",
                "created_at": "2026-09-25T14:00:00Z"
            }
        ]
    }

    response = client.post("/chat/sync-offline", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["synced_count"] == 1
    assert "TEST-OFFLINE-SYNC-999" in data["synced_ids"]

def test_chat_sync_offline_empty_list():
    response = client.post("/chat/sync-offline", json={"consultations": []})
    assert response.status_code == 200
    assert response.json()["synced_count"] == 0
