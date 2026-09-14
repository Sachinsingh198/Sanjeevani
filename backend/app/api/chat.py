from fastapi import APIRouter, HTTPException
from app.schemas.chat_schemas import ChatRequest, ChatResponse, RemedyItem
from app.agents.graph import sanjeevani_workflow

router = APIRouter(prefix="/chat", tags=["Triage & Dialogue"])


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
        # Required fields (_AgentStateRequired) are always present.
        # Optional fields are included with safe defaults so triage_node / responder_node
        # can use state.get() safely without KeyError.
        initial_state = {
            # --- Required output fields (overwritten by nodes on every run) ---
            "conversation_id": req.conversation_id,
            "raw_user_message": req.message,
            "detected_tier": "Green",
            "clinical_flags": [],
            "retrieved_remedies": [],
            "final_reply_text": "",
            "escalation_triggered": False,
            # --- Per-turn input: always comes from the request ---
            "normalized_message": "",
            "patient_conditions": req.patient_context.known_conditions,
            # *** DO NOT include dialogue_phase / turn_count / symptom_profile here ***
            # Passing them here would OVERRIDE the LangGraph checkpoint on every call,
            # resetting the GREETING→INTAKE→PROBING→CONCLUDED flow back to GREETING.
            # These fields are restored automatically from the SQLite checkpoint.
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

        return ChatResponse(
            conversation_id=result.get("conversation_id", req.conversation_id),
            reply_text=result.get("final_reply_text", ""),
            tier=tier,
            flags=result.get("clinical_flags", []),
            remedies=formatted_remedies,
            escalation_triggered=result.get("escalation_triggered", False),
            requires_immediate_doctor=(tier == "Red"),
            phase=result.get("dialogue_phase", "GREETING"),
        )

    except Exception as e:
        # Preserve stack trace in server logs while returning a clean client error
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Triage Pipeline Error: {type(e).__name__}: {str(e)}"
        )