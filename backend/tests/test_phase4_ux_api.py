import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models import create_tables, seed_default_admin
from app.core.alerts_service import record_emergency_alert, get_emergency_alerts, acknowledge_emergency_alert

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    create_tables()
    seed_default_admin()


def get_token_for_user(identifier, password):
    res = client.post("/auth/login", json={"identifier": identifier, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]


def test_asha_encounters_sync_endpoint():
    """Verify POST /asha/encounters/sync accepts batch patient records and returns synced IDs."""
    asha_token = get_token_for_user("asha", "sanjeevani2026")
    headers = {"Authorization": f"Bearer {asha_token}"}

    encounters_payload = {
        "encounters": [
            {
                "id": "ENC-TEST-001",
                "name": "Kamla Devi",
                "village": "Mandal",
                "tier": "Yellow",
                "symptom": "3 days persistent fever and shivering",
                "vitals": {"spo2": "94", "temp": "101.2", "pulse": "84"},
                "synced": False,
                "followedUp": False,
            },
            {
                "id": "ENC-TEST-002",
                "name": "Mohan Singh",
                "village": "Gopeshwar",
                "tier": "Green",
                "symptom": "Mild dry cough",
                "vitals": {"spo2": "98", "temp": "98.4", "pulse": "72"},
                "synced": False,
                "followedUp": True,
            }
        ]
    }

    res = client.post("/asha/encounters/sync", json=encounters_payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["synced_count"] == 2
    assert "ENC-TEST-001" in data["ids"]
    assert "ENC-TEST-002" in data["ids"]

    # Verify encounters can be retrieved via GET /asha/encounters
    get_res = client.get("/asha/encounters", headers=headers)
    assert get_res.status_code == 200
    synced_items = get_res.json()
    ids = [item["id"] for item in synced_items]
    assert "ENC-TEST-001" in ids
    assert "ENC-TEST-002" in ids


def test_red_encounter_sync_triggers_emergency_alert():
    """Verify that syncing a Red-tier encounter automatically dispatches a real-time emergency alert."""
    asha_token = get_token_for_user("asha", "sanjeevani2026")
    headers = {"Authorization": f"Bearer {asha_token}"}

    red_payload = {
        "encounters": [
            {
                "id": "ENC-RED-999",
                "name": "Urgent Patient Negi",
                "village": "Joshimath Outskirts",
                "tier": "Red",
                "symptom": "Acute severe breathlessness and chest pain",
                "vitals": {"spo2": "84", "temp": "100.2", "pulse": "118"},
                "synced": False,
            }
        ]
    }

    sync_res = client.post("/asha/encounters/sync", json=red_payload, headers=headers)
    assert sync_res.status_code == 200

    # Check that alert was registered in GET /asha/alerts
    alerts_res = client.get("/asha/alerts?only_unacknowledged=true", headers=headers)
    assert alerts_res.status_code == 200
    alerts = alerts_res.json()
    matching = [a for a in alerts if a.get("patient_name") == "Urgent Patient Negi"]
    assert len(matching) > 0
    assert matching[0]["tier"] == "Red"
    assert matching[0]["acknowledged"] is False


def test_alert_lifecycle_and_acknowledgment():
    """Verify creating, querying, and acknowledging emergency alerts for ASHA and Admin."""
    admin_token = get_token_for_user("admin", "sanjeevani2026")
    asha_token = get_token_for_user("asha", "sanjeevani2026")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    asha_headers = {"Authorization": f"Bearer {asha_token}"}

    # 1. Directly record an emergency alert
    alert_id = record_emergency_alert(
        conversation_id="conv-live-sos-test",
        patient_name="Ramesh Chandra",
        village="Pipalkoti",
        phone="9876543210",
        symptoms="Hypoxia cyanosis and altered sensorium",
        clinical_flags=["HYPOXIA_RED_FLAG"],
        tier="Red",
    )
    assert alert_id is not None

    # 2. Query as Admin
    admin_alerts_res = client.get("/admin/alerts?only_unacknowledged=true", headers=admin_headers)
    assert admin_alerts_res.status_code == 200
    admin_alerts = admin_alerts_res.json()
    alert_entry = next((a for a in admin_alerts if a["id"] == alert_id), None)
    assert alert_entry is not None
    assert alert_entry["patient_name"] == "Ramesh Chandra"
    assert alert_entry["acknowledged"] is False

    # 3. ASHA acknowledges the alert
    ack_res = client.post(f"/asha/alerts/{alert_id}/acknowledge", headers=asha_headers)
    assert ack_res.status_code == 200
    assert ack_res.json()["acknowledged"] is True

    # 4. Verify unacknowledged list no longer contains this alert
    unack_res = client.get("/asha/alerts?only_unacknowledged=true", headers=asha_headers)
    assert unack_res.status_code == 200
    assert not any(a["id"] == alert_id for a in unack_res.json())
