import uuid
import pytest
from app.agents.graph import sanjeevani_workflow

def test_workflow_red_tier_emergency():
    """Emergency chest pain must halt at emergency_node without RAG remedies."""
    sid = f"test-emergency-101-{uuid.uuid4().hex[:8]}"
    initial_state = {
        "conversation_id": sid,
        "raw_user_message": "Mera seene me bahut tezz dard aur ghutan ho rahi hai",
        "normalized_message": "",
        "patient_conditions": [],
        "detected_tier": "Green",
        "clinical_flags": [],
        "retrieved_remedies": [],
        "final_reply_text": "",
        "escalation_triggered": False
    }

    config = {"configurable": {"thread_id": sid}}
    result = sanjeevani_workflow.invoke(initial_state, config=config)

    assert result["detected_tier"] == "Red"
    assert result["escalation_triggered"] is True
    assert len(result["retrieved_remedies"]) == 0
    assert "EMERGENCY" in result["final_reply_text"]

def test_workflow_green_tier_routine():
    """Routine cough query must retrieve verified AYUSH remedies and stay in Green tier."""
    sid = f"test-routine-102-{uuid.uuid4().hex[:8]}"
    initial_state = {
        "conversation_id": sid,
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

    config = {"configurable": {"thread_id": sid}}
    result = sanjeevani_workflow.invoke(initial_state, config=config)

    assert result["detected_tier"] == "Green"
    assert result["escalation_triggered"] is False
    assert len(result["retrieved_remedies"]) > 0
    assert any(term in result["final_reply_text"].lower() for term in ["tulsi", "vasa", "kashaya", "kwath", "gharelu upchaar", "nuskha", "haldi", "gargle", "upchar", "upchaar", "remedy"])


def test_sqlite_saver_wal_mode():
    """Verify that SQLite connection operates in WAL journal mode if SQLite checkpointer is used."""
    from app.agents.graph import conn, checkpointer
    if conn is not None and hasattr(conn, "execute"):
        cursor = conn.execute("PRAGMA journal_mode")
        row = cursor.fetchone()
        assert row is not None
        assert row[0].lower() == "wal"
    else:
        assert checkpointer is not None

def test_workflow_conversational_comorbidity_filtering():
    """
    Test multi-turn consultation progression:
    Turn 1: Patient reports cough / sore throat.
    Turn 2: Patient reports duration.
    Turn 3: Patient states 'Mujhe High BP hai', blocking Mulethi (Licorice) and returning a BP-safe remedy.
    """
    from app.agents.graph import sanjeevani_workflow

    session_id = f"test-multi-turn-comorbidity-001-{uuid.uuid4().hex[:8]}"
    config = {"configurable": {"thread_id": session_id}}

    # Turn 1: Symptom report
    state_turn1 = {
        "conversation_id": session_id,
        "raw_user_message": "Gale me bahut kharash aur khasi hai",
        "normalized_message": "",
        "patient_conditions": [],
        "detected_tier": "Green",
        "clinical_flags": [],
        "retrieved_remedies": [],
        "final_reply_text": "",
        "escalation_triggered": False
    }
    res1 = sanjeevani_workflow.invoke(state_turn1, config=config)
    assert res1["detected_tier"] in ["Green", "Yellow"]

    # Turn 2: Duration
    state_turn2 = {
        "conversation_id": session_id,
        "raw_user_message": "2 din se ho raha hai",
        "normalized_message": "",
        "patient_conditions": res1.get("patient_conditions", []),
        "detected_tier": res1["detected_tier"],
        "clinical_flags": res1.get("clinical_flags", []),
        "retrieved_remedies": [],
        "final_reply_text": "",
        "escalation_triggered": False
    }
    res2 = sanjeevani_workflow.invoke(state_turn2, config=config)

    # Turn 3: Comorbidity mentioned conversationally + conclude consultation
    state_turn3 = {
        "conversation_id": session_id,
        "raw_user_message": "Mujhe High BP hai, nuskha bataiye",
        "normalized_message": "",
        "patient_conditions": res2.get("patient_conditions", []),
        "detected_tier": res2["detected_tier"],
        "clinical_flags": res2.get("clinical_flags", []),
        "dialogue_phase": "CONCLUDED",
        "retrieved_remedies": [],
        "final_reply_text": "",
        "escalation_triggered": False
    }
    res3 = sanjeevani_workflow.invoke(state_turn3, config=config)

    # Verify hypertension was recognized
    conditions = [str(c).lower() for c in res3.get("patient_conditions", [])]
    assert any("hypertension" in c or "bp" in c for c in conditions)

    # Verify remedies returned do NOT include Mulethi/Licorice
    remedy_texts = " ".join([
        f"{r.get('remedy_name', '')} {r.get('remedy_text', '')}"
        for r in res3.get("retrieved_remedies", [])
    ]).lower()
    assert "mulethi" not in remedy_texts
    assert "licorice" not in remedy_texts

    # Verify that a safe remedy was retrieved
    assert len(res3.get("retrieved_remedies", [])) > 0