import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { ChromeIcon } from './icons/ChromeIcon';

const ChromeExtensionButton: React.FC = () => {
    const { t } = useLanguage();

    return (
        <a
            href="https://chrome.google.com/webstore/detail/aecilbbheifhcdlpagcghacjcgcjcomf"
            target="_blank"
            rel="noopener noreferrer nofollow"
            title={t.getChromeExtensionTooltip}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-full text-white font-semibold transition-colors duration-200 animate-fade-in"
        >
            <ChromeIcon className="w-5 h-5" />
            <span>{t.getChromeExtension}</span>
        </a>
    );
};

export default ChromeExtensionButton;
