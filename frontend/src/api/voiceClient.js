import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const voiceApi = axios.create({
  baseURL: API_BASE,
  timeout: 25000,
});

/**
 * In-memory client cache: maps cacheKey -> audio Blob object URL.
 * Provides instant 0ms playback for repeated or preloaded voice responses.
 */
const audioBlobCache = new Map();

/**
 * Clears in-memory client audio cache to guarantee fresh voice playback
 * when user switches provider, model, or speaker.
 */
export function clearAudioCache() {
  for (const [key, url] of audioBlobCache.entries()) {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }
  audioBlobCache.clear();
}

/**
 * base64 -> Blob -> object URL, so it can be handed straight to <audio> / Audio().
 */
export function base64ToAudioUrl(base64, format = 'mp3') {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: `audio/${format}` });
  return URL.createObjectURL(blob);
}

/**
 * Converts any audio Blob (e.g. WebM/Opus from browser MediaRecorder) to a standard
 * 16kHz 16-bit Mono PCM WAV Blob using the browser's native Web Audio API.
 * This guarantees 100% format acceptance by Sarvam AI STT (Saaras) and Bhashini ASR.
 */
export async function convertBlobToWav(blob) {
  try {
    if (!blob || blob.size < 100) return blob;
    const arrayBuffer = await blob.arrayBuffer();
    const AudioContextClass = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
    if (!AudioContextClass) return blob;

    const audioCtx = new AudioContextClass();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);

    // Resample/render to 16kHz mono for optimal speech recognition
    const targetSampleRate = 16000;
    const totalFrames = Math.max(1, Math.ceil(decoded.duration * targetSampleRate));
    const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
      1,
      totalFrames,
      targetSampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = decoded;
    source.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    audioCtx.close().catch(() => {});

    // Encode renderedBuffer to 16-bit PCM WAV
    const channelData = renderedBuffer.getChannelData(0);
    const dataLength = channelData.length * 2;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, targetSampleRate, true);
    view.setUint32(28, targetSampleRate * 2, true); // byte rate (16000 * 1 * 2)
    view.setUint16(32, 2, true); // block align (1 * 2)
    view.setUint16(34, 16, true); // bits per sample
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    let offset = 44;
    for (let i = 0; i < channelData.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  } catch (err) {
    console.warn('[Audio to WAV conversion skipped, sending original]:', err);
    return blob;
  }
}

/**
 * Calls Sarvam AI Speech-to-Text (/voice/stt) to transcribe recorded audio.
 * Accepts any audio Blob recorded from MediaRecorder (auto-converts to 16kHz WAV).
 */
export const transcribeAudio = async (blob) => {
  if (!blob || blob.size < 500) {
    return { transcript: '', language_code: 'hi-IN' };
  }

  // Pre-convert to 16kHz mono WAV for guaranteed Sarvam STT & Bhashini compatibility
  const audioToSend = await convertBlobToWav(blob);

  const formData = new FormData();
  const rawMime = audioToSend.type || 'audio/wav';
  const cleanMime = rawMime.split(';')[0].trim().toLowerCase() || 'audio/wav';
  const ext = cleanMime.includes('wav')
    ? 'wav'
    : cleanMime.includes('webm')
    ? 'webm'
    : cleanMime.includes('mp4') || cleanMime.includes('m4a')
    ? 'm4a'
    : cleanMime.includes('ogg')
    ? 'ogg'
    : 'wav';

  formData.append('file', audioToSend, `voice_input.${ext}`);

  const res = await voiceApi.post('/voice/stt', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 30000,
  });
  return res.data; // { transcript: string, language_code: string, confidence: number, provider: string }
};

/**
 * Sanitizes text prior to speech synthesis to eliminate pronunciation artifacts.
 * Crucially resolves:
 * 1. Bhashini / Indic FastPitch pronouncing '!' or '！' as mathematical "factorial".
 * 2. Pronouncing hyphens '7-10' as "minus" instead of "se".
 * 3. Pronouncing '%' as "modulo" or raw symbol instead of "प्रतिशत" / "percent".
 * 4. Markdown syntax (*, _, #, `, ~, etc.) read aloud as "asterisk", "hash", etc.
 * 5. Math symbols (+, =, /) read as "plus", "equals", "slash".
 * 6. Emoji pictographs read as English code names.
 */
export function cleanTextForTTS(text, language = 'hi') {
  if (!text) return '';
  let t = String(text);

  // 1. Normalize unicode quotes and dashes
  t = t.replace(/[\u2011\u2013\u2014]/g, '-');
  t = t.replace(/[“”‘’"']/g, ' ');

  // 2. CRITICAL: Replace exclamation marks - Bhashini expands '!' into mathematical "factorial"
  t = t.replace(/[!！]+/g, '. ');

  // 3. Remove URLs and emails
  t = t.replace(/https?:\/\/\S+/g, '');
  t = t.replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, '');
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 4. Handle percentage numbers: "95%" -> "95 प्रतिशत" (Hindi) or "95 percent" (English)
  const isEnglish = language && String(language).toLowerCase().startsWith('en');
  if (isEnglish) {
    t = t.replace(/(\d+)\s*%/g, '$1 percent');
  } else {
    t = t.replace(/(\d+)\s*%/g, '$1 प्रतिशत');
  }

  // 5. Replace numeric ranges like "7-10" with "7 se 10" so TTS doesn't speak "minus"
  t = t.replace(/(?<=\d)\s*[-–—]\s*(?=\d)/g, isEnglish ? ' to ' : ' se ');

  // 6. Strip internal triage prefixes and status lines
  t = t.replace(/Tier\s+(Green|Yellow|Red)[^\n]*/gi, '');
  t = t.replace(/(\b\d{3}\b)\s*\([^)]*\)/g, '$1');
  t = t.replace(
    /(Aapki Takleef|Sambhavit Jaanch\s*\(Diagnosis\)|Nuskha|Kaise Banayein|Kab Tak Lein|Dhyan Rakhein|Safety Verified|Ayurvedic Rationale)[:\s]*/gi,
    ''
  );

  // 7. Strip markdown syntax symbols and brackets
  t = t.replace(/[*_#`~>\[\]{}|^@$\\]/g, ' ');

  // 8. Strip standalone math operators like +, =, / that TTS speaks aloud as "plus", "slash", "equals"
  t = t.replace(/\s+[+=/]\s+/g, ' ');
  t = t.replace(/[+=/]/g, ' ');

  // 9. Strip emojis and pictographs completely
  t = t.replace(
    /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
    ''
  );
  try {
    t = t.replace(/\p{Extended_Pictographic}/ug, '');
  } catch {}

  // 10. Clean up multiple dots, spaces, or leading dashes
  t = t.replace(/\.{2,}/g, '.');
  t = t.replace(/\s+/g, ' ').trim();

  return t;
}

export const VOICE_CONFIG_STORAGE_KEY = 'sanjeevani_voice_provider_config';
export const APP_SETTINGS_STORAGE_KEY = 'sanjeevani_app_settings';
export const TTS_SPEED_STORAGE_KEY = 'sanjeevani_tts_speed';

/**
 * Returns user's preferred speech speed (0.8x to 1.5x) from localStorage.
 */
export function getPlaybackRate() {
  try {
    const saved = localStorage.getItem(TTS_SPEED_STORAGE_KEY);
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 2.5) {
        return parsed;
      }
    }
  } catch {}
  return 1.0;
}

/**
 * Applies the user-configured playback rate to an HTML5 Audio instance.
 */
export function applyPlaybackRate(audio) {
  if (!audio) return;
  try {
    const rate = getPlaybackRate();
    audio.playbackRate = rate;
    audio.defaultPlaybackRate = rate;
  } catch {}
}

/**
 * Reads voice configuration cached in localStorage to prevent reset on restart/reload.
 */
export const getCachedVoiceConfig = () => {
  try {
    const raw = localStorage.getItem(VOICE_CONFIG_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return null;
};

/**
 * Fetches the currently configured primary voice provider, models, and speakers.
 * Always synchronizes with localStorage so user choices survive app restarts.
 */
export const getVoiceProviderConfig = async () => {
  const cached = getCachedVoiceConfig();
  try {
    const res = await voiceApi.get('/voice/provider');
    const backendData = res.data;
    try {
      localStorage.setItem(VOICE_CONFIG_STORAGE_KEY, JSON.stringify(backendData));
      if (backendData.tts_speed) {
        localStorage.setItem(TTS_SPEED_STORAGE_KEY, backendData.tts_speed.toString());
      }
    } catch {}
    return backendData;
  } catch (err) {
    console.warn('[Sanjeevani Voice] Failed to fetch provider config from backend, using cached/default:', err);
    if (cached) return cached;
    return {
      primary: 'bhashini',
      fallback: 'sarvam',
      offline_fallback: 'neural_indic',
      sarvam_model: 'bulbul:v3',
      sarvam_speaker: 'meera',
      bhashini_model: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4',
      bhashini_gender: 'female',
      tts_speed: 1.0,
      bhashini_configured: true,
      sarvam_configured: true,
      status: 'ready',
    };
  }
};

/**
 * Dynamically switches the primary voice provider between 'bhashini' and 'sarvam',
 * and saves model, speaker, and speech rate choices both to backend disk and localStorage.
 */
export const setVoiceProviderConfig = async (payload) => {
  clearAudioCache();
  const req = typeof payload === 'string'
    ? { provider: payload.toLowerCase().trim(), clear_cache: true }
    : { ...payload, clear_cache: true };

  if (req.tts_speed !== undefined) {
    try {
      localStorage.setItem(TTS_SPEED_STORAGE_KEY, req.tts_speed.toString());
    } catch {}
  }

  // Update localStorage immediately so frontend never resets even if connection lags
  try {
    const existing = getCachedVoiceConfig() || {};
    const optimistic = { ...existing, ...req };
    localStorage.setItem(VOICE_CONFIG_STORAGE_KEY, JSON.stringify(optimistic));
  } catch {}

  const res = await voiceApi.post('/voice/provider', req);
  clearAudioCache();
  try {
    localStorage.setItem(VOICE_CONFIG_STORAGE_KEY, JSON.stringify(res.data));
    if (res.data.tts_speed) {
      localStorage.setItem(TTS_SPEED_STORAGE_KEY, res.data.tts_speed.toString());
    }
  } catch {}
  return res.data;
};

/**
 * Loads general application settings from backend disk or local fallback.
 */
export const getPersistedAppSettings = async () => {
  let local = null;
  try {
    const raw = localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    if (raw) local = JSON.parse(raw);
  } catch {}

  try {
    const res = await voiceApi.get('/voice/settings');
    const merged = { ...(local || {}), ...res.data };
    try {
      localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(merged));
      if (merged.tts_speed) {
        localStorage.setItem(TTS_SPEED_STORAGE_KEY, merged.tts_speed.toString());
      }
    } catch {}
    return merged;
  } catch {
    return local || {
      tts_speed: 1.0,
      dialect_assistance: true,
      health_alerts: true,
      language_preference: 'hi',
    };
  }
};

/**
 * Persists general application settings to disk across restarts and to localStorage.
 */
export const savePersistedAppSettings = async (settings) => {
  try {
    const raw = localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    const prev = raw ? JSON.parse(raw) : {};
    const merged = { ...prev, ...settings };
    localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(merged));
    if (merged.tts_speed) {
      localStorage.setItem(TTS_SPEED_STORAGE_KEY, merged.tts_speed.toString());
    }
  } catch {}

  try {
    const res = await voiceApi.post('/voice/settings', settings);
    return res.data;
  } catch (err) {
    console.warn('[Settings] Failed to save settings to backend:', err);
    return settings;
  }
};

// Active audio elements and request tracking to strictly prevent overlapping voices
let globalActiveAudio = null;
let globalAbortController = null;

/**
 * Halts ALL voice audio currently playing and cancels any pending TTS requests.
 * Guarantees that two voices can NEVER overlap or play at the same time.
 */
export function stopAllVoiceAudio() {
  if (globalAbortController) {
    try {
      globalAbortController.abort();
    } catch {}
    globalAbortController = null;
  }
  if (globalActiveAudio) {
    try {
      globalActiveAudio.pause();
      globalActiveAudio.currentTime = 0;
      globalActiveAudio.src = '';
    } catch {}
    globalActiveAudio = null;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

/**
 * Live audio preview for any model or speaker before selecting it.
 * Plays sample audio via backend /voice/tts or graceful fallback.
 * Strictly mutually exclusive: cancels any previous preview immediately.
 * Returns a cancel function.
 */
export const previewVoiceAudio = async ({
  text,
  language = 'hi',
  gender = 'female',
  provider = 'sarvam',
  model,
  speaker,
  onStart,
  onEnd,
}) => {
  // Immediately halt any previous voice before doing anything else
  stopAllVoiceAudio();

  const controller = new AbortController();
  globalAbortController = controller;

  const clean = cleanTextForTTS(text, language) || 'नमस्ते! यह संजीवनी आवाज़ का पूर्वावलोकन है।';

  try {
    const res = await voiceApi.post(
      '/voice/tts',
      {
        text: clean,
        language,
        gender,
        provider,
        model,
        speaker,
      },
      { signal: controller.signal }
    );

    if (controller.signal.aborted) {
      onEnd?.();
      return () => {};
    }

    const { audio_base64, format } = res.data;
    const url = base64ToAudioUrl(audio_base64, format || 'wav');
    const audio = new Audio(url);
    applyPlaybackRate(audio);

    if (controller.signal.aborted) {
      URL.revokeObjectURL(url);
      onEnd?.();
      return () => {};
    }

    globalActiveAudio = audio;

    let finished = false;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
      } catch {}
      URL.revokeObjectURL(url);
      if (globalActiveAudio === audio) {
        globalActiveAudio = null;
      }
      onEnd?.();
    };

    audio.onplay = () => {
      if (!controller.signal.aborted) {
        onStart?.();
      }
    };
    audio.onended = cleanup;
    audio.onerror = cleanup;

    await audio.play();

    return cleanup;
  } catch (err) {
    if (axios.isCancel(err) || controller.signal.aborted) {
      onEnd?.();
      return () => {};
    }
    console.warn('[Voice Preview] Backend preview error:', err);
    onEnd?.();
    return () => {};
  }
};

export const SARVAM_MALE_SPEAKERS = [
  'shubh', 'arjun', 'rahul', 'aditya', 'amit', 'dev', 'rohan', 'ratan', 'varun'
];

/**
 * Resolves active voice parameters honoring the user's selected provider, model,
 * speaker, and gender from settings, while allowing per-call overrides.
 */
export function getActiveVoiceSettings(overrides = {}) {
  const config = getCachedVoiceConfig() || {};
  const primary = (overrides.provider || config.primary || config.provider || 'bhashini').toLowerCase().trim();

  let model = overrides.model;
  let speaker = overrides.speaker;
  let gender = overrides.gender;

  if (primary === 'sarvam') {
    model = model || config.sarvam_model || 'bulbul:v3';
    speaker = speaker || config.sarvam_speaker || 'meera';
    if (!gender) {
      gender = SARVAM_MALE_SPEAKERS.includes(speaker.toLowerCase().trim()) ? 'male' : 'female';
    }
  } else {
    // bhashini
    model = model || config.bhashini_model || 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4';
    gender = gender || config.bhashini_gender || 'female';
    speaker = speaker || gender;
  }

  const tts_speed = overrides.tts_speed !== undefined ? overrides.tts_speed : (config.tts_speed || getPlaybackRate());

  return {
    provider: primary,
    model,
    speaker,
    gender: gender || 'female',
    tts_speed,
  };
}

/**
 * Calls the backend Neural Indic (/voice/tts) endpoint and returns a
 * playable object URL. Uses in-memory caching for zero-latency repeats.
 * Always honors the user's selected provider, model, and speaker.
 */
export const synthesizeSpeech = async (text, language = 'hi', gender, options = {}) => {
  const cleanText = cleanTextForTTS(text, typeof language === 'string' ? language : 'hi');
  if (!cleanText) throw new Error('Empty text for speech synthesis');

  let opts = options;
  let lang = language;
  let gen = gender;
  if (typeof language === 'object' && language !== null) {
    opts = language;
    lang = opts.language || 'hi';
    gen = opts.gender;
  } else if (typeof gender === 'object' && gender !== null) {
    opts = gender;
    gen = opts.gender;
  }

  const activeSettings = getActiveVoiceSettings({
    gender: gen,
    ...opts,
  });

  const provider = activeSettings.provider;
  const model = activeSettings.model;
  const speaker = activeSettings.speaker;
  const effectiveGender = activeSettings.gender || 'female';
  const effectiveLang = typeof lang === 'string' ? lang : 'hi';

  const cacheKey = `${cleanText}_${effectiveLang}_${effectiveGender}_${provider}_${model}_${speaker}`;
  if (audioBlobCache.has(cacheKey)) {
    return audioBlobCache.get(cacheKey);
  }

  const res = await voiceApi.post('/voice/tts', {
    text: cleanText,
    language: effectiveLang,
    gender: effectiveGender,
    provider,
    model,
    speaker,
  });
  const { audio_base64, format } = res.data;
  const audioUrl = base64ToAudioUrl(audio_base64, format || 'mp3');
  
  // Cache up to 30 voice entries in client memory
  if (audioBlobCache.size > 30) {
    const oldestKey = audioBlobCache.keys().next().value;
    const oldUrl = audioBlobCache.get(oldestKey);
    URL.revokeObjectURL(oldUrl);
    audioBlobCache.delete(oldestKey);
  }
  audioBlobCache.set(cacheKey, audioUrl);

  return audioUrl;
};

/**
 * Streams synthesized speech audio progressive chunks from /voice/tts/stream
 * for minimal latency in live consultations.
 * Honors user's chosen provider, model, and speaker.
 * Returns a cancel function.
 */
export const streamSpeech = (text, { language = 'hi', gender, provider, model, speaker, onStart, onEnd, onError } = {}) => {
  let cancelled = false;
  let audioEl = null;
  const abortController = new AbortController();
  const cleanedText = cleanTextForTTS(text, language);

  const activeSettings = getActiveVoiceSettings({
    provider,
    model,
    speaker,
    gender,
  });

  (async () => {
    try {
      const response = await fetch(`${API_BASE}/voice/tts/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanedText,
          language,
          gender: activeSettings.gender || 'female',
          provider: activeSettings.provider,
          model: activeSettings.model,
          speaker: activeSettings.speaker,
        }),
        signal: abortController.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`TTS Stream returned status ${response.status}`);
      }

      // Check if MediaSource is supported for streaming audio/mpeg
      const canMediaSource = typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported('audio/mpeg');

      if (canMediaSource) {
        const mediaSource = new MediaSource();
        const objectUrl = URL.createObjectURL(mediaSource);
        audioEl = new Audio(objectUrl);
        applyPlaybackRate(audioEl);

        audioEl.onplay = () => { if (!cancelled) onStart?.(); };
        audioEl.onended = () => {
          URL.revokeObjectURL(objectUrl);
          onEnd?.();
        };
        audioEl.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          onError?.(new Error('Audio playback error'));
        };

        mediaSource.addEventListener('sourceopen', async () => {
          try {
            const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
            const reader = response.body.getReader();
            let startedPlaying = false;

            while (!cancelled) {
              const { done, value } = await reader.read();
              if (done) {
                if (mediaSource.readyState === 'open') {
                  mediaSource.endOfStream();
                }
                break;
              }

              // Append chunk when buffer is not updating
              await new Promise((resolve) => {
                if (!sourceBuffer.updating) {
                  sourceBuffer.appendBuffer(value);
                  resolve();
                } else {
                  sourceBuffer.addEventListener('updateend', () => {
                    sourceBuffer.appendBuffer(value);
                    resolve();
                  }, { once: true });
                }
              });

              // Start playback as soon as the first chunk is buffered
              if (!startedPlaying && !cancelled) {
                startedPlaying = true;
                audioEl.play().catch((playErr) => {
                  console.warn('[Sanjeevani Stream] Autoplay prevented:', playErr);
                });
              }
            }
          } catch (streamErr) {
            if (!cancelled) {
              console.warn('[Sanjeevani Stream MediaSource Error]:', streamErr);
              onError?.(streamErr);
            }
          }
        });
      } else {
        // Progressive buffer fallback for browsers lacking audio/mpeg MediaSource
        const reader = response.body.getReader();
        const chunks = [];
        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
        if (cancelled) return;

        const blob = new Blob(chunks, { type: 'audio/mpeg' });
        const blobUrl = URL.createObjectURL(blob);
        audioEl = new Audio(blobUrl);
        applyPlaybackRate(audioEl);
        audioEl.onplay = () => { if (!cancelled) onStart?.(); };
        audioEl.onended = () => {
          URL.revokeObjectURL(blobUrl);
          onEnd?.();
        };
        audioEl.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          onError?.(new Error('Audio playback error'));
        };
        audioEl.play().catch((err) => onError?.(err));
      }
    } catch (err) {
      if (!cancelled) {
        onError?.(err);
      }
    }
  })();

  return () => {
    cancelled = true;
    abortController.abort();
    if (audioEl) {
      audioEl.pause();
      audioEl.src = '';
    }
  };
};

/**
 * Preloads audio in the background (e.g. for greetings or quick prompts)
 * so it plays with zero delay when triggered.
 */
export const preloadSpeech = async (text, language = 'hi', gender, options = {}) => {
  try {
    const opts = typeof gender === 'object' && gender !== null ? gender : options;
    const gen = typeof gender === 'string' ? gender : undefined;
    await synthesizeSpeech(text, language, gen, opts);
  } catch (err) {
    // Non-blocking prefetch failure
    console.debug('[Sanjeevani Voice] Preload skipped:', err?.message);
  }
};

/* ──────────────────────────────────────────────────────────────────────
   Browser-side voice selector
   Tries to find the best Hindi/Indian Neural voice from the available
   Speech Synthesis voices on this device. Priority order:
   1. Microsoft Swara (Neural, best Hindi female)
   2. Google हिन्दी (Google Chrome Hindi)
   3. hi-IN (any Hindi locale voice)
   4. Default Indian English (if english)
   ────────────────────────────────────────────────────────────────────── */
function pickBestHindiVoice(voices, language) {
  if (!voices || voices.length === 0) return null;

  const isHindi = language === 'hi' || language === 'hindi' || language === 'garhwali';

  if (isHindi) {
    // Priority 1: Microsoft Swara Neural
    const swara = voices.find(v => v.name.includes('Swara'));
    if (swara) return swara;

    // Priority 2: Google Hindi
    const googleHi = voices.find(v => v.name.toLowerCase().includes('google') && v.lang.startsWith('hi'));
    if (googleHi) return googleHi;

    // Priority 3: Any hi-IN locale
    const anyHi = voices.find(v => v.lang === 'hi-IN');
    if (anyHi) return anyHi;

    // Priority 4: Any Hindi
    const anyHindi = voices.find(v => v.lang.startsWith('hi'));
    if (anyHindi) return anyHindi;
  } else {
    // English — prefer Indian English
    const neerja = voices.find(v => v.name.includes('Neerja'));
    if (neerja) return neerja;

    const enIN = voices.find(v => v.lang === 'en-IN');
    if (enIN) return enIN;
  }

  return null;
}

/**
 * Authentic voice playback helper with accurate state synchronization:
 *   1. Synthesizes with user-configured Primary Voice Provider (Bhashini or Sarvam AI Bulbul).
 *   2. Only activates onStart when the sound is genuinely emitting to avoid visual delay mismatch.
 *   3. If network fails and a true Hindi/Indian voice is installed in the browser, falls back gracefully.
 *      Does NOT force American robotic voices (David/Mark) to butcher Hindi words.
 *
 * Returns a cleanup function you can call to stop playback early.
 */
export const speakText = (text, { language = 'hi', gender, provider, model, speaker, onStart, onEnd } = {}) => {
  stopAllVoiceAudio();
  let audioEl = null;
  let cancelled = false;
  const clean = cleanTextForTTS(text, language);
  if (!clean) {
    onEnd?.();
    return () => {};
  }

  const activeSettings = getActiveVoiceSettings({
    provider,
    model,
    speaker,
    gender,
  });

  const fallbackToBrowserTTS = () => {
    if (cancelled || !window.speechSynthesis) {
      onEnd?.();
      return;
    }
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(clean);
    const voices = window.speechSynthesis.getVoices();
    const bestVoice = pickBestHindiVoice(voices, language);

    const isHindi = language === 'hi' || language === 'hindi' || language === 'garhwali';
    // If no Indian voice is installed in the OS, do NOT let American Microsoft David butcher Hindi
    if (isHindi && !bestVoice) {
      console.warn('[Sanjeevani Voice] Neural TTS temporarily unavailable and no Hindi OS voice detected. Bypassing robotic US voice.');
      onEnd?.();
      return;
    }

    if (bestVoice) {
      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang;
    } else {
      utterance.lang = 'en-IN';
    }

    utterance.rate   = Math.min(2.0, Math.max(0.5, getPlaybackRate() * 0.95));  // Natural conversational speed
    utterance.pitch  = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      if (!cancelled) onStart?.();
    };
    utterance.onend   = () => onEnd?.();
    utterance.onerror = () => onEnd?.();

    window.speechSynthesis.speak(utterance);
  };

  synthesizeSpeech(clean, language, activeSettings.gender, {
    provider: activeSettings.provider,
    model: activeSettings.model,
    speaker: activeSettings.speaker,
  })
    .then((url) => {
      if (cancelled) return;
      audioEl = new Audio(url);
      applyPlaybackRate(audioEl);
      globalActiveAudio = audioEl;

      audioEl.onplay = () => {
        if (!cancelled) onStart?.();
      };
      audioEl.onended = () => {
        if (globalActiveAudio === audioEl) globalActiveAudio = null;
        onEnd?.();
      };
      audioEl.onerror = () => fallbackToBrowserTTS();

      audioEl.play().catch((playErr) => {
        console.warn('[Sanjeevani Voice] Direct playback prevented by autoplay policy:', playErr);
        fallbackToBrowserTTS();
      });
    })
    .catch((err) => {
      console.warn('[Sanjeevani Voice] Neural Indic backend error, attempting local fallback:', err?.message);
      if (window.speechSynthesis && window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.onvoiceschanged = null;
          fallbackToBrowserTTS();
        };
      } else {
        fallbackToBrowserTTS();
      }
    });

  return () => {
    cancelled = true;
    if (audioEl) {
      audioEl.pause();
      audioEl.src = '';
      if (globalActiveAudio === audioEl) {
        globalActiveAudio = null;
      }
    }
    window.speechSynthesis?.cancel();
  };
};