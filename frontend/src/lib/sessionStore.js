// ---------------------------------------------------------------------------
// Sanjeevani — lightweight client-side consultation history.
//
// The backend owns the real conversation record; this is a thin, resilient
// mirror kept in localStorage so a patient can glance back at "what did
// Sanjeevani tell me last time" even on a low-end device with patchy
// connectivity, without needing an extra API round trip just to render a
// history list. Each entry is intentionally small (title + tier + date).
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'sanjeevani_session_history_v1';
const MAX_ENTRIES = 25;

export function listSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Fetches server-side consultations from GET /chat/history,
 * caching the results in localStorage for offline availability.
 */
export async function fetchServerSessions() {
  try {
    const { getChatHistory } = await import('../api/client');
    const data = await getChatHistory();
    if (Array.isArray(data) && data.length > 0) {
      const formatted = data.map((item) => ({
        conversationId: item.conversation_id || item.conversationId,
        summary: item.summary || 'Consultation',
        tier: item.tier || 'Green',
        updatedAt: item.updatedAt || item.created_at || new Date().toISOString(),
      }));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(formatted.slice(0, MAX_ENTRIES)));
      } catch {
        /* storage full or unavailable */
      }
      return formatted;
    }
  } catch (err) {
    console.warn('[SessionStore] Server sessions unavailable, using local cache:', err);
  }
  return listSessions();
}

export function recordSessionTurn({ conversationId, summary, tier }) {
  try {
    const all = listSessions();
    const existingIdx = all.findIndex((s) => s.conversationId === conversationId);
    const entry = {
      conversationId,
      summary: summary?.slice(0, 80) || 'Consultation',
      tier: tier || 'Green',
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      all[existingIdx] = { ...all[existingIdx], ...entry };
    } else {
      all.unshift(entry);
    }

    const trimmed = all.slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    return trimmed;
  } catch {
    return listSessions();
  }
}

export function clearSessionHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* no-op */
  }
}
