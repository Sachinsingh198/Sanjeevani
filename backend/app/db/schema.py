from sqlalchemy import (
    MetaData, Table, Column, Integer, String, Text, DateTime, func, Index, text
)
from app.core.logger import logger

metadata = MetaData()

# 1. Users Table
users_table = Table(
    "users",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("name", String(255), nullable=False),
    Column("phone", String(50), unique=True, nullable=False),
    Column("hashed_password", String(255), nullable=False),
    Column("role", String(50), nullable=False, default="patient"),
    Column("village", String(255), default=""),
    Column("username", String(100), nullable=True),
    Column("email", String(255), nullable=True),
    Column("age", Integer, nullable=True),
    Column("gender", String(50), nullable=True),
    Column("district", String(255), nullable=True, default="Chamoli"),
    Column("state", String(255), nullable=True, default="Uttarakhand"),
    Column("blood_group", String(20), nullable=True),
    Column("emergency_contact_name", String(255), nullable=True),
    Column("emergency_contact_phone", String(50), nullable=True),
    Column("language_preference", String(50), nullable=True, default="hi"),
    Column("comorbidities", Text, nullable=True),
    Column("allergies", Text, nullable=True),
    Column("worker_id", String(100), nullable=True),
    Column("assigned_phc", String(255), nullable=True),
    Column("abha_id", String(100), nullable=True),
    Column("avatar_url", String(500), nullable=True),
    Column("settings_json", Text, nullable=True),
    Column("created_at", DateTime, nullable=False, server_default=func.now()),
)

# 2. OTP Verification Table
otps_table = Table(
    "otps",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("target", String(255), nullable=False),
    Column("target_type", String(50), nullable=False),
    Column("otp_code", String(10), nullable=False),
    Column("purpose", String(50), nullable=False),
    Column("created_at", DateTime, nullable=False, server_default=func.now()),
    Column("expires_at", String(100), nullable=False),
    Column("verified", Integer, nullable=False, default=0),
)

# Alias for backward compatibility
password_reset_otps_table = otps_table

# 3. Conversation Index Table (Lightweight listing for patient history)
conversation_index_table = Table(
    "conversation_index",
    metadata,
    Column("conversation_id", String(255), primary_key=True),
    Column("user_id", Integer, nullable=True),
    Column("summary", Text, nullable=True),
    Column("tier", String(50), nullable=True),
    Column("created_at", DateTime, nullable=False, server_default=func.now()),
    Column("updated_at", DateTime, nullable=False, server_default=func.now(), onupdate=func.now()),
)

# 4. Patient Encounters (ASHA Worker Offline-First Encounters)
patient_encounters_table = Table(
    "patient_encounters",
    metadata,
    Column("id", String(255), primary_key=True),
    Column("name", String(255), nullable=False),
    Column("village", String(255), nullable=True),
    Column("tier", String(50), nullable=True),
    Column("symptom", Text, nullable=True),
    Column("vitals", Text, nullable=True),
    Column("synced_at", DateTime, nullable=False, server_default=func.now()),
)

# Alias
asha_encounters_table = patient_encounters_table

# 5. Privacy-Preserving Aggregate Analytics Events (Zero PII)
analytics_events_table = Table(
    "analytics_events",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("event_type", String(100), nullable=False),
    Column("tier", String(50), nullable=True),
    Column("language", String(50), nullable=True),
    Column("created_at", DateTime, nullable=False, server_default=func.now()),
)

# 6. User Activity Audit Logs Table
activity_logs_table = Table(
    "activity_logs",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("user_id", Integer, nullable=True, index=True),
    Column("user_name", String(255), nullable=True),
    Column("user_role", String(50), nullable=True, index=True),
    Column("action", String(100), nullable=False, index=True),
    Column("description", Text, nullable=True),
    Column("village", String(255), nullable=True, index=True),
    Column("ip_address", String(100), nullable=True),
    Column("metadata_json", Text, nullable=True),
    Column("created_at", DateTime, nullable=False, server_default=func.now(), index=True),
)


def _migrate_columns_safely(engine):
    """
    Safely adds any missing columns to existing database tables without data loss.
    Supports both SQLite and PostgreSQL.
    """
    new_user_columns = [
        ("age", "INTEGER"),
        ("gender", "VARCHAR(50)"),
        ("district", "VARCHAR(255)"),
        ("state", "VARCHAR(255)"),
        ("blood_group", "VARCHAR(20)"),
        ("emergency_contact_name", "VARCHAR(255)"),
        ("emergency_contact_phone", "VARCHAR(50)"),
        ("language_preference", "VARCHAR(50)"),
        ("comorbidities", "TEXT"),
        ("allergies", "TEXT"),
        ("worker_id", "VARCHAR(100)"),
        ("assigned_phc", "VARCHAR(255)"),
        ("abha_id", "VARCHAR(100)"),
        ("avatar_url", "VARCHAR(500)"),
        ("settings_json", "TEXT"),
    ]

    try:
        with engine.begin() as conn:
            existing_cols = set()
            if engine.dialect.name == "sqlite":
                col_info = conn.execute(text("PRAGMA table_info(users)")).fetchall()
                existing_cols = {col[1] for col in col_info}
            else:
                col_info = conn.execute(text("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = 'users'
                """)).fetchall()
                existing_cols = {col[0] for col in col_info}

            for col_name, col_type in new_user_columns:
                if col_name not in existing_cols:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                    logger.info(f"[DB] Added missing column '{col_name}' to users table.")
    except Exception as e:
        logger.warning(f"[DB] Column migration check note: {e}")


def create_all_tables(engine):
    """
    Creates all tables defined in metadata using the configured engine.
    Ensures safe schema alignment and creates supporting indexes.
    """
    metadata.create_all(engine)
    _migrate_columns_safely(engine)

    if engine.dialect.name == "postgresql":
        try:
            with engine.begin() as conn:
                for table_name in ["users", "otps", "analytics_events", "activity_logs"]:
                    conn.execute(text(f"""
                        SELECT setval(
                            pg_get_serial_sequence('{table_name}', 'id'),
                            COALESCE((SELECT MAX(id) FROM {table_name}), 0) + 1,
                            false
                        )
                    """))
        except Exception as e:
            logger.debug(f"[DB] Sequence sync note: {e}")
    logger.info("[DB] Verified all SQLAlchemy Core tables exist.")
