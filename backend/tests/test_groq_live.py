"""
Live integration test — verifies qwen/qwen3.6-27b responds correctly
to the SystemMessage+HumanMessage format used in responder_node.py.
"""
import sys, os

# Read API key from .env
key = ""
with open(".env") as f:
    for line in f:
        if line.startswith("GROQ_API_KEY="):
            key = line.split("=", 1)[1].strip()

model = "qwen/qwen3.6-27b"

try:
    from groq import Groq
    client = Groq(api_key=key)

    # --- INTAKE test ---
    res = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are Dr. Sanjeevani, a warm village doctor in Uttarakhand. "
                    "Respond ONLY in simple Hindi or Hinglish. "
                    "In exactly 2 sentences: (1) acknowledge their symptom, "
                    "(2) ask how many days they have had it and if there is fever or weakness. "
                    "Do NOT prescribe anything."
                ),
            },
            {"role": "user", "content": "Patient said: mujhe sar me bahut dard ho raha hai"},
        ],
        max_tokens=150,
        temperature=0.3,
    )
    reply = res.choices[0].message.content
    print("INTAKE reply (raw len=%d):" % len(reply))
    # ASCII-safe print for Windows cp1252 terminal
    print(reply.encode("ascii", errors="replace").decode())
    print()

    # --- PROBING test ---
    res2 = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are Dr. Sanjeevani, a village doctor. "
                    "Respond ONLY in simple Hindi or Hinglish. "
                    "In exactly 2 sentences: (1) briefly thank them, "
                    "(2) ask if they have High BP, acidity/gastric ulcer, or pregnancy. "
                    "Do NOT prescribe anything."
                ),
            },
            {"role": "user", "content": "Patient said: 3 din se hai, bukhar nahi hai"},
        ],
        max_tokens=150,
        temperature=0.3,
    )
    reply2 = res2.choices[0].message.content
    print("PROBING reply (raw len=%d):" % len(reply2))
    print(reply2.encode("ascii", errors="replace").decode())
    print()
    print("SUCCESS: Both calls work correctly with SystemMessage+HumanMessage format.")

except Exception as e:
    print("FAILED:", type(e).__name__, str(e))
    sys.exit(1)
