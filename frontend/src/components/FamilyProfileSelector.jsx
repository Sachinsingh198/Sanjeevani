import React, { useState, useEffect } from 'react';
import { Users, Plus, Check, User, Heart, X, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const FAMILY_STORAGE_KEY = 'sanjeevani_family_profiles_v1';
const ACTIVE_PROFILE_KEY = 'sanjeevani_active_profile_id';

const DEFAULT_MEMBERS = [
  { id: 'self', name: 'स्वयं (Self)', relation: 'Self', age: '', icon: '👤' },
  { id: 'dadi', name: 'दादी जी (Grandmother)', relation: 'Grandmother', age: '72', icon: '👵' },
  { id: 'child', name: 'बच्चा (Child)', relation: 'Child', age: '8', icon: '👶' },
];

export default function FamilyProfileSelector({ onProfileChange }) {
  const [members, setMembers] = useState(() => {
    try {
      const saved = localStorage.getItem(FAMILY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_MEMBERS;
    } catch {
      return DEFAULT_MEMBERS;
    }
  });

  const [activeId, setActiveId] = useState(() => {
    return localStorage.getItem(ACTIVE_PROFILE_KEY) || 'self';
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelation, setNewRelation] = useState('माता जी (Mother)');
  const [newAge, setNewAge] = useState('');

  const activeMember = members.find(m => m.id === activeId) || members[0];

  const handleSelect = (member) => {
    setActiveId(member.id);
    localStorage.setItem(ACTIVE_PROFILE_KEY, member.id);
    toast.success(`प्रोफ़ाइल बदली: ${member.name}`);
    if (onProfileChange) onProfileChange(member);
  };

  const handleAddMember = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    let icon = '👤';
    if (newRelation.includes('दादी') || newRelation.includes('नानी') || newRelation.includes('Grandmother')) icon = '👵';
    else if (newRelation.includes('दादा') || newRelation.includes('नाना') || newRelation.includes('Grandfather')) icon = '👴';
    else if (newRelation.includes('बच्चा') || newRelation.includes('Child')) icon = '👶';
    else if (newRelation.includes('माता') || newRelation.includes('Mother')) icon = '👩';
    else if (newRelation.includes('पिता') || newRelation.includes('Father')) icon = '👨';

    const newMember = {
      id: `fam-${Date.now()}`,
      name: `${newName.trim()} (${newRelation.split(' ')[0]})`,
      relation: newRelation,
      age: newAge.trim(),
      icon,
    };

    const updated = [...members, newMember];
    setMembers(updated);
    localStorage.setItem(FAMILY_STORAGE_KEY, JSON.stringify(updated));
    setActiveId(newMember.id);
    localStorage.setItem(ACTIVE_PROFILE_KEY, newMember.id);
    
    setNewName('');
    setNewAge('');
    setShowAddModal(false);
    toast.success(`${newMember.name} को परिवार में जोड़ा गया! 🌿`);
    if (onProfileChange) onProfileChange(newMember);
  };

  return (
    <div className="bg-white/80 dark:bg-card/80 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-sage/20 dark:border-gray-800 shadow-2xs">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-sage" />
          <span className="text-xs font-bold text-primary">
            परिवार के सदस्य (Family Profiles):
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-sage dark:text-booti-glow hover:underline cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>सदस्य जोड़ें</span>
        </button>
      </div>

      {/* Pill row */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        {members.map((m) => {
          const isSelected = m.id === activeId;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => handleSelect(m)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-sage text-white border-sage shadow-xs ring-2 ring-sage/20'
                  : 'bg-mist/70 dark:bg-card text-primary border-gray-200 dark:border-gray-700 hover:border-sage/40'
              }`}
            >
              <span>{m.icon}</span>
              <span className="truncate max-w-[120px]">{m.name}</span>
              {isSelected && <Check className="w-3 h-3 text-white" />}
            </button>
          );
        })}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-sm bg-white dark:bg-[#131E2B] rounded-3xl p-5 border border-sage/20 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
              <h4 className="font-serif font-bold text-sm text-primary flex items-center gap-1.5">
                <Users className="w-4 h-4 text-sage" />
                <span>नया पारिवारिक सदस्य जोड़ें</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-gray-400 hover:text-primary rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-muted mb-1">
                  नाम (Name) *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="उदा. शांति देवी या राहुल"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-mist/50 dark:bg-card text-primary focus:outline-none focus:ring-1 focus:ring-sage"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-muted mb-1">
                    रिश्ता (Relation)
                  </label>
                  <select
                    value={newRelation}
                    onChange={(e) => setNewRelation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-mist/50 dark:bg-card text-primary focus:outline-none focus:ring-1 focus:ring-sage"
                  >
                    <option value="दादी जी (Grandmother)">दादी जी</option>
                    <option value="दादा जी (Grandfather)">दादा जी</option>
                    <option value="माता जी (Mother)">माता जी</option>
                    <option value="पिता जी (Father)">पिता जी</option>
                    <option value="बच्चा (Child)">बच्चा</option>
                    <option value="अन्य (Relative)">अन्य</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted mb-1">
                    उम्र (Age in Years)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="110"
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    placeholder="उदा. 68"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-mist/50 dark:bg-card text-primary focus:outline-none focus:ring-1 focus:ring-sage"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 rounded-xl border border-gray-300 dark:border-gray-700 font-bold"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-sage text-white font-bold hover:bg-sage/90"
                >
                  जोड़ें (Add)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
