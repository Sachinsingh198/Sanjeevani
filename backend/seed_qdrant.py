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
print(f"\n{total_count} CCRAS & Classical remedies indexed into Okapi BM25 Index")

if store.client is not None:
    for col in ["sanjeevani_remedies", "ayush_remedies"]:
        if store.client.collection_exists(col):
            info = store.client.get_collection(col)
            print(f"[Qdrant] Collection '{col}': {info.points_count} vector points verified.")

# Test multiple clinical queries across CCRAS, Classical Treatises, and newly added remedies
test_queries = [
    ("gale me khasi aur kharash", "Common Cold / Cough"),
    ("chehre par khil pimples muhase", "Acne / Skin Health"),
    ("pet me gas bhari pan aur bhukh na lagna", "Indigestion / Sluggish Agni"),
    ("tez bukhar jalan aur bahut jyada pyas lag rahi hai", "Pitta Fever / Burning Thirst"),
    ("lagatar chheenk aana aur naak se pani", "Allergic Rhinitis / Sneezing - Vyoshadi Vataka"),
    ("mahilaon me khoon ki kami aur thakan", "Anemia & Debility - Dhatryarishta"),
    ("daily immunity tridosha vitality rasayana", "General Vitality & Immunity - Guduchi Amalaki")
]

print("\n[Search] Running verification vector queries:")
for query, symptom_type in test_queries:
    print(f"\n--- Testing query [{symptom_type}]: '{query}' ---")
    results = store.search_remedies(query, limit=2)
    for r in results:
        print(f"  * Remedy: {r.get('remedy_name')} (ID: {r.get('id')})")
        print(f"    RRF: {r.get('rrf_score', 0)} | BM25: {r.get('bm25_score', 0)} | Similarity: {r.get('similarity_score', 0)} | Source: {r.get('source', 'Classical Ayurveda')}")

store.close()