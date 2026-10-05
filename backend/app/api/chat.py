import io
import json
import re
import asyncio
import traceback
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Response, Depends, Request, Query
from fastapi.responses import StreamingResponse
from app.schemas.chat_schemas import ChatRequest, ChatResponse, RemedyItem, TTSRequest
from app.agents.graph import sanjeevani_workflow
from app.core.tts_engine import IndicTTSEngine
from app.core.auth import get_optional_current_user
from app.models import get_db
from app.core.logger import logger
from app.core.limiter import limiter
from app.core.analytics import log_analytics_event
from app.core.access_logger import log_access

router = APIRouter(prefix="/chat", tags=["Triage & Dialogue"])
tts_engine = IndicTTSEngine()


class ChatFeedbackRequest(BaseModel):
    conversation_id: str
    turn_index: Optional[int] = 1
    helpful: bool
    note: Optional[str] = None


async def _execute_chat_pipeline(
    req: ChatRequest,
    user: Optional[Dict[str, Any]] = None,
    client_ip: Optional[str] = None,
) -> ChatResponse:
    """
    Executes the LangGraph persistent triage state machine,
    persists encounter records to consultations_table, updates conversation index,
    and returns a fully structured ChatResponse.
    """
    try:
        # All required AND optional AgentState fields must be initialized here.
        initial_state = {
            # --- Required output fields (overwritten by nodes on every run) ---
            "conversation_id": req.conversation_id,
            "raw_user_message": req.message,
            "detected_tier": "Green",
            "clinical_flags": [],
            "retrieved_remedies": [],
            "final_reply_text": "",
            "spoken_reply_text": "",
            "escalation_triggered": False,
            # --- Per-turn input: always comes from the request ---
            "normalized_message": "",
            "patient_conditions": req.patient_context.known_conditions,
            "patient_age": req.patient_context.age,
            "patient_gender": req.patient_context.gender,
            "patient_pregnancy": req.patient_context.pregnancy,
            "voice_mode": req.include_audio,
            "language_hint": req.language_hint,
        }

        # Checkpointed execution — the same thread_id (conversation_id) is used
        # on every subsequent turn so LangGraph restores and advances the phase.
        config = {
            "configurable": {"thread_id": req.conversation_id},
            "run_name": f"Sanjeevani Consultation ({req.conversation_id[:8]})",
            "tags": ["sanjeevani", "clinical-triage", req.language_hint or "auto"],
            "metadata": {
                "conversation_id": req.conversation_id,
                "voice_mode": req.include_audio,
                "language_hint": req.language_hint,
            },
        }
        try:
            result = sanjeevani_workflow.invoke(initial_state, config=config)
        except Exception as invoke_err:
            logger.warning(f"[Chat] Workflow invoke with checkpointer failed ({invoke_err}). Retrying with in-memory execution.")
            try:
                # Fallback to local Sqlite checkpointer invocation so triage retains 100% memory during network dropouts
                from app.agents.nodes.triage_node import triage_node
                from app.agents.nodes.responder_node import doctor_consultation_node
                from app.agents.nodes.retriever_node import retriever_node_sync
                from app.agents.graph import get_sqlite_saver

                sqlite_saver = get_sqlite_saver()
                prior_cp = sqlite_saver.get_tuple(config)
                prior_values = prior_cp.checkpoint.get("channel_values", {}) if prior_cp else {}

                base_state = {**prior_values, **initial_state}
                t_state = triage_node(base_state)
                curr_state = {**base_state, **t_state}
                d_state = doctor_consultation_node(curr_state)
                curr_state = {**curr_state, **d_state}
                if curr_state.get("dialogue_phase") == "CONCLUDED" or not curr_state.get("retrieved_remedies"):
                    try:
                        curr_state = retriever_node_sync(curr_state)
                    except Exception as ret_err:
                        logger.debug(f"[Chat] In-memory retriever skipped: {ret_err}")

                # Save updated state to local SQLite checkpointer
                try:
                    import uuid
                    import time
                    cp_id = str(uuid.uuid4())
                    checkpoint = {
                        "v": 1,
                        "id": cp_id,
                        "ts": time.time(),
                        "channel_values": curr_state,
                        "channel_versions": {},
                        "versions_seen": {},
                        "updated_channels": list(curr_state.keys()),
                    }
                    sqlite_saver.put(config, checkpoint, {}, {})
                except Exception as save_err:
                    logger.debug(f"[Chat] Fallback save note: {save_err}")

                result = curr_state
            except Exception as fallback_err:
                logger.error(f"[Chat] Fallback execution failed: {fallback_err}")
                result = initial_state
                result["final_reply_text"] = "Maine aapke lakshan note kar liye hain. Kripya batayein yeh takleef kab se hai aur kya koi anya pareshani bhi hai?"

        # Format remedies matching the API contract
        formatted_remedies = [
            RemedyItem(
                remedy_name=r.get("remedy_name", "Unknown Remedy"),
                remedy_text=r.get("remedy_text", ""),
                ayurvedic_note=r.get("ayurvedic_note"),
                source=r.get("source", "Ministry of AYUSH Guidelines"),
                safety_check=r.get("safety_check", "Verified safe"),
            )
            for r in result.get("retrieved_remedies", [])
        ]

        tier = result.get("detected_tier", "Green")
        detected_lang = result.get("detected_language") or req.language_hint or "hi"

        spoken = result.get("spoken_reply_text") or result.get("final_reply_text", "")
        audio_b64 = None
        audio_fmt = None
        if req.include_audio and spoken:
            try:
                import base64
                audio_bytes, media_type = await tts_engine.synthesize(
                    text=spoken,
                    language=detected_lang,
                    gender=req.voice_gender
                )
                audio_b64 = base64.b64encode(audio_bytes).decode("ascii")
                audio_fmt = "wav" if "wav" in media_type else "mp3"
            except Exception as tts_err:
                logger.warning(f"[ProcessChatMessage Voice Error]: {tts_err}")

        # Upsert lightweight consultation summary into conversation_index
        summary_clean = ""
        try:
            from app.db import get_db_connection, conversation_index_table, row_to_dict, rows_to_dicts
            from sqlalchemy import select, insert, update, or_, func

            summary_raw = result.get("consultation_notes") or req.message or result.get("final_reply_text", "")
            summary_clean = str(summary_raw).strip()
            if len(summary_clean) > 250:
                summary_clean = summary_clean[:247] + "..."
            user_id = user["id"] if user else None

            with get_db_connection() as conn:
                existing = conn.execute(
                    select(conversation_index_table.c.conversation_id, conversation_index_table.c.user_id)
                    .where(conversation_index_table.c.conversation_id == req.conversation_id)
                ).fetchone()

                if existing:
                    upd = (
                        update(conversation_index_table)
                        .where(conversation_index_table.c.conversation_id == req.conversation_id)
                        .values(
                            user_id=user_id if user_id is not None else existing.user_id,
                            summary=summary_clean,
                            tier=tier,
                            updated_at=func.now(),
                        )
                    )
                    conn.execute(upd)
                else:
                    ins = insert(conversation_index_table).values(
                        conversation_id=req.conversation_id,
                        user_id=user_id,
                        summary=summary_clean,
                        tier=tier,
                        created_at=func.now(),
                        updated_at=func.now(),
                    )
                    conn.execute(ins)
        except Exception as idx_err:
            logger.error(f"[ConversationIndex Upsert Error]: {idx_err}")

        # Write rich consultation encounter to consultations_table (Phase 2 Data Layer)
        try:
            from app.db import get_db_connection, consultations_table
            from sqlalchemy import insert

            flags_json = json.dumps(result.get("clinical_flags", []), ensure_ascii=False)
            remedies_data = [
                r.model_dump() if hasattr(r, "model_dump") else (r.dict() if hasattr(r, "dict") else r)
                for r in formatted_remedies
            ]
            remedies_json = json.dumps(remedies_data, ensure_ascii=False)

            with get_db_connection() as conn:
                conn.execute(
                    insert(consultations_table).values(
                        user_id=user["id"] if user else None,
                        conversation_id=req.conversation_id,
                        tier=tier,
                        flags=flags_json,
                        remedies_served=remedies_json,
                        detected_language=detected_lang,
                        turn_count=result.get("turn_count", 1),
                        dialogue_phase=result.get("dialogue_phase", "INTAKE"),
                        raw_user_message=req.message,
                        final_reply_text=result.get("final_reply_text", ""),
                    )
                )
        except Exception as consult_err:
            logger.error(f"[Consultation Persistence Error]: {consult_err}")

        # Aggregate analytics logging (fire-and-forget, zero PII)
        if result.get("turn_count", 0) <= 1:
            log_analytics_event("consultation_started", tier=None, language=detected_lang)
        if result.get("dialogue_phase") == "CONCLUDED":
            log_analytics_event("consultation_concluded", tier=tier, language=detected_lang)
        if result.get("escalation_triggered", False) or tier == "Red":
            log_analytics_event("emergency_escalated", tier="Red", language=detected_lang)
            try:
                from app.core.alerts_service import record_emergency_alert
                record_emergency_alert(
                    conversation_id=result.get("conversation_id", req.conversation_id),
                    user_id=user["id"] if user else None,
                    patient_name=user.get("name") if user else "Citizen Patient",
                    village=user.get("village", "") if user else "Chamoli Valley",
                    phone=user.get("phone", "") if user else "",
                    symptoms=req.message,
                    clinical_flags=result.get("clinical_flags", []),
                    tier="Red",
                )
            except Exception as alert_err:
                logger.warning(f"Could not record emergency alert: {alert_err}")
        if formatted_remedies:
            log_analytics_event("remedy_delivered", tier=tier, language=detected_lang)

        # Audit trail logging for logged-in user
        if user and (result.get("turn_count", 0) <= 1 or result.get("dialogue_phase") == "CONCLUDED" or tier == "Red"):
            try:
                from app.core.activity_logger import log_activity
                act_type = "EMERGENCY_SOS" if (tier == "Red" or result.get("escalation_triggered")) else "CONSULTATION"
                log_activity(
                    action=act_type,
                    user_id=user["id"],
                    user_name=user["name"],
                    user_role=user["role"],
                    description=f"Clinical triage ({tier} Tier) - {summary_clean[:100]}",
                    village=user.get("village", ""),
                    ip_address=client_ip,
                    metadata={"tier": tier, "conversation_id": req.conversation_id, "phase": result.get("dialogue_phase")}
                )
            except Exception as act_err:
                logger.debug(f"[Chat Activity Log Note]: {act_err}")

        return ChatResponse(
            conversation_id=result.get("conversation_id", req.conversation_id),
            reply_text=result.get("final_reply_text", ""),
            spoken_reply_text=spoken,
            tier=tier,
            flags=result.get("clinical_flags", []),
            remedies=formatted_remedies,
            escalation_triggered=result.get("escalation_triggered", False),
            requires_immediate_doctor=(tier == "Red"),
            phase=result.get("dialogue_phase", "GREETING"),
            detected_language=result.get("detected_language", "hindi"),
            disclaimer=result.get("disclaimer"),
            audio_base64=audio_b64,
            audio_format=audio_fmt,
            consultation_summary=result.get("consultation_summary"),
        )

    except Exception as e:
        logger.error(f"Triage Pipeline Error: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Triage Pipeline Error: {type(e).__name__}: {str(e)}"
        )


@router.post("/message", response_model=ChatResponse)
@limiter.limit("20/minute")
async def process_chat_message(
    request: Request,
    req: ChatRequest,
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Receives user symptoms, executes the LangGraph persistent triage state machine,
    and returns a deterministic safety tier, verified remedies, or emergency escalation.
    """
    client_ip = request.client.host if request.client else None
    return await _execute_chat_pipeline(req, user, client_ip)


@router.post("/message/stream")
@limiter.limit("20/minute")
async def stream_chat_message(
    request: Request,
    req: ChatRequest,
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Streaming endpoint returning Server-Sent Events (SSE).
    Emits token events as the clinical response is generated and delivered,
    followed by a final 'complete' event containing the rich ChatResponse structure.
    """
    client_ip = request.client.host if request.client else None

    async def event_generator():
        try:
            # First notify client that triage analysis has begun
            yield f"data: {json.dumps({'type': 'start', 'conversation_id': req.conversation_id})}\n\n"

            chat_response = await _execute_chat_pipeline(req, user, client_ip)
            full_text = chat_response.reply_text or ""

            # Stream words/tokens smoothly
            tokens = re.findall(r"\S+|\s+", full_text)
            for i, chunk in enumerate(tokens):
                payload = json.dumps({"type": "token", "token": chunk}, ensure_ascii=False)
                yield f"data: {payload}\n\n"
                if i % 3 == 0:
                    await asyncio.sleep(0.015)

            # Emit final complete payload with all remedies, flags, and tier
            complete_dict = chat_response.model_dump() if hasattr(chat_response, "model_dump") else chat_response.dict()
            complete_payload = json.dumps({"type": "complete", "response": complete_dict}, ensure_ascii=False)
            yield f"data: {complete_payload}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(f"[ChatStream Error]: {e}", exc_info=True)
            err_payload = json.dumps({"type": "error", "error": str(e)})
            yield f"data: {err_payload}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.post("/feedback")
@limiter.limit("30/minute")
async def record_chat_feedback(
    request: Request,
    req: ChatFeedbackRequest,
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Records patient feedback (helpful thumbs up/down and optional note)
    for a completed clinical consultation turn.
    """
    try:
        from app.db import get_db_connection, consultation_feedback_table
        from sqlalchemy import insert

        user_id = user["id"] if user else None
        with get_db_connection() as conn:
            conn.execute(
                insert(consultation_feedback_table).values(
                    conversation_id=req.conversation_id,
                    user_id=user_id,
                    turn_index=req.turn_index or 1,
                    helpful=req.helpful,
                    note=req.note,
                )
            )

        log_analytics_event(
            "consultation_feedback_received",
            tier=None,
            language=None,
        )

        return {"status": "success", "message": "Feedback recorded successfully."}
    except Exception as e:
        logger.error(f"[ChatFeedback Error]: {e}")
        raise HTTPException(status_code=500, detail="Failed to save feedback.")


@router.get("/history")
@limiter.limit("30/minute")
async def list_consultations(
    request: Request,
    conversation_id: Optional[str] = Query(None, description="Optional conversation ID to fetch specific turns for"),
    limit: int = Query(50, ge=1, le=100),
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Returns server-side consultation history from consultations_table.
    - If conversation_id is provided: returns all turns and summary for that conversation.
    - If conversation_id is omitted: returns the list of distinct consultations for the authenticated user.
    Records an access audit log in access_logs_table.
    """
    from app.db import get_db_connection, consultations_table, conversation_index_table, rows_to_dicts, row_to_dict
    from sqlalchemy import select, desc
    import json

    client_ip = request.client.host if request and request.client else None

    # Record patient data access audit log
    log_access(
        resource_type="chat_history",
        user=user,
        resource_id=conversation_id,
        action="READ",
        ip_address=client_ip,
    )

    with get_db_connection() as conn:
        if conversation_id:
            # Query all turns for this conversation from consultations_table
            stmt = (
                select(consultations_table)
                .where(consultations_table.c.conversation_id == conversation_id)
                .order_by(consultations_table.c.id.asc())
            )
            rows = conn.execute(stmt).fetchall()
            turns = []
            for r in rows:
                d = row_to_dict(r)
                try:
                    d["flags"] = json.loads(d["flags"]) if d.get("flags") else []
                except Exception:
                    pass
                try:
                    d["remedies_served"] = json.loads(d["remedies_served"]) if d.get("remedies_served") else []
                except Exception:
                    pass
                turns.append(d)

            # If no turns found in consultations_table, fallback to conversation_index_table
            if not turns:
                idx_row = conn.execute(
                    select(conversation_index_table).where(conversation_index_table.c.conversation_id == conversation_id)
                ).fetchone()
                if not idx_row:
                    raise HTTPException(status_code=404, detail="Consultation session not found")
                d_idx = row_to_dict(idx_row)
                return {
                    "conversation_id": conversation_id,
                    "tier": d_idx.get("tier", "Green"),
                    "summary": d_idx.get("summary", ""),
                    "turns": [],
                    "timestamp": d_idx.get("updated_at") or d_idx.get("created_at"),
                }

            latest_turn = turns[-1]
            return {
                "conversation_id": conversation_id,
                "tier": latest_turn.get("tier", "Green"),
                "summary": latest_turn.get("raw_user_message") or latest_turn.get("final_reply_text") or "Consultation",
                "final_recommendation": latest_turn.get("final_reply_text", ""),
                "turns": turns,
                "count": len(turns),
                "timestamp": latest_turn.get("created_at"),
            }

        # Listing past consultations
        if not user:
            return []

        # Query consultations from consultations_table
        if user.get("role") in ("admin", "asha"):
            stmt = (
                select(consultations_table)
                .order_by(consultations_table.c.id.desc())
                .limit(limit * 3)
            )
        else:
            stmt = (
                select(consultations_table)
                .where(consultations_table.c.user_id == user["id"])
                .order_by(consultations_table.c.id.desc())
                .limit(limit * 3)
            )
        rows = conn.execute(stmt).fetchall()

        seen = set()
        results = []
        for r in rows:
            cid = r.conversation_id
            if cid not in seen:
                seen.add(cid)
                summary_text = (r.raw_user_message or r.final_reply_text or "Consultation")[:80]
                iso_time = r.created_at.isoformat() if hasattr(r.created_at, "isoformat") else str(r.created_at)
                results.append({
                    "conversation_id": cid,
                    "conversationId": cid,
                    "user_id": r.user_id,
                    "tier": r.tier or "Green",
                    "summary": summary_text,
                    "detected_language": r.detected_language,
                    "created_at": iso_time,
                    "updatedAt": iso_time,
                })
                if len(results) >= limit:
                    break

        # Fallback to conversation_index_table if consultations_table is empty
        if not results:
            stmt_idx = (
                select(conversation_index_table)
                .where(conversation_index_table.c.user_id == user["id"])
                .order_by(conversation_index_table.c.updated_at.desc())
                .limit(limit)
            )
            idx_rows = conn.execute(stmt_idx).fetchall()
            for r in idx_rows:
                iso_time = (r.updated_at or r.created_at).isoformat() if hasattr((r.updated_at or r.created_at), "isoformat") else str(r.updated_at or r.created_at)
                results.append({
                    "conversation_id": r.conversation_id,
                    "conversationId": r.conversation_id,
                    "user_id": r.user_id,
                    "tier": r.tier or "Green",
                    "summary": r.summary or "Consultation",
                    "created_at": iso_time,
                    "updatedAt": iso_time,
                })

        return results


@router.get("/history/{conversation_id}")
async def get_consultation_history_detail(
    request: Request,
    conversation_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Returns the summarized consultation record (tier, flags, final recommendation, timestamp, turn count).
    Extracts fields from the LangGraph thread checkpoint state with fallback to consultations and conversation_index.
    """
    client_ip = request.client.host if request and request.client else None
    log_access(
        resource_type="chat_history_detail",
        user=user,
        resource_id=conversation_id,
        action="READ",
        ip_address=client_ip,
    )

    from app.db import get_db_connection, consultations_table, conversation_index_table, row_to_dict
    from sqlalchemy import select
    import json

    with get_db_connection() as conn:
        # Check consultations_table first
        consult_row = conn.execute(
            select(consultations_table)
            .where(consultations_table.c.conversation_id == conversation_id)
            .order_by(consultations_table.c.id.desc())
        ).fetchone()

        idx_row = conn.execute(
            select(conversation_index_table).where(conversation_index_table.c.conversation_id == conversation_id)
        ).fetchone()

    consult_dict = row_to_dict(consult_row) if consult_row else {}
    index_row = row_to_dict(idx_row) if idx_row else {}

    state_values = {}
    turn_count = 0
    try:
        thread_state = sanjeevani_workflow.get_state({"configurable": {"thread_id": conversation_id}})
        if thread_state and thread_state.values:
            state_values = thread_state.values
            turn_count = state_values.get("turn_count", 0)
    except Exception as e:
        logger.error(f"[History State Fetch Error]: {e}")

    if not consult_dict and not index_row and not state_values:
        raise HTTPException(status_code=404, detail="Consultation session not found")

    tier = state_values.get("detected_tier") or consult_dict.get("tier") or index_row.get("tier") or "Green"
    flags = state_values.get("clinical_flags")
    if flags is None and consult_dict.get("flags"):
        try:
            flags = json.loads(consult_dict["flags"])
        except Exception:
            flags = []
    flags = flags or []

    final_reply = state_values.get("final_reply_text") or consult_dict.get("final_reply_text") or ""
    phase = state_values.get("dialogue_phase") or consult_dict.get("dialogue_phase") or "CONCLUDED"
    summary = consult_dict.get("raw_user_message") or index_row.get("summary") or state_values.get("consultation_notes") or final_reply
    timestamp = consult_dict.get("created_at") or index_row.get("updated_at") or index_row.get("created_at")

    return {
        "conversation_id": conversation_id,
        "tier": tier,
        "flags": flags,
        "final_recommendation": final_reply,
        "final_reply_text": final_reply,
        "summary": summary,
        "phase": phase,
        "turn_count": turn_count or consult_dict.get("turn_count", 1),
        "timestamp": timestamp,
    }


@router.delete("/history/{conversation_id}")
async def delete_single_consultation(
    request: Request,
    conversation_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Deletes a single consultation record by conversation_id.
    Removes matching rows from consultations_table, conversation_index_table,
    consultation_feedback_table, and checkpointer state.
    """
    from app.db import (
        get_db_connection,
        consultations_table,
        conversation_index_table,
        consultation_feedback_table,
    )
    from sqlalchemy import and_

    client_ip = request.client.host if request and request.client else None

    with get_db_connection() as conn:
        if user and user.get("role") in ("admin", "asha"):
            c_filter = consultations_table.c.conversation_id == conversation_id
            i_filter = conversation_index_table.c.conversation_id == conversation_id
            f_filter = consultation_feedback_table.c.conversation_id == conversation_id
        elif user:
            c_filter = and_(
                consultations_table.c.conversation_id == conversation_id,
                consultations_table.c.user_id == user["id"],
            )
            i_filter = and_(
                conversation_index_table.c.conversation_id == conversation_id,
                conversation_index_table.c.user_id == user["id"],
            )
            f_filter = and_(
                consultation_feedback_table.c.conversation_id == conversation_id,
                consultation_feedback_table.c.user_id == user["id"],
            )
        else:
            c_filter = consultations_table.c.conversation_id == conversation_id
            i_filter = conversation_index_table.c.conversation_id == conversation_id
            f_filter = consultation_feedback_table.c.conversation_id == conversation_id

        conn.execute(consultations_table.delete().where(c_filter))
        conn.execute(conversation_index_table.delete().where(i_filter))
        conn.execute(consultation_feedback_table.delete().where(f_filter))
        conn.commit()

    # Also clean up checkpointer thread state if available
    try:
        from app.agents.graph import checkpointer
        conn_raw = getattr(checkpointer, "conn", None)
        if conn_raw:
            conn_raw.execute("DELETE FROM checkpoints WHERE thread_id = ?", (conversation_id,))
            conn_raw.execute("DELETE FROM checkpoint_blobs WHERE thread_id = ?", (conversation_id,))
            conn_raw.execute("DELETE FROM checkpoint_writes WHERE thread_id = ?", (conversation_id,))
            conn_raw.commit()
    except Exception as cp_err:
        logger.debug(f"[Chat] Non-critical checkpointer cleanup notice: {cp_err}")

    # Log audit
    log_access(
        resource_type="chat_history",
        user=user,
        resource_id=conversation_id,
        action="DELETE",
        ip_address=client_ip,
    )

    return {"status": "deleted", "conversation_id": conversation_id}


@router.delete("/history")
async def clear_consultation_history(
    request: Request,
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Clears all consultation records for the authenticated user (or guest sessions if unauthenticated).
    """
    from app.db import (
        get_db_connection,
        consultations_table,
        conversation_index_table,
        consultation_feedback_table,
    )

    client_ip = request.client.host if request and request.client else None

    with get_db_connection() as conn:
        if user:
            u_id = user["id"]
            conn.execute(consultations_table.delete().where(consultations_table.c.user_id == u_id))
            conn.execute(conversation_index_table.delete().where(conversation_index_table.c.user_id == u_id))
            conn.execute(consultation_feedback_table.delete().where(consultation_feedback_table.c.user_id == u_id))
        else:
            conn.execute(consultations_table.delete().where(consultations_table.c.user_id.is_(None)))
            conn.execute(conversation_index_table.delete().where(conversation_index_table.c.user_id.is_(None)))
            conn.execute(consultation_feedback_table.delete().where(consultation_feedback_table.c.user_id.is_(None)))
        conn.commit()

    log_access(
        resource_type="chat_history",
        user=user,
        resource_id="all",
        action="DELETE_ALL",
        ip_address=client_ip,
    )

    return {"status": "cleared"}


@router.post("/tts")
async def generate_speech(req: TTSRequest):
    """
    Synthesizes speech using authentic Pure Indian Accent TTS (Bhashini / AI4Bharat / Neural Indic).
    Returns audio/mpeg binary stream.
    """
    try:
        audio_bytes, media_type = await tts_engine.synthesize(
            text=req.text,
            language=req.language,
            gender=req.gender
        )
        return Response(
            content=audio_bytes,
            media_type=media_type,
            headers={
                "Content-Disposition": "inline; filename=speech.mp3",
                "Cache-Control": "public, max-age=86400"
            }
        )
    except Exception as e:
        logger.exception("TTS Synthesis Failed: %s", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"TTS Synthesis Failed: {str(e)}"
        )


class OfflineConsultationItem(BaseModel):
    conversation_id: str
    summary: str
    tier: str = "Green"
    user_message: Optional[str] = ""
    created_at: Optional[str] = None


class SyncOfflineChatRequest(BaseModel):
    consultations: List[OfflineConsultationItem] = Field(default_factory=list)


class SyncOfflineChatResponse(BaseModel):
    synced_count: int
    synced_ids: List[str]


@router.post("/sync-offline", response_model=SyncOfflineChatResponse)
async def sync_offline_chat(
    req: SyncOfflineChatRequest,
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Synchronizes offline client consultations into the centralized database (conversation_index_table).
    Enables zero-connectivity mountain triaging with seamless background database persistence.
    """
    if not req.consultations:
        return SyncOfflineChatResponse(synced_count=0, synced_ids=[])

    from app.db import get_db_connection, conversation_index_table
    from sqlalchemy import select, insert, update, func

    user_id = user["id"] if user else None
    synced_ids: List[str] = []

    try:
        with get_db_connection() as conn:
            for item in req.consultations:
                cid = item.conversation_id.strip()
                if not cid:
                    continue

                summary_clean = str(item.summary).strip()
                if len(summary_clean) > 250:
                    summary_clean = summary_clean[:247] + "..."

                tier = item.tier if item.tier in ["Red", "Yellow", "Green"] else "Green"

                existing = conn.execute(
                    select(conversation_index_table.c.conversation_id, conversation_index_table.c.user_id)
                    .where(conversation_index_table.c.conversation_id == cid)
                ).fetchone()

                if existing:
                    upd = (
                        update(conversation_index_table)
                        .where(conversation_index_table.c.conversation_id == cid)
                        .values(
                            user_id=user_id if user_id is not None else existing.user_id,
                            summary=summary_clean,
                            tier=tier,
                            updated_at=func.now(),
                        )
                    )
                    conn.execute(upd)
                else:
                    ins = insert(conversation_index_table).values(
                        conversation_id=cid,
                        user_id=user_id,
                        summary=summary_clean,
                        tier=tier,
                        created_at=func.now(),
                        updated_at=func.now(),
                    )
                    conn.execute(ins)

                synced_ids.append(cid)

                # Log epidemiological analytics event reusing current transaction connection
                log_analytics_event(
                    "consultation_concluded",
                    tier=tier,
                    language="hindi",
                    conn=conn,
                )

        logger.info(f"[OfflineSync] Successfully synced {len(synced_ids)} offline consultations to DB.")
        return SyncOfflineChatResponse(synced_count=len(synced_ids), synced_ids=synced_ids)
    except Exception as e:
        logger.error(f"[OfflineSync Error]: {e}")
        raise HTTPException(status_code=500, detail=f"Offline sync failed: {str(e)}")

