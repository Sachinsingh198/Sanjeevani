import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models import get_db, create_tables, seed_default_admin

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    create_tables()
    seed_default_admin()


def test_send_otp_email_and_verify():
    test_email = "testuser@gmail.com"

    # Send OTP for registration
    resp = client.post("/auth/otp/send", json={
        "target": test_email,
        "purpose": "register"
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["success"] is True
    assert data["target_type"] == "email"
    dev_otp = data.get("dev_otp")
    assert dev_otp is not None
    assert len(dev_otp) == 6

    # Verify with correct OTP
    verify_resp = client.post("/auth/otp/verify", json={
        "target": test_email,
        "otp": dev_otp,
        "purpose": "register"
    })
    assert verify_resp.status_code == 200
    assert verify_resp.json()["success"] is True


def test_send_otp_phone_and_verify():
    test_phone = "9876543210"

    # Send OTP for registration
    resp = client.post("/auth/otp/send", json={
        "target": test_phone,
        "purpose": "register"
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["success"] is True
    assert data["target_type"] == "sms"
    dev_otp = data.get("dev_otp")
    assert dev_otp is not None

    # Verify with invalid OTP
    bad_verify = client.post("/auth/otp/verify", json={
        "target": test_phone,
        "otp": "000000",
        "purpose": "register"
    })
    assert bad_verify.status_code == 400

    # Verify with correct OTP
    good_verify = client.post("/auth/otp/verify", json={
        "target": test_phone,
        "otp": dev_otp,
        "purpose": "register"
    })
    assert good_verify.status_code == 200
    assert good_verify.json()["success"] is True


def test_reset_password_with_otp_flow():
    # First create a test user
    reg_phone = "9123456780"
    reg_user = "otp_reset_user"
    reg_email = "otpreset@gmail.com"
    client.post("/auth/register", json={
        "name": "OTP Reset User",
        "phone": reg_phone,
        "username": reg_user,
        "email": reg_email,
        "password": "initial_password_123",
        "role": "patient",
        "village": "Joshimath"
    })

    # Request reset OTP via username
    otp_resp = client.post("/auth/otp/send", json={
        "target": reg_user,
        "purpose": "reset_password"
    })
    assert otp_resp.status_code == 200, otp_resp.text
    dev_otp = otp_resp.json()["dev_otp"]
    assert dev_otp is not None

    # Reset password with OTP
    new_pass = "brand_new_secret_2026"
    reset_resp = client.post("/auth/reset-password-with-otp", json={
        "target": reg_user,
        "otp": dev_otp,
        "new_password": new_pass
    })
    assert reset_resp.status_code == 200, reset_resp.text
    assert reset_resp.json()["success"] is True

    # Attempt login with OLD password (should fail)
    old_login = client.post("/auth/login", json={
        "identifier": reg_user,
        "password": "initial_password_123"
    })
    assert old_login.status_code == 401

    # Attempt login with NEW password (should succeed)
    new_login = client.post("/auth/login", json={
        "identifier": reg_user,
        "password": new_pass
    })
    assert new_login.status_code == 200
    assert new_login.json()["access_token"] is not None
    assert new_login.json()["user"]["username"] == reg_user
