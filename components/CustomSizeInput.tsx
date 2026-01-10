import React, { useState, useCallback } from 'react';
import type { IconDefinition } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface CustomSizeInputProps {
  customIcons: IconDefinition[];
  onAdd: (newSize: { width: number; height: number }) => void;
  onRemove: (iconToRemove: { width: number; height: number }) => void;
}

const CustomSizeInput: React.FC<CustomSizeInputProps> = ({ customIcons, onAdd, onRemove }) => {
  const { t } = useLanguage();
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');

  const handleAdd = useCallback(() => {
    const w = parseInt(width, 10);
    const h = parseInt(height, 10);

    if (isNaN(w) || w <= 0) {
      return; // Width is required
    }
    
    // If height is not provided, make it a square
    const finalHeight = isNaN(h) || h <= 0 ? w : h;

    onAdd({ width: w, height: finalHeight });
    setWidth('');
    setHeight('');
  }, [width, height, onAdd]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  }, [handleAdd]);

  return (
    <div className="bg-slate-800/50 p-4 rounded-2xl shadow-lg mt-4">
      <h3 className="text-lg font-bold mb-3 text-slate-200">{t.customSizes}</h3>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <input
          type="number"
          value={width}
          onChange={(e) => setWidth(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.width}
          className="w-full bg-slate-700 text-white placeholder-slate-400 p-2 rounded-md border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="number"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.height}
          className="w-full bg-slate-700 text-white placeholder-slate-400 p-2 rounded-md border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
       <button
          onClick={handleAdd}
          className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-md text-white font-semibold transition-colors mb-3"
        >
          {t.addSize}
        </button>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {customIcons.map(icon => (
          <div key={`${icon.width}x${icon.height}`} className="flex justify-between items-center bg-slate-700/50 p-2 rounded-md">
            <span className="text-slate-300">{icon.width} x {icon.height} px</span>
            <button
              onClick={() => onRemove({ width: icon.width, height: icon.height })}
              className="p-1 rounded-full hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
              title={`${t.remove} ${icon.width}x${icon.height}px`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(CustomSizeInput);