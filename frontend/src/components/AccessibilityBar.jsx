import React from 'react';
import { Minus, Plus, Languages } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

/**
 * AccessibilityBar — global accessibility controls.
 * Bumps rem-based root text size up/down and toggles UI language between Hindi and English.
 */
export default function AccessibilityBar({ scale: propScale, onScaleChange, lang: propLang, onLangChange }) {
  const langCtx = useLanguage();
  const lang = propLang || langCtx?.lang || 'hi';
  const scale = propScale ?? langCtx?.textScale ?? 1.0;
  const handleScale = onScaleChange || langCtx?.setTextScale;
  const handleLang = onLangChange || langCtx?.toggleLang;

  return (
    <div className="flex items-center gap-1.5 select-none">
      <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => handleScale && handleScale(Math.max(0.9, +(scale - 0.1).toFixed(1)))}
          className="p-1.5 text-muted hover:text-primary dark:text-gray-300 dark:hover:text-white transition-colors cursor-pointer"
          aria-label="Decrease text size"
          title="Decrease text size"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs font-bold text-primary dark:text-gray-200 px-1.5 min-w-[22px] text-center">
          Aa
        </span>
        <button
          type="button"
          onClick={() => handleScale && handleScale(Math.min(1.4, +(scale + 0.1).toFixed(1)))}
          className="p-1.5 text-muted hover:text-primary dark:text-gray-300 dark:hover:text-white transition-colors cursor-pointer"
          aria-label="Increase text size"
          title="Increase text size"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => handleLang && (onLangChange ? onLangChange(lang === 'hi' ? 'en' : 'hi') : handleLang())}
        className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-primary dark:text-gray-200 text-xs font-bold px-2.5 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 transition-colors cursor-pointer"
        title="Toggle interface language / भाषा बदलें"
      >
        <Languages className="w-3.5 h-3.5" />
        <span>{lang === 'hi' ? 'हिं' : 'EN'}</span>
      </button>
    </div>
  );
}
