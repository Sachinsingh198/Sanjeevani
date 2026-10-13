import React from 'react';
import { CheckCircle2, Ban, Utensils, AlertOctagon } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function PathyaApathyaCard({ pathya = [], apathya = [], condition = '' }) {
  const { l } = useLanguage();

  if ((!pathya || pathya.length === 0) && (!apathya || apathya.length === 0)) {
    return null;
  }

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-sage/20 dark:border-gray-800 bg-white/80 dark:bg-warm-indigo/90 backdrop-blur-xs shadow-xs">
      {/* Header */}
      <div className="px-4 py-2.5 bg-sage/5 dark:bg-gray-800/40 border-b border-sage/10 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Utensils className="w-4 h-4 text-sage dark:text-booti-glow" />
          <span className="text-xs font-bold text-primary dark:text-cream">
            {l('पथ्य एवं अपथ्य (आहार व दिनचर्या निर्देश)', 'Diet & Lifestyle Guidelines (Pathya & Apathya)', 'Pathya & Apathya (Diet & Lifestyle Guide)')}
          </span>
        </div>
        <span className="text-[10px] font-semibold text-muted dark:text-gray-400">
          CCRAS AYUSH
        </span>
      </div>

      {/* Grid: Pathya (Left) & Apathya (Right) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-sage/10 dark:divide-gray-800 p-3 gap-3 sm:gap-0">
        
        {/* Pathya (Do / Consume) */}
        <div className="sm:pr-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{l('पथ्य: क्या खाएं व अपनाएं', 'Pathya: What to Eat & Follow', 'Pathya: Kya Khaayein Aur Follow Karein')}</span>
          </div>
          <ul className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
            {pathya.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-[11px] leading-snug">
                <span className="text-emerald-500 font-bold shrink-0 mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Apathya (Don't / Avoid) */}
        <div className="pt-2 sm:pt-0 sm:pl-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400">
            <Ban className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{l('अपथ्य: परहेज़ करें (क्या न खाएं)', 'Apathya: Foods & Habits to Avoid', 'Apathya: Parhez Karein (Kya Na Khayein)')}</span>
          </div>
          <ul className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
            {apathya.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-[11px] leading-snug">
                <span className="text-rose-500 font-bold shrink-0 mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
}
