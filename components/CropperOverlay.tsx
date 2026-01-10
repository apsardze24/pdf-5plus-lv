import React, { useState, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Crop } from '../types';
import ImageEditor from './ImageEditor';

interface CropperOverlayProps {
    sourceDataUrl: string;
    onApply: (dataUrl: string) => void;
    onClose: () => void;
}

// Define the type for the image info object passed by ImageEditor's onLoad
interface ImgInfo {
  bounds: { x: number; y: number; width: number; height: number; };
  naturalSize: { width: number; height: number; };
}

const CropperOverlay: React.FC<CropperOverlayProps> = ({ sourceDataUrl, onApply, onClose }) => {
    const { t } = useLanguage();
    
    const [crop, setCrop] = useState<Crop | null>(null);
    const [imgInfo, setImgInfo] = useState<ImgInfo | null>(null); // Correctly typed state

    const handleApply = useCallback(() => {
        if (!crop || !sourceDataUrl) return;

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = crop.width;
            canvas.height = crop.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(
                img,
                crop.x, crop.y, crop.width, crop.height,
                0, 0, crop.width, crop.height
            );
            
            onApply(canvas.toDataURL());
        };
        img.src = sourceDataUrl;
    }, [crop, sourceDataUrl, onApply]);

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
                        onCropChange={setCrop}
                        isAspectLocked={false}
                        onLoad={setImgInfo}
                    />
                </div>

                <div className="p-4 bg-slate-800/50 border-t border-slate-700 flex justify-end items-center gap-4">
                    <button onClick={onClose} className="px-5 py-2 bg-slate-600 hover:bg-slate-700 rounded-lg text-white font-semibold transition-colors">
                        {t.cropper_cancel}
                    </button>
                    <button onClick={handleApply} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors">
                        {t.applyChanges}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CropperOverlay;