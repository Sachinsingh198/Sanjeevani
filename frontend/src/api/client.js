import axios from 'axios';
import { evaluateLocalRedFlags } from '../lib/localTriageFallback';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  // LLM inference + vector search can take up to 20s on cold start.
  // 5s was causing premature timeouts and triggering the offline fallback.
  timeout: 45000,
});

/**
 * Returns a stable conversation ID for this browser session.
 * Stored in sessionStorage so it resets on tab close but persists across
 * re-renders within the same session (fixes the core multi-turn bug).
 */
export const getOrCreateConversationId = () => {
  const existing = sessionStorage.getItem('sanjeevani_conv_id');
  if (existing) return existing;
  const newId = 'sj-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  sessionStorage.setItem('sanjeevani_conv_id', newId);
  return newId;
};

/**
 * Resets the conversation — clears the stored session ID so the next call
 * to getOrCreateConversationId() generates a fresh thread.
 */
export const resetConversationId = () => {
  sessionStorage.removeItem('sanjeevani_conv_id');
};

/**
 * Explicitly sets the active conversation ID.
 */
export const setStoredConversationId = (id) => {
  if (id) {
    sessionStorage.setItem('sanjeevani_conv_id', id);
  }
};

/**
 * NEW: lightweight, fast health probe (short timeout, no fallback logic)
 * used purely to drive the "Connected / Offline demo mode" status pill in
 * the UI so the patient always knows whether they're talking to the real
 * triage engine or the client-side simulation — previously this switch
 * happened silently.
 */
export const checkBackendHealth = async () => {
  try {
    await axios.get(`${API_BASE}/health`, { timeout: 4000 });
    return true;
  } catch {
    // Some deployments may not expose /health — fall back to a cheap root hit
    try {
      await axios.get(API_BASE, { timeout: 4000 });
      return true;
    } catch {
      return false;
    }
  }
};

export const sendChatMessage = async (
  conversationId,
  message,
  patientConditions = [],
  languageHint = 'auto',
  includeAudio = false,
  voiceGender = 'female'
) => {
  try {
    const res = await api.post('/chat/message', {
      conversation_id: conversationId,
      message: message,
      language_hint: languageHint,
      patient_context: { known_conditions: patientConditions },
      include_audio: includeAudio,
      voice_gender: voiceGender,
    });
    return res.data;
  } catch (err) {
    // Only fall back to client-side simulation if it's a network/offline error,
    // NOT a timeout (so we don't mask real backend issues in development).
    if (!err.response && err.code !== 'ECONNABORTED') {
      console.warn('[Sanjeevani] Backend offline — using client-side simulation for demo mode.');

      const redEval = evaluateLocalRedFlags(message);
      if (redEval.isRed) {
        const flagStr = redEval.flag || 'RED_FLAG: Emergency detected offline';
        return {
          conversation_id: conversationId,
          tier: 'Red',
          reply_text: `⚠️ ऑफ़लाइन अनुमान (पुष्टि नहीं) — EMERGENCY WARNING: Critical life-threatening symptoms detected (${flagStr}). Do NOT rely on home remedies. Keep the patient in a comfortable position, ensure their airway is open, and call 108 emergency ambulance immediately.`,
          flags: [flagStr],
          remedies: [],
          escalation_triggered: true,
          requires_immediate_doctor: true,
          is_offline_fallback: true,
        };
      }

      const lower = message.toLowerCase();

      // Yellow Tier Simulation
      if (lower.includes('3 din') || lower.includes('persistent fever') || lower.includes('lagaatar bukhar')) {
        return {
          conversation_id: conversationId,
          tier: 'Yellow',
          reply_text: '⚠️ ऑफ़लाइन अनुमान (पुष्टि नहीं) — Aapke lakshan sub-acute hain. Yadi bukhar 24 ghante aur rehta hai toh Primary Health Centre (PHC) jaayein ya e-Sanjeevani (104) par call karein.',
          flags: ['YELLOW_FLAG: Prolonged fever monitoring'],
          remedies: [],
          escalation_triggered: false,
          requires_immediate_doctor: false,
          is_offline_fallback: true,
        };
      }

      // Green Tier Simulation
      return {
        conversation_id: conversationId,
        tier: 'Green',
        reply_text: '⚠️ ऑफ़लाइन अनुमान (पुष्टि नहीं) — Namaste! Main Sanjeevani hoon. Aap apne lakshan yahan batayein. (Demo mode — backend offline)',
        flags: ['GREEN_FLAG: Routine community care'],
        remedies: [],
        escalation_triggered: false,
        requires_immediate_doctor: false,
        is_offline_fallback: true,
      };
    }

    // Re-throw real errors (500s, timeouts) so the UI can display them
    throw err;
  }
};

/**
 * Calls backend Neural Indian Accent TTS (Bhashini / AI4Bharat / Neural Indic).
 * Returns an audio object URL for seamless HTML5 Audio playback.
 */
export const synthesizeSpeech = async (text, language = 'hi', gender = 'female') => {
  try {
    const res = await api.post('/chat/tts', {
      text: text,
      language: language,
      gender: gender,
    }, {
      responseType: 'blob',
      timeout: 15000,
    });
    return URL.createObjectURL(res.data);
  } catch (err) {
    console.warn('[TTS API Error] Falling back to browser speech synthesis:', err);
    return null;
  }
};

/**
 * Fetches consultation history records from backend.
 */
export const getChatHistory = async (token = null) => {
  const authToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('sanjeevani_token') : null);
  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
  const res = await api.get('/chat/history', { headers });
  return res.data;
};

/**
 * Fetches detailed state of a single past consultation session.
 */
export const getConversationDetails = async (conversationId, token = null) => {
  const authToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('sanjeevani_token') : null);
  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
  const res = await api.get(`/chat/history/${conversationId}`, { headers });
  return res.data;
};

/**
 * Synchronizes batch encounters from ASHA workers to the health center backend.
 */
export const syncAshaBatch = async (encounters, token = null) => {
  const authToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('sanjeevani_token') : null);
  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
  const res = await api.post('/asha/sync-batch', { encounters }, { headers, timeout: 15000 });
  return res.data;
};

