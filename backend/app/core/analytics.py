"""
Privacy-respecting aggregate analytics module for Sanjeevani.
Records only anonymous, non-PII operational event markers:
- consultation_started
- consultation_concluded
- emergency_escalated
- remedy_delivered

Never records patient names, phone numbers, or free-text symptom descriptions.
Migrated to SQLAlchemy Core constructs.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, insert, func
from app.db import get_db_connection, analytics_events_table
from app.core.logger import logger


def log_analytics_event(
    event_type: str,
    tier: Optional[str] = None,
    language: Optional[str] = None,
    conn: Optional[Any] = None,
) -> None:
    """
    Fire-and-forget logging of an aggregate analytics event using SQLAlchemy Core insert.
    Wrapped in try/except so analytics failure NEVER affects user requests.
    Supports reusing an existing Connection to avoid SQLite database locking in batch operations.
    """
    try:
        norm_tier = str(tier).lower() if tier else None
        stmt = insert(analytics_events_table).values(
            event_type=event_type,
            tier=norm_tier,
            language=language,
        )
        if conn is not None:
            conn.execute(stmt)
        else:
            with get_db_connection() as db_conn:
                db_conn.execute(stmt)
    except Exception as e:
        logger.warning(f"[Analytics] Failed to insert analytics event '{event_type}': {e}")


def get_analytics_summary(days: int = 30) -> Dict[str, Any]:
    """
    Queries aggregate analytics event counts grouped by day, tier, and language for the past N days
    using SQLAlchemy Core select queries.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    with get_db_connection() as conn:
        # Grouped aggregate counts
        date_expr = func.date(analytics_events_table.c.created_at).label("date")
        stmt_grouped = (
            select(
                date_expr,
                analytics_events_table.c.event_type,
                func.coalesce(analytics_events_table.c.tier, "none").label("tier"),
                func.coalesce(analytics_events_table.c.language, "unknown").label("language"),
                func.count().label("count"),
            )
            .where(analytics_events_table.c.created_at >= cutoff)
            .group_by(
                date_expr,
                analytics_events_table.c.event_type,
                analytics_events_table.c.tier,
                analytics_events_table.c.language,
            )
            .order_by(date_expr.desc())
        )
        rows = conn.execute(stmt_grouped).fetchall()

        # Overall event totals
        stmt_totals = (
            select(
                analytics_events_table.c.event_type,
                func.count().label("count"),
            )
            .where(analytics_events_table.c.created_at >= cutoff)
            .group_by(analytics_events_table.c.event_type)
        )
        totals_rows = conn.execute(stmt_totals).fetchall()
        totals = {row.event_type: row.count for row in totals_rows}

        # Aggregate tier and language breakdowns
        by_tier: Dict[str, int] = {}
        by_language: Dict[str, int] = {}
        active_dates = set()

        for row in rows:
            active_dates.add(str(row.date))
            t = str(row.tier).lower()
            cnt = int(row.count)
            if t != "none":
                by_tier[t] = by_tier.get(t, 0) + cnt
            lang = str(row.language).lower()
            if lang != "unknown":
                by_language[lang] = by_language.get(lang, 0) + cnt

        # Daily timeline
        timeline: List[Dict[str, Any]] = [
            {
                "date": str(row.date),
                "event_type": row.event_type,
                "tier": row.tier,
                "language": row.language,
                "count": row.count,
            }
            for row in rows
        ]

        total_events = sum(totals.values())

        return {
            "period_days": days,
            "total_events": total_events,
            "events_breakdown": totals,
            "by_type": totals,
            "by_tier": by_tier,
            "by_language": by_language,
            "active_days": len(active_dates),
            "consultations_started": totals.get("consultation_started", 0),
            "consultations_concluded": totals.get("consultation_concluded", 0),
            "emergency_escalations": totals.get("emergency_escalated", 0),
            "remedies_delivered": totals.get("remedy_delivered", 0),
            "timeline": timeline,
        }
