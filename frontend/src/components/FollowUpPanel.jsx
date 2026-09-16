import React, { useMemo } from 'react';
import { AlertTriangle, Clock, CheckCircle2, PhoneCall } from 'lucide-react';

/**
 * FollowUpPanel — surfaces Red/Yellow tier patients that still need a
 * check-in call or visit, sorted by urgency. Sits above the full log so
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
      <div className="bg-sage-light rounded-2xl p-4 flex items-center gap-2 text-sm text-sage font-medium">
        <CheckCircle2 className="w-4 h-4" /> All Red/Yellow tier patients are followed up.
      </div>
    );
  }

  return (
    <div className="bg-card rounded-3xl border border-rose-soft/20 shadow-sm overflow-hidden">
      <div className="p-4 bg-rose-soft/5 border-b border-rose-soft/15 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-rose-soft" />
        <h3 className="font-serif font-bold text-base text-primary">
          Needs Follow-Up ({needsFollowUp.length})
        </h3>
      </div>
      <div className="divide-y divide-black/5">
        {needsFollowUp.map((p) => (
          <div key={p.id} className="p-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary truncate">{p.name}</p>
              <p className="text-xs text-muted truncate">{p.village} • {p.symptom}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${
                p.tier === 'Red' ? 'bg-rose-soft' : 'bg-gold-warm'
              }`}>
                {p.tier}
              </span>
              <button
                onClick={() => onMarkFollowedUp(p.id)}
                className="flex items-center gap-1 text-xs font-semibold text-sage hover:bg-sage-light px-2.5 py-1.5 rounded-lg transition-colors"
                title="Mark as followed up"
              >
                <Clock className="w-3.5 h-3.5" /> Mark Done
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}