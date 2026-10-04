from app.agents.state import AgentState
from app.core.sarvam_translate import sarvam_translate_client, get_sarvam_language_code

def emergency_node(state: AgentState) -> AgentState:
    state["retrieved_remedies"] = []
    lang = state.get("detected_language", "hindi")

    base_msg = (
        "आपातकालीन चेतावनी (EMERGENCY): गंभीर और जानलेwa लक्षण पाए गए हैं। "
        "घरेलू नुस्खों पर निर्भर न रहें। मरीज को आरामदायक स्थिति में रखें, "
        "और तुरंत 108 एम्बुलेंस को कॉल करें या निकटतम अस्पताल ले जाएं।"
    )

    if lang == "garhwali":
        body = (
            "आपातकालीन चेतावनी (EMERGENCY)! गम्भीर लक्ष्ण छन। "
            "घरेलू नुस्खा नी आज़मावा। तुरंत 108 एम्बुलेंस बुलाओ या अस्पताल जावा।"
        )
        disclaimer = "⚕️ यै सिर्फ प्रारम्भिक आपातकालीन चेतावनी छ। गम्भीर तकलीफ मा तुरंत 108 एम्बुलेंस या अस्पताल बटि सम्पर्क करा।"
    elif lang in ("hindi", "hi"):
        body = (
            "आपातकालीन चेतावनी (EMERGENCY): गंभीर और जानलेवा लक्षण पाए गए हैं। "
            "घरेलू नुस्खों पर निर्भर न रहें। मरीज को आरामदायक स्थिति में रखें, "
            "और तुरंत 108 एम्बुलेंस को कॉल करें या निकटतम अस्पताल ले जाएं।"
        )
        disclaimer = "⚕️ यह आपातकालीन सुरक्षा सूचना है, विस्तृत चिकित्सकीय विकल्प नहीं। कृपया तुरंत 108 एम्बुलेंस या निकटतम अस्पताल से संपर्क करें।"
    elif lang == "english":
        body = (
            "EMERGENCY WARNING: Critical and potentially life-threatening symptoms identified. "
            "Do not rely on home remedies. Keep the patient comfortable and immediately call "
            "108 for emergency medical assistance or proceed to the nearest hospital."
        )
        disclaimer = "⚕️ This is an emergency safety alert, not a complete medical substitute. Seek urgent professional care immediately."
    else:
        target_code = get_sarvam_language_code(lang)
        translated = sarvam_translate_client.translate_text_sync(
            base_msg, source_language_code="hi-IN", target_language_code=target_code
        )
        if "EMERGENCY" not in translated:
            translated = f"[EMERGENCY / 108]\n{translated}"
        body = translated
        disclaimer = "⚕️ Emergency clinical alert. Immediate consultation with qualified healthcare professionals is essential."

    state["disclaimer"] = disclaimer
    state["final_reply_text"] = f"{body}\n\n{disclaimer}"
    return state