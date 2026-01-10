import React, { createContext, useState, useContext, useMemo, useEffect } from 'react';
import { translations, Translation } from '../constants/translations';
import { useCookieConsent } from './CookieConsentContext';

type Language = 'en' | 'es' | 'de' | 'fr' | 'ru';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translation;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const getBrowserLanguage = (): Language => {
    const browserLang = navigator.language.split('-')[0] as Language;
    return translations[browserLang] ? browserLang : 'en';
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { hasConsent } = useCookieConsent();
  const [language, setLanguageState] = useState<Language>(getBrowserLanguage);

  // Effect to load language from storage once consent is known and positive
  useEffect(() => {
    if (hasConsent) {
      const savedLang = localStorage.getItem('language') as Language;
      if (savedLang && translations[savedLang] && savedLang !== language) {
        setLanguageState(savedLang);
      }
    }
  }, [hasConsent]);


  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    // Persist immediately on change if consent has been given
    if (hasConsent) {
      localStorage.setItem('language', lang);
    }
  };
  
  const t = useMemo(() => translations[language], [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};