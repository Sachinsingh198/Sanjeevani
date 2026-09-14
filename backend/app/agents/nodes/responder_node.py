import re
from app.agents.state import AgentState
from app.config import settings
from app.agents.nodes.retriever_node import retriever_node
from app.core.bhashini_engine import BhashiniVoiceEngine
from langchain_core.messages import SystemMessage, HumanMessage

bhashini_engine = BhashiniVoiceEngine()


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


def _format_concluded_remedy(state: AgentState, llm) -> AgentState:
    """Retrieves safe AYUSH remedy and formats final prescription output."""
    remedies = state.get("retrieved_remedies", [])
    user_msg = state.get("normalized_message", "")
    notes = state.get("consultation_notes", user_msg)
    lang = state.get("detected_language", "hindi")
    raw_user_msg = state.get("raw_user_message", "")
    is_devanagari = bool(re.search(r"[\u0900-\u097F]", raw_user_msg))

    if not remedies:
        if lang == "garhwali":
            if is_devanagari:
                state["final_reply_text"] = (
                    "त्वरि पूरी बात सुणी ली।\n\n"
                    "यै बखत हमर पास यै तकलीफ खातिर verified नुस्खा नी मिल पायी।\n"
                    "कृप्या **104** या **PHC** मा संपर्क करा।"
                )
            else:
                state["final_reply_text"] = (
                    "Twari poori baat suni li.\n\n"
                    "Is waqt hamare paas ye takleef khatir verified nuskha ni mil paayi.\n"
                    "Kripya **PHC** ya **104** par sampark kara."
                )
        elif lang == "english":
            state["final_reply_text"] = (
                "I have carefully heard your condition.\n\n"
                "At this moment, a verified home remedy is not available for this specific symptom.\n"
                "Please contact **PHC** or call **104** for professional medical evaluation."
            )
        else:
            state["final_reply_text"] = (
                "Aapki puri baat sun li.\n\n"
                "Is waqt mere paas aapki takleef ke liye verified nuskha nahi mila.\n"
                "Kripya **PHC** ya **104** par sampark karein."
            )
        return state

    remedy = remedies[0]

    if llm:
        if lang == "garhwali":
            guidance = bhashini_engine.get_garhwali_guidance(is_devanagari)
            g_ctx = "\n\nGarhwali Reference Context:\n" + "\n---\n".join(state.get("garhwali_context", []))
            if is_devanagari:
                system_prompt = (
                    f"{guidance}\n\n"
                    "रोगी की पूरी जांच के बाद एक सुरक्षित आयुर्वेदिक नुस्खा बताना है।\n"
                    "पूरा उत्तर सिर्फ गढ़वाली भाषा (देवनागरी लिपि) में लिखो:\n"
                    "**त्वरि तकलीफ:** [एक लाइन मा]\n\n"
                    "**नुस्खा:** [नुस्खे कु नाम]\n\n"
                    "**कन्नि बणावा (तरीका):**\n[सरल कदम]\n\n"
                    "**कब लीणा:** [खुराक]\n\n"
                    "**ध्यान रखा:** [सुरक्षा सावधानी]\n\n"
                    "2 दिन मा आराम नी आला त **104** पर कॉल करा या **PHC** जावा।"
                    f"{g_ctx}"
                )
            else:
                system_prompt = (
                    f"{guidance}\n\n"
                    "Tu Dr. Sanjeevani hai. Patient ki poori jaanch ke baad ek safe Ayurvedic nuskha batana hai. "
                    "Sirf GARHWALI bhasha (Roman script) mein bol aur likh.\n"
                    "Format:\n"
                    "**Twari Takleef:** [ek line ma mukhya lakshan]\n\n"
                    "**Nuskha:** [nuskhe ku naam]\n\n"
                    "**Kanna Banawa (Tarika):**\n[simple steps in Garhwali]\n\n"
                    "**Kaba Leena (Khuraak):** [dosage]\n\n"
                    "**Dhyan Rakha:** [safety note]\n\n"
                    "2 din ma aaram ni aala toh **104** par call kara ya **PHC** jaawa."
                    f"{g_ctx}"
                )
        elif lang == "english":
            system_prompt = (
                "You are Dr. Sanjeevani, a caring community doctor. "
                "Provide the verified safe Ayurvedic home remedy in clear, compassionate English.\n\n"
                "Strictly follow this format:\n"
                "**Your Condition:** [one line summary]\n\n"
                "**Remedy:** [remedy name]\n\n"
                "**How to Prepare:**\n[simple steps]\n\n"
                "**When to Take:** [dosage and frequency]\n\n"
                "**Precautions:** [safety caution]\n\n"
                "If symptoms do not improve within 2 days, please call **104** or visit your nearest **PHC**."
            )
        else:
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

        user_prompt = (
            f"Patient Details:\n{notes}\n\n"
            f"Verified Remedy:\n"
            f"Name: {remedy.get('remedy_name', '')}\n"
            f"Instructions: {remedy.get('remedy_text', '')}\n"
            f"Ayurvedic Benefit: {remedy.get('ayurvedic_note', '')}\n"
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
    if lang == "garhwali":
        state["final_reply_text"] = (
            f"**Nuskha:** {remedy.get('remedy_name', '')}\n\n"
            f"{remedy.get('remedy_text', '')}\n\n"
            f"_{remedy.get('ayurvedic_note', '')}_\n\n"
            "2 din ma aaram ni aala toh **104** par call kara ya **PHC** jaawa."
        )
    elif lang == "english":
        state["final_reply_text"] = (
            f"**Remedy:** {remedy.get('remedy_name', '')}\n\n"
            f"{remedy.get('remedy_text', '')}\n\n"
            f"_{remedy.get('ayurvedic_note', '')}_\n\n"
            "If no relief in 2 days, please call **104** or visit your nearest **PHC**."
        )
    else:
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
    raw_msg  = state.get("raw_user_message", "")
    notes    = state.get("consultation_notes", "")
    lang     = state.get("detected_language", "hindi")
    is_devanagari = bool(re.search(r"[\u0900-\u097F]", raw_msg))
    llm      = get_llm()

    # 1. GREETING
    if phase == "GREETING":
        state["retrieved_remedies"] = []
        if lang == "garhwali":
            if is_devanagari:
                state["final_reply_text"] = (
                    "दैणु भूला! मैं संजीवनी छौं — त्वरि गांव कि डॉक्टर।\n\n"
                    "त्वकु क्या तकलीफ हो रयु छ? आराम से बतावा।"
                )
            else:
                state["final_reply_text"] = (
                    "Dainu bhula! Main Sanjeevani chhon — twari swasthya sahayak gaon ki doctor.\n\n"
                    "Twaku kya takleef ho rahyu chha? Aaram se batava."
                )
        elif lang == "english":
            state["final_reply_text"] = (
                "Hello! I am Dr. Sanjeevani, your healthcare companion.\n\n"
                "What health concern or symptoms are you experiencing today?"
            )
        else:
            state["final_reply_text"] = (
                "Namaste! Main Sanjeevani hoon — aapki gaon ki doctor.\n\n"
                "Aapko kya takleef ho rahi hai? Aaram se batayein."
            )
        return state

    # 2. GUARDRAIL
    if phase == "GUARDRAIL_BLOCKED":
        state["retrieved_remedies"] = []
        if lang == "garhwali":
            state["final_reply_text"] = (
                "Main sirf swasthya aur bimaari sambandhi sawaalon ma madad kar sakdi chhon.\n"
                "Kya twaku koi sharirik takleef ya lakshan chha?"
            )
        elif lang == "english":
            state["final_reply_text"] = (
                "I can only help with health and medical symptom questions.\n"
                "Are you experiencing any physical discomfort or illness?"
            )
        else:
            state["final_reply_text"] = (
                "Main sirf swasthya sambandhi sawaalon ka jawab de sakti hoon.\n"
                "Kya aapko koi takleef ya lakshan hai?"
            )
        return state

    # 3. YELLOW tier
    if tier == "Yellow":
        state["retrieved_remedies"] = []
        if lang == "garhwali":
            state["final_reply_text"] = (
                "Twara lakshan thodi gehri jaanch maangni chhan.\n\n"
                "Agar bukhar, tez bhyo ya ulti **3 din se jaada** chha — "
                "toh turant **104** par call kara ya nazdiki **PHC** jaawa."
            )
        elif lang == "english":
            state["final_reply_text"] = (
                "Your symptoms require closer clinical attention.\n\n"
                "If fever, severe pain, or vomiting persists for **more than 3 days**, "
                "please call **104** or visit your nearest **Primary Health Centre (PHC)**."
            )
        else:
            state["final_reply_text"] = (
                "Aapke lakshan thodi gehri jaanch maangte hain.\n\n"
                "Agar bukhar, tez dard ya ulti **3 din se zyada** hai — "
                "toh **104** par call karein ya nazdiki **PHC** jaayein."
            )
        return state

    # 4. CONSULTATION
    if phase == "CONSULTATION":
        new_note = user_msg or raw_msg
        updated_notes = (notes + "\n" + new_note).strip() if notes else new_note
        state["consultation_notes"] = updated_notes

        # Dynamically fetch Garhwali reference docs if in Garhwali mode
        if lang == "garhwali":
            from app.core.hybrid_rag import HybridRemedyStore
            garhwali_store = HybridRemedyStore()
            query_term = raw_msg + " " + user_msg
            g_docs = garhwali_store.search_garhwali(query_term, limit=3)
            state["garhwali_context"] = [d.get("content", "") for d in g_docs]

        if llm:
            if lang == "garhwali":
                guidance = bhashini_engine.get_garhwali_guidance(is_devanagari)
                g_ctx = "\n\nGarhwali Language Reference Context:\n" + "\n---\n".join(state.get("garhwali_context", []))
                sys_prompt = (
                    f"{guidance}\n"
                    "Tu Dr. Sanjeevani hai — Uttarakhand ki gaon ki pyari doctor.\n"
                    "Patient ki baat sun kar GARHWALI mein ek chhota sawaal poochh.\n"
                    "RULES:\n"
                    "1. Sirf GARHWALI bhasha mein bolna.\n"
                    "2. Har message mein SIRF EK hi sawaal poochna.\n"
                    "3. Ek message mein max 2 sentences.\n"
                    "4. Koi dawai abhi SUGGEST NAHI KARNA.\n\n"
                    "FLOW: lakshan -> kitna din hwai ge -> saath ma bukhar/kamzori -> BP/acidity/pregnancy.\n"
                    "JAB SARI ZAROORI JAANKARI MIL JAYE, aakhir mein likho: ##CONCLUDE##"
                    f"{g_ctx}"
                )
            elif lang == "english":
                sys_prompt = (
                    "You are Dr. Sanjeevani — a compassionate village doctor in Uttarakhand.\n"
                    "Listen to the patient's symptoms and conduct a gentle intake in English.\n"
                    "RULES:\n"
                    "1. Speak in warm, simple English.\n"
                    "2. Ask strictly ONE question at a time.\n"
                    "3. Maximum 2 short sentences per message.\n"
                    "4. Do NOT prescribe any remedy while intake is ongoing.\n\n"
                    "FLOW: Chief complaint -> Duration -> Associated symptoms (fever, weakness) -> Pre-existing conditions (BP, acidity, pregnancy).\n"
                    "WHEN ALL REQUIRED INFO IS GATHERED, append ##CONCLUDE## at the very end."
                )
            else:
                sys_prompt = (
                    "Tu Dr. Sanjeevani hai — ek pyaari, samajhdaar gaon ki doctor jo Uttarakhand mein rehti hai.\n"
                    "Tera kaam hai patient ki puri baat sunna, phir ek safe Ayurvedic nuskha suggest karna.\n"
                    "RULES:\n"
                    "1. Sirf HINDI ya HINGLISH mein bolna.\n"
                    "2. Har message mein SIRF EK hi sawaal poochna.\n"
                    "3. Ek message mein max 2 chhoti sentences.\n"
                    "4. Koi medical jargon nahi — simple aam bhasha mein.\n"
                    "5. Koi bhi dawa SUGGEST NAHI KARNA jab tak consultation chal raha hai.\n\n"
                    "FLOW: Mukhya lakshan -> Duration -> Saath ke lakshan (bukhar, kamzori) -> BP/acidity/pregnancy.\n"
                    "JAB SARI ZAROORI JAANKARI MIL JAYE, aakhir mein likho: ##CONCLUDE##"
                )

            human_content = (
                f"Patient History & Notes:\n{updated_notes}\n\n"
                f"Patient just said: \"{raw_msg or user_msg}\"\n\n"
                "What single question should be asked next? "
                "If all necessary intake information is already known, append ##CONCLUDE## at the end."
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
        if "din" not in notes_lower and "day" not in notes_lower:
            if lang == "garhwali":
                state["final_reply_text"] = "Samajh ge. Yeh takleef kitna din se ho rahyu chha?"
            elif lang == "english":
                state["final_reply_text"] = "I understand. How many days have you had this discomfort?"
            else:
                state["final_reply_text"] = "Samajh gaya. Yeh takleef kitne dinon se hai?"
        elif "bukhar" not in notes_lower and "kamzori" not in notes_lower and "fever" not in notes_lower:
            if lang == "garhwali":
                state["final_reply_text"] = "Theek chha. Kya saath ma bukhar ya kamzori bhi lagni chha?"
            elif lang == "english":
                state["final_reply_text"] = "Alright. Do you also have any fever or physical weakness?"
            else:
                state["final_reply_text"] = "Theek hai. Kya saath mein bukhar ya kamzori bhi hai?"
        elif "bp" not in notes_lower and "acidity" not in notes_lower and "pregnancy" not in notes_lower:
            if lang == "garhwali":
                state["final_reply_text"] = "Kya twaku pehle se **High BP**, **acidity** ya **garbh (pregnancy)** chha?"
            elif lang == "english":
                state["final_reply_text"] = "Do you have any history of **High Blood Pressure**, **acidity**, or **pregnancy**?"
            else:
                state["final_reply_text"] = "Achha. Kya aapko pehle se **High BP**, **acidity** ya **pregnancy** ki dikkat hai?"
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