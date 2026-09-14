from app.agents.state import AgentState
from app.core.triage_engine import ClinicalTriageEngine
from app.core.bhashini_engine import BhashiniVoiceEngine
from app.core.dialogue_manager import classify_intent
from app.agents.nodes.responder_node import get_llm, _try_llm
from langchain_core.messages import SystemMessage, HumanMessage

triage_engine = ClinicalTriageEngine()
bhashini_engine = BhashiniVoiceEngine()

def triage_node(state: AgentState) -> AgentState:
    raw_text = state.get("raw_user_message", "")
    normalized = bhashini_engine.normalize_dialect(raw_text)

    # 1. Run deterministic bi-directional negation triage
    tier, flags = triage_engine.evaluate(normalized)
    intent = classify_intent(normalized)

    # 1.5 Auto-Detect Language (Garhwali vs Hindi vs English)
    heuristic_lang = bhashini_engine.detect_language(raw_text)
    if heuristic_lang in ("garhwali", "english"):
        detected_language = heuristic_lang
    else:
        # Check if LLM can detect regional nuances for longer queries
        llm = get_llm()
        if llm and len(raw_text.split()) >= 3:
            sys_msg = SystemMessage(
                content="Analyze the language of the user's message. Output exactly one word: 'garhwali', 'english', or 'hindi'. "
                        "If it contains words from the Garhwali dialect (e.g. 'mund', 'peed', 'peer', 'bhyo', 'chha', 'chhi', 'dainu', 'bhula', 'miku', 'twaku', 'syal'), output 'garhwali'. "
                        "If in English, output 'english'. Otherwise output 'hindi'."
            )
            hum_msg = HumanMessage(content=raw_text)
            detected = _try_llm(llm, [sys_msg, hum_msg])
            if detected:
                det_clean = detected.lower().strip()
                if "garhwali" in det_clean:
                    detected_language = "garhwali"
                elif "english" in det_clean:
                    detected_language = "english"
                else:
                    detected_language = "hindi"
            else:
                detected_language = "hindi"
        else:
            detected_language = "hindi"

    # 2. Update state tracking
    current_phase = state.get("dialogue_phase", "GREETING")
    turn_count = state.get("turn_count", 0) + 1

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

    elif current_phase in ("CONCLUDED", "EMERGENCY"):
        msg_lower = normalized.lower().strip()
        remedy_words = ["nuskha", "nushkha", "remedy", "dhanyawad", "thanks", "shukriya", "batao", "bataein", "upchar"]
        if any(w in msg_lower for w in remedy_words):
            # Retain CONCLUDED phase so it re-renders or maintains concluded remedy
            state["dialogue_phase"] = "CONCLUDED"
        elif intent == "GREETING":
            state["dialogue_phase"] = "GREETING"
            state["consultation_notes"] = ""
            state["retrieved_remedies"] = []
        else:
            # Patient describes a new symptom directly → start new consultation
            state["dialogue_phase"] = "CONSULTATION"
            state["consultation_notes"] = ""
            state["retrieved_remedies"] = []

    elif intent == "GREETING" and turn_count <= 1:
        state["dialogue_phase"] = "GREETING"

    elif current_phase in ("GREETING", "GUARDRAIL_BLOCKED", None, ""):
        state["dialogue_phase"] = "CONSULTATION"

    elif current_phase == "CONSULTATION":
        pass  # Stay in CONSULTATION until responder_node concludes

    return state