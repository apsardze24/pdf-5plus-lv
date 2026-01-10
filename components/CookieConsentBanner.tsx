import React from 'react';
import { useCookieConsent } from '../contexts/CookieConsentContext';
import { useLanguage } from '../contexts/LanguageContext';

const CookieConsentBanner: React.FC = () => {
  const { consentStatus, acceptConsent, declineConsent } = useCookieConsent();
  const { t } = useLanguage();

  if (consentStatus !== 'pending') {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-sm p-4 z-50 border-t border-slate-700 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-slate-300 text-center sm:text-left">
          {t.cookieConsentText}
        </p>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={acceptConsent}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors"
          >
            {t.cookieConsentAccept}
          </button>
          <button
            onClick={declineConsent}
            className="px-5 py-2 bg-slate-600 hover:bg-slate-700 rounded-lg text-white font-semibold transition-colors"
          >
            {t.cookieConsentDecline}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
