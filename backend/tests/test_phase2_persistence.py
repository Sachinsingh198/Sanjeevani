import pytest
import json
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import get_db_connection
from app.db.schema import (
    users_table,
    consultations_table,
    access_logs_table,
    conversation_index_table,
)
from sqlalchemy import select, func
from app.models import create_tables, seed_default_admin
from app.core.auth import create_access_token

# Ensure tables exist
create_tables()
seed_default_admin()

client = TestClient(app)


@pytest.fixture
def auth_patient():
    """Creates a patient account and returns its authorization header."""
    phone = "9876500055"
    with get_db_connection() as conn:
        row = conn.execute(select(users_table).where(users_table.c.phone == phone)).fetchone()
        if not row:
            from app.core.auth import hash_password
            res = conn.execute(
                users_table.insert().values(
                    name="Persistence Patient",
                    phone=phone,
                    hashed_password=hash_password("password123"),
                    role="patient",
                    username="persist_pt",
                    village="Mana",
                )
            )
            user_id = res.inserted_primary_key[0]
        else:
            user_id = row.id

    token = create_access_token({"sub": "persist_pt", "user_id": user_id, "role": "patient", "token_version": 0})
    return {"Authorization": f"Bearer {token}", "user_id": user_id}


@pytest.fixture
def admin_headers():
    with get_db_connection() as conn:
        row = conn.execute(select(users_table.c.id).where(users_table.c.role == "admin")).fetchone()
        admin_id = row[0] if row else 1
    token = create_access_token({"sub": "admin", "role": "admin", "user_id": admin_id, "token_version": 0})
    return {"Authorization": f"Bearer {token}"}


def test_consultation_table_persistence(auth_patient):
    """Verify that every chat turn logs a complete encounter in consultations_table."""
    cid = f"test_persistence_conv_{auth_patient['user_id']}"

    resp = client.post(
        "/chat/message",
        headers={"Authorization": auth_patient["Authorization"]},
        json={
            "conversation_id": cid,
            "message": "Namaste doctor, mujhe halki khansi aur gala kharab hai",
            "language_hint": "hi",
        }
    )
    assert resp.status_code == 200

    with get_db_connection() as conn:
        stmt = (
            select(consultations_table)
            .where(consultations_table.c.conversation_id == cid)
            .order_by(consultations_table.c.id.desc())
        )
        row = conn.execute(stmt).fetchone()

    assert row is not None
    assert row.conversation_id == cid
    assert row.user_id == auth_patient["user_id"]
    assert row.tier in ("Green", "Yellow", "Red")
    assert row.detected_language in ("hi", "hindi", "auto")
    assert "khansi" in row.raw_user_message
    assert row.final_reply_text != ""


def test_chat_history_listing_and_detail(auth_patient):
    """Verify GET /chat/history lists consultations and GET /chat/history?conversation_id= returns turns."""
    cid = f"test_hist_detail_{auth_patient['user_id']}"

    # 1. Post a turn
    post_res = client.post(
        "/chat/message",
        headers={"Authorization": auth_patient["Authorization"]},
        json={
            "conversation_id": cid,
            "message": "Doctor sahab, pet me jalan ho rahi hai",
            "language_hint": "hi",
        }
    )
    assert post_res.status_code == 200

    # 2. GET /chat/history (list view for authenticated patient)
    list_res = client.get("/chat/history", headers={"Authorization": auth_patient["Authorization"]})
    assert list_res.status_code == 200
    sessions = list_res.json()
    assert isinstance(sessions, list)
    matching = [s for s in sessions if s.get("conversation_id") == cid or s.get("conversationId") == cid]
    assert len(matching) > 0
    assert matching[0]["summary"] != ""
    assert matching[0]["tier"] in ("Green", "Yellow", "Red")

    # 3. GET /chat/history?conversation_id= (detail view)
    detail_res = client.get(f"/chat/history?conversation_id={cid}", headers={"Authorization": auth_patient["Authorization"]})
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["conversation_id"] == cid
    assert len(detail["turns"]) >= 1
    assert detail["turns"][0]["raw_user_message"] == "Doctor sahab, pet me jalan ho rahi hai"


def test_access_audit_logging(auth_patient, admin_headers):
    """Verify access_logs_table records reads to patient data and admin directories."""
    with get_db_connection() as conn:
        before_count = conn.execute(select(func.count()).select_from(access_logs_table)).scalar() or 0

    # 1. Patient reads chat history
    client.get("/chat/history", headers={"Authorization": auth_patient["Authorization"]})

    # 2. Admin lists users
    client.get("/admin/users", headers=admin_headers)

    # 3. Admin reads stats
    client.get("/admin/stats", headers=admin_headers)

    with get_db_connection() as conn:
        after_count = conn.execute(select(func.count()).select_from(access_logs_table)).scalar() or 0
        assert after_count >= before_count + 3

        # Check recorded resource types
        recent_logs = conn.execute(
            select(access_logs_table.c.resource_type, access_logs_table.c.user_role)
            .order_by(access_logs_table.c.id.desc())
            .limit(5)
        ).fetchall()

    recorded_resources = {r.resource_type for r in recent_logs}
    assert "chat_history" in recorded_resources
    assert "user_list" in recorded_resources
    assert "admin_stats" in recorded_resources


def test_admin_stats_reflects_consultations(admin_headers):
    """Verify /admin/stats calculates triage_distribution from consultations."""
    stats_res = client.get("/admin/stats", headers=admin_headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()

    assert "triage_distribution" in stats
    assert "red" in stats["triage_distribution"]
    assert "yellow" in stats["triage_distribution"]
    assert "green" in stats["triage_distribution"]
    assert "total_consultations" in stats
    assert stats["total_consultations"] >= 1
