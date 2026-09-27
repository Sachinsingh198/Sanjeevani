# Known Gaps & Future Roadmap — Sanjeevani 2.0

This document records architectural decisions, deferred items, and known operational boundaries intentionally maintained in the Sanjeevani 2.0 production readiness release.

---

### 1. Relational Database Scaling & Postgres Production Benchmarking
- **Status:** Scaffolded & Supported; Production Load Testing Deferred.
- **Details:** The codebase fully supports both SQLite (default for edge/local dev) and PostgreSQL (via `psycopg` and `DATABASE_URL` / `CHECKPOINT_DB_PATH`). Schema tables (`consultations`, `users`, `refresh_tokens`, `emergency_alerts`, `access_audit_logs`) use SQLAlchemy `BigInteger`, `JSON`, and ISO strings compatible with Postgres. 
- **Next Step:** Perform high-concurrency load testing against an AWS RDS / Supabase managed PostgreSQL cluster before broad multi-district state rollout.

### 2. Distributed Rate Limiting & Session Storage (Redis)
- **Status:** In-Memory Active; Distributed Cache Deferred.
- **Details:** `slowapi` rate limiting and audio LRU caches are currently memory-backed. In single-instance and pilot clinic deployments, this provides sub-millisecond overhead.
- **Next Step:** When deploying multiple load-balanced backend containers behind NGINX or Kubernetes, configure `slowapi` with a Redis backend (`storage_uri="redis://..."`) so IP rate limits are shared across replicas.

### 3. Full-Duplex WebRTC Live Voice Streaming
- **Status:** Prototype in `LiveVoiceRoom.jsx`; Core triage uses SSE + Indic TTS.
- **Details:** The primary triage voice experience uses server-synthesized Indic TTS audio buffers and Sarvam Saaras STT with fallback to edge-tts. The interactive `LiveVoiceRoom.jsx` component exists in the frontend for live demonstration but has not replaced the standard turn-based audio pipeline.
- **Next Step:** Finalize the WebRTC bidirectional media gateway for low-bandwidth 2G/3G audio streams.

### 4. Computer Vision Diagnostic Screening Pipeline
- **Status:** Explicitly Out-of-Scope in Current Pass.
- **Details:** The CV screening models (`backend/app/cv/`) for anemia conjunctival inspection and oral cavity screening remain in their initial capstone implementation, as requested.
- **Next Step:** Retrain CV classifiers with clinical validation datasets from regional Uttarakhand district hospitals.
