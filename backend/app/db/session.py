from contextlib import contextmanager
from typing import Generator, Any, Optional, Dict, List
from sqlalchemy import Connection
from app.db.engine import engine

@contextmanager
def get_db_connection() -> Generator[Connection, None, None]:
    """
    Context manager that yields an active SQLAlchemy Connection.
    Automatically commits transactions on clean block exit, rolls back on exception,
    and returns connection to the pool upon completion.
    """
    connection = engine.connect()
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
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

