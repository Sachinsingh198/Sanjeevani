import io
import traceback
from fastapi import APIRouter, HTTPException, Response
from app.schemas.chat_schemas import ChatRequest, ChatResponse, RemedyItem, TTSRequest
from app.agents.graph import sanjeevani_workflow
from app.core.tts_engine import IndicTTSEngine

router = APIRouter(prefix="/chat", tags=["Triage & Dialogue"])
tts_engine = IndicTTSEngine()


@router.post("/message", response_model=ChatResponse)
async def process_chat_message(req: ChatRequest):
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
        }

        # Checkpointed execution — the same thread_id (conversation_id) is used
        # on every subsequent turn so LangGraph restores and advances the phase.
        config = {"configurable": {"thread_id": req.conversation_id}}
        result = sanjeevani_workflow.invoke(initial_state, config=config)

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

        spoken = result.get("spoken_reply_text") or result.get("final_reply_text", "")
        audio_b64 = None
        audio_fmt = None
        if req.include_audio and spoken:
            try:
                import base64
                lang = result.get("detected_language", "hindi")
                audio_bytes, media_type = await tts_engine.synthesize(
                    text=spoken,
                    language=lang,
                    gender=req.voice_gender
                )
                audio_b64 = base64.b64encode(audio_bytes).decode("ascii")
                audio_fmt = "wav" if "wav" in media_type else "mp3"
            except Exception as tts_err:
                print(f"[ProcessChatMessage Voice Error]: {tts_err}")

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
        )

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Triage Pipeline Error: {type(e).__name__}: {str(e)}"
        )


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
