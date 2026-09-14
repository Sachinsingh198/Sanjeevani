from app.core.hybrid_rag import HybridRemedyStore

print("Connecting and syncing to Qdrant...")
store = HybridRemedyStore()

# Verify point count
info = store.client.get_collection(store.collection_name)
print(f"\n🎯 Total points in collection '{store.collection_name}': {info.points_count}")

# Test a search
print("\n🔍 Running test vector query...")
results = store.search_remedies("gale me khasi aur kharash")
for r in results:
    print(f"  • Found: {r.get('remedy_name')} ({r.get('source')})")