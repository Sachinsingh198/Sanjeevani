import pytest
from app.agents.graph import sanjeevani_workflow

def test_workflow_red_tier_emergency():
    """Emergency chest pain must halt at emergency_node without RAG remedies."""
    initial_state = {
        "conversation_id": "test-emergency-101",
        "raw_user_message": "Mera seene me bahut tezz dard aur ghutan ho rahi hai",
        "normalized_message": "",
        "patient_conditions": [],
        "detected_tier": "Green",
        "clinical_flags": [],
        "retrieved_remedies": [],
        "final_reply_text": "",
        "escalation_triggered": False
    }

    config = {"configurable": {"thread_id": "test-emergency-101"}}
    result = sanjeevani_workflow.invoke(initial_state, config=config)

    assert result["detected_tier"] == "Red"
    assert result["escalation_triggered"] is True
    assert len(result["retrieved_remedies"]) == 0
    assert "EMERGENCY" in result["final_reply_text"]

def test_workflow_green_tier_routine():
    """Routine cough query must retrieve verified AYUSH remedies and stay in Green tier."""
    initial_state = {
        "conversation_id": "test-routine-102",
        "raw_user_message": "Gale me halki khasi aur kharash hai, nuskha batao",
        "normalized_message": "",
        "patient_conditions": [],
        "detected_tier": "Green",
        "clinical_flags": [],
        "dialogue_phase": "CONCLUDED",
        "retrieved_remedies": [],
        "final_reply_text": "",
        "escalation_triggered": False
    }

    config = {"configurable": {"thread_id": "test-routine-102"}}
    result = sanjeevani_workflow.invoke(initial_state, config=config)

    assert result["detected_tier"] == "Green"
    assert result["escalation_triggered"] is False
    assert len(result["retrieved_remedies"]) > 0
    assert "Tulsi" in result["final_reply_text"] or "Vasa" in result["final_reply_text"] or "gharelu upchaar" in result["final_reply_text"]