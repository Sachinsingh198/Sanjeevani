# 02. Architecture & System Workflow

## 1. High-Level Architectural Topology

Project Sanjeevani is constructed using a decoupled, asynchronous micro-modular architecture:

```mermaid
graph TB
    subgraph ClientLayer ["Client Layer (React 19 + Tailwind v4)"]
        Browser["Modern Web Browser / Mobile Viewport"]
        LiveMic["LiveVoiceRoom (Web Audio API)"]
        CamUI["Edge Vision Diagnostic Panel"]
        MitraUI["Mitra Portal & Saathi Companion"]
    end

    subgraph APIGateway ["FastAPI Application Gateway (:8000)"]
        FastAPIApp["FastAPI 2.0 Engine (app.main:app)"]
        Lifespan["Lifespan Startup & Table Seeder"]
        CORSMiddleware["CORS & Network Filter"]
        JWTAuth["JWT & OTP Auth Handlers"]
    end

    subgraph IntelligenceCore ["Clinical Intelligence Engine"]
        TriageEngine["Deterministic MTS Triage Engine"]
        LangGraphWorkflow["LangGraph State Machine (Compiled Graph)"]
        RetrieverNode["Retriever Node (Hybrid AYUSH RAG)"]
        DoctorNode["Doctor Consultation Node"]
        EmergencyNode["Emergency Escalation Node"]
    end

    subgraph SpeechCluster ["Speech & Audio Services"]
        SarvamSTTClient["Sarvam Saaras v3 Client (Multipart REST)"]
        SarvamTTSClient["Sarvam Bulbul v3 Streaming Engine"]
        EdgeTTS["Neural Indic Edge-TTS (Fallback)"]
        AI4BharatTTS["AI4Bharat Indic-TTS (Local PyTorch)"]
    end

    subgraph VisionCluster ["Edge Computer Vision Subsystem"]
        ImgDecoder["OpenCV Byte Array Decoder"]
        Preproc["Bilateral Filter & Illumination Normalizer"]
        AnemiaEngine["CIELAB Erythema Index Calculator"]
        JaundiceEngine["HSV Sclera & b* Chromatic Shift Engine"]
    end

    subgraph StorageLayer ["Persistence & External Services"]
        SQLiteDB[("sanjeevani.db (Users & OTPs)")]
        CheckpointerDB[("sessions.db (LangGraph State Checkpoints)")]
        QdrantStore[("Qdrant Cloud / Local Vector Store")]
        LangSmithCloud[("LangSmith Tracing Platform")]
    end

    Browser --> CORSMiddleware
    LiveMic -->|Audio Blobs| FastAPIApp
    CamUI -->|Image Bytes| FastAPIApp
    MitraUI -->|REST Payloads| FastAPIApp

    CORSMiddleware --> FastAPIApp
    FastAPIApp --> JWTAuth
    FastAPIApp -->|/voice/stt| SarvamSTTClient
    FastAPIApp -->|/voice/tts| SarvamTTSClient
    FastAPIApp -->|/screen/*| ImgDecoder
    FastAPIApp -->|/chat/message| LangGraphWorkflow

    LangGraphWorkflow --> TriageEngine
    TriageEngine -->|Red Tier| EmergencyNode
    TriageEngine -->|Yellow / Green| DoctorNode
    DoctorNode --> RetrieverNode
    RetrieverNode --> QdrantStore

    SarvamTTSClient -.->|Fallback| EdgeTTS
    EdgeTTS -.->|Fallback| AI4BharatTTS

    ImgDecoder --> Preproc
    Preproc --> AnemiaEngine & JaundiceEngine

    JWTAuth --> SQLiteDB
    LangGraphWorkflow --> CheckpointerDB
    LangGraphWorkflow -.->|Telemetry & Spans| LangSmithCloud
```

---

## 2. End-to-End Request Lifecycles

### A. Conversational Voice Consultation (Sanjeevani Live)

```mermaid
sequenceDiagram
    autonumber
    actor User as Rural Elder / Citizen
    participant Mic as Client Browser (LiveVoiceRoom)
    participant API as FastAPI Backend (/voice/stt)
    participant STT as Sarvam AI (Saaras:v3)
    participant Graph as LangGraph Engine (/chat/message)
    participant Triage as Clinical Triage Engine
    participant LLM as Primary LLM (Groq / Gemini)
    participant RAG as Qdrant Vector Store
    participant TTS as Sarvam Bulbul:v3 / Edge-TTS

    User->>Mic: Speaks: "Mujhe 2 din se sar dard aur thakan hai"
    Mic->>API: POST /voice/stt (multipart audio/wav)
    API->>STT: Request audio transcription (mode="codemix")
    STT-->>API: Returns transcript: "Mujhe 2 din se sar dard aur thakan hai"
    API-->>Mic: Return JSON transcript

    Mic->>Graph: POST /chat/message (transcript, voice_mode=true)
    Graph->>Triage: Evaluate MTS discriminators + Negation
    Triage-->>Graph: Severity = Green (Routine), Flags = []

    Graph->>LLM: Ingest context + prompt (Constrained: 1 question at a time)
    LLM-->>Graph: Returns: "Namaste! Kya aapko bukhar ya ulti jaisa lag raha hai?"

    alt Dialogue Concluded
        Graph->>RAG: Fetch CCRAS headache remedies
        RAG-->>Graph: Return Ayurvedic herbal tea / paste
    end

    Graph-->>Mic: Return final_reply_text & spoken_reply_text
    Mic->>TTS: POST /voice/tts/stream (spoken_reply_text)
    TTS-->>Mic: Stream chunked MP3 audio
    Mic-->>User: Audio plays through speaker in <1.5s total
```

---

### B. Emergency Red-Tier Escalation Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Patient as Patient / Family Member
    participant Chat as Chat Interface (/chat)
    participant Triage as Triage Engine
    participant EmerNode as Emergency Node
    participant DB as SQLite DB
    participant ASHA as ASHA Worker Dashboard (/asha)

    Patient->>Chat: Enters: "Chhati me bahut tez dard ho raha hai aur saans phool rahi hai"
    Chat->>Triage: Pattern match against red_patterns
    Note over Triage: Matches "cardiac_chest_pain" & "acute_respiratory_distress"<br/>Negation check: FALSE
    Triage-->>Chat: Detected Tier: RED, escalation_triggered: true

    Chat->>EmerNode: Short-circuit directly to emergency handler
    EmerNode-->>Chat: Render 108 Emergency Card + Nearby PHC + First Aid Steps
    EmerNode->>DB: Log Emergency Escalation Record
    DB-->>ASHA: Real-time update in ASHA triage queue with high-priority pulse
```

---

### C. Edge Vision Screening Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Worker as ASHA Worker / Citizen
    participant Client as Screening Page (/screen)
    participant Engine as DiagnosticScreeningEngine
    participant Preproc as Preprocessor (CLAHE)
    participant Calc as Color Space Evaluator

    Worker->>Client: Captures lower eyelid photo (conjunctiva)
    Client->>Engine: POST /screen/anemia (multipart image file)
    Engine->>Preproc: Bilateral Filter & illumination balance
    Preproc->>Calc: Segment palpebral conjunctiva ROI
    Calc->>Calc: Convert RGB to CIELAB space
    Calc->>Calc: Calculate Erythema Index (EI = a* / L*)
    Calc->>Calc: Estimate Hemoglobin (Hb) = 13.5 * EI
    Calc-->>Engine: Results: Hb: 9.4 g/dL, Status: Moderate Pallor
    Engine-->>Client: Returns JSON + annotated Base64 ROI overlay
    Client-->>Worker: Displays gauge metric, clinical warning, and ASHA referral recommendation
```

---

## 3. Data Storage & Persistence Strategy

| Data Asset | Storage Engine | Technology | Persistence Policy |
|---|---|---|---|
| **Users & Authentication** | Relational DB | SQLite3 (`sanjeevani.db`) with WAL mode | Permanent transactional storage |
| **One-Time Passwords (OTPs)**| Relational DB | SQLite3 (`sanjeevani.db`) table `otps` | Auto-invalidated upon verification or expiry |
| **LangGraph Checkpoints** | State DB | SQLite3 (`sessions.db`) via `SqliteSaver` | Permanent multi-turn conversation memory |
| **AYUSH Remedies Vectors** | Vector Store | Qdrant Cloud / Local on-disk (`qdrant_data`) | Pre-seeded with CCRAS dataset & docx treaties |
| **Garhwali Dialect Vectors** | Vector Store | Qdrant collection `sanjeevani_garhwali` | Pre-seeded with regional dialect phrases |
| **Execution Telemetry** | Cloud Observability | LangSmith Cloud SaaS | 14-day retention for development traces |
