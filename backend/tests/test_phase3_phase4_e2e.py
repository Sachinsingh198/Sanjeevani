"""
Comprehensive Test Suite for Phase 3 and Phase 4 Implementation.
"""
import sys
import os
import pytest

# Ensure utf-8 stdout on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.symptom_model import StructuredSymptomProfile
from app.agents.state import AgentState
from app.agents.nodes.responder_node import (
    doctor_consultation_node,
    get_llm,
    _check_allopathic_hallucination,
    _format_concluded_remedy,
)
from app.schemas.chat_schemas import ChatRequest, PatientContext
from pydantic import ValidationError


def test_structured_symptom_profile_extraction():
    """Validates entity extraction from patient narrative."""
    profile = StructuredSymptomProfile()
    
    # 1. Narrative with duration and severity
    profile.update_from_narrative("Mujhe teen din se bohot tez bukhar hai aur ulti bhi ho rahi hai")
    assert profile.duration is not None
    assert "teen din" in profile.duration or "3" in profile.duration or "din" in profile.duration
    assert profile.severity == "severe"
    assert "nausea_vomiting" in profile.associated_symptoms or "vomiting" in profile.associated_symptoms
    assert profile.has_duration() is True
    assert profile.has_associated_symptoms() is True
    assert profile.is_clinically_sufficient() is True

    # 2. Denied symptom
    profile2 = StructuredSymptomProfile()
    profile2.update_from_narrative("pet dard hai kal se lekin ulti nahi hai")
    assert profile2.has_duration() is True
    assert "nausea_vomiting" in profile2.denied_symptoms or "vomiting" in profile2.denied_symptoms

    summary = profile2.to_clinical_summary()
    assert "Chief Complaint" in summary
    assert "Duration" in summary
    print("[PASS] StructuredSymptomProfile extraction validated.")


def test_yellow_tier_two_turn_clarification():
    """Validates 2-turn Yellow tier clarification dialogue."""
    # Turn 0: First Yellow encounter
    state_turn0: AgentState = {
        "messages": [],
        "raw_user_message": "mujhe 4 din se bukhar hai",
        "detected_language": "hindi",
        "is_devanagari": True,
        "detected_tier": "Yellow",
        "clinical_flags": ["prolonged_fever"],
        "dialogue_phase": "CONSULTATION",
        "turn_count": 1,
        "consultation_notes": "Patient: mujhe 4 din se bukhar hai",
        "retrieved_remedies": [],
        "yellow_clarification_turn": 0,
    }

    out0 = doctor_consultation_node(state_turn0)
    assert out0.get("yellow_clarification_turn") == 1
    assert len(out0.get("retrieved_remedies", [])) == 0
    # Must ask clarifying triage question about fever
    reply0 = out0.get("final_reply_text", "")
    assert "bukhar" in reply0.lower() or "thand" in reply0.lower() or "dino" in reply0.lower()
    print("[PASS] Yellow Tier Turn 0 asked targeted clarification question.")

    # Turn 1: Second Yellow encounter
    state_turn1: AgentState = {
        **out0,
        "raw_user_message": "thand lagkar chadh raha hai aur bohot tez hai",
        "yellow_clarification_turn": 1,
    }
    out1 = doctor_consultation_node(state_turn1)
    assert out1.get("yellow_clarification_turn") >= 2
    assert len(out1.get("retrieved_remedies", [])) == 0
    reply1 = out1.get("final_reply_text", "")
    # Must provide supportive care + PHC referral
    assert "phc" in reply1.lower() or "primary health centre" in reply1.lower() or "104" in reply1
    assert "paani" in reply1.lower() or "ors" in reply1.lower() or "aaram" in reply1.lower() or "rest" in reply1.lower() or "hydrated" in reply1.lower()
    assert out1.get("disclaimer") is not None
    print("[PASS] Yellow Tier Turn 1 delivered supportive care and PHC referral with disclaimer.")


def test_yellow_tier_garhwali_and_english():
    """Validates Yellow tier localization in Garhwali and English."""
    # Garhwali Devanagari Turn 0
    state_garh: AgentState = {
        "messages": [],
        "raw_user_message": "४ दिन बटी बुखार छ",
        "detected_language": "garhwali",
        "is_devanagari": True,
        "detected_tier": "Yellow",
        "clinical_flags": ["prolonged_fever"],
        "dialogue_phase": "CONSULTATION",
        "turn_count": 1,
        "consultation_notes": "",
        "retrieved_remedies": [],
        "yellow_clarification_turn": 0,
    }
    out_garh = doctor_consultation_node(state_garh)
    assert out_garh.get("yellow_clarification_turn") == 1
    assert "बुखार" in out_garh.get("final_reply_text", "")

    # Garhwali Roman Turn 0
    state_garh_rom: AgentState = {
        "messages": [],
        "raw_user_message": "4 din bati bukhar chha",
        "detected_language": "garhwali",
        "is_devanagari": False,
        "detected_tier": "Yellow",
        "clinical_flags": ["prolonged_fever"],
        "dialogue_phase": "CONSULTATION",
        "turn_count": 1,
        "consultation_notes": "",
        "retrieved_remedies": [],
        "yellow_clarification_turn": 0,
    }
    out_garh_rom = doctor_consultation_node(state_garh_rom)
    assert out_garh_rom.get("yellow_clarification_turn") == 1
    assert "bukhar" in out_garh_rom.get("final_reply_text", "").lower()

    # English Turn 1
    state_eng: AgentState = {
        "messages": [],
        "raw_user_message": "Yes, shivering and high fever",
        "detected_language": "english",
        "is_devanagari": False,
        "detected_tier": "Yellow",
        "clinical_flags": ["prolonged_fever"],
        "dialogue_phase": "CONSULTATION",
        "turn_count": 2,
        "consultation_notes": "",
        "retrieved_remedies": [],
        "yellow_clarification_turn": 1,
    }
    out_eng = doctor_consultation_node(state_eng)
    assert "PHC" in out_eng.get("final_reply_text", "")
    assert "hydrated" in out_eng.get("final_reply_text", "") or "104" in out_eng.get("final_reply_text", "")
    print("[PASS] Yellow Tier Garhwali & English flows validated.")


def test_consultation_dynamic_gap_questioning(monkeypatch=None):
    """Validates that missing dimensions in StructuredSymptomProfile drive questions."""
    from unittest.mock import patch
    with patch("app.agents.nodes.responder_node.get_llm", return_value=None):
        # Patient mentions only complaint without duration
        state1: AgentState = {
            "messages": [],
            "raw_user_message": "mere sir mein dard hai",
            "detected_language": "hindi",
            "is_devanagari": True,
            "detected_tier": "Green",
            "clinical_flags": [],
            "dialogue_phase": "CONSULTATION",
            "turn_count": 1,
            "consultation_notes": "",
            "retrieved_remedies": [],
        }
        out1 = doctor_consultation_node(state1)
        # Profile should know chief complaint is headache, duration is missing -> ask duration
        prof1 = StructuredSymptomProfile.from_dict(out1.get("structured_symptoms"))
        assert prof1.has_duration() is False
        reply1 = out1.get("final_reply_text", "")
        # Should ask when it started / duration
        assert "kab" in reply1.lower() or "samay" in reply1.lower() or "dino" in reply1.lower() or "din" in reply1.lower()
        print("[PASS] Gap analysis asked duration when duration was missing.")

        # Second turn provides duration
        state2: AgentState = {
            **out1,
            "raw_user_message": "kal se ho raha hai",
            "turn_count": 2,
        }
        out2 = doctor_consultation_node(state2)
        prof2 = StructuredSymptomProfile.from_dict(out2.get("structured_symptoms"))
        assert prof2.has_duration() is True
        # Now duration is present, but associated symptoms are missing -> should ask warning/associated symptoms
        reply2 = out2.get("final_reply_text", "")
        assert "chakkar" in reply2.lower() or "ulti" in reply2.lower() or "aankh" in reply2.lower() or "tez" in reply2.lower() or "takleef" in reply2.lower()
        print("[PASS] Gap analysis asked associated symptoms after duration was filled.")


def test_llm_client_singleton():
    """Validates LLM client singleton caching and reuse."""
    client1 = get_llm()
    client2 = get_llm()
    assert client1 is client2
    print(f"[PASS] LLM singleton validated (Cached instance: {type(client1).__name__ if client1 else 'None/Deterministic'}).")


def test_chat_request_validation():
    """Validates boundary checks on ChatRequest and PatientContext."""
    # 1. Reject empty message
    with pytest.raises(ValidationError):
        ChatRequest(conversation_id="conv_1", message="")

    # 2. Reject excessively long message (>2000 chars)
    with pytest.raises(ValidationError):
        ChatRequest(conversation_id="conv_1", message="a" * 2005)

    # 3. Reject invalid age (>125)
    with pytest.raises(ValidationError):
        PatientContext(age=150)

    # 4. Reject negative age (<0)
    with pytest.raises(ValidationError):
        PatientContext(age=-5)

    # 5. Valid request passes
    valid_req = ChatRequest(
        conversation_id="conv_valid_123",
        message="sir dard hai",
        patient_context=PatientContext(age=28, gender="female", pregnancy=False)
    )
    assert valid_req.message == "sir dard hai"
    print("[PASS] ChatRequest and PatientContext bounds validation confirmed.")


def test_allopathic_drug_guardrail():
    """Validates that banned allopathic drugs are caught and removed."""
    dirty_text = "Aap paracetamol 500mg le sakte hain din mein do baar."
    is_hallucinated, cleaned = _check_allopathic_hallucination(dirty_text)
    assert is_hallucinated is True
    assert "paracetamol" not in cleaned.lower()

    dolo_text = "Dolo 650 tablet lene se aaram milega."
    is_hallucinated2, cleaned2 = _check_allopathic_hallucination(dolo_text)
    assert is_hallucinated2 is True
    assert "dolo" not in cleaned2.lower()
    print("[PASS] Allopathic drug guardrail catches and sanitizes banned modern pharmaceutical mentions.")


if __name__ == "__main__":
    test_structured_symptom_profile_extraction()
    test_yellow_tier_two_turn_clarification()
    test_yellow_tier_garhwali_and_english()
    test_consultation_dynamic_gap_questioning()
    test_llm_client_singleton()
    test_chat_request_validation()
    test_allopathic_drug_guardrail()
    print("\nALL PHASE 3 & PHASE 4 VERIFICATION TESTS PASSED SUCCESSFULLY!")
