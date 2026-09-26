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

### A. Conversational Voice Consultation & Doctor Diagnostic Intake (Sanjeevani Live)

```mermaid
sequenceDiagram
    autonumber
    actor User as Rural Elder / Citizen
    participant Mic as Client Browser (LiveVoiceRoom)
    participant API as FastAPI Gateway (/chat/message)
    participant Triage as Deterministic Triage Engine
    participant Graph as LangGraph Engine (sessions.db)
    participant Doctor as Doctor Consultation Node (LLM)
    participant RAG as Hybrid AYUSH Vector Store (Qdrant)
    participant TTS as Sarvam Bulbul:v3 / Edge-TTS

    User->>Mic: Speaks: "Mera naak akshar band rehta hai"
    Mic->>API: POST /voice/stt & /chat/message (voice_mode=true)
    API->>Triage: Run MTS rules + Negation checking
    Triage-->>API: Tier: Green (Safe for consultation)
    API->>Graph: Advance turn_count = 1, phase = CONSULTATION
    Graph->>Doctor: Evaluate history & chief complaint
    Note over Doctor: Empathetic intake: Acknowledge + ask onset/duration (Under 18 words)
    Doctor-->>API: "Samajh gayi beta, kitni der se naak band hai?"
    API->>TTS: Stream audio synthesis
    TTS-->>User: Plays audio (<1.5s total latency)

    User->>Mic: "2 saalon se"
    Mic->>API: POST /chat/message (Turn 2)
    API->>Graph: Advance turn_count = 2
    Graph->>Doctor: Evaluate chronic duration -> probe character/discharge
    Doctor-->>API: "Chinta na karein, kya naak se koi balgam aata hai?"
    API-->>User: Plays audio

    User->>Mic: "Nahi"
    Mic->>API: POST /chat/message (Turn 3)
    API->>Graph: Advance turn_count = 3
    Graph->>Doctor: Negative discharge -> probe allergic signs (itching/sneezing)
    Doctor-->>API: "Theek hai, kya naak band ke alawa khujli ya chhink aati hai?"
    API-->>User: Plays audio

    User->>Mic: "Haan chhink aati hai aur aankhon mein bhi khujli hoti hai"
    Mic->>API: POST /chat/message (Turn 4)
    API->>Graph: Advance turn_count = 4 (Sufficient diagnostic clarity achieved)
    Graph->>Doctor: Formulate differential diagnosis (Vata-Kapha Pratishyaya) -> Emit ##CONCLUDE##
    Graph->>RAG: Query active symptoms in CCRAS / Ministry of AYUSH compendiums
    RAG-->>Graph: Return verified remedy (Anu Taila Pratimarsha Nasya & Haridra-Tulsi Bashpa)
    Graph->>Doctor: Format clinical prescription strictly using verified AYUSH record
    Doctor-->>API: Return prescription markdown + concise spoken summary
    API->>TTS: Synthesize spoken advice
    TTS-->>User: "Aapke bataye lakshano se Vata-Kapha Pratishyaya lag raha hai... Anu Taila ka nuskha screen par diya gaya hai."
```

---

### B. Emergency Red-Tier Escalation Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Patient as Patient / Family Member
    participant Chat as Chat Interface (/chat)
    participant Triage as Deterministic Triage Engine
    participant EmerNode as Emergency Node
    participant DB as SQLite DB (sanjeevani.db)
    participant ASHA as ASHA Worker Dashboard (/asha)

    Patient->>Chat: Enters: "Chhati me bahut tez dard ho raha hai aur saans phool rahi hai"
    Chat->>Triage: Pattern match against MTS emergency keywords
    Note over Triage: Matches "cardiac_chest_pain" & "acute_respiratory_distress"<br/>Negation check: FALSE (Active acute complaint)
    Triage-->>Chat: Detected Tier: RED, escalation_triggered: true

    Chat->>EmerNode: Short-circuit directly to emergency handler (Bypasses LLM)
    EmerNode-->>Chat: Render 108 Emergency Card + Nearby PHC + Vital First-Aid Guidance
    EmerNode->>DB: Log Emergency Escalation Record
    DB-->>ASHA: Real-time update in ASHA triage queue with high-priority pulse
```

---

### C. Offline-First Resilience & Bi-Directional Synchronization

```mermaid
flowchart TD
    subgraph Client ["Client Device (Browser / Mobile)"]
        UI["User Chat Interface"]
        SW["Service Worker (PWA Cache)"]
        IDB[("Client IndexedDB\n(offline_consultations queue)")]
        NetWatch{"Network Status\n(navigator.onLine)"}
        OfflineEngine["Offline Diagnostic Fallback Engine\n(In-Browser Symptom Matcher)"]
    end

    subgraph Network ["Internet Connection"]
        SyncRequest["POST /chat/offline-sync\n(Batch Queue Transmission)"]
    end

    subgraph Server ["FastAPI Backend"]
        SyncEndpoint["Offline Sync Handler (/chat/offline-sync)"]
        Checkpointer["ResilientCheckpointer\n(Dual Engine)"]
        LocalSQLite[("sessions.db\n(WAL Mode SQLite)")]
        CloudCluster[("PostgreSQL / Qdrant Cloud")]
        Analytics["Analytics Logger"]
    end

    UI -->|Message Entered| NetWatch
    NetWatch -->|Offline: No Connection| OfflineEngine
    OfflineEngine -->|Instant Local Reply| UI
    OfflineEngine -->|Store Pending Session| IDB

    NetWatch -->|Online: Connection Restored| SyncRequest
    IDB -->|Drain Pending Consultations| SyncRequest
    SyncRequest --> SyncEndpoint

    SyncEndpoint --> Checkpointer
    Checkpointer -->|Immediate Local Write| LocalSQLite
    Checkpointer -->|Async Upstream Mirror| CloudCluster
    SyncEndpoint --> Analytics
    SyncEndpoint -->>|200 OK: Synced Count| IDB
    IDB -->|Mark Synced| UI
```

---

### D. AYUSH Clinical Safety & Substance Exclusion Filter

```mermaid
flowchart TD
    Query["Patient Symptom Intake\n(e.g., 'naak band, chheenk, khujli')"] --> Qdrant["Qdrant Vector RAG & Lexical Search"]
    Qdrant --> Candidates["Raw Candidate Remedies"]

    subgraph SafetyFilter ["Multi-Layer Clinical Safety Filter"]
        ComorbidCheck{"SafetyKnowledgeGraph:\nPatient Comorbidity Contraindicated?"}
        BannedCheck{"Banned Substances Screening:\nContains Tobacco, Opium, Syphilis, Toxic Minerals?"}
        SourceCheck{"Source Verification:\nOfficial CCRAS / Ministry of AYUSH Record?"}
    end

    Candidates --> ComorbidCheck
    ComorbidCheck -->|Yes: Unsafe for Patient| Reject["Discard Candidate"]
    ComorbidCheck -->|No: Safe| BannedCheck

    BannedCheck -->|Found Harmful Folk Text| Reject
    BannedCheck -->|Pristine Formulation| SourceCheck

    Reject --> CCRASFallback["Enforce Gold-Standard CCRAS Formulation\n(e.g., Anu Taila Pratimarsha Nasya)"]

    SourceCheck -->|Verified CCRAS| Accept["Approved Prescription Candidate"]
    SourceCheck -->|Unverified Folk Entry| CCRASFallback

    CCRASFallback --> Accept
    Accept --> LLM["Prescription Formatter Node\n(Strict Grounding: 0 Hallucinations)"]
    LLM --> UI["Visual Prescription Card + Voice Guidance"]
```

---

### E. Edge Computer Vision Screening Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Worker as ASHA Worker / Citizen
    participant Client as Screening Page (/screen)
    participant Engine as DiagnosticScreeningEngine
    participant Preproc as Preprocessor (Bilateral Filter + Illumination Normalization)
    participant Calc as Color Space Evaluator (CIELAB / HSV)

    Worker->>Client: Captures lower eyelid photo (conjunctiva)
    Client->>Engine: POST /screen/anemia (multipart image file)
    Engine->>Preproc: Illumination correction & noise reduction
    Preproc->>Calc: Segment palpebral conjunctiva ROI
    Calc->>Calc: Convert RGB to CIELAB color space
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
| **LangGraph Checkpoints** | State DB | SQLite3 (`sessions.db`) via `ResilientCheckpointer` | Permanent zero-amnesia multi-turn conversation memory |
| **AYUSH Remedies Vectors** | Vector Store | Qdrant Cloud / Local on-disk (`qdrant_data`) | Pre-seeded with CCRAS dataset & docx treaties |
| **Garhwali Dialect Vectors** | Vector Store | Qdrant collection `sanjeevani_garhwali` | Pre-seeded with regional dialect phrases (1300+ points) |
| **Offline Sync Queue** | Client Store | Browser IndexedDB (`offline_consultations`) | Persisted on client until acknowledged by backend sync |
| **Execution Telemetry** | Cloud Observability | LangSmith Cloud SaaS | Distributed tracing for agent steps, tokens, and latency |

