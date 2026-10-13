/**
 * Sanjeevani Family Profile Management
 * Enables household phone sharing with clinical context adaptation:
 * - Pediatric safety boundaries (age < 12)
 * - Geriatric caution flags (age > 60)
 * - Persistent condition profiles
 */

const STORAGE_KEY = 'sanjeevani_family_members';
const ACTIVE_MEMBER_KEY = 'sanjeevani_active_family_member';

export const DEFAULT_PROFILES = [
  {
    id: 'self',
    name: 'Swayam / Self',
    age: 28,
    gender: 'other',
    relationship: 'self',
    knownConditions: [],
    avatar: '👤',
  },
  {
    id: 'elder_parent',
    name: 'Mataji / Pitaji',
    age: 62,
    gender: 'female',
    relationship: 'parent',
    knownConditions: ['hypertension'],
    avatar: '👵',
  },
  {
    id: 'child',
    name: 'Munna / Baby',
    age: 4,
    gender: 'male',
    relationship: 'child',
    knownConditions: [],
    avatar: '👶',
    isPediatric: true,
  },
];

export function getFamilyMembers() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_PROFILES;
}

export function saveFamilyMember(member) {
  try {
    const current = getFamilyMembers();
    const existingIdx = current.findIndex(m => m.id === member.id);
    let updated;
    if (existingIdx >= 0) {
      updated = [...current];
      updated[existingIdx] = { ...updated[existingIdx], ...member };
    } else {
      updated = [...current, { ...member, id: member.id || `fam-${Date.now()}` }];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed saving family member:', e);
    return getFamilyMembers();
  }
}

export function getActiveFamilyMember() {
  try {
    const activeId = localStorage.getItem(ACTIVE_MEMBER_KEY);
    const members = getFamilyMembers();
    if (activeId) {
      const found = members.find(m => m.id === activeId);
      if (found) return found;
    }
    return members[0] || DEFAULT_PROFILES[0];
  } catch {
    return DEFAULT_PROFILES[0];
  }
}

export function setActiveFamilyMember(id) {
  try {
    localStorage.setItem(ACTIVE_MEMBER_KEY, id);
  } catch {}
}
