import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Users, Plus, ChevronDown, Check, UserPlus, X, HeartPulse } from 'lucide-react';
import { getFamilyMembers, getActiveFamilyMember, setActiveFamilyMember, saveFamilyMember } from '../lib/familyStore';
import { useLanguage } from '../context/LanguageContext';

export default function FamilySelector({ onMemberChange }) {
  const { l } = useLanguage();
  const [members, setMembers] = useState(getFamilyMembers);
  const [activeMember, setActiveMember] = useState(getActiveFamilyMember);
  const [isOpen, setIsOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New member form state
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('');
  const [newGender, setNewGender] = useState('female');
  const [newConditions, setNewConditions] = useState([]);

  useEffect(() => {
    onMemberChange?.(activeMember);
  }, [activeMember, onMemberChange]);

  useEffect(() => {
    if (!showAddModal) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowAddModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal]);

  const handleSelect = (member) => {
    setActiveMember(member);
    setActiveFamilyMember(member.id);
    setIsOpen(false);
  };

  const handleCreateMember = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newAge) return;

    const ageNum = parseInt(newAge, 10);
    const avatar = ageNum < 12 ? '👶' : ageNum > 60 ? (newGender === 'female' ? '👵' : '👴') : (newGender === 'female' ? '👩' : '👨');
    const newMem = {
      id: `fam-${Date.now()}`,
      name: newName.trim(),
      age: ageNum,
      gender: newGender,
      knownConditions: newConditions,
      avatar,
      isPediatric: ageNum < 12,
      relationship: ageNum < 12 ? 'child' : ageNum > 60 ? 'elder' : 'other',
    };

    const updated = saveFamilyMember(newMem);
    setMembers(updated);
    setActiveMember(newMem);
    setActiveFamilyMember(newMem.id);
    setShowAddModal(false);
    setNewName('');
    setNewAge('');
    setNewConditions([]);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      {/* Selector Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-sage/10 dark:bg-booti-glow/10 hover:bg-sage/20 border border-sage/20 dark:border-booti-glow/20 text-xs font-bold text-sage dark:text-booti-glow transition-all cursor-pointer shadow-2xs"
        title={l('परिवार का सदस्य चुनें', 'Switch family member', 'Parivar ka sadasya chunein')}
      >
        <span className="text-sm">{activeMember.avatar || '👤'}</span>
        <span className="max-w-[85px] sm:max-w-[120px] truncate">{activeMember.name}</span>
        {activeMember.age && (
          <span className="hidden sm:inline-block text-[10px] px-1 py-0.2 bg-sage/20 rounded-md font-semibold">
            {activeMember.age}y
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-warm-indigo border border-sage/20 dark:border-gray-700 shadow-xl z-50 p-2 animate-fadeIn">
            <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {l('किसके लिए परामर्श ले रहे हैं?', 'Consulting for which member?', 'Kiske liye consult kar rahe hain?')}
            </div>

            <div className="space-y-1 max-h-56 overflow-y-auto">
              {members.map((mem) => {
                const isSelected = mem.id === activeMember.id;
                return (
                  <button
                    key={mem.id}
                    onClick={() => handleSelect(mem)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-all text-left ${
                      isSelected
                        ? 'bg-sage/15 dark:bg-booti-glow/15 text-sage dark:text-booti-glow font-extrabold'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-primary dark:text-cream'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-base">{mem.avatar || '👤'}</span>
                      <div className="truncate">
                        <div className="truncate">{mem.name}</div>
                        <div className="text-[10px] font-medium text-muted dark:text-gray-400">
                          {mem.age ? `${mem.age}y` : ''} {mem.isPediatric ? '• ' + l('बाल रोग', 'Pediatric', 'Child') : ''}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-sage dark:text-booti-glow shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-bold text-sage dark:text-booti-glow hover:bg-sage/10 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{l('+ नया सदस्य जोड़ें', '+ Add Family Member', '+ Naya Member Jodein')}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Add Member Modal (Portaled to document.body with z-[100] to avoid navbar obstruction) */}
      {showAddModal &&
        (typeof document !== 'undefined'
          ? createPortal(
              <div
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fadeIn"
                onClick={() => setShowAddModal(false)}
              >
                <div
                  className="relative w-full max-w-sm bg-white dark:bg-[#131E2B] rounded-3xl shadow-2xl border border-sage/20 dark:border-gray-700 p-5 sm:p-6 animate-fadeIn"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-sage dark:text-booti-glow" />
                      <h3 className="font-serif text-base font-bold text-primary dark:text-[#F4F6F0]">
                        {l('परिवार का सदस्य जोड़ें', 'Add Family Member', 'Family Member Jodein')}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateMember} className="space-y-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                        {l('नाम', 'Name', 'Naam')}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={l('उदा: बिटिया, पिताजी', 'e.g., Mother, Rahul', 'e.g., Mataji, Munna')}
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-cream focus:outline-none focus:ring-1 focus:ring-sage focus:border-sage"
                        autoFocus
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                          {l('उम्र (वर्ष)', 'Age (Years)', 'Umar (Age)')}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="120"
                          required
                          placeholder="4"
                          value={newAge}
                          onChange={(e) => setNewAge(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-cream focus:outline-none focus:ring-1 focus:ring-sage focus:border-sage"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                          {l('लिंग', 'Gender', 'Gender')}
                        </label>
                        <select
                          value={newGender}
                          onChange={(e) => setNewGender(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-cream focus:outline-none focus:ring-1 focus:ring-sage focus:border-sage"
                        >
                          <option value="male">{l('पुरुष', 'Male', 'Purush')}</option>
                          <option value="female">{l('महिला', 'Female', 'Mahila')}</option>
                          <option value="other">{l('अन्य', 'Other', 'Other')}</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-2 border-t border-gray-100 dark:border-gray-800">
                      <button
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        className="px-3.5 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors cursor-pointer"
                      >
                        {l('रद्द करें', 'Cancel', 'Cancel')}
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-bold bg-sage text-white rounded-xl hover:bg-sage/90 shadow-sm transition-all cursor-pointer"
                      >
                        {l('सहेजें', 'Save', 'Save')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>,
              document.body
            )
          : null)}
    </div>
  );
}
