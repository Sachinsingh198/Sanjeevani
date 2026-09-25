import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models import create_tables, seed_default_admin
from app.db.session import get_db_connection
from app.db.schema import users_table
from sqlalchemy import select
from app.core.auth import create_access_token

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    create_tables()
    seed_default_admin()


@pytest.fixture
def asha_headers():
    with get_db_connection() as conn:
        row = conn.execute(select(users_table.c.id).where(users_table.c.role == "asha")).fetchone()
        asha_id = row[0] if row else 2
    token = create_access_token({"user_id": asha_id, "role": "asha"})
    return {"Authorization": f"Bearer {token}"}


def test_asha_sync_batch_and_listing(asha_headers):
    sample_encounters = [
        {
            "id": "TEST-REC-001",
            "name": "Kamla Devi",
            "village": "Mandal",
            "tier": "Yellow",
            "symptom": "3 din se bukhar aur ulti",
            "vitals": {"spo2": "94", "temp": "101.5", "pulse": "88"},
            "synced": False,
            "followedUp": False,
        },
        {
            "id": "TEST-REC-002",
            "name": "Mohan Singh",
            "village": "Gopeshwar",
            "tier": "Green",
            "symptom": "Gale me kharash",
            "vitals": {"spo2": "98", "temp": "98.4", "pulse": "72"},
            "synced": False,
            "followedUp": False,
        }
    ]

    resp = client.post("/asha/sync-batch", json={"encounters": sample_encounters}, headers=asha_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["synced_count"] == 2
    assert "TEST-REC-001" in data["ids"]
    assert "TEST-REC-002" in data["ids"]

    # Verify encounters are listed
    list_resp = client.get("/asha/encounters", headers=asha_headers)
    assert list_resp.status_code == 200
    encounters = list_resp.json()
    assert isinstance(encounters, list)
    ids = [e["id"] for e in encounters]
    assert "TEST-REC-001" in ids
    assert "TEST-REC-002" in ids


def test_asha_sync_batch_empty(asha_headers):
    resp = client.post("/asha/sync-batch", json={"encounters": []}, headers=asha_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["synced_count"] == 0
    assert data["ids"] == []
