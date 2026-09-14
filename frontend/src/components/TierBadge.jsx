import React from 'react';
import { ShieldCheck, AlertCircle, AlertTriangle } from 'lucide-react';

/**
 * TierBadge — now uses the shared design tokens (bg-rose-soft / bg-gold-warm
 * / bg-sage) instead of one-off hex values, so it stays in sync with theme
 * changes (e.g. dark mode) automatically instead of needing a separate
 * manual pass every time the palette shifts.
 */
export default function TierBadge({ tier }) {
  if (tier === 'Red') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-rose-soft text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
        <AlertTriangle className="w-3.5 h-3.5" />
        Tier Red: Immediate Emergency
      </span>
    );
  }

  if (tier === 'Yellow') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-gold-warm text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
        <AlertCircle className="w-3.5 h-3.5" />
        Tier Yellow: Monitor & Teleconsult
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 bg-sage text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
      <ShieldCheck className="w-3.5 h-3.5" />
      Tier Green: Safe for Home Care
    </span>
  );
}
