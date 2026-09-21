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
        # Resolve data path safely across different working directories
        if not os.path.exists(data_path) and os.path.exists(os.path.join("backend", data_path)):
            self.data_path = os.path.join("backend", data_path)
        else:
            self.data_path = data_path

        docx_cand = "DATA/ayurveda_docx_remedies.json"
        if not os.path.exists(docx_cand) and os.path.exists(os.path.join("backend", docx_cand)):
            self.docx_remedies_path = os.path.join("backend", docx_cand)
        else:
            self.docx_remedies_path = docx_cand

        vc_cand = "DATA/vaidya_chikitsa_curated.json"
        if not os.path.exists(vc_cand) and os.path.exists(os.path.join("backend", vc_cand)):
            self.vaidya_chikitsa_path = os.path.join("backend", vc_cand)
        else:
            self.vaidya_chikitsa_path = vc_cand

        herbs_cand = "DATA/botanical_herbs_curated.json"
        if not os.path.exists(herbs_cand) and os.path.exists(os.path.join("backend", herbs_cand)):
            self.botanical_herbs_path = os.path.join("backend", herbs_cand)
        else:
            self.botanical_herbs_path = herbs_cand

        # Load Botanical Herbs Dravyaguna lookup map
        self.herbs_lookup: Dict[str, Dict[str, Any]] = {}
        self._load_botanical_herbs()

        self.collection_name = settings.QDRANT_COLLECTION_NAME
        self.garhwali_collection_name = "sanjeevani_garhwali"
        self.garhwali_data_dir = "DATA/Garhwali" if os.path.exists("DATA/Garhwali") else os.path.join("backend", "DATA", "Garhwali")
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

    def _load_botanical_herbs(self):
        """Loads curated medicinal herbs with their Dravyaguna energetic profiles."""
        if not os.path.exists(self.botanical_herbs_path):
            try:
                from app.core.ayush_knowledge_curator import build_and_save_curated_knowledge
                build_and_save_curated_knowledge()
            except Exception as e:
                print(f"[Qdrant Curator] Notice: could not auto-build curated knowledge: {e}")

        if os.path.exists(self.botanical_herbs_path):
            try:
                with open(self.botanical_herbs_path, "r", encoding="utf-8") as f:
                    herbs = json.load(f)
                    for h in herbs:
                        v_name = h.get("vernacular_name", "").strip().lower()
                        c_name = h.get("common_name", "").strip().lower()
                        if v_name:
                            self.herbs_lookup[v_name] = h
                        if c_name:
                            self.herbs_lookup[c_name] = h
                print(f"[Qdrant] Loaded {len(herbs)} botanical Dravyaguna herbs into memory.")
            except Exception as e:
                print(f"[Qdrant Error] Failed loading botanical herbs: {e}")

    def load_all_remedies(self) -> List[Dict[str, Any]]:
        """
        Loads and combines remedies from verified sources:
        1. CCRAS & AYUSH base remedies (DATA/remedies_dataset.json)
        2. Classical Ayurveda Treatise formulations (DATA/Ayush/ayurveda_1.docx)
        3. Curated Vaidya Chikitsa clinical ailments (DATA/vaidya_chikitsa_curated.json)
        """
        all_remedies: List[Dict[str, Any]] = []
        seen_names = set()

        # 1. Base remedies
        if os.path.exists(self.data_path):
            try:
                with open(self.data_path, "r", encoding="utf-8") as f:
                    base_items = json.load(f)
                    for item in base_items:
                        name_key = item.get("remedy_name", "").strip().lower()
                        if name_key and name_key not in seen_names:
                            seen_names.add(name_key)
                            item["safety_tier"] = "household_safe"
                            all_remedies.append(item)
            except Exception as e:
                print(f"[Qdrant Error] Failed reading base remedies {self.data_path}: {e}")

        # 2. Docx remedies (from cache JSON or directly extracted)
        docx_items: List[Dict[str, Any]] = []
        if os.path.exists(self.docx_remedies_path):
            try:
                with open(self.docx_remedies_path, "r", encoding="utf-8") as f:
                    docx_items = json.load(f)
            except Exception as e:
                print(f"[Qdrant Error] Failed reading docx remedies JSON {self.docx_remedies_path}: {e}")

        if not docx_items:
            try:
                from app.core.ayush_docx_extractor import save_docx_remedies_json
                docx_items = save_docx_remedies_json(self.docx_remedies_path)
            except Exception as e:
                print(f"[Qdrant Error] Failed extracting docx remedies: {e}")

        for item in docx_items:
            name_key = item.get("remedy_name", "").strip().lower()
            if name_key and name_key not in seen_names:
                seen_names.add(name_key)
                item["safety_tier"] = "household_safe"
                all_remedies.append(item)

        # 3. Curated Vaidya Chikitsa Ailments
        vc_items: List[Dict[str, Any]] = []
        if not os.path.exists(self.vaidya_chikitsa_path):
            try:
                from app.core.ayush_knowledge_curator import build_and_save_curated_knowledge
                build_and_save_curated_knowledge()
            except Exception as e:
                print(f"[Qdrant Curator] Notice: could not auto-build Vaidya Chikitsa: {e}")

        if os.path.exists(self.vaidya_chikitsa_path):
            try:
                with open(self.vaidya_chikitsa_path, "r", encoding="utf-8") as f:
                    vc_items = json.load(f)
            except Exception as e:
                print(f"[Qdrant Error] Failed reading Vaidya Chikitsa JSON: {e}")

        for item in vc_items:
            # SAFETY RULE: Never index clinical emergencies as home remedies!
            if item.get("safety_tier") == "clinical_emergency":
                continue

            name_key = item.get("remedy_name", "").strip().lower()
            if name_key and name_key not in seen_names:
                seen_names.add(name_key)
                all_remedies.append(item)

        return all_remedies

    def _initialize_and_seed(self):
        """Creates collection if missing, and seeds points if empty or outdated."""
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
        all_remedies = self.load_all_remedies()

        if points_count < len(all_remedies):
            print(f"[Qdrant] Collection '{self.collection_name}' has {points_count} points, but {len(all_remedies)} remedies available. Seeding/syncing remedies...")
            self.seed_dataset(force=True)
        else:
            print(f"[Qdrant] Collection '{self.collection_name}' is fully up to date with {points_count} indexed points.")

    def seed_dataset(self, force: bool = False):
        """Loads all remedies, generates embeddings on clinical indications, and upserts them into Qdrant."""
        remedies = self.load_all_remedies()
        if not remedies:
            print("[Qdrant Error] No remedies found to seed.")
            return

        search_texts: List[str] = []
        payloads: List[Dict[str, Any]] = []
        ids: List[int] = []

        for idx, item in enumerate(remedies):
            # Sharp search embedding focused on clinical indications & symptoms
            search_text = item.get("searchable_text")
            if not search_text:
                keywords_str = " ".join(item.get("keywords", []))
                search_text = (
                    f"Condition: {item.get('condition_name', item.get('remedy_name', ''))} | "
                    f"Keywords: {keywords_str} | "
                    f"Remedy: {item.get('remedy_name', '')} | "
                    f"Symptoms: {', '.join(item.get('symptoms', []))}"
                )
            search_texts.append(search_text)
            payloads.append(item)
            ids.append(idx + 1)

        batch_size = 50
        total_upserted = 0
        for i in range(0, len(search_texts), batch_size):
            b_texts = search_texts[i:i+batch_size]
            b_payloads = payloads[i:i+batch_size]
            b_ids = ids[i:i+batch_size]

            embeddings = list(self.embedding_model.embed(b_texts))
            points = [
                models.PointStruct(
                    id=b_ids[j],
                    vector=embeddings[j].tolist(),
                    payload=b_payloads[j]
                )
                for j in range(len(b_ids))
            ]

            self.client.upsert(
                collection_name=self.collection_name,
                points=points,
                wait=True
            )
            total_upserted += len(points)

        print(f"[Qdrant] Successfully uploaded and indexed {total_upserted} vector points in '{self.collection_name}'.")

    def _enrich_with_botanicals(self, remedy: Dict[str, Any]) -> Dict[str, Any]:
        """Matches ingredients or text against Dravyaguna herbs and attaches energetic profiles."""
        if not self.herbs_lookup:
            return remedy

        text_to_search = f"{remedy.get('remedy_name', '')} {remedy.get('preparation', '')} {remedy.get('ingredients', '')}".lower()
        matched_herbs = []

        for herb_key, herb_data in self.herbs_lookup.items():
            if len(herb_key) > 3 and re.search(r'\b' + re.escape(herb_key) + r'\b', text_to_search):
                matched_herbs.append({
                    "name": herb_data.get("full_title"),
                    "thermal_energy": herb_data.get("thermal_energy"),
                    "properties": herb_data.get("dravyaguna_properties")
                })
                if len(matched_herbs) >= 2:
                    break

        enriched = dict(remedy)
        if matched_herbs:
            enriched["matched_botanicals"] = matched_herbs
        return enriched

    def search_remedies(self, query_text: str, limit: int = 2, min_score: float = 0.25) -> List[Dict[str, Any]]:
        """
        Embeds the query text and retrieves top matching remedies from Qdrant,
        filtering by minimum similarity score and enriching with Dravyaguna properties.
        """
        try:
            query_embedding = list(self.embedding_model.embed([query_text]))[0].tolist()
            
            search_result = self.client.query_points(
                collection_name=self.collection_name,
                query=query_embedding,
                limit=limit * 2  # fetch slightly more to filter
            )

            matched = []
            for point in search_result.points:
                if not point.payload:
                    continue
                # Score threshold filter
                if hasattr(point, "score") and point.score is not None and point.score < min_score:
                    continue
                
                enriched = self._enrich_with_botanicals(point.payload)
                enriched["similarity_score"] = getattr(point, "score", None)
                matched.append(enriched)
                if len(matched) >= limit:
                    break

            return matched
        except Exception as e:
            print(f"[Qdrant Search Error]: {e}")
            # Resilient fallback to local storage if cloud connection fails
            if getattr(self, "is_cloud", False):
                try:
                    local_c = QdrantClient(path=settings.QDRANT_PATH)
                    res = local_c.query_points(
                        collection_name=self.collection_name,
                        query=query_embedding,
                        limit=limit * 2
                    )
                    matched = []
                    for point in res.points:
                        if not point.payload:
                            continue
                        if hasattr(point, "score") and point.score is not None and point.score < min_score:
                            continue
                        enriched = self._enrich_with_botanicals(point.payload)
                        enriched["similarity_score"] = getattr(point, "score", None)
                        matched.append(enriched)
                        if len(matched) >= limit:
                            break
                    return matched
                except Exception as local_err:
                    print(f"[Qdrant Local Search Fallback Error]: {local_err}")
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