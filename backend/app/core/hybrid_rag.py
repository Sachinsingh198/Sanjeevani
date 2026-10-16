import os
import json
import math
import re
from collections import Counter
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.http import models
from fastembed import TextEmbedding

try:
    from app.core.logger import logger
except ImportError:
    import logging
    logger = logging.getLogger("sanjeevani")


def _tokenize_multilingual(text: str) -> List[str]:
    """Tokenizes English, Hinglish, Sanskrit, and Unicode Devanagari preserving matras."""
    if not text:
        return []
    return [tok for tok in re.findall(r"[^\s,.;:!?()\[\]/\"'-]+", text.lower()) if len(tok) > 1]


class OkapiBM25Index:
    """Zero-dependency in-memory Okapi BM25 sparse lexical index over all 100+ remedies."""

    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.doc_freqs: List[Counter] = []
        self.doc_lens: List[int] = []
        self.avgdl: float = 0.0
        self.idf: Dict[str, float] = {}
        self.N: int = 0

    def build(self, corpus_texts: List[str]) -> None:
        self.N = len(corpus_texts)
        self.doc_freqs = []
        self.doc_lens = []
        df: Counter = Counter()

        for text in corpus_texts:
            tokens = _tokenize_multilingual(text)
            counts = Counter(tokens)
            self.doc_freqs.append(counts)
            self.doc_lens.append(len(tokens))
            for token in counts.keys():
                df[token] += 1

        self.avgdl = (sum(self.doc_lens) / self.N) if self.N > 0 else 1.0
        self.idf = {}
        for token, freq in df.items():
            # Standard Okapi BM25 IDF with smoothing so common clinical terms remain positive
            self.idf[token] = math.log(1.0 + (self.N - freq + 0.5) / (freq + 0.5))

    def score_all(self, query: str) -> List[float]:
        q_tokens = _tokenize_multilingual(query)
        if not q_tokens or self.N == 0:
            return [0.0] * self.N

        scores = [0.0] * self.N
        for i in range(self.N):
            dl = self.doc_lens[i]
            freqs = self.doc_freqs[i]
            doc_score = 0.0
            for tok in q_tokens:
                if tok not in freqs:
                    continue
                tf = freqs[tok]
                idf = self.idf.get(tok, 0.0)
                numer = tf * (self.k1 + 1.0)
                denom = tf + self.k1 * (1.0 - self.b + self.b * (dl / self.avgdl))
                doc_score += idf * (numer / denom)
            scores[i] = doc_score
        return scores


class HybridRemedyStore:
    def __init__(
        self,
        data_path: str = "DATA/remedies_dataset.json",
        qdrant_path: Optional[str] = None,
    ):
        self.collection_name = "ayush_remedies"
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.full_data_path = os.path.join(base_dir, data_path)
        cache_dir = os.path.join(base_dir, "models_cache")

        self.embedding_model = TextEmbedding(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            cache_dir=cache_dir,
        )

        resolved_qdrant_path = qdrant_path or os.getenv("QDRANT_PATH", ":memory:")
        if resolved_qdrant_path == ":memory:":
            self.client = QdrantClient(":memory:")
        else:
            full_qdrant_path = (
                resolved_qdrant_path
                if os.path.isabs(resolved_qdrant_path)
                else os.path.join(base_dir, resolved_qdrant_path)
            )
            try:
                self.client = QdrantClient(path=full_qdrant_path)
            except Exception as lock_err:
                logger.warning(f"[Qdrant] Storage locked or unavailable ({lock_err}). Using :memory: client.")
                self.client = QdrantClient(":memory:")

        self.remedies: List[Dict[str, Any]] = []
        self.bm25 = OkapiBM25Index()
        self.herbs_lookup: Dict[str, Any] = {}
        self.garhwali_data_dir = os.path.join(base_dir, "DATA", "Garhwali")
        self._initialize_and_seed()

    def _build_searchable_text(self, item: Dict[str, Any]) -> str:
        """Builds a rich composite document for both Dense Embedding and Sparse BM25."""
        kw_str = " ".join(item.get("keywords", []))
        return (
            f"Condition: {item.get('condition_name', '')} ({item.get('ayurvedic_disease_name', '')}). "
            f"Dosha: {item.get('dosha_involvement', '')}. "
            f"Remedy: {item.get('remedy_name', '')}. "
            f"Keywords: {kw_str}. "
            f"Instructions: {item.get('remedy_text', '')} "
            f"Rationale: {item.get('ayurvedic_note', '')}"
        )

    def _initialize_and_seed(self) -> None:
        if not os.path.exists(self.full_data_path):
            return

        with open(self.full_data_path, "r", encoding="utf-8") as f:
            self.remedies = json.load(f)

        # Build in-memory Okapi BM25 index over all remedies
        corpus_texts = [
            f"{item.get('condition_name', '')} {item.get('ayurvedic_disease_name', '')} "
            f"{item.get('remedy_name', '')} {' '.join(item.get('keywords', []))} "
            f"{item.get('dosha_involvement', '')} {item.get('remedy_text', '')}"
            for item in self.remedies
        ]
        self.bm25.build(corpus_texts)

        # Check if Qdrant collection exists AND matches current dataset size (e.g., 100 vs old 16)
        needs_reseed = True
        if self.client is not None and self.client.collection_exists(self.collection_name):
            info = self.client.get_collection(self.collection_name)
            if info.points_count == len(self.remedies):
                needs_reseed = False
            else:
                self.client.delete_collection(self.collection_name)

        if needs_reseed and self.remedies and self.client is not None:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=models.VectorParams(
                    size=384,
                    distance=models.Distance.COSINE,
                ),
            )
            docs_to_embed = [self._build_searchable_text(item) for item in self.remedies]
            embeddings = list(self.embedding_model.embed(docs_to_embed))

            points = [
                models.PointStruct(
                    id=idx + 1,
                    vector=embeddings[idx].tolist(),
                    payload=item,
                )
                for idx, item in enumerate(self.remedies)
            ]
            self.client.upsert(collection_name=self.collection_name, points=points)

    def seed_dataset(self, force: bool = False) -> None:
        """Forces re-creation and upserting into collection."""
        if not self.remedies and os.path.exists(self.full_data_path):
            with open(self.full_data_path, "r", encoding="utf-8") as f:
                self.remedies = json.load(f)

        if self.client is None or not self.remedies:
            return

        if force and self.client.collection_exists(self.collection_name):
            self.client.delete_collection(self.collection_name)

        if not self.client.collection_exists(self.collection_name):
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=models.VectorParams(
                    size=384,
                    distance=models.Distance.COSINE,
                ),
            )

        docs_to_embed = [self._build_searchable_text(item) for item in self.remedies]
        embeddings = list(self.embedding_model.embed(docs_to_embed))
        points = [
            models.PointStruct(
                id=idx + 1,
                vector=embeddings[idx].tolist(),
                payload=item,
            )
            for idx, item in enumerate(self.remedies)
        ]
        self.client.upsert(collection_name=self.collection_name, points=points)

    def keyword_search_fallback(self, query: str, limit: int = 2) -> List[Dict[str, Any]]:
        """In-memory BM25 lexical fallback when Qdrant client is unavailable or times out."""
        if not self.remedies:
            return []

        bm25_raw_scores = self.bm25.score_all(query)
        ranked_indices = sorted(
            range(len(self.remedies)),
            key=lambda idx: bm25_raw_scores[idx],
            reverse=True,
        )

        results = []
        for idx in ranked_indices:
            item = dict(self.remedies[idx])
            item["source"] = "fallback_keyword"
            item["similarity_score"] = min(0.95, round(bm25_raw_scores[idx] / 10.0, 4)) if bm25_raw_scores[idx] > 0 else 0.5
            item["bm25_score"] = round(bm25_raw_scores[idx], 4)
            results.append(item)
            if len(results) >= limit:
                break
        return results

    def search_garhwali(self, query_text: str, limit: int = 3) -> List[Dict[str, Any]]:
        """Lexical lookup for Garhwali health idioms and dictionary terms."""
        results = []
        if not os.path.exists(self.garhwali_data_dir):
            return results

        dict_file = os.path.join(self.garhwali_data_dir, "Dictionary_English-Garhwali-Hindi_FULL_Reference_Format.md")
        if os.path.exists(dict_file):
            keywords = [w.lower() for w in re.findall(r"[\w\u0900-\u097F]+", query_text) if len(w) > 2]
            try:
                with open(dict_file, "r", encoding="utf-8", errors="ignore") as f:
                    for line in f:
                        line_lower = line.lower()
                        if any(kw in line_lower for kw in keywords) and ("*" in line or "**" in line):
                            clean = line.strip()
                            if clean:
                                results.append({"source_file": "Dictionary", "content": clean})
                                if len(results) >= limit:
                                    break
            except Exception as e:
                logger.error(f"[Garhwali Lexical Error]: {e}")
        return results

    def close(self) -> None:
        """Closes the underlying Qdrant client connection cleanly if open."""
        if self.client is not None and hasattr(self.client, "close"):
            try:
                self.client.close()
            except Exception:
                pass

    def search_remedies(
        self,
        query: str,
        limit: int = 5,
        inferred_dosha: Optional[str] = None,
        rrf_k: int = 60,
    ) -> List[Dict[str, Any]]:
        if not query or not query.strip() or not self.remedies:
            return []

        # Fallback if client is None
        if self.client is None:
            logger.warning("[RAG] Qdrant search timed out / failed, falling back to BM25 / keyword search")
            return self.keyword_search_fallback(query, limit=limit)

        # 1. Dense Vector Search via Qdrant (fetch top 25 candidates)
        dense_ranks: Dict[str, int] = {}
        dense_scores: Dict[str, float] = {}

        try:
            query_vector = list(self.embedding_model.embed([query]))[0].tolist()
            dense_response = self.client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                limit=min(25, len(self.remedies)),
            ).points

            for rank_idx, hit in enumerate(dense_response):
                rem_id = hit.payload.get("id")
                if rem_id:
                    dense_ranks[rem_id] = rank_idx + 1
                    dense_scores[rem_id] = float(hit.score)
        except Exception as e:
            logger.warning(f"[RAG] Qdrant search timed out / failed, falling back to BM25 / keyword search (Error: {e})")
            return self.keyword_search_fallback(query, limit=limit)

        # 2. Sparse Lexical Search via Okapi BM25 over all 100 remedies
        bm25_raw_scores = self.bm25.score_all(query)
        bm25_ranked_indices = sorted(
            range(len(self.remedies)),
            key=lambda idx: bm25_raw_scores[idx],
            reverse=True,
        )
        bm25_ranks: Dict[str, int] = {}
        bm25_scores: Dict[str, float] = {}
        for rank_idx, doc_idx in enumerate(bm25_ranked_indices):
            if bm25_raw_scores[doc_idx] > 0.0:
                rem_id = self.remedies[doc_idx]["id"]
                bm25_ranks[rem_id] = rank_idx + 1
                bm25_scores[rem_id] = bm25_raw_scores[doc_idx]

        # 3. Reciprocal Rank Fusion (RRF) + Dosha Alignment Boost
        fused_results = []
        for item in self.remedies:
            rem_id = item["id"]
            d_score = dense_scores.get(rem_id, 0.0)
            b_score = bm25_scores.get(rem_id, 0.0)

            # Relevance threshold: skip completely unrelated entries
            if d_score < 0.25 and b_score <= 0.0:
                continue

            rrf_score = 0.0
            if rem_id in dense_ranks:
                rrf_score += 1.0 / (rrf_k + dense_ranks[rem_id])
            if rem_id in bm25_ranks:
                # Weight BM25 slightly higher (1.25x) when exact Hindi/Sanskrit/Garhwali keywords match
                rrf_score += 1.25 / (rrf_k + bm25_ranks[rem_id])

            # Optional Dosha alignment boost
            if inferred_dosha and inferred_dosha.lower() in item.get("dosha_involvement", "").lower():
                rrf_score += 0.003

            enriched = dict(item)
            enriched["similarity_score"] = round(max(d_score, min(0.99, d_score + (0.15 if b_score > 0 else 0.0))), 4)
            enriched["bm25_score"] = round(b_score, 4)
            enriched["rrf_score"] = round(rrf_score, 6)
            fused_results.append(enriched)

        fused_results.sort(key=lambda x: (x["rrf_score"], x["bm25_score"], x["similarity_score"]), reverse=True)

        if not fused_results and self.remedies:
            return self.keyword_search_fallback(query, limit=limit)

        return fused_results[:limit]


_shared_remedy_store: Optional[HybridRemedyStore] = None


def get_shared_remedy_store(data_path: str = "DATA/remedies_dataset.json") -> HybridRemedyStore:
    """Returns a process-wide singleton HybridRemedyStore instance."""
    global _shared_remedy_store
    if _shared_remedy_store is None:
        _shared_remedy_store = HybridRemedyStore(data_path=data_path)
    return _shared_remedy_store