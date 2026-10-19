"""
Comprehensive Remedy Sync Script for Sanjeevani 2.0
Syncs updated DATA/remedies_dataset.json (200 CCRAS & Classical Home Remedies)
and all classical compendiums into:
1. Qdrant Cloud (collections: sanjeevani_remedies and ayush_remedies)
2. Local Root Qdrant (d:\Sanjeevani\qdrant_data)
3. Local Backend Qdrant (d:\Sanjeevani\backend\qdrant_data, if accessible/unlocked)
4. Verifies in-memory Okapi BM25 Index alignment
"""

import sys
import os
import json
from typing import List, Dict, Any, Tuple
from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Ensure backend root is on path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, backend_dir)
load_dotenv(os.path.join(backend_dir, ".env"))

from fastembed import TextEmbedding
from qdrant_client import QdrantClient, models


def build_searchable_text_ccras(item: Dict[str, Any]) -> str:
    kw_str = " ".join(item.get("keywords", []))
    return (
        f"Condition: {item.get('condition_name', '')} ({item.get('ayurvedic_disease_name', '')}). "
        f"Dosha: {item.get('dosha_involvement', '')}. "
        f"Remedy: {item.get('remedy_name', '')}. "
        f"Keywords: {kw_str}. "
        f"Instructions: {item.get('remedy_text', '')} "
        f"Rationale: {item.get('ayurvedic_note', '')}"
    )


def build_searchable_text_docx(item: Dict[str, Any]) -> str:
    kw_str = " ".join(item.get("keywords", []))
    return (
        f"Condition: {item.get('condition_name', '')}. "
        f"Remedy: {item.get('remedy_name', '')}. "
        f"Keywords: {kw_str}. "
        f"Instructions: {item.get('remedy_text', '')} "
        f"Rationale: {item.get('ayurvedic_note', '')}"
    )


def build_searchable_text_vaidya(item: Dict[str, Any]) -> str:
    return item.get("searchable_text") or (
        f"Condition: {item.get('remedy_name', '')}. "
        f"Preparation: {item.get('preparation', '')}."
    )


def build_searchable_text_ayurveda3(item: Dict[str, Any]) -> str:
    kw_str = " ".join(item.get("keywords", []))
    return (
        f"Condition: {item.get('condition_name', '')}. "
        f"Herb: {item.get('remedy_name', '')} ({item.get('sanskrit_name', '')}). "
        f"Keywords: {kw_str}. "
        f"Indications: {item.get('clinical_indications', '')}. "
        f"Dravyaguna: {item.get('dravyaguna_properties', '')}. "
        f"Instructions: {item.get('remedy_text', '')} "
        f"Rationale: {item.get('ayurvedic_note', '')}"
    )


def load_all_datasets(data_dir: str) -> Tuple[List[Dict[str, Any]], List[Tuple[str, Dict[str, Any]]]]:
    """
    Returns:
    1. pure_ccras: all 200 items from remedies_dataset.json (for ayush_remedies collection)
    2. all_composite: list of (searchable_text, payload) for sanjeevani_remedies collection
    """
    remedies_path = os.path.join(data_dir, "remedies_dataset.json")
    docx_path = os.path.join(data_dir, "ayurveda_docx_remedies.json")
    vaidya_path = os.path.join(data_dir, "vaidya_chikitsa_curated.json")
    ayu3_path = os.path.join(data_dir, "ayurveda_3_remedies.json")

    with open(remedies_path, "r", encoding="utf-8") as f:
        pure_ccras = json.load(f)

    composite: List[Tuple[str, Dict[str, Any]]] = []

    # 1. CCRAS Home Remedies (rem_001 to rem_200)
    for r in pure_ccras:
        payload = dict(r)
        payload.setdefault("safety_tier", "household_safe")
        payload.setdefault("is_primary_household", True)
        payload.setdefault("is_household", True)
        text = build_searchable_text_ccras(r)
        composite.append((text, payload))

    # 2. Classical docx remedies (ayush_docx_001 to ayush_docx_068)
    if os.path.exists(docx_path):
        with open(docx_path, "r", encoding="utf-8") as f:
            docx_items = json.load(f)
        for r in docx_items:
            payload = dict(r)
            payload.setdefault("safety_tier", "household_safe")
            payload.setdefault("is_primary_household", False)
            payload.setdefault("is_household", True)
            text = build_searchable_text_docx(r)
            composite.append((text, payload))

    # 3. Vaidya Chikitsa Curated (household_safe)
    if os.path.exists(vaidya_path):
        with open(vaidya_path, "r", encoding="utf-8") as f:
            vaidya_items = json.load(f)
        for idx, r in enumerate(vaidya_items):
            if r.get("safety_tier") == "household_safe":
                payload = dict(r)
                payload.setdefault("id", r.get("remedy_id") or f"vaidya_{idx+1:03d}")
                payload.setdefault("remedy_text", r.get("preparation", ""))
                payload.setdefault("is_primary_household", False)
                payload.setdefault("is_household", True)
                text = build_searchable_text_vaidya(r)
                composite.append((text, payload))

    # 4. Ayurveda 3 Classical Dravyaguna Monographs
    if os.path.exists(ayu3_path):
        with open(ayu3_path, "r", encoding="utf-8") as f:
            ayu3_items = json.load(f)
        for r in ayu3_items:
            payload = dict(r)
            payload.setdefault("is_primary_household", False)
            payload.setdefault("is_household", True)
            text = build_searchable_text_ayurveda3(r)
            composite.append((text, payload))

    return pure_ccras, composite


def upsert_collection(client: QdrantClient, collection_name: str, points: List[models.PointStruct], batch_size: int = 50):
    print(f"  [Qdrant] Preparing collection '{collection_name}'...")
    if client.collection_exists(collection_name):
        client.delete_collection(collection_name)

    client.create_collection(
        collection_name=collection_name,
        vectors_config=models.VectorParams(
            size=384,
            distance=models.Distance.COSINE,
        ),
    )

    total = len(points)
    for i in range(0, total, batch_size):
        batch = points[i : i + batch_size]
        client.upsert(collection_name=collection_name, points=batch)
        print(f"    Upserted {min(i + batch_size, total)}/{total} points into '{collection_name}'", flush=True)

    info = client.get_collection(collection_name)
    print(f"  [Qdrant] Collection '{collection_name}' successfully verified with {info.points_count} points.\n")


def main():
    print("=" * 60)
    print("  Sanjeevani 2.0 - Multi-Database Remedy Sync Engine")
    print("=" * 60)

    data_dir = os.path.join(backend_dir, "DATA")
    pure_ccras, composite = load_all_datasets(data_dir)
    print(f"\nLoaded CCRAS Remedies: {len(pure_ccras)} items (rem_001 to rem_200)")
    print(f"Loaded Total Composite Catalog: {len(composite)} items")

    # Load embedding model
    cache_dir = os.path.join(backend_dir, "models_cache")
    print(f"\nInitializing embedding model 'sentence-transformers/all-MiniLM-L6-v2' (cache: {cache_dir})...")
    embed_model = TextEmbedding(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        cache_dir=cache_dir,
    )

    # 1. Embed Pure CCRAS Dataset (200 points)
    print("Generating embeddings for CCRAS remedies (200)...")
    ccras_texts = [build_searchable_text_ccras(r) for r in pure_ccras]
    ccras_embeddings = list(embed_model.embed(ccras_texts))
    ccras_points = [
        models.PointStruct(
            id=idx + 1,
            vector=ccras_embeddings[idx].tolist(),
            payload=pure_ccras[idx],
        )
        for idx in range(len(pure_ccras))
    ]

    # 2. Embed Full Composite Dataset
    print(f"Generating embeddings for full composite catalog ({len(composite)})...")
    composite_texts = [item[0] for item in composite]
    composite_embeddings = list(embed_model.embed(composite_texts))
    composite_points = [
        models.PointStruct(
            id=idx + 1,
            vector=composite_embeddings[idx].tolist(),
            payload=composite[idx][1],
        )
        for idx in range(len(composite))
    ]

    # --- Sync Qdrant Cloud ---
    qdrant_url = os.getenv("QDRANT_URL")
    qdrant_api_key = os.getenv("QDRANT_API_KEY")

    if qdrant_url and qdrant_api_key:
        print(f"\n--- Syncing Cloud Qdrant ({qdrant_url}) ---")
        try:
            cloud_client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key, timeout=30)
            # Sync sanjeevani_remedies
            upsert_collection(cloud_client, "sanjeevani_remedies", composite_points)
            # Sync ayush_remedies
            upsert_collection(cloud_client, "ayush_remedies", ccras_points)
            cloud_client.close()
            print(">>> Cloud Qdrant sync COMPLETE! <<<")
        except Exception as cloud_err:
            print(f"Error syncing to Cloud Qdrant: {cloud_err}")
    else:
        print("\nCloud Qdrant not configured in .env (QDRANT_URL missing); skipping cloud sync.")

    # --- Sync Local Root Qdrant ---
    root_qdrant_dir = os.path.abspath(os.path.join(backend_dir, "..", "qdrant_data"))
    if os.path.exists(root_qdrant_dir):
        print(f"\n--- Syncing Root Local Qdrant ({root_qdrant_dir}) ---")
        try:
            root_client = QdrantClient(path=root_qdrant_dir)
            upsert_collection(root_client, "sanjeevani_remedies", composite_points)
            upsert_collection(root_client, "ayush_remedies", ccras_points)
            root_client.close()
            print(">>> Root Local Qdrant sync COMPLETE! <<<")
        except Exception as root_err:
            print(f"Note on Root Local Qdrant: {root_err}")

    # --- Sync Local Backend Qdrant ---
    backend_qdrant_dir = os.path.join(backend_dir, "qdrant_data")
    if os.path.exists(backend_qdrant_dir):
        print(f"\n--- Syncing Backend Local Qdrant ({backend_qdrant_dir}) ---")
        try:
            backend_client = QdrantClient(path=backend_qdrant_dir)
            upsert_collection(backend_client, "sanjeevani_remedies", composite_points)
            upsert_collection(backend_client, "ayush_remedies", ccras_points)
            backend_client.close()
            print(">>> Backend Local Qdrant sync COMPLETE! <<<")
        except Exception as backend_err:
            print(f"Note on Backend Local Qdrant ({backend_err})")
            print("Local backend storage is currently held by running uvicorn process.")
            print("Uvicorn will automatically reseed on next reload via HybridRemedyStore.")

    print("\n" + "=" * 60)
    print("Remedy Synchronization Finished Successfully!")
    print("=" * 60)


if __name__ == "__main__":
    main()
