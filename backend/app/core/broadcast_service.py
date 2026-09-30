"""
District CMO Health Advisory & Outbreak Broadcast Service.
Allows Health Administrators to publish persistent regional advisories,
water purification alerts, epidemic notices, and vector warnings.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy import select, insert, update
from app.db import get_db_connection, cmo_broadcasts_table, rows_to_dicts, row_to_dict
from app.core.logger import logger

DEFAULT_ADVISORY = {
    "id": 1,
    "title": "Alaknanda Basin Seasonal Health Advisory",
    "message": "Ensure drinking water chlorination/boiling and ORS distribution in Alaknanda & Mandakini basins due to seasonal weather shifts and rain runoff.",
    "severity": "warning",  # info, warning, emergency
    "target_village": "all",
    "disease_tag": "Acute Gastroenteritis & Waterborne",
    "is_active": True,
    "author": "District CMO (Chamoli)",
    "created_at": datetime.now(timezone.utc).isoformat(),
    "updated_at": datetime.now(timezone.utc).isoformat(),
}


def get_active_broadcast(village: Optional[str] = None) -> Dict[str, Any]:
    """
    Returns the latest active broadcast matching the specified village, or 'all'.
    Fallbacks to default district health advisory if none in database.
    """
    try:
        with get_db_connection() as conn:
            stmt = (
                select(cmo_broadcasts_table)
                .where(cmo_broadcasts_table.c.is_active == True)
                .order_by(cmo_broadcasts_table.c.created_at.desc())
            )
            rows = conn.execute(stmt).fetchall()
            items = rows_to_dicts(rows)

            if village and village.strip():
                v_clean = village.strip().lower()
                for b in items:
                    target = (b.get("target_village") or "all").lower()
                    if target == "all" or target in v_clean or v_clean in target:
                        return b

            if items:
                return items[0]
    except Exception as e:
        logger.warning(f"[Broadcast] Error fetching active advisory: {e}")

    return DEFAULT_ADVISORY


def list_all_broadcasts(limit: int = 30) -> List[Dict[str, Any]]:
    """Returns historical broadcast notices for administrative audit."""
    try:
        with get_db_connection() as conn:
            stmt = select(cmo_broadcasts_table).order_by(cmo_broadcasts_table.c.created_at.desc()).limit(limit)
            rows = conn.execute(stmt).fetchall()
            results = rows_to_dicts(rows)
            if results:
                return results
    except Exception as e:
        logger.warning(f"[Broadcast] Error listing broadcasts: {e}")

    return [DEFAULT_ADVISORY]


def publish_broadcast(
    title: str,
    message: str,
    severity: str = "info",
    target_village: str = "all",
    disease_tag: Optional[str] = None,
    author: str = "District CMO",
) -> Dict[str, Any]:
    """Publishes a new persistent CMO district health advisory broadcast."""
    with get_db_connection() as conn:
        ins = (
            insert(cmo_broadcasts_table)
            .values(
                title=title.strip(),
                message=message.strip(),
                severity=severity.lower(),
                target_village=target_village.strip() or "all",
                disease_tag=disease_tag.strip() if disease_tag else None,
                is_active=True,
                author=author,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
        )
        res = conn.execute(ins)
        new_id = res.inserted_primary_key[0] if res.inserted_primary_key else None

        row = conn.execute(
            select(cmo_broadcasts_table).where(cmo_broadcasts_table.c.id == new_id)
        ).fetchone()

        logger.info(f"[Broadcast] Published new advisory #{new_id} by {author}: '{title}'")
        return row_to_dict(row) if row else DEFAULT_ADVISORY


def deactivate_broadcast(broadcast_id: int, author: str = "Admin") -> bool:
    """Marks a broadcast advisory inactive."""
    with get_db_connection() as conn:
        stmt = (
            update(cmo_broadcasts_table)
            .where(cmo_broadcasts_table.c.id == broadcast_id)
            .values(
                is_active=False,
                updated_at=datetime.now(timezone.utc),
            )
        )
        res = conn.execute(stmt)
        logger.info(f"[Broadcast] Advisory #{broadcast_id} deactivated by {author}")
        return res.rowcount > 0
