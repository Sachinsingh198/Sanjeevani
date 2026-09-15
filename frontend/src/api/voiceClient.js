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
 * Calls the backend's Bhashini-powered /voice/tts endpoint and returns a
 * playable object URL. Throws on failure — callers should catch and fall
 * back to window.speechSynthesis (see speakText() below, which already
 * does this for you).
 */
export const synthesizeSpeech = async (text, language = 'hi', gender = 'female') => {
  const res = await voiceApi.post('/voice/tts', { text, language, gender });
  const { audio_base64, format } = res.data;
  return base64ToAudioUrl(audio_base64, format);
};

/**
 * One-call "just speak this" helper with automatic fallback:
 *   1. Try backend Bhashini TTS (natural Indian-accent voice).
 *   2. If that fails (not configured / network / provider error),
 *      silently fall back to the browser's built-in speechSynthesis
 *      so voice mode never goes completely silent.
 *
 * Returns a cleanup function you can call to stop playback early.
 */
export const speakText = (text, { language = 'hi', gender = 'female', onStart, onEnd } = {}) => {
  let audioEl = null;
  let cancelled = false;

  const fallbackToBrowserTTS = () => {
    if (cancelled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*_#]/g, '');
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.95;
    utterance.onstart = onStart;
    utterance.onend = onEnd;
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
      console.warn('[Sanjeevani] Bhashini TTS unavailable — falling back to browser voice.');
      fallbackToBrowserTTS();
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