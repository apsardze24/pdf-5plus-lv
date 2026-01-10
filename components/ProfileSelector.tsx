import React from 'react';
import type { Profile } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface ProfileSelectorProps {
  profiles: Profile[];
  selectedProfileId: string;
  onProfileChange: (profileId: string) => void;
}

const ProfileSelector: React.FC<ProfileSelectorProps> = ({ profiles, selectedProfileId, onProfileChange }) => {
  const { t } = useLanguage();
  return (
    <div className="bg-slate-800/50 p-4 rounded-2xl shadow-lg h-full">
      <h2 className="text-xl font-bold mb-4 text-slate-200">{t.profiles}</h2>
      <div className="space-y-2">
        {profiles.map((profile) => {
          const isSelected = profile.id === selectedProfileId;
          const baseClasses = "w-full text-left p-3 rounded-lg transition-colors duration-200 flex items-center";
          const activeClasses = "bg-blue-500 text-white shadow-md";
          const inactiveClasses = "bg-slate-700/50 hover:bg-slate-700 text-slate-300";

          return (
            <button
              key={profile.id}
              onClick={() => onProfileChange(profile.id)}
              className={`${baseClasses} ${isSelected ? activeClasses : inactiveClasses}`}
              aria-pressed={isSelected}
            >
              <profile.iconComponent className="w-5 h-5 mr-3 flex-shrink-0" />
              <div className="flex-grow">
                <p className="font-semibold">{profile.name}</p>
                <p className={`text-xs ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>{profile.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(ProfileSelector);