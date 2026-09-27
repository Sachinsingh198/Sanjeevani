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
 * Calls Sarvam AI Speech-to-Text (/voice/stt) to transcribe recorded audio.
 * Accepts any audio Blob recorded from MediaRecorder.
 */
export const transcribeAudio = async (blob) => {
  if (!blob || blob.size < 100) {
    return { transcript: '', language_code: 'hi-IN' };
  }

  const formData = new FormData();
  const mimeType = blob.type || 'audio/webm';
  const ext = mimeType.includes('webm')
    ? 'webm'
    : mimeType.includes('mp4') || mimeType.includes('m4a')
    ? 'm4a'
    : mimeType.includes('ogg')
    ? 'ogg'
    : 'wav';

  formData.append('file', blob, `voice_input.${ext}`);

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

/**
 * Fetches the currently configured primary voice provider, its automatic first fallback,
 * and service readiness from the backend.
 */
export const getVoiceProviderConfig = async () => {
  try {
    const res = await voiceApi.get('/voice/provider');
    return res.data;
  } catch (err) {
    console.warn('[Sanjeevani Voice] Failed to fetch provider config, using local default:', err);
    return {
      primary: 'bhashini',
      fallback: 'sarvam',
      offline_fallback: 'neural_indic',
      bhashini_configured: true,
      sarvam_configured: true,
      status: 'ready',
    };
  }
};

/**
 * Dynamically switches the primary voice provider between 'bhashini' and 'sarvam',
 * and allows saving model and speaker choices.
 * Automatically clears audio cache so new configuration is reflected immediately.
 */
export const setVoiceProviderConfig = async (payload) => {
  clearAudioCache();
  const req = typeof payload === 'string'
    ? { provider: payload.toLowerCase().trim(), clear_cache: true }
    : { ...payload, clear_cache: true };
  const res = await voiceApi.post('/voice/provider', req);
  clearAudioCache();
  return res.data;
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

/**
 * Calls the backend Neural Indic (/voice/tts) endpoint and returns a
 * playable object URL. Uses in-memory caching for zero-latency repeats.
 */
export const synthesizeSpeech = async (text, language = 'hi', gender = 'female') => {
  const cleanText = cleanTextForTTS(text, language);
  if (!cleanText) throw new Error('Empty text for speech synthesis');

  const cacheKey = `${cleanText}_${language}_${gender}`;
  if (audioBlobCache.has(cacheKey)) {
    return audioBlobCache.get(cacheKey);
  }

  const res = await voiceApi.post('/voice/tts', { text: cleanText, language, gender });
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
 * Returns a cancel function.
 */
export const streamSpeech = (text, { language = 'hi', gender = 'female', onStart, onEnd, onError } = {}) => {
  let cancelled = false;
  let audioEl = null;
  const abortController = new AbortController();
  const cleanedText = cleanTextForTTS(text, language);

  (async () => {
    try {
      const response = await fetch(`${API_BASE}/voice/tts/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanedText, language, gender }),
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
export const preloadSpeech = async (text, language = 'hi', gender = 'female') => {
  try {
    await synthesizeSpeech(text, language, gender);
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
 *   1. Synthesizes with high-fidelity Neural Indic TTS (edge-tts / Microsoft Swara Neural).
 *   2. Only activates onStart when the sound is genuinely emitting to avoid visual delay mismatch.
 *   3. If network fails and a true Hindi/Indian voice is installed in the browser, falls back gracefully.
 *      Does NOT force American robotic voices (David/Mark) to butcher Hindi words.
 *
 * Returns a cleanup function you can call to stop playback early.
 */
export const speakText = (text, { language = 'hi', gender = 'female', onStart, onEnd } = {}) => {
  stopAllVoiceAudio();
  let audioEl = null;
  let cancelled = false;
  const clean = cleanTextForTTS(text, language);
  if (!clean) {
    onEnd?.();
    return () => {};
  }

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

    utterance.rate   = 0.95;  // Natural conversational speed
    utterance.pitch  = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      if (!cancelled) onStart?.();
    };
    utterance.onend   = () => onEnd?.();
    utterance.onerror = () => onEnd?.();

    window.speechSynthesis.speak(utterance);
  };

  synthesizeSpeech(text, language, gender)
    .then((url) => {
      if (cancelled) return;
      audioEl = new Audio(url);
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