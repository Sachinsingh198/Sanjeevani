# 08. Community Wellness & Elder Companion

## 1. Addressing the Silent Epidemic: Rural Elderly Isolation

Across Uttarakhand, young adults frequently migrate to urban centers (*Prayan*) in search of employment and higher education, leaving behind aging parents in remote villages (*Bhootia Gaon* / ghost villages). 

Loneliness, anxiety, and lack of social touchpoints aggravate physical illnesses like hypertension, depression, and cognitive decline.

Sanjeevani addresses this with **holistic wellness and companion modules** designed to bring comfort, mental peace, and routine physical health practices to rural households.

---

## 2. Sanjeevani Saathi (संजीवनी साथी — Village Companion)

Implemented in [`backend/app/api/companion.py`](file:///d:/Sanjeevani/backend/app/api/companion.py).

### Persona & Conversational Design:
Unlike sterile, clinical chatbots, Sanjeevani Saathi speaks with the warmth of an affectionate family member (*"Bete/Beti ya snehil dost jaisa"*):
- Uses respectful Pahadi honorifics: *"Dada-ji"*, *"Dadi-ji"*, *"Chachi-ji"*, *"Aap"*.
- Inquires about daily rural life: *"Chai pee li aapne?"*, *"Aaj mausam kaisa hai aapke gaon me?"*.
- Validates feelings of isolation with empathy rather than dismissive positivity.

### Crisis Safety & Tele-MANAS (14416):
If a user expresses feelings of hopelessness, despair, or self-harm keywords (*"marne"*, *"suicide"*, *"jeena nahi"*):
1. Emergency detection triggers immediately (`emergency_triggered: true`).
2. An empathetic, stabilizing response is presented.
3. Provides immediate toll-free connection to **Tele-MANAS (14416)** (Government of India's 24/7 mental health helpline) and the **104 State Helpline**.

---

## 3. Himalayan Folk Tales & Daily Affirmations

Elderly villagers can listen to narrated cultural stories (*Pahadi Kisse*) that impart comfort and spiritual calm:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   HIMALAYAN FOLK TALES IN SANJEEVANI                   │
├────────────────────────────────────────────────────────────────────────┤
│  1. Pahaad Ki Chidiya Aur Dada Ki Dosti                                │
│     Story of an elder in Gopeshwar and a little sparrow that visited   │
│     his courtyard every morning, reminding him nature is always near.  │
├────────────────────────────────────────────────────────────────────────┤
│  2. Mandakini Ke Kinare Ki Shanti                                      │
│     Meditative story reflecting on the flowing waters of the Mandakini │
│     river in Kedar valley, teaching how to let go of burdens.          │
├────────────────────────────────────────────────────────────────────────┤
│  3. Gaon Ka Purana Baragad Aur Uske Kisse                              │
│     Reflections on the old village Banyan tree that sheltered          │
│     generations of travelers with silent, steadfast love.              │
└────────────────────────────────────────────────────────────────────────┘
```

The `/companion/daily-thought` endpoint delivers daily blessings and wellness affirmations inspired by Himalayan wisdom (*Uttarakhandi Lok Vani*).

---

## 4. Unified Wellness Studio (आरोग्यशाला — Arogyashala)

Located at frontend route [`/mitra/wellness`](file:///d:/Sanjeevani/frontend/src/pages/WellnessStudio.jsx) (with backward-compatible deep links at `/mitra/yoga` and `/mitra/meditation`).

The **Wellness Studio** consolidates physical posturology, pranayama breath pacing, sound meditation, and daily vitality tracking into a harmonious, single-page Himalayan sanctuary:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   SANJEEVANI UNIFIED WELLNESS STUDIO                   │
├────────────────────────────────────────────────────────────────────────┤
│  1. Himalayan Flows (साधना प्रवाह)                                     │
│     Curated 10–15 min sequences combining Pranayama, Asana & Sound     │
│     - Morning Vitality Flow (ऊर्जा व प्राण)                             │
│     - Joint & Back Pain Relief (जोड़ों व कमर का सुख)                   │
│     - Evening Calm & Deep Nidra (संध्या शांति व निद्रा)                │
├────────────────────────────────────────────────────────────────────────┤
│  2. Yogashala (योगशाला — AI Posture Coach)                             │
│     Real-time webcam pose estimation & skeleton tracking               │
│     - Mathematical joint angle computation (elbows, knees, spine)      │
│     - Real-time corrective guidance (e.g. "Kohni seedhi karein")       │
│     - Precision hold timer & posture accuracy scoring ring             │
├────────────────────────────────────────────────────────────────────────┤
│  3. Dhyan Guru (ध्यान गुरु — Pranayama & Meditation)                   │
│     Dynamic pulsing breathing orb with 5 Vedic pranayama presets       │
│     - Anulom Vilom (Nadi Shodhana) 4-4-4-2 rhythm                      │
│     - Box Breathing (Samavritti) 4-4-4-4 rhythm                        │
│     - Bhramari (Bee Humming) 4-2-7-1 nitric oxide rhythm               │
│     - 4-7-8 Deep Sleep Pacing & Sahaj Dhyan                            │
│     - 3 Guided Himalayan Audio Meditations with synchronized speech    │
├────────────────────────────────────────────────────────────────────────┤
│  4. Naad Shanti (नाद शांति — Synthesized Himalayan Soundscapes)       │
│     Web Audio API procedural sound engine with zero internet lag       │
│     - Tibetan Singing Bowl resonance with decaying harmonics           │
│     - 136.1 Hz Cosmic Om Drone (C# Earth Frequency)                    │
│     - Alaknanda Alpine River Pink-Noise Water Stream                   │
├────────────────────────────────────────────────────────────────────────┤
│  5. Daily Vitality Ring & Local Streak Engine                          │
│     Persisted progress tracking without invasive external telemetry    │
│     - Mindful Minutes • Asanas Completed • Daily Sadhana Streak        │
└────────────────────────────────────────────────────────────────────────┘
```

### Technical Implementation:
- **Pose Detection**: Client-side geometry engine using HTML5 canvas and joint landmark vectors (`lib/poseDetection.js`).
- **Audio Synthesizer**: Web Audio API oscillator nodes and noise buffers with high-precision gain ramps (`lib/audioSynthesizer.js`), ensuring complete offline reliability in remote hills.
- **Unified State**: Stored in `localStorage` under `sanjeevani_wellness_stats`.
