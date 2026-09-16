"""
SQLAlchemy User model and database initialization for Sanjeevani 2.0.
Supports three roles: patient, asha, admin.
"""
import sqlite3
import os
from datetime import datetime
from app.config import settings


"""
SQLAlchemy User model and database initialization for Sanjeevani 2.0.
Supports three roles: patient, asha, admin.
"""
import sqlite3
import os
import re
from datetime import datetime
from app.config import settings

# Resolve absolute path to database to avoid CWD mismatch issues
raw_db_path = settings.DATABASE_URL.replace("sqlite:///", "")
if not os.path.isabs(raw_db_path):
    # backend root is two levels up from this file (app/models.py -> backend)
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DB_PATH = os.path.normpath(os.path.join(backend_dir, raw_db_path))
else:
    DB_PATH = raw_db_path


def normalize_phone(phone: str) -> str:
    """
    Normalizes phone input:
    - Preserves keywords like 'admin', 'asha', 'patient'
    - Strips spaces, hyphens, parentheses
    - Strips leading '+91', '91' (if 12 digits), or leading '0' (if 11 digits)
    """
    if not phone:
        return ""
    cleaned = phone.strip()
    if cleaned.lower() in ("admin", "asha", "patient"):
        return cleaned.lower()

    # Remove non-digits
    digits = re.sub(r"[^\d]", "", cleaned)
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    elif digits.startswith("0") and len(digits) == 11:
        digits = digits[1:]
    return digits if digits else cleaned.lower()


def get_db():
    """Returns a raw sqlite3 connection (lightweight, no ORM overhead)."""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def create_tables():
    """Creates the users table if it does not exist."""
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'patient' CHECK(role IN ('patient', 'asha', 'admin')),
            village TEXT DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    conn.commit()
    conn.close()


def seed_default_admin():
    """Seeds default demo accounts for all three roles if they don't exist."""
    from app.core.auth import hash_password

    conn = get_db()
    try:
        demo_accounts = [
            ("Admin", "admin", hash_password("sanjeevani2026"), "admin", "Gopeshwar"),
            ("Sunita Devi (ASHA)", "asha", hash_password("sanjeevani2026"), "asha", "Mandal, Chamoli"),
            ("Sachin Singh (Patient)", "patient", hash_password("sanjeevani2026"), "patient", "Gopeshwar Ward 3"),
        ]

        for name, phone, hashed_pw, role, village in demo_accounts:
            existing = conn.execute("SELECT id FROM users WHERE phone = ?", (phone,)).fetchone()
            if not existing:
                conn.execute(
                    "INSERT INTO users (name, phone, hashed_password, role, village) VALUES (?, ?, ?, ?, ?)",
                    (name, phone, hashed_pw, role, village)
                )
                print(f"[Auth] Seeded demo {role} account: phone='{phone}', password='sanjeevani2026'")
            else:
                # Update password to ensure demo credentials always function
                conn.execute(
                    "UPDATE users SET hashed_password = ? WHERE phone = ?",
                    (hashed_pw, phone)
                )

        conn.commit()
    finally:
        conn.close()

