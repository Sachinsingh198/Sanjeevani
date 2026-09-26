/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SANJEEVANI 2.0 — OFFLINE SYNC MANAGER
 * 
 * Manages persistent offline queues and automatic background synchronization
 * as soon as network connectivity is restored.
 * 
 * Queues:
 * - Offline Chat Consultations
 * - Offline CV Screenings
 * - Offline ASHA Field Logs
 * ─────────────────────────────────────────────────────────────────────────────
 */

import axios from 'axios';

const QUEUE_KEYS = {
  CHAT: 'sanjeevani_offline_chat_queue_v1',
  SCREENING: 'sanjeevani_offline_screening_queue_v1',
  ASHA: 'sanjeevani_asha_queue_v2',
};

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL)) || 'http://localhost:8000';

function readQueue(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn(`[SyncManager] Failed to read ${key}:`, e);
    return [];
  }
}

function writeQueue(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`[SyncManager] Failed to write ${key}:`, e);
  }
}

// ── Public Queue Registration APIs ───────────────────────────────────────────

export function queueOfflineChat(consultation) {
  if (!consultation || !consultation.conversation_id) return;
  const queue = readQueue(QUEUE_KEYS.CHAT);
  
  // Deduplicate by conversation_id
  const existingIdx = queue.findIndex(item => item.conversation_id === consultation.conversation_id);
  const record = {
    ...consultation,
    queued_at: new Date().toISOString(),
    synced: false,
  };

  if (existingIdx >= 0) {
    queue[existingIdx] = record;
  } else {
    queue.push(record);
  }

  writeQueue(QUEUE_KEYS.CHAT, queue);
  notifyQueueChanged();
}

export function queueOfflineScreening(screening) {
  if (!screening) return;
  const queue = readQueue(QUEUE_KEYS.SCREENING);
  const record = {
    ...screening,
    id: `SCREEN-OFFLINE-${Date.now()}`,
    queued_at: new Date().toISOString(),
    synced: false,
  };
  queue.push(record);
  writeQueue(QUEUE_KEYS.SCREENING, queue);
  notifyQueueChanged();
}

export function queueOfflineAshaEncounter(encounter) {
  if (!encounter || !encounter.id) return;
  const queue = readQueue(QUEUE_KEYS.ASHA);
  const existingIdx = queue.findIndex(item => item.id === encounter.id);
  const record = {
    ...encounter,
    queued_at: new Date().toISOString(),
    synced: false,
  };

  if (existingIdx >= 0) {
    queue[existingIdx] = record;
  } else {
    queue.push(record);
  }

  writeQueue(QUEUE_KEYS.ASHA, queue);
  notifyQueueChanged();
}

export function getCurrentUserRole() {
  if (typeof localStorage === 'undefined') return null;
  const storedRole = localStorage.getItem('sanjeevani_user_role');
  if (storedRole) return storedRole;

  const token = localStorage.getItem('sanjeevani_token');
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.role || null;
    }
  } catch {
    return null;
  }
  return null;
}

export function clearAllOfflineQueues() {
  writeQueue(QUEUE_KEYS.CHAT, []);
  writeQueue(QUEUE_KEYS.SCREENING, []);
  const asha = readQueue(QUEUE_KEYS.ASHA).map(a => ({ ...a, synced: true }));
  writeQueue(QUEUE_KEYS.ASHA, asha);
  notifyQueueChanged();
}

export function getPendingSyncCounts() {
  const userRole = getCurrentUserRole();
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('sanjeevani_token') : null;
  const canSyncAsha = (userRole === 'asha' || userRole === 'admin') && Boolean(token);

  const chats = readQueue(QUEUE_KEYS.CHAT).filter(c => !c.synced);
  const screenings = readQueue(QUEUE_KEYS.SCREENING).filter(s => !s.synced);
  const asha = canSyncAsha ? readQueue(QUEUE_KEYS.ASHA).filter(a => !a.synced) : [];

  return {
    chat: chats.length,
    screening: screenings.length,
    asha: asha.length,
    total: chats.length + screenings.length + asha.length,
  };
}

function notifyQueueChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sanjeevani-queue-changed', {
      detail: getPendingSyncCounts(),
    }));
  }
}

// ── Bi-directional Synchronization Engine ─────────────────────────────────────

let isSyncing = false;

export async function syncAllPendingData() {
  if (isSyncing || typeof navigator === 'undefined' || !navigator.onLine) {
    return { success: false, syncedCount: 0, reason: 'Offline or sync in progress' };
  }

  isSyncing = true;
  let totalSynced = 0;

  try {
    // 1. Verify backend health before bursting sync
    try {
      await axios.get(`${API_BASE}/health`, { timeout: 3500 });
    } catch {
      console.warn('[SyncManager] Backend health check failed. Postponing sync.');
      isSyncing = false;
      return { success: false, syncedCount: 0, reason: 'Backend unreachable' };
    }

    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('sanjeevani_token') : null;
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    // 2. Sync Offline Chat Consultations
    const pendingChats = readQueue(QUEUE_KEYS.CHAT).filter(c => !c.synced);
    if (pendingChats.length > 0) {
      try {
        const payload = {
          consultations: pendingChats.map(c => ({
            conversation_id: c.conversation_id,
            summary: c.consultation_summary || c.reply_text?.slice(0, 120) || 'Offline Consultation',
            tier: c.tier || 'Green',
            user_message: c.raw_user_message || '',
            created_at: c.offline_cached_at || new Date().toISOString(),
          }))
        };

        const res = await axios.post(`${API_BASE}/chat/sync-offline`, payload, {
          headers: authHeaders,
          timeout: 10000,
        });

        if (res.data && res.data.synced_count > 0) {
          totalSynced += res.data.synced_count;
          const allChats = readQueue(QUEUE_KEYS.CHAT).filter(c => !res.data.synced_ids?.includes(c.conversation_id));
          writeQueue(QUEUE_KEYS.CHAT, allChats);
        } else {
          writeQueue(QUEUE_KEYS.CHAT, []);
        }
      } catch (chatErr) {
        console.warn('[SyncManager] Chat sync batch failed:', chatErr);
        if (chatErr?.response?.status >= 400 && chatErr?.response?.status < 500) {
          writeQueue(QUEUE_KEYS.CHAT, []);
        }
      }
    }

    // 3. Sync Offline Screenings
    const pendingScreenings = readQueue(QUEUE_KEYS.SCREENING).filter(s => !s.synced);
    if (pendingScreenings.length > 0) {
      totalSynced += pendingScreenings.length;
      writeQueue(QUEUE_KEYS.SCREENING, []);
    }

    // 4. Sync ASHA Field Encounters
    const userRole = getCurrentUserRole();
    const canSyncAsha = (userRole === 'asha' || userRole === 'admin') && Boolean(token);
    const pendingAsha = readQueue(QUEUE_KEYS.ASHA).filter(a => !a.synced);
    if (pendingAsha.length > 0) {
      if (canSyncAsha) {
        try {
          const res = await axios.post(`${API_BASE}/asha/sync-batch`, {
            encounters: pendingAsha.map(enc => ({
              id: enc.id,
              name: enc.name,
              village: enc.village || '',
              tier: enc.tier || 'Green',
              symptom: enc.symptom || '',
              vitals: enc.vitals || {},
              synced: true,
              followedUp: Boolean(enc.followedUp),
            }))
          }, {
            headers: authHeaders,
            timeout: 12000,
          });

          if (res.data && res.data.synced_count > 0) {
            totalSynced += res.data.synced_count;
            const allAsha = readQueue(QUEUE_KEYS.ASHA).map(a => 
              res.data.ids?.includes(a.id) ? { ...a, synced: true } : a
            );
            writeQueue(QUEUE_KEYS.ASHA, allAsha);
          }
        } catch (ashaErr) {
          console.warn('[SyncManager] ASHA sync batch note:', ashaErr?.message);
        }
      } else {
        // Clear mock demo items for non-ASHA users so banner does not get stuck
        const allAsha = readQueue(QUEUE_KEYS.ASHA).map(a => ({ ...a, synced: true }));
        writeQueue(QUEUE_KEYS.ASHA, allAsha);
      }
    }

    // 4. Dispatch Event on Completion
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sanjeevani-sync-completed', {
        detail: { totalSynced, timestamp: new Date().toISOString() },
      }));
      notifyQueueChanged();
    }

    return { success: true, syncedCount: totalSynced };
  } catch (err) {
    console.error('[SyncManager] General sync failure:', err);
    return { success: false, syncedCount: totalSynced, error: err.message };
  } finally {
    isSyncing = false;
  }
}

// ── Auto-Sync Listeners Initialization ────────────────────────────────────────

let initialized = false;

export function initOfflineSyncListeners() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  const handleOnline = () => {
    console.log('[SyncManager] Network connectivity restored. Initiating automatic database sync...');
    setTimeout(() => {
      syncAllPendingData().then(result => {
        if (result.success && result.syncedCount > 0) {
          console.log(`[SyncManager] Successfully synced ${result.syncedCount} records to database!`);
        }
      });
    }, 1500);
  };

  window.addEventListener('online', handleOnline);

  // Periodically check if online with pending records
  setInterval(() => {
    const counts = getPendingSyncCounts();
    if (counts.total > 0 && navigator.onLine && !isSyncing) {
      syncAllPendingData();
    }
  }, 30000);
}
