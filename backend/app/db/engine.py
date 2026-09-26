import os
import socket
from urllib.parse import urlparse
from sqlalchemy import create_engine, event, text
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


def is_remote_db_reachable(url: str, timeout: float = 2.0) -> bool:
    """Quickly checks if the remote database host can be resolved by DNS without hanging."""
    try:
        parsed = urlparse(url)
        hostname = parsed.hostname
        if not hostname:
            return True
        socket.setdefaulttimeout(timeout)
        socket.gethostbyname(hostname)
        return True
    except Exception:
        return False


def get_sqlite_engine(custom_path: str = "sanjeevani_local.db"):
    """Creates a local SQLite engine with WAL mode and high-concurrency busy timeout for zero-network resilience."""
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    resolved_path = os.path.normpath(os.path.join(backend_dir, custom_path))
    sqlite_url = f"sqlite:///{resolved_path}"

    engine = create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False, "timeout": 30.0},
        future=True,
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=30000")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    logger.info(f"[DB] Initialized local resilient SQLite engine at: {resolved_path}")
    return engine


def get_engine(db_url: str = None):
    """
    Creates and configures the centralized SQLAlchemy engine based on db_url or settings.DATABASE_URL.
    Supports SQLite with WAL mode and PostgreSQL with connection pooling.
    Gracefully falls back to local SQLite if remote PostgreSQL is unreachable (e.g. offline testing / village clinic).
    """
    raw_url = db_url if db_url is not None else settings.DATABASE_URL
    url = normalize_db_url(raw_url)

    if not url or url.startswith("sqlite"):
        raw_path = url.replace("sqlite:///", "") if url else "sanjeevani_local.db"
        return get_sqlite_engine(raw_path if raw_path else "sanjeevani_local.db")

    if url.startswith("postgresql"):
        # Check if remote host is reachable before attempting pool connections
        if not is_remote_db_reachable(url):
            logger.warning(
                "[DB] Remote PostgreSQL host is unreachable (offline mode or DNS failure). "
                "Automatically activating local SQLite fallback (sanjeevani_local.db) for zero-interruption operation."
            )
            return get_sqlite_engine("sanjeevani_local.db")

        try:
            engine = create_engine(
                url,
                pool_size=10,
                max_overflow=20,
                pool_pre_ping=True,
                pool_recycle=300,
                connect_args={"connect_timeout": 3},
                future=True,
            )
            # Lightweight verification ping
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info(f"[DB] Connected to PostgreSQL cloud database.")
            return engine
        except Exception as pg_err:
            logger.warning(
                f"[DB] Failed to connect to PostgreSQL ({pg_err}). "
                "Activating offline fallback to local SQLite (sanjeevani_local.db)."
            )
            return get_sqlite_engine("sanjeevani_local.db")

    # Generic fallback
    engine = create_engine(url, future=True)
    logger.info(f"[DB] Initialized SQLAlchemy engine with dialect: {engine.dialect.name}")
    return engine


engine = get_engine()

