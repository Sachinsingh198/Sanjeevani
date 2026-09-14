import React from 'react';
import { Minus, Plus, Languages } from 'lucide-react';

/**
 * AccessibilityBar — new feature.
 * Many patients are elderly and reading small Devanagari text on a phone
 * is genuinely hard. This gives a persistent, tiny control to bump text
 * size up/down (applied via a CSS variable, not by fighting Tailwind
 * classes) and to flip static chrome between Hindi and English.
 */
export default function AccessibilityBar({ scale, onScaleChange, lang, onLangChange }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center bg-gray-100 rounded-full overflow-hidden">
        <button
          type="button"
          onClick={() => onScaleChange(Math.max(0.9, +(scale - 0.1).toFixed(1)))}
          className="p-1.5 text-muted hover:text-primary"
          aria-label="Decrease text size"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] font-bold text-primary px-1">Aa</span>
        <button
          type="button"
          onClick={() => onScaleChange(Math.min(1.4, +(scale + 0.1).toFixed(1)))}
          className="p-1.5 text-muted hover:text-primary"
          aria-label="Increase text size"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => onLangChange(lang === 'hi' ? 'en' : 'hi')}
        className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-primary text-[10px] font-bold px-2.5 py-1.5 rounded-full transition-colors"
        title="Toggle interface language"
      >
        <Languages className="w-3 h-3" />
        {lang === 'hi' ? 'हिं' : 'EN'}
      </button>
    </div>
  );
}
