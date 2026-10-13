import React from 'react';
import { Minus, Plus, Languages, Eye } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

/**
 * AccessibilityBar — global accessibility controls.
 * Bumps rem-based root text size up/down, toggles high-contrast sunlight mode,
 * and provides a 3-mode language switcher:
 * - 'EN': Pure English
 * - 'हिं': Pure Hindi (Devanagari with 0-9 digits)
 * - 'Hing': Hinglish (Hindi language in English alphabet)
 */
export default function AccessibilityBar({ scale: propScale, onScaleChange, lang: propLang, onLangChange }) {
  const langCtx = useLanguage();
  const themeCtx = useTheme();
  const currentLang = propLang || langCtx?.lang || 'hi';
  const scale = propScale ?? langCtx?.textScale ?? 1.0;
  const handleScale = onScaleChange || langCtx?.setTextScale;
  const highContrast = themeCtx?.highContrast || false;
  const toggleHighContrast = themeCtx?.toggleHighContrast;

  const handleSelectLang = (selected) => {
    if (onLangChange) {
      onLangChange(selected);
    } else if (langCtx?.setLang) {
      langCtx.setLang(selected);
    }
  };

  const isEn = currentLang === 'en';

  return (
    <div className="flex items-center gap-1.5 select-none" role="toolbar" aria-label={isEn ? "Accessibility options" : "सुगमता विकल्प"}>
      {/* Font Size Adjuster */}
      <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 h-9">
        <button
          type="button"
          onClick={() => handleScale && handleScale(Math.max(0.9, +(scale - 0.1).toFixed(1)))}
          className="min-w-[32px] sm:min-w-[36px] h-full flex items-center justify-center text-muted hover:text-primary dark:text-gray-300 dark:hover:text-white transition-colors cursor-pointer"
          aria-label={isEn ? "Decrease text size" : "छोटा अक्षर"}
          title={isEn ? "Decrease text size" : "छोटा अक्षर"}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs font-bold text-primary dark:text-gray-200 px-1 min-w-[24px] text-center" aria-live="polite">
          {scale.toFixed(1)}x
        </span>
        <button
          type="button"
          onClick={() => handleScale && handleScale(Math.min(1.4, +(scale + 0.1).toFixed(1)))}
          className="min-w-[32px] sm:min-w-[36px] h-full flex items-center justify-center text-muted hover:text-primary dark:text-gray-300 dark:hover:text-white transition-colors cursor-pointer"
          aria-label={isEn ? "Increase text size" : "बड़ा अक्षर"}
          title={isEn ? "Increase text size" : "बड़ा अक्षर"}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* High Contrast Mode Toggle */}
      {toggleHighContrast && (
        <button
          type="button"
          onClick={toggleHighContrast}
          className={`flex items-center gap-1 h-9 px-2 sm:px-2.5 rounded-full border transition-all cursor-pointer text-xs font-bold ${
            highContrast
              ? 'bg-black text-white border-black ring-2 ring-yellow-400'
              : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-primary dark:text-gray-200 border-gray-200 dark:border-gray-700'
          }`}
          aria-pressed={highContrast}
          aria-label={isEn ? "Toggle high-contrast sunlight mode" : "धूप में स्पष्ट देखने हेतु"}
          title={isEn ? (highContrast ? "High Contrast Active" : "High Contrast Mode") : (highContrast ? "धूप मोड सक्रिय" : "धूप मोड")}
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden md:inline">{isEn ? (highContrast ? 'Sun ON' : 'Sun') : (highContrast ? 'धूप ON' : 'धूप')}</span>
        </button>
      )}

      {/* 3-Mode Language Selector: EN | हिं | Hing */}
      <div
        className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-0.5 border border-gray-200 dark:border-gray-700 h-9"
        role="group"
        aria-label="Language Mode Selector"
      >
        <button
          type="button"
          onClick={() => handleSelectLang('en')}
          className={`h-full px-2 sm:px-2.5 rounded-full text-[11px] sm:text-xs transition-all cursor-pointer ${
            currentLang === 'en'
              ? 'bg-sage text-white shadow-xs font-extrabold'
              : 'text-muted hover:text-primary dark:text-gray-400 dark:hover:text-white font-medium'
          }`}
          title="Pure English (100% English)"
          aria-pressed={currentLang === 'en'}
        >
          EN
        </button>

        <button
          type="button"
          onClick={() => handleSelectLang('hi')}
          className={`h-full px-2 sm:px-2.5 rounded-full text-[11px] sm:text-xs transition-all cursor-pointer ${
            currentLang === 'hi'
              ? 'bg-sage text-white shadow-xs font-extrabold'
              : 'text-muted hover:text-primary dark:text-gray-400 dark:hover:text-white font-medium'
          }`}
          title="हिन्दी (Pure Hindi with standard 0-9 digits)"
          aria-pressed={currentLang === 'hi'}
        >
          हिं
        </button>

        <button
          type="button"
          onClick={() => handleSelectLang('hinglish')}
          className={`h-full px-2 sm:px-2.5 rounded-full text-[11px] sm:text-xs transition-all cursor-pointer ${
            currentLang === 'hinglish'
              ? 'bg-sage text-white shadow-xs font-extrabold'
              : 'text-muted hover:text-primary dark:text-gray-400 dark:hover:text-white font-medium'
          }`}
          title="Hinglish (Hindi written in English alphabet)"
          aria-pressed={currentLang === 'hinglish'}
        >
          Hing
        </button>
      </div>
    </div>
  );
}
