from app.agents.state import AgentState
from app.core.sarvam_translate import sarvam_translate_client, get_sarvam_language_code

def emergency_node(state: AgentState) -> AgentState:
    state["retrieved_remedies"] = []
    lang = state.get("detected_language", "hindi")

    base_msg = (
        "आपातकालीन चेतावनी: गंभीर और जानलेवा लक्षण पाए गए हैं। "
        "घरेलू नुस्खों पर निर्भर न रहें। मरीज को आरामदायक स्थिति में रखें, "
        "और तुरंत 108 एम्बुलेंस को कॉल करें या निकटतम अस्पताल ले जाएं।"
    )

    if lang == "garhwali":
        state["final_reply_text"] = (
            "आपातकालीन चेतावनी! गम्भीर लक्ष्ण छन। "
            "घरेलू नुस्खा नी आज़मावा। तुरंत 108 एम्बुलेंस बुलाओ या अस्पताल जावा।"
        )
    elif lang in ("hindi", "hi"):
        state["final_reply_text"] = base_msg
    else:
        target_code = get_sarvam_language_code(lang)
        state["final_reply_text"] = sarvam_translate_client.translate_text_sync(
            base_msg, source_language_code="hi-IN", target_language_code=target_code
        )
    return state