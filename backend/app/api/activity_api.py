"""
Activity Audit Logging API for Sanjeevani.
Provides role-tiered activity access:
- User (Mitra): Personal login/logout, consultation, screening, and wellness timeline.
- ASHA Worker: Field operations, village encounters, offline syncs, and emergency SOS alerts.
- Admin: Full-fidelity system-wide audit trail with multi-filter query capabilities.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from sqlalchemy import select, func, or_, and_, desc

from app.schemas.auth_schemas import ActivityLogResponse, ClientActivityRequest
from app.core.auth import get_current_user, require_role
from app.db import get_db_connection, activity_logs_table, rows_to_dicts
from app.core.activity_logger import log_activity

router = APIRouter(prefix="/activity", tags=["Activity Audit Trail"])


@router.get("/my")
async def get_my_activity(
    action: Optional[str] = Query(None, description="Filter by action type, e.g., LOGIN, CONSULTATION"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Returns the personal activity history for the currently authenticated user.
    """
    with get_db_connection() as conn:
        conditions = [activity_logs_table.c.user_id == user["id"]]
        if action:
            conditions.append(activity_logs_table.c.action == action.strip().upper())

        count_stmt = select(func.count()).select_from(activity_logs_table).where(and_(*conditions))
        total = conn.execute(count_stmt).scalar() or 0

        query_stmt = (
            select(activity_logs_table)
            .where(and_(*conditions))
            .order_by(desc(activity_logs_table.c.created_at))
            .limit(limit)
            .offset(offset)
        )
        rows = conn.execute(query_stmt).fetchall()
        activities = [ActivityLogResponse(**d) for d in rows_to_dicts(rows)]

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "activities": activities,
        }


@router.get("/asha")
async def get_asha_activity(
    village: Optional[str] = Query(None, description="Filter by village"),
    action: Optional[str] = Query(None, description="Filter by action type"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    ASHA Worker activity feed:
    Accessible to ASHA workers and Administrators.
    Returns:
    1. ASHA worker's own logs (login, sync, followups).
    2. Village patient activity (consultations, screenings, emergency SOS) in their assigned area.
    """
    if user["role"] not in ("asha", "admin"):
        raise HTTPException(status_code=403, detail="Keval ASHA karyakarti ya Admin is record ko dekh sakte hain.")

    target_village = (village or user.get("village") or "").strip()

    with get_db_connection() as conn:
        # ASHA sees their own activities OR activities in their assigned village
        base_or = [activity_logs_table.c.user_id == user["id"]]
        if target_village:
            base_or.append(func.lower(activity_logs_table.c.village) == target_village.lower())

        conditions = [or_(*base_or)]

        if action:
            conditions.append(activity_logs_table.c.action == action.strip().upper())

        count_stmt = select(func.count()).select_from(activity_logs_table).where(and_(*conditions))
        total = conn.execute(count_stmt).scalar() or 0

        query_stmt = (
            select(activity_logs_table)
            .where(and_(*conditions))
            .order_by(desc(activity_logs_table.c.created_at))
            .limit(limit)
            .offset(offset)
        )
        rows = conn.execute(query_stmt).fetchall()
        activities = [ActivityLogResponse(**d) for d in rows_to_dicts(rows)]

        return {
            "total": total,
            "village_filter": target_village or "all",
            "limit": limit,
            "offset": offset,
            "activities": activities,
        }


@router.get("/admin")
async def get_admin_audit_trail(
    role: Optional[str] = Query(None, description="Filter by user role (patient, asha, admin)"),
    action: Optional[str] = Query(None, description="Filter by action"),
    village: Optional[str] = Query(None, description="Filter by village"),
    search: Optional[str] = Query(None, description="Search by username, description, or IP"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: Dict[str, Any] = Depends(require_role("admin"))
):
    """
    Admin-only: Full system-wide audit trail with comprehensive filtering and analytics.
    """
    with get_db_connection() as conn:
        conditions = []

        if role and role.strip() and role.strip().lower() != "all":
            conditions.append(func.lower(activity_logs_table.c.user_role) == role.strip().lower())

        if action and action.strip() and action.strip().lower() != "all":
            conditions.append(activity_logs_table.c.action == action.strip().upper())

        if village and village.strip() and village.strip().lower() != "all":
            conditions.append(func.lower(activity_logs_table.c.village) == village.strip().lower())

        if search and search.strip():
            term = f"%{search.strip().lower()}%"
            conditions.append(
                or_(
                    func.lower(activity_logs_table.c.user_name).like(term),
                    func.lower(activity_logs_table.c.description).like(term),
                    func.lower(activity_logs_table.c.ip_address).like(term),
                )
            )

        where_clause = and_(*conditions) if conditions else None

        # Total count matching filters
        count_stmt = select(func.count()).select_from(activity_logs_table)
        if where_clause is not None:
            count_stmt = count_stmt.where(where_clause)
        total = conn.execute(count_stmt).scalar() or 0

        # Paginated results
        query_stmt = select(activity_logs_table)
        if where_clause is not None:
            query_stmt = query_stmt.where(where_clause)
        query_stmt = query_stmt.order_by(desc(activity_logs_table.c.created_at)).limit(limit).offset(offset)

        rows = conn.execute(query_stmt).fetchall()
        activities = [ActivityLogResponse(**d) for d in rows_to_dicts(rows)]

        # Action breakdown for dashboard metrics
        action_breakdown_stmt = (
            select(activity_logs_table.c.action, func.count().label("cnt"))
            .group_by(activity_logs_table.c.action)
            .order_by(desc("cnt"))
            .limit(8)
        )
        action_counts = {r.action: r.cnt for r in conn.execute(action_breakdown_stmt).fetchall()}

        # Active users in the last 24 hours
        cutoff_24h = datetime.now(timezone.utc) - timedelta(hours=24)
        active_today_stmt = (
            select(func.count(func.distinct(activity_logs_table.c.user_id)))
            .where(
                and_(
                    activity_logs_table.c.created_at >= cutoff_24h,
                    activity_logs_table.c.user_id.is_not(None)
                )
            )
        )
        active_users_24h = conn.execute(active_today_stmt).scalar() or 0

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "activities": activities,
            "metrics": {
                "action_counts": action_counts,
                "active_users_24h": active_users_24h,
            }
        }


@router.post("/log")
async def record_client_activity(
    request: Request,
    req: ClientActivityRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Secure client-side event tracking (Wellness sessions, eye screenings, SOS, offline syncs).
    """
    client_ip = request.client.host if request.client else None
    success = log_activity(
        action=req.action,
        user_id=user["id"],
        user_name=user["name"],
        user_role=user["role"],
        description=req.description or f"Client event: {req.action}",
        village=user.get("village", ""),
        ip_address=client_ip,
        metadata=req.metadata,
    )
    return {"success": success, "action": req.action}
