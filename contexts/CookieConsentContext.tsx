import React, { createContext, useState, useContext, useMemo, useCallback } from 'react';

// Declare gtag on the window for TypeScript
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

type ConsentStatus = 'pending' | 'accepted' | 'declined';

interface CookieConsentContextType {
  consentStatus: ConsentStatus;
  hasConsent: boolean;
  acceptConsent: () => void;
  declineConsent: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

const getInitialConsentStatus = (): ConsentStatus => {
  if (typeof window === 'undefined') {
    return 'pending';
  }
  const savedStatus = localStorage.getItem('cookie-consent') as ConsentStatus;
  return savedStatus || 'pending';
};

export const CookieConsentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>(getInitialConsentStatus);

  const acceptConsent = useCallback(() => {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        'analytics_storage': 'granted',
        'ad_storage': 'granted',
        'ad_user_data': 'granted',
        'ad_personalization': 'granted'
      });
    }
    setConsentStatus('accepted');
    localStorage.setItem('cookie-consent', 'accepted');
  }, []);

  const declineConsent = useCallback(() => {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        'analytics_storage': 'denied',
        'ad_storage': 'denied',
        'ad_user_data': 'denied',
        'ad_personalization': 'denied'
      });
    }
    setConsentStatus('declined');
    localStorage.setItem('cookie-consent', 'declined');
  }, []);

  const value = useMemo(() => ({
    consentStatus,
    hasConsent: consentStatus === 'accepted',
    acceptConsent,
    declineConsent,
  }), [consentStatus, acceptConsent, declineConsent]);

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
};

export const useCookieConsent = (): CookieConsentContextType => {
  const context = useContext(CookieConsentContext);
  if (context === undefined) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  }
  return context;
};