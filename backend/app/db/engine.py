import os
from sqlalchemy import create_engine, event
from app.config import settings
from app.core.logger import logger

def normalize_db_url(url: str) -> str:
    """Normalizes database URLs (e.g., converts postgres:// to postgresql:// for Heroku/Render)."""
    if not url:
        return ""
    clean = url.strip()
    if clean.startswith("postgres://"):
        clean = "postgresql://" + clean[len("postgres://"):]
    return clean


def get_engine(db_url: str = None):
    """
    Creates and configures the centralized SQLAlchemy engine based on db_url or settings.DATABASE_URL.
    Supports SQLite with WAL mode and PostgreSQL with connection pooling (pool_size=10, max_overflow=20, pool_recycle=300).
    """
    raw_url = db_url if db_url is not None else settings.DATABASE_URL
    url = normalize_db_url(raw_url)

    if url.startswith("sqlite"):
        # Resolve absolute path if relative SQLite path provided
        raw_path = url.replace("sqlite:///", "")
        if not os.path.isabs(raw_path):
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            resolved_path = os.path.normpath(os.path.join(backend_dir, raw_path))
            url = f"sqlite:///{resolved_path}"

        engine = create_engine(
            url,
            connect_args={"check_same_thread": False},
            future=True,
        )

        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    elif url.startswith("postgresql"):
        # PostgreSQL dual-dialect production configuration
        engine = create_engine(
            url,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            pool_recycle=300,
            future=True,
        )
    else:
        # Generic / fallback
        engine = create_engine(url, future=True)

    logger.info(f"[DB] Initialized SQLAlchemy engine with dialect: {engine.dialect.name}")
    return engine


engine = get_engine()
