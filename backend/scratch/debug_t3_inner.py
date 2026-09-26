import sys
sys.path.insert(0, ".")
from app.agents.nodes.responder_node import _doctor_consultation_inner, get_llm

notes = """Patient: mujhe naak band hota hai akshar
Doctor: Kab se aapko naak band hona shuru hua?
Patient: pichle 2-3 saalon se
Doctor: Kya aapko koi bukhar ya thakan mehsoos hoti hai?
Patient: bukhar yar thakan to nahi pr naak aur aankhon main khujli hoti hai aur aanshu hoti hai"""

state = {
    "dialogue_phase": "CONSULTATION",
    "turn_count": 3,
    "raw_user_message": "bukhar yar thakan to nahi pr naak aur aankhon main khujli hoti hai aur aanshu hoti hai",
    "normalized_message": "bukhar yar thakan to nahi pr naak aur aankhon main khujli hoti hai aur aanshu hoti hai",
    "consultation_notes": notes,
    "detected_language": "hindi",
    "retrieved_remedies": [],
    "detected_tier": "Green",
    "clinical_flags": [],
}

out = _doctor_consultation_inner(state)
print("OUT PHASE:", out.get("dialogue_phase"))
print("OUT REPLY:", out.get("final_reply_text"))
