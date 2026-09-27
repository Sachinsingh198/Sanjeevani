"""
Authentication utilities: password hashing (bcrypt), JWT token management,
and FastAPI dependency for extracting the current user from Bearer tokens.

JWT Lifecycle (Phase 1 Security Upgrade):
  - Access tokens: short-lived (default 30 min), carry user_id + role + token_version
  - Refresh tokens: longer-lived (default 7 days), used to obtain new access tokens
  - token_version on users table: bumped on password change/logout to revoke all tokens
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings

security = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Password Hashing
# ---------------------------------------------------------------------------

def hash_password(plain: str) -> str:
    """Hashes a plaintext password using bcrypt."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verifies a plaintext password against a bcrypt hash."""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ---------------------------------------------------------------------------
# JWT Token Management
# ---------------------------------------------------------------------------

def create_access_token(data: Dict[str, Any], expires_minutes: Optional[int] = None) -> str:
    """Creates a signed JWT access token (short-lived, default 30 min)."""
    now = datetime.now(timezone.utc)
    to_encode = data.copy()
    expire = now + timedelta(
        minutes=expires_minutes or settings.JWT_ACCESS_EXPIRE_MINUTES
    )
    to_encode.update({
        "exp": expire,
        "iat": now,
        "jti": uuid.uuid4().hex,
        "type": "access",
    })
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: Dict[str, Any], expires_days: Optional[int] = None) -> str:
    """Creates a signed JWT refresh token (longer-lived, default 7 days)."""
    now = datetime.now(timezone.utc)
    to_encode = data.copy()
    expire = now + timedelta(
        days=expires_days or settings.JWT_REFRESH_EXPIRE_DAYS
    )
    to_encode.update({
        "exp": expire,
        "iat": now,
        "jti": uuid.uuid4().hex,
        "type": "refresh",
    })
    return jwt.encode(to_encode, settings.JWT_REFRESH_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decodes and validates a JWT access token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        # Reject refresh tokens presented as access tokens
        if payload.get("type") == "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def decode_refresh_token(token: str) -> Dict[str, Any]:
    """Decodes and validates a JWT refresh token."""
    try:
        payload = jwt.decode(token, settings.JWT_REFRESH_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token has expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


# ---------------------------------------------------------------------------
# Token Version Helpers
# ---------------------------------------------------------------------------

def bump_token_version(user_id: int) -> int:
    """Increments the token_version for a user, invalidating all existing tokens. Returns new version."""
    from app.db import get_db_connection, users_table
    from sqlalchemy import select, update

    with get_db_connection() as conn:
        row = conn.execute(
            select(users_table.c.token_version).where(users_table.c.id == user_id)
        ).fetchone()
        new_version = (row.token_version if row and row.token_version else 0) + 1
        conn.execute(
            update(users_table).where(users_table.c.id == user_id).values(token_version=new_version)
        )
        return new_version


# ---------------------------------------------------------------------------
# FastAPI Dependencies
# ---------------------------------------------------------------------------

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Dict[str, Any]:
    """
    FastAPI dependency that extracts and validates the current user from
    the Authorization: Bearer <token> header.
    Validates token_version to ensure the token hasn't been revoked.
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")

    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    from app.db import get_db_connection, users_table, row_to_dict
    from sqlalchemy import select

    with get_db_connection() as conn:
        stmt = select(users_table).where(users_table.c.id == user_id)
        row = conn.execute(stmt).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    user_dict = row_to_dict(row)

    # Validate token_version: reject tokens issued before a password change or logout
    token_ver = payload.get("token_version", 0)
    db_ver = user_dict.get("token_version", 0) or 0
    if token_ver < db_ver:
        raise HTTPException(status_code=401, detail="Token has been revoked. Please log in again.")

    return user_dict


def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[Dict[str, Any]]:
    """
    Optional user dependency: returns user dict if valid Bearer token provided,
    otherwise returns None without raising HTTPException.
    """
    if not credentials or not credentials.credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = payload.get("user_id")
        if not user_id:
            return None
        from app.db import get_db_connection, users_table, row_to_dict
        from sqlalchemy import select

        with get_db_connection() as conn:
            stmt = select(users_table).where(users_table.c.id == user_id)
            row = conn.execute(stmt).fetchone()
            if not row:
                return None
            user_dict = row_to_dict(row)
            # Validate token_version silently
            token_ver = payload.get("token_version", 0)
            db_ver = user_dict.get("token_version", 0) or 0
            if token_ver < db_ver:
                return None
            return user_dict
    except Exception:
        return None


def require_role(*roles: str):
    """
    Returns a FastAPI dependency that ensures the current user has one of
    the specified roles. Usage: `Depends(require_role("admin"))`
    """
    def dependency(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        if user["role"] not in roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required role: {', '.join(roles)}"
            )
        return user
    return dependency
