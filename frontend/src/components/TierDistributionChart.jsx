import React from 'react';
import { BarChart3, AlertCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

/**
 * TierDistributionChart — production-grade triage tier visualization
 * featuring an interactive SVG Donut chart alongside detailed risk progress bars.
 */
export default function TierDistributionChart({ counts = { red: 0, yellow: 0, green: 0 } }) {
  const rCount = counts.red || 0;
  const yCount = counts.yellow || 0;
  const gCount = counts.green || 0;
  const total = rCount + yCount + gCount || 1;

  const redPct = Math.round((rCount / total) * 100);
  const yellowPct = Math.round((yCount / total) * 100);
  const greenPct = Math.round((gCount / total) * 100);

  // SVG Donut calculation (circumference = 2 * PI * 38 ≈ 238.76)
  const radius = 38;
  const circ = 2 * Math.PI * radius;
  const redStroke = (rCount / total) * circ;
  const yellowStroke = (yCount / total) * circ;
  const greenStroke = (gCount / total) * circ;

  const redOffset = 0;
  const yellowOffset = -redStroke;
  const greenOffset = -(redStroke + yellowStroke);

  const tiers = [
    {
      label: 'Red — आपातकाल / Urgent 108',
      desc: 'Immediate clinical dispatch & CHC escalation',
      value: rCount,
      pct: redPct,
      color: '#B85042',
      bgBar: 'bg-[#B85042]',
      icon: AlertCircle,
    },
    {
      label: 'Yellow — मध्यम / Clinic Review',
      desc: 'PHC doctor follow-up within 24 hours',
      value: yCount,
      pct: yellowPct,
      color: '#D4A359',
      bgBar: 'bg-[#D4A359]',
      icon: AlertTriangle,
    },
    {
      label: 'Green — सामान्य / Self-Care',
      desc: 'AYUSH herbal remedies & home monitoring',
      value: gCount,
      pct: greenPct,
      color: '#4A6845',
      bgBar: 'bg-[#4A6845]',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="bg-white dark:bg-warm-indigo rounded-3xl p-5 sm:p-6 border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="font-serif font-bold text-base text-primary flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sage dark:text-booti-glow" />
            <span>Triage Tier Breakdown (ट्राइएज स्तर वितरण)</span>
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sage/15 text-sage dark:text-booti-glow">
            Live Field Stats
          </span>
        </div>
        <p className="text-xs text-muted dark:text-muted mb-4">
          Gopeshwar & Chamoli block ke swasthya mamlo ka risk-tier anupaat.
        </p>

        {/* Donut Chart + Summary Stats Row */}
        <div className="flex flex-col sm:flex-row items-center gap-5 my-4 bg-mist/60 dark:bg-card/40 p-4 rounded-2xl border border-sage/15">
          {/* SVG Donut */}
          <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke="currentColor"
                strokeWidth="11"
                className="text-gray-100 dark:text-gray-800"
              />
              {/* Green Segment */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke="#4A6845"
                strokeWidth="11"
                strokeDasharray={`${greenStroke} ${circ - greenStroke}`}
                strokeDashoffset={greenOffset}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
              {/* Yellow Segment */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke="#D4A359"
                strokeWidth="11"
                strokeDasharray={`${yellowStroke} ${circ - yellowStroke}`}
                strokeDashoffset={yellowOffset}
                className="transition-all duration-700"
              />
              {/* Red Segment */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke="#B85042"
                strokeWidth="11"
                strokeDasharray={`${redStroke} ${circ - redStroke}`}
                strokeDashoffset={redOffset}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="font-serif font-bold text-base text-primary leading-tight">
                {rCount + yCount + gCount}
              </span>
              <span className="text-[9px] uppercase font-bold text-muted dark:text-muted">Total</span>
            </div>
          </div>

          {/* Quick Metrics Key */}
          <div className="grid grid-cols-3 sm:grid-cols-1 gap-2 flex-1 w-full text-center sm:text-left">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#B85042] shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-primary">{rCount}</span>
                <span className="text-muted dark:text-muted text-[11px] ml-1">Red ({redPct}%)</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4A359] shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-primary">{yCount}</span>
                <span className="text-muted dark:text-muted text-[11px] ml-1">Yellow ({yellowPct}%)</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4A6845] shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-primary">{gCount}</span>
                <span className="text-muted dark:text-muted text-[11px] ml-1">Green ({greenPct}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Horizontal Progress Bars */}
        <div className="space-y-3.5 mt-2">
          {tiers.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-primary flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" style={{ color: t.color }} />
                    <span>{t.label}</span>
                  </span>
                  <span className="font-mono font-bold text-primary">
                    {t.value} ({t.pct}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${t.bgBar} rounded-full transition-all duration-700`}
                    style={{ width: `${t.pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted dark:text-muted">{t.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-muted dark:text-muted">
        <span>Protocol: Manchester Triage System (MTS)</span>
        <strong className="text-primary font-mono">{rCount + yCount + gCount} Evaluated</strong>
      </div>
    </div>
  );
}