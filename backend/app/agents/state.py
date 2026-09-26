from typing import TypedDict, List, Dict, Any, Optional


class SymptomProfile(TypedDict, total=False):
    """Optional structured symptom intake extracted during consultation."""
    chief_complaint: str
    duration: str
    severity: str
    associated_symptoms: List[str]


class _AgentStateRequired(TypedDict):
    """Fields that MUST be present on every state object."""
    conversation_id: str
    raw_user_message: str
    # Clinical Safety outputs (always written by triage_node)
    detected_tier: str
    clinical_flags: List[str]
    retrieved_remedies: List[Dict[str, Any]]
    final_reply_text: str
    spoken_reply_text: str
    escalation_triggered: bool


class AgentState(_AgentStateRequired, total=False):
    """
    Full LangGraph state. Required fields are in _AgentStateRequired.
    Optional fields (total=False) are safely absent on first invocation.
    """
    # Dialect-normalized text (written by triage_node)
    normalized_message: str

    # Language detected from user message
    detected_language: str

    # Context retrieved from Garhwali language documents
    garhwali_context: List[str]

    # Patient comorbidities passed from API
    patient_conditions: List[str]

    # Clinical Dialog Management — evolve across turns
    dialogue_phase: str   # "GREETING" | "CONSULTATION" | "CONCLUDED" | "EMERGENCY" | "GUARDRAIL_BLOCKED"
    prev_dialogue_phase: str  # phase snapshot BEFORE this turn's transition (used by graph router)
    turn_count: int
    symptom_profile: SymptomProfile

    # Accumulated patient information across turns — passed to LLM as context each turn.
    # The responder_node appends to this as new symptoms/answers are shared.
    consultation_notes: str

    # Voice session mode flag (e.g. Sanjeevani Live active)
    voice_mode: bool

    # Structured prescription / home remedy summary card
    consultation_summary: Optional[Dict[str, Any]]