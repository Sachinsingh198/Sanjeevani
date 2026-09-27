"""
Centralized Patient Data Access Audit Logger for Sanjeevani.
Records who (user_id, role) accessed which patient health record, consultation history,
or administrative directory, fulfilling health data privacy governance requirements.
"""
from typing import Optional, Dict, Any
from sqlalchemy import insert
from app.core.logger import logger
from app.db import get_db_connection, access_logs_table


def log_access(
    resource_type: str,
    user: Optional[Dict[str, Any]] = None,
    user_id: Optional[int] = None,
    user_role: Optional[str] = None,
    resource_id: Optional[str] = None,
    action: str = "READ",
    ip_address: Optional[str] = None,
    conn=None
) -> bool:
    """
    Logs an access event into access_logs_table.
    Fault-tolerant: failures are safely caught and logged without disrupting request processing.
    """
    if user:
        if user_id is None:
            user_id = user.get("id")
        if user_role is None:
            user_role = user.get("role")

    def _execute(target_conn):
        ins = insert(access_logs_table).values(
            user_id=user_id,
            user_role=(user_role or "anonymous").strip().lower()[:50] if user_role else "anonymous",
            resource_type=resource_type.strip().lower()[:100],
            resource_id=str(resource_id)[:255] if resource_id is not None else None,
            action=action.strip().upper()[:50],
            ip_address=(ip_address or "").strip()[:100] if ip_address else None,
        )
        target_conn.execute(ins)

    try:
        if conn is not None:
            _execute(conn)
        else:
            with get_db_connection() as local_conn:
                _execute(local_conn)
        return True
    except Exception as e:
        logger.warning(f"[AccessLogger] Failed to record access log for '{resource_type}': {e}")
        return False
