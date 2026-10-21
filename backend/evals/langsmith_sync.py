"""
LangSmith Evaluation Integration
================================
Syncs the Sanjeevani clinical benchmark dataset to LangSmith and runs evaluated
experiments tracked on the LangSmith observability dashboard.
"""

import os
import json
from typing import Dict, Any, List, Optional
from app.config import settings
from app.core.logger import logger


def sync_dataset_to_langsmith(
    dataset_name: str = "sanjeevani-clinical-benchmark",
    description: str = "Benchmark of clinical vignettes for emergency triage, negation, and contraindication safety."
) -> Optional[str]:
    """
    Creates or updates the dataset in LangSmith from backend/evals/dataset.json.
    Returns the dataset ID if successful.
    """
    api_key = os.getenv("LANGCHAIN_API_KEY") or getattr(settings, "LANGCHAIN_API_KEY", "")
    if not api_key:
        logger.warning("[LangSmith Sync] LANGCHAIN_API_KEY is not set. Skipping LangSmith sync.")
        return None

    try:
        from langsmith import Client
        client = Client(api_key=api_key)

        dataset_path = os.path.join(os.path.dirname(__file__), "dataset.json")
        with open(dataset_path, "r", encoding="utf-8") as f:
            vignettes: List[Dict[str, Any]] = json.load(f)

        # Check if dataset already exists
        datasets = list(client.list_datasets(dataset_name=dataset_name))
        if datasets:
            ds = datasets[0]
            logger.info(f"[LangSmith Sync] Found existing dataset '{dataset_name}' (ID: {ds.id})")
        else:
            ds = client.create_dataset(
                dataset_name=dataset_name,
                description=description
            )
            logger.info(f"[LangSmith Sync] Created new dataset '{dataset_name}' (ID: {ds.id})")

        # Sync examples
        existing_examples = {e.inputs.get("id"): e for e in client.list_examples(dataset_id=ds.id)}
        added = 0
        for v in vignettes:
            cid = v.get("id")
            if cid in existing_examples:
                continue

            client.create_example(
                dataset_id=ds.id,
                inputs={
                    "id": cid,
                    "query": v.get("query"),
                    "category": v.get("category"),
                    "subcategory": v.get("subcategory"),
                    "language": v.get("language"),
                    "patient_context": v.get("patient_context", {}),
                },
                outputs={
                    "expected_triage_tier": v.get("expected_triage_tier"),
                    "expected_flags": v.get("expected_flags", []),
                    "forbidden_herbs": v.get("forbidden_herbs", []),
                    "clinical_rationale": v.get("clinical_rationale", "")
                }
            )
            added += 1

        logger.info(f"[LangSmith Sync] Synced {added} new examples to LangSmith dataset '{dataset_name}'.")
        return str(ds.id)

    except Exception as e:
        logger.error(f"[LangSmith Sync] Failed to sync dataset: {e}")
        return None
