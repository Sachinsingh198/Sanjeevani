"""
Authentication API routes: registration, login, and current-user fetch.
"""
from fastapi import APIRouter, HTTPException, Depends
from app.schemas.auth_schemas import RegisterRequest, LoginRequest, LoginResponse, UserProfile, ResetPasswordRequest
from app.core.auth import hash_password, verify_password, create_access_token, get_current_user
from app.models import get_db, normalize_phone
from typing import Dict, Any

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=LoginResponse)
async def register_user(req: RegisterRequest):
    """
    Register a new user account.
    Patients can self-register. ASHA accounts require admin creation via /admin/users.
    """
    if req.role not in ("patient", "asha", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role. Must be: patient, asha, or admin")

    # Only allow patient self-registration through this endpoint
    if req.role != "patient":
        raise HTTPException(
            status_code=403,
            detail="Only patient accounts can be self-registered. ASHA/Admin accounts must be created by an administrator."
        )

    conn = get_db()
    try:
        raw_phone = req.phone.strip()
        norm_phone = normalize_phone(raw_phone)

        # Check if phone already exists (raw or normalized)
        existing = conn.execute(
            "SELECT id FROM users WHERE phone = ? OR phone = ?",
            (raw_phone, norm_phone)
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="An account with this phone number already exists")

        hashed = hash_password(req.password)
        cursor = conn.execute(
            "INSERT INTO users (name, phone, hashed_password, role, village) VALUES (?, ?, ?, ?, ?)",
            (req.name.strip(), norm_phone, hashed, req.role, req.village.strip())
        )
        conn.commit()
        user_id = cursor.lastrowid

        # Fetch the created user
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        user_dict = dict(row)

        token = create_access_token({"user_id": user_id, "role": req.role})

        return LoginResponse(
            access_token=token,
            user=UserProfile(**user_dict)
        )
    finally:
        conn.close()


@router.post("/login", response_model=LoginResponse)
async def login_user(req: LoginRequest):
    """Authenticate a user and return a JWT access token."""
    conn = get_db()
    try:
        raw_phone = req.phone.strip()
        norm_phone = normalize_phone(raw_phone)

        row = conn.execute(
            "SELECT * FROM users WHERE phone = ? OR phone = ?",
            (raw_phone, norm_phone)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Invalid phone number or password")

        user_dict = dict(row)
        if not verify_password(req.password, user_dict["hashed_password"]):
            raise HTTPException(status_code=401, detail="Invalid phone number or password")

        token = create_access_token({"user_id": user_dict["id"], "role": user_dict["role"]})

        return LoginResponse(
            access_token=token,
            user=UserProfile(**user_dict)
        )
    finally:
        conn.close()


@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    """Allows users to reset their password using their phone number."""
    if not req.new_password or len(req.new_password.strip()) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")

    conn = get_db()
    try:
        raw_phone = req.phone.strip()
        norm_phone = normalize_phone(raw_phone)
        row = conn.execute(
            "SELECT id, name FROM users WHERE phone = ? OR phone = ?",
            (raw_phone, norm_phone)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="No account found with this phone number")

        hashed = hash_password(req.new_password.strip())
        conn.execute("UPDATE users SET hashed_password = ? WHERE id = ?", (hashed, row["id"]))
        conn.commit()
        return {"message": f"Password successfully reset for {row['name']}. You can now sign in."}
    finally:
        conn.close()


@router.get("/me", response_model=UserProfile)
async def get_me(user: Dict[str, Any] = Depends(get_current_user)):
    """Returns the currently authenticated user's profile."""
    return UserProfile(**user)

