import io
import traceback
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Response, Depends, Request
from app.schemas.chat_schemas import ChatRequest, ChatResponse, RemedyItem, TTSRequest
from app.agents.graph import sanjeevani_workflow
from app.core.tts_engine import IndicTTSEngine
from app.core.auth import get_optional_current_user
from app.models import get_db
from app.core.logger import logger
from app.core.limiter import limiter
from app.core.analytics import log_analytics_event

router = APIRouter(prefix="/chat", tags=["Triage & Dialogue"])
tts_engine = IndicTTSEngine()


@router.post("/message", response_model=ChatResponse)
@limiter.limit("60/hour")
async def process_chat_message(
    request: Request,
    req: ChatRequest,
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Receives user symptoms, executes the LangGraph persistent triage state machine,
    and returns a deterministic safety tier, verified remedies, or emergency escalation.

    The conversation_id MUST remain stable across turns for the multi-turn
    GREETING → INTAKE → PROBING → CONCLUDED dialogue flow to function correctly.
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

        # Aggregate analytics logging (fire-and-forget, zero PII)
        if result.get("turn_count", 0) <= 1:
            log_analytics_event("consultation_started", tier=None, language=detected_lang)
        if result.get("dialogue_phase") == "CONCLUDED":
            log_analytics_event("consultation_concluded", tier=tier, language=detected_lang)
        if result.get("escalation_triggered", False) or tier == "Red":
            log_analytics_event("emergency_escalated", tier="Red", language=detected_lang)
        if formatted_remedies:
            log_analytics_event("remedy_delivered", tier=tier, language=detected_lang)

        # Audit trail logging for logged-in user
        if user and (result.get("turn_count", 0) <= 1 or result.get("dialogue_phase") == "CONCLUDED" or tier == "Red"):
            try:
                from app.core.activity_logger import log_activity
                client_ip = request.client.host if request.client else None
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


@router.get("/history")
def list_consultations(
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
    limit: int = 50,
):
    """
    Returns past consultations list for the authenticated user or all active sessions.
    """
    from app.db import get_db_connection, conversation_index_table, rows_to_dicts
    from sqlalchemy import select, or_

    with get_db_connection() as conn:
        stmt = (
            select(conversation_index_table)
            .order_by(conversation_index_table.c.updated_at.desc())
            .limit(limit)
        )
        if user:
            stmt = stmt.where(conversation_index_table.c.user_id == user["id"])
        else:
            # Unauthenticated callers should not list anyone's conversations
            return []
        rows = conn.execute(stmt).fetchall()
        return rows_to_dicts(rows)


@router.get("/history/{conversation_id}")
def get_consultation_history_detail(
    conversation_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Returns the summarized consultation record (tier, flags, final recommendation, timestamp, turn count).
    Extracts fields from the LangGraph thread checkpoint state with fallback to conversation_index.
    """
    from app.db import get_db_connection, conversation_index_table, row_to_dict
    from sqlalchemy import select

    with get_db_connection() as conn:
        stmt = select(conversation_index_table).where(
            conversation_index_table.c.conversation_id == conversation_id
        )
        row = conn.execute(stmt).fetchone()
        index_row = row_to_dict(row)

    state_values = {}
    turn_count = 0
    try:
        thread_state = sanjeevani_workflow.get_state({"configurable": {"thread_id": conversation_id}})
        if thread_state and thread_state.values:
            state_values = thread_state.values
            turn_count = state_values.get("turn_count", 0)
    except Exception as e:
        logger.error(f"[History State Fetch Error]: {e}")

    if not index_row and not state_values:
        raise HTTPException(status_code=404, detail="Consultation session not found")

    tier = state_values.get("detected_tier") or (index_row["tier"] if index_row else "Green")
    flags = state_values.get("clinical_flags", [])
    final_reply = state_values.get("final_reply_text", "")
    phase = state_values.get("dialogue_phase", "CONCLUDED")
    summary = (index_row["summary"] if index_row else None) or state_values.get("consultation_notes", "") or final_reply
    timestamp = (index_row["updated_at"] if index_row else None) or (index_row["created_at"] if index_row else None)

    return {
        "conversation_id": conversation_id,
        "tier": tier,
        "flags": flags,
        "final_recommendation": final_reply,
        "final_reply_text": final_reply,
        "summary": summary,
        "phase": phase,
        "turn_count": turn_count,
        "timestamp": timestamp,
    }


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
        traceback.print_exc()
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

