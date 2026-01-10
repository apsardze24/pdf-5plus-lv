import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Crop } from '../types';
import ImageEditor from './ImageEditor';

interface EditorResizeAndCropOverlayProps {
    sourceDataUrl: string;
    onApply: (dataUrl: string) => void;
    onClose: () => void;
}

// Define the type for the image info object passed by ImageEditor's onLoad
interface ImgInfo {
  bounds: { x: number; y: number; width: number; height: number; };
  naturalSize: { width: number; height: number; };
}

const EditorResizeAndCropOverlay: React.FC<EditorResizeAndCropOverlayProps> = ({ sourceDataUrl, onApply, onClose }) => {
    const { t } = useLanguage();
    
    const [crop, setCrop] = useState<Crop | null>(null);
    const [outputWidth, setOutputWidth] = useState('');
    const [outputHeight, setOutputHeight] = useState('');
    const [imgInfo, setImgInfo] = useState<ImgInfo | null>(null); // To satisfy ImageEditor's onLoad prop

    useEffect(() => {
        const img = new Image();
        img.onload = () => {
            setCrop({ x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight });
            setOutputWidth(img.naturalWidth.toString());
            setOutputHeight(img.naturalHeight.toString());
        };
        img.src = sourceDataUrl;
    }, [sourceDataUrl]);

    const handleCropChange = useCallback((newCrop: Crop | null) => {
        if (!newCrop) return;
        setCrop(newCrop);
        setOutputWidth(Math.round(newCrop.width).toString());
        setOutputHeight(Math.round(newCrop.height).toString());
    }, []);
    
    const handleApply = useCallback(() => {
        if (!crop || !sourceDataUrl) return;

        const finalWidth = parseInt(outputWidth, 10);
        const finalHeight = parseInt(outputHeight, 10);

        if (isNaN(finalWidth) || isNaN(finalHeight) || finalWidth <= 0 || finalHeight <= 0) {
            alert("Please enter valid width and height.");
            return;
        }

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = finalWidth;
            canvas.height = finalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, finalWidth, finalHeight);
            ctx.imageSmoothingQuality = 'high';
            
            const sourceAspectRatio = crop.width / crop.height;
            const finalAspectRatio = finalWidth / finalHeight;
            let destWidth, destHeight, destX, destY;

            if (sourceAspectRatio > finalAspectRatio) {
                destWidth = finalWidth;
                destHeight = destWidth / sourceAspectRatio;
                destX = 0;
                destY = (finalHeight - destHeight) / 2;
            } else {
                destHeight = finalHeight;
                destWidth = destHeight * sourceAspectRatio;
                destY = 0;
                destX = (finalWidth - destWidth) / 2;
            }

            ctx.drawImage(
                img,
                crop.x, crop.y, crop.width, crop.height,
                destX, destY, destWidth, destHeight
            );
            
            onApply(canvas.toDataURL());
        };
        img.src = sourceDataUrl;
    }, [crop, sourceDataUrl, outputWidth, outputHeight, onApply]);

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4" onMouseDown={onClose}>
            <div 
                className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[90vh]" 
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="p-6 flex-grow flex flex-col min-h-0">
                    <ImageEditor
                        src={sourceDataUrl}
                        crop={crop}
                        onCropChange={handleCropChange}
                        isAspectLocked={false}
                        onLoad={setImgInfo}
                    />
                </div>
                <div className="p-4 bg-slate-800/50 border-t border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <div className="flex items-center gap-2 md:col-span-2">
                             <input
                                type="number"
                                value={outputWidth}
                                onChange={(e) => setOutputWidth(e.target.value)}
                                placeholder={t.width}
                                className="w-full bg-slate-850 text-white placeholder-slate-400 p-2 rounded-md border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-slate-400">x</span>
                             <input
                                type="number"
                                value={outputHeight}
                                onChange={(e) => setOutputHeight(e.target.value)}
                                placeholder={t.height}
                                className="w-full bg-slate-850 text-white placeholder-slate-400 p-2 rounded-md border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex justify-end items-center gap-4 md:col-span-1">
                            <button onClick={onClose} className="px-5 py-2 bg-slate-600 hover:bg-slate-700 rounded-lg text-white font-semibold transition-colors">
                                {t.cropper_cancel}
                            </button>
                            <button onClick={handleApply} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors">
                                {t.applyChanges}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditorResizeAndCropOverlay;