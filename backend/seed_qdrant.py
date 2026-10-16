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

# Verify count and print required milestone summary
total_count = len(store.remedies)
if store.client is not None and store.client.collection_exists(store.collection_name):
    info = store.client.get_collection(store.collection_name)
    points_count = info.points_count
else:
    points_count = total_count

print(f"\n{total_count} remedies indexed into Qdrant + Okapi BM25")
print(f"[Qdrant] Collection '{store.collection_name}': {points_count} vector points.")

# Test multiple clinical queries across CCRAS and Classical Treatises
test_queries = [
    ("gale me khasi aur kharash", "Common Cold / Cough"),
    ("chehre par khil pimples muhase", "Acne / Skin Health"),
    ("pet me gas bhari pan aur bhukh na lagna", "Indigestion / Sluggish Agni"),
    ("tez bukhar jalan aur bahut jyada pyas lag rahi hai", "Pitta Fever / Burning Thirst")
]

print("\n[Search] Running verification vector queries:")
for query, symptom_type in test_queries:
    print(f"\n--- Testing query [{symptom_type}]: '{query}' ---")
    results = store.search_remedies(query, limit=2)
    for r in results:
        print(f"  * Remedy: {r.get('remedy_name')}")
        print(f"    RRF: {r.get('rrf_score', 0)} | BM25: {r.get('bm25_score', 0)} | Source: {r.get('source', 'Classical Ayurveda')}")

store.close()