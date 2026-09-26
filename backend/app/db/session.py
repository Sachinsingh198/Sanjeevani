from contextlib import contextmanager
from typing import Generator, Any, Optional, Dict, List
from sqlalchemy import Connection
from app.db.engine import engine

_local_fallback_engine = None

def _get_fallback_connection() -> Connection:
    global _local_fallback_engine
    if _local_fallback_engine is None:
        from app.db.engine import get_sqlite_engine
        _local_fallback_engine = get_sqlite_engine("sanjeevani_local.db")
        try:
            from app.db.schema import create_all_tables
            create_all_tables(_local_fallback_engine)
            from app.models import seed_default_admin
            seed_default_admin()
        except Exception:
            pass
    return _local_fallback_engine.connect()


@contextmanager
def get_db_connection() -> Generator[Connection, None, None]:
    """
    Context manager that yields an active SQLAlchemy Connection.
    Automatically commits transactions on clean block exit, rolls back on exception,
    and returns connection to the pool upon completion.
    Gracefully falls back to local SQLite if primary engine fails due to network drop.
    """
    connection = None
    try:
        connection = engine.connect()
    except Exception as conn_err:
        from app.core.logger import logger
        logger.warning(f"[DB] Primary database connection failed ({conn_err}). Engaging local SQLite fallback.")
        connection = _get_fallback_connection()

    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        if connection is not None:
            connection.close()


def get_db_conn() -> Generator[Connection, None, None]:
    """
    FastAPI dependency yielding an active SQLAlchemy Connection.
    """
    with get_db_connection() as conn:
        yield conn


from datetime import datetime

def row_to_dict(row: Any) -> Optional[Dict[str, Any]]:
    """Converts a SQLAlchemy Row to a standard Python dictionary."""
    if row is None:
        return None
    d = dict(row._mapping)
    for k, v in d.items():
        if isinstance(v, datetime):
            d[k] = v.isoformat()
    return d


def rows_to_dicts(rows: List[Any]) -> List[Dict[str, Any]]:
    """Converts a list of SQLAlchemy Rows to a list of Python dictionaries."""
    return [row_to_dict(r) for r in rows]

