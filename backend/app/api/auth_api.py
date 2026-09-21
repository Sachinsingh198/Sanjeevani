"""
Authentication API routes: registration, login, current-user fetch, and username availability.
"""
import re
import random
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends, Query
from app.config import settings
from app.schemas.auth_schemas import (
    RegisterRequest,
    LoginRequest,
    LoginResponse,
    UserProfile,
    ResetPasswordRequest,
    CheckUsernameResponse,
    SendOtpRequest,
    VerifyOtpRequest,
    ResetPasswordWithOtpRequest,
    OtpResponse,
)
from app.core.auth import hash_password, verify_password, create_access_token, get_current_user, require_role
from app.core.notification_service import send_email_otp, send_sms_otp
from app.models import get_db, normalize_phone

router = APIRouter(prefix="/auth", tags=["Authentication"])




def validate_mobile_number(phone_str: str) -> str:
    """
    Validates that the provided phone number is a valid 10-digit Indian mobile number.
    Rejects text or arbitrary numbers.
    Returns the normalized 10-digit string.
    """
    if not phone_str:
        raise HTTPException(
            status_code=400,
            detail="Mobile number is required."
        )

    cleaned = phone_str.strip()
    
    # Allow demo keywords during development/testing
    if cleaned.lower() in ("admin", "asha", "patient"):
        return cleaned.lower()

    # Extract digits
    digits = re.sub(r"[^\d]", "", cleaned)
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    elif digits.startswith("0") and len(digits) == 11:
        digits = digits[1:]

    # Must be exactly 10 digits starting with 6, 7, 8, or 9
    if not re.match(r"^[6-9]\d{9}$", digits):
        raise HTTPException(
            status_code=400,
            detail="Kripya ek maanya 10-digit mobile number darz karein (e.g. 9876543210). Keval anko ka prayog karein."
        )

    return digits


def generate_username_suggestions(candidate: str, full_name: str, conn) -> List[str]:
    """
    Generates 3 to 4 unique, clean username suggestions based on user input or name,
    ensuring none of them already exist in the database.
    """
    base_raw = candidate if candidate and len(candidate.strip()) >= 2 else full_name
    # Clean non-alphanumeric
    base = re.sub(r"[^a-zA-Z0-9]", "", base_raw or "user").lower()
    if len(base) < 3:
        base = (base + "user")[:6]
    base = base[:12]  # Keep base concise

    current_yr = str(datetime.now().year)[-2:]
    pool = [
        f"{base}{random.randint(10, 99)}",
        f"{base}_{current_yr}",
        f"{base}_uk",
        f"{base}_{random.randint(100, 999)}",
        f"{base}786",
        f"{base}_doc",
    ]

    # If full name has multiple parts (e.g. "Sachin Singh")
    name_parts = [re.sub(r"[^a-zA-Z0-9]", "", p).lower() for p in (full_name or "").split() if p]
    if len(name_parts) >= 2:
        pool.insert(0, f"{name_parts[0]}_{name_parts[1]}")
        pool.insert(1, f"{name_parts[0]}_{name_parts[1]}{random.randint(1, 99)}")

    suggestions = []
    seen = set()
    for cand in pool:
        cand_clean = cand.lower()
        if cand_clean in seen:
            continue
        seen.add(cand_clean)

        existing = conn.execute("SELECT id FROM users WHERE LOWER(username) = ?", (cand_clean,)).fetchone()
        if not existing:
            suggestions.append(cand_clean)
        if len(suggestions) >= 4:
            break

    return suggestions


@router.get("/check-username", response_model=CheckUsernameResponse)
async def check_username(
    username: str = Query(..., min_length=1),
    name: Optional[str] = Query("")
):
    """
    Checks whether a chosen username is available.
    If already acquired, automatically generates available suggestions.
    """
    clean_user = username.strip().lower()

    conn = get_db()
    try:
        # Validate username pattern (3-20 characters, lowercase alphanumeric and underscore)
        if not re.match(r"^[a-z0-9_]{3,20}$", clean_user):
            suggestions = generate_username_suggestions(clean_user, name or "", conn)
            return CheckUsernameResponse(
                username=clean_user,
                available=False,
                suggestions=suggestions
            )

        existing = conn.execute("SELECT id FROM users WHERE LOWER(username) = ?", (clean_user,)).fetchone()
        if existing:
            suggestions = generate_username_suggestions(clean_user, name or "", conn)
            return CheckUsernameResponse(
                username=clean_user,
                available=False,
                suggestions=suggestions
            )

        return CheckUsernameResponse(
            username=clean_user,
            available=True,
            suggestions=[]
        )
    finally:
        conn.close()


@router.post("/register", response_model=LoginResponse)
async def register_user(req: RegisterRequest):
    """
    Register a new user account.
    - Strictly validates 10-digit mobile number.
    - Validates custom unique username (or auto-generates if omitted).
    - Validates optional Gmail / Email address.
    """
    if req.role not in ("patient", "asha", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role. Must be: patient, asha, or admin")

    # Only allow patient self-registration through this endpoint
    if req.role != "patient":
        raise HTTPException(
            status_code=403,
            detail="Only patient accounts can be self-registered. ASHA/Admin accounts must be created by an administrator."
        )

    if not req.name or len(req.name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Kripya apna pura naam darz karein (kam se kam 2 akshar).")

    if not req.password or len(req.password.strip()) < 4:
        raise HTTPException(status_code=400, detail="Password kam se kam 4 aksharon ka hona chahiye.")

    # 1. Validate Mobile Number strictly
    norm_phone = validate_mobile_number(req.phone)

    # 2. Validate Email / Gmail if provided
    clean_email = None
    if req.email and req.email.strip():
        clean_email = req.email.strip().lower()
        if not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", clean_email):
            raise HTTPException(status_code=400, detail="Kripya ek maanya email ya Gmail pata darz karein.")

    conn = get_db()
    try:
        # Check if phone already registered
        existing_phone = conn.execute(
            "SELECT id FROM users WHERE phone = ?",
            (norm_phone,)
        ).fetchone()
        if existing_phone:
            raise HTTPException(status_code=409, detail="Is mobile number se pehle se account bana hua hai. Kripya login karein.")

        # Check if email already registered
        if clean_email:
            existing_email = conn.execute(
                "SELECT id FROM users WHERE LOWER(email) = ?",
                (clean_email,)
            ).fetchone()
            if existing_email:
                raise HTTPException(status_code=409, detail="Is email/Gmail se pehle se account bana hua hai. Kripya login karein.")

        # 3. Handle Username
        chosen_username = (req.username or "").strip().lower()
        if chosen_username:
            if not re.match(r"^[a-z0-9_]{3,20}$", chosen_username):
                raise HTTPException(
                    status_code=400,
                    detail="Username 3 se 20 aksharon ka hona chahiye (sirf a-z, 0-9 aur underscore '_' maanya hain)."
                )

            existing_user = conn.execute(
                "SELECT id FROM users WHERE LOWER(username) = ?",
                (chosen_username,)
            ).fetchone()
            if existing_user:
                suggestions = generate_username_suggestions(chosen_username, req.name, conn)
                sugg_str = ", ".join(suggestions[:3])
                raise HTTPException(
                    status_code=409,
                    detail=f"Username '{chosen_username}' pehle se uplabdh nahi hai. Yeh chunein: {sugg_str}"
                )
        else:
            # Auto-generate a clean username
            suggestions = generate_username_suggestions(req.name, req.name, conn)
            chosen_username = suggestions[0] if suggestions else f"user_{norm_phone[-4:]}"

        hashed = hash_password(req.password)
        cursor = conn.execute(
            """
            INSERT INTO users (name, phone, hashed_password, role, village, username, email) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (req.name.strip(), norm_phone, hashed, req.role, req.village.strip(), chosen_username, clean_email)
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
    """
    Authenticate a user via Username, Gmail/Email, OR Mobile Number and return a JWT access token.
    """
    identifier = (req.identifier or req.phone or "").strip()
    if not identifier:
        raise HTTPException(status_code=400, detail="Username, Email/Gmail ya Mobile Number darz karein.")

    conn = get_db()
    try:
        norm_phone = normalize_phone(identifier)
        ident_lower = identifier.lower()

        row = conn.execute(
            """
            SELECT * FROM users 
            WHERE phone = ? 
               OR phone = ? 
               OR LOWER(username) = ? 
               OR LOWER(email) = ?
            """,
            (identifier, norm_phone, ident_lower, ident_lower)
        ).fetchone()

        if not row:
            raise HTTPException(
                status_code=401,
                detail="Galat login jankari. Kripya apna Username, Email ya Mobile Number aur password janch kar fir koshish karein."
            )

        user_dict = dict(row)
        if not verify_password(req.password, user_dict["hashed_password"]):
            raise HTTPException(
                status_code=401,
                detail="Galat password. Kripya sahi password darz karein."
            )

        token = create_access_token({"user_id": user_dict["id"], "role": user_dict["role"]})

        return LoginResponse(
            access_token=token,
            user=UserProfile(**user_dict)
        )
    finally:
        conn.close()


@router.post("/reset-password")
async def reset_password(
    req: ResetPasswordRequest,
    admin: Dict[str, Any] = Depends(require_role("admin"))
):
    """Allows administrators to reset a user's password using their Phone Number, Username, or Email."""
    if not req.new_password or len(req.new_password.strip()) < 4:
        raise HTTPException(status_code=400, detail="Naya password kam se kam 4 aksharon ka hona chahiye.")

    identifier = (req.identifier or req.phone or "").strip()
    if not identifier:
        raise HTTPException(status_code=400, detail="Phone number, Username, ya Email darz karein.")

    conn = get_db()
    try:
        norm_phone = normalize_phone(identifier)
        ident_lower = identifier.lower()

        row = conn.execute(
            """
            SELECT id, name FROM users 
            WHERE phone = ? 
               OR phone = ? 
               OR LOWER(username) = ? 
               OR LOWER(email) = ?
            """,
            (identifier, norm_phone, ident_lower, ident_lower)
        ).fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail="Is Phone number, Username, ya Email se juda koi khata nahi mila."
            )

        hashed = hash_password(req.new_password.strip())
        conn.execute("UPDATE users SET hashed_password = ? WHERE id = ?", (hashed, row["id"]))
        conn.commit()
        return {"message": f"{row['name']} ke liye password safaltapoorvak reset ho gaya hai. Ab aap login kar sakte hain."}
    finally:
        conn.close()


@router.get("/me", response_model=UserProfile)
async def get_me(user: Dict[str, Any] = Depends(get_current_user)):
    """Returns the currently authenticated user's profile."""
    return UserProfile(**user)


@router.post("/otp/send", response_model=OtpResponse)
async def send_otp(req: SendOtpRequest):
    """
    Generates and sends a 6-digit OTP via Email/Gmail or SMS.
    Purpose can be 'register', 'login', or 'reset_password'.
    """
    raw_target = req.target.strip()
    if not raw_target:
        raise HTTPException(status_code=400, detail="Mobile number ya Email darz karein.")

    conn = get_db()
    try:
        actual_target = raw_target
        target_type = "email" if "@" in raw_target else "sms"

        # If purpose is reset_password, look up user first
        if req.purpose == "reset_password":
            user_row = conn.execute(
                """
                SELECT id, name, phone, email, username FROM users
                WHERE phone = ? OR phone = ? OR LOWER(email) = ? OR LOWER(username) = ?
                """,
                (raw_target, normalize_phone(raw_target), raw_target.lower(), raw_target.lower())
            ).fetchone()

            if not user_row:
                raise HTTPException(
                    status_code=404,
                    detail="Is Email, Mobile number ya Username se juda koi khata nahi mila."
                )

            # If user entered an email address
            if "@" in raw_target:
                actual_target = raw_target.lower()
                target_type = "email"
            elif re.match(r"^[6-9]\d{9}$", normalize_phone(raw_target)):
                actual_target = normalize_phone(raw_target)
                target_type = "sms"
            else:
                # User entered username: deliver to their email if available, else phone
                if user_row["email"]:
                    actual_target = user_row["email"]
                    target_type = "email"
                else:
                    actual_target = user_row["phone"]
                    target_type = "sms"
        else:
            if target_type == "email":
                actual_target = raw_target.lower()
                if not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", actual_target):
                    raise HTTPException(status_code=400, detail="Kripya ek maanya Email/Gmail address darz karein.")
            else:
                actual_target = validate_mobile_number(raw_target)

        # Generate 6-digit OTP
        otp_code = f"{random.randint(100000, 999999)}"
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()

        # Save to otps table for actual_target and raw_target
        conn.execute(
            """
            INSERT INTO otps (target, target_type, otp_code, purpose, expires_at, verified)
            VALUES (?, ?, ?, ?, ?, 0)
            """,
            (actual_target.lower(), target_type, otp_code, req.purpose, expires_at)
        )
        if raw_target.lower() != actual_target.lower():
            conn.execute(
                """
                INSERT INTO otps (target, target_type, otp_code, purpose, expires_at, verified)
                VALUES (?, ?, ?, ?, ?, 0)
                """,
                (raw_target.lower(), target_type, otp_code, req.purpose, expires_at)
            )
        conn.commit()

        # Dispatch via notification service
        if target_type == "email":
            notif_res = send_email_otp(to_email=actual_target, otp=otp_code, purpose=req.purpose)
        else:
            notif_res = send_sms_otp(to_phone=actual_target, otp=otp_code, purpose=req.purpose)

        # Include dev_otp if in simulation mode or non-production environment
        is_simulated = notif_res.get("status") == "simulated" or settings.APP_ENV != "production"
        dev_otp = otp_code if is_simulated else None

        return OtpResponse(
            success=True,
            message=notif_res.get("message", f"OTP {actual_target} par bhej diya gaya hai."),
            target_type=target_type,
            dev_otp=dev_otp
        )
    finally:
        conn.close()


@router.post("/otp/verify", response_model=OtpResponse)
async def verify_otp(req: VerifyOtpRequest):
    """
    Validates a submitted 6-digit OTP code against the database.
    """
    raw_target = req.target.strip()
    norm_target = raw_target.lower() if "@" in raw_target else re.sub(r"[^\d]", "", raw_target)[-10:]
    submitted_otp = req.otp.strip()

    conn = get_db()
    try:
        row = conn.execute(
            """
            SELECT id, otp_code, expires_at, verified FROM otps
            WHERE (target = ? OR target = ?) AND purpose = ?
            ORDER BY id DESC LIMIT 1
            """,
            (raw_target.lower(), norm_target.lower(), req.purpose)
        ).fetchone()

        if not row:
            raise HTTPException(
                status_code=400,
                detail="Koi sakriya OTP anurodh nahi mila. Kripya naya OTP mangwayein."
            )

        # Check expiration
        now_iso = datetime.now(timezone.utc).isoformat()
        if row["expires_at"] < now_iso:
            raise HTTPException(
                status_code=400,
                detail="Yeh OTP samapta (expired) ho chuka hai. Kripya naya OTP mangwayein."
            )

        if row["otp_code"] != submitted_otp:
            raise HTTPException(
                status_code=400,
                detail="Galat OTP code. Kripya 6-digit code dobara janch kar darz karein."
            )

        # Mark OTP as verified
        conn.execute("UPDATE otps SET verified = 1 WHERE id = ?", (row["id"],))
        conn.commit()

        return OtpResponse(
            success=True,
            message="OTP safaltapoorvak verify ho gaya hai."
        )
    finally:
        conn.close()


@router.post("/reset-password-with-otp")
async def reset_password_with_otp(req: ResetPasswordWithOtpRequest):
    """
    Resets the user's password using a verified OTP.
    """
    if not req.new_password or len(req.new_password.strip()) < 4:
        raise HTTPException(status_code=400, detail="Naya password kam se kam 4 aksharon ka hona chahiye.")

    raw_target = req.target.strip()
    norm_target = raw_target.lower() if "@" in raw_target else re.sub(r"[^\d]", "", raw_target)[-10:]
    submitted_otp = req.otp.strip()

    conn = get_db()
    try:
        # Find the latest OTP row
        row = conn.execute(
            """
            SELECT id, otp_code, expires_at, verified FROM otps
            WHERE (target = ? OR target = ?) AND purpose = 'reset_password'
            ORDER BY id DESC LIMIT 1
            """,
            (raw_target.lower(), norm_target.lower())
        ).fetchone()

        if not row:
            raise HTTPException(
                status_code=400,
                detail="Koi sakriya OTP request nahi mili. Kripya naya OTP mangwayein."
            )

        now_iso = datetime.now(timezone.utc).isoformat()
        if row["expires_at"] < now_iso:
            raise HTTPException(
                status_code=400,
                detail="OTP expire ho chuka hai. Kripya naya OTP mangwayein."
            )

        if row["otp_code"] != submitted_otp:
            raise HTTPException(
                status_code=400,
                detail="Galat OTP code darz kiya gaya hai."
            )

        # Find the user account
        user_row = conn.execute(
            """
            SELECT id, name FROM users 
            WHERE phone = ? OR phone = ? OR LOWER(email) = ? OR LOWER(username) = ?
            """,
            (raw_target, norm_target, raw_target.lower(), raw_target.lower())
        ).fetchone()

        if not user_row:
            raise HTTPException(
                status_code=404,
                detail="Is target se juda user account nahi mila."
            )

        # Update password
        hashed = hash_password(req.new_password.strip())
        conn.execute("UPDATE users SET hashed_password = ? WHERE id = ?", (hashed, user_row["id"]))
        conn.execute("UPDATE otps SET verified = 1 WHERE id = ?", (row["id"],))
        conn.commit()

        return {
            "success": True,
            "message": f"{user_row['name']} ke liye password safaltapoorvak badal diya gaya hai. Ab aap naye password se login kar sakte hain."
        }
    finally:
        conn.close()




