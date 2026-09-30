"""
End-to-End Tests for Admin Dynamic System Configuration and District Disease Surveillance.
Validates:
- Live dynamic configuration retrieval and updates
- AI model provider switching and latency test endpoints
- Cache purging and knowledge store re-indexing
- User role modification (promoting/demoting) and details updates
- Persistent CMO district health advisory broadcasts
- District Disease Surveillance heatmap, EWS outbreak alerts, and trend analytics
- Rapid response team dispatch and 1-click outbreak alert broadcasts
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.auth import create_access_token

client = TestClient(app)

@pytest.fixture
def admin_headers():
    res = client.post("/auth/login", json={"identifier": "admin", "password": "sanjeevani2026"})
    if res.status_code == 200:
        token = res.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    # Fallback to direct token if login fails
    token = create_access_token({"user_id": 1, "role": "admin", "token_version": 0})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def patient_headers():
    res = client.post("/auth/login", json={"identifier": "patient", "password": "sanjeevani2026"})
    if res.status_code == 200:
        token = res.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    token = create_access_token({"user_id": 2, "role": "patient", "token_version": 0})
    return {"Authorization": f"Bearer {token}"}


def test_get_system_config(admin_headers):
    """Admin can fetch current dynamic system configuration."""
    res = client.get("/admin/config", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "config" in data
    cfg = data["config"]
    assert "primary_llm_provider" in cfg
    assert "groq_model" in cfg
    assert "emergency_keywords" in cfg
    assert isinstance(cfg["emergency_keywords"], list)


def test_update_system_config(admin_headers):
    """Admin can dynamically update AI models and triage thresholds."""
    updates = {
        "primary_llm_provider": "gemini",
        "gemini_model": "gemini-1.5-flash",
        "temperature": 0.25,
        "max_triage_turns": 4,
    }
    res = client.post("/admin/config", json=updates, headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["config"]["primary_llm_provider"] == "gemini"
    assert data["config"]["temperature"] == 0.25
    assert data["config"]["max_triage_turns"] == 4

    # Revert back to groq
    revert_res = client.post("/admin/config", json={"primary_llm_provider": "groq"}, headers=admin_headers)
    assert revert_res.status_code == 200
    assert revert_res.json()["config"]["primary_llm_provider"] == "groq"


def test_operational_actions(admin_headers):
    """Admin can trigger latency tests, cache purges, and knowledge re-indexing."""
    # 1. Latency test
    latency_res = client.post("/admin/actions/test-llm-latency", headers=admin_headers)
    assert latency_res.status_code == 200
    lat_data = latency_res.json()
    assert "latency_ms" in lat_data or "status" in lat_data

    # 2. Purge cache
    purge_res = client.post("/admin/actions/purge-cache", headers=admin_headers)
    assert purge_res.status_code == 200
    assert purge_res.json()["success"] is True

    # 3. Re-index knowledge
    reindex_res = client.post("/admin/actions/reindex-knowledge", headers=admin_headers)
    assert reindex_res.status_code == 200
    assert reindex_res.json()["success"] is True


def test_broadcast_lifecycle(admin_headers):
    """Admin can publish, retrieve, and deactivate persistent district health notices."""
    payload = {
        "title": "Alaknanda Basin Test Health Warning",
        "message": "Drink boiled water due to seasonal sediment runoff in Mandal river basin.",
        "severity": "warning",
        "target_village": "Mandal Valley",
        "disease_tag": "Acute Gastroenteritis",
    }
    pub_res = client.post("/admin/broadcast", json=payload, headers=admin_headers)
    assert pub_res.status_code == 200
    pub_data = pub_res.json()
    assert pub_data["success"] is True
    broadcast_id = pub_data["broadcast"]["id"]
    assert pub_data["broadcast"]["target_village"] == "Mandal Valley"

    # Get active broadcast
    get_res = client.get("/admin/broadcast")
    assert get_res.status_code == 200
    cur_data = get_res.json()
    assert cur_data["title"] == "Alaknanda Basin Test Health Warning"

    # Deactivate broadcast
    del_res = client.delete(f"/admin/broadcast/{broadcast_id}", headers=admin_headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True


def test_surveillance_heatmap_and_outbreaks(admin_headers):
    """Admin can retrieve sector heatmap points, outbreak alerts, and trends."""
    # 1. Heatmap
    heat_res = client.get("/admin/surveillance/heatmap?timeframe=30&disease=ALL", headers=admin_headers)
    assert heat_res.status_code == 200
    h_data = heat_res.json()
    assert h_data["district"] == "Chamoli"
    assert "sectors" in h_data
    assert len(h_data["sectors"]) >= 10
    first_sector = h_data["sectors"][0]
    assert "lat" in first_sector and "lng" in first_sector
    assert "intensity" in first_sector
    assert "status" in first_sector
    assert "dominant_disease" in first_sector

    # 2. Outbreak alerts
    alert_res = client.get("/admin/surveillance/outbreaks?timeframe=30", headers=admin_headers)
    assert alert_res.status_code == 200
    alerts = alert_res.json()
    assert isinstance(alerts, list)
    assert len(alerts) >= 1
    assert "recommended_action" in alerts[0]

    # 3. Trends
    trends_res = client.get("/admin/surveillance/trends?timeframe=30", headers=admin_headers)
    assert trends_res.status_code == 200
    t_data = trends_res.json()
    assert "daily_timeline" in t_data
    assert "disease_distribution" in t_data
    assert "demographics" in t_data

    # 4. Dispatch rapid response team
    disp_res = client.post(
        "/admin/surveillance/dispatch",
        json={"village": "Mandal Valley", "disease": "Acute Gastroenteritis", "notes": "Chlorination deployment"},
        headers=admin_headers
    )
    assert disp_res.status_code == 200
    assert disp_res.json()["success"] is True
    assert disp_res.json()["village"] == "Mandal Valley"

    # 5. Broadcast outbreak alert
    bcast_res = client.post(
        "/admin/surveillance/broadcast-alert",
        json={"village": "Pipalkoti Basin", "disease": "Vector Viral Fever", "action_text": "Anti-larval fogging in progress"},
        headers=admin_headers
    )
    assert bcast_res.status_code == 200
    assert bcast_res.json()["success"] is True


def test_user_role_and_details_update(admin_headers):
    """Admin can modify user roles and update profile details."""
    # List users to find a non-admin user
    users_res = client.get("/admin/users", headers=admin_headers)
    assert users_res.status_code == 200
    users = users_res.json()
    target_user = next((u for u in users if u["role"] != "admin"), None)

    if target_user:
        u_id = target_user["id"]
        orig_role = target_user["role"]
        new_role = "asha" if orig_role == "patient" else "patient"

        # Update role
        role_res = client.patch(f"/admin/users/{u_id}/role", json={"role": new_role}, headers=admin_headers)
        assert role_res.status_code == 200
        assert role_res.json()["user"]["role"] == new_role

        # Update details
        det_res = client.put(
            f"/admin/users/{u_id}",
            json={"village": "Mandal Valley", "assigned_phc": "PHC Mandal"},
            headers=admin_headers
        )
        assert det_res.status_code == 200
        assert det_res.json()["user"]["village"] == "Mandal Valley"

        # Revert role back
        client.patch(f"/admin/users/{u_id}/role", json={"role": orig_role}, headers=admin_headers)


def test_non_admin_forbidden(patient_headers):
    """Regular patient cannot access admin endpoints."""
    res = client.get("/admin/config", headers=patient_headers)
    assert res.status_code == 403
    res_heat = client.get("/admin/surveillance/heatmap", headers=patient_headers)
    assert res_heat.status_code == 403
