# Changelog — Sanjeevani 2.0

All notable changes to the Sanjeevani AI Rural Himalayan Health Platform are documented in this file.

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
- **Production Configuration Documentation:**
  - Updated `backend/.env.example` and `frontend/.env.example` with complete descriptions, production requirements, and security guidelines.
