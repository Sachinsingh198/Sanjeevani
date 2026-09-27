import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.models import create_tables, seed_default_admin

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    create_tables()
    seed_default_admin()


def test_jwt_refresh_token_lifecycle():
    """Verify login provides access+refresh tokens, and /auth/refresh yields new valid tokens."""
    # 1. Login with demo account
    res = client.post("/auth/login", json={
        "identifier": "admin",
        "password": "sanjeevani2026",
    })
    assert res.status_code == 200
    data = res.json()
    access_token = data["access_token"]
    refresh_token = data.get("refresh_token")
    assert refresh_token is not None
    assert data["token_type"] == "bearer"

    # 2. Access protected endpoint with access token
    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert me_res.status_code == 200
    assert me_res.json()["role"] == "admin"

    # 3. Refresh token
    ref_res = client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert ref_res.status_code == 200
    ref_data = ref_res.json()
    new_access_token = ref_data["access_token"]
    new_refresh_token = ref_data["refresh_token"]
    assert new_access_token != access_token

    # 4. Verify new access token works
    new_me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {new_access_token}"})
    assert new_me_res.status_code == 200
    assert new_me_res.json()["role"] == "admin"


def test_token_revocation_on_logout():
    """Verify that logging out revokes previous access and refresh tokens via token_version bump."""
    # 1. Login
    res = client.post("/auth/login", json={
        "identifier": "asha",
        "password": "sanjeevani2026",
    })
    assert res.status_code == 200
    access_token = res.json()["access_token"]
    refresh_token = res.json()["refresh_token"]

    # 2. Logout
    logout_res = client.post("/auth/logout", headers={"Authorization": f"Bearer {access_token}"})
    assert logout_res.status_code == 200

    # 3. Old access token should now be rejected (401 revoked)
    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert me_res.status_code == 401
    assert "revoked" in me_res.json()["detail"].lower()

    # 4. Old refresh token should also be rejected
    ref_res = client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert ref_res.status_code == 401
    assert "revoked" in ref_res.json()["detail"].lower()


def test_token_revocation_on_password_change():
    """Verify changing password revokes active tokens."""
    import random
    suffix = str(random.randint(100000, 999999))
    phone = f"9876{suffix}"
    username = f"pwd_test_{suffix}"
    # 1. Register a test patient
    reg_res = client.post("/auth/register", json={
        "name": "Password Test User",
        "phone": phone,
        "password": "old_password123",
        "username": username,
    })
    assert reg_res.status_code == 200
    access_token = reg_res.json()["access_token"]

    # 2. Change password
    change_res = client.post("/auth/change-password", headers={
        "Authorization": f"Bearer {access_token}"
    }, json={
        "old_password": "old_password123",
        "new_password": "new_password456",
    })
    assert change_res.status_code == 200

    # 3. Old access token should now be revoked
    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert me_res.status_code == 401

    # 4. New login succeeds with new password
    new_login = client.post("/auth/login", json={
        "identifier": username,
        "password": "new_password456",
    })
    assert new_login.status_code == 200


def test_dev_otp_hard_blocked_in_production(monkeypatch):
    """Verify dev_otp is never returned when APP_ENV is production, even if ENABLE_DEV_OTP_HINT is True."""
    monkeypatch.setattr(settings, "APP_ENV", "production")
    monkeypatch.setattr(settings, "ENABLE_DEV_OTP_HINT", True)

    res = client.post("/auth/otp/send", json={
        "target": "prod_test@sanjeevani.org",
        "purpose": "register",
    })
    assert res.status_code == 200
    assert res.json()["dev_otp"] is None


def test_invalid_refresh_tokens_rejected():
    """Verify invalid or malformed refresh tokens are rejected with 401."""
    res = client.post("/auth/refresh", json={"refresh_token": "not.a.valid.jwt"})
    assert res.status_code == 401

    # Empty refresh token
    res_empty = client.post("/auth/refresh", json={"refresh_token": ""})
    assert res_empty.status_code == 401
