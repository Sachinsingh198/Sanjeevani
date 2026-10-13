/**
 * Sanjeevani 24h/48h Proactive Follow-Up Recovery Store
 * Schedules, tracks, and escalates post-consultation health status.
 */

const STORAGE_KEY = 'sanjeevani_followups';

export function scheduleFollowUp({
  conversationId,
  condition = 'Lakshan',
  tier = 'Green',
  patientName = 'Self',
  hours = 24,
}) {
  try {
    const scheduledAt = Date.now();
    const dueAt = scheduledAt + hours * 60 * 60 * 1000;
    const followUp = {
      id: `fu-${Date.now()}`,
      conversationId,
      condition,
      tier,
      patientName,
      scheduledAt,
      dueAt,
      status: 'pending', // 'pending' | 'completed' | 'dismissed'
    };

    const existing = getAllFollowUps().filter(f => f.status === 'pending');
    localStorage.setItem(STORAGE_KEY, JSON.stringify([followUp, ...existing].slice(0, 5)));
    return followUp;
  } catch (e) {
    console.warn('Failed scheduling follow-up:', e);
    return null;
  }
}

export function getAllFollowUps() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function getPendingFollowUp() {
  try {
    const followups = getAllFollowUps();
    const now = Date.now();
    // Return pending follow-up if created or due
    return followups.find(f => f.status === 'pending') || null;
  } catch {
    return null;
  }
}

export function updateFollowUpStatus(id, outcome) {
  try {
    const all = getAllFollowUps();
    const updated = all.map(f => {
      if (f.id === id) {
        return { ...f, status: outcome, completedAt: Date.now() };
      }
      return f;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function getWorsenedFollowUps() {
  try {
    const all = getAllFollowUps();
    return all.filter(f => f.status === 'worsened');
  } catch {
    return [];
  }
}

export function markFollowUpHandled(id) {
  return updateFollowUpStatus(id, 'resolved');
}

