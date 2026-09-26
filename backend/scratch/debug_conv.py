import sys
sys.path.insert(0, ".")
import asyncio
from app.agents.graph import sanjeevani_workflow
import uuid

async def test_turns():
    conv_id = f"test_debug_{uuid.uuid4().hex[:8]}"
    messages = [
        "mujhe naak band hota hai akshar",
        "pichle 2-3 saalon se",
        "bukhar yar thakan to nahi pr naak aur aankhon main khujli hoti hai aur aanshu hoti hai",
        "pichle 3 saalon se",
        "nahi",
        "3 saalon se",
        "nahi",
    ]
    
    config = {"configurable": {"thread_id": conv_id}}
    
    for i, msg in enumerate(messages):
        print(f"\n=================== TURN {i+1} ===================")
        print(f"User: {msg}")
        inp = {
            "conversation_id": conv_id,
            "raw_user_message": msg,
            "detected_tier": "Green",
            "clinical_flags": [],
            "retrieved_remedies": [],
            "final_reply_text": "",
            "spoken_reply_text": "",
            "escalation_triggered": False,
            "normalized_message": "",
            "patient_conditions": [],
            "voice_mode": False,
        }
        res = await sanjeevani_workflow.ainvoke(inp, config=config)
        print(f"turn_count: {res.get('turn_count')}")
        print(f"phase: {res.get('dialogue_phase')}")
        print(f"reply: {res.get('final_reply_text')}")
        print(f"notes:\n{res.get('consultation_notes')}")

if __name__ == "__main__":
    asyncio.run(test_turns())
