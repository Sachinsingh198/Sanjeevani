# 06. AYUSH Hybrid RAG & Knowledge Store

## 1. Grounding Clinical Guidance in Traditional AYUSH Wisdom

In rural Uttarakhand, home remedies (*Gharelu Upchar*) and Ayurvedic herbs form the first line of defense for non-urgent ailments. However, misinformation and inaccurate herbal dosages can lead to adverse toxicity or delay needed medical care.

Sanjeevani implements a **Hybrid Retrieval-Augmented Generation (RAG)** store in [`backend/app/core/hybrid_rag.py`](file:///d:/Sanjeevani/backend/app/core/hybrid_rag.py) to ground non-urgent self-care recommendations in validated Ayurvedic clinical sources.

---

## 2. The Dual-Source Knowledge Corpus

```
┌────────────────────────────────────────────────────────────────────────┐
│                   SANJEEVANI AYUSH KNOWLEDGE CORPUS                    │
├────────────────────────────────────────────────────────────────────────┤
│  Source 1: CCRAS Standardized Formulations                             │
│  - Dataset: DATA/remedies_dataset.json                                 │
│  - Formulations: 100+ validated recipes for fever, cold, cough,        │
│    digestive ailments, joint pain, skin irritations.                   │
│  - Attributes: Indications, Preparation, Dosage, Contraindications.    │
├────────────────────────────────────────────────────────────────────────┤
│  Source 2: Classical Ayurveda Treatises                                │
│  - Document: DATA/Ayush/ayurveda_1.docx                                │
│  - Extractor: app/core/ayush_docx_extractor.py                         │
│  - Formulations: Classical polyherbal preparations (Kashayam, Churna,  │
│    Vati, Asava) extracted into structured JSON.                        │
├────────────────────────────────────────────────────────────────────────┤
│  Source 3: Vaidya Chikitsa Clinical Ailments (114 Chapters)            │
│  - Document: DATA/Ayush/vaidya_chikitsha.docx                          │
│  - Curator: app/core/ayush_knowledge_curator.py                        │
│  - Dataset: DATA/vaidya_chikitsa_curated.json (72 Household-Safe,      │
│    19 Require Consultation, 23 Clinical Emergencies segregated).       │
│  - Attributes: Causes, Symptoms, General Treatment, Diet (Pathya).     │
├────────────────────────────────────────────────────────────────────────┤
│  Source 4: Dravyaguna Botanical Herbs (119 Medicinal Plants)           │
│  - Document: DATA/Ayush/BotanicalHerb.docx                             │
│  - Dataset: DATA/botanical_herbs_curated.json                          │
│  - Attributes: Vernacular names, Hot/Cold thermal energy, Dosha balance│
│    (Vata, Pitta, Kapha), and therapeutic organ benefits.               │
├────────────────────────────────────────────────────────────────────────┤
│  Source 5: Garhwali Regional Dialect Lexicon                           │
│  - Directory: DATA/Garhwali/                                           │
│  - Content: Mapping of mountain colloquial health complaints to       │
│    clinical terms (e.g. mund dard ➔ headache, pet chhutna ➔ diarrhea).│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. FastEmbed Dense Vector Embeddings

To ensure rapid initialization and avoid multi-gigabyte memory footprints, Sanjeevani utilizes **FastEmbed**:

- **Model**: `sentence-transformers/all-MiniLM-L6-v2`
- **Embedding Dimensionality**: 384 dimensions
- **Inference Runtime**: ONNX Runtime optimized for CPU
- **Local Model Caching**:
  ```python
  cache_dir = os.path.join(os.getcwd(), "models_cache")
  self.embedding_model = TextEmbedding(
      model_name="sentence-transformers/all-MiniLM-L6-v2",
      cache_dir=cache_dir
  )
  ```
  This eliminates internet dependency on subsequent server boots and prevents Windows temporary directory lockups.

---

## 4. Qdrant Vector Storage Architecture

Sanjeevani dynamically bridges between **Qdrant Cloud** and **Local On-Disk Storage**:

```python
# Automatic Failover Logic in HybridRemedyStore:
if qdrant_url and qdrant_api_key:
    try:
        self.client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key, timeout=10.0)
        self.is_cloud = True
    except Exception:
        # Seamlessly fallback to local filesystem storage
        self.client = QdrantClient(path=settings.QDRANT_PATH)
        self.is_cloud = False
else:
    self.client = QdrantClient(path=settings.QDRANT_PATH)
    self.is_cloud = False
```

### Vector Collections:
1. **`sanjeevani_remedies`**: Contains vectorized chunks of CCRAS home remedies and classical treatises with metadata payloads:
   - `remedy_name`: e.g., *"Adrak-Tulsi Kadha"*
   - `category`: e.g., *"Respiratory & Cold"*
   - `ingredients`: List of herbs and household spices
   - `preparation`: Step-by-step instructions
   - `dosage`: Safe quantity (e.g., *"50ml twice daily after meals"*)
   - `safety_precaution`: Caution notes (e.g., *"Avoid in severe hyperacidity"*)
2. **`sanjeevani_garhwali`**: Contains dialect-to-Hindi mapping vectors used by `triage_node` to normalize regional complaints.

---

## 5. Retrieval & Reranking Workflow

When the consultation state machine reaches the `CONCLUDED` phase:
1. `retriever_node` extracts the patient's chief complaint from `AgentState["consultation_notes"]`.
2. FastEmbed computes the dense vector representation of the complaint.
3. Qdrant executes a Cosine Similarity search with score threshold:
   $$\text{sim}(u, v) = \frac{u \cdot v}{\|u\| \|v\|}$$
4. The top $k=2$ remedies exceeding a threshold score ($\ge 0.65$) are packaged into `state["retrieved_remedies"]`.
5. The LLM presents the remedy formatted inside structured markdown tags:
   ```markdown
   :::remedy
   {"name": "Tulsi-Adrak Kadha", "ingredients": "Tulsi leaves, fresh ginger, black pepper, jaggery", "dosage": "Half cup lukewarm twice daily", "caution": "Do not consume on empty stomach if suffering from ulcers."}
   :::
   ```
6. The frontend's `StructuredBotMessage.jsx` renders this tag as an interactive visual **Remedy Card**.
