# 12. Developer Setup & Deployment Guide

## 1. System Prerequisites

Before configuring Project Sanjeevani locally, ensure the following software is installed:

| Component | Minimum Version | Recommended Tool / Distribution | Notes |
|---|---|---|---|
| **Python** | `>= 3.11` | Managed via [`uv`](https://docs.astral.sh/uv/) (or standard `python.org`) | Fast virtual environment & dependency management |
| **Node.js** | `>= 20.x` | LTS Release (`node -v`) | Required for React 19 + Vite |
| **npm** | `>= 10.x` | Bundled with Node.js (`npm -v`) | |
| **Git** | Any modern version | Git CLI | |
| **Operating System** | Any | Tested on Windows 11, Ubuntu 22.04/24.04 LTS, macOS Sonoma | On Linux/Docker, requires OpenGL & GLib packages |

> [!IMPORTANT]
> **Headless Linux / Docker / CI Environment Dependencies**:
> On Linux distributions (including Ubuntu runners and Debian-based Docker containers), MediaPipe and OpenCV require headless OpenGL and GLib libraries:
> ```bash
> sudo apt-get update && sudo apt-get install -y libegl1 libgl1 libglib2.0-0
> ```

---

## 2. Step-by-Step Local Setup

### Step 1: Clone Repository
```bash
git clone https://github.com/Sachinsingh198/Sanjeevani.git
cd Sanjeevani
```

---

### Step 2: Backend Setup (FastAPI & LangGraph)

1. **Change into backend directory**:
   ```bash
   cd backend
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in `backend/.env` with your API keys:
   ```ini
   APP_ENV=development
   DEFAULT_LANGUAGE=hi

   # Primary LLM Configuration
   PRIMARY_LLM_PROVIDER=groq
   GROQ_API_KEY=your_groq_api_key
   GROQ_MODEL=llama-3.1-8b-instant

   # Secondary Fallback LLM
   GEMINI_API_KEY=your_gemini_api_key
   GEMINI_MODEL=gemini-1.5-flash

   # Speech & Voice Subsystem
   # Providers: sarvam | bhashini | edge
   TTS_PROVIDER=sarvam
   SARVAM_API_KEY=your_sarvam_api_key

   # Bhashini Government Indic AI Credentials (Optional / Mutual Failover)
   BHASHINI_USER_ID=your_bhashini_user_id
   BHASHINI_API_KEY=your_bhashini_api_key
   BHASHINI_INFERENCE_KEY=your_bhashini_inference_key
   BHASHINI_PIPELINE_ENDPOINT=https://dhruva-api.bhashini.gov.in/services/inference/pipeline

   # LangSmith Observability & Tracing
   LANGCHAIN_TRACING_V2=true
   LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
   LANGCHAIN_API_KEY=your_langsmith_api_key
   LANGCHAIN_PROJECT=sanjeevani

   # Vector Store & Databases
   QDRANT_PATH=./qdrant_data
   QDRANT_COLLECTION_NAME=sanjeevani_remedies
   DATABASE_URL=sqlite:///./sanjeevani.db
   CHECKPOINT_DB_PATH=sqlite:///./sessions.db
   ```

3. **Install Dependencies**:
   Using `uv` (Fastest):
   ```bash
   uv sync
   ```
   *Or using standard pip*:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

4. **Start the Backend Dev Server**:
   ```bash
   uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   Verify at [http://localhost:8000/health](http://localhost:8000/health).

---

### Step 3: Frontend Setup (React 19 + Vite)

1. **Open a new terminal and navigate to `frontend`**:
   ```bash
   cd frontend
   ```

2. **Install Node dependencies**:
   ```bash
   npm install
   ```

3. **Start the Frontend Dev Server**:
   ```bash
   npm run dev
   ```
   The application will be running at [http://localhost:5173](http://localhost:5173).

---

## 3. Seed Accounts for Rapid Testing

The database automatically initializes three pre-configured accounts:

| Persona / Role | Username | Password | Email | Purpose |
|---|---|---|---|---|
| **Citizen / Patient** | `patient` | `sanjeevani2026` | `sachin.patient@gmail.com` | Test clinical chat, voice room, yoga & companion |
| **ASHA Worker** | `asha` | `sanjeevani2026` | `sunita.asha@sanjeevani.gov.in` | Test emergency escalation queue & referral slips |
| **District Admin** | `admin` | `sanjeevani2026` | `admin@sanjeevani.gov.in` | Test system metrics, live voice provider switching & SOS alerts |

---

## 4. Running the Automated Test Suite

From the `backend/` folder:

```bash
# Run the entire test suite (45+ deterministic and integration tests)
uv run pytest -v

# Run deterministic triage safety tests
uv run pytest tests/test_clinical_triage.py -v

# Run LangGraph multi-turn agent tests
uv run pytest tests/test_agent_workflow.py -v

# Run Sarvam & Bhashini Voice integrations (STT, TTS, Provider Switching)
uv run pytest tests/test_sarvam_integrations.py tests/test_voice_provider.py -v

# Run Security, Refresh Token Rotation & Auth tests
uv run pytest tests/test_security.py -v

# Run Edge Vision Diagnostic pipeline tests
uv run pytest tests/test_cv_pipeline.py -v

# Run AYUSH Hybrid RAG vector retrieval tests
uv run pytest tests/test_hybrid_rag.py -v
```

> [!TIP]
> **Mocking Read-Only Engine Properties in Unit Tests**:
> When writing tests that mock voice service availability, note that `bhashini_client.is_configured` and `sarvam_stt_client.is_configured` are implemented as read-only class properties. Use `unittest.mock.patch("app.core.bhashini_client.bhashini_client.is_configured", new_callable=PropertyMock, return_value=True)` rather than assigning to the instance attribute to prevent `AttributeError: property of object has no setter`.

---

## 5. Database Architecture & Concurrency Safeguards

Project Sanjeevani uses an embedded SQLite database (`sanjeevani.db`) with Write-Ahead Logging (WAL) for rapid local execution and offline tolerance.

### SQLite Connection Sharing in Transactions
To prevent SQLite thread deadlocks (`database is locked`) during bulk batch processing:
- When a parent service opens a write transaction (such as `sync_batch_encounters()`), all child operations (e.g., `record_emergency_alert()`) must reuse the active database connection via `conn=conn`.
- Never open a second, independent `with get_db_connection():` context within an uncommitted transaction context on SQLite.

---

## 6. Production Deployment Guidelines

### Containerized Deployment (Docker)
```dockerfile
# Dockerfile for Backend
FROM python:3.11-slim

# Install system dependencies for OpenCV and MediaPipe headless execution
RUN apt-get update && apt-get install -y --no-install-recommends \
    libegl1 \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### Production Frontend Build
```bash
cd frontend
npm run build
# Distributable static files are output to frontend/dist/
```
Static assets can be served via **Nginx**, **Cloudflare Pages**, or **Caddy** with reverse proxy rules pointing `/api`, `/voice`, and `/chat` to the FastAPI backend at port `8000`.

### Production Security Checklist
- [ ] Replace default demo passwords (`sanjeevani2026`).
- [ ] Set `APP_ENV=production` in `backend/.env`.
- [ ] Configure HTTPS / SSL certificates via Let's Encrypt / Certbot.
- [ ] Enforce CORS origins matching your production domain.
- [ ] Configure Qdrant Cloud cluster with production API keys for high-availability vector queries.
