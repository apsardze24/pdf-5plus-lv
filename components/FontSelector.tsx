import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface FontSelectorProps {
    value: string;
    options: string[];
    onChange: (value: string) => void;
    disabled?: boolean;
}

const FontSelector: React.FC<FontSelectorProps> = ({ value, options, onChange, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSelect = (option: string) => {
        onChange(option);
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className="w-full bg-slate-850 text-white p-2 rounded-md border border-slate-700 flex justify-between items-center text-left focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
            >
                <span style={{ fontFamily: `'${value}', sans-serif`, fontSize: '1.1rem' }}>{value}</span>
                <ChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <ul className="absolute top-full mt-1 z-50 w-full bg-slate-800 border border-slate-700 rounded-md max-h-60 overflow-y-auto shadow-lg">
                    {options.map(option => (
                        <li key={option}>
                            <button
                                type="button"
                                onClick={() => handleSelect(option)}
                                className="w-full text-left p-2 text-white hover:bg-slate-700"
                                style={{ fontFamily: `'${option}', sans-serif`, fontSize: '1.1rem' }}
                            >
                                {option}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default FontSelector;