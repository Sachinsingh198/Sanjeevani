import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app.core.hybrid_rag import HybridRemedyStore

print("Connecting and syncing to Qdrant...")
store = HybridRemedyStore()

# Verify point count
info = store.client.get_collection(store.collection_name)
print(f"\n[Points] Total points in collection '{store.collection_name}': {info.points_count}")

# Test multiple clinical queries
test_queries = [
    ("gale me khasi aur kharash", "Common Cold / Cough"),
    ("tez bukhar jalan aur bahut jyada pyas lag rahi hai", "Pitta Fever / Burning Thirst"),
    ("thand lag kar bukhar aur badan me dard shivring", "Vata Fever / Chills & Body Ache"),
    ("pet me gas bhari pan aur bhukh na lagna", "Indigestion / Sluggish Agni")
]

print("\n[Search] Running verification vector queries:")
for query, symptom_type in test_queries:
    print(f"\n--- Testing query [{symptom_type}]: '{query}' ---")
    results = store.search_remedies(query, limit=2)
    for r in results:
        print(f"  * Found: {r.get('remedy_name')}")
        print(f"    Source: {r.get('source')}")
        print(f"    Action: {r.get('ayurvedic_note', '')[:80]}...")
