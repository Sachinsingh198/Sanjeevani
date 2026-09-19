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

## 4. Yogashala (योगशाला — Yoga Teacher & Posture Guide)

Located at frontend route `/mitra/yoga`.

Designed for common chronic musculoskeletal and metabolic conditions prevalent in mountain terrain:
- **Joint Mobility & Knee Arthritis (*Sandhivata*)**: Low-impact seated Asanas (*Tadasana*, *Bhadrasana*).
- **Lower Back Pain (*Kati Shoola*)**: Spinal decompression and gentle stretches (*Bhujangasana*, *Marjariasana*).
- **Hypertension & Stress Management**: Restorative postures (*Shavasana*, *Vrikshasana*).

Each posture provides:
- Visual alignment guide.
- Interactive hold timer with audio bell chimes.
- Medical contraindications (e.g., *"Do not practice if acute lumbar disc herniation"*).

---

## 5. Dhyan Guru (ध्यान गुरु — Meditation & Pranayama Teacher)

Located at frontend route `/mitra/meditation`.

Provides guided breathing pacing visualizers with synchronized audio bells:
- **Anulom Vilom (Alternate Nostril Breathing)**: 4s inhale $\rightarrow$ 4s hold $\rightarrow$ 4s exhale cycle to balance sympathetic and parasympathetic nervous systems.
- **Bhramari (Bee Humming Pranayama)**: Gentle cranial vibration exercises proven to reduce anxiety, lower systolic blood pressure, and improve sleep latency.
- **Deep Alpine Breathing (*Shant Shwas*)**: Soothing mountain ambient soundscapes (stream water, temple bell, pine breeze) to calm acute anxiety.
