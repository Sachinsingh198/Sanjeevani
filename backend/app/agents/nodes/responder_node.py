import re
from typing import Dict, Any, Optional
from app.agents.state import AgentState
from app.config import settings
from app.core.logger import logger
from app.core.bhashini_engine import BhashiniVoiceEngine
from app.core.sarvam_translate import sarvam_translate_client, get_sarvam_language_code
from langchain_core.messages import SystemMessage, HumanMessage

bhashini_engine = BhashiniVoiceEngine()

# ─────────────────────────────────────────────────────────────────────────────
# Canonical Clinical Symptom & Diagnosis Catalog
# Single source of truth keyed by symptom category; derived across languages.
# ─────────────────────────────────────────────────────────────────────────────
CLINICAL_SYMPTOM_REGISTRY: Dict[str, Dict[str, Any]] = {
    "headache": {
        "keywords": ("mund", "sar dard", "headache", "peed", "peer"),
        "diagnosis_hin": "Thakan, sardi ya mansik tanav se hone wala sadharan sar dard (Tension Headache)",
        "diagnosis_eng": "Mild tension or fatigue-induced headache",
        "diagnosis_garh_dev": "रात बटि मुंड मा पीर और थकावट छ। स्याल या थकान से साधारण मुंड पीड़ (Tension Headache) लगणु छ।",
        "diagnosis_garh_rom": "Kal bati mund ma peed aur thakawat chha. Syal ya thakawat se aam mund pid (Tension Headache) lagnu chha.",
        "spoken_hin": "sardi ya tanav se sadharan sar dard",
        "spoken_garh_dev": "स्याल या थकान से साधारण मुंड पीड़",
        "spoken_garh_rom": "syal ya thakawat se aam mund pid",
        "t1_hin": "Maine aapki takleef sun li. Yeh sar dard kab se ho raha hai?",
        "t2_hin": "Theek hai. Kya sar dard ke sath chakkar ya ulti jaisa bhi lag raha hai?",
        "t1_eng": "I understand. How long have you had this headache?",
        "t2_eng": "Understood. Are you having any dizziness or nausea with it?",
        "t1_garh_dev": "त्वरि बात सुणी ली। मुंड पीड़ कब बटि हो रयु छ?",
        "t1_garh_rom": "Twari baat suni li. Mund pid kaba bati ho rahyu chha?",
        "t2_garh_dev": "ठीक छ। क्या मुंड पीड़ दगड़ चक्कर या उलटी भी छन?",
        "t2_garh_rom": "Theek chha. Kya mund pid dagad ulti ya chakkar bhi chha?",
    },
    "stomach": {
        "keywords": ("pet", "stomach", "tummy", "abdomen", "pait", "marod", "krodh", "gas", "jalan"),
        "diagnosis_hin": "Khan-paan mein asantulan ya gas se pet dard (Indigestion / Gastritis)",
        "diagnosis_eng": "Mild gastritis or indigestion",
        "diagnosis_garh_dev": "खान-पान मा असंतुलन या अपच से पैट मा जलन और मरोड़ लगणु छ।",
        "diagnosis_garh_rom": "Khan-paan ma asantulan ya gas se pet ma jalan aur marod lagnu chha.",
        "spoken_hin": "apach ya gas se pet dard",
        "spoken_garh_dev": "खान-पान या गैस से पैट मा जलन",
        "spoken_garh_rom": "khan-paan ya gas se pet dard",
        "t1_hin": "Samajh gayi. Pet mein dard kab se shuru hua?",
        "t2_hin": "Theek hai. Kya ulti ya dast ki samasya bhi ho rahi hai?",
        "t1_eng": "I understand. How long have you had this stomach pain?",
        "t2_eng": "Understood. Are you having any vomiting or loose stools?",
        "t1_garh_dev": "पैट मा पीर कब बटि हो रयु छ?",
        "t1_garh_rom": "Pet ma peed kaba bati ho rahyu chha?",
        "t2_garh_dev": "ठीक छ। क्या उलटी या दस्त भी लग्यूँ छ?",
        "t2_garh_rom": "Theek chha. Kya ulti ya dast bhi lagyu chha?",
    },
    "fever": {
        "keywords": ("bukhar", "fever", "thand", "syal", "taap"),
        "diagnosis_hin": "Mausami badlav ya thakan se halka bukhar (Mild Seasonal Fever)",
        "diagnosis_eng": "Mild seasonal viral pyrexia",
        "diagnosis_garh_dev": "मौसमी बदलाव और स्याल से साधारण बुखार (Mild Seasonal Fever) लगणु छ।",
        "diagnosis_garh_rom": "Mausami badlav aur syal se aam bukhar (Mild Seasonal Pyrexia) lagnu chha.",
        "spoken_hin": "mausami badlav se halka bukhar",
        "spoken_garh_dev": "मौसमी बदलाव से साधारण बुखार",
        "spoken_garh_rom": "mausami badlav se aam bukhar",
        "t1_hin": "Bukhar kitne din se hai?",
        "t2_hin": "Theek hai. Kya bukhar ke sath thand ya kapkapi lag rahi hai?",
        "t1_eng": "How many days have you had this fever?",
        "t2_eng": "Understood. Are you having chills or shivering with the fever?",
        "t1_garh_dev": "बुखार कतगा दिन बटि छ?",
        "t1_garh_rom": "Bukhar katga din bati chha?",
        "t2_garh_dev": "ठीक छ। क्या बुखार दगड़ स्याल या कपकपी भी लगणी छ?",
        "t2_garh_rom": "Theek chha. Kya bukhar dagad kapkapi bhi lagni chha?",
    },
    "cough": {
        "keywords": ("khang", "khansi", "cough", "gala", "kanth"),
        "diagnosis_hin": "Sardi-zukham se gale mein kharash aur khansi (Common Cold / Pharyngitis)",
        "diagnosis_eng": "Common viral upper respiratory irritation",
        "diagnosis_garh_dev": "स्याल और सर्दी से सूखी खंग और गाळ मा खराश लगणी छ।",
        "diagnosis_garh_rom": "Syal aur sardi se sukhi khang aur gala ma kharash lagnu chha.",
        "spoken_hin": "sardi se gale mein kharash aur khansi",
        "spoken_garh_dev": "सर्दी से सूखी खंग और गाळ मा खराश",
        "spoken_garh_rom": "sardi se khang aur gala ma kharash",
        "t1_hin": "Yeh khansi kab se ho rahi hai?",
        "t2_hin": "Theek hai. Kya khansi ke sath saans lene mein dikkat ho rahi hai?",
        "t1_eng": "How long have you had this cough?",
        "t2_eng": "Understood. Are you having any difficulty breathing?",
        "t1_garh_dev": "खंग कब बटि लगी छ?",
        "t1_garh_rom": "Khang kaba bati lagi chha?",
        "t2_garh_dev": "ठीक छ। क्या सांस फुलणी त नी छ?",
        "t2_garh_rom": "Theek chha. Kya saans phulnu toh ni chha?",
    },
    "general": {
        "keywords": (),
        "diagnosis_hin": "Sharirik thakan aur aam asuvidha",
        "diagnosis_eng": "Physical fatigue and mild discomfort",
        "diagnosis_garh_dev": "शारीरिक थकावट और कमजोरी से सामान्य अस्वस्थता लगणी छ।",
        "diagnosis_garh_rom": "Sharirik thakawat aur kamzori se aam asuvidha lagnu chha.",
        "spoken_hin": "sharirik thakan aur aam asuvidha",
        "spoken_garh_dev": "शारीरिक थकावट और कमजोरी",
        "spoken_garh_rom": "sharirik thakawat aur kamzori",
        "t1_hin": "Samajh gayi. Yeh takleef kab se ho rahi hai?",
        "t2_hin": "Theek hai. Kya yeh takleef tezi se badh rahi hai?",
        "t1_eng": "I understand. How long have you been experiencing this discomfort?",
        "t2_eng": "Understood. Has this discomfort been worsening rapidly?",
        "t1_garh_dev": "त्वरि बात समझी गे। ये तकलीफ कब बटि हो रयी छ?",
        "t1_garh_rom": "Twari baat samajh ge. Yeh takleef kaba bati ho rahyu chha?",
        "t2_garh_dev": "ठीक छ। क्या ये तकलीफ तेजी से बढ़णी छ?",
        "t2_garh_rom": "Theek chha. Kya yeh takleef tezi se badhni chha?",
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# Patient-Facing Explanations for Yellow Triage Clinical Flags
# Human-readable explanations across Hindi, English, and Garhwali.
# ─────────────────────────────────────────────────────────────────────────────
YELLOW_FLAG_EXPLANATIONS: Dict[str, Dict[str, str]] = {
    "prolonged_fever": {
        "hin": "aapko 3 din se zyada bukhar hai",
        "eng": "you have had fever for more than 3 days",
        "garh_dev": "त्वकु ३ दिन बटि लगातार बुखार छ",
        "garh_rom": "twaku 3 din bati lagatar bukhar chha",
    },
    "severe_localized_pain": {
        "hin": "pet ya sir mein tezz asahniya dard hai",
        "eng": "you have severe localized pain in your abdomen or head",
        "garh_dev": "पैट या मुंड मा तेज असहनीय पीर छ",
        "garh_rom": "pet ya mund ma tezz asahniya peed chha",
    },
    "dehydration_signs": {
        "hin": "sharir mein paani ki kami (dehydration) ke lakshan hain",
        "eng": "there are signs of dehydration or lack of urination",
        "garh_dev": "शरीर मा पाणी की कमी का लक्षण छन",
        "garh_rom": "sharir ma paani ki kami ka lakshan chhan",
    },
    "persistent_vomiting": {
        "hin": "baar baar ya lagatar ulti ho rahi hai",
        "eng": "you are experiencing continuous vomiting",
        "garh_dev": "बार-बार लगातार उलटी लग्यूँ छ",
        "garh_rom": "baar baar lagatar ulti lagyu chha",
    },
}


def get_symptom_data(text: str) -> Dict[str, Any]:
    """Retrieves clinical diagnosis and follow-up templates matching patient complaints."""
    text_lower = (text or "").lower()
    for cat, data in CLINICAL_SYMPTOM_REGISTRY.items():
        if cat == "general":
            continue
        if any(k in text_lower for k in data["keywords"]):
            return data
    return CLINICAL_SYMPTOM_REGISTRY["general"]


def apply_garhwali_adaptation(hindi_text: str, is_devanagari: bool = False) -> str:
    """Applies regional Garhwali dialect and grammatical substitutions to canonical Hindi text."""
    if not hindi_text:
        return hindi_text

    if is_devanagari:
        subs = [
            (r"\bआपकी तकलीफ\b", "त्वरि तकलीफ"),
            (r"\bसंभावित जांच\s*\(Diagnosis\)\b", "हमार आंकलन (जांच)"),
            (r"\bसंभावित जांच\b", "हमार आंकलन (जांच)"),
            (r"\bकैसे बनाएं\b", "कन्नि बणावा (तरीका)"),
            (r"\bकब तक लें\b", "कब लीणा"),
            (r"\bध्यान रखें\b", "ध्यान रखा"),
            (r"\bआयुर्वेदिक लाभ\b", "आयुर्वेदिक लाभ"),
            (r"\bमें\b", "मा"),
            (r"\bके साथ\b", "दगड़"),
            (r"\bसे\b", "बटि"),
            (r"\bनहीं\b", "नी"),
            (r"\bहै\b", "छ"),
            (r"\bहैं\b", "छन"),
            (r"\bहो रहा है\b", "हो रयु छ"),
            (r"\bहो रही है\b", "हो रयी छ"),
            (r"2 दिन में आराम ना आए.*", "2 दिन मा आराम नी आला त **104** पर कॉल करा या **PHC** जावा।"),
        ]
    else:
        subs = [
            (r"\bAapki Takleef\b", "Twari Takleef"),
            (r"\bSambhavit Jaanch\s*\(Diagnosis\)\b", "Jaanch (Clinical Assessment)"),
            (r"\bKaise Banayein\b", "Kanna Banawa (Tarika)"),
            (r"\bKab Tak Lein\b", "Kaba Leena (Khuraak)"),
            (r"\bDhyan Rakhein\b", "Dhyan Rakha"),
            (r"\bAyurvedic Labh\b", "Ayurvedic Laabh"),
            (r"\bmein\b", "ma"),
            (r"\bke sath\b", "dagad"),
            (r"\bke saath\b", "dagad"),
            (r"\bnahi\b", "ni"),
            (r"\bnahin\b", "ni"),
            (r"\bhai\b", "chha"),
            (r"\bhain\b", "chhan"),
            (r"\bho raha hai\b", "ho rahyu chha"),
            (r"\bho rahi hai\b", "ho rahyu chha"),
            (r"2 din mein aaram na aaye.*", "2 din ma aaram ni aala toh **104** par call kara ya **PHC** jaawa."),
        ]

    out = hindi_text
    for pat, rep in subs:
        out = re.sub(pat, rep, out, flags=re.IGNORECASE)
    return out


# ─────────────────────────────────────────────────────────────────────────────
# LLM Client Initialization & Failover
# ─────────────────────────────────────────────────────────────────────────────

def get_sarvam_llm():
    """Initializes Sarvam Indic LLM client via OpenAI compatible endpoint."""
    if not settings.SARVAM_API_KEY:
        return None
    try:
        from langchain_openai import ChatOpenAI
        model_name = settings.SARVAM_CHAT_MODEL or "sarvam-30b"
        return ChatOpenAI(
            model=model_name,
            api_key=settings.SARVAM_API_KEY,
            base_url="https://api.sarvam.ai/v1",
            temperature=0.3,
        )
    except Exception as e:
        logger.error(f"[LLM] Sarvam init failed: {e}")
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
            logger.error(f"[LLM] Groq init failed: {e}")

    if settings.GEMINI_API_KEY:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(
                google_api_key=settings.GEMINI_API_KEY,
                model=settings.GEMINI_MODEL,
                temperature=0.3,
            )
        except Exception as e:
            logger.error(f"[LLM] Gemini init failed: {e}")

    if settings.SARVAM_API_KEY:
        sarvam_llm = get_sarvam_llm()
        if sarvam_llm is not None:
            return sarvam_llm

    logger.warning("[LLM] WARNING: No LLM configured. Running in deterministic fallback mode.")
    return None


def _try_llm(llm, messages) -> Optional[str]:
    """Calls the LLM and returns content string, or None on failure."""
    try:
        res = llm.invoke(messages)
        return str(res.content).strip()
    except Exception as e:
        logger.error(f"[LLM] Inference error: {type(e).__name__}: {e}")
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
                logger.error(f"[LLM] Sarvam retry error: {retry_err}")
        return None


def localize_clinical_text(text: str, lang: str, is_devanagari: bool = False) -> str:
    """
    Translates clinical dialogue or prescription text into the patient's preferred language using Sarvam AI.
    - Hindi: returned as-is.
    - Garhwali: returned as-is (already generated natively or adapted).
    - Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia, English, etc.:
      translated via Sarvam AI Mayura v1 (hi-IN -> target language) with LRU caching.
    """
    if not text or not text.strip():
        return text
    if lang == "hindi":
        return text
    if lang == "garhwali":
        return text
    tgt_code = get_sarvam_language_code(lang)
    if tgt_code == "hi-IN" and lang not in ("hindi", "hi"):
        return text
    try:
        translated = sarvam_translate_client.translate_text_sync(text, "hi-IN", tgt_code)
        return translated if translated and translated.strip() else text
    except Exception as e:
        logger.warning(f"[responder_node] Localization failed for {lang} ({tgt_code}): {e}")
        return text


def generate_structured_preparation_steps(remedy_text: str, remedy_name: str = "", lang: str = "hindi") -> list:
    """
    Deconstructs raw clinical remedy compendium text into clear, actionable,
    numbered preparation steps (Ingredients, Preparation Method, Straining, and Consumption).
    Guarantees that the patient always sees multiple complete steps in the chat UI.
    """
    if not remedy_text:
        return ["Nirdharit aushadhi ko nirdesh anusar taaza taiyar karein."]

    # 1. If text already has explicit numbered or bulleted lines, extract them
    lines = [l.strip() for l in remedy_text.splitlines() if l.strip()]
    extracted = []
    for line in lines:
        cleaned = re.sub(r"^(?:\d+[\.\)]|\-|\*)\s*", "", line).strip()
        if cleaned and len(cleaned) > 5 and not cleaned.startswith("**"):
            extracted.append(cleaned)
    if len(extracted) >= 2:
        return extracted

    raw = remedy_text.strip()
    raw = re.sub(r"^\([^)]+\)[:\s]*", "", raw).strip()  # strip formula title like (Bhunimbadi-Ashtadashanga Kashaya):

    # 2. Extract ingredients clause
    ingredients = ""
    ing_match = re.search(r"Ingredients:\s*([^.]+?)(?:\.\s*(?:Indication|Administration|Action|Dosage|Preparation)|$)", raw, re.IGNORECASE)
    if ing_match:
        ingredients = ing_match.group(1).strip()
    else:
        parts = raw.split(".")
        if len(parts) > 1 and len(parts[0]) > 15:
            ingredients = parts[0].strip()

    name_lower = (remedy_name or "").lower()
    text_lower = raw.lower()
    is_kashaya = any(w in name_lower or w in text_lower for w in ("kashaya", "decoction", "kadha", "kvatha"))
    is_churna = any(w in name_lower or w in text_lower for w in ("churna", "powder", "bhasma", "vati"))
    is_swarasa = any(w in name_lower or w in text_lower for w in ("swarasa", "juice", "rasa", "tea", "chai"))

    if lang == "english":
        steps = []
        if ingredients:
            clean_ing = re.sub(r"^Ingredients:\s*", "", ingredients, flags=re.IGNORECASE).strip()
            steps.append(f"Ingredients: Take clean, equal quantities of {clean_ing}.")
        else:
            steps.append(f"Ingredients: Procure genuine {remedy_name or 'herbal ingredients'} in recommended quantity.")

        if is_kashaya:
            steps.append("Preparation Method: Coarsely crush the herbs and boil in 16 parts of fresh water (approx. 2-3 cups) on low flame until reduced to one-fourth (1/4th) volume.")
            steps.append("Straining: Remove from heat and strain thoroughly through a clean cotton cloth or fine sieve.")
            steps.append("How to Take: Drink lukewarm decoction once or twice daily approximately 30 minutes after meals.")
        elif is_churna:
            steps.append("Preparation Method: Finely grind the dried herbs and sieve through clean muslin cloth into a fine powder.")
            steps.append("Storage & Intake: Store in an airtight container. Take 1 teaspoon with lukewarm water or honey twice daily.")
        elif is_swarasa:
            steps.append("Preparation Method: Wash fresh leaves/herbs thoroughly, crush in a mortar, and squeeze through clean cloth to extract fresh juice.")
            steps.append("How to Take: Take 1-2 tablespoons freshly extracted juice with water or honey.")
        else:
            steps.append("Preparation Method: Boil the herbs in 2 cups of water for 5-7 minutes over low heat.")
            steps.append("How to Take: Strain and consume lukewarm twice daily after meals.")
        return steps

    # Hindi / Garhwali / Indic canonical steps
    steps = []
    if ingredients:
        clean_ing = re.sub(r"^Ingredients:\s*", "", ingredients, flags=re.IGNORECASE).strip()
        steps.append(f"सामग्री (Ingredients): {clean_ing} को साफ करके बराबर मात्रा में लें।")
    else:
        steps.append(f"सामग्री (Ingredients): {remedy_name or 'नुस्खे की औषधियाँ'} उचित मात्रा में लें।")

    if is_kashaya:
        steps.append("काढ़ा बनाने की विधि (Preparation): सभी जड़ी-बूटियों को मोटा कूट लें और 16 गुना पानी (लगभग 2-3 कप) में धीमी आंच पर उबालें, जब तक एक-चौथाई (1/4) पानी न बच जाए।")
        steps.append("छानने का तरीका (Straining): उबालने के बाद आंच से उतारें और साफ कपड़े या बारीक छलनी से अच्छी तरह छान लें।")
        steps.append("सेवन विधि (How to Take): इस ताजे गुनगुने काढ़े को दिन में 1-2 बार भोजन के 30 मिनट बाद सेवन करें।")
    elif is_churna:
        steps.append("चूर्ण बनाने की विधि (Preparation): सभी सूखी जड़ी-बूटियों को बारीक पीसकर कपड़छान चूर्ण बना लें और साफ शीशी में रखें।")
        steps.append("सेवन विधि (How to Take): 1 चम्मच चूर्ण गुनगुने पानी या शहद के साथ दिन में 2 बार लें।")
    elif is_swarasa:
        steps.append("स्वरस विधि (Preparation): ताजी पत्तियों/जड़ों को धोकर कूट लें और साफ कपड़े से निचोड़कर ताजा रस निकालें।")
        steps.append("सेवन विधि (How to Take): 1-2 चम्मच ताजा स्वरस गुनगुने पानी के साथ दिन में 1-2 बार लें।")
    else:
        steps.append("बनाने की विधि (Preparation): इन औषधियों को 2 कप पानी में डालकर 5-7 मिनट धीमी आंच पर पकाएं।")
        steps.append("सेवन विधि (How to Take): छानकर गुनगुना दिन में 1-2 बार भोजन के बाद नियमित रूप से लें।")

    return steps


# ─────────────────────────────────────────────────────────────────────────────
# Concluded Remedy Delivery Node
# ─────────────────────────────────────────────────────────────────────────────

def _format_concluded_remedy(state: AgentState, llm) -> AgentState:
    """Formats final prescription output from retrieved verified remedies using canonical Hindi."""
    remedies = state.get("retrieved_remedies", [])
    user_msg = state.get("normalized_message", "")
    notes = state.get("consultation_notes", user_msg)
    lang = state.get("detected_language", "hindi")
    raw_user_msg = state.get("raw_user_message", "")
    is_devanagari = bool(re.search(r"[\u0900-\u097F]", raw_user_msg))

    sym_data = get_symptom_data(notes)

    # 1. No verified remedy candidate available
    if not remedies:
        base_hin = (
            "Aapki puri baat sun li.\n\n"
            "Is waqt mere paas aapki takleef ke liye verified nuskha nahi mila.\n"
            "Kripya **PHC** ya **104** par sampark karein."
        )
        if lang == "english":
            state["final_reply_text"] = sarvam_translate_client.translate_text_sync(base_hin, "hi-IN", "en-IN")
        elif lang == "garhwali":
            state["final_reply_text"] = (
                "यै बखत हमार पाणि त्वरि बीमारी खातिर कोइ परखीं नुस्खा नी च्छा।\n"
                "कृप्या **PHC** या **104** पर फोन करा।"
                if is_devanagari else
                "Yai bakhat hamara paani twari bimari khatir koi parkhi nuskha ni chha.\n"
                "Kripya **PHC** ya **104** par phone kara."
            )
        elif lang == "hindi":
            state["final_reply_text"] = base_hin
        else:
            state["final_reply_text"] = localize_clinical_text(
                "आपकी पूरी बात सुन ली।\n\nइस वक्त मेरे पास आपकी तकलीफ के लिए प्रमाणित नुस्खा नहीं मिला।\nकृपया **PHC** या **104** पर संपर्क करें।",
                lang,
                is_devanagari,
            )
        return state

    remedy = remedies[0]
    r_name = remedy.get('remedy_name', 'घरेलू नुस्खा')

    # Spoken voice summary (concise, 2-3 sentences max)
    if lang == "garhwali":
        spoken_part = sym_data["spoken_garh_dev"] if is_devanagari else sym_data["spoken_garh_rom"]
        spoken_voice_summary = (
            f"त्वरा लक्ष्णों से {spoken_part} लगणु छ। यै खातिर तुम {r_name} ले सकदा। तरीक स्क्रीन पर छ। 2 दिन मा आराम नी आला त 104 पर फोन करा।"
            if is_devanagari else
            f"Twara lakshano bati {spoken_part} lagnu chha. Yaikhatir tum {r_name} istemal kari sakda. Tarika screen par chha. 2 din ma aaram ni aala ta 104 par call kara."
        )
    elif lang == "english":
        spoken_voice_summary = (
            f"Based on your symptoms, this appears to be {sym_data['diagnosis_eng']}. You can safely try {r_name}. Detailed instructions are shown on screen. If not improved in two days, please call 104 or visit the nearest PHC."
        )
    elif lang == "hindi":
        spoken_voice_summary = (
            f"Aapke bataye lakshano ke aadhar par {sym_data['spoken_hin']} lag raha hai. Iske liye aap {r_name} le sakte hain. Iska pura tarika screen par diya gaya hai. Agar do din mein aaram na aaye toh 104 par call karein ya PHC jaayein."
        )
    else:
        base_hin_spoken = (
            f"आपके बताए लक्षणों के आधार पर {sym_data['spoken_hin']} लग रहा है। इसके लिए आप {r_name} ले सकते हैं। इसका पूरा तरीका स्क्रीन पर दिया गया है। अगर दो दिन में आराम न आए तो 104 पर कॉल करें या नजदीकी PHC जाएं।"
        )
        spoken_voice_summary = localize_clinical_text(base_hin_spoken, lang, is_devanagari)
    state["spoken_reply_text"] = spoken_voice_summary

    # Structured multi-step preparation steps
    prep_steps = generate_structured_preparation_steps(
        remedy.get('remedy_text', ''),
        remedy.get('remedy_name', ''),
        lang="english" if lang == "english" else "hindi"
    )
    if lang not in ("hindi", "garhwali", "english"):
        prep_steps = [localize_clinical_text(s, lang, is_devanagari) for s in prep_steps]

    cause_str = sym_data.get('diagnosis_hin', '') if sym_data else 'Lakshan'
    if lang == "english" and sym_data:
        cause_str = sym_data.get('diagnosis_eng', cause_str)
    elif lang == "garhwali" and sym_data:
        cause_str = sym_data.get('diagnosis_garh_dev' if is_devanagari else 'diagnosis_garh_rom', cause_str)
    elif lang != "hindi" and sym_data:
        cause_str = localize_clinical_text(sym_data.get('diagnosis_hin', cause_str), lang, is_devanagari)

    dosage_str = "Din mein 1-2 baar khana khane ke baad"
    if lang == "english":
        dosage_str = "Take 1-2 times daily after meals"
    elif lang not in ("hindi", "garhwali"):
        dosage_str = localize_clinical_text("दिन में 1-2 बार भोजन के बाद", lang, is_devanagari)

    precaution_str = "2 din mein aaram na aaye toh 104 par call karein ya PHC jaayein."
    if lang == "english":
        precaution_str = "If no relief in 2 days, please call 104 or visit the nearest PHC."
    elif lang not in ("hindi", "garhwali"):
        precaution_str = localize_clinical_text("2 दिन में आराम न आए तो 104 पर कॉल करें या नजदीकी PHC जाएं।", lang, is_devanagari)

    state["consultation_summary"] = {
        "condition": user_msg or (sym_data.get('spoken_hin', '') if sym_data else 'Lakshan'),
        "possible_cause": cause_str,
        "remedy_name": remedy.get('remedy_name', ''),
        "preparation_steps": prep_steps,
        "dosage": [dosage_str],
        "precautions": [precaution_str],
        "ayurvedic_note": remedy.get('ayurvedic_note', '')
    }

    # 2. LLM synthesis of prescription using ONE Canonical Hindi Template
    if llm:
        canonical_system_prompt = (
            "Tu Dr. Sanjeevani hai. Patient ki poori jaanch aur clinical diagnosis ke baad ek "
            "safe Ayurvedic nuskha batana hai. Sirf HINDI ya HINGLISH mein likh.\n\n"
            "CRITICAL FORMATTING RULES:\n"
            "1. Har section se pehle aur baad mein ek blank line chhodhein.\n"
            "2. '**Kaise Banayein:**' ke andar har step ko ALAG nayi line par numbered list (1. ..., 2. ..., 3. ...) mein likhein. Har point mein vistar se samjhayein.\n"
            "3. '**Kab Tak Lein:**' ke andar khuraak aur timing likhein (har point nayi line par '- ' se shuru karein).\n"
            "4. '**Dhyan Rakhein:**' ke andar har savdhani ko ALAG nayi line par '- ' se likhein. Kabhi bhi multiple bullets ko ek hi line mein mat milana!\n\n"
            "Bilkul is format mein likho:\n\n"
            "**Aapki Takleef:** [ek line mein mukhya lakshan]\n\n"
            "**Sambhavit Karan (Possible Reason):** [possible cause: kya samasya lagti hai aur kyu, e.g. thakan ya sardi se hone wala sadharan sar dard]\n\n"
            "**Nuskha:** [nuskhe ka naam]\n\n"
            "**Kaise Banayein:**\n1. [Step 1: Samagri]\n2. [Step 2: Banane ki Vidhi]\n3. [Step 3: Chhanne aur Peene ka Tarika]\n\n"
            "**Kab Tak Lein:**\n- [khuraak aur samay]\n\n"
            "**Dhyan Rakhein:**\n- [savdhani 1]\n- [savdhani 2]\n\n"
            "2 din mein aaram na aaye toh **104** par call karein ya **PHC** jaayein."
        )
        if lang == "garhwali":
            canonical_system_prompt += f"\n\n{bhashini_engine.get_garhwali_guidance(is_devanagari)}"

        user_prompt = (
            f"Patient Details:\n{notes}\n\n"
            f"Verified Remedy:\n"
            f"Name: {remedy.get('remedy_name', '')}\n"
            f"Instructions:\n" + "\n".join(prep_steps) + "\n\n"
            f"Ayurvedic Benefit: {remedy.get('ayurvedic_note', '')}\n"
            f"Safety: {remedy.get('safety_check', 'Verified safe')}"
        )
        reply = _try_llm(llm, [
            SystemMessage(content=canonical_system_prompt),
            HumanMessage(content=user_prompt),
        ])
        if reply:
            # Parse numbered preparation steps from LLM output into consultation_summary
            prep_match = re.search(r"\*\*(?:Kaise Banayein|How to Prepare|बनाने का तरीका)[^*:]*:\*\*\s*\n([\s\S]*?)(?=\n\s*\*\*|$)", reply, re.IGNORECASE)
            if prep_match:
                extracted_steps = re.findall(r"(?:^|\n)\s*(?:\d+[\.\)]|\-|\*)\s*(.+)", prep_match.group(1))
                valid_steps = [s.strip() for s in extracted_steps if s.strip() and len(s.strip()) > 3]
                if len(valid_steps) >= 2:
                    if lang == "english":
                        state["consultation_summary"]["preparation_steps"] = [
                            sarvam_translate_client.translate_text_sync(s, "hi-IN", "en-IN") for s in valid_steps
                        ]
                    elif lang not in ("hindi", "garhwali"):
                        state["consultation_summary"]["preparation_steps"] = [
                            localize_clinical_text(s, lang, is_devanagari) for s in valid_steps
                        ]
                    else:
                        state["consultation_summary"]["preparation_steps"] = valid_steps

            if lang == "english":
                state["final_reply_text"] = sarvam_translate_client.translate_text_sync(reply, "hi-IN", "en-IN")
            elif lang == "garhwali":
                state["final_reply_text"] = reply
            elif lang == "hindi":
                state["final_reply_text"] = reply
            else:
                state["final_reply_text"] = localize_clinical_text(reply, lang, is_devanagari)
            return state

    # 3. Deterministic prescription card fallback with explicit numbered steps
    steps_formatted = "\n".join([f"{i+1}. {s}" for i, s in enumerate(prep_steps)])

    if lang == "garhwali":
        diag_garh = sym_data["diagnosis_garh_dev"] if is_devanagari else sym_data["diagnosis_garh_rom"]
        if is_devanagari:
            state["final_reply_text"] = (
                f"**त्वरि तकलीफ:** {user_msg or 'शारीरिक अस्वस्थता'}\n\n"
                f"**हमार आंकलन (कारण):** {diag_garh}\n\n"
                f"**नुस्खा:** {remedy.get('remedy_name', '')}\n\n"
                f"**कन्नि बणावा (तरीका):**\n{steps_formatted}\n\n"
                f"**आयुर्वेदिक लाभ:** {remedy.get('ayurvedic_note', '')}\n\n"
                "**ध्यान रखा:** 2 दिन मा आराम नी आला त **104** पर कॉल करा या **PHC** जावा।"
            )
        else:
            state["final_reply_text"] = (
                f"**Twari Takleef:** {user_msg or 'Sharirik asuvidha'}\n\n"
                f"**Sambhavit Karan (Possible Reason):** {diag_garh}\n\n"
                f"**Nuskha:** {remedy.get('remedy_name', '')}\n\n"
                f"**Kanna Banawa (Tarika):**\n{steps_formatted}\n\n"
                f"**Ayurvedic Laabh:** {remedy.get('ayurvedic_note', '')}\n\n"
                "**Dhyan Rakha:** 2 din ma aaram ni aala toh **104** par call kara ya **PHC** jaawa."
            )
    elif lang == "english":
        state["final_reply_text"] = (
            f"**Your Condition:** {user_msg or 'Reported symptoms'}\n\n"
            f"**Possible Cause:** {sym_data['diagnosis_eng']}\n\n"
            f"**Remedy:** {remedy.get('remedy_name', '')}\n\n"
            f"**How to Prepare:**\n{steps_formatted}\n\n"
            f"**Ayurvedic Rationale:** {remedy.get('ayurvedic_note', '')}\n\n"
            "**Precautions:** If no relief in 2 days, please call **104** or visit your nearest **PHC**."
        )
    elif lang == "hindi":
        state["final_reply_text"] = (
            f"**Aapki Takleef:** {user_msg or 'Bataaye gaye lakshan'}\n\n"
            f"**Sambhavit Karan (Possible Reason):** {sym_data['diagnosis_hin']}\n\n"
            f"**Nuskha:** {remedy.get('remedy_name', '')}\n\n"
            f"**Kaise Banayein:**\n{steps_formatted}\n\n"
            f"**Ayurvedic Labh:** {remedy.get('ayurvedic_note', '')}\n\n"
            "**Dhyan Rakhein:** 2 din mein aaram na aaye toh **104** par call karein ya **PHC** jaayein."
        )
    else:
        hin_card = (
            f"**आपकी तकलीफ:** {user_msg or 'बताए गए लक्षण'}\n\n"
            f"**संभावित कारण:** {sym_data['diagnosis_hin']}\n\n"
            f"**नुस्खा:** {remedy.get('remedy_name', '')}\n\n"
            f"**बनाने का तरीका:**\n{steps_formatted}\n\n"
            f"**आयुर्वेदिक लाभ:** {remedy.get('ayurvedic_note', '')}\n\n"
            "**ध्यान रखें:** 2 दिन में आराम न आए तो **104** पर कॉल करें या नजदीकी **PHC** जाएं।"
        )
        state["final_reply_text"] = localize_clinical_text(hin_card, lang, is_devanagari)
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
        r"(Aapki Takleef|Sambhavit Jaanch\s*\(Diagnosis\)|Sambhavit Karan\s*\(Possible Reason\)|Possible Cause|Clinical Assessment|Nuskha|Kaise Banayein|Kab Tak Lein|Dhyan Rakhein|Safety Verified|Ayurvedic Rationale)[:\s]*",
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
    """Guarantees that spoken voice output contains strictly ONE question."""
    if not text:
        return ""
    clean = text.strip()
    if "?" not in clean:
        return clean
    parts = re.split(r'(?<=\?)\s*', clean)
    if len(parts) > 1:
        return parts[0].strip()
    return clean


def _has_sufficient_info(notes: str) -> bool:
    """
    Checks whether the patient's consultation notes contain:
    (a) a duration/timing cue (e.g. 'din', 'hafte', 'ghante', 'kal', 'aaj', digits + 'din')
    (b) at least one associated-symptom or severity cue beyond the chief complaint.
    """
    if not notes:
        return False
    notes_lower = notes.lower()

    # (a) Duration / timing cue
    duration_pattern = r"\b(?:\d+\s*(?:din|hafte|ghante|mahine|days?|hours?|weeks?)|din|hafte|ghante|kal|aaj|parso|yesterday|today|since|katga\s+din|kaba\s+bati)\b"
    has_duration = bool(re.search(duration_pattern, notes_lower))
    if not has_duration:
        return False

    # (b) Associated-symptom or severity cue beyond chief complaint
    severity_cues = [
        "tez", "tezz", "severe", "bahut", "mild", "halka", "halki", "high", "zyada", "badh", "intense", "ghani"
    ]
    has_severity = any(re.search(rf"\b{re.escape(cue)}\b", notes_lower) for cue in severity_cues)

    from app.core.clinical_lexicon import SYMPTOM_KEYWORDS
    matched_symptoms = set()
    for kw in SYMPTOM_KEYWORDS:
        if re.search(rf"\b{re.escape(kw)}\b", notes_lower):
            matched_symptoms.add(kw)

    has_associated_or_severity = has_severity or len(matched_symptoms) >= 2
    return bool(has_duration and has_associated_or_severity)


# ─────────────────────────────────────────────────────────────────────────────
# Doctor Consultation Dialogue Inner Flow
# ─────────────────────────────────────────────────────────────────────────────

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
                "Respond with a warm, welcoming greeting in simple Hindi. "
                "Ask how they are feeling today and what physical symptoms or health concerns they have. "
                "CRITICAL: Do NOT give any diagnosis, disease assessment, or remedies yet."
            )
            if lang == "garhwali":
                sys_prompt += f"\n\n{bhashini_engine.get_garhwali_guidance(is_devanagari)}"

            hum_prompt = f"Patient message: \"{raw_msg}\""
            llm_reply = _try_llm(llm, [SystemMessage(content=sys_prompt), HumanMessage(content=hum_prompt)])
            if llm_reply:
                if lang == "english":
                    state["final_reply_text"] = sarvam_translate_client.translate_text_sync(llm_reply, "hi-IN", "en-IN")
                elif lang == "garhwali":
                    # LLM natively generated Garhwali; do not run regex substitution
                    state["final_reply_text"] = llm_reply
                elif lang == "hindi":
                    state["final_reply_text"] = llm_reply
                else:
                    state["final_reply_text"] = localize_clinical_text(llm_reply, lang, is_devanagari)
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
        elif lang == "hindi":
            name_txt = f" {patient_name} ji" if patient_name else ""
            state["final_reply_text"] = (
                f"Namaste{name_txt}! Main Dr. Sanjeevani hoon — aapki gaon ki doctor.\n\n"
                "Aapko kya takleef ya lakshan mehsoos ho rahe hain? Aaram se batayein (jaise bukhar, sardi, pet dard, ya sar dard)."
            )
        else:
            name_txt = f" {patient_name} जी" if patient_name else ""
            base_greeting = (
                f"नमस्ते{name_txt}! मैं डॉ. संजीवनी हूँ — आपकी स्वास्थ्य सहायिका।\n\n"
                "आपको क्या तकलीफ या लक्षण महसूस हो रहे हैं? आराम से बताइए (जैसे बुखार, सर्दी, पेट दर्द, या सिर दर्द)।"
            )
            state["final_reply_text"] = localize_clinical_text(base_greeting, lang, is_devanagari)
        return state

    # 2. GUARDRAIL
    if phase == "GUARDRAIL_BLOCKED":
        state["retrieved_remedies"] = []
        base_guard = (
            "Main sirf swasthya sambandhi sawaalon ka jawab de sakti hoon.\n"
            "Kya aapko koi takleef ya lakshan hai?"
        )
        if lang == "english":
            state["final_reply_text"] = sarvam_translate_client.translate_text_sync(base_guard, "hi-IN", "en-IN")
        elif lang == "garhwali":
            state["final_reply_text"] = (
                "मी सिर्फ स्वास्थ्य सम्बन्धी सवालूं का जवाब दे सकदू।\n"
                "क्या त्वकु कोई तकलीफ या बीमारी छ?"
                if is_devanagari else
                "Mi sirf swasthya sambandhi sawalun ka jawab de sakdu.\n"
                "Kya twaku koi takleef ya bimari chha?"
            )
        elif lang == "hindi":
            state["final_reply_text"] = base_guard
        else:
            base_guard_hin = "मैं केवल स्वास्थ्य संबंधी सवालों का जवाब दे सकती हूँ। क्या आपको कोई तकलीफ या लक्षण है?"
            state["final_reply_text"] = localize_clinical_text(base_guard_hin, lang, is_devanagari)
        return state

    # 3. YELLOW tier
    if tier == "Yellow":
        state["retrieved_remedies"] = []
        flags = state.get("clinical_flags", [])

        # Match specific yellow flag explanation strings
        matched_reasons = []
        for cat, expl in YELLOW_FLAG_EXPLANATIONS.items():
            if any(cat in f for f in flags):
                if lang == "garhwali":
                    matched_reasons.append(expl["garh_dev"] if is_devanagari else expl["garh_rom"])
                elif lang == "english":
                    matched_reasons.append(expl["eng"])
                else:
                    matched_reasons.append(expl["hin"])

        if matched_reasons:
            reasons_str = " aur ".join(matched_reasons) if lang != "english" else " and ".join(matched_reasons)
            if lang == "english":
                reply = (
                    f"Because {reasons_str}, your symptoms require a formal clinical evaluation.\n\n"
                    "Please call **104** (e-Sanjeevani) or visit your nearest **Primary Health Centre (PHC)** promptly."
                )
            elif lang == "garhwali":
                if is_devanagari:
                    reply = (
                        f"क्युंकी {reasons_str}, यै खातिर डॉक्टर की पूरी जांच जरूरी छ।\n\n"
                        "**104** पर फोन करा या nazdiki **PHC** जावा।"
                    )
                else:
                    reply = (
                        f"Kyunki {reasons_str}, yaikhatir doctor ki poori jaanch zaroori chha.\n\n"
                        "**104** par call kara ya nazdiki **PHC** jaawa."
                    )
            elif lang == "hindi":
                reply = (
                    f"Kyunki {reasons_str}, isliye yeh lakshan gehri doctori jaanch maangte hain.\n\n"
                    "Kripya **104** (e-Sanjeevani) par call karein ya nazdiki **PHC** par doctor se sampark karein."
                )
            else:
                base_rep = (
                    f"क्योंकि {reasons_str}, इसलिए यह लक्षण गहरी डॉक्टरी जांच मांगते हैं।\n\n"
                    "कृपया **104** (ई-संजीवनी) पर कॉल करें या नजदीकी **PHC** पर डॉक्टर से संपर्क करें।"
                )
                reply = localize_clinical_text(base_rep, lang, is_devanagari)
        else:
            if lang == "english":
                reply = (
                    "Your symptoms require a closer medical assessment.\n\n"
                    "If fever, severe pain, or vomiting has persisted for **more than 3 days**, please call **104** or visit your nearest **PHC**."
                )
            elif lang == "garhwali":
                if is_devanagari:
                    reply = (
                        "त्वरा लक्ष्णों मा डॉक्टर की जांच जरूरी छ।\n\n"
                        "यदि बुखार, तेज पीर या उलटी **३ दिन बटि** छ त **104** पर फोन करा या **PHC** जावा।"
                    )
                else:
                    reply = (
                        "Twara lakshano ma doctor ki jaanch zaroori chha.\n\n"
                        "Yadi bukhar, tezz peed ya ulti **3 din bati** chha toh **104** par call kara ya **PHC** jaawa."
                    )
            elif lang == "hindi":
                reply = (
                    "Aapke lakshan thodi gehri jaanch maangte hain.\n\n"
                    "Agar bukhar, tez dard ya ulti **3 din se zyada** hai — toh **104** par call karein ya nazdiki **PHC** jaayein."
                )
            else:
                base_rep = (
                    "आपके लक्षण थोड़ी गहरी डॉक्टरी जांच मांगते हैं।\n\n"
                    "अगर बुखार, तेज दर्द या उल्टी **3 दिन से ज्यादा** है — तो **104** पर कॉल करें या नजदीकी **PHC** जाएं।"
                )
                reply = localize_clinical_text(base_rep, lang, is_devanagari)

        state["final_reply_text"] = reply
        return state

    # 4. CONSULTATION
    if phase == "CONSULTATION":
        turn_count = state.get("turn_count", 1)
        patient_text = raw_msg or user_msg

        # Handle in-consultation symptom correction without restarting
        is_correction = patient_text.strip().startswith("[CORRECTION]")
        if is_correction:
            patient_text = re.sub(r"^\[CORRECTION\]\s*", "", patient_text.strip())

        # Maintain dialogue turns
        new_entry = f"Patient: {patient_text}"
        if is_correction and notes:
            note_lines = notes.splitlines()
            last_p_idx = None
            for idx in range(len(note_lines) - 1, -1, -1):
                if note_lines[idx].startswith("Patient:"):
                    last_p_idx = idx
                    break
            if last_p_idx is not None:
                note_lines[last_p_idx] = new_entry
                updated_notes = "\n".join(note_lines)
            else:
                updated_notes = f"{notes}\n{new_entry}"
        else:
            updated_notes = f"{notes}\n{new_entry}" if notes else new_entry

        state["consultation_notes"] = updated_notes

        from app.core.dialogue_manager import has_symptom_mention
        has_actual_symptoms = has_symptom_mention(updated_notes) or has_symptom_mention(patient_text)

        has_sufficient = _has_sufficient_info(updated_notes)
        can_conclude = ((turn_count >= 2) or has_sufficient) and has_actual_symptoms
        force_conclude = ((turn_count >= 3) or has_sufficient) and has_actual_symptoms

        sym_data = get_symptom_data(updated_notes)

        should_conclude = False
        conclude_llm = None

        if llm:
            canonical_consultation_prompt = (
                "Tu Dr. Sanjeevani hai — Uttarakhand ki samajhdaar, anubhavi aur mamtamayi gaon ki doctor.\n\n"
                "VOICE CONSULTATION GUIDELINES (EK BAAR MEIN SIRF EK SAWAAL):\n"
                "1. SABSE ZAROORI NIYAM: Ek baar mein SIRF AUR SIRF EK CHHOTA SAWAAL poocho (Under 15 words). Ek sath 2 ya 3 sawaal KABHI MAT POOCHO!\n"
                "2. Aawaz se sunte waqt mariz ek sath kayi sawaal yaad nahi rakh sakta. Isliye ek-ek karke dhyan se poocho:\n"
                "   - Turn 1 (Duration/Kab se): Halka sa acknowledge karo aur SIRF ye poocho ki yeh takleef kab se shuru hui. (Turn 1 par KABHI ##CONCLUDE## mat likho).\n"
                "   - Turn 2 (Key Warning Sign / Associated Symptom): Acknowledge karo aur SIRF EK zaroori follow-up poocho.\n"
                "   - Turn 3: Ab koi naya sawaal MAT poocho. Jaanch conclude karo aur aakhir mein ##CONCLUDE## likho.\n"
                "3. Kabhi bhi koi aisa sawaal dubara na poochna jo patient pehle hi bata chuka ho."
            )
            if lang == "garhwali":
                canonical_consultation_prompt += f"\n\n{bhashini_engine.get_garhwali_guidance(is_devanagari)}"

            human_content = (
                f"Conversation History:\n{updated_notes}\n\n"
                f"Turn Count: {turn_count}/3\n"
                f"Patient just said: \"{patient_text}\"\n\n"
                "Respond as Dr. Sanjeevani. Ask strictly ONE short question (under 15 words) suited for this turn. "
                "Do NOT ask multiple questions. On Turn 3 or when enough info is gathered, output ##CONCLUDE## at the end."
            )
            reply = _try_llm(llm, [
                SystemMessage(content=canonical_consultation_prompt),
                HumanMessage(content=human_content),
            ])

            if reply:
                if can_conclude and ("##CONCLUDE##" in reply or force_conclude):
                    should_conclude = True
                    conclude_llm = llm
                else:
                    clean_reply = reply.replace("##CONCLUDE##", "").strip()
                    if lang == "english":
                        translated_reply = sarvam_translate_client.translate_text_sync(clean_reply, "hi-IN", "en-IN")
                    elif lang == "garhwali":
                        # Native Garhwali LLM generation; avoid regex double-adaptation
                        translated_reply = clean_reply
                    elif lang == "hindi":
                        translated_reply = clean_reply
                    else:
                        translated_reply = localize_clinical_text(clean_reply, lang, is_devanagari)

                    state["consultation_notes"] = f"{updated_notes}\nDoctor: {translated_reply}"
                    state["final_reply_text"] = translated_reply
                    return state

        # Deterministic fallback when no LLM
        if not should_conclude:
            if not can_conclude:
                if not has_actual_symptoms:
                    if lang == "garhwali":
                        reply = "त्वकु क्या तकलीफ या बीमारी हो रयु छ? कल्याणी से अपणा लक्षण बतावा।" if is_devanagari else "Twaku kya takleef ya bimaari ho rahyu chha? Kripya apna lakshan batava."
                    elif lang == "english":
                        reply = "Could you please describe what specific symptoms or health concerns you are experiencing (such as fever, headache, cough, or stomach pain)?"
                    elif lang == "hindi":
                        reply = "Aapko kya takleef ya lakshan mehsoos ho rahe hain? Kripya batayein (jaise bukhar, sardi, sar dard, ya pet dard) taaki main sahi jaanch kar sakoon."
                    else:
                        base_intake = "आपको क्या तकलीफ या लक्षण महसूस हो रहे हैं? कृपया बताएं (जैसे बुखार, सर्दी, सिर दर्द, या पेट दर्द) ताकि मैं सही जांच कर सकूं।"
                        reply = localize_clinical_text(base_intake, lang, is_devanagari)
                else:
                    # Turn 1 duration question from registry
                    if lang == "garhwali":
                        reply = sym_data["t1_garh_dev"] if is_devanagari else sym_data["t1_garh_rom"]
                    elif lang == "english":
                        reply = sym_data["t1_eng"]
                    elif lang == "hindi":
                        reply = sym_data["t1_hin"]
                    else:
                        reply = localize_clinical_text(sym_data["t1_hin"], lang, is_devanagari)

                state["consultation_notes"] = f"{updated_notes}\nDoctor: {reply}"
                state["final_reply_text"] = reply
                return state
            elif turn_count < 3 and not has_sufficient:
                # Turn 2 warning question from registry
                if lang == "garhwali":
                    reply = sym_data["t2_garh_dev"] if is_devanagari else sym_data["t2_garh_rom"]
                elif lang == "english":
                    reply = sym_data["t2_eng"]
                elif lang == "hindi":
                    reply = sym_data["t2_hin"]
                else:
                    reply = localize_clinical_text(sym_data["t2_hin"], lang, is_devanagari)

                state["consultation_notes"] = f"{updated_notes}\nDoctor: {reply}"
                state["final_reply_text"] = reply
                return state
            else:
                should_conclude = True
                conclude_llm = None

        if should_conclude:
            # DESIGN EXCEPTION (Task 9): responder_node owns exactly ONE phase transition:
            # CONSULTATION -> CONCLUDED when the consultation reaches Turn 3 or LLM signals conclusion.
            # This is the sole phase mutation in this module, allowing LangGraph's route_after_consultation edge
            # to retrieve verified remedies and format the prescription.
            state["dialogue_phase"] = "CONCLUDED"
            return _format_concluded_remedy(state, conclude_llm)

    # 5. CONCLUDED
    if phase == "CONCLUDED":
        return _format_concluded_remedy(state, llm)

    return state


def doctor_consultation_node(state: AgentState) -> AgentState:
    """
    Main LangGraph node for doctor dialogue.
    Populates visual card (`final_reply_text`) and speech (`spoken_reply_text`).
    """
    out = _doctor_consultation_inner(state)
    phase = out.get("dialogue_phase", "GREETING")

    if not out.get("spoken_reply_text"):
        out["spoken_reply_text"] = _clean_text_for_speech(out.get("final_reply_text", ""))

    if phase == "CONSULTATION":
        out["spoken_reply_text"] = _limit_to_single_question(out["spoken_reply_text"])
        if out.get("voice_mode"):
            out["final_reply_text"] = _limit_to_single_question(out.get("final_reply_text", ""))

    return out