"""
Centralized User Activity Audit Logger for Sanjeevani.
Records authentication, clinical interactions, offline syncing,
triage recommendations, profile modifications, and field operations.
"""
import json
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy import insert
from app.core.logger import logger
from app.db import get_db_connection, activity_logs_table


def log_activity(
    action: str,
    user_id: Optional[int] = None,
    user_name: Optional[str] = None,
    user_role: Optional[str] = None,
    description: Optional[str] = None,
    village: Optional[str] = None,
    ip_address: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    conn=None
) -> bool:
    """
    Logs an audit event into activity_logs_table.
    Fault-tolerant: failures are safely caught and logged without breaking caller logic.
    """
    metadata_json = None
    if metadata is not None:
        try:
            metadata_json = json.dumps(metadata, default=str, ensure_ascii=False)
        except Exception as json_err:
            logger.debug(f"[ActivityLogger] JSON dump warning: {json_err}")
            metadata_json = str(metadata)

    def _execute(target_conn):
        ins = insert(activity_logs_table).values(
            user_id=user_id,
            user_name=(user_name or "").strip()[:255] if user_name else None,
            user_role=(user_role or "").strip().lower()[:50] if user_role else None,
            action=action.strip().upper()[:100],
            description=description,
            village=(village or "").strip()[:255] if village else None,
            ip_address=(ip_address or "").strip()[:100] if ip_address else None,
            metadata_json=metadata_json,
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
        logger.warning(f"[ActivityLogger] Failed to log activity '{action}': {e}")
        return False
