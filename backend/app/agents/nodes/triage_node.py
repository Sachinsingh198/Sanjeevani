import re
from app.agents.state import AgentState
from app.core.triage_engine import ClinicalTriageEngine, SeverityTier
from app.core.bhashini_engine import BhashiniVoiceEngine
from app.core.dialogue_manager import classify_intent, GREETING_PATTERNS

triage_engine = ClinicalTriageEngine()
bhashini_engine = BhashiniVoiceEngine()

def triage_node(state: AgentState) -> AgentState:
    raw_text = state.get("raw_user_message", "")
    normalized = bhashini_engine.normalize_dialect(raw_text)

    # 1. Evaluate current turn message
    tier_current, flags_current = triage_engine.evaluate(normalized)

    # 1.1 Evaluate cumulative consultation context for cross-turn emergent flags
    consultation_notes = state.get("consultation_notes", "") or ""
    cumulative_text = f"{consultation_notes}\n{normalized}".strip()
    tier_cumulative, flags_cumulative = triage_engine.evaluate(cumulative_text)

    if tier_cumulative.value == "Red" or tier_current.value == "Red":
        tier = SeverityTier.RED
        flags = flags_current + flags_cumulative
    elif tier_cumulative.value == "Yellow" or tier_current.value == "Yellow":
        tier = SeverityTier.YELLOW
        flags = flags_current + flags_cumulative
    else:
        tier = tier_current
        flags = flags_current

    # Clean and deduplicate flags while preserving order
    flags = [f for f in dict.fromkeys(flags) if not (len(flags) > 1 and "GREEN_FLAG" in f)]

    # 1.2 Demographic risk auto-escalation based on age
    age = state.get("patient_age")
    combined_lower = f"{consultation_notes.lower()} {normalized.lower()}"

    if age is not None:
        has_fever = (
            "bukhar" in combined_lower or "fever" in combined_lower or "taap" in combined_lower or
            any("fever" in f.lower() or "bukhar" in f.lower() for f in flags)
        )
        # Infant (<1 year) with fever -> auto-escalate to Red emergency
        if age < 1 and has_fever:
            tier = SeverityTier.RED
            infant_flag = "RED_FLAG: pediatric_infant_fever ('Infant under 1 year with fever requires emergency pediatric care')"
            if infant_flag not in flags:
                flags.insert(0, infant_flag)
        # Elderly (>65) or Infant (<2) with active symptoms -> escalate Green to Yellow
        elif (age > 65 or age < 2) and flags and tier.value == "Green":
            tier = SeverityTier.YELLOW
            age_flag = f"YELLOW_FLAG: high_risk_age_monitoring ('Patient age {age} with active symptoms requires clinical monitoring')"
            if age_flag not in flags:
                flags.append(age_flag)

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