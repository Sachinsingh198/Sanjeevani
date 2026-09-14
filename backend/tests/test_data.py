import json
import os

files = [
    "DATA/remedies_dataset.json",
    "DATA/contraindications_graph.json",
    "DATA/garhwali_lexicon.json"
]

for filepath in files:
    assert os.path.exists(filepath), f"Missing file: {filepath}"
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
        print(f"✅ {filepath} loaded successfully! Item count: {len(data)}")

print("\n🎉 Layer 2 Data Foundations are complete and valid!")
