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
    triage_logs_table,
    screening_logs_table,
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
    metadata.create_all(engine, tables=[triage_logs_table, screening_logs_table], checkfirst=True)


def log_triage_encounter(
    session_id: str,
    tier: str,
    user_id: Optional[int] = None,
    chief_complaint: str = "",
    symptoms: str = "",
    clinical_flags: str = "",
    remedies_suggested: str = "",
    detected_conditions: str = "",
    blocked_remedies: str = "",
    dialogue_phase: str = "",
    language: str = "hi"
) -> int:
    """Logs a clinical triage encounter into the triage_logs table."""
    try:
        with get_db_connection() as conn:
            stmt = insert(triage_logs_table).values(
                session_id=session_id,
                user_id=user_id,
                tier=tier,
                chief_complaint=chief_complaint,
                symptoms=symptoms,
                clinical_flags=clinical_flags,
                remedies_suggested=remedies_suggested,
                detected_conditions=detected_conditions,
                blocked_remedies=blocked_remedies,
                dialogue_phase=dialogue_phase,
                language=language
            )
            res = conn.execute(stmt)
            return res.inserted_primary_key[0] if res.inserted_primary_key else 0
    except Exception as e:
        logger.error(f"[DB Error] Failed to log triage encounter: {e}")
        return 0


def log_vision_screening(
    screening_type: str,
    risk_level: str,
    user_id: Optional[int] = None,
    biomarker: str = "",
    calculated_index: str = "",
    estimated_metric: str = "",
    confidence_score: str = "",
    roi_localization_method: str = "",
    abdm_report_id: str = ""
) -> int:
    """Logs a computer vision biomarker screening encounter into screening_logs table."""
    try:
        with get_db_connection() as conn:
            stmt = insert(screening_logs_table).values(
                screening_type=screening_type,
                risk_level=risk_level,
                user_id=user_id,
                biomarker=biomarker,
                calculated_index=str(calculated_index),
                estimated_metric=str(estimated_metric),
                confidence_score=str(confidence_score),
                roi_localization_method=roi_localization_method,
                abdm_report_id=abdm_report_id
            )
            res = conn.execute(stmt)
            return res.inserted_primary_key[0] if res.inserted_primary_key else 0
    except Exception as e:
        logger.error(f"[DB Error] Failed to log vision screening: {e}")
        return 0


def seed_default_admin():
    """Seeds default demo accounts for all three roles if they don't exist using SQLAlchemy Core (dev/test only)."""
    from app.config import settings
    if settings.APP_ENV.lower() == "production":
        logger.info("[Auth] Production environment detected; skipping demo account reseeding.")
        return

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
