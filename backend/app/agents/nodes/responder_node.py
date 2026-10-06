import re
import json
from typing import Dict, Any, Optional, List, Tuple
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
from app.core.clinical_ontology import CLINICAL_SYMPTOM_REGISTRY, get_symptom_data
from app.core.symptom_model import StructuredSymptomProfile


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

_cached_llm = None
_cached_llm_key = None


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
    """Initializes LLM client with dynamic configuration, cached singleton, and automatic failover."""
    global _cached_llm, _cached_llm_key
    try:
        from app.core.system_config import get_system_config
        cfg = get_system_config()
    except Exception:
        cfg = {}

    provider = cfg.get("primary_llm_provider", settings.PRIMARY_LLM_PROVIDER)
    groq_mod = cfg.get("groq_model", settings.GROQ_MODEL)
    gemini_mod = cfg.get("gemini_model", settings.GEMINI_MODEL)
    sarvam_mod = settings.SARVAM_CHAT_MODEL or "sarvam-30b"
    temp = float(cfg.get("temperature", 0.3))
    max_tok = int(cfg.get("max_tokens", 1200))

    cache_key = (
        provider, groq_mod, gemini_mod, sarvam_mod, temp, max_tok,
        settings.GROQ_API_KEY, settings.GEMINI_API_KEY, settings.SARVAM_API_KEY
    )

    if _cached_llm is not None and _cached_llm_key == cache_key:
        return _cached_llm

    client = None
    if provider == "groq" and settings.GROQ_API_KEY:
        try:
            from langchain_groq import ChatGroq
            client = ChatGroq(
                api_key=settings.GROQ_API_KEY,
                model=groq_mod,
                temperature=temp,
                max_tokens=max_tok,
            )
        except Exception as e:
            logger.error(f"[LLM] Groq init failed: {e}")

    if client is None and provider == "gemini" and settings.GEMINI_API_KEY:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            client = ChatGoogleGenerativeAI(
                google_api_key=settings.GEMINI_API_KEY,
                model=gemini_mod,
                temperature=temp,
            )
        except Exception as e:
            logger.error(f"[LLM] Gemini init failed: {e}")

    if client is None and provider == "sarvam" and settings.SARVAM_API_KEY:
        client = get_sarvam_llm()

    # Fallbacks in case preferred provider fails
    if client is None and settings.GROQ_API_KEY and provider != "groq":
        try:
            from langchain_groq import ChatGroq
            client = ChatGroq(
                api_key=settings.GROQ_API_KEY,
                model=groq_mod,
                temperature=temp,
                max_tokens=max_tok,
            )
        except Exception:
            pass

    if client is None and settings.GEMINI_API_KEY and provider != "gemini":
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            client = ChatGoogleGenerativeAI(
                google_api_key=settings.GEMINI_API_KEY,
                model=gemini_mod,
                temperature=temp,
            )
        except Exception:
            pass

    if client is None and settings.SARVAM_API_KEY and provider != "sarvam":
        client = get_sarvam_llm()

    if client is not None:
        _cached_llm = client
        _cached_llm_key = cache_key
        return _cached_llm

    logger.warning("[LLM] WARNING: No LLM configured. Running in deterministic fallback mode.")
    return None


def _try_llm(llm, messages) -> Optional[str]:
    """Calls the LLM with exponential backoff retry and returns content string, or None on failure."""
    try:
        from app.core.resilience import retry_sync
        res = retry_sync(
            llm.invoke,
            messages,
            max_retries=2,
            base_delay=0.4,
            max_delay=2.5,
            caller_name="LLM_Inference"
        )
        return str(res.content).strip()
    except Exception as e:
        logger.error(f"[LLM] Inference error: {type(e).__name__}: {e}")
        if "sarvam" in str(e).lower() and ("deprecated" in str(e).lower() or "not found" in str(e).lower()):
            try:
                from langchain_openai import ChatOpenAI
                from app.core.resilience import retry_sync
                retry_sarvam = ChatOpenAI(
                    model="sarvam-105b",
                    api_key=settings.SARVAM_API_KEY,
                    base_url="https://api.sarvam.ai/v1",
                    temperature=0.3,
                )
                res = retry_sync(
                    retry_sarvam.invoke,
                    messages,
                    max_retries=1,
                    base_delay=0.4,
                    caller_name="Sarvam_Fallback_Retry"
                )
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
        r"(?:^|\n)\s*(?:Aapki Takleef|Sambhavit Jaanch\s*\(Diagnosis\)|Sambhavit Karan\s*\(Possible Reason\)|Possible Cause|Clinical Assessment|Nuskha|Kaise Banayein|Kab Tak Lein|Dhyan Rakhein|Safety Verified|Ayurvedic Rationale)\s*:\s*",
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


def _clean_spoken_name(raw_name: str, lang: str = "hindi") -> str:
    """
    Cleans remedy and diagnosis names for speech synthesis.
    Eliminates repetitive dual-language translations (e.g. 'Allergic Rhinitis / Vata-Kaphaja Pratishyaya (Allergic Rhinitis)'),
    English parenthetical technical terms like '(Decoction)', '(Tension Headache)', Latin botanical names, and slashes.
    """
    if not raw_name:
        return ""
    text = raw_name.strip()
    # Strip parenthetical English technical tags like (Decoction), (Tension Headache), (Allergic Rhinitis)
    text = re.sub(
        r'\((?:Decoction|Infusion|Tension Headache|Common Cold|Allergic Rhinitis|Osteoarthritis|Joint Inflammation|Linctus|Powder|Paste|Juice|Cold Infusion)[^)]*\)',
        '',
        text,
        flags=re.I
    )

    if lang == "english":
        text = re.sub(r'[\u0900-\u097F]+', '', text)
        if "/" in text:
            parts = [p.strip() for p in text.split("/")]
            text = parts[0] if parts else text
        text = re.sub(r'\([^)]*\)', '', text)
    else:
        # Indic / Hindi / Garhwali
        if "/" in text:
            parts = [p.strip() for p in text.split("/")]
            dev_parts = [p for p in parts if re.search(r'[\u0900-\u097F]', p)]
            if dev_parts:
                text = dev_parts[0]
            else:
                text = parts[-1] if len(parts) > 1 and any(w in parts[0].lower() for w in ["allergic rhinitis", "osteoarthritis", "tension headache", "acute"]) else parts[0]
        text = re.sub(r'\([A-Za-z\s,/-]+\)', '', text)

    text = re.sub(r'[*_#`~/-]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def _build_complete_spoken_remedy(
    r_name: str,
    diagnosis: str,
    prep_steps: List[str],
    dosage_str: str,
    precaution_str: str,
    lang: str = "hindi",
    is_devanagari: bool = False
) -> str:
    """
    Constructs a complete, accessible spoken audio explanation of the remedy for
    illiterate patients or audio-first users. Pronounces diagnosis, remedy name,
    step-by-step preparation instructions, dosage timing, and precautions.
    Guarantees no confusing duplicate bilingual repetition or awkward slashes.
    """
    clean_r_name = _clean_spoken_name(r_name, lang=lang)
    clean_diagnosis = _clean_spoken_name(diagnosis, lang=lang)

    speech_steps = []
    ordinals_hin = ["Pehla", "Doosra", "Teesra", "Chautha"]
    ordinals_eng = ["First", "Second", "Third", "Fourth"]

    for idx, step in enumerate(prep_steps[:3]):
        s = re.sub(r'^\s*(?:\d+[\.\)]|\-|\*)\s*', '', step)
        s = re.sub(r'^\*\*(?:[^*]+):\*\*\s*', '', s)
        s = re.sub(r'\([A-Za-z\s,/-]+\)', '', s)
        s = re.sub(r'[*_#`~]', '', s).strip()
        if not s or len(s) < 8:
            continue
        if lang == "english":
            ord_prefix = ordinals_eng[idx] if idx < len(ordinals_eng) else f"Step {idx+1}"
            speech_steps.append(f"{ord_prefix}, {s}")
        else:
            ord_prefix = ordinals_hin[idx] if idx < len(ordinals_hin) else f"Kram {idx+1}"
            speech_steps.append(f"{ord_prefix}, {s}")

    steps_speech = ". ".join(speech_steps)
    if steps_speech and not steps_speech.endswith('.'):
        steps_speech += "."

    clean_dosage = dosage_str or "Din mein do baar gungune paani ke sath"
    if lang != "english":
        if re.search(r'\b(?:take|daily|meals|lukewarm|times|after)\b', clean_dosage, re.I):
            clean_dosage = "Din mein do baar khana khane ke baad gungune paani ke sath lein"
    else:
        if re.search(r'[\u0900-\u097F]', clean_dosage) or "din mein" in clean_dosage.lower():
            clean_dosage = "Take 1 to 2 times daily after meals with lukewarm water"

    clean_dosage = re.sub(r'\([^)]*\)', '', clean_dosage).strip()

    if lang == "garhwali":
        spoken_text = (
            f"Twara lakshano bati {clean_diagnosis} lagnu chha. "
            f"Yaikhatir pramanit nuskha chha: {clean_r_name}. "
            f"Yaiku tarika aaram se suna. {steps_speech} "
            f"Khuraak: {clean_dosage}. "
            f"2 din ma aaram ni aala ta 104 par phone kara ya PHC jaawa."
        )
    elif lang == "english":
        spoken_text = (
            f"Based on your symptoms, this appears to be {clean_diagnosis}. "
            f"The recommended remedy is {clean_r_name}. "
            f"Here are the instructions: {steps_speech} "
            f"Dosage: {clean_dosage}. "
            f"If symptoms do not improve in two days, please call 104 or visit your nearest Primary Health Centre."
        )
    elif lang == "hindi":
        spoken_text = (
            f"Aapke bataye lakshano ke aadhar par {clean_diagnosis} lag raha hai. "
            f"Iske liye pramanit nuskha hai: {clean_r_name}. "
            f"Ise banane ka tarika dhyan se sunein: {steps_speech} "
            f"Khuraak: {clean_dosage}. "
            f"Dhyan rakhein, agar do din mein aaram na aaye toh 104 par call karein ya najdeeki PHC jaayein."
        )
    else:
        base_hin = (
            f"आपके बताए लक्षणों के आधार पर {clean_diagnosis} लग रहा है। "
            f"इसके लिए प्रमाणित नुस्खा है: {clean_r_name}। "
            f"इसे बनाने का तरीका ध्यान से सुनें: {steps_speech} "
            f"खुराक: {clean_dosage}। "
            f"ध्यान रखें, अगर 2 दिन में आराम न आए तो 104 पर कॉल करें या नजदीकी PHC जाएं।"
        )
        spoken_text = localize_clinical_text(base_hin, lang, is_devanagari)

    return _clean_text_for_speech(spoken_text)


# ─────────────────────────────────────────────────────────────────────────────
# Allopathic Medication Guardrail & Anti-Hallucination Filter
# ─────────────────────────────────────────────────────────────────────────────

BANNED_ALLOPATHIC_DRUGS: List[str] = [
    "paracetamol", "ibuprofen", "aspirin", "amoxicillin", "crocin",
    "dolo", "azithromycin", "metformin", "combiflam", "brufen", "cetirizine",
    "pantoprazole", "ranitidine", "omeprazole"
]


def _check_allopathic_hallucination(text: str) -> Tuple[bool, str]:
    """
    Detects and sanitizes any hallucinated allopathic medications.
    Returns (has_allopathic, cleaned_text).
    """
    if not text:
        return False, text
    text_lower = text.lower()
    has_banned = False
    cleaned = text
    for drug in BANNED_ALLOPATHIC_DRUGS:
        if re.search(rf"\b{re.escape(drug)}\b", text_lower):
            has_banned = True
            cleaned = re.sub(rf"\b{re.escape(drug)}(?:\s*\d+\s*(?:mg|ml|gm))?\b", "[allopathic drug omitted]", cleaned, flags=re.IGNORECASE)
    return has_banned, cleaned


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

    # 1.1 Differential diagnosis awareness & confidence handling
    diff_data = sym_data.get("differential") if sym_data else None
    confidence = sym_data.get("confidence", "high") if sym_data else "high"
    if diff_data and confidence == "moderate":
        diff_name = diff_data.get('diagnosis_hin', '')
        if lang == "english":
            diff_name = diff_data.get('diagnosis_eng', diff_name)
        elif lang == "garhwali":
            diff_name = diff_data.get('diagnosis_garh_dev' if is_devanagari else 'diagnosis_garh_rom', diff_name)

        uncertainty_note = (
            f" (Possible differential: {diff_name}. Note: Initial preliminary estimate; please visit PHC if symptoms persist.)"
            if lang == "english" else
            f" (वैकल्पिक सम्भावना: {diff_name}। नोट: यह प्राथमिक अनुमान है, सुधार न होने पर PHC चिकित्सक से मिलें।)"
            if (lang == "garhwali" and is_devanagari) else
            f" (Sambhavit vikalp: {diff_name}. Yeh ek prathmik anumaan hai; aaram na aane par PHC doctor se milein.)"
        )
        cause_str = f"{cause_str}{uncertainty_note}"

    # 1.2 Remedy-specific dosage resolution
    remedy_dosage = remedy.get("dosage", {})
    age = state.get("patient_age")
    if isinstance(remedy_dosage, dict):
        if age and age < 6:
            dosage_str = remedy_dosage.get("child_under_6", "Doctor se sampark karein (Under 6 requires doctor guidance)")
        elif age and age < 12:
            dosage_str = remedy_dosage.get("child_6_12") or remedy_dosage.get("adult", "Bachon ke liye: aadhi matra din mein 1 baar")
        elif age and age > 65:
            dosage_str = remedy_dosage.get("elderly") or remedy_dosage.get("adult", "Buzurgon ke liye: aadhi matra din mein 1-2 baar")
        else:
            if lang == "english":
                dosage_str = remedy_dosage.get("adult") or remedy_dosage.get("hindi") or "Take 1-2 times daily after meals"
            else:
                dosage_str = remedy_dosage.get("hindi") or remedy_dosage.get("adult") or "Din mein 1-2 baar khana khane ke baad"
    elif isinstance(remedy_dosage, str) and remedy_dosage.strip():
        dosage_str = remedy_dosage.strip()
    else:
        if age and age < 12:
            dosage_str = "Bachon ke liye: aadhi matra (half dose) din mein 1 baar khana khane ke baad"
            if lang == "english":
                dosage_str = "For children: half dose once daily after meals under parental supervision"
            elif lang not in ("hindi", "garhwali"):
                dosage_str = localize_clinical_text("बच्चों के लिए: आधी मात्रा दिन में 1 बार भोजन के बाद", lang, is_devanagari)
        elif age and age > 65:
            dosage_str = "Buzurgon ke liye: aadhi matra (half dose) din mein 1-2 baar khana khane ke baad"
            if lang == "english":
                dosage_str = "For seniors: half dose 1-2 times daily after meals with lukewarm water"
            elif lang not in ("hindi", "garhwali"):
                dosage_str = localize_clinical_text("बुजुर्गों के लिए: आधी मात्रा दिन में 1-2 बार भोजन के बाद", lang, is_devanagari)
        else:
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

    # Synthesize clean patient-reported complaint string from consultation notes
    complaints = []
    for line in (notes or "").splitlines():
        if line.strip().lower().startswith("patient:"):
            txt = line.split(":", 1)[1].strip()
            # Exclude trivial conversational yes/no
            if txt.lower() not in ("haan", "nahi", "nahin", "yes", "no", "theek", "theek hai"):
                cleaned_txt = re.sub(r"^(?:haan|ji haan|haanji|yes)\s*(?:hoti hai|hota hai)?\s*,?\s*(?:aur\s+saath\s+m[ae]in\s+)?", "", txt, flags=re.I).strip()
                if cleaned_txt:
                    complaints.append(cleaned_txt)

    if complaints:
        if len(complaints) == 1:
            condition_str = complaints[0]
        elif len(complaints) == 2:
            condition_str = f"{complaints[0]} — {complaints[1]}"
        else:
            condition_str = f"{complaints[0]} ({', '.join(complaints[1:])})"
    else:
        condition_str = user_msg or (sym_data.get('spoken_hin', '') if sym_data else 'Lakshan')

    state["consultation_summary"] = {
        "condition": condition_str,
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
            "Tu Dr. Sanjeevani hai — Uttarakhand ki samajhdaar, anubhavi aur mamtamayi gaon ki doctor.\n"
            "Patient ki poori clinical jaanch ke baad ek safe, CCRAS-pramanit Ayurvedic nuskha spasht aur poora batana hai.\n"
            "Sirf HINDI ya HINGLISH mein likh.\n\n"
            "CRITICAL CLINICAL & DIAGNOSTIC ACCURACY RULES:\n"
            "1. NO FAKE OR PREDEFINED SYMPTOMS: Do NOT invent or list symptoms that the patient does not suffer from. Base 'Aapki Takleef' and 'Sambhavit Karan' strictly and honestly on the symptoms reported by the patient.\n"
            "2. ACCURATE DIAGNOSIS (Cold is NOT Allergic Rhinitis): A common cold, acute jukham, or mild eye irritation cannot be described as 'Allergic Rhinitis' unless the patient explicitly has chronic long-term allergy. For acute cold/jukham, diagnose as 'Mausami Sardi-Zukaam (Pratishyaya / Acute Common Cold)'.\n"
            "3. NO DUPLICATE BILINGUAL REPETITIONS: Do NOT write terms twice (e.g. do NOT write 'Allergic Rhinitis / Vata-Kaphaja Pratishyaya (Allergic Rhinitis)' or 'Tulsi-Mulethi Kwath (Decoction)'). Write cleanly in simple, natural language without redundant parenthetical repetition or slashes.\n"
            "4. GROUNDING: ONLY use the remedy name, ingredients, and instructions provided in 'Verified Remedy Instructions'. Do NOT add, modify, or suggest any ingredient, herb, or medicine not explicitly listed.\n"
            "5. Do NOT promise an instant or absolute cure. Frame all advice as traditional supportive care.\n\n"
            "CRITICAL FORMATTING RULES:\n"
            "1. Har section se pehle aur baad mein ek blank line chhodhein.\n"
            "2. '**Kaise Banayein:**' ke andar diye gaye Verified Remedy Instructions ke steps ko numbered list (1. ..., 2. ..., 3. ...) mein saaf aur poora likhein.\n"
            "   Har step aam bolchal mein poora aur spasht ho. KABHI BHI koi adhoora ya truncated sentence mat likhna!\n"
            "3. '**Kab Tak Lein:**' ke andar khuraak aur lene ka samay likhein ('- ' bullet list).\n"
            "4. '**Dhyan Rakhein:**' ke andar mukhya savdhani aur 104 helpline referral likhein ('- ' bullet list).\n\n"
            "Bilkul is format mein likho:\n\n"
            "**Aapki Takleef:** [ek line mein mukhya lakshan]\n\n"
            "**Sambhavit Karan (Possible Reason):** [kya samasya lagti hai aur kyu, e.g. thakan ya sardi se hone wala sadharan jukham]\n\n"
            "**Nuskha:** [nuskhe ka naam spasht Hindi mein]\n\n"
            "**Kaise Banayein:**\n"
            "1. [Pehla step - poora instruction]\n"
            "2. [Doosra step - poora instruction]\n\n"
            "**Kab Tak Lein:**\n"
            "- [khuraak aur samay]\n\n"
            "**Dhyan Rakhein:**\n"
            "- 2 din mein aaram na aaye toh **104** par call karein ya **PHC** jaayein."
        )
        if lang == "garhwali":
            canonical_system_prompt += f"\n\n{bhashini_engine.get_garhwali_guidance(is_devanagari)}"

        user_prompt = (
            f"Patient Consultation Details:\n{notes}\n\n"
            f"Verified Remedy:\n"
            f"Name: {remedy.get('remedy_name', '')}\n"
            f"Verified Remedy Instructions:\n" + "\n".join([f"{i+1}. {s}" for i, s in enumerate(prep_steps)]) + "\n\n"
            f"Ayurvedic Benefit: {remedy.get('ayurvedic_note', '')}\n"
            f"Safety: {remedy.get('safety_check', 'Verified safe')}"
        )
        reply = _try_llm(llm, [
            SystemMessage(content=canonical_system_prompt),
            HumanMessage(content=user_prompt),
        ])
        if reply:
            has_banned, _ = _check_allopathic_hallucination(reply)
            if has_banned:
                logger.warning("[LLM SAFETY] Hallucinated allopathic drug detected in LLM reply. Forcing deterministic fallback.")
                reply = None
            # Parse numbered preparation steps from LLM output into consultation_summary
            prep_match = re.search(r"\*\*(?:Kaise Banayein|How to Prepare|बनाने का तरीका)[^*:]*:\*\*\s*\n([\s\S]*?)(?=\n\s*\*\*|$)", reply, re.IGNORECASE)
            if prep_match:
                extracted_steps = re.findall(r"(?:^|\n)\s*(?:\d+[\.\)]|\-|\*)\s*(.+)", prep_match.group(1))
                valid_steps = []
                for s in extracted_steps:
                    cl = re.sub(r"^\*\*(?:[^*]+):\*\*\s*", "", s).strip()
                    cl = cl.strip("*").strip()
                    # Keep clean, non-truncated steps
                    if len(cl) >= 15 and not cl.endswith("**"):
                        valid_steps.append(cl)

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
                else:
                    # Fall back to pristine verified steps if extracted steps are incomplete
                    state["consultation_summary"]["preparation_steps"] = prep_steps
            else:
                state["consultation_summary"]["preparation_steps"] = prep_steps

            if lang == "english":
                state["final_reply_text"] = sarvam_translate_client.translate_text_sync(reply, "hi-IN", "en-IN")
            elif lang == "garhwali":
                state["final_reply_text"] = reply
            elif lang == "hindi":
                state["final_reply_text"] = reply
            else:
                state["final_reply_text"] = localize_clinical_text(reply, lang, is_devanagari)

            # Task 3.4 — Present alternative remedy when available
            if len(remedies) > 1:
                alt = remedies[1]
                alt_name = alt.get('remedy_name', '')
                alt_text = alt.get('remedy_text', '')
                if alt_name and alt_text:
                    if lang == "english":
                        alt_card = f"\n\n---\n\n**Alternative Option:** {alt_name}\n\n{alt_text}"
                    elif lang == "garhwali":
                        alt_card = f"\n\n---\n\n**वैकल्पिक नुस्खा:** {alt_name}\n\n{alt_text}" if is_devanagari else f"\n\n---\n\n**Vaikalpik Nuskha:** {alt_name}\n\n{alt_text}"
                    else:
                        alt_card = f"\n\n---\n\n**Vaikalpik Nuskha (Alternative Option):** {alt_name}\n\n{alt_text}"
                    state["final_reply_text"] = f"{state['final_reply_text']}{alt_card}"
                    if state.get("consultation_summary"):
                        state["consultation_summary"]["alternative_remedy"] = {
                            "remedy_name": alt_name,
                            "remedy_text": alt_text,
                            "ayurvedic_note": alt.get("ayurvedic_note", "")
                        }

            disclaimer_str = (
                "⚕️ This is preliminary health guidance only, not a substitute for professional medical diagnosis or treatment. Please consult a qualified doctor for persistent or serious symptoms."
                if lang == "english" else
                ("⚕️ यै सिर्फ प्रारम्भिक स्वास्थ्य मार्गदर्शन छ, डॉक्टरी उपचार नी। गम्भीर तकलीफ मा डॉक्टर बटि जरूर मिला।" if is_devanagari else "⚕️ Yai sirf prarambhik swasthya margdarshan chha, doctory upchar ni. Gambhir takleef ma doctor bati zaroor mila.")
                if lang == "garhwali" else
                "⚕️ Yeh sirf prathmik swasthya margdarshan hai, chikitsa parishad ka vivaranik upchar nahi. Kripya gambhir ya lagatar takleef mein doctor se zaroor milein."
            )
            state["disclaimer"] = disclaimer_str
            state["final_reply_text"] = f"{state['final_reply_text']}\n\n{disclaimer_str}"

            state["spoken_reply_text"] = _build_complete_spoken_remedy(
                r_name=r_name,
                diagnosis=cause_str,
                prep_steps=state["consultation_summary"].get("preparation_steps") or prep_steps,
                dosage_str=dosage_str,
                precaution_str=precaution_str,
                lang=lang,
                is_devanagari=is_devanagari
            )
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

    # Task 3.4 — Present alternative remedy in deterministic card
    if len(remedies) > 1:
        alt = remedies[1]
        alt_name = alt.get('remedy_name', '')
        alt_text = alt.get('remedy_text', '')
        if alt_name and alt_text:
            if lang == "english":
                alt_card = f"\n\n---\n\n**Alternative Option:** {alt_name}\n\n{alt_text}"
            elif lang == "garhwali":
                alt_card = f"\n\n---\n\n**वैकल्पिक नुस्खा:** {alt_name}\n\n{alt_text}" if is_devanagari else f"\n\n---\n\n**Vaikalpik Nuskha:** {alt_name}\n\n{alt_text}"
            else:
                alt_card = f"\n\n---\n\n**Vaikalpik Nuskha (Alternative Option):** {alt_name}\n\n{alt_text}"
            state["final_reply_text"] = f"{state['final_reply_text']}{alt_card}"
            if state.get("consultation_summary"):
                state["consultation_summary"]["alternative_remedy"] = {
                    "remedy_name": alt_name,
                    "remedy_text": alt_text,
                    "ayurvedic_note": alt.get("ayurvedic_note", "")
                }

    disclaimer_str = (
        "⚕️ This is preliminary health guidance only, not a substitute for professional medical diagnosis or treatment. Please consult a qualified doctor for persistent or serious symptoms."
        if lang == "english" else
        ("⚕️ यै सिर्फ प्रारम्भिक स्वास्थ्य मार्गदर्शन छ, डॉक्टरी उपचार नी। गम्भीर तकलीफ मा डॉक्टर बटि जरूर मिला।" if is_devanagari else "⚕️ Yai sirf prarambhik swasthya margdarshan chha, doctory upchar ni. Gambhir takleef ma doctor bati zaroor mila.")
        if lang == "garhwali" else
        "⚕️ Yeh sirf prathmik swasthya margdarshan hai, chikitsa parishad ka vivaranik upchar nahi. Kripya gambhir ya lagatar takleef mein doctor se zaroor milein."
    )
    state["disclaimer"] = disclaimer_str
    state["final_reply_text"] = f"{state['final_reply_text']}\n\n{disclaimer_str}"

    state["spoken_reply_text"] = _build_complete_spoken_remedy(
        r_name=r_name,
        diagnosis=cause_str,
        prep_steps=prep_steps,
        dosage_str=dosage_str,
        precaution_str=precaution_str,
        lang=lang,
        is_devanagari=is_devanagari
    )
    return state


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
    Checks whether the patient's consultation notes contain sufficient clinical information
    (chief complaint, timeline/duration, and either confirmed denial of other symptoms or multiple distinct symptom domains).
    A brief statement like 'akshar naak band rehta hai' or 'sar dard hai' WITHOUT duration is NEVER clinically sufficient.
    """
    if not notes:
        return False
    notes_lower = notes.lower()

    # (a) Duration / timing cue - must have explicit number or temporal anchor, NOT bare words like 'din'
    duration_pattern = r"\b(?:\d+\s*(?:din|hafte|ghante|mahine|days?|hours?|weeks?|months?)|kal\s*se|aaj\s*se|parso\s*se|subah\s*se|shaam\s*se|raat\s*se|since\s+\w+|katga\s*din|kaba\s*bati)\b"
    has_duration = bool(re.search(duration_pattern, notes_lower))

    # Without duration, clinical assessment cannot be finalized safely on early turns
    if not has_duration:
        return False

    # (b) Severity cue
    severity_cues = [
        "tez", "tezz", "severe", "bahut", "bohot", "mild", "halka", "halki", "high", "zyada", "badh", "intense", "ghani"
    ]
    has_severity = any(re.search(rf"\b{re.escape(cue)}\b", notes_lower) for cue in severity_cues)

    # (c) Confirmation that there are no other symptoms
    has_denied_other = bool(re.search(
        r"\b(?:aur koi (?:lakshan|takleef) nahi|koi aur nahi|kuch nahi|nahi hai|nahin hai|bas yahi|bas itna|no other|nothing else|only this)\b",
        notes_lower
    ))

    # (d) Distinct symptom domains (avoids counting 'naak' and 'naak band' as 2 distinct symptoms)
    symptom_domains = {
        "nasal": ["naak", "zukaam", "zukam", "jukham", "jukhaam", "chheenk", "sneezing", "congestion", "sardi", "cold"],
        "throat": ["gala", "gale", "kharash", "sore throat"],
        "cough": ["khansi", "cough"],
        "fever": ["bukhar", "fever", "taap", "thand"],
        "head": ["sar dard", "sir dard", "headache", "mund"],
        "digestive": ["pet", "gas", "acidity", "apach", "ulti", "dast"],
        "body": ["badan dard", "thakan", "kamzori"]
    }
    matched_domains = set()
    for domain, kws in symptom_domains.items():
        if any(re.search(rf"\b{re.escape(kw)}\b", notes_lower) for kw in kws):
            matched_domains.add(domain)

    # Has duration AND (denied other symptoms OR multiple distinct domains) -> sufficient!
    if has_denied_other and len(matched_domains) >= 1:
        return True
    if has_severity and has_denied_other:
        return True
    if len(matched_domains) >= 2 and (has_duration or has_denied_other):
        return True

    return False


def compress_consultation_notes(notes: str, llm=None) -> str:
    """
    Compresses long consultation notes (>1500 characters) to keep LLM context bounded
    and focused on clinically vital symptoms and timelines.
    """
    if not notes or len(notes) <= 1500:
        return notes

    if llm:
        try:
            summary_prompt = (
                "You are an expert clinical summarizer. Condense the following doctor-patient consultation "
                "notes into a concise clinical briefing (under 400 characters). "
                "Preserve: 1) Chief complaint, 2) Duration & onset, 3) Reported/denied symptoms, 4) Known conditions. "
                "Output ONLY the concise briefing in Hindi/English."
            )
            res = _try_llm(llm, [
                SystemMessage(content=summary_prompt),
                HumanMessage(content=f"Consultation Notes to condense:\n{notes}")
            ])
            if res and len(res.strip()) > 20 and not res.startswith("Error"):
                lines = [l.strip() for l in notes.splitlines() if l.strip()]
                recent_lines = lines[-4:] if len(lines) >= 4 else lines
                recent_context = "\n".join(recent_lines)
                return f"[Clinical Summary of earlier turns: {res.strip()}]\n{recent_context}"
        except Exception as e:
            logger.warning(f"[responder_node] LLM context summarization note: {e}")

    # Deterministic fallback compression:
    # Retain the chief complaint and the last 4 dialogue lines
    lines = [l.strip() for l in notes.splitlines() if l.strip()]
    first_patient = next((l for l in lines if l.startswith("Patient:")), lines[0] if lines else "")
    recent_lines = lines[-4:] if len(lines) >= 4 else lines
    distilled = [f"[Chief Complaint: {first_patient}]"]
    for l in recent_lines:
        if l not in distilled and l != first_patient:
            distilled.append(l)
    return "\n".join(distilled)


# ─────────────────────────────────────────────────────────────────────────────
# Doctor Consultation Dialogue Inner Flow
# ─────────────────────────────────────────────────────────────────────────────

YELLOW_FLAG_EXPLANATIONS: Dict[str, Dict[str, str]] = {
    "prolonged_fever": {
        "hin": "bukhar lambe samay se bana hua hai",
        "eng": "the fever has persisted for an extended duration",
        "garh_dev": "बुखार काफी दिन बटि बणि रयु छ",
        "garh_rom": "bukhar kaafi din bati bani rahyu chha"
    },
    "severe_localized_pain": {
        "hin": "dard kafi tez aur gambhir hai",
        "eng": "the pain is severe and localized",
        "garh_dev": "पीर बहुत तेज और असहनीय छ",
        "garh_rom": "peed bahut tej aur asahniya chha"
    },
    "dehydration_signs": {
        "hin": "sharir mein paani ki kami (dehydration) ke lakshan dikh rahe hain",
        "eng": "signs of clinical dehydration are present",
        "garh_dev": "शरीर मा पाणी की कमी (डिहाइड्रेशन) का लक्षण छन",
        "garh_rom": "sharir ma paani ki kami (dehydration) ka lakshan chhan"
    },
    "persistent_vomiting": {
        "hin": "lagatar ulti hone se sharir kamzor ho sakta hai",
        "eng": "persistent vomiting can cause severe weakness and electrolyte loss",
        "garh_dev": "लगातार उलटी होण से कमजोरी बढ़ सकदी",
        "garh_rom": "lagatar ulti hon se kamzori badh sakdi"
    },
    "high_risk_age_monitoring": {
        "hin": "umra ke anusaar doctori dekh-rekh aur savdhani zaroori hai",
        "eng": "age-stratified monitoring requires clinical evaluation",
        "garh_dev": "उमरा का हिसाब से डॉक्टर की जांच जरूरी छ",
        "garh_rom": "umra ka hisaab se doctor ki jaanch zaroori chha"
    }
}


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

    # 3. YELLOW tier (2-turn clarification flow)
    if tier == "Yellow":
        state["retrieved_remedies"] = []
        flags = state.get("clinical_flags", [])
        yellow_turn = state.get("yellow_clarification_turn") or 0

        # Turn 0: First yellow encounter — ask clarifying triage question
        if yellow_turn == 0:
            state["yellow_clarification_turn"] = 1
            if any("prolonged_fever" in f or "fever" in f for f in flags):
                if lang == "garhwali":
                    reply = "यै बुखार कतगा दिन बटि छ और क्या थरथरी/जाड़ लगिक आणु छ?" if is_devanagari else "Yai bukhar katga din bati chha aur kya tharthari lagik aanoo chha?"
                elif lang == "english":
                    reply = "How many days have you had this fever, and are you having chills or shivering?"
                elif lang == "hindi":
                    reply = "Yeh bukhar kitne dino se hai aur kya thand lagkar chadh raha hai?"
                else:
                    reply = localize_clinical_text("यह बुखार कितने दिनों से है और क्या ठंड लगकर चढ़ रहा है?", lang, is_devanagari)
            elif any("severe_localized_pain" in f or "pain" in f for f in flags):
                if lang == "garhwali":
                    reply = "पीर कखि जादा होंदू छ, और क्या दगड़ मा उलटी या चक्कर भी छ?" if is_devanagari else "Peed kakhi jaada hondu chha, aur kya dagad ma ulti ya chakkar bhi chha?"
                elif lang == "english":
                    reply = "Where exactly is the pain most severe, and do you also have nausea, vomiting, or dizziness?"
                elif lang == "hindi":
                    reply = "Dard pet ya sharir ke kis hisse mein zyada hai, aur kya ulti ya chakkar bhi hai?"
                else:
                    reply = localize_clinical_text("दर्द शरीर के किस हिस्से में ज्यादा है, और क्या उल्टी या चक्कर भी है?", lang, is_devanagari)
            elif any("dehydration_signs" in f or "dehydration" in f for f in flags):
                if lang == "garhwali":
                    reply = "क्या गौल बहुत सुखाणु छ या पेशाब कम/प्यूलो रंग को आणु छ?" if is_devanagari else "Kya goul bahut sukhanu chha ya peshab kam/pyulo rang ko aanoo chha?"
                elif lang == "english":
                    reply = "Is your mouth very dry, or are you passing less or dark-colored urine?"
                elif lang == "hindi":
                    reply = "Kya gala bohot sookh raha hai ya peshab kam/peele rang ka aa raha hai?"
                else:
                    reply = localize_clinical_text("क्या गला बहुत सूख रहा है या पेशाब कम और गहरे पीले रंग का आ रहा है?", lang, is_devanagari)
            elif any("persistent_vomiting" in f or "vomiting" in f for f in flags):
                if lang == "garhwali":
                    reply = "क्या पाणी पीण पर भी उलटी होणी छ, और कतगा देर बटि?" if is_devanagari else "Kya paani peen par bhi ulti honi chha, aur katga der bati?"
                elif lang == "english":
                    reply = "Are you unable to keep even water or liquids down, and since how long?"
                elif lang == "hindi":
                    reply = "Kya paani ya kuch bhi lene par turant ulti ho rahi hai, aur kab se?"
                else:
                    reply = localize_clinical_text("क्या पानी या कुछ भी लेने पर तुरंत उल्टी हो रही है, और कब से?", lang, is_devanagari)
            else:
                if lang == "garhwali":
                    reply = "यै तकलीफ कतगा दिन बटि छ और क्या दगड़ मा कोई और परेशानी भी छ?" if is_devanagari else "Yai takleef katga din bati chha aur kya dagad ma koi aur pareshani bhi chha?"
                elif lang == "english":
                    reply = "Since how long have you had this issue, and are you noticing any other serious discomfort?"
                elif lang == "hindi":
                    reply = "Yeh takleef kab se hai aur kya iske sath koi anya gambhir pareshani mehsoos ho rahi hai?"
                else:
                    reply = localize_clinical_text("यह तकलीफ कब से है और क्या इसके साथ कोई अन्य गंभीर परेशानी महसूस हो रही है?", lang, is_devanagari)

            state["final_reply_text"] = reply
            return state

        # Turn >= 1: Second encounter — supportive care + strong PHC referral
        state["yellow_clarification_turn"] = yellow_turn + 1
        matched_reasons = []
        for cat, expl in YELLOW_FLAG_EXPLANATIONS.items():
            if any(cat in f for f in flags):
                if lang == "garhwali":
                    matched_reasons.append(expl["garh_dev"] if is_devanagari else expl["garh_rom"])
                elif lang == "english":
                    matched_reasons.append(expl["eng"])
                else:
                    matched_reasons.append(expl["hin"])

        reasons_prefix = ""
        if matched_reasons:
            reasons_str = " aur ".join(matched_reasons) if lang != "english" else " and ".join(matched_reasons)
            if lang == "english":
                reasons_prefix = f"Because {reasons_str}, "
            elif lang == "garhwali":
                reasons_prefix = f"क्युंकी {reasons_str}, " if is_devanagari else f"Kyunki {reasons_str}, "
            else:
                reasons_prefix = f"चूंकि {reasons_str}, इसलिए " if is_devanagari else f"Kyunki {reasons_str}, isliye "

        if lang == "english":
            reply = (
                f"{reasons_prefix}your symptoms require a formal clinical evaluation at your nearest Primary Health Centre (PHC).\n\n"
                "In the meantime, rest well and stay adequately hydrated with clean water or ORS. "
                "For immediate medical assistance or tele-consultation, please call **104** (e-Sanjeevani) or **108**."
            )
        elif lang == "garhwali":
            if is_devanagari:
                reply = (
                    f"{reasons_prefix}त्वरा लक्ष्णों मा नज़दीकी **PHC** मा डॉक्टर थैं दिखौण बहुत जरूरी छ।\n\n"
                    "तब तक ओआरएस (ORS) या पाणी खूब पिया और आराम करा। सलाह खातिर **104** (ई-संजीवनी) पर फोन करा।"
                )
            else:
                reply = (
                    f"{reasons_prefix}twara lakshano ma nazdiki **PHC** ma doctor thain dikhon bahut zaroori chha.\n\n"
                    "Tab tak ORS ya paani khoob piya aur aaram kara. Salah khatir **104** (e-Sanjeevani) par call kara."
                )
        elif lang == "hindi":
            reply = (
                f"{reasons_prefix}aapke lakshan dekhkar lagta hai ki aapko nazdiki **PHC (Primary Health Centre)** jakar doctor ko dikhana chahiye.\n\n"
                "Tab tak khoob paani/ORS piyein aur poora aaram karein. Kisi bhi sahayata ke liye **104** (e-Sanjeevani) par call karein."
            )
        else:
            base_rep = (
                f"{reasons_prefix}आपके लक्षण देखकर लगता है कि आपको नजदीकी **PHC (प्राथमिक स्वास्थ्य केंद्र)** जाकर डॉक्टर को दिखाना चाहिए।\n\n"
                "तब तक खूब पानी/ORS पिएं और पूरा आराम करें। किसी भी सहायता के लिए **104** (ई-संजीवनी) पर कॉल करें।"
            )
            reply = localize_clinical_text(base_rep, lang, is_devanagari)

        # Standard medical disclaimer on Yellow referral
        disclaimer_hin = "सूचना: यह केवल प्राथमिक स्वास्थ्य मार्गदर्शन है, आपातकालीन या गंभीर स्थिति में तुरंत डॉक्टर या अस्पताल से संपर्क करें।"
        state["disclaimer"] = localize_clinical_text(disclaimer_hin, lang, is_devanagari)
        state["final_reply_text"] = reply
        return state

    # 4. CONSULTATION
    if phase == "CONSULTATION":
        turn_count = state.get("turn_count", 1)
        patient_text = raw_msg or user_msg

        # Structured Symptom Profile tracking
        stored_profile_dict = state.get("structured_symptoms")
        profile = StructuredSymptomProfile.from_dict(stored_profile_dict)
        profile.update_from_narrative(patient_text)
        state["structured_symptoms"] = profile.to_dict()

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

        # Compress context if notes exceed ~1500 characters
        if len(updated_notes) > 1500:
            updated_notes = compress_consultation_notes(updated_notes, llm)

        state["consultation_notes"] = updated_notes

        from app.core.dialogue_manager import has_symptom_mention
        has_actual_symptoms = has_symptom_mention(updated_notes) or has_symptom_mention(patient_text) or bool(profile.chief_complaint)

        has_sufficient = _has_sufficient_info(updated_notes) or profile.is_clinically_sufficient()
        can_conclude = (has_sufficient or turn_count >= 2) and has_actual_symptoms
        force_conclude = (turn_count >= 5) and has_actual_symptoms

        sym_data = get_symptom_data(updated_notes)

        should_conclude = False
        conclude_llm = None

        if llm:
            canonical_consultation_prompt = (
                "Tu Dr. Sanjeevani hai — Uttarakhand ke gaon ki anubhavi, samajhdaar aur mamtamayi mahila doctor.\n"
                "Ek asali, chatur aur sahanubhooti-purna doctor ki tarah clinical jaanch (consultation) kar.\n\n"
                "CLINICAL CONSULTATION & DIAGNOSIS RULES:\n"
                "1. EMPATHY & LISTENING FIRST:\n"
                "   - Patient ki baat ko pehle 2-3 shabdon mein dhyan se acknowledge kar (jaise 'Maine aapki baat suni...', 'Achha, ghutne mein dard hai...').\n"
                "   - Jo lakshan patient ne pehle hi mana kar diya ho (e.g. agar patient ne kaha 'bukhar nahi hai', 'chot nahi lagi'), USE DUBARA KABHI MAT POOCHHNA!\n"
                "2. CONDITION-SPECIFIC DIAGNOSTIC QUESTIONS (No generic repeated questions):\n"
                "   - Apne sawaal ko patient ki MUKHYA TAKLEEF ke anusaar hi poochh, bewajah har kisi se bukhar ya khansi mat poochh:\n"
                "     * Pet / Acidity / Gas: Jalan kab hoti hai (khana khane ke baad ya khali pet), khatti dakar ya ji michlana to nahi?\n"
                "     * Jodon / Ghutne ka dard: Kya subah uthne par jakadan hoti hai, ya chalne-phirne mein soojan/dard badhta hai?\n"
                "     * Sar dard: Sar mein dard kahan hai (aage, dono taraf ya peeche), aur kya neend na aane ya tanav se hai?\n"
                "     * Sardi / Zukaam: Naak beh rahi hai ya band hai, aur kya gala kharab ya halki thand lag rahi hai?\n"
                "     * Khansi: Khansi sookhi hai ya balgam wali?\n"
                "3. NATURAL HINDI ONLY — NO ENGLISH MEDICAL JARGON:\n"
                "   - 'nausea', 'heartburn', 'regurgitation', 'fatigue', 'gastric', 'inflammation' jaise angrezi shabdon ka prayog bilkul MAT karo!\n"
                "   - Inki jagah aam bolchal ke shabdon ka prayog karo: 'ji michlana', 'chhati mein jalan', 'khatti dakar', 'kamzori/thakan', 'soojan'.\n"
                "4. CONVERSATIONAL ECONOMY & TURN PACING (2-3 Turns Maximum):\n"
                "   - Turn 1: Duration aur mukhya takleef ka pattern poochho (ek chhota, apnepan bhara sawaal).\n"
                "   - Turn 2: Agar duration aur lakshan spasht hain, toh ek antim sambandhit rule-out sawaal poochho ya agar sab spasht ho chuka hai toh conclude karo.\n"
                "   - Turn 3+: Agar patient ne duration aur mukhya lakshan bata diye hain aur koi red-flag nahi hai, toh TURANT 'has_enough_info': true aur 'conclude': true karke nuskha deliver karo. Patient ko lambe sawalon mein mat uljhao!\n"
                "5. ACCURATE DIAGNOSIS:\n"
                "   - Aam sardi-zukam ko Pratishyaya / Common Cold hi maano (Allergic Rhinitis tabhi jab patient purani allergy bataye).\n"
                "6. ONLY ASK QUESTIONS DURING INQUIRY TURNS (No premature advice/drugs):\n"
                "   - Jab tak 'conclude': true na ho, tab tak patient ko koi nuskha, gharelu totka, ya dawa (jaise paracetamol) bilkul MAT batao!\n"
                "   - Inquiry turns mein 'reply' mein sirf aur sirf ek sateek clinical sawaal hona chahiye.\n"
                "7. EK BAAR MEIN SIRF EK CHHOTA SAWAAL (15-20 words max), bilkul aam bolchal mein.\n"
                "8. OUTPUT FORMAT: Respond strictly in valid JSON format:\n"
                '{\n  "has_enough_info": true/false,\n  "reply": "Doctor ka agla sateek clinical sawaal ya nuskhe ki or badhne ka sandesh",\n  "conclude": true/false\n}\n'
                "Do NOT output markdown code blocks or text outside the JSON."
            )
            if lang == "garhwali":
                canonical_consultation_prompt += f"\n\n{bhashini_engine.get_garhwali_guidance(is_devanagari)}"

            clinical_summary = profile.to_clinical_summary()
            human_content = (
                f"Conversation History:\n{updated_notes}\n\n"
                f"Structured Clinical Profile: {clinical_summary}\n\n"
                f"Turn Count: {turn_count}/5\n"
                f"Patient just said: \"{patient_text}\"\n\n"
                "Evaluate clinical information sufficiency. Respond as Dr. Sanjeevani with valid JSON: "
                '{"has_enough_info": true/false, "reply": "...", "conclude": true/false}'
            )
            reply = _try_llm(llm, [
                SystemMessage(content=canonical_consultation_prompt),
                HumanMessage(content=human_content),
            ])

            if reply:
                parsed_json = None
                json_match = re.search(r"\{[\s\S]*\}", reply)
                if json_match:
                    try:
                        parsed_json = json.loads(json_match.group(0))
                    except Exception:
                        parsed_json = None

                if parsed_json:
                    llm_has_info = bool(parsed_json.get("has_enough_info", False))
                    llm_conclude = bool(parsed_json.get("conclude", False))
                    reply_content = str(parsed_json.get("reply", "")).strip()
                else:
                    llm_has_info = ("##CONCLUDE##" in reply) or has_sufficient
                    llm_conclude = ("##CONCLUDE##" in reply) or (has_sufficient and turn_count >= 2) or force_conclude
                    reply_content = reply.replace("##CONCLUDE##", "").strip()

                patient_denied_other = bool(re.search(
                    r"\b(?:aur koi (?:lakshan|takleef) nahi|koi aur nahi|kuch nahi|nahi hai|nahin hai|bas yahi|bas itna|no other|nothing else|only this)\b",
                    patient_text.lower()
                )) or ("no_other_symptoms" in profile.denied_symptoms)

                # Clinical guardrail on premature conclusion:
                # On Turn 1, only conclude if the patient provided a comprehensive narrative containing duration AND denial of other symptoms.
                # Otherwise, doctor MUST ask at least one clarifying diagnostic question.
                duration_pattern = r"\b(?:\d+\s*(?:din|hafte|ghante|mahine|days?|hours?|weeks?|months?)|kal\s*se|aaj\s*se|parso\s*se|subah\s*se|shaam\s*se|raat\s*se|since\s+\w+|katga\s*din|kaba\s*bati)\b"
                has_explicit_duration = bool(re.search(duration_pattern, patient_text.lower())) or bool(re.search(duration_pattern, updated_notes.lower()))
                if turn_count <= 1 and not (patient_denied_other and has_explicit_duration):
                    llm_conclude = False
                    llm_has_info = False

                # Conclude when:
                # - LLM confirms it has enough info after at least 1 diagnostic exchange
                # - OR turn_count >= 2 and (has_sufficient or patient_denied_other)
                # - OR force_conclude (turn_count >= 5)
                can_finish = (
                    force_conclude
                    or (llm_conclude and llm_has_info and (turn_count >= 2 or (patient_denied_other and has_explicit_duration)))
                    or (turn_count >= 2 and has_sufficient and patient_denied_other)
                    or (turn_count >= 3 and has_sufficient)
                )

                if can_finish and has_actual_symptoms:
                    should_conclude = True
                    conclude_llm = llm
                else:
                    clean_reply = re.sub(r"^\{.*\"reply\":\s*\"([^\"]+)\".*\}$", r"\1", reply_content).strip()
                    clean_reply = clean_reply.replace("##CONCLUDE##", "").strip()
                    if not clean_reply:
                        clean_reply = "Aapko yeh takleef kab se hai?"
                    if lang == "english":
                        translated_reply = sarvam_translate_client.translate_text_sync(clean_reply, "hi-IN", "en-IN")
                    elif lang == "garhwali":
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
            if turn_count >= 5 or force_conclude:
                should_conclude = True
                conclude_llm = None
            elif has_sufficient:
                should_conclude = True
                conclude_llm = None
            elif not has_actual_symptoms:
                if lang == "garhwali":
                    reply = "त्वकु क्या तकलीफ या बीमारी हो रयु छ? कल्याणी से अपणा लक्षण बतावा।" if is_devanagari else "Twaku kya takleef ya bimaari ho rahyu chha? Kripya apna lakshan batava."
                elif lang == "english":
                    reply = "Could you please describe what specific symptoms or health concerns you are experiencing (such as fever, headache, cough, or stomach pain)?"
                elif lang == "hindi":
                    reply = "Aapko kya takleef ya lakshan mehsoos ho rahe hain? Kripya batayein (jaise bukhar, sardi, sar dard, ya pet dard) taaki main sahi jaanch kar sakoon."
                else:
                    base_intake = "आपको क्या तकलीफ या लक्षण महसूस हो रहे हैं? कृपया बताएं (जैसे बुखार, सर्दी, सिर दर्द, या पेट दर्द) ताकि मैं सही जांच कर सकूं।"
                    reply = localize_clinical_text(base_intake, lang, is_devanagari)
            elif turn_count <= 1:
                # Turn 1: Probe duration
                if lang == "garhwali":
                    reply = sym_data["t1_garh_dev"] if is_devanagari else sym_data["t1_garh_rom"]
                elif lang == "english":
                    reply = sym_data["t1_eng"]
                elif lang == "hindi":
                    reply = sym_data["t1_hin"]
                else:
                    reply = localize_clinical_text(sym_data["t1_hin"], lang, is_devanagari)
            elif turn_count == 2:
                # Turn 2: Probe key warning / associated symptoms (e.g. ulti / dast / vomit)
                if lang == "garhwali":
                    reply = sym_data.get("t2_garh_dev", "क्या दगड़ मा उलटी या दस्त भी छ?") if is_devanagari else sym_data.get("t2_garh_rom", "Kya dagad ma ulti ya dast bhi chha?")
                elif lang == "english":
                    reply = sym_data.get("t2_eng", "Do you also have nausea, vomiting, or loose motions?")
                elif lang == "hindi":
                    reply = sym_data.get("t2_hin", "Kya iske sath ulti, dast ya bukhar bhi hai?")
                else:
                    reply = localize_clinical_text(sym_data.get("t2_hin", "क्या इसके साथ उल्टी, दस्त या बुखार भी है?"), lang, is_devanagari)
            elif turn_count == 3:
                # Turn 3: Probe continuity / pattern (checks for lagatar)
                if lang == "garhwali":
                    reply = "क्या यै तकलीफ लगातार बणी रयी छ या कभिक-कभि होंदी छ?" if is_devanagari else "Kya yai takleef lagatar bani rayi chha ya kabhik-kabhi hondi chha?"
                elif lang == "english":
                    reply = "Is this discomfort continuous throughout the day or does it come and go?"
                elif lang == "hindi":
                    reply = "Kya yeh takleef lagatar bani rehti hai ya ruk-ruk kar aati hai?"
                else:
                    reply = localize_clinical_text("क्या यह तकलीफ लगातार बनी रहती है या रुक-रुक कर आती है?", lang, is_devanagari)
            elif turn_count == 4:
                # Turn 4: Probe appetite / weakness (checks for kamzori or khana)
                if lang == "garhwali":
                    reply = "क्या भूख नी लगणी छ या बहुत कमजोरी महसूस होणी छ?" if is_devanagari else "Kya bhookh ni lagni chha ya bahut kamzori mehsoos honi chha?"
                elif lang == "english":
                    reply = "Are you experiencing severe weakness or difficulty eating food?"
                elif lang == "hindi":
                    reply = "Kya khana khane mein pareshani hai ya bahut kamzori mehsoos ho rahi hai?"
                else:
                    reply = localize_clinical_text("क्या खाना खाने में परेशानी है या बहुत कमजोरी महसूस हो रही है?", lang, is_devanagari)
            else:
                # Turn >= 5: Hard cap reached -> must conclude
                should_conclude = True
                conclude_llm = None

            if not should_conclude:
                state["consultation_notes"] = f"{updated_notes}\nDoctor: {reply}"
                state["final_reply_text"] = reply
                return state

        if should_conclude:
            # DESIGN EXCEPTION (Task 9): responder_node owns exactly ONE phase transition:
            # CONSULTATION -> CONCLUDED when information is sufficient or hard cap reached.
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

    def _clean_unicode_chars(s: str) -> str:
        return (
            s.replace('\u202f', ' ')
            .replace('\xa0', ' ')
            .replace('\u2011', '-')
            .replace('\u2013', '-')
            .replace('\u2014', '-')
        )

    if "final_reply_text" in out and isinstance(out["final_reply_text"], str):
        out["final_reply_text"] = _clean_unicode_chars(out["final_reply_text"])
    if "spoken_reply_text" in out and isinstance(out["spoken_reply_text"], str):
        out["spoken_reply_text"] = _clean_unicode_chars(out["spoken_reply_text"])

    return out