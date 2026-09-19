# 11. API Reference & Endpoints

Base URL: `http://localhost:8000`  
Documentation UI: `http://localhost:8000/docs` (Swagger) and `http://localhost:8000/redoc` (ReDoc)

---

## 1. System Health

### `GET /health`
Returns application status, active LLM provider, and vector storage configuration.
- **Response `200 OK`**:
  ```json
  {
    "status": "healthy",
    "app_env": "development",
    "default_language": "hi",
    "primary_llm_provider": "groq",
    "collection_name": "sanjeevani_remedies"
  }
  ```

---

## 2. Authentication & OTP Routes (`/auth`)

### `POST /auth/register`
Creates a new citizen, ASHA worker, or administrator account.
- **Request Body**:
  ```json
  {
    "name": "Kamla Devi",
    "phone": "9876543210",
    "password": "strongpassword123",
    "role": "patient",
    "village": "Gopeshwar Ward 4",
    "username": "kamla_gopeshwar",
    "email": "kamla@example.com"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "message": "User registered successfully",
    "user_id": 4,
    "role": "patient"
  }
  ```

### `POST /auth/login`
Authenticates via phone, username, or email.
- **Request Body**:
  ```json
  {
    "identifier": "kamla_gopeshwar",
    "password": "strongpassword123"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
    "token_type": "bearer",
    "role": "patient",
    "name": "Kamla Devi",
    "village": "Gopeshwar Ward 4"
  }
  ```

### `POST /auth/otp/send`
Dispatches an OTP to email or mobile phone.
- **Request Body**:
  ```json
  {
    "target": "user@example.com",
    "target_type": "email",
    "purpose": "login"
  }
  ```

### `POST /auth/otp/verify`
Validates the OTP and returns a session token.

---

## 3. Clinical Consultation & Chat Routes (`/chat`)

### `POST /chat/message`
Submits a user message to the LangGraph clinical triage engine.
- **Request Body**:
  ```json
  {
    "conversation_id": "8fa19bc2-3c48-4091-8178-5776d63bb1c3",
    "message": "Doctor saab, 2 din se sar me dard hai aur gala kharab hai",
    "language_hint": "hi",
    "include_audio": false,
    "user_conditions": ["hypertension"]
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "conversation_id": "8fa19bc2-3c48-4091-8178-5776d63bb1c3",
    "reply": "नमस्ते! आपके गले में दर्द और सिरदर्द कब से बढ़ रहा है? क्या आपको बुखार या खांसी भी महसूस हो रही है?",
    "spoken_reply": "नमस्ते! आपके गले में दर्द और सिरदर्द कब से बढ़ रहा है? क्या आपको बुखार या खांसी भी महसूस हो रही है?",
    "detected_tier": "Green",
    "clinical_flags": ["GREEN_FLAG: Routine/Community level symptoms"],
    "retrieved_remedies": [],
    "escalation_triggered": false,
    "audio_base64": null
  }
  ```

### `GET /chat/history/{conversation_id}`
Returns all stored conversational turns for a specific session.

---

## 4. Multilingual Voice Routes (`/voice`)

### `POST /voice/stt`
Transcribes spoken audio into text using **Sarvam AI (Saaras:v3)**.
- **Request**: `multipart/form-data` with `file: UploadFile` (WAV, WEBM, MP3).
- **Response `200 OK`**:
  ```json
  {
    "transcript": "नमस्ते डॉक्टर साहब, मुझे दो दिन से खांसी है",
    "language_code": "hi-IN",
    "confidence": 0.94,
    "provider": "sarvam"
  }
  ```

### `POST /voice/tts`
Synthesizes speech from text and returns a base64 audio payload.
- **Request Body**:
  ```json
  {
    "text": "नमस्ते! कृपया आराम करें और पर्याप्त पानी पिएं।",
    "language": "hi",
    "gender": "female"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "audio_base64": "//uQxAAAAAAAAAAA...",
    "format": "mp3",
    "language": "hi",
    "provider": "sarvam"
  }
  ```

### `GET /voice/tts/stream` & `POST /voice/tts/stream`
Progressively streams audio chunks with `Content-Type: audio/mpeg` for sub-second client playback.

---

## 5. Edge Vision Screening Routes (`/screen`)

All vision endpoints accept `multipart/form-data` with `file: UploadFile` (JPG, PNG, WEBP).

| Endpoint | Target Condition | Key Output Metrics |
|---|---|---|
| `POST /screen/anemia` | Conjunctival Pallor | Estimated Hemoglobin ($Hb\text{ g/dL}$), Status (*Normal, Mild, Moderate, Severe*) |
| `POST /screen/jaundice` | Scleral Icterus | Estimated Bilirubin ($\text{mg/dL}$), Icterus Level |
| `POST /screen/oral` | Oral Mucosa | Leukoplakia/Erythroplakia pre-cancerous risk overlay |
| `POST /screen/skin` | Cutaneous Lesions | Tinea (ringworm) margin & Eczema erythema index |

- **Sample Response `200 OK`**:
  ```json
  {
    "condition": "anemia",
    "metric_name": "Hemoglobin (Hb)",
    "estimated_value": 9.4,
    "unit": "g/dL",
    "status": "Moderate Pallor",
    "confidence": 0.88,
    "clinical_insight": "Conjunctival pallor suggests moderate microcytic anemia.",
    "overlay_base64": "data:image/jpeg;base64,...",
    "requires_doctor_visit": true
  }
  ```

---

## 6. Village Companion Routes (`/companion`)

### `POST /companion/chat`
Converses with Sanjeevani Saathi, providing emotional validation for rural elders.
- **Request Body**:
  ```json
  {
    "message": "Ghar par sab shaant hai, akelepan lagta hai",
    "user_name": "Shivram Dada",
    "language": "hindi",
    "mood": "lonely"
  }
  ```

### `GET /companion/stories`
Returns curated comforting Himalayan folk tales (*Pahadi Kisse*).

### `GET /companion/daily-thought`
Returns an uplifting daily blessing and wellness affirmation.

---

## 7. Administrative Routes (`/admin`)

### `GET /admin/metrics`
Returns system performance diagnostics, triage breakdown, active sessions, and hardware metrics.
- **Requires Header**: `Authorization: Bearer <admin_jwt>`
