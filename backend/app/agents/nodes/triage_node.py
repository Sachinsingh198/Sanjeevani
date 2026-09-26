import re
from app.agents.state import AgentState
from app.core.triage_engine import ClinicalTriageEngine
from app.core.bhashini_engine import BhashiniVoiceEngine
from app.core.dialogue_manager import classify_intent, GREETING_PATTERNS

triage_engine = ClinicalTriageEngine()
bhashini_engine = BhashiniVoiceEngine()

def triage_node(state: AgentState) -> AgentState:
    raw_text = state.get("raw_user_message", "")
    normalized = bhashini_engine.normalize_dialect(raw_text)

    # 1. Run deterministic bi-directional negation triage
    tier, flags = triage_engine.evaluate(normalized)
    intent = classify_intent(normalized)

    # 1.5 Multi-Language Auto-Detection across all Indian languages
    detected_language = bhashini_engine.detect_language(raw_text, hint=state.get("language_hint"))

    # 2. Update state tracking
    current_phase = state.get("dialogue_phase", "GREETING")
    prior_turn_count = state.get("turn_count", 0)
    turn_count = prior_turn_count + 1

    state["normalized_message"] = normalized
    state["detected_tier"] = tier.value
    state["clinical_flags"] = flags
    state["detected_language"] = detected_language
    state["escalation_triggered"] = (tier.value == "Red")
    state["turn_count"] = turn_count

    state["prev_dialogue_phase"] = current_phase

    # --- State Transition Logic ---
    if intent == "ADVERSARIAL":
        state["dialogue_phase"] = "GUARDRAIL_BLOCKED"

    elif tier.value == "Red":
        state["dialogue_phase"] = "EMERGENCY"

    elif intent == "GREETING":
        # Only allow a full reset-to-GREETING when in initial/guardrail phase or turn_count == 0.
        # If in active CONSULTATION with turn_count > 0, treat greeting as a benign acknowledgment:
        # keep CONSULTATION phase and retain all consultation notes.
        if current_phase == "CONSULTATION" and prior_turn_count > 0:
            pass
        elif current_phase in ("GREETING", "GUARDRAIL_BLOCKED", None, "") or prior_turn_count == 0:
            state["dialogue_phase"] = "GREETING"
            state["consultation_notes"] = ""
            state["retrieved_remedies"] = []
            state["turn_count"] = 0
            state["detected_tier"] = "Green"
            state["clinical_flags"] = []
        else:
            pass

    elif current_phase in ("CONCLUDED", "EMERGENCY"):
        msg_lower = normalized.lower().strip()
        from app.core.dialogue_manager import has_symptom_mention
        has_new_symptoms = has_symptom_mention(normalized)
        remedy_words = ["nuskha", "nushkha", "remedy", "dhanyawad", "thanks", "shukriya", "batao", "bataein", "upchar", "kaha", "kahan", "kab"]

        if has_new_symptoms and not any(w in msg_lower for w in remedy_words):
            # Patient describes a genuine new medical complaint → start new consultation
            state["dialogue_phase"] = "CONSULTATION"
            state["consultation_notes"] = ""
            state["retrieved_remedies"] = []
            state["turn_count"] = 1
        else:
            # Retain CONCLUDED phase so it maintains the verified remedy and does not wipe consultation notes
            state["dialogue_phase"] = "CONCLUDED"

    elif current_phase in ("GREETING", "GUARDRAIL_BLOCKED", None, ""):
        state["dialogue_phase"] = "CONSULTATION"
        state["turn_count"] = 1

    elif current_phase == "CONSULTATION":
        pass  # Stay in CONSULTATION until responder_node concludes

    return state