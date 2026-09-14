"""
SQLAlchemy User model and database initialization for Sanjeevani 2.0.
Supports three roles: patient, asha, admin.
"""
import sqlite3
import os
from datetime import datetime
from app.config import settings


DB_PATH = settings.DATABASE_URL.replace("sqlite:///", "")


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
    """Seeds a default admin account if none exists."""
    from app.core.auth import hash_password

    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1").fetchone()
    if not existing:
        conn.execute(
            "INSERT INTO users (name, phone, hashed_password, role, village) VALUES (?, ?, ?, ?, ?)",
            ("Admin", "admin", hash_password("sanjeevani2026"), "admin", "Gopeshwar")
        )
        conn.commit()
        print("[Auth] Default admin seeded (phone: admin, password: sanjeevani2026)")
    conn.close()
