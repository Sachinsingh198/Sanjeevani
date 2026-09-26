import axios from 'axios';
import { evaluateLocalRedFlags } from '../lib/localTriageFallback.js';
import { processOfflineConsultation } from '../lib/offlineTriageEngine.js';
import { queueOfflineChat } from '../lib/offlineSyncManager.js';

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || 'http://localhost:8000';

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
  arg1,
  arg2,
  arg3 = [],
  arg4 = 'auto',
  arg5 = false,
  arg6 = 'female',
  arg7 = []
) => {
  let conversationId;
  let message;
  let patientConditions;
  let languageHint;
  let includeAudio;
  let voiceGender;
  let conversationHistory = [];

  try {
    if (typeof arg1 === 'object' && arg1 !== null) {
      conversationId = arg1.conversation_id || arg1.conversationId;
      message = arg1.message || arg1.text || '';
      patientConditions = arg1.patient_context?.known_conditions || arg1.patientConditions || [];
      languageHint = arg1.language_hint || arg1.languageHint || 'auto';
      includeAudio = arg1.include_audio ?? arg1.includeAudio ?? false;
      voiceGender = arg1.voice_gender || arg1.voiceGender || 'female';
      conversationHistory = arg1.conversation_history || arg1.conversationHistory || [];
    } else {
      conversationId = arg1;
      message = arg2;
      patientConditions = arg3 || [];
      languageHint = arg4 || 'auto';
      includeAudio = arg5 || false;
      voiceGender = arg6 || 'female';
      conversationHistory = arg7 || [];
    }

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
    // If backend is unreachable, times out, network is offline, or database throws a 500 error:
    // Seamlessly engage On-Device Clinical Triage & AYUSH Engine so the patient is NEVER left stranded!
    console.warn('[Sanjeevani] Backend unavailable or encountering network/database issue — engaging On-Device Clinical Triage & AYUSH Engine.');

    try {
      const offlineResult = processOfflineConsultation(message, patientConditions, conversationId, conversationHistory);
      offlineResult.raw_user_message = message;

      // Automatically queue for background synchronization to database
      try {
        queueOfflineChat(offlineResult);
      } catch (qErr) {
        console.warn('[OfflineSync] Failed to queue chat encounter:', qErr);
      }

      return offlineResult;
    } catch (offlineErr) {
      console.error('[OfflineTriage] Critical failure in local offline engine:', offlineErr);
      throw err;
    }
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

