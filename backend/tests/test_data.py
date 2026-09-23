import json
import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
files = [
    os.path.join(BASE_DIR, "DATA", "remedies_dataset.json"),
    os.path.join(BASE_DIR, "DATA", "contraindications_graph.json"),
    os.path.join(BASE_DIR, "DATA", "garhwali_lexicon.json")
]

for filepath in files:
    assert os.path.exists(filepath), f"Missing file: {filepath}"
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
        print(f"✅ {filepath} loaded successfully! Item count: {len(data)}")

print("\n🎉 Layer 2 Data Foundations are complete and valid!")
