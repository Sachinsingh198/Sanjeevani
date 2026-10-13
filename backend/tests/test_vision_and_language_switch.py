import pytest
from app.core.bhashini_engine import BhashiniVoiceEngine
from app.core.dialogue_manager import classify_intent, extract_requested_language, is_language_request
from app.agents.nodes.triage_node import triage_node
from app.agents.nodes.responder_node import doctor_consultation_node


def test_language_detection_prioritizes_explicit_request():
    bhashini = BhashiniVoiceEngine()
    # Explicit user message asking for Hindi must not be overridden by client UI 'en' hint
    assert bhashini.detect_language("hindi main batao", hint="en") == "hindi"
    assert bhashini.detect_language("hindi me samjhao", hint="en") == "hindi"
    assert bhashini.detect_language("explain in english", hint="hi") == "english"
    assert bhashini.detect_language("garhwali ma batawa", hint="en") == "garhwali"


def test_intent_classification_for_language_requests():
    assert is_language_request("hindi main batao") is True
    assert is_language_request("hindi me samjhao") is True
    assert is_language_request("explain in english") is True
    assert classify_intent("hindi main batao") == "LANGUAGE_REQUEST"
    assert classify_intent("garhwali ma samjhawa") == "LANGUAGE_REQUEST"


def test_vision_scan_followed_by_hindi_explanation():
    """
    User uploaded medical scan of skin rash in English, then asked 'hindi main batao'.
    Dr. Sanjeevani must explain the skin rash inspection in Hindi,
    and MUST NOT reset into an empty symptom intake ('Aapko kis tarah ki takleef hai...').
    """
    vision_notes = (
        "Patient uploaded medical scan photo for symptom_skin analysis.\n"
        "Doctor (Vision Inspection):\n"
        "Title: Visual Skin / Symptom Inspection\n"
        "Key Findings: Visual inspection indicates mild inflammation or dermatological rash.\n"
        "Dosage / Instructions: Clean gently with lukewarm water, do not scratch. Wear breathable cotton clothing.\n"
        "Ayurvedic Advice: Pure natural coconut oil or mild neem decoction can soothe the affected area.\n"
        "Safety Warnings: Avoid scratching. If not improving within 48 hours or fever develops, visit your local PHC.\n"
        "Summary: Photo noted. Avoid scratching. If not improving within 48 hours or if fever develops, visit your local PHC."
    )

    state = {
        "conversation_id": "test-vision-lang-101",
        "raw_user_message": "hindi main batao",
        "normalized_message": "",
        "detected_tier": "Green",
        "clinical_flags": [],
        "retrieved_remedies": [],
        "final_reply_text": "",
        "spoken_reply_text": "",
        "escalation_triggered": False,
        "dialogue_phase": "CONCLUDED",
        "turn_count": 1,
        "consultation_notes": vision_notes,
        "vision_analysis": {
            "title": "Visual Skin / Symptom Inspection",
            "key_findings": "Visual inspection indicates mild inflammation or dermatological rash.",
            "dosage_instructions": "Clean gently with lukewarm water, do not scratch. Wear breathable cotton clothing.",
            "ayurvedic_interaction_note": "Pure natural coconut oil or mild neem decoction can soothe the affected area.",
            "safety_warnings": ["Avoid scratching. If not improving within 48 hours or fever develops, visit your local PHC."],
            "recommended_tier": "Green",
            "plain_language_summary": "Photo noted. Avoid scratching. If not improving within 48 hours or if fever develops, visit your local PHC."
        },
        "language_hint": "en",
    }

    t_out = triage_node(state)
    assert t_out["dialogue_phase"] == "CONCLUDED"
    assert t_out["detected_language"] == "hindi"

    d_out = doctor_consultation_node(t_out)
    reply = d_out["final_reply_text"]

    # Verify that it explains the skin inspection in Hindi
    assert any(w in reply for w in ["त्वचा", "चकत्ते", "सूजन", "लालिमा", "दृश्य", "जांच", "दाने", "खुजली"])
    # Verify that it gives care / treatment advice in Hindi
    assert any(w in reply for w in ["पानी", "साफ", "धोएं", "कपड़े", "सफाई", "नारियल", "नीम", "उपाय", "निर्देश", "देखभाल"])
    # MUST NOT be an empty intake question asking about symptoms
    assert "Aapko kis tarah ki takleef" not in reply
    assert "Aapko kya takleef ya lakshan mehsoos" not in reply
    # Must NOT use the word 'virgin' or 'वर्जिन'
    assert "virgin" not in reply.lower()
    assert "वर्जिन" not in reply


def test_concluded_consultation_language_switch():
    """
    If a remedy was previously given in English, and user asks 'hindi me batao',
    it must re-format the remedy card in Hindi.
    """
    notes = (
        "Patient: Gale mein khansi aur dard hai\n"
        "Doctor: **Aapki Takleef:** Gale mein khansi\n**Nuskha:** Tulsi-Mulethi Kwath"
    )
    remedies = [{
        "remedy_name": "Tulsi-Mulethi Kwath",
        "remedy_text": "Tulsi ke patte aur mulethi ko ubaal kar kadha banayein.",
        "ayurvedic_note": "Gale aur khansi mein laabhkari.",
        "source": "CCRAS Guidelines",
        "safety_check": "Safe",
    }]

    state = {
        "conversation_id": "test-lang-switch-202",
        "raw_user_message": "hindi me batao",
        "normalized_message": "",
        "detected_tier": "Green",
        "clinical_flags": [],
        "retrieved_remedies": remedies,
        "final_reply_text": "",
        "spoken_reply_text": "",
        "escalation_triggered": False,
        "dialogue_phase": "CONCLUDED",
        "turn_count": 2,
        "consultation_notes": notes,
        "language_hint": "en",
    }

    t_out = triage_node(state)
    assert t_out["dialogue_phase"] == "CONCLUDED"
    assert t_out["detected_language"] == "hindi"

    d_out = doctor_consultation_node(t_out)
    reply = d_out["final_reply_text"]
    assert "Tulsi" in reply
    assert "Aapko kis tarah ki takleef" not in reply


def test_followup_duration_question_does_not_repeat_remedies_or_panic_phc():
    """
    When patient asks a casual follow-up like 'accha, kitna din lagega iko sahi hone main',
    Dr. Sanjeevani must answer gently without repeating 'यदि 48 घंटे में सुधार न दिखे... PHC जाएँ',
    and MUST clear retrieved_remedies so the giant prescription card is not duplicated.
    """
    vision_notes = (
        "Doctor (Vision Inspection):\n"
        "Title: Visual Skin / Symptom Inspection\n"
        "Key Findings: Visual inspection indicates mild inflammation or dermatological rash.\n"
        "Care guidelines: Gungune paani se safai, khujlana nahi, shuddh nariyal tel ya neem paani lagana."
    )
    state = {
        "conversation_id": "test-followup-303",
        "raw_user_message": "accha, kitna din lagega iko sahi hone main",
        "normalized_message": "",
        "detected_tier": "Green",
        "clinical_flags": [],
        "retrieved_remedies": [{
            "remedy_name": "त्वचा देखभाल (आयुर्वेदिक लेप)",
            "remedy_text": "शुद्ध नारियल तेल लगाएं।",
            "is_topical": True
        }],
        "final_reply_text": "",
        "spoken_reply_text": "",
        "escalation_triggered": False,
        "dialogue_phase": "CONCLUDED",
        "turn_count": 2,
        "consultation_notes": vision_notes,
        "vision_analysis": {
            "title": "Visual Skin / Symptom Inspection",
            "key_findings": "Visual inspection indicates mild inflammation or dermatological rash.",
            "recommended_tier": "Green"
        },
        "language_hint": "hi",
    }

    t_out = triage_node(state)
    assert t_out["dialogue_phase"] == "CONCLUDED"

    d_out = doctor_consultation_node(t_out)
    reply = d_out["final_reply_text"]

    # Must provide reassuring duration estimate
    assert any(term in reply for term in ["2-3", "2 से 3", "दिन"])
    # Must NOT re-attach remedies to this follow-up conversational turn
    assert d_out["retrieved_remedies"] == []
    # Must NOT contain awkward word 'virgin' or 'वर्जिन'
    assert "virgin" not in reply.lower()
    assert "वर्जिन" not in reply
