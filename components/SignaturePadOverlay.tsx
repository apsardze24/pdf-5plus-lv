import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

declare const fabric: any;

interface SignaturePadOverlayProps {
    onApply: (dataUrl: string) => void;
    onClose: () => void;
}

type SignatureMode = 'draw' | 'upload';
type SignatureColor = '#000000' | '#0f4491' | '#c11414';

const SignaturePadOverlay: React.FC<SignaturePadOverlayProps> = ({ onApply, onClose }) => {
    const { t } = useLanguage();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [fabricCanvas, setFabricCanvas] = useState<any>(null);
    const [mode, setMode] = useState<SignatureMode>('draw');
    const [color, setColor] = useState<SignatureColor>('#000000');
    const [brushWidth, setBrushWidth] = useState(5); // Default thickness
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (mode !== 'draw' || !canvasRef.current || typeof fabric === 'undefined') return;

        const canvas = new fabric.Canvas(canvasRef.current, {
            isDrawingMode: true,
            backgroundColor: '#f8fafc',
            selection: false,
        });
        canvas.freeDrawingBrush.width = brushWidth;
        canvas.freeDrawingBrush.color = color;
        setFabricCanvas(canvas);

        const resizeObserver = new ResizeObserver(entries => {
            if (!entries || entries.length === 0) return;
            const { width } = entries[0].contentRect;
            canvas.setWidth(width);
            canvas.setHeight(width * 0.5); // 2:1 aspect ratio
            canvas.renderAll();
        });

        if (canvasRef.current.parentElement) {
            resizeObserver.observe(canvasRef.current.parentElement);
        }
        
        return () => {
            if (canvasRef.current?.parentElement) {
                resizeObserver.unobserve(canvasRef.current.parentElement);
            }
            canvas.dispose();
        };
    }, [mode]);
    
    useEffect(() => {
        if(fabricCanvas) {
            fabricCanvas.freeDrawingBrush.color = color;
        }
    }, [color, fabricCanvas]);

    useEffect(() => {
        if (fabricCanvas) {
            fabricCanvas.freeDrawingBrush.width = brushWidth;
        }
    }, [brushWidth, fabricCanvas]);
    
    const handleClear = () => fabricCanvas?.clear();

    const handleApply = () => {
        if (!fabricCanvas || fabricCanvas.isEmpty()) {
            onClose();
            return;
        };
        
        // Temporarily remove the background color for export to ensure transparency
        const originalBackgroundColor = fabricCanvas.backgroundColor;
        fabricCanvas.set('backgroundColor', null);
        fabricCanvas.renderAll();

        const dataUrl = fabricCanvas.toDataURL({
            format: 'png',
            multiplier: 2, // Export at 2x resolution for better quality
        });
        
        // Restore the background color for the UI
        fabricCanvas.set('backgroundColor', originalBackgroundColor);
        fabricCanvas.renderAll();

        onApply(dataUrl);
    };
    
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
                onApply(dataUrl);
            }
        };
        reader.readAsDataURL(file);
    };

    const colors: { name: string; hex: SignatureColor }[] = [
        { name: 'Black', hex: '#000000' },
        { name: 'Blue', hex: '#0f4491' },
        { name: 'Red', hex: '#c11414' },
    ];

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onMouseDown={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700">
                    <div className="flex items-center bg-slate-900/50 p-1 rounded-lg">
                        <button onClick={() => setMode('draw')} className={`flex-1 py-2 rounded-md transition-colors ${mode === 'draw' ? 'bg-blue-600 text-white' : 'hover:bg-slate-700'}`}>Draw Signature</button>
                        <button onClick={() => setMode('upload')} className={`flex-1 py-2 rounded-md transition-colors ${mode === 'upload' ? 'bg-blue-600 text-white' : 'hover:bg-slate-700'}`}>Upload Image</button>
                    </div>
                </div>

                <div className="p-4">
                    {mode === 'draw' ? (
                        <div className="w-full">
                            <div className="bg-white rounded-md overflow-hidden cursor-crosshair">
                                <canvas ref={canvasRef}></canvas>
                            </div>
                            <div className="flex flex-col gap-4 mt-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">
                                        {t.thickness} ({brushWidth.toFixed(0)}px)
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="20"
                                        step="1"
                                        value={brushWidth}
                                        onChange={(e) => setBrushWidth(Number(e.target.value))}
                                        className="w-full"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-400">{t.color}:</span>
                                        {colors.map(c => (
                                            <button key={c.hex} onClick={() => setColor(c.hex)} title={c.name}
                                                className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c.hex ? 'border-blue-400 scale-110' : 'border-transparent'}`}
                                                style={{ backgroundColor: c.hex }}
                                            />
                                        ))}
                                    </div>
                                    <button onClick={handleClear} className="px-4 py-2 bg-slate-600 hover:bg-slate-700 rounded-lg text-white font-semibold text-sm">Clear</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-600">
                            <input type="file" accept="image/png, image/jpeg" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                            <button onClick={() => fileInputRef.current?.click()} className="px-5 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold">
                                Select Signature File
                            </button>
                             <p className="text-xs text-slate-500 mt-2">Recommended: PNG with transparent background</p>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-900/50 flex justify-end items-center gap-4">
                    <button onClick={onClose} className="px-5 py-2 bg-slate-600 hover:bg-slate-700 rounded-lg text-white font-semibold">Cancel</button>
                    {mode === 'draw' && <button onClick={handleApply} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold">Apply Signature</button>}
                </div>
            </div>
        </div>
    );
};

export default SignaturePadOverlay;