# 05. Multilingual Voice & Speech Subsystem

## 1. The Need for Low-Latency Voice (Sanjeevani Live)

In mountainous regions, typing on small smartphone keyboards is a significant friction point for rural citizens, especially:
- Elderly patients with vision impairments or tremor.
- Citizens speaking regional dialects who may not know standard Devanagari or English spelling.
- Emergency situations where fast hands-free communication is necessary.

Sanjeevani solves this with **Sanjeevani Live**, an integrated voice-in, voice-out conversational interface powered by **Sarvam AI**.

---

## 2. Speech Architecture & Pipeline

```mermaid
flowchart TD
    subgraph Browser ["Client Audio (Browser / PWA)"]
        UserVoice["Spoken Speech (Hindi / Garhwali / English)"]
        MediaRec["MediaRecorder (audio/webm;codecs=opus)"]
        AudioTag["HTML5 Streaming Audio Element"]
        VoiceSwitcher["VoiceProviderSwitcher.jsx UI\n(Active: Sarvam / Bhashini)"]
    end

    subgraph BackendGateway ["FastAPI Voice Services (/voice)"]
        ProviderEndpoint["/voice/provider (Config & Status)"]
        STTEndpoint["/voice/stt Endpoint\n(MIME Normalization to audio/webm)"]
        TTSEndpoint["/voice/tts & /voice/tts/stream"]
        Cleaner["_clean_for_speech Normalizer\n(Factorial '!' fix, emoji, markdown strip)"]
        AudioCache["LRU + Disk Audio Cache (<50ms)"]
    end

    subgraph CloudSpeech ["Dual-Engine Speech Intelligence"]
        subgraph SarvamEngine ["Sarvam AI Suite"]
            SarvamSTT["Sarvam Saaras:v3\n(Mode: codemix)"]
            SarvamTTS["Sarvam Bulbul:v3\n(Ultra HD Neural: Meera, Shubh, etc.)"]
        end
        subgraph BhashiniEngine ["Bhashini (National AI Portal)"]
            BhashiniASR["AI4Bharat Conformer ASR\n(16kHz Indian Languages)"]
            BhashiniTTS["AI4Bharat Coqui Neural TTS\n(Indo-Aryan & Dravidian Clusters)"]
        end
        EdgeTTS["Neural Indic Edge-TTS\n(hi-IN-Swara / hi-IN-Madhur Cloud Backup)"]
    end

    UserVoice --> MediaRec
    MediaRec -->|Sanitized Blob| STTEndpoint
    VoiceSwitcher <-->|Switch Provider / Models| ProviderEndpoint

    STTEndpoint -->|Primary Provider == Sarvam| SarvamSTT
    SarvamSTT -.->|Failover 5xx / 4xx| BhashiniASR
    STTEndpoint -->|Primary Provider == Bhashini| BhashiniASR
    BhashiniASR -.->|Failover 5xx / 4xx| SarvamSTT

    TTSEndpoint --> AudioCache
    AudioCache -->|Cache Miss| Cleaner
    Cleaner -->|Primary == Sarvam| SarvamTTS
    SarvamTTS -.->|Failover 1| BhashiniTTS
    Cleaner -->|Primary == Bhashini| BhashiniTTS
    BhashiniTTS -.->|Failover 1| SarvamTTS
    SarvamTTS -.->|Failover 2 (Offline)| EdgeTTS
    BhashiniTTS -.->|Failover 2 (Offline)| EdgeTTS

    SarvamTTS -->|Chunked MP3 Stream| TTSEndpoint
    BhashiniTTS -->|Chunked Audio Stream| TTSEndpoint
    EdgeTTS -->|Chunked MP3 Stream| TTSEndpoint
    TTSEndpoint -->|Direct Progressive Playback| AudioTag
```

---

## 3. Speech-to-Text (STT): Multi-Engine ASR & MIME Sanitization

Implemented in [`backend/app/core/sarvam_stt.py`](file:///d:/Sanjeevani/backend/app/core/sarvam_stt.py) and [`backend/app/core/bhashini_client.py`](file:///d:/Sanjeevani/backend/app/core/bhashini_client.py).

### Symmetrical Dual-Provider ASR Architecture:
- **Sarvam Saaras v3**: High-accuracy transcription with `codemix` mode for colloquial Hindi, Garhwali regional terms, and Indian English.
- **Bhashini ASR (AI4Bharat Conformer)**: Official Government of India national speech recognition pipeline for official 8th Schedule Indic languages.
- **Automatic Mutual Failover**: If the active primary ASR provider fails (e.g., HTTP 500, network timeout, rate limit 429), the request seamlessly retries against the fallback provider without dropping the patient's consultation.

### Browser MediaRecorder MIME Sanitization:
Modern browsers capture microphone input via `MediaRecorder` using container MIME types with parameters, typically `audio/webm;codecs=opus`. 
- **The Challenge**: Strictly validated speech APIs (such as Sarvam AI) reject parameters with `400 Invalid file type: audio/webm;codecs=opus`.
- **The Solution**: Both frontend ([`voiceClient.js`](file:///d:/Sanjeevani/frontend/src/api/voiceClient.js)) and backend ([`voice.py`](file:///d:/Sanjeevani/backend/app/api/voice.py)) strip MIME parameter suffixes:
  ```python
  clean_content_type = raw_ct.split(";")[0].strip().lower()  # -> 'audio/webm'
  ```
  This guarantees standard format compliance across Chromium, Safari, Firefox, and mobile WebViews.

---

## 4. Text-to-Speech (TTS): Dynamic Voice Switching & Progressive Streaming

Implemented in [`backend/app/core/tts_engine.py`](file:///d:/Sanjeevani/backend/app/core/tts_engine.py) and [`frontend/src/components/VoiceProviderSwitcher.jsx`](file:///d:/Sanjeevani/frontend/src/components/VoiceProviderSwitcher.jsx).

### Active Models & Voice Personas:
1. **Sarvam AI (bulbul:v3)**:
   - **Female Personas**: `meera` (gentle doctor voice, default), `ananya`, `ritu`, `priya`, `kavya`, `shreya`.
   - **Male Personas**: `shubh` (senior clinical physician), `arjun`, `rahul`, `aditya`, `amit`, `dev`.
2. **Bhashini (AI4Bharat Indic-TTS)**:
   - **Neural Clusters**: `ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4` (Hindi, Garhwali, Kumaoni) and `ai4bharat/indic-tts-coqui-dravidian-gpu--t4`.
   - **Genders**: Male and Female neural speakers with natural prosody.
3. **Neural Indic Edge-TTS (Offline Cloud Fallback)**:
   - Zero-configuration high-reliability cloud neural voices (`hi-IN-SwaraNeural`, `hi-IN-MadhurNeural`) serving as the ultimate fallback when both primary APIs are unreachable.

### Ultra-Low Latency Audio Caching (<50ms):
Common mission-critical phrases (greetings, emergency 108 escalation warnings, hold messages) are seeded via `seed_audio_cache()` into a differentiated LRU memory cache and on-disk audio store. Cache keys incorporate `text`, `language`, `gender`, `provider`, `model`, and `speaker` to guarantee zero playback bleeding between different voice configurations.

---

## 5. Conversational Voice Guardrails & Pronunciation Sanitization

Implemented in `IndicTTSEngine._clean_for_speech()`:
- **Exclamation Mark Normalization**: Bhashini's ASR/TTS pipeline historically expanded ASCII `!` into mathematical *"factorial"*. The cleaner normalizes `!` and `！` into natural sentence-ending periods (`. `).
- **Number & Range Formatting**: Replaces numeric ranges like `7-10` with *"7 se 10"* so the TTS engine speaks conversational Hindi instead of reading the hyphen as mathematical *"minus"*.
- **Percentage Expansion**: Translates `95%` to *"95 प्रतिशत"* in Hindi and *"95 percent"* in English.
- **Markdown & Symbol Stripping**: Cleans asterisks, hashes, backticks, emojis, and math operators (`+`, `=`, `/`) to prevent robotic verbalization of UI code artifacts.
- **Single-Question Conversational Pacing**: Voice prompts constrain LLM responses to short, conversational sentences with at most one diagnostic question per turn.
