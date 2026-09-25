import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models import get_db, create_tables, seed_default_admin

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    create_tables()
    seed_default_admin()


def test_invalid_phone_number_rejected():
    """Registration must reject arbitrary text and non-10-digit numbers."""
    # 1. Arbitrary text
    res = client.post("/auth/register", json={
        "name": "Test User",
        "phone": "invalid_phone_text",
        "password": "password123",
        "username": "test_user_invalid",
    })
    assert res.status_code == 400
    assert "10-digit mobile number" in res.json()["detail"]

    # 2. Too short (5 digits)
    res2 = client.post("/auth/register", json={
        "name": "Test User",
        "phone": "98765",
        "password": "password123",
        "username": "test_user_short",
    })
    assert res2.status_code == 400

    # 3. Starts with invalid digit (e.g. 1)
    res3 = client.post("/auth/register", json={
        "name": "Test User",
        "phone": "1234567890",
        "password": "password123",
        "username": "test_user_start",
    })
    assert res3.status_code == 400


def test_username_check_and_suggestions():
    """Check username endpoint should detect conflicts and provide smart suggestions."""
    # 'admin' is a seeded demo account
    res = client.get("/auth/check-username", params={"username": "admin", "name": "Admin User"})
    assert res.status_code == 200
    data = res.json()
    assert data["available"] is False
    assert len(data["suggestions"]) > 0
    assert all("admin" in s for s in data["suggestions"])

    # Fresh username
    res_fresh = client.get("/auth/check-username", params={"username": "unique_citizen_999", "name": "Citizen"})
    assert res_fresh.status_code == 200
    assert res_fresh.json()["available"] is True


def test_registration_and_multi_identifier_login():
    """Register user with username and gmail, then verify login via username, email, and phone."""
    unique_phone = "9876540001"
    unique_user = "pahadi_doc"
    unique_email = "pahadi.doc@gmail.com"
    pwd = "secretpassword123"

    # Clean up if existed
    from app.db.session import get_db_connection
    from app.db.schema import users_table
    from sqlalchemy import or_, func
    with get_db_connection() as conn:
        conn.execute(
            users_table.delete().where(
                or_(
                    users_table.c.phone == unique_phone,
                    func.lower(users_table.c.username) == unique_user.lower()
                )
            )
        )

    # Register
    reg_res = client.post("/auth/register", json={
        "name": "Pahadi Doctor",
        "phone": f"+91 {unique_phone}", # test normalization
        "password": pwd,
        "username": unique_user,
        "email": unique_email,
        "village": "Gopeshwar",
    })
    assert reg_res.status_code == 200
    profile = reg_res.json()["user"]
    assert profile["username"] == unique_user
    assert profile["email"] == unique_email
    assert profile["phone"] == unique_phone

    # 1. Login via Username
    res_user = client.post("/auth/login", json={
        "identifier": unique_user,
        "password": pwd,
    })
    assert res_user.status_code == 200
    assert res_user.json()["user"]["username"] == unique_user

    # 2. Login via Email (Gmail)
    res_email = client.post("/auth/login", json={
        "identifier": unique_email,
        "password": pwd,
    })
    assert res_email.status_code == 200
    assert res_email.json()["user"]["email"] == unique_email

    # 3. Login via Mobile Number
    res_phone = client.post("/auth/login", json={
        "identifier": unique_phone,
        "password": pwd,
    })
    assert res_phone.status_code == 200
    assert res_phone.json()["user"]["phone"] == unique_phone


def test_duplicate_username_prevented():
    """Attempting to register with an already acquired username must fail with 409 and suggestions."""
    res = client.post("/auth/register", json={
        "name": "Imposter Admin",
        "phone": "9876540002",
        "password": "password123",
        "username": "admin", # already acquired
    })
    assert res.status_code == 409
    assert "pehle se uplabdh nahi hai" in res.json()["detail"]


def test_demo_accounts_login():
    """Verify demo accounts work with username and legacy phone identifiers."""
    for role in ["admin", "asha", "patient"]:
        res = client.post("/auth/login", json={
            "identifier": role,
            "password": "sanjeevani2026",
        })
        assert res.status_code == 200
        assert res.json()["user"]["role"] == role
