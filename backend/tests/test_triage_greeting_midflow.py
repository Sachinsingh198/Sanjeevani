import pytest
from app.agents.nodes.triage_node import triage_node

def test_greeting_midflow_preserves_consultation():
    """
    Asserts that an explicit greeting (like 'namaste doctor') received during
    an ongoing CONSULTATION phase does NOT wipe consultation notes or reset the phase.
    """
    initial_state = {
        "conversation_id": "test-midflow-greeting-1",
        "raw_user_message": "namaste doctor",
        "normalized_message": "",
        "patient_conditions": [],
        "detected_tier": "Green",
        "clinical_flags": [],
        "dialogue_phase": "CONSULTATION",
        "consultation_notes": "Patient: gale me 2 din se dard hai\nDoctor: Kya bukhar bhi hai?",
        "turn_count": 1,
        "retrieved_remedies": [],
        "final_reply_text": "",
        "escalation_triggered": False
    }

    result = triage_node(initial_state)

    assert result["dialogue_phase"] == "CONSULTATION", (
        f"Expected CONSULTATION phase to be preserved, but got {result['dialogue_phase']}"
    )
    assert "gale me 2 din se dard hai" in result["consultation_notes"], (
        "Expected existing consultation_notes to be preserved intact"
    )
    assert result["turn_count"] >= 1


def test_greeting_at_start_resets_to_greeting():
    """
    Asserts that an initial greeting with turn_count=0 or dialogue_phase=GREETING
    correctly resolves to GREETING phase.
    """
    initial_state = {
        "conversation_id": "test-initial-greeting-2",
        "raw_user_message": "namaste",
        "normalized_message": "",
        "patient_conditions": [],
        "detected_tier": "Green",
        "clinical_flags": [],
        "dialogue_phase": "GREETING",
        "consultation_notes": "",
        "turn_count": 0,
        "retrieved_remedies": [],
        "final_reply_text": "",
        "escalation_triggered": False
    }

    result = triage_node(initial_state)
    assert result["dialogue_phase"] == "GREETING"
