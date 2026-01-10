import React from 'react';
import { AppMode } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { GeneratorIcon } from './icons/GeneratorIcon';
import { ConverterIcon } from './icons/ConverterIcon';
import { QrCodeIcon } from './icons/QrCodeIcon';
import { EditorIcon } from './icons/EditorIcon';

interface ModeSelectorProps {
    currentMode: AppMode;
    onModeChange: (mode: AppMode) => void;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ currentMode, onModeChange }) => {
    const { t } = useLanguage();

    const modes: { id: AppMode; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
        { id: 'generator', label: t.modeGenerator, icon: GeneratorIcon },
        { id: 'converter', label: t.modeConverter, icon: ConverterIcon },
        { id: 'editor', label: t.modeEditor, icon: EditorIcon },
        { id: 'qrGenerator', label: t.modeQrGenerator, icon: QrCodeIcon },
    ];

    return (
        <div className="bg-slate-800/70 p-1 rounded-full flex items-center space-x-1 backdrop-blur-sm flex-wrap justify-center">
            {modes.map((mode) => {
                const isSelected = currentMode === mode.id;
                return (
                    <button
                        key={mode.id}
                        onClick={() => onModeChange(mode.id)}
                        className={`px-4 py-2 text-sm rounded-full transition-colors duration-300 ease-in-out flex items-center justify-center gap-2 ${
                            isSelected ? 'bg-blue-600 text-white font-semibold shadow-lg' : 'text-slate-300 hover:bg-slate-700/50'
                        }`}
                        aria-pressed={isSelected}
                    >
                        <mode.icon className="w-5 h-5" />
                        <span>{mode.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default ModeSelector;