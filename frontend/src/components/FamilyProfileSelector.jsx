import React, { useState, useEffect } from 'react';
import { Users, Plus, Check, User, Heart, X, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getFamilyMembers,
  getActiveFamilyMember,
  setActiveFamilyMember,
  saveFamilyMember,
} from '../lib/familyStore';
import { useLanguage } from '../context/LanguageContext';

export default function FamilyProfileSelector({ onProfileChange }) {
  const { l, toEnglishDigits } = useLanguage();
  const [members, setMembers] = useState(getFamilyMembers);
  const [activeMember, setActiveMember] = useState(getActiveFamilyMember);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelation, setNewRelation] = useState('parent');
  const [newAge, setNewAge] = useState('');
  const [newGender, setNewGender] = useState('female');

  useEffect(() => {
    const cur = getActiveFamilyMember();
    setActiveMember(cur);
    if (onProfileChange) onProfileChange(cur);
  }, [onProfileChange]);

  const handleSelect = (member) => {
    setActiveMember(member);
    setActiveFamilyMember(member.id);
    toast.success(
      l(
        `प्रोफ़ाइल बदली: ${member.name}`,
        `Profile switched to: ${member.name}`,
        `Profile change hua: ${member.name}`
      )
    );
    if (onProfileChange) onProfileChange(member);
  };

  const handleAddMember = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const ageNum = parseInt(newAge, 10) || 0;
    let avatar = '👤';
    if (ageNum < 12 || newRelation === 'child') avatar = '👶';
    else if (ageNum > 60 || newRelation === 'elder') avatar = newGender === 'female' ? '👵' : '👴';
    else avatar = newGender === 'female' ? '👩' : '👨';

    const newMember = {
      id: `fam-${Date.now()}`,
      name: newName.trim(),
      relationship: newRelation,
      age: ageNum || undefined,
      gender: newGender,
      avatar,
      isPediatric: ageNum > 0 && ageNum < 12,
      knownConditions: [],
    };

    const updated = saveFamilyMember(newMember);
    setMembers(updated);
    setActiveMember(newMember);
    setActiveFamilyMember(newMember.id);

    setNewName('');
    setNewAge('');
    setShowAddModal(false);
    toast.success(
      l(
        `${newMember.name} को परिवार में जोड़ा गया! 🌿`,
        `${newMember.name} added to family profiles! 🌿`,
        `${newMember.name} parivar mein add ho gaya! 🌿`
      )
    );
    if (onProfileChange) onProfileChange(newMember);
  };

  return (
    <div className="bg-white/80 dark:bg-card/80 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-sage/20 dark:border-gray-800 shadow-2xs">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-sage" />
          <span className="text-xs font-bold text-primary">
            {l('परिवार के सदस्य (Family Profiles):', 'Family Members (Shared Device):', 'Parivar ke Sadasya (Family Profiles):')}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-sage dark:text-booti-glow hover:underline cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{l('सदस्य जोड़ें', 'Add Member', 'Sadasya Jodein')}</span>
        </button>
      </div>

      {/* Pill row */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        {members.map((m) => {
          const isSelected = m.id === activeMember?.id;
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
              <span>{m.avatar || m.icon || '👤'}</span>
              <span className="truncate max-w-[120px]">{m.name}</span>
              {m.age ? (
                <span className="text-[10px] opacity-80">
                  ({toEnglishDigits(m.age)}y)
                </span>
              ) : null}
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
                <span>{l('नया पारिवारिक सदस्य जोड़ें', 'Add New Family Member', 'Naya Family Member Jodein')}</span>
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
                  {l('नाम (Name) *', 'Name *', 'Naam *')}
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={l('उदा. शांति देवी या राहुल', 'e.g. Shanti Devi or Rahul', 'e.g. Shanti Devi ya Rahul')}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-mist/50 dark:bg-card text-primary focus:outline-none focus:ring-1 focus:ring-sage"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-muted mb-1">
                    {l('रिश्ता (Relation)', 'Relationship', 'Rishta')}
                  </label>
                  <select
                    value={newRelation}
                    onChange={(e) => setNewRelation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-mist/50 dark:bg-card text-primary focus:outline-none focus:ring-1 focus:ring-sage"
                  >
                    <option value="parent">{l('माता / पिता (Parent)', 'Parent', 'Mata / Pita')}</option>
                    <option value="elder">{l('दादी / दादा (Grandparent)', 'Grandparent', 'Dadi / Dada')}</option>
                    <option value="child">{l('बच्चा (Child)', 'Child', 'Bachha')}</option>
                    <option value="spouse">{l('जीवनसाथी (Spouse)', 'Spouse', 'Pati / Patni')}</option>
                    <option value="other">{l('अन्य (Relative)', 'Other', 'Anya')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted mb-1">
                    {l('उम्र (Age in Years)', 'Age (Years)', 'Umar (Age)')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="115"
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    placeholder="68"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-mist/50 dark:bg-card text-primary focus:outline-none focus:ring-1 focus:ring-sage"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted mb-1">
                  {l('लिंग (Gender)', 'Gender', 'Gender')}
                </label>
                <div className="flex gap-2">
                  {[
                    { key: 'female', label: l('महिला', 'Female', 'Mahila') },
                    { key: 'male', label: l('पुरुष', 'Male', 'Purush') },
                    { key: 'other', label: l('अन्य', 'Other', 'Other') },
                  ].map(g => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setNewGender(g.key)}
                      className={`flex-1 py-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                        newGender === g.key
                          ? 'bg-sage text-white border-sage'
                          : 'bg-mist dark:bg-card text-primary border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 rounded-xl border border-gray-300 dark:border-gray-700 font-bold"
                >
                  {l('रद्द करें', 'Cancel', 'Radd karein')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-sage text-white font-bold hover:bg-sage/90"
                >
                  {l('जोड़ें', 'Add', 'Jodein')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
