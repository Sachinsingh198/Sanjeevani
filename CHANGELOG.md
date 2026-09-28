# Changelog — Sanjeevani 2.0

All notable changes to the Sanjeevani AI Rural Himalayan Health Platform are documented in this file.

---

## [2.2.0] - 2026-09-28 — Universal Settings Persistence, Classical AYUSH Ingestion & Illiterate Voice Mode

### Multi-Layer Settings Persistence (Survives Restarts & Reloads)
- **Backend Disk Persistence (`backend/DATA/voice_settings.json` & `app_settings.json`):**
  - Updated `IndicTTSEngine` to automatically load persisted configuration (`provider`, `sarvam_model`, `sarvam_speaker`, `bhashini_model`, `bhashini_gender`, `tts_speed`) from disk on engine startup.
  - Automatically saves atomically to disk on every `set_primary_provider()` and `set_provider_config()` call.
  - Added new `/voice/settings` (GET & POST) endpoints backed by `app_settings.json` so general app preferences persist even across backend restarts and for unauthenticated guests.
- **Frontend `localStorage` Mirroring & Zero-Flash Initialization:**
  - `VoiceProviderSwitcher` now initializes state directly from `localStorage` (`sanjeevani_voice_provider_config`) to eliminate UI flicker or fallback resets on reload.
  - Added persistence for `sanjeevani_app_settings`, `sanjeevani_tts_speed`, `sanjeevani_dialect_assistance`, and `sanjeevani_known_conditions`.
- **Runtime Audio Playback Speed Integration:**
  - Added `getPlaybackRate()` and `applyPlaybackRate()` in `voiceClient.js` and `LiveVoiceRoom.jsx`.
  - Audio speech speed preferences (0.8x, 1.0x, 1.2x) now directly govern HTML5 `<audio>` element playback rate and Web Speech API utterances.

### Classical Ayurvedic Formulary Ingestion (`ayurveda_3.docx`)
- Extracted and structured 14 classical Ayurvedic remedies from `ayurveda_3.docx` covering Respiratory Disorders, Migraine/Headache, Acid Peptic Disorders, Joint Disorders, and Fevers.
- Enriched hybrid Qdrant vector database and SQLite metadata store (`sanjeevani_remedies`) with strict classical texts, formulations, dosha actions, and precautions.

### Inclusive Accessibility for Illiterate Patients
- Upgraded remedy narration so full instructions and dosage are spoken aloud naturally, with an optional toggle for literate patients to read at their own pace.

---

## [2.1.0] - 2026-09-28 — Multilingual Voice Failover, STT MIME Sanitization & Diagnostic Precision Upgrade

### Multilingual Voice Engine & Dynamic Provider Switching
- **Dynamic Voice Provider Switcher (`VoiceProviderSwitcher.jsx`):**
  - Added user and clinician interface for seamless switching between **Sarvam AI** (`bulbul:v3`), **Bhashini** (Govt of India AI4Bharat / Coqui), and **Edge-TTS** (Offline Cloud Backup).
  - Integrated `/voice/provider` (GET & POST) endpoints with persona voice parameter controls (gender, speed, pitch, speaker ID).
- **Dual-Engine Mutual Failover:**
  - Automatic STT failover: Sarvam AI Saaras:v3 $\leftrightarrow$ Bhashini Conformer ASR on network or service error.
  - Automatic TTS failover: Bhashini TTS $\leftrightarrow$ Sarvam AI Bulbul:v3 with Edge-TTS as final fallback.
- **Low-Latency Provider-Aware Pre-Caching:**
  - Upgraded `seed_audio_cache()` with provider-aware MD5 cache keys `(text, language, gender, provider, model, speaker)` delivering `<50ms` greeting and emergency audio responses.
- **Phonetic Speech Cleaner:**
  - Implemented medical text sanitizer stripping punctuation that causes phonetic distortion (e.g. removing trailing exclamation marks that previously caused Sarvam to pronounce mathematical factorials like *"four factorial"*).

### Browser STT MIME Sanitization & Protocol Hardening
- **MediaRecorder Opus MIME Normalization:**
  - Resolved browser audio recording errors where `audio/webm;codecs=opus` caused HTTP 400 Bad Request responses from Sarvam AI's strict MIME parser.
  - Sanitized audio content-type headers across frontend (`voiceClient.js`) and backend API routers (`voice.py`, `sarvam_stt.py`, `bhashini_client.py`) to clean canonical types (`audio/webm`, `audio/wav`).

### AYUSH Diagnostic Precision & Multi-Turn Chief Complaint Synthesis
- **Clinical Symptom Classification Registry:**
  - Added weighted symptom keyword clusters in `responder_node.py` covering ENT/Allergic Rhinitis (`naak band`, `chhink`, `aankhon mein khujli`), Musculoskeletal (`ghutne ka dard`, `sandhi shool`), Gastrointestinal (`acidity`, `amlapitta`), and Dermatological allergies.
- **Multi-Turn Chief Complaint Synthesis:**
  - Enhanced clinical context extractor: when patients reply with conversational affirmations ("haan hoti hai"), the agent aggregates the cumulative symptom history instead of reporting the affirmation as the primary complaint.
- **Strict Secondary Remedy Gating:**
  - Enforced dual relevance thresholds ($\text{Score} \ge 0.40$ and $\ge 0.70 \times \text{Top Score}$) in Qdrant vector retrieval, preventing unrelated remedies (e.g. Ashwagandha) during acute rhinitis/nasal congestion consultations.
- **Hierarchical Remedy Prescription Cards:**
  - Redesigned visual remedy rendering into Primary Remedy (`Mukhya Nuskha`) and Alternative (`Vaikalpik Nuskha`) with a single consolidated safety banner.

### CI/CD, Concurrency & Test Suite Stabilization
- **Headless Linux & Docker Support:**
  - Added system package configurations (`libegl1 libgl1 libglib2.0-0`) for MediaPipe and OpenCV headless execution on Ubuntu 24.04 and Docker containers.
- **SQLite Concurrency Deadlock Resolution:**
  - Passed parent transaction handles (`conn=conn`) to `record_emergency_alert()` within `sync_batch_encounters()`, resolving SQLite `database is locked` deadlocks during bulk ASHA synchronization.
- **Test Suite Modernization:**
  - Standardized unit test mocks with `PropertyMock` for read-only engine properties (`bhashini_client.is_configured`, `sarvam_stt_client.is_configured`).
  - Achieved 100% pass rate across all 45 automated backend tests.

---

## [2.0.0] - 2026-09-26 — Production Readiness & Pilot Upgrade

### Phase 1: Security & Authentication Hardening
- **JWT Refresh Tokens & Session Invalidation:**
  - Split auth into short-lived access tokens (30 minutes) and longer-lived refresh tokens (7 days).
  - Added `refresh_tokens_table` to persist, validate, and revoke refresh tokens on explicit logout and password change.
- **Production Secret & Key Safety:**
  - Enforced a hard boot check in FastAPI lifespan: server immediately aborts if `APP_ENV=production` and default secret is detected.
  - `ENABLE_DEV_OTP_HINT` is strictly disabled and rejected when running in production.
- **Rate Limiting & CORS:**
  - Integrated `slowapi` rate limiting on `/auth/login`, `/auth/register`, `/auth/verify-otp`, and `/chat` endpoints.
  - Added environment-driven `ALLOWED_ORIGINS` CORS configuration.

### Phase 2: Relational Persistence & Audit Logging
- **Real Database Schema & Persistence:**
  - Created `consultations_table` storing full clinical session history, summary, triage tier, patient identifiers, and timestamps.
  - Created `access_audit_logs_table` tracking role-based actions, village metadata, and encounter access.
- **Admin Dashboard Real Data:**
  - Replaced all fabricated/random metrics in `AdminDashboard.jsx` with genuine SQL aggregated queries (`GET /admin/stats`).
- **Session History & Resumption:**
  - Added `GET /chat/history` and `GET /chat/history/{conversation_id}` endpoints.
  - Created `SessionHistoryDrawer.jsx` in frontend allowing patients and health workers to review and resume past triage sessions.

### Phase 3: Clinical Intelligence & Streaming Responses
- **Adaptive Probing Clinical State Machine:**
  - Upgraded LangGraph triage pipeline from rigid 3-turn questioning to adaptive 1–5 turn probing based on clinical information sufficiency (`has_sufficient_info`).
  - Added a Turn 5 hard safety cap to guarantee timely remedy delivery or emergency referral.
  - Implemented rolling context summarization for extended conversations.
- **Token-by-Token Streaming:**
  - Added `POST /chat/message/stream` Server-Sent Events (SSE) endpoint delivering real-time streaming tokens to `Chat.jsx`.
- **Remedy Feedback:**
  - Added `POST /chat/feedback` endpoint and interactive thumbs up/down rating UI on concluded prescription cards with DB persistence.

### Phase 4: UI/UX, Real-Time Emergency Alerts & Rural Ergonomics
- **Error Boundaries:**
  - Created `ErrorBoundary.jsx` with compassionate bilingual recovery ("कुछ गड़बड़ हुई" / "Something went wrong") and reload actions, wrapping `<Routes>` in `App.jsx`.
- **Accessibility & Settings Persistence:**
  - Persisted `sanjeevani_text_scale` and `sanjeevani_ui_lang` across browser reloads via `localStorage` and background profile sync.
- **Unified Loading States:**
  - Implemented shared `<SkeletonLoader>` supporting `card`, `table-row`, `list-item`, and `chat-bubble` variants across all dashboards.
- **Real-Time Red-Tier Emergency Alerts:**
  - Created `emergency_alerts_table` and `alerts_service.py`.
  - Auto-dispatches emergency alerts whenever a consultation or synced field encounter evaluates to `Red` tier.
  - Added live pulsating SOS alert banners with one-click acknowledgment on `AdminDashboard.jsx` and `AshaDashboard.jsx`.
- **Real Offline ASHA Sync:**
  - Wired `syncAshaBatch()` to `POST /asha/encounters/sync` with server upserts and honest state flipping.
- **Genuine Empty States:**
  - Replaced default hardcoded demo records in `AshaDashboard.jsx` and `PatientDashboard.jsx` with genuine empty states and explicit "Load Sample Data" buttons.
- **Offline PWA Shell:**
  - Added `manifest.json` and Vite PWA service worker precaching.

### Phase 5: Ops & Reliability
- **Structured JSON Logging:**
  - Upgraded `logger.py` with `JsonFormatter` producing single-line JSON logs in production with contextual metadata extraction.
- **Sentry Error Tracking:**
  - Initialized `@sentry/react` in frontend and `sentry-sdk` in backend with multi-tier PII scrubbing (phone numbers, passwords, patient names).
- **Deep Readiness Probe (`GET /health`):**
  - Expanded health endpoint to inspect live database query latency, Qdrant collection status, configured LLM providers, and voice engines. Returns HTTP 503 if critical dependencies are down.
- **Exponential Backoff & Resilience:**
  - Created `resilience.py` with `retry_sync` and `retry_async` incorporating exponential delay and randomized jitter.
  - Wrapped external LLM calls (Groq, Gemini, Sarvam), Sarvam STT/TTS, and notification gateways (SMTP, Twilio, Fast2SMS) while preserving provider fallback chains.
- **Continuous Integration Pipeline:**
  - Added GitHub Actions workflow (`.github/workflows/ci.yml`) running backend pytest and frontend lint/build on PRs and merges.
- **Clinical Inquiry Depth & Recommendation Card Structure Fixes:**
  - Enhanced Dr. Sanjeevani's canonical consultation prompt to conduct clinical differential inquiry (location, nature of pain, triggers, associated ENT/gastro/ortho warning signs) across 3–4 dynamic turns rather than prematurely concluding after duration at Turn 2.
  - Removed premature `has_sufficient` trigger from `force_conclude` in `responder_node.py` so the clinical assessment gathers adequate diagnostic nuance before prescription.
  - Eliminated truncated recommendation steps (e.g. `**Chhanne aur Peene`) by making remedy preparation guidelines context-aware (distinguishing external pastes/drops from internal decoctions) and validating step integrity against CCRAS records.
  - Achieved complete visual parity in `StructuredBotMessage.jsx` between streaming and completed consultation states, preventing jarring DOM layout switches upon stream completion.
  - Upgraded preparation step parsing to detect subheadings without rendering broken numeric badges (`[ 1 ]`, `[ 4 ]`), and parsed inline bold markdown correctly.
- **Full Spoken Remedy Pronunciation for Illiterate Patients:**
  - Updated `responder_node.py` with `_build_complete_spoken_remedy()` to generate complete spoken prescriptions across Hindi, English, and Garhwali.
  - Stopped directing patients to "read on screen" (`Iska pura tarika screen par diya gaya hai`), ensuring illiterate or visually-impaired rural patients hear the full preparation steps, exact dosage, timing, and clinical precautions aloud.
  - Refined `_clean_text_for_speech()` regex to preserve conversational clinical terms ("nuskha", "dhyan rakhein") while stripping structural markdown formatting.
- **Audio Accessibility & "Read Instead" (आवाज़ रोकें) Controls:**
  - Added prominent `पढ़ना चाहते हैं? आवाज़ रोकें (Read Instead)` button in `LiveVoiceRoom.jsx` and `StructuredBotMessage.jsx` / `Chat.jsx`.
  - Enables literate patients to instantly silence spoken audio and view the entire, expanded prescription card.
  - Provided interactive listen controls (`पूरा नुस्खा आवाज़ में सुनें`) allowing patients to re-trigger complete remedy narration on demand.
- **Classical Dravyaguna Monographs Ingestion (`ayurveda_3.docx`):**
  - Built `ayurveda_3_extractor.py` to parse 232 classical single-herb botanical monographs from `DATA/Ayush/ayurveda_3.docx` into clinical records with Sanskrit names, popular Indian synonyms (e.g., Vasa, Jeera, Ajwain), Latin botanical names, Rasapanchaka properties, and therapeutic indications.
  - Linked all 232 monographs into `HybridRemedyStore` herb lookup and vector collection `sanjeevani_remedies`, expanding the verified remedy dataset from 147 to 379 items.
  - Upgraded Qdrant search with clinical synonym mapping (`CLINICAL_SYNONYM_MAP`) and hybrid scoring (`hybrid_score = vec_score + 0.04 * lexical_hits`) with resilient batch upserts.

