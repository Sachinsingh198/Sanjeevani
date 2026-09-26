import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, r"d:\Sanjeevani\backend")
os.chdir(r"d:\Sanjeevani\backend")
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import requests
import json

def test_nasal_allergy_consultation():
    url = "http://localhost:8000/chat/message"
    cid = "test_user_nasal_case_001"

    turns = [
        "mera naak akshar band rehta hai",
        "2 saalon se",
        "nahi",
        "haan chhink aati hai aur aankhon main bhi khujli hoti hai"
    ]

    for idx, msg in enumerate(turns, 1):
        print(f"\n--- Turn {idx} ---")
        print(f"Patient: {msg}")
        resp = requests.post(url, json={"conversation_id": cid, "message": msg})
        data = resp.json()
        print(f"Doctor Reply: {data.get('reply_text')}")
        print(f"Phase: {data.get('phase')}")
        if data.get("remedies"):
            print("Recommended Remedies:", [r.get("remedy_name") for r in data.get("remedies")])

    print("\n--- Final Checks ---")
    reply = data.get("reply_text", "")
    assert "tobacco" not in reply.lower(), "BANNED substance 'tobacco' found in reply!"
    assert "snuff" not in reply.lower(), "BANNED substance 'snuff' found in reply!"
    assert "syphilis" not in reply.lower(), "BANNED term 'syphilis' found in reply!"
    assert "upadansh" not in reply.lower(), "BANNED term 'upadansh' found in reply!"
    
    # Verify recommended remedy is the clean AYUSH Anu Taila / Haridra formulation
    remedy_names = [r.get("remedy_name", "") for r in data.get("remedies", [])]
    print("Final remedy names in API response:", remedy_names)
    assert any("Anu Taila" in name or "Tulsi" in name or "Pratimarsha" in name for name in remedy_names), f"Expected Anu Taila CCRAS remedy, got {remedy_names}"
    print("\n>>> ALLERGIC RHINITIS CONSULTATION VERIFIED SUCCESSFULLY! CLEAN CCRAS AYUSH REMEDY PRESCRIBED! <<<")

if __name__ == "__main__":
    test_nasal_allergy_consultation()
