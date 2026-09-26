# 🖼️ Sanjeevani Presentation Slide Assets & Diagram Guide

This directory contains 5 high-resolution (16:9 widescreen) diagram assets generated specifically for the **Project Sanjeevani PowerPoint / Keynote / Google Slides** pitch deck.

---

## 📊 Summary of Presentation Slide Assets

| Slide Image | Recommended Slide Title | Key Subsystems Represented |
|---|---|---|
| [`sanjeevani_architecture_infographic_1790389413758.jpg`](./sanjeevani_architecture_infographic_1790389413758.jpg) | **System Architecture & Dataflow** | Voice/Text Input ➔ Manchester Triage ➔ LangGraph Agent ➔ AYUSH Hybrid RAG (Qdrant & FastEmbed) ➔ 108 Emergency Card / CCRAS Remedy Card |
| [`sanjeevani_triage_flowchart_1790389431632.jpg`](./sanjeevani_triage_flowchart_1790389431632.jpg) | **Clinical Triage & Patient Safety Net** | Bi-directional Negation Checking ➔ Red Tier (Immediate 108 Dispatch), Yellow Tier (Urgent ASHA 24h visit), Green Tier (Routine AYUSH care) |
| [`sanjeevani_doctor_intake_flow_1790389453469.jpg`](./sanjeevani_doctor_intake_flow_1790389453469.jpg) | **Multi-Turn Clinical Intake & AYUSH Safety** | 5-Step Socratic Intake ➔ Differential Diagnosis ➔ `##CONCLUDE##` ➔ Multi-Layer Safety Gate (Comorbidities & Banned Substance Filter) ➔ CCRAS Prescription |
| [`sanjeevani_edge_vision_suite_1790389474146.jpg`](./sanjeevani_edge_vision_suite_1790389474146.jpg) | **Edge Computer Vision Diagnostics** | 100% On-Device CPU Inference: Anemia (Erythema Index), Jaundice (Scleral Icterus), Oral Leukoplakia / OSMF, Skin Lesion Ringworm / Eczema |
| [`sanjeevani_offline_sync_resilience_1790389495351.jpg`](./sanjeevani_offline_sync_resilience_1790389495351.jpg) | **Offline-First Himalayan Resilience** | Network Blackout in Remote Mountain Village ➔ Client-Side IndexedDB PWA ➔ Network Reconnect ➔ Batch Encrypted Sync to SQLite & ASHA Follow-up |

---

## 🎤 Slide-by-Slide Pitch Script & Speaking Points

### Slide 1: System Architecture & Dataflow
- **File**: `sanjeevani_architecture_infographic_1790389413758.jpg`
- **Key Talking Point**: *"Sanjeevani does not rely on a generic wrapper around an LLM. We have architected a multi-tier safety pipeline where voice input from rural elders is pre-screened through a deterministic Manchester Triage rules engine before passing to a stateful LangGraph agent and our AYUSH vector RAG backed by Qdrant."*

### Slide 2: Clinical Triage & Safety Engine
- **File**: `sanjeevani_triage_flowchart_1790389431632.jpg`
- **Key Talking Point**: *"Safety is our highest priority. Our bi-directional negation algorithm prevents false alarms when a patient says 'I have a cough but no chest pain'. In true emergencies, the AI short-circuits instantly to inject the 108 speed-dial and immediate first-aid instructions."*

### Slide 3: Multi-Turn Doctor Consultation & AYUSH Pipeline
- **File**: `sanjeevani_doctor_intake_flow_1790389453469.jpg`
- **Key Talking Point**: *"Unlike basic chatbots that give instant dangerous advice on single keywords, Dr. Sanjeevani conducts an adaptive clinical interview like a human doctor. Once differential diagnosis is complete, our 5-layer safety gate verifies comorbidities and filters out harmful folk substances before delivering official CCRAS formulations."*

### Slide 4: Edge Computer Vision Diagnostics
- **File**: `sanjeevani_edge_vision_suite_1790389474146.jpg`
- **Key Talking Point**: *"In remote Himalayan villages with no pathology labs, Sanjeevani turns standard smartphones into diagnostic tools using pure CPU OpenCV. We screen for Anemia via palpebral conjunctiva, Jaundice via sclera, and Oral pre-cancerous lesions from smokeless tobacco—100% locally with zero cloud privacy exposure."*

### Slide 5: Offline-First Resilience & Bi-Directional Sync
- **File**: `sanjeevani_offline_sync_resilience_1790389495351.jpg`
- **Key Talking Point**: *"Mountain terrain often loses internet for days. Sanjeevani is built as an offline-first PWA with client-side IndexedDB caching. When connectivity is restored, all offline triage assessments and elder chats automatically sync in encrypted batches to the district health database."*
