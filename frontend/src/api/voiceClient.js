import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const voiceApi = axios.create({
  baseURL: API_BASE,
  timeout: 20000, // TTS synthesis can take a few seconds
});

/**
 * base64 -> Blob -> object URL, so it can be handed straight to <audio> / Audio().
 */
function base64ToAudioUrl(base64, format = 'wav') {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: `audio/${format}` });
  return URL.createObjectURL(blob);
}

/**
 * Calls the backend's Neural Indic / edge-tts /voice/tts endpoint and returns a
 * playable object URL. Throws on failure — callers should catch and fall
 * back to window.speechSynthesis (see speakText() below, which already
 * does this for you).
 */
export const synthesizeSpeech = async (text, language = 'hi', gender = 'female') => {
  const res = await voiceApi.post('/voice/tts', { text, language, gender });
  const { audio_base64, format } = res.data;
  return base64ToAudioUrl(audio_base64, format);
};

/* ──────────────────────────────────────────────────────────────────────
   Browser-side voice selector
   Tries to find the best Hindi/Indian Neural voice from the available
   Speech Synthesis voices on this device. Priority order:
   1. Microsoft Swara (Neural, best Hindi female, available in Edge/Chrome)
   2. Google हिन्दी (Google Chrome Hindi)
   3. hi-IN (any Hindi locale voice)
   4. Default browser voice as last resort
   ────────────────────────────────────────────────────────────────────── */
function pickBestHindiVoice(voices, language) {
  if (!voices || voices.length === 0) return null;

  const isHindi = language === 'hi' || language === 'hindi' || language === 'garhwali';

  if (isHindi) {
    // Priority 1: Microsoft Swara Neural (Edge, Chrome on Windows)
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
 * One-call "just speak this" helper with automatic fallback:
 *   1. Try backend Neural Indic TTS (edge-tts with hi-IN-SwaraNeural — authentic Indian voice).
 *   2. If that fails (not configured / network / provider error),
 *      silently fall back to the browser's built-in speechSynthesis
 *      with the best available Hindi/Indian voice.
 *
 * Returns a cleanup function you can call to stop playback early.
 */
export const speakText = (text, { language = 'hi', gender = 'female', onStart, onEnd } = {}) => {
  let audioEl = null;
  let cancelled = false;

  const fallbackToBrowserTTS = () => {
    if (cancelled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    // Strip markdown to prevent robotic symbol-reading
    const clean = text.replace(/[*_#`~>\[\]]/g, '').replace(/\n+/g, '. ').trim();

    const utterance = new SpeechSynthesisUtterance(clean);

    // Pick the best available Indian voice
    const voices = window.speechSynthesis.getVoices();
    const bestVoice = pickBestHindiVoice(voices, language);
    if (bestVoice) {
      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang;
    } else {
      // Fallback lang hint
      utterance.lang = language === 'hi' || language === 'hindi' ? 'hi-IN' : 'en-IN';
    }

    // Warm, slightly slow rate for elderly/low-literacy users
    utterance.rate   = 0.88;  // slightly slower than default 1.0
    utterance.pitch  = 1.05;  // slightly warmer pitch
    utterance.volume = 1.0;

    utterance.onstart = onStart;
    utterance.onend   = onEnd;
    utterance.onerror = () => onEnd?.();

    window.speechSynthesis.speak(utterance);
  };

  onStart?.();

  synthesizeSpeech(text, language, gender)
    .then((url) => {
      if (cancelled) return;
      audioEl = new Audio(url);
      audioEl.onended = () => onEnd?.();
      audioEl.onerror = fallbackToBrowserTTS;
      audioEl.play().catch(fallbackToBrowserTTS);
    })
    .catch(() => {
      console.warn('[Sanjeevani] Neural Indic TTS unavailable — falling back to browser voice.');
      // Voices might not be loaded yet; wait for them
      if (window.speechSynthesis.getVoices().length === 0) {
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