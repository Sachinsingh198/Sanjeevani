import React, { useMemo, useState, useEffect } from 'react';
import { AlertTriangle, Clock, CheckCircle2, ShieldAlert, PhoneCall, HeartPulse } from 'lucide-react';
import { getWorsenedFollowUps, markFollowUpHandled } from '../lib/followUpStore';
import { useLanguage } from '../context/LanguageContext';

/**
 * FollowUpPanel — surfaces Red/Yellow tier patients and community 24h
 * post-consultation escalations (patients who marked 'Worsened / No Relief')
 * so an ASHA worker can immediately conduct a home visit or phone check-in.
 */
export default function FollowUpPanel({ patients = [], onMarkFollowedUp }) {
  const { l, toEnglishDigits } = useLanguage();
  const [worsenedCheckins, setWorsenedCheckins] = useState(getWorsenedFollowUps);

  useEffect(() => {
    setWorsenedCheckins(getWorsenedFollowUps());
  }, []);

  const handleResolveCheckin = (id) => {
    markFollowUpHandled(id);
    setWorsenedCheckins(getWorsenedFollowUps());
  };

  const needsFollowUp = useMemo(
    () =>
      patients
        .filter((p) => (p.tier === 'Red' || p.tier === 'Yellow') && !p.followedUp)
        .sort((a, b) => (a.tier === 'Red' ? -1 : 1)),
    [patients]
  );

  const totalUrgent = needsFollowUp.length + worsenedCheckins.length;

  if (totalUrgent === 0) {
    return (
      <div className="bg-sage/10 dark:bg-sage/20 border border-sage/30 rounded-3xl p-5 flex items-center gap-3 text-xs sm:text-sm text-sage dark:text-booti-glow font-semibold shadow-xs">
        <CheckCircle2 className="w-5 h-5 shrink-0" />
        <span>
          {l(
            'सभी लाल व पीली श्रेणी मरीजों का फॉलो-अप व रिकवरी चेक-इन पूरा हो चुका है। ✨',
            'All high-priority patient follow-ups and recovery check-ins are up to date. ✨',
            'Sabhi Red aur Yellow tier marijon ka follow-up check-in pura ho chuka hai. ✨'
          )}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-card rounded-3xl border border-rose-soft/30 shadow-xs overflow-hidden space-y-0">
      <div className="p-4 sm:p-5 bg-rose-soft/10 dark:bg-rose-soft/15 border-b border-rose-soft/20 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 text-rose-soft dark:text-[#FF7878]">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <h3 className="font-serif font-bold text-base text-primary">
            {l('ज़रूरी फॉलो-अप', 'Critical Follow-Up', 'Zaroori Follow-Up')} ({toEnglishDigits(totalUrgent)})
          </h3>
        </div>
        <span className="text-[10px] font-bold bg-rose-soft text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          {l('प्राथमिकता', 'Priority', 'Prathmikta')}
        </span>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {/* 1. Community 24h Check-in Escalations (Patient Reported 'Worsened') */}
        {worsenedCheckins.map((fu) => (
          <div
            key={fu.id}
            className="p-4 sm:p-5 bg-rose-50/70 dark:bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-rose-100/50 dark:hover:bg-rose-950/30 transition-colors border-l-4 border-l-rose-soft"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-rose-soft text-white flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {l('24 घंटे फॉलो-अप चेतावनी', '24h Recovery Alert', '24h Follow-Up Alert')}
                </span>
                <span className="text-xs font-bold text-primary truncate">
                  {fu.patientName || l('मरीज', 'Patient', 'Mareez')}
                </span>
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-300 font-semibold mt-1">
                {l('मरीज ने बताया: आराम नहीं मिला / लक्षण बिगड़े', 'Patient reported: No relief / worsening symptoms', 'Mareez ne bataya: Aaram nahi mila / lakshan bigde')} • {fu.condition}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => handleResolveCheckin(fu.id)}
                className="touch-target flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-200 bg-rose-200/50 dark:bg-rose-900/40 hover:bg-rose-soft hover:text-white px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                title="Mark handled"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{l('जांच पूरी की', 'Mark Handled', 'Check Pura Kiya')}</span>
              </button>
            </div>
          </div>
        ))}

        {/* 2. Standard Red/Yellow queue cases */}
        {needsFollowUp.map((p) => (
          <div key={p.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
            <div className="min-w-0">
              <p className="text-sm font-bold text-primary truncate">{p.name}</p>
              <p className="text-xs text-muted mt-0.5 truncate">{p.village} • {p.symptom}</p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full text-white ${
                p.tier === 'Red' ? 'bg-rose-soft' : 'bg-gold-warm text-primary'
              }`}>
                Tier {p.tier}
              </span>
              <button
                type="button"
                onClick={() => onMarkFollowedUp(p.id)}
                className="touch-target flex items-center gap-1.5 text-xs font-bold text-sage dark:text-booti-glow bg-sage/10 hover:bg-sage hover:text-white px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                title="Mark as followed up"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{l('पूरा हुआ', 'Mark Done', 'Pura Hua')}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}