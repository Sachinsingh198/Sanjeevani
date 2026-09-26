import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_activity_and_profile_flow():
    # 1. Register a test patient
    import random
    rand_suffix = random.randint(10000, 99999)
    reg_payload = {
        "name": f"Test User {rand_suffix}",
        "phone": f"98765{rand_suffix}",
        "password": "Password123!",
        "username": f"testuser_{rand_suffix}",
        "email": f"test_{rand_suffix}@example.com",
        "role": "patient",
        "village": "Mandal, Chamoli"
    }
    reg_res = client.post("/auth/register", json=reg_payload)
    assert reg_res.status_code == 200, reg_res.text
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get profile (/auth/me)
    me_res = client.get("/auth/me", headers=headers)
    assert me_res.status_code == 200
    profile = me_res.json()
    assert profile["name"] == reg_payload["name"]
    assert profile["district"] == "Chamoli"

    # 3. Update profile (/auth/profile)
    update_payload = {
        "age": 34,
        "gender": "Female",
        "blood_group": "B+",
        "emergency_contact_name": "Ramesh",
        "emergency_contact_phone": "9876543210",
        "abha_id": "ABHA-9988-7766-5544",
        "comorbidities": "Asthma, Seasonal Rhinitis",
        "allergies": "Penicillin",
        "language_preference": "hi"
    }
    upd_res = client.put("/auth/profile", json=update_payload, headers=headers)
    assert upd_res.status_code == 200, upd_res.text
    updated_data = upd_res.json()
    assert updated_data["age"] == 34
    assert updated_data["blood_group"] == "B+"
    assert updated_data["abha_id"] == "ABHA-9988-7766-5544"

    # 4. Record client event (/activity/log)
    client_log_res = client.post("/activity/log", json={
        "action": "WELLNESS",
        "description": "Completed 10 min Himalayan Pranayama",
        "metadata": {"duration_min": 10, "track": "Pranayama"}
    }, headers=headers)
    assert client_log_res.status_code == 200
    assert client_log_res.json()["success"] is True

    # 5. Fetch my activity (/activity/my)
    my_act_res = client.get("/activity/my", headers=headers)
    assert my_act_res.status_code == 200
    act_data = my_act_res.json()
    assert act_data["total"] >= 2  # REGISTER + PROFILE_UPDATE + WELLNESS
    actions = [a["action"] for a in act_data["activities"]]
    assert "REGISTER" in actions
    assert "PROFILE_UPDATE" in actions
    assert "WELLNESS" in actions

    # 6. Change password (/auth/change-password)
    pw_res = client.post("/auth/change-password", json={
        "old_password": "Password123!",
        "new_password": "NewSecretPassword456!"
    }, headers=headers)
    assert pw_res.status_code == 200
    assert pw_res.json()["success"] is True

    # 7. Logout (/auth/logout)
    logout_res = client.post("/auth/logout", headers=headers)
    assert logout_res.status_code == 200
    assert logout_res.json()["success"] is True
