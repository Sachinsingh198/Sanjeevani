import React from 'react';
import { BarChart3 } from 'lucide-react';

/**
 * TierDistributionChart — dependency-free bar chart showing Red/Yellow/Green
 * case volume, so admins get a system-health signal beyond raw user counts.
 * Pass real counts once you wire up a backend aggregation endpoint; for now
 * this works fine with any {red, yellow, green} shape.
 */
export default function TierDistributionChart({ counts = { red: 0, yellow: 0, green: 0 } }) {
  const total = counts.red + counts.yellow + counts.green || 1;
  const bars = [
    { label: 'Red', value: counts.red, color: 'bg-rose-soft' },
    { label: 'Yellow', value: counts.yellow, color: 'bg-gold-warm' },
    { label: 'Green', value: counts.green, color: 'bg-sage' },
  ];

  return (
    <div className="bg-card rounded-3xl p-5 border border-border-subtle shadow-sm">
      <h3 className="font-serif font-bold text-base text-primary mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-sage" /> Triage Tier Distribution
      </h3>
      <div className="space-y-3">
        {bars.map((b) => (
          <div key={b.label}>
            <div className="flex justify-between text-xs font-medium text-primary mb-1">
              <span>{b.label}</span>
              <span>{b.value} ({Math.round((b.value / total) * 100)}%)</span>
            </div>
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${b.color} rounded-full transition-all duration-500`}
                style={{ width: `${(b.value / total) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}