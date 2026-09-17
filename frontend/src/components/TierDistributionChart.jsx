import React from 'react';
import { BarChart3 } from 'lucide-react';

/**
 * TierDistributionChart — dependency-free bar chart showing Red/Yellow/Green
 * case volume, so admins get a system-health signal beyond raw user counts.
 */
export default function TierDistributionChart({ counts = { red: 0, yellow: 0, green: 0 } }) {
  const total = counts.red + counts.yellow + counts.green || 1;
  const bars = [
    { label: 'Red (Urgent / 108 Dispatch)', value: counts.red, color: 'bg-[#B85042]' },
    { label: 'Yellow (PHC Clinic Review)', value: counts.yellow, color: 'bg-[#D4A359]' },
    { label: 'Green (Gharelu Upchar / Mild)', value: counts.green, color: 'bg-[#5A7855]' },
  ];

  return (
    <div className="bg-white dark:bg-[#1E2A43] rounded-3xl p-6 border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col justify-between">
      <div>
        <h3 className="font-serif font-bold text-base text-[#2E4057] dark:text-[#F4F6F0] mb-2 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#5A7855] dark:text-[#8ED14C]" /> Triage Tier Distribution
        </h3>
        <p className="text-xs text-[#556376] dark:text-[#A8B4C2] mb-4">
          Encounter risk breakdown across the district.
        </p>

        <div className="space-y-4">
          {bars.map((b) => (
            <div key={b.label}>
              <div className="flex justify-between text-xs font-semibold text-[#2E4057] dark:text-[#F4F6F0] mb-1.5">
                <span>{b.label}</span>
                <span className="font-mono">{b.value} ({Math.round((b.value / total) * 100)}%)</span>
              </div>
              <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${b.color} rounded-full transition-all duration-500`}
                  style={{ width: `${(b.value / total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-[#556376] dark:text-[#A8B4C2] mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
        Total Evaluated: <strong className="text-[#2E4057] dark:text-[#F4F6F0] font-mono">{total} encounters</strong>
      </p>
    </div>
  );
}