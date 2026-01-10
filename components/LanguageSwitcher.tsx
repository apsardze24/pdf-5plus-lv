import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Translation } from '../constants/translations';
import { FlagENIcon } from './icons/flags/FlagENIcon';
import { FlagESIcon } from './icons/flags/FlagESIcon';
import { FlagDEIcon } from './icons/flags/FlagDEIcon';
import { FlagFRIcon } from './icons/flags/FlagFRIcon';
import { FlagRUIcon } from './icons/flags/FlagRUIcon';

type LanguageCode = 'en' | 'es' | 'de' | 'fr' | 'ru';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  const languages: { code: LanguageCode; Icon: React.FC<React.SVGProps<SVGSVGElement>>; nameKey: keyof Translation }[] = [
    { code: 'en', Icon: FlagENIcon, nameKey: 'langNameEN' },
    { code: 'es', Icon: FlagESIcon, nameKey: 'langNameES' },
    { code: 'de', Icon: FlagDEIcon, nameKey: 'langNameDE' },
    { code: 'fr', Icon: FlagFRIcon, nameKey: 'langNameFR' },
    { code: 'ru', Icon: FlagRUIcon, nameKey: 'langNameRU' },
  ];

  return (
    <div className="flex items-center space-x-2">
      {languages.map(({ code, Icon, nameKey }) => {
        const isSelected = language === code;
        const buttonName = t[nameKey] || `Switch to ${code.toUpperCase()}`;
        const simpleName = buttonName.replace(/^(Switch to|Cambiar a|Wechseln zu|Passer à|Переключиться на)\s/i, '').trim();

        return (
          <button
            key={code}
            onClick={() => setLanguage(code)}
            className={`w-8 h-8 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-400 ${isSelected ? 'ring-2 ring-blue-400' : 'opacity-60 hover:opacity-100'}`}
            title={simpleName}
            aria-label={buttonName}
            aria-pressed={isSelected}
          >
            <Icon className="w-full h-full rounded-full" />
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSwitcher;