# 🎨 Sanjeevani 2.0 — Frontend Client Application

React 19 single-page application built with **Vite** and **Tailwind CSS v4**, engineered for **high accessibility, low-latency voice interaction, and intuitive digital health delivery** for rural Himalayan communities.

---

## 🏔️ Design Philosophy & Regional Accessibility

Traditional medical software is often too complex, English-centric, and cluttered for rural citizens. Sanjeevani's frontend was purposefully designed from the ground up for the socio-cultural realities of **Uttarakhand and Himalayan hill villages**:

1. **Audio-First Conversational Interface**:
   - Rural elders who cannot read or type can engage via **Sanjeevani Live**, an unhurried, natural voice consultation room powered by Sarvam AI.
2. **High Visual Clarity & Tactile Affordances**:
   - Large touch targets, high-contrast typography, clear status badges, and an intuitive font-scaling accessibility bar.
3. **Himalayan Nature Palette (Tailwind v4 Token System)**:
   - Modern token-based CSS variables defined in `index.css`:
     - `--sage` (`#5A7855`) — Herb Sage: primary actions, nature, healing.
     - `--gold-warm` (`#D4A359`) — Himalayan Gold: warmth, secondary accents.
     - `--mist` (`#F4F6F0` light / `#151D28` dark) — Mountain Mist: serene canvas.
     - `--warm-indigo` (`#2E4057` light / `#1A2433` dark) — Himalayan Indigo: slate authority.
     - `--rose-soft` (`#B85042`) — Emergency Berry: critical alerts, 108 SOS.
     - `--booti-glow` (`#8ED14C`) — Living Sanjeevani Booti glow reserved for the Orb.
4. **Structured Clinical Information Architecture**:
   - Long clinical paragraphs from LLMs or structured consultation summaries are automatically rendered by `StructuredBotMessage.jsx` into scannable visual chunks: **Primary Assessment / Possible Cause**, **Key Symptoms**, **Safety Guidance**, and **AYUSH Remedy Cards**.

---

## 📂 Frontend Directory Structure

```
frontend/
├── index.html                     # Entry HTML document with font imports
├── vite.config.js                 # Vite configuration with React & Tailwind plugins
├── package.json                   # Dependencies (React 19, Tailwind v4, Framer Motion)
├── public/                        # Static brand assets and icons
└── src/
    ├── App.jsx                    # Root router, role guards, and layout wrapper
    ├── main.jsx                   # DOM root mount & React StrictMode
    ├── index.css                  # Global Tailwind v4 directives and design tokens
    ├── api/                       # Modular API Clients
    │   ├── client.js              # Primary chat API with local triage fallback
    │   ├── authClient.js          # Authentication, registration, and OTP client
    │   ├── reportsClient.js       # Consultation parcha export (.docx and .pdf)
    │   ├── companionClient.js     # Saathi companion chat and folklore API
    │   ├── screeningClient.js     # Edge CV screening and FHIR JSON reports
    │   └── voiceClient.js         # Web Audio API, mic recording & streaming player
    ├── context/                   # Global State Providers
    │   ├── AuthContext.jsx        # User login state, role verification, and token storage
    │   ├── ThemeContext.jsx       # Dark / Light theme toggle with local storage persistence
    │   └── LanguageContext.jsx    # App-wide UI language ('hi' / 'en') & text-scaling context
    ├── components/                # Modular Reusable UI Components
    │   ├── Navbar.jsx             # Responsive top bar with role badges and language switch
    │   ├── LiveVoiceRoom.jsx      # Fullscreen voice consultation experience
    │   ├── SanjeevaniOrb.jsx      # Animated voice visualizer orb (listening / speaking)
    │   ├── StructuredBotMessage.jsx # Parser & renderer for structured clinical responses
    │   ├── EscalationCard.jsx     # High-visibility 108 emergency card
    │   ├── NearbyFacilityFinder.jsx # GPS PHC/CHC distance calculator & locator
    │   ├── RemedyCard.jsx         # Card displaying CCRAS Ayurvedic remedy & disclaimer
    │   ├── ProtectedRoute.jsx     # Role-based route authorization wrapper
    │   ├── FollowUpPanel.jsx      # Patient follow-up questions & symptom tracker
    │   ├── SessionHistoryDrawer.jsx # Drawer for switching previous consultation sessions
    │   ├── TierBadge.jsx          # Color-coded triage badge (Red / Yellow / Green)
    │   └── AccessibilityBar.jsx   # Font scaling (+ / -) and contrast controls
    └── pages/                     # Routed Views
        ├── Home.jsx               # Public landing page with platform highlights
        ├── About.jsx              # Mission, team, and clinical disclaimers
        ├── Login.jsx              # Multi-mode login (Phone, Email, Username, OTP)
        ├── Register.jsx           # Account creation with role selection
        ├── PatientDashboard.jsx   # Citizen/Patient wellness hub (/mitra)
        ├── Chat.jsx               # Dr. Sanjeevani AI clinical consultation
        ├── Screening.jsx          # Eye (Anemia/Jaundice) & Skin vision suite
        ├── Companion.jsx          # Sanjeevani Saathi (Elder loneliness companion)
        ├── WellnessStudio.jsx     # Yogashala posture camera & Dhyan Guru breathing
        ├── AshaDashboard.jsx      # Frontline ASHA worker triage queue
        └── AdminDashboard.jsx     # System health and epidemiological metrics
```

---

## 🚦 Navigation & Route Architecture

All authenticated routes are protected by `ProtectedRoute.jsx` verifying the JWT token and user role:

| Path | Required Role | Description |
|---|:---:|---|
| `/` | *Public* | Home landing page with platform highlights |
| `/about` | *Public* | Platform mission, ethical standards, and regional background |
| `/login` | *Public* | Authentication screen supporting password and OTP login |
| `/register` | *Public* | Registration for citizens and community health workers |
| `/mitra` | `patient` | Citizen portal: quick triage start, health history, screening links |
| `/mitra/chat` | `patient` | Multi-turn conversational consultation with Dr. Sanjeevani |
| `/mitra/screen` | `patient` | Edge computer vision screening for Anemia, Jaundice, Oral, and Skin |
| `/mitra/saathi` | `patient` | Sanjeevani Saathi village companion with Himalayan folk stories |
| `/mitra/wellness` | `patient` | Unified Wellness Studio: Yogashala AI camera & Dhyan Guru |
| `/asha` | `asha` | Community health worker dashboard with red-tier emergency list |
| `/admin` | `admin` | District health officer dashboard with system telemetry |

---

## 🧩 Key Component Walkthrough

### 1. `LiveVoiceRoom.jsx` & `SanjeevaniOrb.jsx`
- **Purpose**: Provides a zero-typing, hands-free conversational voice experience.
- **How it Works**:
  - Uses the browser's `navigator.mediaDevices.getUserMedia` to capture uncompressed audio.
  - Automatically activates when the user speaks, sending audio blobs to `/voice/stt` (Sarvam Saaras v3) with adaptive silence debounce.
  - Features a manual "मैं बोल चुका / चुकी हूँ • I'm Done" button and spoken correction flow (`[CORRECTION]`).
  - Synthesized speech is progressively streamed from `/voice/tts/stream`, causing the orb to oscillate with real-time audio amplitude.

### 2. `StructuredBotMessage.jsx`
- **Purpose**: Prevents "wall-of-text" fatigue for elderly patients.
- **Parsing Strategy**:
  - Prioritizes structured `ConsultationSummary` JSON objects passed from the backend.
  - Softens clinical diagnosis terms to "Sambhavit Karan (Possible Reason)".
  - Renders interactive `RemedyCard` components displaying ingredients, preparation, dosage, precautions, and persistent AI disclaimers.

### 3. `NearbyFacilityFinder.jsx`
- **Purpose**: Directs patients to physical care in the hills.
- **Features**:
  - Uses HTML5 Geolocation API to find nearest Primary Health Centers (PHCs), Community Health Centers (CHCs), and District Hospitals across Chamoli and Uttarakhand.
  - Computes straight-line distance, provides one-tap calling, and opens Google Maps navigation.

### 4. `EscalationCard.jsx`
- **Purpose**: Displays immediately when Red Tier is triggered.
- **Features**:
  - Displays emergency 108 ambulance speed dial with high-contrast pulsing border.
  - Lists immediate first-aid steps (e.g., *Keep patient sitting upright*, *Do not offer solid food*).
  - Disables home remedy suggestions to ensure prompt emergency transport.

---

## 🔊 Audio & Speech Integration (`voiceClient.js`)

The `voiceClient.js` service manages microphone recording, audio format conversion, and streaming playback:

```javascript
// Example: Sending recorded voice blob for Saaras v3 transcription
const result = await transcribeAudio(audioBlob);
// Result: { transcript: "Mere gale me dard ho raha hai", language: "hi-IN" }

// Example: Synthesize speech playback
speakText(cleanText, { language: 'hi', gender: 'female' });
```

---

## 🛠️ Development & Build Commands

Ensure you are inside the `frontend/` directory:

```bash
# Install dependencies
npm install

# Start development server with Hot Module Replacement (HMR)
npm run dev

# Lint codebase for syntax and hook errors
npm run lint

# Compile production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 🌐 Network & Cross-Origin Configuration

The frontend connects to the backend at `http://localhost:8000` (or `VITE_API_BASE_URL` environment variable if configured).
- During development, Vite binds to port `5173`.
- Backend CORS middleware is pre-configured to allow connections from `http://localhost:5173`, `http://127.0.0.1:5173`, and local network IP addresses (`192.168.x.x`, `10.x.x.x`) for mobile testing over Wi-Fi.
