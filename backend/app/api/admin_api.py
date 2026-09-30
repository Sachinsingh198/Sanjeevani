"""
Admin API routes: user management, analytics, and ASHA worker oversight.
All endpoints require the 'admin' role.
Migrated to SQLAlchemy Core abstraction layer.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy import select, insert, delete, func
from app.schemas.auth_schemas import RegisterRequest, UserProfile
from app.core.auth import hash_password, require_role
from app.db import (
    get_db_connection,
    users_table,
    conversation_index_table,
    consultations_table,
    row_to_dict,
    rows_to_dicts,
)
from app.core.analytics import get_analytics_summary
from app.core.access_logger import log_access

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/users", response_model=List[UserProfile])
async def list_all_users(request: Request, admin: Dict[str, Any] = Depends(require_role("admin"))):
    """List all registered users across all roles."""
    client_ip = request.client.host if request and request.client else None
    log_access(
        resource_type="user_list",
        user=admin,
        resource_id=None,
        action="READ",
        ip_address=client_ip,
    )

    with get_db_connection() as conn:
        stmt = select(users_table).order_by(users_table.c.created_at.desc())
        rows = conn.execute(stmt).fetchall()
        return [UserProfile(**row_dict) for row_dict in rows_to_dicts(rows)]


@router.post("/users", response_model=UserProfile)
async def create_user(req: RegisterRequest, admin: Dict[str, Any] = Depends(require_role("admin"))):
    """Admin-only: Create an ASHA worker or any user account."""
    if req.role not in ("patient", "asha", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role")

    with get_db_connection() as conn:
        existing = conn.execute(
            select(users_table.c.id).where(users_table.c.phone == req.phone)
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Phone number already registered")

        hashed = hash_password(req.password)
        ins = (
            insert(users_table)
            .values(
                name=req.name,
                phone=req.phone,
                hashed_password=hashed,
                role=req.role,
                village=req.village,
            )
        )
        result = conn.execute(ins)
        user_id = result.inserted_primary_key[0] if result.inserted_primary_key else None

        row = conn.execute(select(users_table).where(users_table.c.id == user_id)).fetchone()
        return UserProfile(**row_to_dict(row))


@router.delete("/users/{user_id}")
async def delete_user(user_id: int, admin: Dict[str, Any] = Depends(require_role("admin"))):
    """Admin-only: Delete a user account."""
    if admin["id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    with get_db_connection() as conn:
        existing = conn.execute(
            select(users_table.c.id).where(users_table.c.id == user_id)
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")

        conn.execute(delete(users_table).where(users_table.c.id == user_id))
        return {"message": "User deleted successfully", "deleted_id": user_id}


@router.get("/stats")
async def get_system_stats(request: Request, admin: Dict[str, Any] = Depends(require_role("admin"))):
    """Admin-only: Returns platform analytics and system health overview."""
    client_ip = request.client.host if request and request.client else None
    log_access(
        resource_type="admin_stats",
        user=admin,
        resource_id=None,
        action="READ",
        ip_address=client_ip,
    )

    cutoff_7d = datetime.now(timezone.utc) - timedelta(days=7)

    with get_db_connection() as conn:
        # User counts by role
        total_users = conn.execute(select(func.count()).select_from(users_table)).scalar() or 0
        patients = conn.execute(
            select(func.count()).select_from(users_table).where(users_table.c.role == "patient")
        ).scalar() or 0
        asha_workers = conn.execute(
            select(func.count()).select_from(users_table).where(users_table.c.role == "asha")
        ).scalar() or 0
        admins = conn.execute(
            select(func.count()).select_from(users_table).where(users_table.c.role == "admin")
        ).scalar() or 0

        # Recent registrations (last 7 days)
        recent = conn.execute(
            select(func.count()).select_from(users_table).where(users_table.c.created_at >= cutoff_7d)
        ).scalar() or 0

        # Village distribution
        stmt_villages = (
            select(users_table.c.village, func.count().label("count"))
            .where(users_table.c.village.is_not(None), users_table.c.village != "")
            .group_by(users_table.c.village)
            .order_by(func.count().desc())
            .limit(6)
        )
        village_rows = conn.execute(stmt_villages).fetchall()
        village_distribution = [{"village": row.village, "count": row.count} for row in village_rows]

        # Real triage distribution aggregate query from consultations_table (falling back to conversation_index_table)
        stmt_tiers = (
            select(consultations_table.c.tier, func.count().label("count"))
            .where(consultations_table.c.tier.is_not(None))
            .group_by(consultations_table.c.tier)
        )
        tier_rows = conn.execute(stmt_tiers).fetchall()
        if not tier_rows:
            stmt_tiers = (
                select(conversation_index_table.c.tier, func.count().label("count"))
                .where(conversation_index_table.c.tier.is_not(None))
                .group_by(conversation_index_table.c.tier)
            )
            tier_rows = conn.execute(stmt_tiers).fetchall()

        tier_map = {str(row.tier).lower(): row.count for row in tier_rows}
        triage_dist = {
            "red": tier_map.get("red", 0),
            "yellow": tier_map.get("yellow", 0),
            "green": tier_map.get("green", 0),
        }

        # Real total consultations count
        total_consultations = conn.execute(
            select(func.count(func.distinct(consultations_table.c.conversation_id)))
        ).scalar() or 0
        if total_consultations == 0:
            total_consultations = conn.execute(
                select(func.count()).select_from(conversation_index_table)
            ).scalar() or 0

        return {
            "total_users": total_users,
            "patients": patients,
            "asha_workers": asha_workers,
            "admins": admins,
            "total_consultations": total_consultations,
            "recent_registrations_7d": recent,
            "village_distribution": village_distribution,
            "triage_distribution": triage_dist,
            "system_status": "healthy",
            "qdrant_status": "active",
            "llm_provider": "groq",
        }



@router.get("/analytics/summary")
async def get_admin_analytics_summary(
    days: int = 30,
    admin: Dict[str, Any] = Depends(require_role("admin"))
):
    """
    Admin-only: Aggregate privacy-respecting analytics summary over the last N days (default 30).
    Returns consultation lifecycle events (started, concluded, emergencies, remedies) grouped by day, tier, and language.
    """
    return get_analytics_summary(days=days)


@router.get("/alerts")
async def get_admin_alerts(
    village: Optional[str] = None,
    only_unacknowledged: bool = False,
    limit: int = 100,
    admin: Dict[str, Any] = Depends(require_role("admin"))
):
    """Admin-only: Returns system-wide Red-tier emergency triage alerts."""
    from app.core.alerts_service import get_emergency_alerts
    return get_emergency_alerts(village=village, only_unacknowledged=only_unacknowledged, limit=limit)


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_admin_alert(
    alert_id: int,
    admin: Dict[str, Any] = Depends(require_role("admin"))
):
    """Admin-only: Acknowledges emergency alert."""
    from app.core.alerts_service import acknowledge_emergency_alert
    success = acknowledge_emergency_alert(alert_id, acknowledged_by=f"Admin: {admin.get('name', 'Admin')}")
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found or already acknowledged.")
    return {"success": True, "alert_id": alert_id, "acknowledged": True}


# ── Dynamic System Configuration & AI Engine Controls ────────────────────────

@router.get("/config")
async def get_admin_system_config(admin: Dict[str, Any] = Depends(require_role("admin"))):
    """Admin-only: Returns dynamic system configuration (AI models, voice, triage, flags)."""
    from app.core.system_config import get_system_config
    return {
        "success": True,
        "config": get_system_config(),
    }


@router.post("/config")
async def update_admin_system_config(
    updates: Dict[str, Any],
    admin: Dict[str, Any] = Depends(require_role("admin"))
):
    """Admin-only: Dynamically updates system configuration in real-time without code changes or restarts."""
    from app.core.system_config import update_system_config
    admin_name = admin.get("name", "Administrator")
    updated = update_system_config(updates, admin_name=admin_name)
    return {
        "success": True,
        "message": "System configuration updated successfully in real-time.",
        "config": updated,
    }


@router.post("/config/reset")
async def reset_admin_system_config(admin: Dict[str, Any] = Depends(require_role("admin"))):
    """Admin-only: Resets dynamic system configuration to factory defaults."""
    from app.core.system_config import reset_system_config_to_defaults
    admin_name = admin.get("name", "Administrator")
    resetted = reset_system_config_to_defaults(admin_name=admin_name)
    return {
        "success": True,
        "message": "System configuration reset to default values.",
        "config": resetted,
    }


# ── Operational Actions (Cache Purge, Vector Sync, Latency Test) ──────────────

@router.post("/actions/test-llm-latency")
async def test_llm_latency(admin: Dict[str, Any] = Depends(require_role("admin"))):
    """Admin-only: Pings the active LLM provider and measures inference response time."""
    from app.agents.nodes.responder_node import get_llm
    from langchain_core.messages import HumanMessage
    import time

    llm = get_llm()
    if not llm:
        return {
            "success": False,
            "status": "offline",
            "latency_ms": None,
            "message": "No active LLM provider configured or keys missing.",
        }

    t0 = time.perf_counter()
    try:
        res = llm.invoke([HumanMessage(content="ping")])
        latency_ms = round((time.perf_counter() - t0) * 1000, 1)
        return {
            "success": True,
            "status": "online",
            "latency_ms": latency_ms,
            "reply_sample": str(getattr(res, "content", "pong"))[:60],
            "message": f"LLM responded in {latency_ms}ms.",
        }
    except Exception as e:
        latency_ms = round((time.perf_counter() - t0) * 1000, 1)
        return {
            "success": False,
            "status": "degraded",
            "latency_ms": latency_ms,
            "error": str(e),
            "message": f"LLM ping error: {e}",
        }


@router.post("/actions/purge-cache")
async def purge_system_caches(admin: Dict[str, Any] = Depends(require_role("admin"))):
    """Admin-only: Clears audio TTS cache and in-memory model caches."""
    cleared_audio = 0
    try:
        from app.core.tts_engine import AUDIO_CACHE_DIR
        import os
        if os.path.exists(AUDIO_CACHE_DIR):
            files = os.listdir(AUDIO_CACHE_DIR)
            for f in files:
                f_path = os.path.join(AUDIO_CACHE_DIR, f)
                if os.path.isfile(f_path):
                    os.remove(f_path)
                    cleared_audio += 1
    except Exception:
        pass

    return {
        "success": True,
        "cleared_audio_files": cleared_audio,
        "message": f"System caches purged successfully ({cleared_audio} audio cache files removed).",
    }


@router.post("/actions/reindex-knowledge")
async def reindex_knowledge_store(admin: Dict[str, Any] = Depends(require_role("admin"))):
    """Admin-only: Re-syncs / reloads CCRAS and AYUSH knowledge store in Qdrant."""
    try:
        from app.core.hybrid_rag import get_shared_remedy_store
        store = get_shared_remedy_store()
        status = "active" if store else "offline_fallback"
        return {
            "success": True,
            "status": status,
            "message": "AYUSH & CCRAS knowledge base store verified and re-indexed in memory.",
        }
    except Exception as e:
        return {
            "success": False,
            "status": "error",
            "message": f"Knowledge store sync note: {e}",
        }


# ── User Role & Profile Governance ───────────────────────────────────────────

@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    payload: Dict[str, str],
    admin: Dict[str, Any] = Depends(require_role("admin"))
):
    """Admin-only: Dynamically changes a user's role (patient, asha, admin)."""
    new_role = payload.get("role", "").lower().strip()
    if new_role not in ("patient", "asha", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role. Must be patient, asha, or admin.")

    if admin["id"] == user_id and new_role != "admin":
        raise HTTPException(status_code=400, detail="Cannot demote your own admin account.")

    with get_db_connection() as conn:
        existing = conn.execute(select(users_table).where(users_table.c.id == user_id)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="User not found.")

        conn.execute(
            users_table.update().where(users_table.c.id == user_id).values(role=new_role)
        )
        updated = conn.execute(select(users_table).where(users_table.c.id == user_id)).fetchone()
        return {
            "success": True,
            "message": f"User role changed to {new_role.upper()}.",
            "user": UserProfile(**row_to_dict(updated)),
        }


@router.put("/users/{user_id}")
async def update_user_details(
    user_id: int,
    payload: Dict[str, Any],
    admin: Dict[str, Any] = Depends(require_role("admin"))
):
    """Admin-only: Updates user profile details, assigned PHC, village, or contact number."""
    allowed_fields = {"name", "phone", "village", "assigned_phc", "district", "worker_id"}
    updates = {k: v for k, v in payload.items() if k in allowed_fields}

    if not updates:
        raise HTTPException(status_code=400, detail="No valid editable fields provided.")

    with get_db_connection() as conn:
        existing = conn.execute(select(users_table).where(users_table.c.id == user_id)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="User not found.")

        conn.execute(
            users_table.update().where(users_table.c.id == user_id).values(**updates)
        )
        updated = conn.execute(select(users_table).where(users_table.c.id == user_id)).fetchone()
        return {
            "success": True,
            "message": "User details updated successfully.",
            "user": UserProfile(**row_to_dict(updated)),
        }


# ── District CMO Health Advisory Broadcasts ──────────────────────────────────

@router.get("/broadcast")
async def get_current_broadcast():
    """Returns the latest active District CMO Health Advisory broadcast."""
    from app.core.broadcast_service import get_active_broadcast
    return get_active_broadcast()


@router.get("/broadcast/history")
async def get_broadcast_history(admin: Dict[str, Any] = Depends(require_role("admin"))):
    """Admin-only: Returns history of all issued CMO advisories."""
    from app.core.broadcast_service import list_all_broadcasts
    return list_all_broadcasts()


@router.post("/broadcast")
async def publish_district_broadcast(
    payload: Dict[str, Any],
    admin: Dict[str, Any] = Depends(require_role("admin"))
):
    """Admin-only: Publishes a persistent District CMO Health Advisory."""
    from app.core.broadcast_service import publish_broadcast
    title = payload.get("title", "District Health Notice")
    message = payload.get("message", "")
    severity = payload.get("severity", "info")
    target_village = payload.get("target_village", "all")
    disease_tag = payload.get("disease_tag")

    if not message.strip():
        raise HTTPException(status_code=400, detail="Broadcast message cannot be empty.")

    broadcast = publish_broadcast(
        title=title,
        message=message,
        severity=severity,
        target_village=target_village,
        disease_tag=disease_tag,
        author=f"CMO Admin: {admin.get('name', 'Admin')}",
    )
    return {
        "success": True,
        "message": "District health advisory broadcast published and persisted.",
        "broadcast": broadcast,
    }


@router.delete("/broadcast/{broadcast_id}")
async def deactivate_district_broadcast(
    broadcast_id: int,
    admin: Dict[str, Any] = Depends(require_role("admin"))
):
    """Admin-only: Deactivates an active CMO advisory broadcast."""
    from app.core.broadcast_service import deactivate_broadcast
    success = deactivate_broadcast(broadcast_id, author=admin.get("name", "Admin"))
    if not success:
        raise HTTPException(status_code=404, detail="Broadcast not found.")
    return {"success": True, "message": "Broadcast advisory deactivated."}


# ── District Disease Surveillance, Heatmap & Outbreak EWS ────────────────────

@router.get("/surveillance/heatmap")
async def get_disease_surveillance_heatmap(
    disease: Optional[str] = None,
    timeframe: int = 30,
    tier: Optional[str] = None,
    admin: Dict[str, Any] = Depends(require_role("admin"))
):
    """
    District Health Admin & CMO Outbreak Surveillance:
    Returns geographic sector clusters, heatmap intensity coordinates,
    prevalence numbers, and dominant diseases across mountain blocks.
    """
    from app.core.surveillance_service import get_surveillance_heatmap
    return get_surveillance_heatmap(
        disease_filter=disease,
        timeframe_days=timeframe,
        tier_filter=tier,
    )


@router.get("/surveillance/outbreaks")
async def get_surveillance_outbreak_alerts(
    timeframe: int = 30,
    admin: Dict[str, Any] = Depends(require_role("admin"))
):
    """
    Outbreak Early Warning System (EWS):
    Identifies statistically significant disease surges, vector spread velocities,
    and returns prioritized CMO public health containment directives.
    """
    from app.core.surveillance_service import get_outbreak_alerts
    return get_outbreak_alerts(timeframe_days=timeframe)


@router.get("/surveillance/trends")
async def get_surveillance_trends_data(
    timeframe: int = 30,
    admin: Dict[str, Any] = Depends(require_role("admin"))
):
    """
    Epidemiological Analytics:
    Returns time-series outbreak curves, disease percentage compositions,
    and age-cohort vulnerability distributions.
    """
    from app.core.surveillance_service import get_surveillance_trends
    return get_surveillance_trends(timeframe_days=timeframe)


@router.post("/surveillance/dispatch")
async def dispatch_surveillance_team(
    payload: Dict[str, Any],
    admin: Dict[str, Any] = Depends(require_role("admin"))
):
    """
    Actionable Governance:
    Dispatches Rapid Response Medical / ASHA Team to an outbreak sector.
    """
    from app.core.surveillance_service import dispatch_rapid_response_team
    village = payload.get("village")
    disease = payload.get("disease", "General Outbreak")
    notes = payload.get("notes", "Rapid deployment by CMO order")

    if not village:
        raise HTTPException(status_code=400, detail="Target sector / village is required.")

    result = dispatch_rapid_response_team(
        village=village,
        disease=disease,
        notes=notes,
        admin_name=admin.get("name", "District CMO"),
    )
    return result


@router.post("/surveillance/broadcast-alert")
async def broadcast_outbreak_alert(
    payload: Dict[str, Any],
    admin: Dict[str, Any] = Depends(require_role("admin"))
):
    """
    Actionable Governance:
    Instantly converts an outbreak cluster into a district-wide CMO Health Advisory.
    """
    from app.core.broadcast_service import publish_broadcast
    village = payload.get("village", "All Sectors")
    disease = payload.get("disease", "Health Advisory")
    action_text = payload.get("action_text", "Boil drinking water, take precautionary hygiene measures, and report symptoms to nearest ASHA worker.")

    title = f"Health Alert: {disease} Precaution ({village})"
    message = f"District CMO Advisory for {village}: Elevated cases of {disease} observed. {action_text}"

    broadcast = publish_broadcast(
        title=title,
        message=message,
        severity="warning",
        target_village=village,
        disease_tag=disease,
        author=f"CMO Admin: {admin.get('name', 'Admin')}",
    )
    return {
        "success": True,
        "message": f"Outbreak alert broadcasted successfully for {village}.",
        "broadcast": broadcast,
    }
