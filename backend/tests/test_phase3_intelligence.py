import json
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import get_db_connection
from app.db.schema import consultation_feedback_table
from app.agents.nodes.responder_node import _has_sufficient_info, compress_consultation_notes
from app.agents.nodes.retriever_node import extract_active_symptoms
from sqlalchemy import select

client = TestClient(app)


def test_has_sufficient_info_detection():
    """
    _has_sufficient_info must return True when duration and associated symptoms/severity
    are present, and False when incomplete.
    """
    # Incomplete: only duration
    assert _has_sufficient_info("Patient: 3 din se takleef hai") is False

    # Incomplete: only symptom without duration
    assert _has_sufficient_info("Patient: Mujhe bukhar aur thand lag rahi hai") is False

    # Complete: duration + severity
    assert _has_sufficient_info("Patient: 2 din se tez bukhar hai") is True

    # Complete: duration + multiple symptoms
    assert _has_sufficient_info("Patient: Kal se gala kharab hai aur sardi hai") is True


def test_context_summarization_long_notes():
    """
    compress_consultation_notes must compress notes exceeding 1500 characters
    while preserving the chief complaint and recent turns.
    """
    long_notes = (
        "Patient: Mera sar dard 2 din se bahut tezz ho raha hai.\n"
        "Doctor: Yeh sar dard kab se ho raha hai?\n"
        "Patient: 2 din se lagatar hai aur chakkar bhi aate hain.\n"
    ) + ("Doctor: Kya koi aur takleef hai?\nPatient: Thodi thakan aur sardi bhi lag rahi hai.\n" * 25)

    assert len(long_notes) > 1500
    compressed = compress_consultation_notes(long_notes, llm=None)

    assert len(compressed) <= 1200
    assert "sar dard" in compressed.lower()
    assert "[Chief Complaint:" in compressed


def test_symptom_extraction_with_registry_fallback():
    """
    extract_active_symptoms must extract active positive complaints and filter negative answers.
    """
    notes = (
        "Patient: Mujhe kal se bahut tezz bukhar hai\n"
        "Doctor: Kya ulti ya dast bhi hain?\n"
        "Patient: Nahin\n"
    )
    query = extract_active_symptoms(notes, "bukhar", llm=None)
    assert "bukhar" in query.lower() or "fever" in query.lower()
    assert "nahin" not in query.lower()


def test_post_chat_feedback_endpoint():
    """
    POST /chat/feedback must record feedback (helpful: bool, note: str) in consultation_feedback table.
    """
    cid = "test_feedback_conv_999"
    resp = client.post(
        "/chat/feedback",
        json={
            "conversation_id": cid,
            "turn_index": 2,
            "helpful": True,
            "note": "Aaram mil gaya, nuskha bahut accha tha.",
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"

    # Verify directly from database
    with get_db_connection() as conn:
        stmt = (
            select(consultation_feedback_table)
            .where(consultation_feedback_table.c.conversation_id == cid)
        )
        row = conn.execute(stmt).fetchone()

    assert row is not None
    assert row.conversation_id == cid
    assert row.turn_index == 2
    assert row.helpful is True
    assert "nuskha" in row.note


def test_post_chat_message_stream_sse():
    """
    POST /chat/message/stream must return SSE stream with start, token, and complete events.
    """
    cid = "test_sse_stream_101"
    resp = client.post(
        "/chat/message/stream",
        json={
            "conversation_id": cid,
            "message": "Namaste doctor, mujhe halki sardi aur khansi hai",
            "language_hint": "hi",
        }
    )
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers.get("content-type", "")

    # Parse SSE data events
    events = []
    for line in resp.text.split("\n\n"):
        line_clean = line.strip()
        if line_clean.startswith("data:"):
            raw_data = line_clean.replace("data:", "").strip()
            if raw_data and raw_data != "[DONE]":
                try:
                    events.append(json.loads(raw_data))
                except Exception:
                    pass

    event_types = [e.get("type") for e in events]
    assert "start" in event_types
    assert "token" in event_types
    assert "complete" in event_types

    # Verify complete event structure
    complete_ev = next(e for e in events if e.get("type") == "complete")
    assert "response" in complete_ev
    res_data = complete_ev["response"]
    assert res_data["conversation_id"] == cid
    assert res_data["tier"] in ("Green", "Yellow", "Red")
    assert len(res_data["reply_text"]) > 0


def test_adaptive_probing_five_turn_hard_cap(monkeypatch):
    """
    When patient responses are vague/insufficient across turns,
    Dr. Sanjeevani must probe progressively and enforce the 5-turn hard cap.
    """
    import app.agents.nodes.responder_node as rn
    monkeypatch.setattr(rn, "get_llm", lambda: None)
    from app.agents.nodes.responder_node import doctor_consultation_node

    cid = "test_probing_cap_505"
    base_state = {
        "conversation_id": cid,
        "raw_user_message": "pet dard hai",
        "normalized_message": "pet dard",
        "detected_tier": "Green",
        "clinical_flags": [],
        "retrieved_remedies": [],
        "final_reply_text": "",
        "spoken_reply_text": "",
        "escalation_triggered": False,
        "dialogue_phase": "CONSULTATION",
        "detected_language": "hindi",
        "consultation_notes": "",
    }

    # Turn 1: Incomplete info -> probes duration
    state_t1 = dict(base_state, turn_count=1, raw_user_message="pet dard hai")
    out_t1 = doctor_consultation_node(state_t1)
    assert out_t1["dialogue_phase"] == "CONSULTATION"
    assert any(w in out_t1["final_reply_text"].lower() for w in ["kab", "din", "kitne", "since", "kaba"])

    # Turn 2: Still vague -> probes key warning
    state_t2 = dict(out_t1, turn_count=2, raw_user_message="thoda dard")
    out_t2 = doctor_consultation_node(state_t2)
    assert out_t2["dialogue_phase"] == "CONSULTATION"
    assert any(w in out_t2["final_reply_text"].lower() for w in ["ulti", "dast", "vomit"])

    # Turn 3: probes continuity / pattern
    state_t3 = dict(out_t2, turn_count=3, raw_user_message="nahi")
    out_t3 = doctor_consultation_node(state_t3)
    assert out_t3["dialogue_phase"] == "CONSULTATION"
    assert "lagatar" in out_t3["final_reply_text"].lower()

    # Turn 4: probes appetite / weakness
    state_t4 = dict(out_t3, turn_count=4, raw_user_message="kuch nahi")
    out_t4 = doctor_consultation_node(state_t4)
    assert out_t4["dialogue_phase"] == "CONSULTATION"
    assert "kamzori" in out_t4["final_reply_text"].lower() or "khana" in out_t4["final_reply_text"].lower()

    # Turn 5: Hard cap reached -> must CONCLUDE
    state_t5 = dict(out_t4, turn_count=5, raw_user_message="aaj se")
    out_t5 = doctor_consultation_node(state_t5)
    assert out_t5["dialogue_phase"] == "CONCLUDED"

