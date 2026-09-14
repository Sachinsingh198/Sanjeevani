import React from 'react';

/**
 * SymptomChips — new feature.
 *
 * Many rural patients (especially elderly users) find typing symptoms in
 * Hindi/Garhwali slower and more error-prone than picking a familiar phrase.
 * These are common Manchester-Triage-style chief complaints the backend
 * already recognises. Tapping a chip fills (and can auto-send) the input,
 * so a full consultation is possible with almost no typing.
 */
const COMMON_SYMPTOMS = [
  { hi: 'Bukhar hai (fever)', value: 'Mujhe 2 din se bukhar hai' },
  { hi: 'Khansi aur zukam', value: 'Khansi aur zukam ho raha hai' },
  { hi: 'Pet dard', value: 'Pet mein dard ho raha hai' },
  { hi: 'Sar dard', value: 'Sar mein dard ho raha hai' },
  { hi: 'Chakkar aana', value: 'Chakkar aa rahe hain' },
  { hi: 'Kamzori/thakaan', value: 'Bahut kamzori aur thakaan lag rahi hai' },
  { hi: 'Jodo mein dard', value: 'Jodo mein dard ho raha hai' },
  { hi: 'Ulti/loose motion', value: 'Ulti aur loose motion ho rahe hain' },
];

export default function SymptomChips({ onPick, disabled }) {
  return (
    <div className="flex flex-wrap gap-2 px-1">
      {COMMON_SYMPTOMS.map((s) => (
        <button
          key={s.hi}
          type="button"
          disabled={disabled}
          onClick={() => onPick(s.value)}
          className="text-xs bg-sage-light text-sage font-medium px-3 py-1.5 rounded-full border border-sage/20 hover:bg-sage hover:text-white transition-colors disabled:opacity-40"
        >
          {s.hi}
        </button>
      ))}
    </div>
  );
}
