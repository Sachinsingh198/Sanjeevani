import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
import uuid
from app.agents.graph import sanjeevani_workflow

def test_scenario(title, turns):
    print("=" * 70)
    print(f"SCENARIO: {title}")
    print("=" * 70)
    conv_id = f"test-{uuid.uuid4().hex[:8]}"

    for i, msg in enumerate(turns):
        print(f"\n[Turn {i+1}] User: {msg}")
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
            "patient_conditions": [],
            "patient_age": 28,
            "patient_gender": "female",
            "patient_pregnancy": False,
            "voice_mode": False,
            "language_hint": "hi",
        }
        config = {"configurable": {"thread_id": conv_id}}
        result = sanjeevani_workflow.invoke(state_input, config=config)
        phase = result.get("dialogue_phase")
        tier = result.get("detected_tier")
        reply = result.get("final_reply_text", "")
        lang = result.get("detected_language")
        summary = result.get("consultation_summary")
        remedies = result.get("retrieved_remedies", [])

        print(f"Bot [Phase: {phase}, Lang: {lang}, Tier: {tier}]:")
        # Print first 250 chars of reply
        if len(reply) > 250:
            print(reply[:250] + " ... [TRUNCATED FOR DISPLAY]")
        else:
            print(reply)

        if phase == "CONCLUDED":
            print(f"\n>> Final Diagnosis: {summary.get('possible_cause') if summary else 'N/A'}")
            print(f">> Primary Remedy: {summary.get('remedy_name') if summary else 'N/A'}")
            if remedies:
                for idx, r in enumerate(remedies):
                    print(f"   Candidate {idx+1}: {r.get('remedy_name')} (Source: {r.get('source')})")
            break

if __name__ == "__main__":
    # Test A: Headache
    test_scenario("Headache flow", [
        "Mujhe sir dard ho raha hai",
        "Subah se sar mein bhaari dard hai",
        "Neend poori nahi hui thi aur screen par kaam zyada kiya tha, ulti ya bukhar nahi hai"
    ])

    # Test B: Acidity / Burning
    test_scenario("Acidity flow", [
        "Doctor mujhe khana khane ke baad seene mein tez jalan hoti hai",
        "Lagbhag ek hafte se ho raha hai, khatti dakar aati hai",
        "Bas yahi pareshani hai, bukhar ya ulti nahi hai"
    ])

    # Test C: Joint pain
    test_scenario("Joint pain flow", [
        "Ghutno mein dard rehta hai",
        "Pichhle ek mahine se chalne-phirne mein dikkat hoti hai",
        "Subah jodon mein jakdan rehti hai, koi chot nahi lagi thi"
    ])
