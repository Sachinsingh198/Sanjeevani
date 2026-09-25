import React, { createContext, useContext, useEffect, useState } from 'react';
import { t as translate, LANGS } from '../lib/i18n';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem('app_lang') || LANGS.HI;
  });

  const [textScale, setTextScaleState] = useState(() => {
    const saved = localStorage.getItem('app_text_scale');
    return saved ? parseFloat(saved) : 1.0;
  });

  useEffect(() => {
    localStorage.setItem('app_lang', lang);
  }, [lang]);

  useEffect(() => {
    // Apply global root font scaling so all rem units scale across the entire app
    const pct = Math.round(textScale * 100);
    document.documentElement.style.fontSize = `${pct}%`;
    localStorage.setItem('app_text_scale', textScale.toString());
  }, [textScale]);

  const setLang = (newLang) => {
    setLangState(newLang);
  };

  const toggleLang = () => {
    setLangState((prev) => (prev === LANGS.HI ? LANGS.EN : LANGS.HI));
  };

  const setTextScale = (scale) => {
    const clamped = Math.max(0.9, Math.min(1.4, Number(scale.toFixed(1))));
    setTextScaleState(clamped);
  };

  const t = (key) => translate(key, lang);

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang,
        toggleLang,
        t,
        textScale,
        setTextScale,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
