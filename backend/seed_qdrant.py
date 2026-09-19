import sys
import argparse

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app.core.hybrid_rag import HybridRemedyStore

parser = argparse.ArgumentParser(description="Seed remedies and herbs into Qdrant Vector DB")
parser.add_argument("--force", action="store_true", help="Force re-embedding and re-indexing of all remedies")
args = parser.parse_args()

print("Connecting and syncing to Qdrant...")
store = HybridRemedyStore()

if args.force:
    print("\n[Force Seeding] Generating fresh embeddings and upserting all remedies into Qdrant...")
    store.seed_dataset(force=True)

# Verify point count
info = store.client.get_collection(store.collection_name)
print(f"\n[Points] Total indexed remedies in collection '{store.collection_name}': {info.points_count}")
print(f"[Herbs] Total Dravyaguna medicinal herbs in active memory: {len(store.herbs_lookup)}")

# Test multiple clinical queries across CCRAS, Classical Treatises, and Vaidya Chikitsa
test_queries = [
    ("gale me khasi aur kharash", "Common Cold / Cough"),
    ("chehre par khil pimples muhase", "Acne / Pimples (Vaidya Chikitsa)"),
    ("pet me gas bhari pan aur bhukh na lagna", "Indigestion / Sluggish Agni"),
    ("tez bukhar jalan aur bahut jyada pyas lag rahi hai", "Pitta Fever / Burning Thirst")
]

print("\n[Search] Running verification vector queries:")
for query, symptom_type in test_queries:
    print(f"\n--- Testing query [{symptom_type}]: '{query}' ---")
    results = store.search_remedies(query, limit=2)
    for r in results:
        print(f"  * Remedy: {r.get('remedy_name')}")
        print(f"    Tier: {r.get('safety_tier', 'household_safe')} | Source: {r.get('category', r.get('source', 'AYUSH'))}")
        if r.get("matched_botanicals"):
            herbs_str = ", ".join([h.get("name", "") for h in r["matched_botanicals"]])
            print(f"    Enriched Botanicals: {herbs_str}")

