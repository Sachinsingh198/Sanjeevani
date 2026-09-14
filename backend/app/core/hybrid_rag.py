import json
import os
import re
from typing import List, Dict, Any
from qdrant_client import QdrantClient, models
from fastembed import TextEmbedding
from app.config import settings

class HybridRemedyStore:
    """
    Production-grade Vector RAG store for AYUSH remedies.
    Supports Qdrant Cloud clusters with automatic local on-disk fallback using FastEmbed.
    """
    def __init__(self, data_path: str = "DATA/remedies_dataset.json"):
        self.data_path = data_path
        self.collection_name = settings.QDRANT_COLLECTION_NAME
        self.garhwali_collection_name = "sanjeevani_garhwali"
        self.garhwali_data_dir = "DATA/Garhwali"
        self.vector_dim = 384  # Standard dimension for sentence-transformers/all-MiniLM-L6-v2

        # 1. Initialize FastEmbed with project-local cache directory (prevents Windows Temp corruptions)
        cache_dir = os.path.join(os.getcwd(), "models_cache")
        os.makedirs(cache_dir, exist_ok=True)
        
        self.embedding_model = TextEmbedding(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            cache_dir=cache_dir
        )

        # 2. Initialize Qdrant Client (Cloud vs. Local On-Disk)
        qdrant_url = (settings.QDRANT_URL or "").strip()
        qdrant_api_key = (settings.QDRANT_API_KEY or "").strip()

        if qdrant_url and qdrant_api_key:
            try:
                self.client = QdrantClient(
                    url=qdrant_url,
                    api_key=qdrant_api_key,
                    timeout=10.0
                )
                self.is_cloud = True
                print(f"[Qdrant] Connected to Cloud Cluster: {qdrant_url}")
                self._initialize_and_seed()
                self._initialize_and_seed_garhwali()
            except Exception as e:
                print(f"[Qdrant Cloud Connection Failed]: {e}. Falling back to local on-disk storage.")
                self.client = QdrantClient(path=settings.QDRANT_PATH)
                self.is_cloud = False
                self._initialize_and_seed()
                self._initialize_and_seed_garhwali()
        else:
            self.client = QdrantClient(path=settings.QDRANT_PATH)
            self.is_cloud = False
            print(f"[Qdrant] Connected to Local On-Disk Storage: {settings.QDRANT_PATH}")
            self._initialize_and_seed()
            self._initialize_and_seed_garhwali()

    def _initialize_and_seed(self):
        """Creates collection if missing, and seeds points if empty."""
        # Create collection if it does not exist
        if not self.client.collection_exists(self.collection_name):
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=models.VectorParams(
                    size=self.vector_dim,
                    distance=models.Distance.COSINE
                )
            )
            print(f"[Qdrant] Created new Qdrant collection: '{self.collection_name}'")

        # Check point count
        collection_info = self.client.get_collection(self.collection_name)
        points_count = collection_info.points_count or 0

        if points_count == 0:
            print(f"[Qdrant] Collection '{self.collection_name}' is empty. Seeding AYUSH dataset...")
            self.seed_dataset()
        else:
            print(f"[Qdrant] Collection '{self.collection_name}' is active with {points_count} indexed points.")

    def seed_dataset(self):
        """Loads seed remedies, generates embeddings, and upserts them into Qdrant."""
        if not os.path.exists(self.data_path):
            print(f"[Qdrant Error] Dataset file not found: {self.data_path}")
            return

        with open(self.data_path, "r", encoding="utf-8") as f:
            remedies = json.load(f)

        search_texts: List[str] = []
        payloads: List[Dict[str, Any]] = []
        ids: List[int] = []

        for idx, item in enumerate(remedies):
            keywords_str = " ".join(item.get("keywords", []))
            search_text = (
                f"Condition: {item.get('condition_name', '')} | "
                f"Keywords: {keywords_str} | "
                f"Remedy: {item.get('remedy_name', '')} | "
                f"Instructions: {item.get('remedy_text', '')}"
            )
            search_texts.append(search_text)
            payloads.append(item)
            ids.append(idx + 1)

        if search_texts:
            embeddings = list(self.embedding_model.embed(search_texts))
            
            points = [
                models.PointStruct(
                    id=ids[i],
                    vector=embeddings[i].tolist(),
                    payload=payloads[i]
                )
                for i in range(len(ids))
            ]

            self.client.upsert(
                collection_name=self.collection_name,
                points=points,
                wait=True
            )
            print(f"[Qdrant] Successfully uploaded and indexed {len(points)} vector points in '{self.collection_name}'.")

    def search_remedies(self, query_text: str, limit: int = 2) -> List[Dict[str, Any]]:
        """
        Embeds the query text and retrieves top matching remedies from Qdrant.
        """
        try:
            query_embedding = list(self.embedding_model.embed([query_text]))[0].tolist()
            
            search_result = self.client.query_points(
                collection_name=self.collection_name,
                query=query_embedding,
                limit=limit
            )

            return [point.payload for point in search_result.points if point.payload]
        except Exception as e:
            print(f"[Qdrant Search Error]: {e}")
            return []

    def _initialize_and_seed_garhwali(self):
        """Creates collection for Garhwali texts if missing, and seeds points if empty."""
        if not self.client.collection_exists(self.garhwali_collection_name):
            self.client.create_collection(
                collection_name=self.garhwali_collection_name,
                vectors_config=models.VectorParams(
                    size=self.vector_dim,
                    distance=models.Distance.COSINE
                )
            )
            print(f"[Qdrant] Created new Qdrant collection: '{self.garhwali_collection_name}'")

        collection_info = self.client.get_collection(self.garhwali_collection_name)
        if (collection_info.points_count or 0) == 0:
            print(f"[Qdrant] Collection '{self.garhwali_collection_name}' is empty. Seeding Garhwali dataset...")
            self.seed_garhwali_dataset()
        else:
            print(f"[Qdrant] Collection '{self.garhwali_collection_name}' is active with {collection_info.points_count} points.")

    def _extract_text_from_file(self, file_path: str, filename: str) -> str:
        """Reads .txt, .md, or .docx files safely."""
        if filename.endswith(".docx"):
            try:
                import docx
                doc = docx.Document(file_path)
                return "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
            except Exception as e:
                import zipfile
                import xml.etree.ElementTree as ET
                try:
                    with zipfile.ZipFile(file_path) as z:
                        xml_content = z.read("word/document.xml")
                    tree = ET.fromstring(xml_content)
                    return "".join(node.text for node in tree.iter() if node.text)
                except Exception as e2:
                    print(f"[Qdrant Error] Failed reading docx {filename}: {e2}")
                    return ""
        else:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()

    def seed_garhwali_dataset(self):
        if not os.path.exists(self.garhwali_data_dir):
            print(f"[Qdrant Error] Garhwali dataset folder not found: {self.garhwali_data_dir}")
            return

        search_texts = []
        payloads = []
        ids = []
        point_id = 1

        for filename in os.listdir(self.garhwali_data_dir):
            if not filename.endswith((".txt", ".md", ".docx")):
                continue
            
            file_path = os.path.join(self.garhwali_data_dir, filename)
            try:
                text = self._extract_text_from_file(file_path, filename)
                if not text:
                    continue
                    
                # Simple chunking by double newline (paragraphs)
                chunks = [c.strip() for c in text.split("\n\n") if len(c.strip()) > 40]
                
                # Further split large chunks to avoid huge embeddings
                max_chunk_len = 700
                final_chunks = []
                for chunk in chunks:
                    if len(chunk) > max_chunk_len:
                        sentences = chunk.split(". ")
                        temp_chunk = ""
                        for sent in sentences:
                            if len(temp_chunk) + len(sent) > max_chunk_len:
                                final_chunks.append(temp_chunk.strip())
                                temp_chunk = sent + ". "
                            else:
                                temp_chunk += sent + ". "
                        if temp_chunk.strip():
                            final_chunks.append(temp_chunk.strip())
                    else:
                        final_chunks.append(chunk)

                for chunk in final_chunks:
                    search_texts.append(chunk)
                    payloads.append({"source_file": filename, "content": chunk})
                    ids.append(point_id)
                    point_id += 1
            except Exception as e:
                print(f"[Qdrant Error] Error reading {filename}: {e}")

        # Batch upload to avoid memory/network issues
        batch_size = 100
        for i in range(0, len(search_texts), batch_size):
            batch_texts = search_texts[i:i+batch_size]
            batch_payloads = payloads[i:i+batch_size]
            batch_ids = ids[i:i+batch_size]

            if batch_texts:
                embeddings = list(self.embedding_model.embed(batch_texts))
                points = [
                    models.PointStruct(id=batch_ids[j], vector=embeddings[j].tolist(), payload=batch_payloads[j])
                    for j in range(len(batch_ids))
                ]
                self.client.upsert(collection_name=self.garhwali_collection_name, points=points, wait=True)

        print(f"[Qdrant] Successfully indexed {len(ids)} Garhwali vector points.")

    def search_garhwali(self, query_text: str, limit: int = 3) -> List[Dict[str, Any]]:
        """
        Hybrid search in Garhwali documents:
        Combines lexical keyword matching with dense vector search for high recall.
        """
        results = []
        seen_contents = set()

        # 1. Lexical keyword search over Garhwali files for exact anatomical/symptom matches
        keywords = [w.lower() for w in re.findall(r"[\w\u0900-\u097F]+", query_text) if len(w) > 2]
        if keywords and os.path.exists(self.garhwali_data_dir):
            dict_file = os.path.join(self.garhwali_data_dir, "Dictionary_English-Garhwali-Hindi_FULL_Reference_Format.md")
            if os.path.exists(dict_file):
                try:
                    with open(dict_file, "r", encoding="utf-8", errors="ignore") as f:
                        lines = f.readlines()
                    for line in lines:
                        line_lower = line.lower()
                        if any(kw in line_lower for kw in keywords) and ("*" in line or "**" in line):
                            clean_line = line.strip()
                            if clean_line and clean_line not in seen_contents:
                                seen_contents.add(clean_line)
                                results.append({"source_file": "Dictionary", "content": clean_line})
                                if len(results) >= limit:
                                    break
                except Exception as e:
                    print(f"[Garhwali Lexical Search Error]: {e}")

        # 2. Dense Vector Search in Qdrant
        try:
            query_embedding = list(self.embedding_model.embed([query_text]))[0].tolist()
            search_result = self.client.query_points(
                collection_name=self.garhwali_collection_name,
                query=query_embedding,
                limit=limit
            )
            for point in search_result.points:
                if point.payload and point.payload.get("content"):
                    c = point.payload["content"]
                    if c not in seen_contents:
                        seen_contents.add(c)
                        results.append(point.payload)
        except Exception as e:
            print(f"[Qdrant Search Error (Garhwali)]: {e}")

        return results[:limit]