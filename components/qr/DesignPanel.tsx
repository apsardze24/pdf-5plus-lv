import React, { useRef } from 'react';
import { DesignOptions } from '../../types';
import { DOT_TYPES, CORNER_TYPES } from '../../constants/qrConstants';
import { useLanguage } from '../../contexts/LanguageContext';

interface DesignPanelProps {
    options: DesignOptions;
    onOptionsChange: (options: DesignOptions) => void;
    onLogoUpload: (file: File) => void;
    onRemoveLogo: () => void;
}

const ColorInput: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between">
        <label className="text-slate-400">{label}</label>
        <div className="relative w-10 h-10 rounded-md border border-slate-600 overflow-hidden">
             <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer" />
        </div>
    </div>
);

const SelectInput: React.FC<{ label: string; value: string; options: string[]; onChange: (value: string) => void }> = ({ label, value, options, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-slate-400 mb-1">{label}</label>
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-slate-850 text-white p-3 rounded-md border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize">
            {options.map(opt => <option key={opt} value={opt}>{opt.replace('-', ' ')}</option>)}
        </select>
    </div>
);

const RangeInput: React.FC<{ label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number, unit?: string }> = ({ label, value, onChange, min = 0, max = 100, step = 1, unit = '' }) => (
    <div>
        <label className="block text-sm font-medium text-slate-400 mb-1">{label} ({value}{unit})</label>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
         />
    </div>
);


const DesignPanel: React.FC<DesignPanelProps> = ({ options, onOptionsChange, onLogoUpload, onRemoveLogo }) => {
    const { t } = useLanguage();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const handleOptionChange = <K extends keyof DesignOptions,>(key: K, value: DesignOptions[K]) => {
        onOptionsChange({ ...options, [key]: value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onLogoUpload(e.target.files[0]);
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ColorInput label={t.design_dots_color} value={options.dotsColor} onChange={(v) => handleOptionChange('dotsColor', v)} />
                <ColorInput label={t.design_corners_color} value={options.cornersColor} onChange={(v) => handleOptionChange('cornersColor', v)} />
                <ColorInput label={t.design_background_color} value={options.backgroundColor} onChange={(v) => handleOptionChange('backgroundColor', v)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectInput label={t.design_dots_style} value={options.dotsType} options={DOT_TYPES} onChange={(v) => handleOptionChange('dotsType', v as DesignOptions['dotsType'])} />
                <SelectInput label={t.design_corners_style} value={options.cornersType} options={CORNER_TYPES} onChange={(v) => handleOptionChange('cornersType', v as DesignOptions['cornersType'])} />
            </div>
            
            <div className="border-t border-slate-700 pt-6">
                 <h3 className="text-lg font-semibold text-slate-300 mb-3">Logo</h3>
                 <div className="flex items-center gap-4">
                    <input type="file" accept="image/png, image/jpeg, image/svg+xml" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="flex-grow px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-semibold transition-colors">
                        {options.logo ? t.design_replace_logo : t.design_upload_logo}
                    </button>
                    {options.logo && (
                        <button onClick={onRemoveLogo} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-white font-semibold transition-colors">
                            {t.design_remove_logo}
                        </button>
                    )}
                 </div>
                 {options.logo && (
                     <div className="mt-4">
                         <RangeInput 
                            label={t.design_logo_size} 
                            value={options.logoSize} 
                            onChange={(v) => handleOptionChange('logoSize', v)}
                            min={0.1} max={0.7} step={0.05}
                         />
                     </div>
                 )}
            </div>
            <div className="border-t border-slate-700 pt-6">
                 <h3 className="text-lg font-semibold text-slate-300 mb-3">{t.design_caption}</h3>
                 <div className="space-y-4">
                    <div className="relative">
                        <input
                            type="text"
                            value={options.captionText}
                            onChange={(e) => handleOptionChange('captionText', e.target.value)}
                            placeholder={t.design_caption_placeholder}
                            className="w-full bg-slate-850 text-white placeholder-slate-500 p-3 rounded-md border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                        />
                        {options.captionText && (
                            <button
                                onClick={() => handleOptionChange('captionText', '')}
                                className="absolute top-1/2 right-2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                                title={t.remove}
                                aria-label={t.remove}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <ColorInput label={t.design_caption_color} value={options.captionColor} onChange={(v) => handleOptionChange('captionColor', v)} />
                        <div className="sm:col-span-2">
                             <RangeInput 
                                label={t.design_caption_size} 
                                value={options.captionSize} 
                                onChange={(v) => handleOptionChange('captionSize', v)}
                                min={2} max={20} step={1} unit='%'
                            />
                        </div>
                    </div>
                     <RangeInput 
                        label={t.design_caption_margin} 
                        value={options.captionMargin} 
                        onChange={(v) => handleOptionChange('captionMargin', v)}
                        min={0} max={15} step={1} unit='%'
                    />
                 </div>
            </div>
        </div>
    );
};

export default React.memo(DesignPanel);