from app.agents.state import AgentState
from app.config import settings
from app.agents.nodes.retriever_node import retriever_node
from langchain_core.messages import SystemMessage, HumanMessage


def get_llm():
    """Initializes LLM client with automatic failover between Groq and Gemini."""
    if settings.PRIMARY_LLM_PROVIDER == "groq" and settings.GROQ_API_KEY:
        try:
            from langchain_groq import ChatGroq
            return ChatGroq(
                api_key=settings.GROQ_API_KEY,
                model=settings.GROQ_MODEL,
                temperature=0.3,
                max_tokens=350,
                reasoning_effort="none",
            )
        except Exception as e:
            print(f"[LLM] Groq init failed: {e}")

    if settings.GEMINI_API_KEY:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(
                google_api_key=settings.GEMINI_API_KEY,
                model=settings.GEMINI_MODEL,
                temperature=0.3,
            )
        except Exception as e:
            print(f"[LLM] Gemini init failed: {e}")

    print("[LLM] WARNING: No LLM configured. Running in deterministic fallback mode.")
    return None


def _try_llm(llm, messages) -> str | None:
    """Calls the LLM and returns content string, or None on failure."""
    try:
        res = llm.invoke(messages)
        return str(res.content).strip()
    except Exception as e:
        print(f"[LLM] Inference error: {type(e).__name__}: {e}")
        return None


CONSULTATION_SYSTEM = """Tu Dr. Sanjeevani hai — ek pyaari, samajhdaar gaon ki doctor jo Uttarakhand mein rehti hai.

Tera kaam hai patient ki puri baat sunna, phir ek safe Ayurvedic nuskha suggest karna.

RULES — inhe ZAROOR follow karo:
1. Sirf HINDI ya HINGLISH mein bolna.
2. Har message mein SIRF EK hi sawaal poochna.
3. Ek message mein max 2 chhoti sentences — chhota aur seedha.
4. Koi medical jargon nahi — simple aam bhasha mein.
5. Warm aur caring tone rakhna.
6. Koi bhi dawa SUGGEST NAHI KARNA jab tak consultation chal raha hai.

CONSULTATION FLOW — in baaton ka pata lagana hai (ek-ek karke):
- Mukhya lakshan kya hai
- Yeh kab se hai
- Saath mein aur koi lakshan toh nahi (jaise bukhar, kamzori, chakkar)
- High BP, acidity, ya pregnancy toh nahi

JAB SARI ZAROORI JAANKARI MIL JAYE:
Apne jawab ke BILKUL AAKHIR MEIN sirf yeh likho:
##CONCLUDE##

##CONCLUDE## tab hi likho jab in sab ka jawab mil gaya ho:
✓ Mukhya lakshan pata hai
✓ Duration pata hai
✓ Saath ke lakshan poochh liye
✓ Comorbidities (BP, acidity, pregnancy) poochh li"""


def _format_concluded_remedy(state: AgentState, llm) -> AgentState:
    """Retrieves safe AYUSH remedy and formats final prescription output."""
    remedies = state.get("retrieved_remedies", [])
    user_msg = state.get("normalized_message", "")
    notes = state.get("consultation_notes", user_msg)

    if not remedies:
        state["final_reply_text"] = (
            "Aapki puri baat sun li.\n\n"
            "Is waqt mere paas aapki takleef ke liye verified nuskha nahi mila.\n"
            "Kripya **PHC** ya **104** par sampark karein."
        )
        return state

    remedy = remedies[0]

    if llm:
        system_prompt = (
            "Tu Dr. Sanjeevani hai. Patient ki poori jaanch ke baad ek "
            "safe Ayurvedic nuskha batana hai. Sirf HINDI ya HINGLISH mein likh.\n\n"
            "Bilkul is format mein likho:\n"
            "**Aapki Takleef:** [ek line mein mukhya lakshan]\n\n"
            "**Nuskha:** [nuskhe ka naam]\n\n"
            "**Kaise Banayein:**\n[simple steps]\n\n"
            "**Kab Tak Lein:** [khuraak]\n\n"
            "**Dhyan Rakhein:** [safety note]\n\n"
            "2 din mein aaram na aaye toh **104** par call karein ya **PHC** jaayein."
        )
        if state.get("detected_language") == "garhwali":
            system_prompt = system_prompt.replace("Sirf HINDI ya HINGLISH mein likh", "Sirf GARHWALI bhasha mein likh")
            g_ctx = "\n\nGarhwali Language Reference Context:\n" + "\n---\n".join(state.get("garhwali_context", []))
            system_prompt += g_ctx

        user_prompt = (
            f"Patient ki jaankari:\n{notes}\n\n"
            f"Verified Nuskha:\n"
            f"Naam: {remedy.get('remedy_name', '')}\n"
            f"Tarika: {remedy.get('remedy_text', '')}\n"
            f"Ayurvedic Faida: {remedy.get('ayurvedic_note', '')}\n"
            f"Safety: {remedy.get('safety_check', 'Verified safe')}"
        )
        reply = _try_llm(llm, [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ])
        if reply:
            state["final_reply_text"] = reply
            return state

    # Deterministic fallback
    state["final_reply_text"] = (
        f"**Nuskha:** {remedy.get('remedy_name', '')}\n\n"
        f"{remedy.get('remedy_text', '')}\n\n"
        f"_{remedy.get('ayurvedic_note', '')}_\n\n"
        "2 din mein aaram na aaye toh **104** par call karein ya **PHC** jaayein."
    )
    return state


def doctor_consultation_node(state: AgentState) -> AgentState:
    phase    = state.get("dialogue_phase", "GREETING")
    tier     = state.get("detected_tier", "Green")
    user_msg = state.get("normalized_message", "")
    notes    = state.get("consultation_notes", "")
    llm      = get_llm()

    # 1. GREETING
    if phase == "GREETING":
        state["retrieved_remedies"] = []
        state["final_reply_text"] = (
            "Namaste! Main Sanjeevani hoon.\n\n"
            "Aapko kya takleef ho rahi hai?"
        )
        return state

    # 2. GUARDRAIL
    if phase == "GUARDRAIL_BLOCKED":
        state["retrieved_remedies"] = []
        state["final_reply_text"] = (
            "Main sirf swasthya sambandhi sawaalon ka jawab de sakti hoon.\n"
            "Kya aapko koi takleef ya lakshan hai?"
        )
        return state

    # 3. YELLOW tier
    if tier == "Yellow":
        state["retrieved_remedies"] = []
        state["final_reply_text"] = (
            "Aapke lakshan thodi gehri jaanch maangte hain.\n\n"
            "Agar bukhar, tez dard ya ulti **3 din se zyada** hai — "
            "toh **104** par call karein ya nazdiki **PHC** jaayein."
        )
        return state

    # 4. CONSULTATION
    if phase == "CONSULTATION":
        new_note = user_msg
        updated_notes = (notes + "\n" + new_note).strip() if notes else new_note
        state["consultation_notes"] = updated_notes

        if llm:
            sys_prompt = CONSULTATION_SYSTEM
            if state.get("detected_language") == "garhwali":
                sys_prompt = sys_prompt.replace("Sirf HINDI ya HINGLISH mein bolna", "Sirf GARHWALI bhasha mein bolna")
                g_ctx = "\n\nGarhwali Language Reference Context:\n" + "\n---\n".join(state.get("garhwali_context", []))
                sys_prompt += g_ctx

            human_content = (
                f"Abhi tak patient ne yeh bataya hai:\n{updated_notes}\n\n"
                f"Patient ne abhi kaha: \"{user_msg}\"\n\n"
                "Ab aage kya poochhna chahiye? "
                "Agar sari zaroori jaankari mil gayi ho toh jawab ke "
                "aakhir mein ##CONCLUDE## likho."
            )
            reply = _try_llm(llm, [
                SystemMessage(content=sys_prompt),
                HumanMessage(content=human_content),
            ])

            if reply:
                if "##CONCLUDE##" in reply:
                    state["dialogue_phase"] = "CONCLUDED"
                    state = retriever_node(state)
                    return _format_concluded_remedy(state, llm)
                else:
                    state["final_reply_text"] = reply
                    return state

        # Deterministic fallback when no LLM
        notes_lower = updated_notes.lower()
        if "din" not in notes_lower:
            state["final_reply_text"] = "Samajh gaya. Yeh takleef kitne dinon se hai?"
        elif "bukhar" not in notes_lower and "kamzori" not in notes_lower:
            state["final_reply_text"] = "Theek hai. Kya saath mein bukhar ya kamzori bhi hai?"
        elif "bp" not in notes_lower and "acidity" not in notes_lower and "pregnancy" not in notes_lower:
            state["final_reply_text"] = (
                "Achha. Kya aapko pehle se **High BP**, **acidity** ya **pregnancy** ki dikkat hai?"
            )
        else:
            state["dialogue_phase"] = "CONCLUDED"
            state = retriever_node(state)
            return _format_concluded_remedy(state, None)

        return state

    # 5. CONCLUDED
    if phase == "CONCLUDED":
        if not state.get("retrieved_remedies"):
            state = retriever_node(state)
        return _format_concluded_remedy(state, llm)

    return state