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

### 3. Full-Duplex WebRTC Live Voice Streaming & Turn-Taking
- **Status:** Conversational Turn-Taking & Cancellation Engine Production-Ready in `LiveVoiceRoom.jsx` (October 2026); Full-Duplex WebRTC Binary Gateway Deferred.
- **Details:** Resolved critical conversational turn-taking boundaries: eliminated assistant overlapping speech during user barge-in, suppressed trailing self-abort loops, prevented speaker-to-mic acoustic feedback loops (`echoCancellation: true`), and eradicated audio leakage on call end (`stopAllVoiceAudio()`, monotonic request IDs, `AbortController` cancellation).
- **Next Step:** Finalize direct binary WebRTC media gateway for extreme low-bandwidth 2G/3G mountain corridors.

### 4. Computer Vision Diagnostic Screening & Edge OCR Pipeline
- **Status:** Edge Medicine OCR Integrated (`RapidOCR`); Clinical Dataset Retraining Deferred.
- **Details:** Completed edge document and medicine blister pack recognition via `rapidocr-onnxruntime` in `vision_service.py` to extract brand names, active salts, strengths, batch, and expiry dates locally without cloud dependency. The non-invasive color-space optical screening algorithms (CIELAB Erythema Index for anemia, scleral icterus for jaundice, oral cavity screening) run deterministically on edge CPU.
- **Next Step:** Retrain CV classifiers and fine-tune erythema calibration curves with larger multicentric clinical validation datasets from regional Uttarakhand district hospitals.

### 5. UI/UX, Rural Accessibility & Mobile Client Status
- **Status:** Production-Grade UI/UX Released (October 2026).
- **Resolved Gaps:**
  - **Responsive 320px–375px Base:** Enforced `viewport-fit=cover`, CSS safe-area insets (`env(safe-area-inset-bottom)`), and visual viewport keyboard handling across all 12 frontend pages.
  - **WCAG 2.1 AA Contrast Compliance:** Darkened primary Sage Green token (`#4A6845`) to reach 4.8:1 contrast; added an outdoor sunlight high-contrast mode for high-altitude mountain pathways.
  - **Clinical Interpretability & Trust:** Delivered the PHC Doctor Referral Pass (zero-dependency digital QR modal), transparent audio privacy consent dialog, and user feedback actions.
  - **Rural Family Use:** Integrated multi-generational household profile switching (Self, Dadi Ji, Child) and audio remedy dosage reminder chimes.
  - **First-Time User Onboarding:** Added a 3-step voice-guided interactive tutorial introducing Voice Consultations, Triage Severity, and AYUSH Remedies.
- **Future Client Enhancements:**
  - **Native Wrapper:** Package the PWA via Capacitor / React Native wrapper for Google Play Store and Apple App Store distribution with native audio push notifications.
  - **Offline Indic Voice Model Preloading:** Pre-cache lightweight quantized ONNX models for offline text-to-speech without relying on cloud neural endpoints.

