import React, { createContext, useContext, useEffect, useState } from 'react';
import { t as translate, LANGS, localText, toEnglishDigits, formatDate } from '../lib/i18n';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem('sanjeevani_ui_lang') || localStorage.getItem('app_lang') || LANGS.HI;
    } catch {
      return LANGS.HI;
    }
  });

  const [textScale, setTextScaleState] = useState(() => {
    try {
      const saved = localStorage.getItem('sanjeevani_text_scale') || localStorage.getItem('app_text_scale');
      return saved ? parseFloat(saved) : 1.0;
    } catch {
      return 1.0;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('sanjeevani_ui_lang', lang);
      localStorage.setItem('app_lang', lang);
    } catch (e) {
      console.warn('Failed saving lang to localStorage', e);
    }

    // Sync to profile in background if user is authenticated
    try {
      const token = localStorage.getItem('sanjeevani_access_token');
      if (token) {
        fetch('/api/auth/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ language_preference: lang })
        }).catch(() => {});
      }
    } catch {}
  }, [lang]);

  useEffect(() => {
    // Apply global root font scaling so all rem units scale across the entire app
    const pct = Math.round(textScale * 100);
    document.documentElement.style.fontSize = `${pct}%`;
    try {
      localStorage.setItem('sanjeevani_text_scale', textScale.toString());
      localStorage.setItem('app_text_scale', textScale.toString());
    } catch (e) {
      console.warn('Failed saving textScale to localStorage', e);
    }
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

  const isHindi = lang === 'hi' || lang === 'garh' || lang === 'garhwali';
  const isEnglish = lang === 'en';
  const isGarhwali = lang === 'garh' || lang === 'garhwali';

  const t = (key) => translate(key, lang);
  const l = (hi, en, garh) => localText(lang, hi, en, garh);
  const fmtDate = (d) => formatDate(d, lang);

  return (
    <LanguageContext.Provider
      value={{
        lang,
        language: lang,
        isHindi,
        isEnglish,
        isGarhwali,
        setLang,
        setLanguage: setLang,
        toggleLang,
        t,
        l,
        toEnglishDigits,
        formatDate: fmtDate,
        textScale,
        setTextScale,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
