# 🛠️ Sanjeevani 2.0 — Backend Service Engine

FastAPI backend orchestrating a **deterministic clinical triage system**, **LangGraph cyclic state machine**, **dual-stream AYUSH vector RAG**, **Sarvam AI multilingual speech engine**, and **edge computer vision diagnostic suite**.

---

## 📋 Architecture Overview

```
                          ┌──────────────────────────┐
                          │   Client Requests        │
                          │   (REST, Audio, Vision)  │
                          └─────────────┬────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │  FastAPI Gateway (:8000) │
                          │  CORS, JWT & Rate Limits │
                          └─────────────┬────────────┘
                                        │
        ┌───────────────────┬───────────┴───────────┬────────────────────┐
        ▼                   ▼                       ▼                    ▼
┌───────────────┐   ┌───────────────┐       ┌───────────────┐    ┌───────────────┐
│ Voice Router  │   │ Vision Router │       │ Chat Router   │    │ Auth & Admin  │
│ (/voice)      │   │ (/screen)     │       │ (/chat)       │    │ (/auth, /admin│
└───────┬───────┘   └───────┬───────┘       └───────┬───────┘    └───────┬───────┘
        │                   │                       │                    │
        ▼                   ▼                       ▼                    ▼
┌───────────────┐   ┌───────────────┐       ┌───────────────┐    ┌───────────────┐
│ Sarvam STT/TTS│   │ OpenCV Vision │       │ LangGraph     │    │ SQLite DB     │
│ Edge-TTS /    │   │ CIELAB & HSV  │       │ State Machine │    │ users, otps,  │
│ AI4Bharat     │   │ Algorithms    │       │ (sessions.db) │    │ audit logs    │
└───────────────┘   └───────────────┘       └───────┬───────┘    └───────────────┘
                                                    │
                                                    ▼
                                            ┌───────────────┐
                                            │ Qdrant Vector │
                                            │ Hybrid RAG    │
                                            └───────────────┘
```

---

## 📂 Backend Directory Structure

```
backend/
├── app/
│   ├── main.py                     # FastAPI entry point, lifespan, CORS, and router mounting
│   ├── config.py                   # Pydantic Settings & environment variable synchronization
│   ├── models.py                   # SQLite schema, WAL mode, migrations, and demo account seeding
│   ├── agents/                     # LangGraph Clinical State Machine
│   │   ├── state.py                # AgentState TypedDict definition
│   │   ├── graph.py                # StateGraph structure, checkpointer, and conditional router
│   │   └── nodes/
│   │       ├── triage_node.py      # MTS triage discriminator and dialect normalization
│   │       ├── emergency_node.py   # Red-tier 108 emergency short-circuit handler
│   │       ├── retriever_node.py   # Qdrant AYUSH formulation retriever
│   │       └── responder_node.py   # Multi-turn doctor consultation node (Groq/Gemini/Sarvam)
│   ├── api/                        # HTTP Route Handlers
│   │   ├── auth_api.py             # User registration, login, OTP dispatch, and JWT issuance
│   │   ├── admin_api.py            # System metrics, active sessions, and database analytics
│   │   ├── chat.py                 # Clinical consultation message intake & history
│   │   ├── voice.py                # Audio STT transcription, TTS synthesis, and audio streaming
│   │   ├── screen.py               # Vision endpoints for Anemia, Jaundice, Oral, and Skin
│   │   ├── companion.py            # Village companion (Sanjeevani Saathi) chat & folk tales
│   │   └── reports.py              # Downloadable clinical PDF referral generator
│   ├── core/                       # Core Algorithms & Service Connectors
│   │   ├── triage_engine.py        # Deterministic Manchester Triage with bi-directional negation
│   │   ├── hybrid_rag.py           # FastEmbed + Qdrant similarity store for AYUSH remedies
│   │   ├── ayush_docx_extractor.py # Classical Ayurveda treatise .docx parser
│   │   ├── sarvam_stt.py           # Sarvam Saaras v3 multipart audio STT client
│   │   ├── tts_engine.py           # IndicTTSEngine (Sarvam Bulbul v3 + Edge-TTS fallback)
│   │   ├── bhashini_engine.py      # Speech cleaner (strips markdown & technical formatting)
│   │   ├── ai4bharat_tts.py        # Offline local PyTorch neural TTS engine
│   │   └── notification_service.py # Real-world Gmail SMTP & mobile SMS (Twilio / Fast2SMS)
│   ├── cv/                         # Computer Vision Diagnostic Algorithms
│   │   ├── preprocessor.py         # CLAHE illumination correction & bilateral filtering
│   │   └── screening.py            # CIELAB Erythema Index & HSV Scleral Icterus algorithms
│   └── schemas/                    # Pydantic Request & Response Schemas
├── DATA/                           # Datasets & Botanical Corpus
│   ├── remedies_dataset.json       # Standard CCRAS Ayurvedic remedy dataset
│   ├── Ayush/ayurveda_1.docx       # Classical Ayurvedic clinical reference document
│   └── Garhwali/                   # Garhwali dialect glossary and phrases
├── tests/                          # Automated Pytest Test Suite
│   ├── test_clinical_triage.py     # Deterministic safety rule tests
│   ├── test_agent_workflow.py      # Multi-turn LangGraph integration tests
│   ├── test_cv_pipeline.py         # Image diagnostic algorithm tests
│   ├── test_sarvam_integrations.py # Sarvam STT, TTS, and Indic LLM tests
│   └── test_hybrid_rag.py          # Vector similarity retrieval tests
├── pyproject.toml                  # Python package configuration
└── requirements.txt                # Pip dependency freeze
```

---

## 🧠 Subsystems in Detail

### 1. LangGraph Clinical State Machine

The consultation workflow is orchestrated using **LangGraph** (`app/agents/graph.py`) with persistent SQLite state checkpoints (`sessions.db` via `SqliteSaver`):

- **`AgentState` Structure (`app/agents/state.py`)**:
  - `conversation_id`: Unique session UUID.
  - `raw_user_message`: Input string from user.
  - `normalized_message`: Dialect-normalized string (Garhwali words translated).
  - `detected_tier`: Clinical severity (`"Red"`, `"Yellow"`, `"Green"`).
  - `clinical_flags`: List of matched MTS discriminator rules.
  - `dialogue_phase`: `"GREETING"`, `"CONSULTATION"`, `"CONCLUDED"`, `"EMERGENCY"`.
  - `turn_count`: Number of conversational exchanges in current session.
  - `retrieved_remedies`: Formulations fetched from Qdrant.
  - `final_reply_text`: Complete markdown output for chat display.
  - `spoken_reply_text`: Cleaned, punctuation-optimized text for TTS synthesis.
  - `voice_mode`: Boolean flag indicating whether the session is in voice mode.

- **Routing Rules (`route_clinical_flow`)**:
  - If `detected_tier == "Red"` $\rightarrow$ bypass to `emergency_node`.
  - If `dialogue_phase == "CONCLUDED"` $\rightarrow$ route to `retriever_node` (to retrieve remedies from Qdrant) and then `doctor_consultation_node`.
  - Otherwise $\rightarrow$ route directly to `doctor_consultation_node`.

---

### 2. Deterministic Clinical Triage Engine (`app/core/triage_engine.py`)

The triage engine enforces a deterministic safety barrier based on the **Manchester Triage System (MTS)** before any generative LLM is consulted:

- **Red Tier (Priority 1: Immediate Life Threat)**:
  - Patterns: Cardiac chest pain, left arm radiating pain, acute respiratory distress, severe hemoptysis, syncope/unconsciousness, anaphylaxis, infant high fever.
  - Immediate action: Escalates to 108 Emergency, stops home remedies.
- **Yellow Tier (Priority 2: Sub-Acute Monitoring)**:
  - Patterns: Prolonged fever ($>3$ days), severe localized abdominal pain, persistent vomiting, dehydration signs.
  - Action: Prompts PHC visit within 24 hours, offers safe supportive care.
- **Green Tier (Priority 3: Routine / Self-Care)**:
  - Default: Mild cold, superficial abrasions, routine digestive discomfort.

#### Bi-Directional Negation Awareness
```python
# Evaluates a 35-character sliding window around any matched clinical pattern:
# English prefix: "no", "not", "without", "denies", "never"
# Hindi postfix:  "nahi", "nahin", "koi nahi", "na", "bina", "mat"
```
If a patient says *"I have fever but no chest pain"* or *"bukhar hai par seene me dard nahi hai"*, the engine safely recognizes the negation and avoids false Red-tier escalations.

---

### 3. Dual-Stream Hybrid AYUSH RAG (`app/core/hybrid_rag.py`)

- **Embeddings**: Uses `FastEmbed` with `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional dense vectors), cached locally in `models_cache/` to eliminate runtime download delays.
- **Vector Storage**: Supports **Qdrant Cloud** with automatic seamless fallback to local on-disk storage (`./qdrant_data`).
- **Knowledge Sources**:
  1. `DATA/remedies_dataset.json`: CCRAS validated remedies with safety profiles, preparation methods, and botanical ingredients.
  2. `DATA/Ayush/ayurveda_1.docx`: Extracted classical formulations via `python-docx` parser.
  3. `DATA/Garhwali/`: Regional glossary mapping mountain dialect complaints to medical terms.

---

### 4. Edge Computer Vision Diagnostic Pipeline (`app/cv/screening.py`)

All vision screening runs on standard CPU using **OpenCV** without sending photos to cloud vision models:

1. **Conjunctival Pallor / Anemia (`screen_anemia`)**:
   - Isolates the palpebral conjunctiva region.
   - Converts RGB pixels to **CIELAB** color space.
   - Computes the Erythema Index: $\text{EI} = \frac{a^*}{L^*}$.
   - Estimates Hemoglobin level: $\text{Hb (g/dL)} \approx 13.5 \times \text{EI}$.
2. **Scleral Icterus / Jaundice (`screen_jaundice`)**:
   - Isolates the eye white (sclera) using an adaptive HSV saturation/value threshold.
   - Computes the yellow chromatic shift along the CIELAB $b^*$ axis.
   - Estimates Total Serum Bilirubin ($\text{mg/dL}$).
3. **Oral Cavity Mucosal Screening (`screen_oral`)**:
   - Detects Leukoplakia (white mucosal patches) and Erythroplakia for rural screening of tobacco/gutkha chewing habits.
4. **Dermatological Lesions (`screen_skin`)**:
   - Evaluates cutaneous erythema, tinea fungal annular margins, and eczema lesions.

---

### 5. Multilingual Voice & Speech Subsystem (`app/api/voice.py`)

- **STT (Speech-to-Text)**: Powered by **Sarvam AI (Saaras:v3)** in `codemix` mode to accurately transcribe mixed Hindi, Garhwali, and Indian English speech.
- **TTS (Text-to-Speech)**:
  - Primary: **Sarvam AI (Bulbul:v3)** with streaming response for conversational response times under 1.5 seconds.
  - Fallback: **Edge-TTS** (`hi-IN-SwaraNeural` / `hi-IN-MadhurNeural`).
  - Offline local fallback: **AI4Bharat Indic-TTS**.
- **Audio Cleaner (`app/core/bhashini_engine.py`)**: Automatically strips Markdown headings, bold markers, bullet asterisks, and technical URLs before sending text to speech synthesis.

---

### 6. Observability with LangSmith

The backend is configured with **LangSmith** for full execution tracing:
- **Environment variables loaded at boot**:
  ```ini
  LANGCHAIN_TRACING_V2=true
  LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
  LANGCHAIN_API_KEY=your_langsmith_key
  LANGCHAIN_PROJECT=sanjeevani
  ```
- **Recorded Traces**:
  - `Sanjeevani Consultation (<conversation_id>)` (Root chain)
  - `triage_node` (Execution duration, detected tier, matched flags)
  - `route_clinical_flow` (Conditional edge branch selection)
  - `retriever_node` (Qdrant search queries and retrieved payloads)
  - `doctor_consultation_node` (LLM prompt, completions, and token usage)
  - `ChatGroq` / `ChatGoogleGenerativeAI` / `ChatOpenAI` (Model execution telemetry)

---

## ⚙️ Environment Variables Reference (`.env`)

| Variable Name | Default / Sample | Required | Purpose |
|---|---|:---:|---|
| `APP_ENV` | `development` | Yes | Application environment mode |
| `DEFAULT_LANGUAGE` | `hi` | Yes | Default fallback locale (`hi` for Hindi, `en` for English) |
| `PRIMARY_LLM_PROVIDER` | `groq` | Yes | Active LLM (`groq`, `gemini`, or `sarvam`) |
| `GROQ_API_KEY` | `gsk_...` | Yes | API key for ultra-fast Groq Llama-3.1 inference |
| `GROQ_MODEL` | `llama-3.1-8b-instant` | Yes | Groq model slug |
| `GEMINI_API_KEY` | `AIza...` | Optional | Google Gemini API key (secondary fallback) |
| `GEMINI_MODEL` | `gemini-1.5-flash` | Optional | Gemini model name |
| `SARVAM_API_KEY` | `sk_...` | Yes | Sarvam AI key for Saaras STT & Bulbul TTS |
| `TTS_PROVIDER` | `sarvam` | Yes | Active TTS provider (`sarvam`, `neural`, `ai4bharat`) |
| `LANGCHAIN_TRACING_V2`| `true` | Yes | Enable LangSmith tracing |
| `LANGCHAIN_ENDPOINT` | `https://api.smith.langchain.com` | Yes | LangSmith API endpoint |
| `LANGCHAIN_API_KEY` | `lsv2_...` | Yes | LangSmith workspace API key |
| `LANGCHAIN_PROJECT` | `sanjeevani` | Yes | Project name in LangSmith dashboard |
| `QDRANT_PATH` | `./qdrant_data` | Yes | Path to local on-disk Qdrant storage |
| `QDRANT_COLLECTION_NAME`| `sanjeevani_remedies` | Yes | Vector collection name |
| `QDRANT_URL` | *(blank or cloud url)* | Optional | Qdrant Cloud cluster endpoint |
| `QDRANT_API_KEY` | *(blank or cloud key)* | Optional | Qdrant Cloud API token |
| `DATABASE_URL` | `sqlite:///./sanjeevani.db`| Yes | SQLite path for user and authentication tables |
| `CHECKPOINT_DB_PATH` | `sqlite:///./sessions.db`| Yes | SQLite path for LangGraph checkpointer |
| `SMTP_HOST` | `smtp.gmail.com` | Optional | SMTP server for email OTP dispatch |
| `SMTP_USER` | `trustsnare@gmail.com` | Optional | Email account for OTP delivery |
| `SMTP_PASSWORD` | *(App Password)* | Optional | Google App Password |
| `FAST2SMS_API_KEY` | *(API Key)* | Optional | Mobile SMS gateway for OTP delivery in India |

---

## 🚀 Running & Testing the Backend

### 1. Run the Development Server
```bash
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Interactive API documentation will be available at:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### 2. Run the Full Test Suite
```bash
uv run pytest -v
```

### 3. Run Specific Component Tests
```bash
# Test Clinical Triage & Negation Rules
uv run pytest tests/test_clinical_triage.py -v

# Test Multi-Turn LangGraph Agent State
uv run pytest tests/test_agent_workflow.py -v

# Test Computer Vision Pipeline
uv run pytest tests/test_cv_pipeline.py -v

# Test Sarvam STT, TTS, and Indic LLM
uv run pytest tests/test_sarvam_integrations.py -v

# Test AYUSH Hybrid Vector RAG
uv run pytest tests/test_hybrid_rag.py -v
```
