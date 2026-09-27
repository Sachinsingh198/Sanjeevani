"""
ASHA Field Worker API: batch synchronization for rural offline-first health encounters.
Migrated to SQLAlchemy Core abstraction layer.
"""
import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select, insert, update, func
from app.db import get_db_connection, patient_encounters_table, row_to_dict, rows_to_dicts
from app.core.auth import require_role

router = APIRouter(prefix="/asha", tags=["ASHA Field Operations"])


class PatientEncounterItem(BaseModel):
    id: str
    name: str
    village: Optional[str] = ""
    tier: Optional[str] = "Green"
    symptom: Optional[str] = ""
    vitals: Optional[Dict[str, Any]] = None
    synced: Optional[bool] = False
    followedUp: Optional[bool] = False


class SyncBatchRequest(BaseModel):
    encounters: List[PatientEncounterItem] = Field(default_factory=list)


class SyncBatchResponse(BaseModel):
    synced_count: int
    ids: List[str]


@router.post("/sync-batch", response_model=SyncBatchResponse)
def sync_batch_encounters(
    req: SyncBatchRequest,
    user: Dict[str, Any] = Depends(require_role("asha", "admin")),
):
    """
    Accepts a list of patient encounter objects from ASHA workers,
    persists them using SQLAlchemy Core, and returns synced IDs.
    """
    if not req.encounters:
        return SyncBatchResponse(synced_count=0, ids=[])

    synced_ids = []
    with get_db_connection() as conn:
        for enc in req.encounters:
            vitals_str = json.dumps(enc.vitals) if enc.vitals is not None else "{}"
            
            existing = conn.execute(
                select(patient_encounters_table.c.id).where(patient_encounters_table.c.id == enc.id)
            ).fetchone()

            if existing:
                upd = (
                    update(patient_encounters_table)
                    .where(patient_encounters_table.c.id == enc.id)
                    .values(
                        name=enc.name.strip(),
                        village=(enc.village or "").strip(),
                        tier=enc.tier or "Green",
                        symptom=(enc.symptom or "").strip(),
                        vitals=vitals_str,
                        synced_at=func.now(),
                    )
                )
                conn.execute(upd)
            else:
                ins = insert(patient_encounters_table).values(
                    id=enc.id,
                    name=enc.name.strip(),
                    village=(enc.village or "").strip(),
                    tier=enc.tier or "Green",
                    symptom=(enc.symptom or "").strip(),
                    vitals=vitals_str,
                    synced_at=func.now(),
                )
                conn.execute(ins)

            # If encounter is Red-tier emergency, trigger real-time alert dispatch
            if (enc.tier or "").lower() == "red":
                try:
                    from app.core.alerts_service import record_emergency_alert
                    record_emergency_alert(
                        conversation_id=f"asha-{enc.id}",
                        user_id=user.get("id"),
                        patient_name=enc.name,
                        village=enc.village or user.get("village", ""),
                        phone=user.get("phone", ""),
                        symptoms=enc.symptom or "Severe vitals / acute emergency reported by ASHA",
                        clinical_flags=[f"ASHA_VITALS: {vitals_str}"],
                        tier="Red",
                        conn=conn,
                    )
                except Exception as alert_err:
                    pass

            synced_ids.append(enc.id)

    if synced_ids:
        from app.core.activity_logger import log_activity
        log_activity(
            action="ASHA_SYNC",
            user_id=user["id"],
            user_name=user["name"],
            user_role=user["role"],
            description=f"Synced {len(synced_ids)} field encounter(s) from village {user.get('village', 'Unknown')}",
            village=user.get("village", ""),
            metadata={"synced_count": len(synced_ids), "encounter_ids": synced_ids}
        )

    return SyncBatchResponse(synced_count=len(synced_ids), ids=synced_ids)


@router.post("/encounters/sync", response_model=SyncBatchResponse)
def sync_encounters_direct(
    req: SyncBatchRequest,
    user: Dict[str, Any] = Depends(require_role("asha", "admin")),
):
    """Alias for syncing batch encounters from ASHA workers."""
    return sync_batch_encounters(req, user)


@router.get("/alerts")
def get_asha_alerts(
    village: Optional[str] = None,
    only_unacknowledged: bool = True,
    user: Dict[str, Any] = Depends(require_role("asha", "admin")),
):
    """Returns active real-time Red-tier alerts for ASHA workers in their region."""
    from app.core.alerts_service import get_emergency_alerts
    v = village.strip() if (village and village.strip()) else None
    return get_emergency_alerts(village=v, only_unacknowledged=only_unacknowledged, limit=50)


@router.post("/alerts/{alert_id}/acknowledge")
def acknowledge_asha_alert(
    alert_id: int,
    user: Dict[str, Any] = Depends(require_role("asha", "admin")),
):
    """Marks an emergency alert as acknowledged by ASHA worker."""
    from app.core.alerts_service import acknowledge_emergency_alert
    success = acknowledge_emergency_alert(alert_id, acknowledged_by=f"ASHA: {user.get('name', 'Worker')}")
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found or already acknowledged.")
    return {"success": True, "alert_id": alert_id, "acknowledged": True}


@router.get("/encounters")
def list_synced_encounters(
    limit: int = 100,
    user: Dict[str, Any] = Depends(require_role("asha", "admin")),
):
    """
    Returns recent patient encounters synced from ASHA workers in the field.
    """
    with get_db_connection() as conn:
        stmt = (
            select(patient_encounters_table)
            .order_by(patient_encounters_table.c.synced_at.desc())
            .limit(limit)
        )
        rows = conn.execute(stmt).fetchall()

        result = []
        for r in rows:
            item = row_to_dict(r)
            try:
                item["vitals"] = json.loads(item["vitals"]) if item.get("vitals") else {}
            except Exception:
                pass
            result.append(item)
        return result
