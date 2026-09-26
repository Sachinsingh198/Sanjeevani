# 13. System Workflows & Mermaid Diagrams Master Guide

Welcome to the **Sanjeevani (संजीवनी) Visual Workflow Compendium**. This document provides an exhaustive, intuitive, and interpretable visual guide to every major subsystem, data pipeline, and agent workflow within Sanjeevani.

Whether you are a healthcare practitioner, clinical evaluator, software engineer, or hackathon judge, these diagrams will give you an immediate, intuitive understanding of how Sanjeevani delivers safe, culturally attuned healthcare to rural Himalayan communities.

---

## 📑 Table of Diagrams

1. [High-Level End-to-End Patient Healthcare Journey](#1-high-level-end-to-end-patient-healthcare-journey)
2. [Micro-Modular System Architecture Topology](#2-micro-modular-system-architecture-topology)
3. [Multi-Turn Adaptive Doctor Consultation State Machine](#3-multi-turn-adaptive-doctor-consultation-state-machine)
4. [Deterministic Manchester Triage & Negation Engine](#4-deterministic-manchester-triage--negation-engine)
5. [Emergency Red-Tier Short-Circuit & Rapid Response](#5-emergency-red-tier-short-circuit--rapid-response)
6. [AYUSH Hybrid RAG, Knowledge Graph & Safety Exclusion Pipeline](#6-ayush-hybrid-rag-knowledge-graph--safety-exclusion-pipeline)
7. [Offline-First Resilience & Bi-Directional Synchronization](#7-offline-first-resilience--bi-directional-synchronization)
8. [Real-Time Multilingual Voice Consultation Loop](#8-real-time-multilingual-voice-consultation-loop)
9. [Edge Non-Invasive Optical Diagnostic Suite](#9-edge-non-invasive-optical-diagnostic-suite)
10. [Multi-Stakeholder Healthcare Collaboration Ecosystem](#10-multi-stakeholder-healthcare-collaboration-ecosystem)

---

## 1. High-Level End-to-End Patient Healthcare Journey

The following diagram maps the complete experience of a rural patient—from speaking a health complaint in their native dialect to receiving personalized medical care, prescription cards, or emergency escalation.

```mermaid
flowchart TD
    Start(["🏔️ Rural Villager with Health Complaint\n(Speaks in Garhwali / Hindi / English)"]) --> InputMethod{"Interaction Mode"}

    InputMethod -->|Spoken Voice| MicCapture["Microphone Capture\n(LiveVoiceRoom / Audio Stream)"]
    InputMethod -->|Text Input| TextInput["Text Chat Interface\n(Mobile / Tablet / PWA)"]

    MicCapture --> STT["Sarvam AI Saaras:v3 Speech-to-Text\n(Code-Mixed Indic ASR)"]
    STT --> NormalizedQuery["Normalized Symptom Narrative"]
    TextInput --> NormalizedQuery

    NormalizedQuery --> TriageEngine{"Deterministic Triage Engine (MTS)\nBi-directional Negation Checking"}

    %% Red Tier Escalation
    TriageEngine -->|Critical Life Threat / Red Tier| EmergencyNode["🚨 Emergency Red-Tier Node\n(Immediate Suppression of Home Remedies)"]
    EmergencyNode --> EmergencyUI["Ambulance 108 Speed-Dial Card\n+ Critical First Aid Guidance\n+ Nearest PHC Navigation"]

    %% Green/Yellow Consultation
    TriageEngine -->|Safe / Sub-Acute Symptoms| LangGraphConsult["🩺 Adaptive Doctor Consultation Node\n(LangGraph State Machine)"]
    
    LangGraphConsult --> IntakeTurn{"Clinical History Taking\n(Turns 1 to 5)"}
    IntakeTurn -->|Clarifying Question| DoctorAsk["Doctor Asks Socratic Clarification\n(Onset, Pain Type, Radiation, Associated Signs)"]
    DoctorAsk --> PatientAnswers["Patient Provides Additional Details"]
    PatientAnswers --> LangGraphConsult

    IntakeTurn -->|Clinical Picture Sufficient\nor Max Turns Reached| ConcludeTag["Emits ##CONCLUDE## Tag\n& Synthesizes Diagnostic Summary"]

    ConcludeTag --> RAGPipeline["📚 AYUSH Hybrid RAG & Knowledge Store\n(FastEmbed Dense Vector + Qdrant)"]
    RAGPipeline --> SafetyFilter{"Safety Knowledge Graph\n& Substance Ban Filter"}
    
    SafetyFilter -->|Safe Verified Formulation| RemedyCard["🌿 Sarkari AYUSH Validated Remedy Card\n(CCRAS Dosage, Ingredients & Preparation)"]
    SafetyFilter -->|Potential Contraindication| SafeFallback["⚠️ Safe Conservative Advice\n(Warm Hydration, Rest & PHC Referral)"]

    RemedyCard --> VoicePlayback["🔊 Neural Indic Voice Readout (TTS)\n+ Interactive Visual Card"]
    SafeFallback --> VoicePlayback

    VoicePlayback --> FollowUp["📅 ASHA Worker Task Scheduled\n& Follow-Up Reminder Set"]
```

---

## 2. Micro-Modular System Architecture Topology

Sanjeevani is architected into 7 decoupled, highly resilient micro-modules designed to operate flawlessly even under intermittent 2G/3G connectivity in mountainous regions.

```mermaid
graph TB
    subgraph Layer1 ["Client Presentation Layer (React 19 + Vite + Tailwind v4)"]
        UI_Chat["Voice & Text Consultation\n(VoiceConsultationPage.jsx)"]
        UI_Voice["Low-Latency Audio Stream\n(LiveVoiceRoom.jsx)"]
        UI_CV["Edge Vision Diagnostics\n(VisionDiagnosticsPage.jsx)"]
        UI_Offline["Offline Storage & Sync\n(IndexedDB / Service Worker)"]
    end

    subgraph Layer2 ["API Gateway & Security Layer (FastAPI 0.115+)"]
        GW_CORS["CORS & Request Sanitization"]
        GW_Auth["JWT & OTP Authentication"]
        GW_Limiter["Rate Limiting & DoS Shield"]
        GW_Router["Sub-Routers (/chat, /voice, /screen, /sync)"]
    end

    subgraph Layer3 ["Deterministic Clinical Safety Engine"]
        Triage_MTS["Manchester Triage System (MTS)"]
        Triage_Neg["35-Char Bi-Directional Negation Window"]
        Triage_Regex["Multi-Lingual Regex Discriminators"]
        Triage_Override["Emergency Short-Circuit Gateway"]
    end

    subgraph Layer4 ["Agentic Intelligence Layer (LangGraph)"]
        LG_State["AgentState TypedDict Engine"]
        LG_Nodes["Triage, Responder, Retriever, Emergency Nodes"]
        LG_Checkpointer["Dual Checkpointer (SQLite + Memory)"]
        LG_LLM["LLM Orchestration (Groq / Gemini / Sarvam)"]
    end

    subgraph Layer5 ["Knowledge & Retrieval Layer (AYUSH RAG)"]
        RAG_FastEmbed["FastEmbed ONNX CPU (all-MiniLM-L6-v2)"]
        RAG_Qdrant["Qdrant Cloud & Local Disk Fallback"]
        RAG_Corpus["CCRAS + Vaidya Chikitsa (114 Ch.) + Dravyaguna (119 Herbs)"]
        RAG_Safety["Safety Knowledge Graph & Banned Substance Filter"]
    end

    subgraph Layer6 ["Perception & Speech Subsystems"]
        Speech_STT["Sarvam Saaras:v3 Indic STT"]
        Speech_TTS["Sarvam Bulbul:v3 + Edge-TTS Streaming"]
        CV_OpenCV["Pure CPU OpenCV (CIELAB & HSV Color Space)"]
    end

    subgraph Layer7 ["Persistence & Telemetry Tier"]
        DB_SQLite["SQLite Operational Store (sessions.db)"]
        DB_Audit["Clinical Audit Logs & ASHA Schedules"]
        Obs_LangSmith["LangSmith Distributed Agent Tracing"]
    end

    Layer1 <==>|HTTP / WebSocket / Audio Stream| Layer2
    Layer2 --> Layer3
    Layer3 -->|Red Tier Alert| LG_Nodes
    Layer3 -->|Green/Yellow Tier| Layer4
    Layer4 <==> Layer5
    Layer2 <==> Layer6
    Layer4 <==> Layer7
```

---

## 3. Multi-Turn Adaptive Doctor Consultation State Machine

Unlike basic chatbots that offer instant, generic recommendations based on a single keyword, Sanjeevani conducts a true Socratic clinical intake, asking up to 5 progressive, adaptive questions before forming an assessment.

```mermaid
stateDiagram-v2
    [*] --> GREETING: Patient Opens Consultation
    
    GREETING --> CHIEF_COMPLAINT_INTAKE: User Describes Primary Issue
    note right of GREETING
        Dr. Sanjeevani introduces self warmly in Hindi/Garhwali:
        "Namaste! Main Sanjeevani hoon — aapki shaant swasthya sahayak."
    end note

    CHIEF_COMPLAINT_INTAKE --> CLINICAL_TRIAGE: Extract Initial Tokens
    
    state CLINICAL_TRIAGE {
        [*] --> CheckEmergency
        CheckEmergency --> RED_EMERGENCY: Red Discriminator Match (Non-negated)
        CheckEmergency --> ROUTINE_GREEN: No Critical Flags
        CheckEmergency --> URGENT_YELLOW: Sub-Acute Discriminator Match
    }

    RED_EMERGENCY --> [*]: Short-Circuit to Emergency Node (Ambulance 108)

    ROUTINE_GREEN --> ADAPTIVE_HISTORY_TAKING: Turn 1 (Onset & Duration)
    URGENT_YELLOW --> ADAPTIVE_HISTORY_TAKING: Turn 1 (Onset & Severity)

    state ADAPTIVE_HISTORY_TAKING {
        [*] --> AskDuration: "Kitne samay se takleef hai?"
        AskDuration --> AssessResponse1: Patient Answers
        
        AssessResponse1 --> AskAssociatedSymptoms: Turn 2 (Fever, Sputum, Radiation?)
        AskAssociatedSymptoms --> AssessResponse2: Patient Answers
        
        AssessResponse2 --> AskDifferentialTriggers: Turn 3 (Aggravating / Relieving Factors?)
        AskDifferentialTriggers --> AssessResponse3: Patient Answers
        
        AssessResponse3 --> AskComorbidities: Turn 4 (Prior conditions, Age, Pregnancy?)
        AskComorbidities --> AssessResponse4: Patient Answers
        
        AssessResponse4 --> EvaluateSufficiency: Turn 5 (Maximum Intake Reached)
    }

    ADAPTIVE_HISTORY_TAKING --> EMIT_CONCLUDE: Clear Clinical Picture Established OR Turn 5 Completed
    note left of EMIT_CONCLUDE
        LLM appends internal sentinel token:
        ##CONCLUDE##
        followed by diagnostic rationale.
    end note

    EMIT_CONCLUDE --> AYUSH_REMEDY_RETRIEVAL: Route via Conditional Edge
    
    AYUSH_REMEDY_RETRIEVAL --> SAFETY_VALIDATION: Query Qdrant with Extracted Symptoms
    SAFETY_VALIDATION --> DELIVER_PRESCRIPTION_CARD: Pass Knowledge Graph & Substance Filter
    DELIVER_PRESCRIPTION_CARD --> FOLLOW_UP_MONITORING: Schedule ASHA 48-Hour Check
    FOLLOW_UP_MONITORING --> [*]
```

---

## 4. Deterministic Manchester Triage & Negation Engine

The following diagram illustrates how the **Deterministic Clinical Triage Engine** (`ClinicalTriageEngine`) evaluates user input before any LLM is called, protecting patients from AI hallucinations.

```mermaid
flowchart TD
    UserQuery["Incoming User Utterance\n(e.g., 'Khansi aur bukhar hai par seene me dard nahi hai')"] --> Lowercase["Normalize Text & Lowercase Conversion"]

    subgraph RegexMatching ["Regex Pattern Matching"]
        Lowercase --> MatchRed{"Match Red Pattern?\n(Cardiac, Dyspnea, Stroke, Shock)"}
        Lowercase --> MatchYellow{"Match Yellow Pattern?\n(Prolonged Fever, Severe Pain)"}
    end

    MatchRed -->|Pattern Detected at [start:end]| NegationCheckRed{"Bi-Directional Negation Check\n(35-char sliding window)"}
    MatchYellow -->|Pattern Detected at [start:end]| NegationCheckYellow{"Bi-Directional Negation Check\n(35-char sliding window)"}

    subgraph NegationWindow ["Negation Evaluation (Prefix & Postfix)"]
        NegationCheckRed -->|Preceding or Succeeding Token in:\n'nahi', 'nahin', 'no', 'not', 'denies'| DiscardRed["Negation True:\nDiscard Red Trigger"]
        NegationCheckRed -->|No Negation Token Found| ConfirmRed["Negation False:\nTrigger Active Emergency"]

        NegationCheckYellow -->|Negation Token Found| DiscardYellow["Negation True:\nDiscard Yellow Trigger"]
        NegationCheckYellow -->|No Negation Token Found| ConfirmYellow["Negation False:\nTrigger Urgent Yellow"]
    end

    MatchRed -->|No Match| MatchYellow
    DiscardRed --> MatchYellow

    ConfirmRed --> SetRedTier["Assign RED TIER (Priority 1)\n- bypass_llm = True\n- target_window = '<10 mins'"]
    ConfirmYellow --> SetYellowTier["Assign YELLOW TIER (Priority 2)\n- doctor_supervision = True\n- target_window = '<24 hours'"]
    DiscardYellow --> SetGreenTier["Assign GREEN TIER (Priority 3)\n- routine_care = True\n- home_remedy_eligible = True"]
    MatchYellow -->|No Match| SetGreenTier

    SetRedTier --> RouteDecision{"LangGraph Routing"}
    SetYellowTier --> RouteDecision
    SetGreenTier --> RouteDecision

    RouteDecision -->|RED| EmergencyHandler["Route to emergency_node"]
    RouteDecision -->|YELLOW / GREEN| ConsultationHandler["Route to responder_node (Doctor Consultation)"]
```

---

## 5. Emergency Red-Tier Short-Circuit & Rapid Response

When a life-threatening symptom (e.g., crushing chest pain, acute breathlessness, sudden loss of speech) is detected, Sanjeevani executes an instantaneous safety short-circuit.

```mermaid
sequenceDiagram
    autonumber
    actor Patient as 🧑‍🌾 Patient / Family Member
    participant Frontend as 💻 Sanjeevani PWA Client
    participant Triage as 🛡️ TriageEngine (MTS)
    participant LangGraph as 🔄 LangGraph Supervisor
    participant Emergency as 🚨 Emergency Node
    actor Dispatch as 🚑 108 Emergency Ambulance / PHC

    Patient->>Frontend: "Mere pitaji ke seene mein bahut tej dard hai aur saans phool rahi hai!"
    Frontend->>Triage: POST /chat/message (Stream query)
    
    rect rgb(255, 230, 230)
        Note over Triage: Detects: 'seene mein... tej dard' (Cardiac) + 'saans phool rahi' (Dyspnea)
        Note over Triage: Negation window: CLEAN (No negations found)
        Triage-->>LangGraph: TIER = RED (Urgency: Critical Life Threat)
    end

    LangGraph->>Emergency: Short-circuit directly to emergency_node (LLM reasoning bypassed)
    
    rect rgb(255, 240, 240)
        Note over Emergency: 1. Suppress all herbal/home remedies<br/>2. Retrieve emergency first-aid protocols (CPR, lateral position, aspirin advice)<br/>3. Format urgent 108 referral card
    end

    Emergency-->>Frontend: Stream Red Emergency Alert Card JSON
    Frontend->>Patient: 🚨 Flashing Red Visual Alert + 108 Direct Call Button
    Frontend->>Dispatch: Trigger Webhook / SMS Alert with GPS Coordinates (if permitted)
    Frontend->>Patient: Audio Alert: "Kripya turant 108 par call karein. Marij ko aaram se bithayein..."
```

---

## 6. AYUSH Hybrid RAG, Knowledge Graph & Safety Exclusion Pipeline

This diagram shows how traditional Ayurvedic wisdom is verified, filtered, and delivered safely without risk of toxic herb ingestion or dangerous drug-herb interactions.

```mermaid
flowchart TD
    Complaint["Consultation Concluded:\nExtracted Symptoms (e.g. Band Naak, Chhink, Khujli)"] --> RetrieverNode["Retriever Node Formulation"]

    subgraph Step1 ["1. Vector Dense Embedding & Semantic Search"]
        RetrieverNode --> FastEmbed["FastEmbed (ONNX CPU Runtime)\nModel: sentence-transformers/all-MiniLM-L6-v2\n(384-dimensional dense vectors)"]
        FastEmbed --> QdrantSearch["Qdrant Vector Database\nCollection: sanjeevani_remedies\n(Score Threshold >= 0.65)"]
        QdrantSearch -->|Match Found| RawCandidates["Top-K Candidate Formulations"]
        QdrantSearch -->|Vector Store Offline / No Match| BM25Fallback["BM25 Lexical Keyword Search\n(DATA/remedies_dataset.json)"]
        BM25Fallback --> RawCandidates
    end

    subgraph Step2 ["2. Safety Knowledge Graph Validation"]
        RawCandidates --> KGCheck{"Safety Knowledge Graph:\nCheck Comorbidities & Contraindications"}
        KGCheck -->|Contraindication Found\n(e.g., Pitta aggravation in peptic ulcer)| DiscardKG["Drop Candidate &\nRecord Safety Audit Log"]
        KGCheck -->|No Clinical Conflict| PassedKG["Approved for Substance Screen"]
    end

    subgraph Step3 ["3. Toxic Substance & Folk Term Exclusion Gate"]
        PassedKG --> SubstanceCheck{"Banned Substance Filter:\nContains Tobacco, Snuff, Opium,\nor Heavy Metals?"}
        SubstanceCheck -->|Banned Keyword Matched| QuarantineItem["Quarantine Formulation\n(Never expose to patient)"]
        SubstanceCheck -->|Pure Kitchen / Botanical Herbs| SafeBotanical["Safe Botanical Formulation"]
    end

    subgraph Step4 ["4. Government CCRAS Gold-Standard Overrides"]
        SafeBotanical --> GoldCheck{"Exact Clinical Match in\nCCRAS Gold-Standard Registry?"}
        GoldCheck -->|Yes: e.g. Allergic Rhinitis / Sinusitis| EnforceCCRAS["Enforce Official CCRAS Protocol:\n- Anu Taila Pratimarsha Nasya\n- Haridra-Tulsi Bashpa (Steam)"]
        GoldCheck -->|No: Standard Mild Ailment| EnforceCurated["Use Curated Vaidya Chikitsa Remedy"]
    end

    DiscardKG --> FallbackHydration["Default to Warm Water, Rest & Hydration Advice"]
    QuarantineItem --> FallbackHydration

    EnforceCCRAS --> Formatter["Structured Output Formatter (JSON + Markdown)"]
    EnforceCurated --> Formatter
    FallbackHydration --> Formatter

    Formatter --> FinalCard["🌿 Visual Remedy Card Rendered on Client\n(Title, Preparation Steps, Dosage, Precautions)"]
```

---

## 7. Offline-First Resilience & Bi-Directional Synchronization

Himalayan mountain villages often experience days without cellular or fiber internet. The following diagram illustrates how Sanjeevani functions completely offline and synchronizes when the network returns.

```mermaid
sequenceDiagram
    autonumber
    actor Patient as 🧑‍🌾 Patient (Offline Village)
    participant Client as 📱 Sanjeevani PWA (Browser / Mobile)
    participant IDB as 🗄️ IndexedDB (Local Cache)
    participant Gateway as 🌐 FastAPI Backend Gateway
    participant SQLite as 💾 SQLite Persistence (sessions.db)

    Note over Client: Internet Connection LOST (Offline Mode Engaged)

    Patient->>Client: Enters Symptom: "Pet mein marod aur dast ho rahe hain"
    Client->>IDB: Query Cached Remedies & Offline Regex Triage
    
    rect rgb(240, 248, 255)
        Note over Client: 1. Local Triage evaluates urgency<br/>2. Generates verified cached hydration advice (ORS / Shikanji)<br/>3. Stamped with tag: 'Answered offline (unconfirmed)'
    end

    Client->>IDB: Store Message in Outbox Queue (sync_status = 'pending')
    Client->>Patient: Displays Cached Clinical Advice + Warning Banner

    Note over Client: 📶 Internet Connection RESTORED (Online Event Fired)

    Client->>IDB: Fetch all records where sync_status == 'pending'
    IDB-->>Client: Return 3 Pending Consultations
    
    Client->>Gateway: POST /chat/sync/batch (Encrypted Payload)
    
    rect rgb(235, 255, 235)
        Note over Gateway: 1. Validate session schema<br/>2. Merge offline messages into central session timeline<br/>3. Run server-side clinical validation on offline triage
    end

    Gateway->>SQLite: Commit synchronized session records
    Gateway-->>Client: HTTP 200 OK (Sync Acknowledged)
    Client->>IDB: Update sync_status = 'synced'
    Client->>Patient: ✅ Green Toast: "Offline consultation successfully synced!"
```

---

## 8. Real-Time Multilingual Voice Consultation Loop

Designed specifically for elderly villagers who cannot read or type, the voice loop achieves an end-to-end latency of under 1.5 seconds.

```mermaid
flowchart LR
    subgraph AudioCapture ["1. Patient Voice Input"]
        Mic["Microphone Audio Stream\n(16kHz Mono PCM)"] --> VAD["WebRTC Voice Activity Detection\n(Filters Mountain Wind Noise)"]
    end

    subgraph SpeechRec ["2. Speech-to-Text"]
        VAD --> SarvamSTT["Sarvam AI Saaras:v3\n(Garhwali, Kumaoni & Hindi Speech Recognition)"]
        SarvamSTT --> TranscribedText["Transcribed Text String"]
    end

    subgraph AgentReasoning ["3. LangGraph Clinical Reasoning"]
        TranscribedText --> LangGraphEngine["Doctor Consultation Node\n(Synthesizes Empathetic Hindi Response)"]
        LangGraphEngine --> ResponseText["Generated Response Text\n(Formatted for Speech Delivery)"]
    end

    subgraph SpeechSynthesis ["4. Text-to-Speech Streaming"]
        ResponseText --> SarvamTTS["Sarvam AI Bulbul:v3\n(Expressive Neural Indic TTS)"]
        ResponseText -.->|Fallback if Cloud Offline| EdgeTTS["Neural Edge-TTS / AI4Bharat"]
        SarvamTTS --> AudioBuffer["Audio Stream Chunks (MP3/WAV)"]
        EdgeTTS --> AudioBuffer
    end

    subgraph Playback ["5. Audio Output"]
        AudioBuffer --> AudioContext["Web Audio API Buffer Source"]
        AudioContext --> Speaker["Device Speaker Playback\n(Crystal Clear Audio)"]
    end
```

---

## 9. Edge Non-Invasive Optical Diagnostic Suite

Sanjeevani performs non-invasive optical screening entirely on standard CPU hardware using mathematical color-space transformations.

```mermaid
flowchart TD
    PatientPhoto["Patient Photo Capture\n(Mobile Camera / Webcam)"] --> Preprocessor["Bilateral Specular Filter\n& Exposure Equalization"]

    Preprocessor --> ModalitySwitch{"Select Screening Mode"}

    %% Anemia Path
    subgraph AnemiaSuite ["Anemia (Palpebral Conjunctiva)"]
        ModalitySwitch -->|Mode: /screen/anemia| ConjunctivaROI["Isolate Lower Eyelid ROI\n(Palpebral Microcapillaries)"]
        ConjunctivaROI --> CIELAB_EI["CIELAB Color Space Transformation\nExtract Lightness (L*) & Redness (a*)"]
        CIELAB_EI --> ErythemaIndex["Compute Erythema Index:\nEI = a* / L*"]
        ErythemaIndex --> CalcHb["Calibrate Estimated Hemoglobin:\nHb_est = 13.5 * EI (g/dL)"]
        CalcHb --> TriageHb{"Triage Hb Level"}
        TriageHb -->|>= 12.0| HbNorm["Normal / Non-Anemic"]
        TriageHb -->|10.0 - 11.9| HbMild["Mild Pallor"]
        TriageHb -->|7.0 - 9.9| HbMod["Moderate Pallor (ASHA Referral)"]
        TriageHb -->|< 7.0| HbSev["Severe Pallor (Urgent Transfusion Warning)"]
    end

    %% Jaundice Path
    subgraph JaundiceSuite ["Jaundice (Scleral Icterus)"]
        ModalitySwitch -->|Mode: /screen/jaundice| ScleraROI["HSV Color Space Segmentation\n(Filter Iris/Pupil, Keep High-V White Sclera)"]
        ScleraROI --> CIELAB_B["Extract Yellow-Blue Chromatic Shift\nMeasure mean(b*) across Sclera Mask"]
        CIELAB_B --> CalcBili["Estimate Serum Bilirubin:\nBili_est = f(mean(b*)) mg/dL"]
        CalcBili --> TriageBili{"Triage Bilirubin"}
        TriageBili -->|< 1.2| BiliNorm["Normal Range"]
        TriageBili -->|1.2 - 2.5| BiliBorder["Borderline Sub-Clinical Icterus"]
        TriageBili -->|2.5 - 5.0| BiliMod["Moderate Icterus (Liver/Gallbladder Evaluation)"]
        TriageBili -->|>= 5.0| BiliSev["Severe Hyperbilirubinemia (Urgent PHC Care)"]
    end

    %% Oral Cavity Path
    subgraph OralSuite ["Oral Cavity Mucosa"]
        ModalitySwitch -->|Mode: /screen/oral| OralROI["Buccal Mucosa & Tongue Segmentation"]
        OralROI --> PlaqueDetect["Detect Hyperkeratotic White Plaques (L* > 180)\n& Erythroplakic Velvety Red Patches (High a*)"]
        PlaqueDetect --> OralAlert["Pre-Cancerous / OSMF Alert & Biopsy Recommendation"]
    end

    %% Skin Lesion Path
    subgraph SkinSuite ["Dermatological Lesions"]
        ModalitySwitch -->|Mode: /screen/skin| SkinROI["Canny Edge & Contour Extraction"]
        SkinROI --> ContourAnalyze["Annular Ring & Circularity Analysis\n(Distinguish Tinea Ringworm vs Eczema Plaque)"]
        ContourAnalyze --> SkinAlert["Topical Antifungal / Emollient Protocol"]
    end

    HbNorm --> RenderVisual["Generate Visual ROI Contour Overlay (Base64 JPEG)"]
    HbMild --> RenderVisual
    HbMod --> RenderVisual
    HbSev --> RenderVisual
    BiliNorm --> RenderVisual
    BiliBorder --> RenderVisual
    BiliMod --> RenderVisual
    BiliSev --> RenderVisual
    OralAlert --> RenderVisual
    SkinAlert --> RenderVisual

    RenderVisual --> UI_Card["Interactive Visual Diagnostic Card\n(Clinical Score, Uncertainty Metric & Medical Next Steps)"]
```

---

## 10. Multi-Stakeholder Healthcare Collaboration Ecosystem

Sanjeevani connects the entire rural healthcare delivery chain—from isolated citizens to frontline ASHAs, primary health centers, and district health authorities.

```mermaid
graph TD
    subgraph CitizenTier ["1. Citizen & Elder Tier (Doorstep Care)"]
        Villager["🧑‍🌾 Mountain Villagers & Elders"]
        CitizenApp["Sanjeevani Citizen Portal\n- Voice Consultation in Dialect\n- Validated Home Remedies\n- Elder Mitra Companionship\n- Emergency 108 Speed-Dial"]
        Villager <==> CitizenApp
    end

    subgraph ASHATier ["2. Community Frontline Tier (Field Workers)"]
        ASHA["👩‍⚕️ ASHA Health Activist"]
        ASHAPortal["ASHA Field Companion Portal\n- Household Health Survey\n- Optical Anemia & Jaundice Screen\n- High-Risk Patient Tracking\n- Automated 48-Hour Visit Queue"]
        ASHA <==> ASHAPortal
    end

    subgraph MedicalTier ["3. Clinical Supervision Tier (PHC / CHC)"]
        Doctor["👨‍⚕️ Medical Officer (PHC/CHC)"]
        DocPortal["Doctor Tele-Triage Dashboard\n- Triaged Patient Caseload (Red/Yellow/Green)\n- Full Transcript & Audio Review\n- Prescription Counter-Signature\n- Emergency Referral Coordination"]
        Doctor <==> DocPortal
    end

    subgraph AdminTier ["4. Governance & Telemetry Tier (District CMO)"]
        CMO["🏛️ Chief Medical Officer (CMO)"]
        AdminDashboard["District Surveillance Hub\n- Regional Outbreak Heatmaps\n- ASHA Performance Analytics\n- Medicine Stock Depletion Alerts\n- LangSmith Token & Latency Metrics"]
        CMO <==> AdminDashboard
    end

    CitizenApp -.->|Escalates Ambiguous Cases| ASHAPortal
    ASHAPortal ==>|Refers Severe Symptoms & Screenings| DocPortal
    CitizenApp ==>|Direct Red Emergency Alert| DocPortal
    DocPortal ==>|Reports Disease Incidence Data| AdminDashboard
    ASHAPortal -.->|Syncs Field Survey Records| AdminDashboard
```

---

## Summary of Architectural Benefits

| Dimension | Legacy Medical Chatbots | Sanjeevani 2.0 Architectural Guarantee |
|---|---|---|
| **Safety in Emergencies** | Unpredictable LLM generation; risk of hallucinatory reassurance | **Deterministic MTS rules engine** overrides AI; instant 108 speed-dial injection |
| **Clinical Consultation Quality** | 1-shot answer based on keyword triggers | **5-turn adaptive Socratic intake** mimics human physician differential diagnosis |
| **Prescription Safety** | Unverified internet remedies; risks toxic folk ingestion | **CCRAS gold-standard RAG** + **Safety Knowledge Graph** + **Banned substance exclusion** |
| **Offline Mountain Reliability** | Crashes or hangs without internet connection | **PWA + IndexedDB + SQLite dual-checkpointer** with bi-directional auto-sync |
| **Elder Accessibility** | Dense English text forms; difficult navigation | **Sarvam Saaras/Bulbul voice loop** in Garhwali/Hindi (<1.5s latency) |
| **Objective Diagnostic Screening** | None; pure subjective patient text | **Edge OpenCV optical suite** for Anemia, Jaundice, Oral, and Skin screening on CPU |
| **Enterprise Governance** | Black-box opacity; no traceability | **LangSmith distributed tracing** with audit-logged clinical decision paths |
