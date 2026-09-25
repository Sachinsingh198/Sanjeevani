import React, { useState } from 'react';
import { ShieldCheck, BookOpen, ChevronDown, ChevronUp, Leaf } from 'lucide-react';

/**
 * RemedyCard — displays a single verified AYUSH remedy with:
 * - Herb icon, remedy name, source badge
 * - Expandable preparation instructions
 * - Ayurvedic note and safety verification status
 */
export default function RemedyCard({ remedy, index = 0 }) {
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <div
      className={`
        mt-3 rounded-2xl border overflow-hidden transition-all duration-300
        bg-gradient-to-br from-[#f0f7ee] to-white dark:from-[#1A261C] dark:to-[#141E28] border-[#5F7A52]/25 dark:border-[#5F7A52]/40 shadow-sm
      `}
    >
      {/* Header Row */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-[#5F7A52]/5 dark:hover:bg-[#5F7A52]/15 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-[#5F7A52] flex items-center justify-center shrink-0 shadow-sm">
          <Leaf className="w-4.5 h-4.5 text-white" size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-[#1C2B4A] dark:text-[#F4F6F0] text-sm leading-tight truncate">
            {remedy.remedy_name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#3B5430] dark:text-[#8ED14C]" />
            <span className="text-xs text-[#3B5430] dark:text-[#8ED14C] font-bold uppercase tracking-wide">
              Safety Verified
            </span>
          </div>
        </div>

        <div className="shrink-0 text-gray-400">
          {expanded
            ? <ChevronUp className="w-4 h-4" />
            : <ChevronDown className="w-4 h-4" />
          }
        </div>
      </button>

      {/* Expanded Body */}
      {expanded && (
        <div className="px-3.5 pb-3.5 border-t border-[#5F7A52]/10 pt-3 space-y-2.5">
          {/* Preparation Instructions */}
          <div>
            <p className="text-xs uppercase font-extrabold tracking-wider text-[#3B5430] dark:text-[#8ED14C] mb-1">
              Preparation & Dosage
            </p>
            <p className="text-xs text-[#1E2A43] dark:text-[#EAEFEA] leading-relaxed">
              {remedy.remedy_text}
            </p>
          </div>

          {/* Ayurvedic Note */}
          {remedy.ayurvedic_note && (
            <div className="bg-[#E8A33D]/10 border border-[#E8A33D]/30 rounded-xl p-2.5">
              <p className="text-xs uppercase font-extrabold tracking-wider text-[#8C5E24] dark:text-[#D4A359] mb-0.5">
                Ayurvedic Rationale
              </p>
              <p className="text-xs text-[#5D3D10] dark:text-[#F3E2C4] leading-relaxed">
                {remedy.ayurvedic_note}
              </p>
            </div>
          )}

          {/* Footer: Source + Safety */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5 text-xs text-[#2E4057] dark:text-[#A8B4C2]">
              <BookOpen className="w-3.5 h-3.5" />
              <span className="truncate max-w-[160px] font-medium">{remedy.source}</span>
            </div>
            <span className="text-xs font-bold text-[#3B5430] dark:text-[#8ED14C] bg-[#5F7A52]/15 px-2.5 py-0.5 rounded-full">
              ✓ {remedy.safety_check}
            </span>
          </div>
        </div>
      )}

      {/* Always-visible AI estimation disclaimer */}
      <div className="px-3.5 py-2 bg-black/5 dark:bg-white/5 border-t border-[#5F7A52]/10 text-xs text-[#374151] dark:text-[#D1D5DB] text-center font-medium italic">
        Yeh AI ka anumaan hai, doctor ka nidaan nahi — This is an AI estimate, not a doctor's diagnosis
      </div>
    </div>
  );
}
