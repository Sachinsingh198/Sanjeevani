// ---------------------------------------------------------------------------
// Sanjeevani — lightweight client-side consultation history.
//
// The backend owns the real conversation record; this is a thin, resilient
// mirror kept in localStorage scoped per user so a patient can glance back
// at "what did Sanjeevani tell me last time".
// When a new account is registered, history starts completely empty.
// ---------------------------------------------------------------------------
const MAX_ENTRIES = 25;

export function getCurrentUserId() {
  try {
    const rawUser = localStorage.getItem('sanjeevani_user_profile');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (u?.id) return String(u.id);
    }
  } catch {}
  return null;
}

export function getStorageKey(userId) {
  const uid = userId || getCurrentUserId();
  return uid ? `sanjeevani_session_history_u_${uid}` : 'sanjeevani_session_history_guest';
}

export function listSessions(userId) {
  try {
    const key = getStorageKey(userId);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Fetches server-side consultations from GET /chat/history,
 * caching the results in localStorage scoped to the authenticated user.
 */
export async function fetchServerSessions(userId) {
  const key = getStorageKey(userId);
  try {
    const { getChatHistory } = await import('../api/client');
    const data = await getChatHistory();
    if (Array.isArray(data)) {
      const formatted = data.map((item) => ({
        conversationId: item.conversation_id || item.conversationId,
        summary: item.summary || 'Consultation',
        tier: item.tier || 'Green',
        updatedAt: item.updatedAt || item.created_at || new Date().toISOString(),
      }));
      try {
        localStorage.setItem(key, JSON.stringify(formatted.slice(0, MAX_ENTRIES)));
      } catch {
        /* storage full or unavailable */
      }
      return formatted;
    }
  } catch (err) {
    console.warn('[SessionStore] Server sessions unavailable, using local cache:', err);
  }
  return listSessions(userId);
}

export function recordSessionTurn({ conversationId, summary, tier, userId }) {
  try {
    const key = getStorageKey(userId);
    const all = listSessions(userId);
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
    localStorage.setItem(key, JSON.stringify(trimmed));
    return trimmed;
  } catch {
    return listSessions(userId);
  }
}

export async function clearSessionHistory(userId) {
  try {
    localStorage.removeItem(getStorageKey(userId));
    localStorage.removeItem('sanjeevani_session_history_v1');
    sessionStorage.removeItem('sanjeevani_conv_id');
  } catch {
    /* no-op */
  }

  // Also clear on backend so records do not return upon page refresh
  try {
    const { clearAllChatHistory } = await import('../api/client');
    await clearAllChatHistory();
  } catch (err) {
    console.debug('[SessionStore] Backend history clear error (offline/guest):', err);
  }
}

export async function deleteSession(conversationId, userId) {
  if (!conversationId) return listSessions(userId);

  try {
    const key = getStorageKey(userId);
    const all = listSessions(userId);
    const updated = all.filter((s) => s.conversationId !== conversationId);
    localStorage.setItem(key, JSON.stringify(updated));

    // If active session was the deleted one, clear active session id
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('sanjeevani_conv_id') === conversationId) {
      sessionStorage.removeItem('sanjeevani_conv_id');
    }

    // Call backend delete
    try {
      const { deleteConversation } = await import('../api/client');
      await deleteConversation(conversationId);
    } catch (err) {
      console.debug('[SessionStore] Backend single session delete notice:', err);
    }

    return updated;
  } catch (err) {
    console.warn('[SessionStore] deleteSession error:', err);
    return listSessions(userId);
  }
}
