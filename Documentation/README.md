# 📚 Sanjeevani Documentation Index

Welcome to the comprehensive technical and operational documentation for **Project Sanjeevani (संजीवनी) 2.0**. This directory provides an exhaustive, sequential breakdown of the system architecture, clinical workflows, AI models, voice and vision engines, and setup guidelines.

---

## 📑 Documentation Sequence

| Sequence | Document | Description |
|---|---|---|
| **01** | [01. Project Overview & Vision](./01_PROJECT_OVERVIEW_AND_VISION.md) | Regional healthcare context in Uttarakhand, core mission, architectural pillars, and socio-technical impact. |
| **02** | [02. Architecture & System Workflow](./02_ARCHITECTURE_AND_WORKFLOW.md) | High-level system architecture, client-server topology, dataflow diagrams, and end-to-end request lifecycles. |
| **03** | [03. Clinical Triage & Safety Engine](./03_CLINICAL_TRIAGE_AND_SAFETY_ENGINE.md) | Manchester Triage System (MTS) adaptation, bi-directional negation algorithm, 3 severity tiers, and emergency protocols. |
| **04** | [04. LangGraph Agent & Dialogue Flow](./04_LANGGRAPH_AGENT_AND_DIALOGUE_FLOW.md) | LangGraph state machine, `AgentState` schema, 4 execution nodes, SQLite checkpoints, and LLM failover. |
| **05** | [05. Multilingual Voice & Speech Subsystem](./05_MULTILINGUAL_VOICE_AND_SPEECH.md) | Sarvam AI Saaras v3 STT, Bulbul v3 streaming TTS, Edge-TTS fallback, AI4Bharat offline engine, and conversational voice constraints. |
| **06** | [06. AYUSH Hybrid RAG & Knowledge Store](./06_AYUSH_HYBRID_RAG_AND_KNOWLEDGE_STORE.md) | CCRAS validated remedies, classical Ayurveda treatise parser, Garhwali dialect glossary, FastEmbed, and Qdrant vector search. |
| **07** | [07. Edge Computer Vision Diagnostics](./07_EDGE_COMPUTER_VISION_DIAGNOSTICS.md) | Non-invasive edge CV algorithms: CIELAB Erythema Index (Anemia), Scleral Icterus (Jaundice), Oral Leukoplakia, and Skin lesions. |
| **08** | [08. Community Wellness & Elder Companion](./08_COMMUNITY_WELLNESS_AND_ELDER_COMPANION.md) | Sanjeevani Saathi (elder loneliness companion), Himalayan folk stories, Yogashala posture guide, and Dhyan Guru Pranayama timer. |
| **09** | [09. User Roles & Portals](./09_USER_ROLES_AND_PORTALS.md) | Three user portals: Citizen/Patient Hub (`/mitra`), ASHA Worker Dashboard (`/asha`), and District Admin Portal (`/admin`). |
| **10** | [10. LangSmith Observability & Tracing](./10_LANGSMITH_OBSERVABILITY_AND_TRACING.md) | Production telemetry, LangSmith project setup, trace tree structure, span inspection, latency monitoring, and token tracking. |
| **11** | [11. API Reference & Endpoints](./11_API_REFERENCE_AND_ENDPOINTS.md) | Comprehensive REST API catalog covering Auth, Chat, Voice, Vision, Companion, Reports, and Admin endpoints. |
| **12** | [12. Developer Setup & Deployment Guide](./12_DEVELOPER_SETUP_AND_DEPLOYMENT_GUIDE.md) | Step-by-step local environment setup, `.env` guide, demo accounts, Pytest commands, and production deployment guidelines. |

---

## 🎯 How to Read This Documentation

1. **For System Architects & Tech Leads**: Start with [01. Project Overview](./01_PROJECT_OVERVIEW_AND_VISION.md), [02. Architecture](./02_ARCHITECTURE_AND_WORKFLOW.md), and [04. LangGraph Agent](./04_LANGGRAPH_AGENT_AND_DIALOGUE_FLOW.md).
2. **For Clinical & Medical Reviewers**: Review [03. Clinical Triage & Safety](./03_CLINICAL_TRIAGE_AND_SAFETY_ENGINE.md) and [06. AYUSH Hybrid RAG](./06_AYUSH_HYBRID_RAG_AND_KNOWLEDGE_STORE.md).
3. **For AI / ML Engineers**: Dive into [04. LangGraph Agent](./04_LANGGRAPH_AGENT_AND_DIALOGUE_FLOW.md), [05. Voice Subsystem](./05_MULTILINGUAL_VOICE_AND_SPEECH.md), [07. Computer Vision](./07_EDGE_COMPUTER_VISION_DIAGNOSTICS.md), and [10. LangSmith Tracing](./10_LANGSMITH_OBSERVABILITY_AND_TRACING.md).
4. **For Frontend & UX Developers**: Focus on [08. Community Wellness](./08_COMMUNITY_WELLNESS_AND_ELDER_COMPANION.md), [09. User Roles](./09_USER_ROLES_AND_PORTALS.md), and [11. API Reference](./11_API_REFERENCE_AND_ENDPOINTS.md).
5. **For DevOps & Contributors**: Go directly to [12. Developer Setup](./12_DEVELOPER_SETUP_AND_DEPLOYMENT_GUIDE.md).
