import React, { useMemo } from 'react';
import { AlertTriangle, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';

/**
 * FollowUpPanel — surfaces Red/Yellow tier patients that still need a
 * check-in call or visit, sorted by urgency. Sits alongside the log so
 * an ASHA worker's most time-sensitive cases are never buried in a list.
 */
export default function FollowUpPanel({ patients, onMarkFollowedUp }) {
  const needsFollowUp = useMemo(
    () =>
      patients
        .filter((p) => (p.tier === 'Red' || p.tier === 'Yellow') && !p.followedUp)
        .sort((a, b) => (a.tier === 'Red' ? -1 : 1)),
    [patients]
  );

  if (needsFollowUp.length === 0) {
    return (
      <div className="bg-[#5A7855]/10 dark:bg-[#5A7855]/20 border border-[#5A7855]/30 rounded-3xl p-5 flex items-center gap-3 text-xs sm:text-sm text-[#5A7855] dark:text-[#8ED14C] font-semibold shadow-xs">
        <CheckCircle2 className="w-5 h-5 shrink-0" />
        <span>Sabhi Red aur Yellow tier marijon ka follow-up check-in pura ho chuka hai. ✨</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1E2A43] rounded-3xl border border-[#B85042]/30 shadow-xs overflow-hidden">
      <div className="p-4 sm:p-5 bg-[#B85042]/10 dark:bg-[#B85042]/15 border-b border-[#B85042]/20 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 text-[#B85042] dark:text-[#FF7878]">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <h3 className="font-serif font-bold text-base text-[#2E4057] dark:text-[#F4F6F0]">
            Jaroori Follow-Up ({needsFollowUp.length})
          </h3>
        </div>
        <span className="text-[10px] font-bold bg-[#B85042] text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          Prathmikta
        </span>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {needsFollowUp.map((p) => (
          <div key={p.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#2E4057] dark:text-[#F4F6F0] truncate">{p.name}</p>
              <p className="text-xs text-[#556376] dark:text-[#A8B4C2] mt-0.5 truncate">{p.village} • {p.symptom}</p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full text-white ${
                p.tier === 'Red' ? 'bg-[#B85042]' : 'bg-[#D4A359] text-[#2E4057]'
              }`}>
                Tier {p.tier}
              </span>
              <button
                onClick={() => onMarkFollowedUp(p.id)}
                className="touch-target flex items-center gap-1.5 text-xs font-bold text-[#5A7855] dark:text-[#8ED14C] bg-[#5A7855]/10 hover:bg-[#5A7855] hover:text-white px-3.5 py-2 rounded-xl transition-all"
                title="Mark as followed up"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Mark Done</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}