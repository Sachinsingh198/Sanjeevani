import React from 'react';
import { ShieldCheck, AlertCircle, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function TierBadge({ tier }) {
  const { l } = useLanguage();

  if (tier === 'Red') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-rose-soft text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
        <AlertTriangle className="w-3.5 h-3.5" />
        {l('स्तर लाल: तत्काल आपातकाल', 'Tier Red: Immediate Emergency', 'Tier Red: Tatkal Emergency')}
      </span>
    );
  }

  if (tier === 'Yellow') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-gold-warm text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
        <AlertCircle className="w-3.5 h-3.5" />
        {l('स्तर पीला: निगरानी व परामर्श', 'Tier Yellow: Monitor & Teleconsult', 'Tier Yellow: Nigrani aur Teleconsult')}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 bg-sage text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
      <ShieldCheck className="w-3.5 h-3.5" />
      {l('स्तर हरा: सुरक्षित घरेलू देखभाल', 'Tier Green: Safe for Home Care', 'Tier Green: Surakshit Gharelu Dekhbhal')}
    </span>
  );
}
