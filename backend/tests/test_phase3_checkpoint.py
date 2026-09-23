import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from app.main import app
from app.db import (
    engine,
    get_db_connection,
    users_table,
    otps_table,
    conversation_index_table,
    patient_encounters_table,
    analytics_events_table,
    row_to_dict,
)
from app.core.auth import create_access_token
from app.models import create_tables, seed_default_admin

create_tables()
seed_default_admin()
client = TestClient(app)

@pytest.fixture
def admin_token():
    with get_db_connection() as conn:
        row = conn.execute(select(users_table.c.id).where(users_table.c.role == "admin")).fetchone()
        admin_id = row[0] if row else 1
    return create_access_token({"user_id": admin_id, "role": "admin"})


def test_sqlalchemy_engine_wal_mode():
    """Verify that the central SQLAlchemy engine connects and operates in WAL mode."""
    with get_db_connection() as conn:
        res = conn.execute(text("PRAGMA journal_mode")).fetchone()
        assert res is not None
        assert res[0].lower() == "wal"


def test_auth_registration_and_login_flow():
    """Verify user registration and authentication works with SQLAlchemy Core."""
    test_phone = "9812345678"
    test_user = "test_sqla_user"
    test_pwd = "password123"

    # 1. Clean up prior test data if exists
    with get_db_connection() as conn:
        conn.execute(users_table.delete().where(users_table.c.phone == test_phone))

    # 2. Register new user
    reg_resp = client.post("/auth/register", json={
        "name": "SQLA Test User",
        "phone": test_phone,
        "password": test_pwd,
        "role": "patient",
        "village": "Gopeshwar",
        "username": test_user,
        "email": "sqla_test@example.com",
    })
    assert reg_resp.status_code == 200
    reg_data = reg_resp.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["phone"] == test_phone

    # 3. Login with username
    login_resp = client.post("/auth/login", json={
        "identifier": test_user,
        "password": test_pwd,
    })
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()

    # 4. Login with phone
    login_phone_resp = client.post("/auth/login", json={
        "identifier": test_phone,
        "password": test_pwd,
    })
    assert login_phone_resp.status_code == 200


def test_admin_stats_and_users(admin_token):
    """Verify admin endpoints function correctly with SQLAlchemy Core."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    users_resp = client.get("/admin/users", headers=headers)
    assert users_resp.status_code == 200
    users = users_resp.json()
    assert len(users) >= 1

    stats_resp = client.get("/admin/stats", headers=headers)
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert "total_users" in stats
    assert "patients" in stats
    assert "admins" in stats
    assert stats["total_users"] >= 1


def test_conversation_history_persistence():
    """Verify chat endpoint persists history in conversation_index using SQLAlchemy Core."""
    sess_id = "test_sqla_conv_999"
    resp = client.post("/chat/message", json={
        "conversation_id": sess_id,
        "message": "Namaste doctor, mere pair me moch aa gayi hai",
        "language_hint": "hi",
    })
    assert resp.status_code == 200

    # Retrieve history detail
    hist_resp = client.get(f"/chat/history/{sess_id}")
    assert hist_resp.status_code == 200
    hist_data = hist_resp.json()
    assert hist_data["conversation_id"] == sess_id


def test_asha_encounters_sync():
    """Verify ASHA batch sync persists encounters using SQLAlchemy Core."""
    enc_id = "enc_sqla_test_1"
    sync_resp = client.post("/asha/sync-batch", json={
        "encounters": [{
            "id": enc_id,
            "name": "Ramesh Chandra",
            "village": "Mandal",
            "tier": "Yellow",
            "symptom": "fever",
            "vitals": {"bp": "120/80"},
        }]
    })
    assert sync_resp.status_code == 200
    assert enc_id in sync_resp.json()["ids"]

    # Verify encounter retrieval
    list_resp = client.get("/asha/encounters?limit=10")
    assert list_resp.status_code == 200
    encs = list_resp.json()
    assert any(e["id"] == enc_id for e in encs)
