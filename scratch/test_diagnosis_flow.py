import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
import uuid
from app.agents.graph import sanjeevani_workflow

def run_conversation(test_name, turns, patient_context=None):
    print("=" * 60)
    print(f"TEST: {test_name}")
    print("=" * 60)
    conv_id = f"test-{uuid.uuid4().hex[:8]}"
    if patient_context is None:
        patient_context = {}

    for i, msg in enumerate(turns):
        print(f"\n--- Turn {i+1} ---")
        print(f"User: {msg}")
        state_input = {
            "conversation_id": conv_id,
            "raw_user_message": msg,
            "detected_tier": "Green",
            "clinical_flags": [],
            "retrieved_remedies": [],
            "final_reply_text": "",
            "spoken_reply_text": "",
            "escalation_triggered": False,
            "normalized_message": "",
            "patient_conditions": patient_context.get("conditions", []),
            "patient_age": patient_context.get("age", 30),
            "patient_gender": patient_context.get("gender", "male"),
            "patient_pregnancy": patient_context.get("pregnancy", False),
            "voice_mode": False,
            "language_hint": "hi",
        }
        config = {
            "configurable": {"thread_id": conv_id}
        }
        result = sanjeevani_workflow.invoke(state_input, config=config)
        phase = result.get("dialogue_phase")
        tier = result.get("detected_tier")
        reply = result.get("final_reply_text")
        summary = result.get("consultation_summary")
        remedies = result.get("retrieved_remedies", [])

        print(f"Bot [Phase: {phase}, Tier: {tier}]:\n{reply}")
        if phase == "CONCLUDED":
            print("\n>> CONCLUDED DIAGNOSIS & REMEDY SUMMARY:")
            if summary:
                print(f"Condition: {summary.get('condition')}")
                print(f"Possible Cause / Diagnosis: {summary.get('possible_cause')}")
                print(f"Remedy Name: {summary.get('remedy_name')}")
                print(f"Prep Steps: {summary.get('preparation_steps')}")
                print(f"Dosage: {summary.get('dosage')}")
                print(f"Precautions: {summary.get('precautions')}")
                print(f"Ayurvedic Note: {summary.get('ayurvedic_note')}")
            print(f"Retrieved Remedies Count: {len(remedies)}")
            for idx, r in enumerate(remedies):
                print(f"  Remedy {idx+1}: {r.get('remedy_name')}")
            break

if __name__ == "__main__":
    # Case 1: Common cold / cough
    run_conversation("Case 1: Sardi aur Khansi", [
        "Namaste doctor sahab, mujhe do din se sardi aur khansi hai",
        "Gale mein halki kharash hai aur naak beh rahi hai, bukhar nahi hai",
        "Bas yahi takleef hai, aur koi lakshan nahi hai"
    ])

    # Case 2: Pet dard / Gas
    run_conversation("Case 2: Pet Dard", [
        "Doctor mujhe pet mein dard ho raha hai",
        "Subah se pet mein marod aur bhari-pan hai",
        "Ulti ya dast nahi hai, sirf gas aur marod hai"
    ])
