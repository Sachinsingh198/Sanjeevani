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


def create_all_tables(engine):
    """
    Creates all tables defined in metadata using the configured engine.
    Ensures safe schema alignment and creates supporting indexes.
    """
    metadata.create_all(engine)
    if engine.dialect.name == "postgresql":
        try:
            with engine.begin() as conn:
                for table_name in ["users", "otps", "analytics_events"]:
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
