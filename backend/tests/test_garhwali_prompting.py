import pytest
from unittest.mock import MagicMock
from app.agents.nodes.responder_node import _doctor_consultation_inner, _format_concluded_remedy
from app.agents.state import AgentState


def test_garhwali_guidance_injected_in_consultation_llm_prompt(monkeypatch):
    """Verify that when lang == 'garhwali', the LLM prompt contains Garhwali guidance and output is not double-mutated."""
    captured_messages = []

    class MockLLM:
        def invoke(self, messages):
            captured_messages.extend(messages)
            # Return custom native Garhwali response
            res = MagicMock()
            res.content = "Twari baat suni li. Mund ma peed kab bati ho rahyu chha?"
            return res

    monkeypatch.setattr("app.agents.nodes.responder_node.get_llm", lambda: MockLLM())

    state: AgentState = {
        "conversation_id": "test-garh-1",
        "dialogue_phase": "CONSULTATION",
        "detected_tier": "Green",
        "turn_count": 1,
        "raw_user_message": "Mund ma peed chha",
        "normalized_message": "sar dard hai",
        "detected_language": "garhwali",
        "consultation_notes": "",
        "clinical_flags": [],
        "retrieved_remedies": [],
        "final_reply_text": "",
        "spoken_reply_text": "",
        "escalation_triggered": False,
        "patient_conditions": [],
        "voice_mode": False,
    }

    res_state = _doctor_consultation_inner(state)

    # Check captured system prompt
    assert len(captured_messages) >= 2
    sys_msg = captured_messages[0].content
    assert "GARHWALI GRAMMAR & VOCABULARY RULES" in sys_msg
    assert "Strictly use authentic Garhwali postpositions" in sys_msg

    # Verify that the LLM output is preserved verbatim without regex degradation
    assert res_state["final_reply_text"] == "Twari baat suni li. Mund ma peed kab bati ho rahyu chha?"


def test_garhwali_guidance_injected_in_greeting_llm_prompt(monkeypatch):
    captured_messages = []

    class MockLLM:
        def invoke(self, messages):
            captured_messages.extend(messages)
            res = MagicMock()
            res.content = "Dainu bhula! Main Sanjeevani chhon."
            return res

    monkeypatch.setattr("app.agents.nodes.responder_node.get_llm", lambda: MockLLM())

    state: AgentState = {
        "conversation_id": "test-garh-2",
        "dialogue_phase": "GREETING",
        "detected_tier": "Green",
        "turn_count": 0,
        "raw_user_message": "Dainu doctor ji",
        "normalized_message": "namaste doctor ji",
        "detected_language": "garhwali",
        "consultation_notes": "",
        "clinical_flags": [],
        "retrieved_remedies": [],
        "final_reply_text": "",
        "spoken_reply_text": "",
        "escalation_triggered": False,
        "patient_conditions": [],
        "voice_mode": False,
    }

    res_state = _doctor_consultation_inner(state)
    assert len(captured_messages) >= 2
    sys_msg = captured_messages[0].content
    assert "GARHWALI GRAMMAR & VOCABULARY RULES" in sys_msg
    assert res_state["final_reply_text"] == "Dainu bhula! Main Sanjeevani chhon."
