import React from 'react';
import { Minus, Plus, Languages, Eye } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

/**
 * AccessibilityBar — global accessibility controls.
 * Bumps rem-based root text size up/down, toggles high-contrast sunlight mode,
 * and toggles UI language between Hindi and English.
 */
export default function AccessibilityBar({ scale: propScale, onScaleChange, lang: propLang, onLangChange }) {
  const langCtx = useLanguage();
  const themeCtx = useTheme();
  const lang = propLang || langCtx?.lang || 'hi';
  const scale = propScale ?? langCtx?.textScale ?? 1.0;
  const handleScale = onScaleChange || langCtx?.setTextScale;
  const handleLang = onLangChange || langCtx?.toggleLang;
  const highContrast = themeCtx?.highContrast || false;
  const toggleHighContrast = themeCtx?.toggleHighContrast;

  return (
    <div className="flex items-center gap-1.5 select-none" role="toolbar" aria-label="Accessibility options">
      {/* Font Size Adjuster */}
      <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 h-9 sm:h-9">
        <button
          type="button"
          onClick={() => handleScale && handleScale(Math.max(0.9, +(scale - 0.1).toFixed(1)))}
          className="min-w-[34px] sm:min-w-[36px] h-full flex items-center justify-center text-muted hover:text-primary dark:text-gray-300 dark:hover:text-white transition-colors cursor-pointer"
          aria-label="Decrease text size / छोटा अक्षर"
          title="Decrease text size / छोटा अक्षर"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs font-bold text-primary dark:text-gray-200 px-1 min-w-[24px] text-center" aria-live="polite">
          {scale.toFixed(1)}x
        </span>
        <button
          type="button"
          onClick={() => handleScale && handleScale(Math.min(1.4, +(scale + 0.1).toFixed(1)))}
          className="min-w-[34px] sm:min-w-[36px] h-full flex items-center justify-center text-muted hover:text-primary dark:text-gray-300 dark:hover:text-white transition-colors cursor-pointer"
          aria-label="Increase text size / बड़ा अक्षर"
          title="Increase text size / बड़ा अक्षर"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* High Contrast Mode Toggle */}
      {toggleHighContrast && (
        <button
          type="button"
          onClick={toggleHighContrast}
          className={`flex items-center gap-1 h-9 px-2.5 rounded-full border transition-all cursor-pointer text-xs font-bold ${
            highContrast
              ? 'bg-black text-white border-black ring-2 ring-yellow-400'
              : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-primary dark:text-gray-200 border-gray-200 dark:border-gray-700'
          }`}
          aria-pressed={highContrast}
          aria-label="Toggle high-contrast sunlight mode / धूप में स्पष्ट देखने हेतु"
          title={highContrast ? "High Contrast Active (धूप मोड चालू)" : "High Contrast Mode (धूप मोड)"}
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{highContrast ? 'धूप ON' : 'धूप'}</span>
        </button>
      )}

      {/* Language Toggle */}
      <button
        type="button"
        onClick={() => handleLang && (onLangChange ? onLangChange(lang === 'hi' ? 'en' : 'hi') : handleLang())}
        className="flex items-center gap-1 h-9 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-primary dark:text-gray-200 text-xs font-bold px-2.5 rounded-full border border-gray-200 dark:border-gray-700 transition-colors cursor-pointer"
        aria-label="Toggle interface language / भाषा बदलें"
        title="Toggle interface language / भाषा बदलें"
      >
        <Languages className="w-3.5 h-3.5" />
        <span>{lang === 'hi' ? 'हिं' : 'EN'}</span>
      </button>
    </div>
  );
}
