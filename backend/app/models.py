"""
Database models and tables for Sanjeevani 2.0.
Migrated to SQLAlchemy Core abstraction layer for seamless SQLite <-> PostgreSQL cutover.
"""
import re
from typing import Optional, Dict, Any
from sqlalchemy import select, insert, update, or_, func, text
from app.core.logger import logger
from app.db.engine import engine
from app.db.schema import (
    metadata,
    users_table,
    otps_table,
    conversation_index_table,
    patient_encounters_table,
    analytics_events_table,
    create_all_tables,
)
from app.db.session import (
    get_db_connection,
    get_db_conn,
    row_to_dict,
    rows_to_dicts,
)


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


class RowAdapter(dict):
    """
    Adapter mimicking sqlite3.Row: supports both key access (row['name'])
    and integer index access (row[0]), as well as dict conversion dict(row).
    """
    def __init__(self, mapping):
        super().__init__(mapping)
        self._values = list(mapping.values())

    def __getitem__(self, item):
        if isinstance(item, int):
            return self._values[item]
        return super().__getitem__(item)


class DBConnectionAdapter:
    """
    Backward-compatible connection wrapper around SQLAlchemy Connection.
    Permits both legacy cursor calls (.cursor().execute(...)) and modern SQLAlchemy Core usage.
    """
    def __init__(self, raw_conn=None):
        self._conn = raw_conn if raw_conn is not None else engine.connect()
        self._last_result = None

    def cursor(self):
        return self

    def execute(self, statement, parameters=None):
        if isinstance(statement, str):
            stmt = text(statement)
            if parameters:
                if isinstance(parameters, (list, tuple)):
                    self._last_result = self._conn.exec_driver_sql(statement, tuple(parameters))
                elif isinstance(parameters, dict):
                    self._last_result = self._conn.execute(stmt, parameters)
                else:
                    self._last_result = self._conn.execute(stmt, parameters)
            else:
                self._last_result = self._conn.execute(stmt)
        else:
            if parameters:
                self._last_result = self._conn.execute(statement, parameters)
            else:
                self._last_result = self._conn.execute(statement)
        return self

    def fetchone(self):
        if self._last_result is None:
            return None
        row = self._last_result.fetchone()
        return RowAdapter(row._mapping) if row is not None else None

    def fetchall(self):
        if self._last_result is None:
            return []
        rows = self._last_result.fetchall()
        return [RowAdapter(r._mapping) for r in rows]

    @property
    def lastrowid(self):
        if self._last_result and hasattr(self._last_result, "inserted_primary_key"):
            pk = self._last_result.inserted_primary_key
            if pk:
                return pk[0]
        return None

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            self.rollback()
        else:
            self.commit()
        self.close()


def get_db():
    """
    Returns a database connection adapter supporting both legacy operations and modern SQLAlchemy execution.
    """
    return DBConnectionAdapter()


def create_tables():
    """Creates all tables using SQLAlchemy Core metadata and applies necessary schema migrations."""
    create_all_tables(engine)


def seed_default_admin():
    """Seeds default demo accounts for all three roles if they don't exist using SQLAlchemy Core."""
    from app.core.auth import hash_password

    demo_accounts = [
        ("Admin", "admin", hash_password("sanjeevani2026"), "admin", "Gopeshwar", "admin", "admin@sanjeevani.gov.in"),
        ("Sunita Devi (ASHA)", "asha", hash_password("sanjeevani2026"), "asha", "Mandal, Chamoli", "asha", "sunita.asha@sanjeevani.gov.in"),
        ("Sachin Singh (Patient)", "patient", hash_password("sanjeevani2026"), "patient", "Gopeshwar Ward 3", "patient", "sachin.patient@gmail.com"),
    ]

    with get_db_connection() as conn:
        for name, phone, hashed_pw, role, village, uname, email in demo_accounts:
            stmt = select(users_table.c.id).where(
                or_(
                    users_table.c.phone == phone,
                    func.lower(users_table.c.username) == uname.lower()
                )
            )
            existing = conn.execute(stmt).fetchone()

            if not existing:
                ins = insert(users_table).values(
                    name=name,
                    phone=phone,
                    hashed_password=hashed_pw,
                    role=role,
                    village=village,
                    username=uname,
                    email=email,
                )
                conn.execute(ins)
                logger.info(f"[Auth] Seeded demo {role} account: phone='{phone}', username='{uname}', email='{email}'")
            else:
                upd = (
                    update(users_table)
                    .where(users_table.c.id == existing[0])
                    .values(
                        hashed_password=hashed_pw,
                        username=uname,
                        email=email,
                    )
                )
                conn.execute(upd)
