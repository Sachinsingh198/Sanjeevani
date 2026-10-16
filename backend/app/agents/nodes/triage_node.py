import re
from typing import List, Optional
from app.agents.state import AgentState
from app.core.triage_engine import ClinicalTriageEngine, SeverityTier
from app.core.bhashini_engine import BhashiniVoiceEngine
from app.core.dialogue_manager import classify_intent

triage_engine = ClinicalTriageEngine()
bhashini_engine = BhashiniVoiceEngine()


def extract_patient_conditions_from_text(text: str, last_bot_question: str = "") -> List[str]:
    """
    Extracts canonical comorbidities mentioned by the patient while respecting negation cues.
    Returns canonical strings: 'hypertension', 'hyperacidity/pepticulcer', 'pregnancy', 'diabetes'.
    """
    t = text.lower()
    last_q = (last_bot_question or "").lower()
    detected = []

    # 1. Hypertension (BP)
    bp_pos = bool(
        re.search(r"\b(?:high\s+bp|high\s+blood\s+pressure|hypertension|raktchaap|raktchap|बीपी|उच्च\s+रक्तचाप|हाई\s+बीपी)\b", t)
        or (re.search(r"\bbp\b", t) and not re.search(r"\bbp\s+(?:nahi|nahin|free|mat|na|ना|नहीं)\b", t))
    )
    bp_neg = bool(
        re.search(r"\b(?:bp|blood\s+pressure|hypertension|बीपी)\s+(?:nahi|nahin|ke\s+bina|free|mat|na|नहीं|ना)\b|\b(?:no|without)\s+bp\b", t)
    )
    if ("bp" in last_q or "blood pressure" in last_q or "बीपी" in last_q) and re.search(r"\b(?:haan|ji\s+haan|yes|yep|ha|हाँ|हां|जी)\b", t) and not re.search(r"\b(?:nahi|nahin|no|नहीं)\b", t):
        bp_pos = True
    if bp_pos and not bp_neg:
        detected.append("hypertension")

    # 2. Hyperacidity / Peptic Ulcer
    acid_pos = bool(
        re.search(r"\b(?:acidity|acid\s+reflux|gerd|peptic\s+ulcer|ulcer|gastric\s+ulcer|amlapitta|pet\s+me\s+jalan|khatti\s+dakar|एसिडिटी|अल्सर)\b", t)
    )
    acid_neg = bool(
        re.search(r"\b(?:acidity|ulcer|gerd|amlapitta|एसिडिटी|अल्सर)\s+(?:nahi|nahin|na|mat|नहीं|ना)\b|\b(?:no|without)\s+(?:acidity|ulcer)\b", t)
    )
    if ("acidity" in last_q or "ulcer" in last_q or "एसिडिटी" in last_q) and re.search(r"\b(?:haan|ji\s+haan|yes|yep|ha|हाँ|हां|जी)\b", t) and not re.search(r"\b(?:nahi|nahin|no|नहीं)\b", t):
        acid_pos = True
    if acid_pos and not acid_neg:
        detected.append("hyperacidity/pepticulcer")

    # 3. Pregnancy
    preg_pos = bool(
        re.search(r"\b(?:pregnant|pregnancy|garbhavastha|garbhvati|garbh|गर्भावस्था|गर्भवती)\b", t)
        or re.search(r"\bpet\s+se\s+hoon\b", t)
    )
    preg_neg = bool(
        re.search(r"\b(?:pregnant|pregnancy|garbh|गर्भवती)\s+(?:nahi|nahin|na|नहीं|ना)\b|\b(?:not\s+pregnant|no\s+pregnancy)\b", t)
    )
    if ("pregnant" in last_q or "pregnancy" in last_q or "गर्भवती" in last_q) and re.search(r"\b(?:haan|ji\s+haan|yes|yep|ha|हाँ|हां|जी)\b", t) and not re.search(r"\b(?:nahi|nahin|no|नहीं)\b", t):
        preg_pos = True
    if preg_pos and not preg_neg:
        detected.append("pregnancy")

    # 4. Diabetes / Sugar
    diab_pos = bool(
        re.search(r"\b(?:diabetes|sugar|madhumeh|blood\s+sugar|शुगर|मधुमेह)\b", t)
    )
    diab_neg = bool(
        re.search(r"\b(?:diabetes|sugar|madhumeh|शुगर|मधुमेह)\s+(?:nahi|nahin|na|mat|नहीं|ना)\b|\b(?:no|without)\s+(?:diabetes|sugar)\b", t)
    )
    if ("diabetes" in last_q or "sugar" in last_q or "शुगर" in last_q) and re.search(r"\b(?:haan|ji\s+haan|yes|yep|ha|हाँ|हां|जी)\b", t) and not re.search(r"\b(?:nahi|nahin|no|नहीं)\b", t):
        diab_pos = True
    if diab_pos and not diab_neg:
        detected.append("diabetes")

    # 5. Ear Discharge (Pus/Fluid from ear)
    ear_pos = bool(
        re.search(r"\b(?:ear\s+discharge|pus\s+from\s+ear|ear\s+pus|kaan\s+behna|kaan\s+se\s+mavad|kaan\s+se\s+मवाद|kan\s+behna|kan\s+se\s+mavad|kaan\s+se\s+mad|कान\s+बहना|कान\s+से\s+मवाद|मवाद)\b", t)
        or ("kaan" in t and ("beh" in t or "mavad" in t or "pus" in t or "paani" in t))
        or ("कान" in t and ("बह" in t or "मवाद" in t or "पानी" in t))
    )
    ear_neg = bool(
        re.search(r"\b(?:ear\s+discharge|pus|kaan\s+behna|kaan\s+se\s+mavad|कान\s+बहना|मवाद)\s+(?:nahi|nahin|na|नहीं|ना)\b|\b(?:no|without)\s+(?:ear\s+discharge|pus)\b", t)
    )
    if ("ear discharge" in last_q or "kaan behna" in last_q or "मवाद" in last_q or "बह" in last_q) and re.search(r"\b(?:haan|ji\s+haan|yes|yep|ha|हाँ|हां|जी)\b", t) and not re.search(r"\b(?:nahi|nahin|no|नहीं)\b", t):
        ear_pos = True
    if ear_pos and not ear_neg:
        detected.append("EarDischarge")

    return detected


def extract_duration_days(text: str) -> Optional[int]:
    """Extracts numeric symptom duration in days from text."""
    t = text.lower()
    m = re.search(r"\b(\d+)\s*(?:din|days?|ghante|mahine|hafte|दिन|घंटे|महीने|हफ्ते)\b", t)
    if m:
        num = int(m.group(1))
        if "hafte" in m.group(0) or "हफ्ते" in m.group(0):
            return num * 7
        return num

    word_map = {
        "ek": 1, "do": 2, "teen": 3, "chaar": 4, "char": 4, "paanch": 5, "panch": 5,
        "chhe": 6, "saat": 7, "aath": 8, "nau": 9, "das": 10,
        "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पांच": 5, "पाँच": 5,
        "छह": 6, "सात": 7, "आठ": 8, "नौ": 9, "दस": 10,
        "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
        "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
        "hafte": 7, "hafta": 7, "week": 7, "weeks": 7, "हफ्ता": 7, "हफ्ते": 7
    }
    for word, days in word_map.items():
        if re.search(rf"\b{re.escape(word)}\s*(?:din|days|दिन)\b", t):
            return days
    if re.search(r"\b(?:ek\s+hafte|1\s+hafte|ek\s+hafta|एक\s+हफ्ते)\b", t):
        return 7
    return None


def triage_node(state: AgentState) -> AgentState:
    raw_text = state.get("raw_user_message", "")
    normalized = bhashini_engine.normalize_dialect(raw_text)

    # 1. Comorbidities extraction & deduplication
    last_bot_msg = ""
    for d in reversed(state.get("dialogue_history", [])):
        if d.get("role") in ("assistant", "doctor"):
            last_bot_msg = d.get("content", "")
            break

    detected_conditions = extract_patient_conditions_from_text(normalized, last_bot_msg)
    existing_conds = list(state.get("patient_conditions") or [])
    for cond in detected_conditions:
        if cond not in existing_conds:
            existing_conds.append(cond)
    state["patient_conditions"] = existing_conds

    # 2. Duration extraction
    duration_days = extract_duration_days(normalized)
    if "symptom_profile" not in state or state["symptom_profile"] is None:
        state["symptom_profile"] = {}
    if duration_days is not None:
        state["symptom_profile"]["duration_days"] = duration_days
        state["symptom_profile"]["duration"] = f"{duration_days} days"
    else:
        duration_days = state["symptom_profile"].get("duration_days")

    # 3. Contextual Triage Evaluation (combining current turn with accumulated context)
    consultation_notes = state.get("consultation_notes", "") or ""
    tier, flags = triage_engine.evaluate_with_context(normalized, consultation_notes, duration_days)

    # Clean and deduplicate flags while preserving order
    flags = [f for f in dict.fromkeys(flags) if not (len(flags) > 1 and "GREEN_FLAG" in f)]

    # 4. Demographic risk auto-escalation based on age
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

    # 5. Multi-Language Auto-Detection across all Indian languages
    detected_language = bhashini_engine.detect_language(raw_text, hint=state.get("language_hint"))

    # 6. Update state tracking
    current_phase = state.get("dialogue_phase", "GREETING")
    prior_turn_count = state.get("turn_count", 0)
    turn_count = prior_turn_count + 1

    state["normalized_message"] = normalized
    state["detected_tier"] = tier.value
    state["clinical_flags"] = flags
    state["detected_language"] = detected_language
    state["escalation_triggered"] = (tier.value == "Red")
    state["turn_count"] = turn_count
    state["retrieval_attempted"] = False

    state["prev_dialogue_phase"] = current_phase

    # --- State Transition Logic ---
    if intent == "ADVERSARIAL":
        state["dialogue_phase"] = "GUARDRAIL_BLOCKED"

    elif tier.value == "Red":
        state["dialogue_phase"] = "EMERGENCY"

    elif intent == "LANGUAGE_REQUEST":
        if current_phase in ("CONCLUDED", "EMERGENCY"):
            state["dialogue_phase"] = "CONCLUDED"
        elif current_phase == "CONSULTATION" and prior_turn_count > 0:
            state["dialogue_phase"] = "CONSULTATION"
        elif state.get("consultation_notes") or state.get("vision_analysis") or state.get("retrieved_remedies"):
            state["dialogue_phase"] = "CONCLUDED"
        else:
            state["dialogue_phase"] = "GREETING"

    elif intent == "GREETING":
        if current_phase == "CONSULTATION" and prior_turn_count > 0:
            pass
        elif current_phase in ("GREETING", "GUARDRAIL_BLOCKED", None, "") or prior_turn_count == 0:
            state["dialogue_phase"] = "GREETING"
            state["dialogue_history"] = []
            state["consultation_notes"] = ""
            state["symptom_profile"] = {}
            state["retrieved_remedies"] = []
            state["blocked_remedies"] = []
            state["turn_count"] = 0
            state["detected_tier"] = "Green"
            state["clinical_flags"] = []
        else:
            pass

    elif current_phase in ("CONCLUDED", "EMERGENCY"):
        msg_lower = normalized.lower().strip()
        from app.core.dialogue_manager import has_symptom_mention
        has_new_symptoms = has_symptom_mention(normalized)
        remedy_words = [
            "nuskha", "nushkha", "remedy", "dhanyawad", "thanks", "shukriya",
            "batao", "bataein", "upchar", "kaha", "kahan", "kab", "hindi",
            "english", "garhwali", "samjhao", "photo", "scan", "rash"
        ]

        if has_new_symptoms and not any(w in msg_lower for w in remedy_words):
            # Patient describes a genuine new medical complaint → start new consultation
            state["dialogue_phase"] = "CONSULTATION"
            state["dialogue_history"] = []
            state["consultation_notes"] = ""
            state["symptom_profile"] = {}
            state["retrieved_remedies"] = []
            state["blocked_remedies"] = []
            state["turn_count"] = 1
        else:
            state["dialogue_phase"] = "CONCLUDED"

    elif current_phase in ("GREETING", "GUARDRAIL_BLOCKED", None, ""):
        state["dialogue_phase"] = "CONSULTATION"
        state["turn_count"] = 1

    elif current_phase == "CONSULTATION":
        pass  # Stay in CONSULTATION until responder_node concludes

    return state