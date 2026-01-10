import React from 'react';
import { QrType } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface TypeSelectorProps {
    types: QrType[];
    selectedType: QrType | null;
    onTypeChange: (type: QrType) => void;
}

const TypeSelector: React.FC<TypeSelectorProps> = ({ types, selectedType, onTypeChange }) => {
    const { t } = useLanguage();

    return (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {types.map((type) => {
                const isSelected = selectedType ? type.id === selectedType.id : false;
                const buttonClasses = `
                    flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200 aspect-square
                    ${isSelected 
                        ? 'bg-blue-600 text-white shadow-lg scale-105' 
                        : 'bg-slate-700/70 hover:bg-slate-700 text-slate-300 hover:text-white'
                    }
                `;

                return (
                    <button key={type.id} onClick={() => onTypeChange(type)} className={buttonClasses}>
                        <type.icon className="w-8 h-8 mb-2" />
                        <span className="text-xs sm:text-sm font-semibold text-center">{t[type.labelKey as keyof typeof t]}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default React.memo(TypeSelector);