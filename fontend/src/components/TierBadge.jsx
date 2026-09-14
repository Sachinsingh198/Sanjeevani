import React from 'react';
import { ShieldCheck, AlertCircle, AlertTriangle } from 'lucide-react';

export default function TierBadge({ tier }) {
  if (tier === 'Red') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-[#A83A32] text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
        <AlertTriangle className="w-3.5 h-3.5" />
        Tier Red: Immediate Emergency
      </span>
    );
  }

  if (tier === 'Yellow') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-[#D97706] text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
        <AlertCircle className="w-3.5 h-3.5" />
        Tier Yellow: Monitor & Teleconsult
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 bg-[#5F7A52] text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
      <ShieldCheck className="w-3.5 h-3.5" />
      Tier Green: Safe for Home Care
    </span>
  );
}