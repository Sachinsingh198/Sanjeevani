import pytest
from app.agents.graph import sanjeevani_workflow

def test_early_conclusion_single_turn_with_sufficient_info():
    """
    A single patient message containing both duration ('3 din') and associated
    symptoms / severity ('tez bukhar', 'kapkapi') must conclude within one turn
    without forcing 3 probing turns.
    """
    initial_state = {
        "conversation_id": "test-early-conclude-201",
        "raw_user_message": "3 din se tez bukhar hai, kapkapi bhi hai",
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

    config = {"configurable": {"thread_id": "test-early-conclude-201"}}
    result = sanjeevani_workflow.invoke(initial_state, config=config)

    assert result["dialogue_phase"] == "CONCLUDED", (
        f"Expected dialogue_phase to reach CONCLUDED in 1 turn, got {result['dialogue_phase']}"
    )
    assert len(result.get("retrieved_remedies", [])) > 0 or result.get("final_reply_text"), (
        "Expected remedy retrieval or completed consultation response"
    )
