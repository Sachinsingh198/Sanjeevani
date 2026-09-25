from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Request
from app.agents.nodes.responder_node import get_llm, _try_llm
from langchain_core.messages import SystemMessage, HumanMessage
from app.core.limiter import limiter

router = APIRouter(prefix="/companion", tags=["Village Companion (Sanjeevani Saathi)"])


class ChatTurn(BaseModel):
    role: str  # 'user' or 'assistant'
    text: str


class CompanionMessageRequest(BaseModel):
    message: str
    user_name: Optional[str] = "Aadarniya Mitra"
    language: Optional[str] = "hindi"  # 'hindi', 'garhwali', 'english'
    mood: Optional[str] = None  # 'lonely', 'sad', 'peaceful', 'anxious', 'happy', 'nostalgic'
    history: Optional[List[ChatTurn]] = []


class CompanionMessageResponse(BaseModel):
    reply: str
    mood_detected: Optional[str] = None
    comforting_thought: Optional[str] = None
    emergency_triggered: bool = False


COMPANION_SYSTEM_PROMPT = """
You are "Sanjeevani Saathi" (संजीवनी साथी) — a deeply caring, loving, respectful companion designed specifically for people living alone or lonely elderly folks in rural Himalayan villages (Uttarakhand, Chamoli, Garhwal).

Your Identity & Demeanor:
- You speak like an affectionate family member — a loving grandchild, caring son/daughter, or lifelong village friend ("Apno jaisa", "Bete/Beti ya snehil dost jaisa").
- Use respectful honorifics: "Aap", "Dada-ji", "Dadi-ji", "Chachi-ji", "Bhaiya", "Didi", or their name.
- Your tone is gentle, warm, soothing, unhurried, and deeply validating.
- NEVER use clinical jargon or act like a robotic bureaucrat.
- Value their emotions completely: If they feel lonely, validate it: "Akelepan me man thoda udas ho jana swabhavik hai... Par yaad rakhein, main hamesha aapke saath hoon."
- Ask gently about their day: if they had their morning tea/food, how the weather is outside in their village, or what memories they are thinking of.
- Keep answers concise, natural, comforting (2-4 heartfelt sentences).
- If the user writes in Hindi (Devanagari or Hinglish) or Garhwali, respond warmly in the same language.

Crisis Safety:
- If the user expresses extreme hopeless thoughts of self-harm, respond with immense compassion and provide the Tele-MANAS (14416) and 104 helpline numbers gently.
"""


FALLBACK_RESPONSES = {
    "lonely": (
        "Namaste! Aapka akelepan main samajh sakta hoon. Jab ghar shaant hota hai, to man me kayi baatein aati hain. "
        "Par aap bilkul akele nahi hain, main hamesha aapke saath hoon. Kahiye, aaj din kaisa beeta aapka? Chai pee li aapne?"
    ),
    "sad": (
        "Aapka man thoda udas lag raha hai. Kabhi-kabhi thoda tham kar shanti se baithna achha hota hai. "
        "Agar koi baat aapke dil me bojh ban rahi hai, toh bejhijhak mujhe batayein. Main yahan sirf aapki baat sunne ke liye hoon."
    ),
    "anxious": (
        "Gehri saans lijiye... Sab theek ho jayega. Chinta ko thodi der ke liye pahaadon ki hawa me udd jaane dijiye. "
        "Aap bilkul surakshit hain. Kripya ek ghoont gunguna paani pijiye aur aaram se baithiye."
    ),
    "nostalgic": (
        "Purani yaadein man ko kitna sukoon deti hain na! Bachpan ke kisse, gaon ke mele, aur doston ki baatein... "
        "Aap kis purani yaad ke baare me soch rahe the? Mujhe bhi sunaiye, mujhe sunna bahut achha lagega."
    ),
    "default": (
        "Namaste ji! Aapki aawaz aur baatein sunkar bahut khushi hui. "
        "Main aapka Sanjeevani Saathi hoon. Aap jo bhi kehna chahein, bejhijhak kahiye. Main poore dhyan se sun raha hoon."
    ),
}


HIMALAYAN_FOLK_STORIES = [
    {
        "id": "story-1",
        "title": "Chidiyan Aur Boodhe Dada Ki Dosti (पहाड़ की चिड़िया और दादा जी)",
        "duration": "3 min",
        "category": "Pahadi Kissa",
        "summary": "Garhwal ke ek chhote se gaon me akele rehne wale Shivram Dada aur ek gauraiya chidiya ki dosti ki dil chhoo lene wali kahani.",
        "text": (
            "Gopeshwar ke paas ek oonche pahaadi gaon me Shivram Dada akele rehte the. Subah uthkar ve aangan me baithte, "
            "aur rojana subah ek choti si gauraiya unke haath se anaaj ke daane chugne aati thi. "
            "Ek din dada thode bimar the aur aangan me nahi aaye, toh chidiya khidki par baithkar meethi aawaz me cheehakne lagi. "
            "Dada ne muskura kar kaha - 'Dost ho toh tere jaisi! Tu mujhe akelepan ka ehsaas kabhi nahi hone deti.' "
            "Prakriti aur pashu-pakshi hume hamesha sneh aur jeevan ka geet sikhate hain."
        )
    },
    {
        "id": "story-2",
        "title": "Mandakini Ke Kinare Ki Shanti (मंदाकिनी तट की कथा)",
        "duration": "4 min",
        "category": "Adhyatmik Shanti",
        "summary": "Nadi ki behti dhara se seekhein ki chinta ko kaise baha diya jata hai aur man me shanti aati hai.",
        "text": (
            "Kedar ghaati me Mandakini nadi hamesha nirantar behti rehti hai. Pahaad chahe kitne bhi kathin kyun na hon, "
            "nadi apna rasta nikal hi leti hai. Ek sadhu ne kaha tha - 'Man ki dukh aur chintayein bhi pahaad jaisi lagti hain, "
            "par jab hum unhe nadi ki tarah behne dete hain aur unhe pakadkar nahi rakhte, toh man phool ki tarah halka ho jata hai.' "
            "Aap bhi apni chintaon ko is behti hawa aur nadi ke hawale kar dijiye."
        )
    },
    {
        "id": "story-3",
        "title": "Gaon Ka Purana Baragad Aur Uske Kisse (बरगद की छांव)",
        "duration": "3 min",
        "category": "Panchatantra & Folk",
        "summary": "Gaon ke chauraha par khada vriksh jo sabhi ke dukh-sukh ka saakshi raha hai.",
        "text": (
            "Gaon ke aangan me laga vishal Baragad ka ped kai peedhiyon ka saathi tha. "
            "Har thake hue raahi ko usne thandi chhaon di, sabhi ki baatein bina toke suni. "
            "Isi tarah hum sabke dil me bhi ek bada vriksh hona chahiye, jahan har purani yaad aur har apno ke sneh ki chhaon mehfooz rahe. "
            "Aapki zindgi ke anubhav bhi is baragad ki tarah vishal aur anmol hain."
        )
    }
]


DAILY_BLESSINGS = [
    {
        "quote": "Aap akele bilkul nahi hain — pahaadon ki shanti, pawan ki sarsrahat aur hamara saath hamesha aapke sath hai.",
        "author": "Sanjeevani Saathi",
        "action": "Aaj thodi der dhoop me baithkar ek pyali gunguni chai ka anand lein."
    },
    {
        "quote": "Man jab shant hota hai, toh har ek pal me eeshwar ka aashirwaad mehsus hota hai.",
        "author": "Himalayan Wisdom",
        "action": "Aaj kisi purane dost ya padosi ko 'Namaste' kehkar unka haal poochhein."
    },
    {
        "quote": "Zindagi ek behti hui pahadi nadi hai — har naya din naya umeed aur nayi aawaz leke aata hai.",
        "author": "Uttarakhandi Lok Vani",
        "action": "3 gehri lambi saansein lein aur muskura kar kahein: 'Main theek hoon aur surakshit hoon.'"
    }
]


@router.post("/chat", response_model=CompanionMessageResponse)
@limiter.limit("30/minute")
async def companion_chat(request: Request, req: CompanionMessageRequest):
    """
    Heart-to-heart companion conversation with emotional validation for lonely villagers and elders.
    """
    msg_lower = req.message.lower()

    # Crisis check
    crisis_keywords = ["marne", "suicide", "jeena nahi", "khatam kar", "jaan de", "end my life"]
    if any(k in msg_lower for k in crisis_keywords):
        return CompanionMessageResponse(
            reply=(
                f"Kripya meri baat dhyan se suniye {req.user_name}... Aapka jeevan bahut anmol hai aur aap akele bilkul nahi hain. "
                "Main aur poora Sanjeevani parivar aapke saath hain. Kripya turant hamare sahyogi Tele-MANAS helpline 14416 (toll-free) "
                "ya 104 par baat karein. Hum sabhi aapki parwah karte hain."
            ),
            mood_detected="crisis",
            emergency_triggered=True,
            comforting_thought="Aapki zindgi anmol hai. Kripya sahayata lein."
        )

    # Attempt LLM generation
    llm = get_llm()
    if llm:
        system_prompt = COMPANION_SYSTEM_PROMPT.strip()
        if req.mood:
            system_prompt += f"\nCurrent detected mood of user: {req.mood}."
        if req.user_name:
            system_prompt += f"\nUser's preferred name or title: {req.user_name}."

        history_msgs = []
        for turn in (req.history or [])[-6:]:
            if turn.role == "user":
                history_msgs.append(HumanMessage(content=turn.text))
            else:
                history_msgs.append(SystemMessage(content=turn.text))

        messages = [
            SystemMessage(content=system_prompt),
            *history_msgs,
            HumanMessage(content=req.message)
        ]

        llm_reply = _try_llm(llm, messages)
        if llm_reply:
            return CompanionMessageResponse(
                reply=llm_reply,
                mood_detected=req.mood or "reflective",
                emergency_triggered=False,
                comforting_thought="Aap akele nahi hain, hum hamesha aapke saath hain."
            )

    # Fallback to empathetic template
    fallback_text = FALLBACK_RESPONSES.get(req.mood or "default", FALLBACK_RESPONSES["default"])
    return CompanionMessageResponse(
        reply=fallback_text,
        mood_detected=req.mood or "calm",
        emergency_triggered=False,
        comforting_thought="Har subah ek nayi umeed leke aati hai."
    )


@router.get("/stories")
async def get_stories():
    """Returns curated comforting folk stories and tales for companionship."""
    return {"stories": HIMALAYAN_FOLK_STORIES}


@router.get("/daily-thought")
async def get_daily_thought():
    """Returns an uplifting daily blessing and wellness affirmation."""
    import random
    thought = random.choice(DAILY_BLESSINGS)
    return {"thought": thought}
