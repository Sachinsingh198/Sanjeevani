import axios from 'axios';

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

export const sendChatMessage = async (conversationId, message, patientConditions = []) => {
  try {
    const res = await api.post('/chat/message', {
      conversation_id: conversationId,
      message: message,
      language_hint: 'hi',
      patient_context: { known_conditions: patientConditions }
    });
    return res.data;
  } catch (err) {
    // Only fall back to client-side simulation if it's a network/offline error,
    // NOT a timeout (so we don't mask real backend issues in development).
    if (!err.response && err.code !== 'ECONNABORTED') {
      console.warn('[Sanjeevani] Backend offline — using client-side simulation for demo mode.');

      const lower = message.toLowerCase();

      // Emergency Simulation
      if ((lower.includes('chest') || lower.includes('seene me dard') || lower.includes('saans') || lower.includes('ghutan')) &&
          !lower.includes('no') && !lower.includes('nahi')) {
        return {
          conversation_id: conversationId,
          tier: 'Red',
          reply_text: 'EMERGENCY WARNING: Critical life-threatening symptoms detected. Do NOT rely on home remedies. Keep the patient in a comfortable position, ensure their airway is open, and call 108 emergency ambulance immediately.',
          flags: ['RED_FLAG: cardiac_chest_pain / acute_respiratory_distress'],
          remedies: [],
          escalation_triggered: true,
          requires_immediate_doctor: true
        };
      }

      // Yellow Tier Simulation
      if (lower.includes('3 din') || lower.includes('persistent fever') || lower.includes('lagaatar bukhar')) {
        return {
          conversation_id: conversationId,
          tier: 'Yellow',
          reply_text: 'Aapke lakshan sub-acute hain. Yadi bukhar 24 ghante aur rehta hai toh Primary Health Centre (PHC) jaayein ya e-Sanjeevani (104) par call karein.',
          flags: ['YELLOW_FLAG: Prolonged fever monitoring'],
          remedies: [],
          escalation_triggered: false,
          requires_immediate_doctor: false
        };
      }

      // Green Tier Simulation
      return {
        conversation_id: conversationId,
        tier: 'Green',
        reply_text: 'Namaste! Main Sanjeevani hoon. Aap apne lakshan yahan batayein. (Demo mode — backend offline)',
        flags: ['GREEN_FLAG: Routine community care'],
        remedies: [],
        escalation_triggered: false,
        requires_immediate_doctor: false
      };
    }

    // Re-throw real errors (500s, timeouts) so the UI can display them
    throw err;
  }
};
