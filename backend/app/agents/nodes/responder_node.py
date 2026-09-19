import re
from app.agents.state import AgentState
from app.config import settings
from app.agents.nodes.retriever_node import retriever_node
from app.core.bhashini_engine import BhashiniVoiceEngine
from langchain_core.messages import SystemMessage, HumanMessage

bhashini_engine = BhashiniVoiceEngine()


def get_sarvam_llm():
    """Initializes Sarvam Indic LLM client via OpenAI compatible endpoint."""
    if not settings.SARVAM_API_KEY:
        return None
    try:
        from langchain_openai import ChatOpenAI
        # Note: if sarvam-30b is configured but deprecated, sarvam-105b will be used
        model_name = settings.SARVAM_CHAT_MODEL or "sarvam-30b"
        return ChatOpenAI(
            model=model_name,
            api_key=settings.SARVAM_API_KEY,
            base_url="https://api.sarvam.ai/v1",
            temperature=0.3,
        )
    except Exception as e:
        print(f"[LLM] Sarvam init failed: {e}")
        return None


def get_llm():
    """Initializes LLM client with automatic failover between Groq, Gemini, and Sarvam."""
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

    # Fallback Tier 3: Sarvam Indic LLM
    if settings.SARVAM_API_KEY:
        sarvam_llm = get_sarvam_llm()
        if sarvam_llm is not None:
            return sarvam_llm

    print("[LLM] WARNING: No LLM configured. Running in deterministic fallback mode.")
    return None


def _try_llm(llm, messages) -> str | None:
    """Calls the LLM and returns content string, or None on failure."""
    try:
        res = llm.invoke(messages)
        return str(res.content).strip()
    except Exception as e:
        print(f"[LLM] Inference error: {type(e).__name__}: {e}")
        # If model deprecation error occurs for sarvam-30b, retry with sarvam-105b
        if "sarvam" in str(e).lower() and ("deprecated" in str(e).lower() or "not found" in str(e).lower()):
            try:
                from langchain_openai import ChatOpenAI
                retry_sarvam = ChatOpenAI(
                    model="sarvam-105b",
                    api_key=settings.SARVAM_API_KEY,
                    base_url="https://api.sarvam.ai/v1",
                    temperature=0.3,
                )
                res = retry_sarvam.invoke(messages)
                return str(res.content).strip()
            except Exception as retry_err:
                print(f"[LLM] Sarvam retry error: {retry_err}")
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
    r_name = remedy.get('remedy_name', 'घरेलू नुस्खा')

    # Clinical assessment extraction for both visual card and spoken voice summary
    notes_lower = notes.lower()
    if any(w in notes_lower for w in ("mund", "sar dard", "headache", "peed", "peer")):
        diag_garh_dev = "रात बटि मुंड मा पीर और थकावट छ। स्याल या थकान से साधारण मुंड पीड़ (Tension Headache) लगणु छ।"
        diag_garh_rom = "Kal bati mund ma peed aur thakawat chha. Syal ya thakawat se aam mund pid (Tension Headache) lagnu chha."
        diag_hin = "Thakan, sardi ya mansik tanav se hone wala sadharan sar dard (Tension Headache)"
        diag_eng = "Mild tension or fatigue-induced headache"
        diag_spoken_hin = "sardi ya tanav se sadharan sar dard"
        diag_spoken_garh = "स्याल या थकान से साधारण मुंड पीड़"
        diag_spoken_rom = "syal ya thakawat se aam mund pid"
    elif any(w in notes_lower for w in ("pet", "stomach", "abdomen", "gas", "jalan", "marod", "pait")):
        diag_garh_dev = "खान-पान मा असंतुलन या अपच से पैट मा जलन और मरोड़ लगणु छ।"
        diag_garh_rom = "Khan-paan ma asantulan ya gas se pet ma jalan aur marod lagnu chha."
        diag_hin = "Khan-paan mein asantulan ya gas se pet dard (Indigestion / Gastritis)"
        diag_eng = "Mild gastritis or indigestion"
        diag_spoken_hin = "apach ya gas se pet dard"
        diag_spoken_garh = "खान-पान या गैस से पैट मा जलन"
        diag_spoken_rom = "khan-paan ya gas se pet dard"
    elif any(w in notes_lower for w in ("bukhar", "fever", "thand", "syal", "taap")):
        diag_garh_dev = "मौसमी बदलाव और स्याल से साधारण बुखार (Mild Seasonal Fever) लगणु छ।"
        diag_garh_rom = "Mausami badlav aur syal se aam bukhar (Mild Seasonal Pyrexia) lagnu chha."
        diag_hin = "Mausami badlav ya thakan se halka bukhar (Mild Seasonal Fever)"
        diag_eng = "Mild seasonal viral pyrexia"
        diag_spoken_hin = "mausami badlav se halka bukhar"
        diag_spoken_garh = "मौसमी बदलाव से साधारण बुखार"
        diag_spoken_rom = "mausami badlav se aam bukhar"
    elif any(w in notes_lower for w in ("khang", "khansi", "cough", "gala", "kanth")):
        diag_garh_dev = "स्याल और सर्दी से सूखी खंग और गाळ मा खराश लगणी छ।"
        diag_garh_rom = "Syal aur sardi se sukhi khang aur gala ma kharash lagnu chha."
        diag_hin = "Sardi-zukham se gale mein kharash aur khansi (Common Cold / Pharyngitis)"
        diag_eng = "Common viral upper respiratory irritation"
        diag_spoken_hin = "sardi se gale mein kharash aur khansi"
        diag_spoken_garh = "सर्दी से सूखी खंग और गाळ मा खराश"
        diag_spoken_rom = "sardi se khang aur gala ma kharash"
    else:
        diag_garh_dev = "शारीरिक थकावट और कमजोरी से सामान्य अस्वस्थता लगणी छ।"
        diag_garh_rom = "Sharirik thakawat aur kamzori se aam asuvidha lagnu chha."
        diag_hin = "Sharirik thakan aur aam asuvidha"
        diag_eng = "Physical fatigue and mild discomfort"
        diag_spoken_hin = "sharirik thakan aur aam asuvidha"
        diag_spoken_garh = "शारीरिक थकावट और कमजोरी"
        diag_spoken_rom = "sharirik thakawat aur kamzori"

    # Natural conversational spoken voice summary (concise, 2-3 sentences max, natural accent)
    if lang == "garhwali":
        spoken_voice_summary = (
            f"त्वरा लक्ष्णों से {diag_spoken_garh} लगणु छ। यै खातिर तुम {r_name} ले सकदा। तरीक स्क्रीन पर छ। 2 दिन मा आराम नी आला त 104 पर फोन करा।"
            if is_devanagari else
            f"Twara lakshano bati {diag_spoken_rom} lagnu chha. Yaikhatir tum {r_name} istemal kari sakda. Tarika screen par chha. 2 din ma aaram ni aala ta 104 par call kara."
        )
    elif lang == "english":
        spoken_voice_summary = (
            f"Based on your symptoms, this appears to be {diag_eng}. You can safely try {r_name}. Detailed instructions are shown on screen. If not improved in two days, please call 104 or visit the nearest PHC."
        )
    else:
        spoken_voice_summary = (
            f"Aapke bataye lakshano ke aadhar par {diag_spoken_hin} lag raha hai. Iske liye aap {r_name} le sakte hain. Iska pura tarika screen par diya gaya hai. Agar do din mein aaram na aaye toh 104 par call karein ya PHC jaayein."
        )
    state["spoken_reply_text"] = spoken_voice_summary

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
                "CRITICAL FORMATTING RULES:\n"
                "1. Keep each section clearly separated with an empty line.\n"
                "2. Under '**How to Prepare:**', write each step on its OWN line numbered 1., 2.\n"
                "3. Under '**When to Take:**', write dosage on separate lines with '- '.\n"
                "4. Under '**Precautions:**', write each safety caution on its OWN separate new line starting with '- '. Never combine bullets into one line.\n\n"
                "Strictly follow this format:\n\n"
                "**Your Condition:** [one line summary]\n\n"
                "**Clinical Assessment:** [probable diagnosis/cause based on symptoms discussed]\n\n"
                "**Remedy:** [remedy name]\n\n"
                "**How to Prepare:**\n1. [Step 1]\n2. [Step 2]\n\n"
                "**When to Take:**\n- [dosage and frequency]\n\n"
                "**Precautions:**\n- [caution 1]\n- [caution 2]\n\n"
                "If symptoms do not improve within 2 days, please call **104** or visit your nearest **PHC**."
            )
        else:
            system_prompt = (
                "Tu Dr. Sanjeevani hai. Patient ki poori jaanch aur clinical diagnosis ke baad ek "
                "safe Ayurvedic nuskha batana hai. Sirf HINDI ya HINGLISH mein likh.\n\n"
                "CRITICAL FORMATTING RULES:\n"
                "1. Har section se pehle aur baad mein ek blank line chhodhein.\n"
                "2. '**Kaise Banayein:**' ke andar har step ko ALAG nayi line par numbered list (1. ..., 2. ...) mein likhein.\n"
                "3. '**Kab Tak Lein:**' ke andar khuraak aur timing likhein (har point nayi line par '- ' se shuru karein).\n"
                "4. '**Dhyan Rakhein:**' ke andar har savdhani ko ALAG nayi line par '- ' se likhein. Kabhi bhi multiple bullets ko ek hi line mein mat milana!\n\n"
                "Bilkul is format mein likho:\n\n"
                "**Aapki Takleef:** [ek line mein mukhya lakshan]\n\n"
                "**Sambhavit Jaanch (Diagnosis):** [clinical assessment: kya samasya lagti hai aur kyu, e.g. thakan ya sardi se hone wala sadharan sar dard]\n\n"
                "**Nuskha:** [nuskhe ka naam]\n\n"
                "**Kaise Banayein:**\n1. [Step 1]\n2. [Step 2]\n\n"
                "**Kab Tak Lein:**\n- [khuraak aur samay]\n\n"
                "**Dhyan Rakhein:**\n- [savdhani 1]\n- [savdhani 2]\n\n"
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


def _clean_text_for_speech(text: str) -> str:
    """Produces clean, natural spoken speech from dialogue replies without formatting artifacts."""
    if not text:
        return ""
    t = text.replace('\u2011', '-').replace('\u2013', '-').replace('\u2014', '-')
    t = re.sub(r"https?://\S+", "", t)
    t = re.sub(r"[*_#`~>\[\]]", "", t)
    t = re.sub(r"Tier\s+(Green|Yellow|Red)[^\n]*", "", t, flags=re.I)
    t = re.sub(r"(\b\d{3}\b)\s*\([^)]*\)", r"\1", t)
    t = re.sub(
        r"(Aapki Takleef|Sambhavit Jaanch\s*\(Diagnosis\)|Nuskha|Kaise Banayein|Kab Tak Lein|Dhyan Rakhein|Safety Verified|Ayurvedic Rationale)[:\s]*",
        "",
        t,
        flags=re.I,
    )
    t = re.sub(r"(?<=\d)\s*-\s*(?=\d)", " se ", t)
    t = re.sub(r"\s+[-•*]\s+", ". ", t)
    t = re.sub(r"^\s*[-•*]\s+", "", t, flags=re.M)
    t = re.sub(r"\n+", ". ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def _limit_to_single_question(text: str) -> str:
    """
    Guarantees that spoken voice output contains strictly ONE question,
    preventing cognitive overload for patients during voice calls.
    """
    if not text:
        return ""
    clean = text.strip()
    if "?" not in clean:
        return clean

    # Split into sentences/clauses at '?'
    parts = re.split(r'(?<=\?)\s*', clean)
    if len(parts) > 1:
        return parts[0].strip()
    return clean


def _doctor_consultation_inner(state: AgentState) -> AgentState:
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
        name_match = re.search(r"(?:mera\s+naam|mera\s+name|my\s+name\s+is|main\s+hoon)\s+([A-Za-z\u0900-\u097F]+)", raw_msg, re.IGNORECASE)
        patient_name = name_match.group(1).capitalize() if name_match else ""

        if llm:
            sys_prompt = (
                "You are Dr. Sanjeevani, a compassionate, caring rural physician in Uttarakhand. "
                "The patient has greeted you or introduced themselves. "
                "Respond with a warm, welcoming greeting in the user's language (use their name if provided). "
                "Ask how they are feeling today and what physical symptoms or health concerns they have. "
                "CRITICAL: Do NOT give any diagnosis, disease assessment, or remedies yet, because the patient has not reported any symptoms."
            )
            hum_prompt = f"Patient message: \"{raw_msg}\"\nLanguage: {lang}"
            llm_reply = _try_llm(llm, [SystemMessage(content=sys_prompt), HumanMessage(content=hum_prompt)])
            if llm_reply:
                state["final_reply_text"] = llm_reply
                return state

        # Deterministic fallback
        if lang == "garhwali":
            name_txt = f"{patient_name} जी! " if patient_name else "भूला! "
            if is_devanagari:
                state["final_reply_text"] = (
                    f"दैणु {name_txt}मैं संजीवनी छौं — त्वरि गांव कि डॉक्टर।\n\n"
                    "त्वकु क्या तकलीफ या बीमारी हो रयु छ? आराम से बतावा।"
                )
            else:
                name_rom = f"{patient_name} ji! " if patient_name else "bhula! "
                state["final_reply_text"] = (
                    f"Dainu {name_rom}Main Sanjeevani chhon — twari swasthya sahayak gaon ki doctor.\n\n"
                    "Twaku kya takleef ya bimaari ho rahyu chha? Aaram se batava."
                )
        elif lang == "english":
            name_txt = f", {patient_name}" if patient_name else ""
            state["final_reply_text"] = (
                f"Hello{name_txt}! I am Dr. Sanjeevani, your healthcare companion.\n\n"
                "What health concern or symptoms are you experiencing today? Please tell me freely."
            )
        else:
            name_txt = f" {patient_name} ji" if patient_name else ""
            state["final_reply_text"] = (
                f"Namaste{name_txt}! Main Dr. Sanjeevani hoon — aapki gaon ki doctor.\n\n"
                "Aapko kya takleef ya lakshan mehsoos ho rahe hain? Aaram se batayein (jaise bukhar, sardi, pet dard, ya sar dard)."
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
        from app.core.dialogue_manager import has_symptom_mention
        has_actual_symptoms = has_symptom_mention(updated_notes) or has_symptom_mention(patient_text)

        # - Turn 1: NEVER conclude. Must investigate the patient's specific symptom with clinical curiosity.
        # - Turn 2: Follow-up on severity, duration, or symptom-relevant warning signs.
        # - Turn 3+: Conclude with clinical diagnosis assessment and supportive home care ONLY IF symptoms exist.
        can_conclude = (turn_count >= 2) and has_actual_symptoms
        force_conclude = (turn_count >= 3) and has_actual_symptoms

        if llm:
            if lang == "garhwali":
                guidance = bhashini_engine.get_garhwali_guidance(is_devanagari)
                if is_devanagari:
                    sys_prompt = (
                        f"{guidance}\n\n"
                        "त्वरि भूमिका: तुम उत्तराखंड कि दयालु, अनुभवी डॉक्टर 'संजीवनी' छौ।\n\n"
                        "क्लिनिकल जांच नियम (शुद्ध गढ़वाली):\n"
                        "1. जरूरी नियम: एक बारी मा सिर्फ और सिर्फ एक छोटा सवाल पूछा (Max 12-15 शब्द)। कभी भी एक साथ 2-3 सवाल मत पूछो!\n"
                        "2. Turn 1: सिर्फ ये पूछा कि ये तकलीफ कब बटि हो रयी छ (Duration)। Turn 1 पर ##CONCLUDE## कभी मत लिखा।\n"
                        "   - उदाहरण: 'त्वरि बात सुणी ली। मुंड पीड़ कब बटि हो रयु छ?'\n"
                        "3. Turn 2: सिर्फ एक जरूरी खतरे या लक्षण का बारे मा पूछा (Single question only)।\n"
                        "   - उदाहरण: 'ठीक छ। क्या मुंड पीड़ दगड़ चक्कर या उलटी भी छन?'\n"
                        "4. Turn 3: कोई सवाल मत पूछा। जांच खत्म करा और आखिर मा ##CONCLUDE## लिखा।\n"
                        "5. कभी भी 'में' (मा लिखो), 'के साथ' (दगड़ लिखो), 'नहीं' (नी लिखो) जैसे हिंदी शब्द मत लिखो!\n\n"
                        f"संदर्भ नमूना:\n{curated_ctx}"
                    )
                else:
                    sys_prompt = (
                        f"{guidance}\n\n"
                        "Twari Bhumika: Tu Dr. Sanjeevani chha — Uttarakhand ki samajhdaar, mamtamayi gaon ki doctor.\n\n"
                        "CLINICAL DIAGNOSIS GUIDELINES (Authentic Garhwali):\n"
                        "1. STRICT VOICE RULE: Ask strictly ONE SINGLE, SHORT QUESTION at a time (Max 15 words). Never ask multiple questions in one turn!\n"
                        "2. Turn 1 (Duration/Onset): Ask ONLY how long they have had this symptom. Do NOT output ##CONCLUDE## on Turn 1.\n"
                        "   - Example: 'Twari baat suni li. Mund pid kaba bati ho rahyu chha?'\n"
                        "3. Turn 2 (Warning Sign / Associated): Ask strictly ONE follow-up question.\n"
                        "   - Example: 'Theek chha. Kya mund pid dagad ulti ya chakkar bhi lagyu chha?'\n"
                        "4. Turn 3: Conclude consultation. Output ##CONCLUDE## at the end.\n"
                        "5. STRICT: Use 'ma' (not mein), 'dagad' (not ke saath), 'bati' (not se), 'ni' (not nahi)!\n\n"
                        f"Reference Exemplar:\n{curated_ctx}"
                    )
            elif lang == "english":
                sys_prompt = (
                    "You are Dr. Sanjeevani — an intelligent, compassionate rural physician in Uttarakhand.\n\n"
                    "VOICE CONSULTATION GUIDELINES (ONE QUESTION ONLY):\n"
                    "1. CRITICAL: Ask strictly ONE short, simple question at a time (Max 15 words). Never ask compound or multiple questions in one turn.\n"
                    "2. In voice conversations, patients cannot remember or answer multiple questions at once.\n"
                    "3. Turn 1 (Onset/Duration): Acknowledge briefly and ask ONLY how long the symptom has been present. Do NOT output ##CONCLUDE## on Turn 1.\n"
                    "   - Example: 'I understand. How long have you been experiencing this headache?'\n"
                    "4. Turn 2 (Associated Symptom / Red Flag): Acknowledge and ask strictly ONE key follow-up question.\n"
                    "   - Example: 'Understood. Are you having any dizziness or nausea along with it?'\n"
                    "5. Turn 3: Conclude the assessment. Do not ask more questions; output ##CONCLUDE## at the end."
                )
            else:
                sys_prompt = (
                    "Tu Dr. Sanjeevani hai — Uttarakhand ki samajhdaar, anubhavi aur mamtamayi gaon ki doctor.\n\n"
                    "VOICE CONSULTATION GUIDELINES (EK BAAR MEIN SIRF EK SAWAAL):\n"
                    "1. SABSE ZAROORI NIYAM: Ek baar mein SIRF AUR SIRF EK CHHOTA SAWAAL poocho (Under 15 words). Ek sath 2 ya 3 sawaal KABHI MAT POOCHO!\n"
                    "2. Aawaz se sunte waqt mariz ek sath kayi sawaal yaad nahi rakh sakta. Isliye ek-ek karke dhyan se poocho:\n"
                    "   - Turn 1 (Duration/Kab se): Halka sa acknowledge karo aur SIRF ye poocho ki yeh takleef kab se shuru hui. (Turn 1 par KABHI ##CONCLUDE## mat likho).\n"
                    "     * Sar dard example: 'Maine aapki takleef sun li. Yeh sar dard kab se ho raha hai?'\n"
                    "     * Bukhar example: 'Samajh gayi. Bukhar kitne din se hai?'\n"
                    "     * Pet dard example: 'Maine sun liya. Pet mein dard kitne samay se ho raha hai?'\n"
                    "     * Khansi example: 'Samajh gayi. Yeh khansi kab se chal rahi hai?'\n"
                    "   - Turn 2 (Key Warning Sign / Associated Symptom): Acknowledge karo aur SIRF EK zaroori follow-up poocho.\n"
                    "     * Sar dard example: 'Theek hai. Kya iske sath ulti ya chakkar jaisa bhi mehsoos ho raha hai?'\n"
                    "     * Bukhar example: 'Theek hai. Kya bukhar ke sath thand ya kapkapi lag rahi hai?'\n"
                    "     * Pet dard example: 'Theek hai. Kya ulti ya dast ki samasya bhi hai?'\n"
                    "   - Turn 3: Ab koi naya sawaal MAT poocho. Jaanch conclude karo aur aakhir mein ##CONCLUDE## likho.\n"
                    "3. Kabhi bhi koi aisa sawaal dubara na poochna jo patient pehle hi bata chuka ho."
                )

            human_content = (
                f"Conversation History:\n{updated_notes}\n\n"
                f"Turn Count: {turn_count}/3\n"
                f"Patient just said: \"{patient_text}\"\n\n"
                "Respond as Dr. Sanjeevani. Ask strictly ONE short question (under 15 words) suited for this turn. "
                "Do NOT ask multiple questions. On Turn 3 or when enough info is gathered, output ##CONCLUDE## at the end."
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
            if not has_actual_symptoms:
                if lang == "garhwali":
                    reply = "त्वकु क्या तकलीफ या बीमारी हो रयु छ? कल्याणी से अपणा लक्षण बतावा।" if is_devanagari else "Twaku kya takleef ya bimaari ho rahyu chha? Kripya apna lakshan batava."
                elif lang == "english":
                    reply = "Could you please describe what specific symptoms or health concerns you are experiencing (such as fever, headache, cough, or stomach pain)?"
                else:
                    reply = "Aapko kya takleef ya lakshan mehsoos ho rahe hain? Kripya batayein (jaise bukhar, sardi, sar dard, ya pet dard) taaki main sahi jaanch kar sakoon."
                state["consultation_notes"] = f"{updated_notes}\nDoctor: {reply}"
                state["final_reply_text"] = reply
                return state

            # Turn 1: Symptom-tailored follow-up (Strictly ONE short duration question)
            if any(w in notes_lower for w in ("mund", "sar dard", "headache", "peed", "peer")):
                if lang == "garhwali":
                    reply = "त्वरि बात सुणी ली। मुंड पीड़ कब बटि हो रयु छ?" if is_devanagari else "Twari baat suni li. Mund pid kaba bati ho rahyu chha?"
                elif lang == "english":
                    reply = "I understand. How long have you had this headache?"
                else:
                    reply = "Maine aapki takleef sun li. Yeh sar dard kab se ho raha hai?"
            elif any(w in notes_lower for w in ("pet", "stomach", "tummy", "abdomen", "pait", "marod", "krodh")):
                if lang == "garhwali":
                    reply = "पैट मा पीर कब बटि हो रयु छ?" if is_devanagari else "Pet ma peed kaba bati ho rahyu chha?"
                elif lang == "english":
                    reply = "I understand. How long have you had this stomach pain?"
                else:
                    reply = "Samajh gayi. Pet mein dard kab se shuru hua?"
            elif any(w in notes_lower for w in ("bukhar", "fever", "thand", "syal", "taap")):
                if lang == "garhwali":
                    reply = "बुखार कतगा दिन बटि छ?" if is_devanagari else "Bukhar katga din bati chha?"
                elif lang == "english":
                    reply = "How many days have you had this fever?"
                else:
                    reply = "Bukhar kitne din se hai?"
            elif any(w in notes_lower for w in ("khang", "khansi", "cough", "gala", "kanth")):
                if lang == "garhwali":
                    reply = "खंग कब बटि लगी छ?" if is_devanagari else "Khang kaba bati lagi chha?"
                elif lang == "english":
                    reply = "How long have you had this cough?"
                else:
                    reply = "Yeh khansi kab se ho rahi hai?"
            else:
                if lang == "garhwali":
                    reply = "त्वरि बात समझी गे। ये तकलीफ कब बटि हो रयी छ?" if is_devanagari else "Twari baat samajh ge. Yeh takleef kaba bati ho rahyu chha?"
                elif lang == "english":
                    reply = "I understand. How long have you been experiencing this discomfort?"
                else:
                    reply = "Samajh gayi. Yeh takleef kab se ho rahi hai?"
            state["consultation_notes"] = f"{updated_notes}\nDoctor: {reply}"
            state["final_reply_text"] = reply
        elif turn_count < 3:
            # Turn 2: Check for warning signs (Strictly ONE single key question)
            if any(w in notes_lower for w in ("mund", "sar dard", "headache", "peed", "peer")):
                if lang == "garhwali":
                    reply = "ठीक छ। क्या मुंड पीड़ दगड़ चक्कर या उलटी भी छन?" if is_devanagari else "Theek chha. Kya mund pid dagad ulti ya chakkar bhi chha?"
                elif lang == "english":
                    reply = "Understood. Are you having any dizziness or nausea with it?"
                else:
                    reply = "Theek hai. Kya sar dard ke sath chakkar ya ulti jaisa bhi lag raha hai?"
            elif any(w in notes_lower for w in ("pet", "stomach", "tummy", "abdomen", "pait", "marod", "krodh")):
                if lang == "garhwali":
                    reply = "ठीक छ। क्या उलटी या दस्त भी लग्यूँ छ?" if is_devanagari else "Theek chha. Kya ulti ya dast bhi lagyu chha?"
                elif lang == "english":
                    reply = "Understood. Are you having any vomiting or loose stools?"
                else:
                    reply = "Theek hai. Kya ulti ya dast ki samasya bhi ho rahi hai?"
            elif any(w in notes_lower for w in ("bukhar", "fever", "thand", "syal", "taap")):
                if lang == "garhwali":
                    reply = "ठीक छ। क्या बुखार दगड़ स्याल या कपकपी भी लगणी छ?" if is_devanagari else "Theek chha. Kya bukhar dagad kapkapi bhi lagni chha?"
                elif lang == "english":
                    reply = "Understood. Are you having chills or shivering with the fever?"
                else:
                    reply = "Theek hai. Kya bukhar ke sath thand ya kapkapi lag rahi hai?"
            elif any(w in notes_lower for w in ("khang", "khansi", "cough", "gala", "kanth")):
                if lang == "garhwali":
                    reply = "ठीक छ। क्या सांस फुलणी त नी छ?" if is_devanagari else "Theek chha. Kya saans phulnu toh ni chha?"
                elif lang == "english":
                    reply = "Understood. Are you having any difficulty breathing?"
                else:
                    reply = "Theek hai. Kya khansi ke sath saans lene mein dikkat ho rahi hai?"
            else:
                if lang == "garhwali":
                    reply = "ठीक छ। क्या ये तकलीफ तेजी से बढ़णी छ?" if is_devanagari else "Theek chha. Kya yeh takleef tezi se badhni chha?"
                elif lang == "english":
                    reply = "Understood. Has this discomfort been worsening rapidly?"
                else:
                    reply = "Theek hai. Kya yeh takleef tezi se badh rahi hai?"
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


def doctor_consultation_node(state: AgentState) -> AgentState:
    """
    Main LangGraph node for doctor dialogue.
    Guarantees that both `final_reply_text` (visual structured card)
    and `spoken_reply_text` (natural, concise speech without formatting artifacts)
    are always populated.
    In consultation questioning phase, strictly enforces a single question so patients
    are never burdened with remembering or answering multiple questions at once.
    """
    out = _doctor_consultation_inner(state)
    phase = out.get("dialogue_phase", "GREETING")

    if not out.get("spoken_reply_text"):
        out["spoken_reply_text"] = _clean_text_for_speech(out.get("final_reply_text", ""))

    if phase == "CONSULTATION":
        # Strictly enforce a single focused question for spoken delivery
        out["spoken_reply_text"] = _limit_to_single_question(out["spoken_reply_text"])
        if out.get("voice_mode"):
            out["final_reply_text"] = _limit_to_single_question(out.get("final_reply_text", ""))

    return out