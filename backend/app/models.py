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
    Normalizes phone or identifier input:
    - Preserves emails and usernames
    - Strips spaces, hyphens, parentheses from phone numbers
    - Strips leading '+91', '91' (if 12 digits), or leading '0' (if 11 digits)
    """
    if not phone:
        return ""
    cleaned = phone.strip()
    
    # If it's an email address or username with letters
    if "@" in cleaned or re.search(r"[a-zA-Z]", cleaned):
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
    """Creates the users table if it does not exist and ensures schema migration."""
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'patient' CHECK(role IN ('patient', 'asha', 'admin')),
            village TEXT DEFAULT '',
            username TEXT,
            email TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)

    # Safe dynamic column migrations for existing databases
    cursor = conn.execute("PRAGMA table_info(users)")
    existing_cols = {row["name"] for row in cursor.fetchall()}

    if "username" not in existing_cols:
        conn.execute("ALTER TABLE users ADD COLUMN username TEXT")
        print("[DB Migration] Added 'username' column to users table.")

    if "email" not in existing_cols:
        conn.execute("ALTER TABLE users ADD COLUMN email TEXT")
        print("[DB Migration] Added 'email' column to users table.")

    # Create helpful indexes for rapid login lookups
    conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(LOWER(username)) WHERE username IS NOT NULL AND username != ''")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email)) WHERE email IS NOT NULL AND email != ''")

    # OTP Verification Table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS otps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            target TEXT NOT NULL,
            target_type TEXT NOT NULL,
            otp_code TEXT NOT NULL,
            purpose TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            expires_at TEXT NOT NULL,
            verified INTEGER NOT NULL DEFAULT 0
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_otps_target_purpose ON otps(target, purpose)")

    conn.commit()
    conn.close()



def seed_default_admin():
    """Seeds default demo accounts for all three roles if they don't exist."""
    from app.core.auth import hash_password

    conn = get_db()
    try:
        demo_accounts = [
            ("Admin", "admin", hash_password("sanjeevani2026"), "admin", "Gopeshwar", "admin", "admin@sanjeevani.gov.in"),
            ("Sunita Devi (ASHA)", "asha", hash_password("sanjeevani2026"), "asha", "Mandal, Chamoli", "asha", "sunita.asha@sanjeevani.gov.in"),
            ("Sachin Singh (Patient)", "patient", hash_password("sanjeevani2026"), "patient", "Gopeshwar Ward 3", "patient", "sachin.patient@gmail.com"),
        ]

        for name, phone, hashed_pw, role, village, uname, email in demo_accounts:
            existing = conn.execute("SELECT id FROM users WHERE phone = ? OR LOWER(username) = ?", (phone, uname)).fetchone()
            if not existing:
                conn.execute(
                    "INSERT INTO users (name, phone, hashed_password, role, village, username, email) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (name, phone, hashed_pw, role, village, uname, email)
                )
                print(f"[Auth] Seeded demo {role} account: phone='{phone}', username='{uname}', email='{email}'")
            else:
                # Update demo credentials, username, and email to ensure demo logins always work
                conn.execute(
                    "UPDATE users SET hashed_password = ?, username = ?, email = ? WHERE id = ?",
                    (hashed_pw, uname, email, existing["id"])
                )

        conn.commit()
    finally:
        conn.close()

