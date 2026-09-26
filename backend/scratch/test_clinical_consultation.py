import os
import sys
import json

# Ensure backend root is on sys.path
sys.path.insert(0, r"d:\Sanjeevani\backend")
os.chdir(r"d:\Sanjeevani\backend")
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app.agents.nodes.responder_node import doctor_consultation_node
from app.agents.nodes.triage_node import triage_node
from app.agents.nodes.retriever_node import retriever_node_sync

def simulate_consultation():
    print("=== TEST 1: Clinical Multi-turn Intake (Cough) ===")
    state = {
        "session_id": "test_consult_001",
        "turn_count": 0,
        "dialogue_phase": "GREETING",
        "detected_tier": "Green",
        "detected_language": "hindi",
        "normalized_message": "",
        "raw_user_message": "",
        "consultation_notes": "",
        "retrieved_remedies": [],
        "patient_conditions": []
    }

    # Turn 1: Chief complaint
    msg1 = "Mujhe khansi ho rahi hai"
    print(f"\n[Patient Turn 1]: {msg1}")
    state["raw_user_message"] = msg1
    state["normalized_message"] = msg1
    state = triage_node(state)
    state = doctor_consultation_node(state)
    print(f"[Dr. Sanjeevani Turn 1 (Phase: {state.get('dialogue_phase')}, Turn: {state.get('turn_count')})]:\n{state.get('final_reply_text')}")
    assert state.get("dialogue_phase") == "CONSULTATION", f"Expected CONSULTATION, got {state.get('dialogue_phase')}"

    # Turn 2: Duration
    msg2 = "Pichle 3 din se ho rahi hai"
    print(f"\n[Patient Turn 2]: {msg2}")
    state["raw_user_message"] = msg2
    state["normalized_message"] = msg2
    state = triage_node(state)
    state = doctor_consultation_node(state)
    print(f"[Dr. Sanjeevani Turn 2 (Phase: {state.get('dialogue_phase')}, Turn: {state.get('turn_count')})]:\n{state.get('final_reply_text')}")

    # Turn 3: Character / associated symptoms (sukhi khansi, gale mein kharash)
    msg3 = "Sukhi khansi hai aur gale mein bohot kharash hai, bukhar nahi hai"
    print(f"\n[Patient Turn 3]: {msg3}")
    state["raw_user_message"] = msg3
    state["normalized_message"] = msg3
    state = triage_node(state)
    state = doctor_consultation_node(state)
    print(f"[Dr. Sanjeevani Turn 3 (Phase: {state.get('dialogue_phase')}, Turn: {state.get('turn_count')})]:\n{state.get('final_reply_text')}")

    # If not concluded yet, patient gives one more response
    if state.get("dialogue_phase") == "CONSULTATION":
        msg4 = "Haan bas yahi takleef hai"
        print(f"\n[Patient Turn 4]: {msg4}")
        state["raw_user_message"] = msg4
        state["normalized_message"] = msg4
        state = triage_node(state)
        state = doctor_consultation_node(state)
        print(f"[Dr. Sanjeevani Turn 4 (Phase: {state.get('dialogue_phase')}, Turn: {state.get('turn_count')})]:\n{state.get('final_reply_text')}")

    print("\n--- Final Consultation Summary ---")
    print("Dialogue Phase:", state.get("dialogue_phase"))
    remedies = state.get("retrieved_remedies", [])
    print(f"Retrieved Remedies Count: {len(remedies)}")
    if remedies:
        print("Recommended AYUSH Remedy:", remedies[0].get("remedy_name"))
        print("Remedy Source:", remedies[0].get("source", "CCRAS / AYUSH"))

    # Assertions
    assert state.get("dialogue_phase") == "CONCLUDED", f"Consultation should be CONCLUDED, got {state.get('dialogue_phase')}"
    reply = state.get("final_reply_text", "")
    assert "**Nuskha:**" in reply or "नुस्खा:" in reply or "Tulsi" in reply or "Vasa" in reply, "Should recommend a verified remedy"
    assert "Paracetamol" not in reply, "Must NOT contain allopathic medicines"
    assert "Antibiotic" not in reply, "Must NOT contain allopathic medicines"
    print("\n>>> ALL ASSERTIONS PASSED! Clinical consultation is doctor-like and grounded strictly in AYUSH remedies! <<<")

if __name__ == "__main__":
    simulate_consultation()
