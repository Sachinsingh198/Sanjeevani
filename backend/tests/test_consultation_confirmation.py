import pytest
from app.agents.graph import sanjeevani_workflow
import app.agents.nodes.responder_node as rn

def test_brief_complaint_does_not_conclude_prematurely(monkeypatch):
    """
    A brief statement like 'akshar naak band rehta hai' has no duration and no context.
    Dr. Sanjeevani must NOT conclude immediately; it must remain in CONSULTATION
    and ask for duration / associated symptoms.
    """
    monkeypatch.setattr(rn, "get_llm", lambda: None)
    initial_state = {
        "conversation_id": "test-consult-flow-1",
        "raw_user_message": "akshar naak band rehta hai",
        "normalized_message": "",
        "patient_conditions": [],
        "detected_tier": "Green",
        "clinical_flags": [],
        "dialogue_phase": "CONSULTATION",
        "consultation_notes": "",
        "turn_count": 0,
        "retrieved_remedies": [],
        "final_reply_text": "",
        "escalation_triggered": False
    }

    config = {"configurable": {"thread_id": "test-consult-flow-1"}}
    result = sanjeevani_workflow.invoke(initial_state, config=config)

    # Must stay in CONSULTATION to consult the patient
    assert result["dialogue_phase"] == "CONSULTATION", (
        f"Expected dialogue_phase to be CONSULTATION on brief complaint, got {result['dialogue_phase']}"
    )
    assert any(w in result["final_reply_text"].lower() for w in ["kab se", "kitne din", "kaba", "since", "how long", "lakshan"]), (
        f"Expected doctor to ask about duration or symptoms, got: {result['final_reply_text']}"
    )

def test_confirmation_of_no_other_symptoms_concludes(monkeypatch):
    """
    When the patient confirms duration and that there are no other symptoms,
    Dr. Sanjeevani concludes and provides verified care.
    """
    monkeypatch.setattr(rn, "get_llm", lambda: None)
    initial_state = {
        "conversation_id": "test-consult-flow-2",
        "raw_user_message": "Yeh 3 din se hai aur koi lakshan nahi hai",
        "normalized_message": "",
        "patient_conditions": [],
        "detected_tier": "Green",
        "clinical_flags": [],
        "dialogue_phase": "CONSULTATION",
        "consultation_notes": "Patient: akshar naak band rehta hai\nDoctor: Aapko yeh takleef kab se hai?",
        "turn_count": 1,
        "retrieved_remedies": [],
        "final_reply_text": "",
        "escalation_triggered": False
    }

    config = {"configurable": {"thread_id": "test-consult-flow-2"}}
    result = sanjeevani_workflow.invoke(initial_state, config=config)

    assert result["dialogue_phase"] == "CONCLUDED", (
        f"Expected dialogue_phase to reach CONCLUDED, got {result['dialogue_phase']}"
    )
