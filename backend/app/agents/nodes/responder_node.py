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
                max_tokens=1200,
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
            curated_ctx = bhashini_engine.get_curated_garhwali_context(notes, is_devanagari)
            if is_devanagari:
                system_prompt = (
                    f"{guidance}\n\n"
                    "रोगी की पूरी जांच (क्लिनिकल आंकलन) के बाद एक सुरक्षित आयुर्वेदिक नुस्खा बताना है।\n"
                    "पूरा उत्तर शुद्ध गढ़वाली भाषा (देवनागरी लिपि) में लिखो।\n"
                    "नियम: 'में' की जगह 'मा', 'के साथ' की जगह 'दगड़', 'नहीं' की जगह 'नी' का प्रयोग करें।\n\n"
                    "बिल्कुल यै प्रारूप (format) मा लिखा:\n"
                    "**त्वरि तकलीफ:** [एक लाइन मा]\n\n"
                    "**हमार आंकलन (जांच):** [क्लिनिकल कारण गढ़वाली मा, जैसे थकान/स्याल से साधारण मुंड पीड़]\n\n"
                    "**नुस्खा:** [नुस्खे कु नाम]\n\n"
                    "**कन्नि बणावा (तरीका):**\n[सरल कदम]\n\n"
                    "**कब लीणा:** [खुराक]\n\n"
                    "**ध्यान रखा:** [सुरक्षा सावधानी]\n\n"
                    "2 दिन मा आराम नी आला त **104** पर कॉल करा या **PHC** जावा।\n\n"
                    f"संदर्भ नमूना:\n{curated_ctx}"
                )
            else:
                system_prompt = (
                    f"{guidance}\n\n"
                    "Tu Dr. Sanjeevani chha. Patient ki poori jaanch aur clinical diagnosis ke baad ek safe Ayurvedic nuskha batana hai. "
                    "Sirf shuddh GARHWALI bhasha (Roman script) mein bol aur likh.\n"
                    "STRICT RULES: Use 'ma' (never 'mein'), 'dagad' (never 'ke saath'), 'bati' (never 'se'), 'ni' (never 'nahi')!\n\n"
                    "Format:\n"
                    "**Twari Takleef:** [ek line ma mukhya lakshan]\n\n"
                    "**Jaanch (Clinical Assessment):** [sambhavit kaaran/diagnosis in natural Garhwali]\n\n"
                    "**Nuskha:** [nuskhe ku naam]\n\n"
                    "**Kanna Banawa (Tarika):**\n[simple steps in Garhwali]\n\n"
                    "**Kaba Leena (Khuraak):** [dosage]\n\n"
                    "**Dhyan Rakha:** [safety note]\n\n"
                    "2 din ma aaram ni aala toh **104** par call kara ya **PHC** jaawa.\n\n"
                    f"Reference Exemplar:\n{curated_ctx}"
                )
        elif lang == "english":
            system_prompt = (
                "You are Dr. Sanjeevani, a caring community doctor. "
                "Provide the clinical diagnosis/assessment followed by verified safe Ayurvedic home supportive care in clear English.\n\n"
                "Strictly follow this format:\n"
                "**Your Condition:** [one line summary]\n\n"
                "**Clinical Assessment:** [probable diagnosis/cause based on symptoms discussed]\n\n"
                "**Remedy:** [remedy name]\n\n"
                "**How to Prepare:**\n[simple steps]\n\n"
                "**When to Take:** [dosage and frequency]\n\n"
                "**Precautions:** [safety caution]\n\n"
                "If symptoms do not improve within 2 days, please call **104** or visit your nearest **PHC**."
            )
        else:
            system_prompt = (
                "Tu Dr. Sanjeevani hai. Patient ki poori jaanch aur clinical diagnosis ke baad ek "
                "safe Ayurvedic nuskha batana hai. Sirf HINDI ya HINGLISH mein likh.\n\n"
                "Bilkul is format mein likho:\n"
                "**Aapki Takleef:** [ek line mein mukhya lakshan]\n\n"
                "**Sambhavit Jaanch (Diagnosis):** [clinical assessment: kya samasya lagti hai aur kyu, e.g. thakan ya sardi se hone wala sadharan sar dard]\n\n"
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

    # Deterministic fallback with structured clinical assessment
    notes_lower = notes.lower()
    if any(w in notes_lower for w in ("mund", "sar dard", "headache", "peed", "peer")):
        diag_garh_dev = "रात बटि मुंड मा पीर और थकावट छ। स्याल या थकान से साधारण मुंड पीड़ (Tension Headache) लगणु छ।"
        diag_garh_rom = "Kal bati mund ma peed aur thakawat chha. Syal ya thakawat se aam mund pid (Tension Headache) lagnu chha."
        diag_hin = "Thakan, sardi ya mansik tanav se hone wala sadharan sar dard (Tension Headache)"
        diag_eng = "Mild tension or fatigue-induced headache"
    elif any(w in notes_lower for w in ("pet", "stomach", "abdomen", "gas", "jalan", "marod", "pait")):
        diag_garh_dev = "खान-पान मा असंतुलन या अपच से पैट मा जलन और मरोड़ लगणु छ।"
        diag_garh_rom = "Khan-paan ma asantulan ya gas se pet ma jalan aur marod lagnu chha."
        diag_hin = "Khan-paan mein asantulan ya gas se pet dard (Indigestion / Gastritis)"
        diag_eng = "Mild gastritis or indigestion"
    elif any(w in notes_lower for w in ("bukhar", "fever", "thand", "syal", "taap")):
        diag_garh_dev = "मौसमी बदलाव और स्याल से साधारण बुखार (Mild Seasonal Fever) लगणु छ।"
        diag_garh_rom = "Mausami badlav aur syal se aam bukhar (Mild Seasonal Pyrexia) lagnu chha."
        diag_hin = "Mausami badlav ya thakan se halka bukhar (Mild Seasonal Fever)"
        diag_eng = "Mild seasonal viral pyrexia"
    elif any(w in notes_lower for w in ("khang", "khansi", "cough", "gala", "kanth")):
        diag_garh_dev = "स्याल और सर्दी से सूखी खंग और गाळ मा खराश लगणी छ।"
        diag_garh_rom = "Syal aur sardi se sukhi khang aur gala ma kharash lagnu chha."
        diag_hin = "Sardi-zukham se gale mein kharash aur khansi (Common Cold / Pharyngitis)"
        diag_eng = "Common viral upper respiratory irritation"
    else:
        diag_garh_dev = "शारीरिक थकावट और कमजोरी से सामान्य अस्वस्थता लगणी छ।"
        diag_garh_rom = "Sharirik thakawat aur kamzori se aam asuvidha lagnu chha."
        diag_hin = "Sharirik thakan aur aam asuvidha"
        diag_eng = "Physical fatigue and mild discomfort"

    if lang == "garhwali":
        if is_devanagari:
            state["final_reply_text"] = (
                f"**त्वरि तकलीफ:** {user_msg or 'शारीरिक अस्वस्थता'}\n\n"
                f"**हमार आंकलन (जांच):** {diag_garh_dev}\n\n"
                f"**नुस्खा:** {remedy.get('remedy_name', '')}\n\n"
                f"**कन्नि बणावा (तरीका):**\n{remedy.get('remedy_text', '')}\n\n"
                f"**आयुर्वेदिक लाभ:** {remedy.get('ayurvedic_note', '')}\n\n"
                "**ध्यान रखा:** 2 दिन मा आराम नी आला त **104** पर कॉल करा या **PHC** जावा।"
            )
        else:
            state["final_reply_text"] = (
                f"**Twari Takleef:** {user_msg or 'Sharirik asuvidha'}\n\n"
                f"**Jaanch (Clinical Assessment):** {diag_garh_rom}\n\n"
                f"**Nuskha:** {remedy.get('remedy_name', '')}\n\n"
                f"**Kanna Banawa (Tarika):**\n{remedy.get('remedy_text', '')}\n\n"
                f"**Ayurvedic Laabh:** {remedy.get('ayurvedic_note', '')}\n\n"
                "**Dhyan Rakha:** 2 din ma aaram ni aala toh **104** par call kara ya **PHC** jaawa."
            )
    elif lang == "english":
        state["final_reply_text"] = (
            f"**Your Condition:** {user_msg or 'Reported symptoms'}\n\n"
            f"**Clinical Assessment:** {diag_eng}\n\n"
            f"**Remedy:** {remedy.get('remedy_name', '')}\n\n"
            f"**How to Prepare:**\n{remedy.get('remedy_text', '')}\n\n"
            f"**Ayurvedic Rationale:** {remedy.get('ayurvedic_note', '')}\n\n"
            "**Precautions:** If no relief in 2 days, please call **104** or visit your nearest **PHC**."
        )
    else:
        state["final_reply_text"] = (
            f"**Aapki Takleef:** {user_msg or 'Bataaye gaye lakshan'}\n\n"
            f"**Sambhavit Jaanch (Diagnosis):** {diag_hin}\n\n"
            f"**Nuskha:** {remedy.get('remedy_name', '')}\n\n"
            f"**Kaise Banayein:**\n{remedy.get('remedy_text', '')}\n\n"
            f"**Ayurvedic Labh:** {remedy.get('ayurvedic_note', '')}\n\n"
            "**Dhyan Rakhein:** 2 din mein aaram na aaye toh **104** par call karein ya **PHC** jaayein."
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
        turn_count = state.get("turn_count", 1)
        patient_text = raw_msg or user_msg

        # Maintain clear dialogue turns with speaker labels so LLM knows past context
        new_entry = f"Patient: {patient_text}"
        if notes:
            updated_notes = f"{notes}\n{new_entry}"
        else:
            updated_notes = new_entry
        state["consultation_notes"] = updated_notes

        # Dynamically fetch curated Garhwali reference exemplars if in Garhwali mode
        if lang == "garhwali":
            query_term = f"{raw_msg} {user_msg} {notes}"
            curated_ctx = bhashini_engine.get_curated_garhwali_context(query_term, is_devanagari)
            state["garhwali_context"] = [curated_ctx] if curated_ctx else []

        # Clinical intake controls:
        # - Turn 1: NEVER conclude. Must investigate the patient's specific symptom with clinical curiosity.
        # - Turn 2: Follow-up on severity, duration, or symptom-relevant warning signs.
        # - Turn 3+: Conclude with clinical diagnosis assessment and supportive home care.
        can_conclude = (turn_count >= 2)
        force_conclude = (turn_count >= 3)

        if llm:
            if lang == "garhwali":
                guidance = bhashini_engine.get_garhwali_guidance(is_devanagari)
                if is_devanagari:
                    sys_prompt = (
                        f"{guidance}\n\n"
                        "त्वरि भूमिका: तुम उत्तराखंड कि दयालु, अनुभवी डॉक्टर 'संजीवनी' छौ।\n\n"
                        "क्लिनिकल जांच नियम (शुद्ध गढ़वाली):\n"
                        "1. पहली बारी मा बिना जांच के तुरंत नुस्खा या दवा कभी मत द्या! Turn 1 पर ##CONCLUDE## कभी मत लिखा।\n"
                        "2. रोगी के लक्षण के अनुसार शुद्ध गढ़वाली मा सवाल पूछा:\n"
                        "   - मुंड पीड़: पूछा पीड़ एक तरफ छ या पूरा मुंड मा, कब बटि छ, और क्या उलटी या चक्कर भी छन?\n"
                        "   - बुखार: पूछा कतगा दिन बटि छ, क्या स्याल/कपकपी या बदन मा पीर भी छ?\n"
                        "   - पैट पीर: पूछा पैट मा कख पीर छ (ऊपर या नीचें), जलन छ या मरोड़, उलटी या दस्त त नी छन?\n"
                        "   - खंग (खांसी): पूछा सूखी खंग छ या बलगम, सांस फुलणी त नी छ?\n"
                        "3. कभी भी 'में' (मा लिखो), 'के साथ' (दगड़ लिखो), 'नहीं' (नी लिखो) जैसे हिंदी शब्द मत लिखो!\n"
                        "4. Turn 1 पर लक्षण समझा (NO ##CONCLUDE##)। Turn 2 पर खतरे की जांच करा। Turn 3 पर आखिर मा ##CONCLUDE## लिखा।\n\n"
                        f"संदर्भ नमूना:\n{curated_ctx}"
                    )
                else:
                    sys_prompt = (
                        f"{guidance}\n\n"
                        "Twari Bhumika: Tu Dr. Sanjeevani chha — Uttarakhand ki samajhdaar, mamtamayi gaon ki doctor.\n\n"
                        "CLINICAL DIAGNOSIS GUIDELINES (Authentic Garhwali):\n"
                        "1. Pehli baari ma BINA JAANCH ke turant nuskha ya dawa KABHI MAT DYA! Turn 1 par KABHI BHI ##CONCLUDE## mat likha.\n"
                        "2. Sawaal shuddh Garhwali ma poocha:\n"
                        "   - Mund Peed: Poocha peed kaba bati ho rahyu chha, ek taraf chha ya poora mund ma, aur kya ulti ya bhaunr (chakkar) bhi chha?\n"
                        "   - Bukhar: Poocha katga din bati chha, kya syal/kapkapi ya badan ma peer bhi lagni chha?\n"
                        "   - Pet ma peed: Poocha kakh peed chha, jalan chha ya marod, ulti ya dast toh ni chhan?\n"
                        "   - Khang (cough): Poocha sukhi khang chha ya balgham aaundu chha, saans phulnu toh ni chha?\n"
                        "3. KABHI BHI Hindi postpositions mat likho: Use 'ma' (not mein), 'dagad' (not ke saath), 'bati' (not se), 'ni' (not nahi)!\n"
                        "4. Turn 1 par lakshan samjha (NO ##CONCLUDE##). Turn 2 par warning signs check kara. Turn 3 par aakhir ma ##CONCLUDE## likha.\n\n"
                        f"Reference Exemplar:\n{curated_ctx}"
                    )
            elif lang == "english":
                sys_prompt = (
                    "You are Dr. Sanjeevani — an intelligent, compassionate rural physician in Uttarakhand.\n\n"
                    "CLINICAL DIAGNOSIS GUIDELINES:\n"
                    "1. NEVER prescribe on the very first turn without prior clinical investigation. Do NOT output ##CONCLUDE## on Turn 1.\n"
                    "2. Do NOT ask generic pre-defined checklists (like pregnancy, BP, acidity) unless clinically relevant to the complaint!\n"
                    "3. Ask intelligent, symptom-specific questions based on what the patient presented:\n"
                    "   - For Headache: ask location (unilateral/bilateral), severity, duration, and associated red-flags (nausea, visual changes, neck stiffness).\n"
                    "   - For Fever: ask duration, chills/rigors, cough, sore throat, or body ache.\n"
                    "   - For Abdominal pain: ask quadrant location, crampy vs burning, relation to food, vomiting or bowel changes.\n"
                    "4. Maximum 2 intake questions. On Turn 3 (or when enough diagnostic context is gathered), output ##CONCLUDE## at the end."
                )
            else:
                sys_prompt = (
                    "Tu Dr. Sanjeevani hai — Uttarakhand ki samajhdaar, anubhavi aur mamtamayi gaon ki doctor.\n\n"
                    "CLINICAL DIAGNOSIS GUIDELINES:\n"
                    "1. Pehli baari mein BINA JAANCH ke turant nuskha ya dawa KABHI MAT DO! Turn 1 par KABHI BHI ##CONCLUDE## mat likho.\n"
                    "2. Generic ratta-maar list (jaise bina soche pregnancy/BP/acidity) MAT poocho! Patient ke lakshan ke anusar intelligent clinical sawaal aam Hindi/Hinglish mein poocho:\n"
                    "   - Agar Sar dard (headache) hai: Poocho dard kaisa hai (aadhi side ya poora sar), kitne samay se hai, aur kya ulti, chakkar ya aankhon mein dhundhlapan hai?\n"
                    "   - Agar Bukhar hai: Poocho kitne din se hai, thand/kapkapi hai, ya badan dard aur khansi hai?\n"
                    "   - Agar Pet dard hai: Poocho dard kahan ho raha hai, jalan hai ya marod, ulti ya dast toh nahi?\n"
                    "   - Agar Khansi/Sardi hai: Poocho sukhi khansi hai ya balgham, saans lene mein dikkat toh nahi?\n"
                    "   - Agar Badan dard/thakan hai: Poocho kitne din se hai, kya bukhar bhi hai ya koi bhaari kaam kiya tha?\n"
                    "3. KABHI BHI koi aisa sawaal DUBARA NA POOCHNA jo history mein doctor pooch chuka ho ya patient bata chuka ho.\n"
                    "4. Turn 1 par lakshan samjho (NO ##CONCLUDE##). Turn 2 par warning signs check karo. Turn 3 par aakhir mein ##CONCLUDE## likho."
                )

            human_content = (
                f"Conversation History:\n{updated_notes}\n\n"
                f"Turn Count: {turn_count}/3\n"
                f"Patient just said: \"{patient_text}\"\n\n"
                "What clinical diagnostic question should be asked next? "
                "Note: Do not conclude on Turn 1. On Turn 3 or when diagnosis is clear, output ##CONCLUDE## at the end."
            )
            reply = _try_llm(llm, [
                SystemMessage(content=sys_prompt),
                HumanMessage(content=human_content),
            ])

            if reply:
                # Conclude ONLY if at least Turn 2 and (##CONCLUDE## signaled OR force_conclude at Turn 3)
                if can_conclude and ("##CONCLUDE##" in reply or force_conclude):
                    state["dialogue_phase"] = "CONCLUDED"
                    state = retriever_node(state)
                    return _format_concluded_remedy(state, llm)
                else:
                    # Strip accidental ##CONCLUDE## on Turn 1 so user is not cut off prematurely
                    clean_reply = reply.replace("##CONCLUDE##", "").strip()
                    # Record the doctor's question in the dialogue history
                    state["consultation_notes"] = f"{updated_notes}\nDoctor: {clean_reply}"
                    state["final_reply_text"] = clean_reply
                    return state

        # Intelligent deterministic fallback when no LLM
        notes_lower = updated_notes.lower()
        if not can_conclude:
            # Turn 1: Symptom-tailored follow-up
            if any(w in notes_lower for w in ("mund", "sar dard", "headache", "peed", "peer")):
                if lang == "garhwali":
                    if is_devanagari:
                        reply = "त्वरि तकलीफ सुणी ली। मुंड पीड़ कब बटि छ? एक तरफ छ या पूरा मुंड मा, और क्या उलटी या चक्कर भी छन?"
                    else:
                        reply = "Twari takleef suni li. Mund pid kaba bati ho rahyu chha? Ek taraf chha ya poora mund ma, aur kya ulti ya bhaunr (chakkar) bhi chha?"
                elif lang == "english":
                    reply = "I understand. Is the headache across your entire head or on one side, and are you having any dizziness or nausea?"
                else:
                    reply = "Maine aapki takleef sun li. Sar dard poore sar mein hai ya aadhi side, aur kya chakkar ya ulti jaisa lag raha hai?"
            elif any(w in notes_lower for w in ("pet", "stomach", "tummy", "abdomen", "pait", "marod", "krodh")):
                if lang == "garhwali":
                    if is_devanagari:
                        reply = "पैट मा पीर कख हो रयु छ — ऊपर या नीचें? क्या जलन छ या मरोड़, और क्या उलटी या दस्त भी लग्यूँ छ?"
                    else:
                        reply = "Pet ma peed kakh ho rahyu chha — upar ya neeche? Jalan chha ya marod, aur kya ulti ya dast bhi lagyu chha?"
                elif lang == "english":
                    reply = "Where exactly in your stomach is the pain, and do you have any vomiting or loose stools?"
                else:
                    reply = "Pet mein dard kis taraf hai, aur kya ulti ya dast ki samasya ho rahi hai?"
            elif any(w in notes_lower for w in ("bukhar", "fever", "thand", "syal", "taap")):
                if lang == "garhwali":
                    if is_devanagari:
                        reply = "बुखार कतगा दिन बटि छ, और क्या स्याल, कपकपी या बदन मा पीर भी लगणी छ?"
                    else:
                        reply = "Bukhar katga din bati chha, aur kya syal, kapkapi ya badan ma peer bhi lagni chha?"
                elif lang == "english":
                    reply = "How many days have you had this fever, and do you have chills or body ache?"
                else:
                    reply = "Bukhar kitne din se hai, aur kya kapkapi ya badan mein dard bhi mehsoos ho raha hai?"
            elif any(w in notes_lower for w in ("khang", "khansi", "cough", "gala", "kanth")):
                if lang == "garhwali":
                    if is_devanagari:
                        reply = "खंग कब बटि लगी छ? सूखी खंग छ या बलगम औंदू छ, और क्या सांस फुलणी त नी छ?"
                    else:
                        reply = "Khang kaba bati lagi chha? Sukhi khang chha ya balgham aaundu chha, aur kya saans phulnu toh ni chha?"
                elif lang == "english":
                    reply = "How long have you had this cough? Is it dry or with phlegm, and do you have difficulty breathing?"
                else:
                    reply = "Khansi kitne din se hai? Sukhi khansi hai ya balgham aata hai, aur saans lene mein koi dikkat toh nahi?"
            else:
                if lang == "garhwali":
                    if is_devanagari:
                        reply = "त्वरि बात समझी गे। ये तकलीफ कब बटि हो रयी छ, और दगड़ मा कोई और लक्षण भी छन?"
                    else:
                        reply = "Twari baat samajh ge. Yeh takleef kaba bati ho rahyu chha, aur dagad ma koi aur lakshan bhi chhan?"
                elif lang == "english":
                    reply = "I understand. How long have you had this discomfort, and are there any other symptoms?"
                else:
                    reply = "Samajh gaya. Yeh takleef kitne dinon se hai, aur kya saath mein koi aur lakshan bhi hain?"
            state["consultation_notes"] = f"{updated_notes}\nDoctor: {reply}"
            state["final_reply_text"] = reply
        elif turn_count < 3:
            # Turn 2: Check for warning signs
            if lang == "garhwali":
                if is_devanagari:
                    reply = "ठीक छ। क्या ये तकलीफ तेजी से बढ़णी छ या पहले बटि कोई और बड़ी बीमारी छ?"
                else:
                    reply = "Theek chha. Kya yeh takleef tezi se badhni chha ya pehle bati koi aur badi bimari chha?"
            elif lang == "english":
                reply = "Understood. Has the discomfort been worsening rapidly, or do you have any major pre-existing condition?"
            else:
                reply = "Theek hai. Kya yeh takleef tezi se badh rahi hai ya pehle se koi anya badi samasya hai?"
            state["consultation_notes"] = f"{updated_notes}\nDoctor: {reply}"
            state["final_reply_text"] = reply
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