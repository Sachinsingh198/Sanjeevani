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
 * Calls the backend Neural Indic (/voice/tts) endpoint and returns a
 * playable object URL. Uses in-memory caching for zero-latency repeats.
 */
export const synthesizeSpeech = async (text, language = 'hi', gender = 'female') => {
  const cleanText = text.trim();
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
  let audioEl = null;
  let cancelled = false;

  const fallbackToBrowserTTS = () => {
    if (cancelled || !window.speechSynthesis) {
      onEnd?.();
      return;
    }
    window.speechSynthesis.cancel();

    // Strip markdown and bullet dashes to prevent robotic symbol-reading
    const clean = text
      .replace(/[*_#`~>\[\]]/g, '')
      .replace(/(?<=\d)\s*-\s*(?=\d)/g, ' se ')
      .replace(/\s+[-•*]\s+/g, '. ')
      .replace(/^\s*[-•*]\s+/gm, '')
      .replace(/\n+/g, '. ')
      .trim();

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

      audioEl.onplay = () => {
        if (!cancelled) onStart?.();
      };
      audioEl.onended = () => onEnd?.();
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
    }
    window.speechSynthesis?.cancel();
  };
};