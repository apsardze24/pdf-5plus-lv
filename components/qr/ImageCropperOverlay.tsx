import React, { useState, useRef, useLayoutEffect, useCallback, useEffect, useMemo, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropperOverlayProps {
    imageFile: File;
    onCropComplete: (base64Image: string | null) => void;
    onClose: () => void;
}

const getEventPosition = (e: MouseEvent | TouchEvent | ReactMouseEvent | ReactTouchEvent): { x: number; y: number } | null => {
    if ('touches' in e && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if ('clientX' in e && typeof e.clientX === 'number' && 'clientY' in e && typeof e.clientY === 'number') {
        return { x: e.clientX, y: e.clientY };
    }
    return null;
};

const ImageCropperOverlay: React.FC<ImageCropperOverlayProps> = ({ imageFile, onCropComplete, onClose }) => {
    const { t } = useLanguage();
    const [imageUrl, setImageUrl] = useState<string>('');
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [crop, setCrop] = useState<Crop | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const dragStartCrop = useRef<Crop | null>(null);

    useEffect(() => {
        const url = URL.createObjectURL(imageFile);
        setImageUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [imageFile]);

    const initSquareCrop = useCallback(() => {
        if (imgRef.current) {
            const { naturalWidth, naturalHeight } = imgRef.current;
            const size = Math.min(naturalWidth, naturalHeight);
            const x = (naturalWidth - size) / 2;
            const y = (naturalHeight - size) / 2;
            setCrop({ x, y, width: size, height: size });
        }
    }, []);

    useLayoutEffect(() => {
        const img = imgRef.current;
        if (img) {
            const handleLoad = () => initSquareCrop();
            img.addEventListener('load', handleLoad);
            if (img.complete) {
                initSquareCrop();
            }
            return () => img.removeEventListener('load', handleLoad);
        }
    }, [imageUrl, initSquareCrop]);

    const screenCrop = useMemo(() => {
        if (!crop || !imgRef.current || !containerRef.current) return null;
        const imgRect = imgRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        const scaleX = imgRect.width / imgRef.current.naturalWidth;
        const scaleY = imgRect.height / imgRef.current.naturalHeight;
        return {
            x: crop.x * scaleX + (imgRect.left - containerRect.left),
            y: crop.y * scaleY + (imgRect.top - containerRect.top),
            width: crop.width * scaleX,
            height: crop.height * scaleY,
        };
    }, [crop]);

    const handleInteractionStart = (e: ReactMouseEvent | ReactTouchEvent) => {
        if (!crop) return;
        const startPos = getEventPosition(e);
        if (!startPos) return;
        setIsDragging(true);
        dragStartPos.current = startPos;
        dragStartCrop.current = { ...crop };
    };

    useEffect(() => {
        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!isDragging || !dragStartCrop.current || !imgRef.current || !containerRef.current) return;
            
            const pos = getEventPosition(e);
            if (!pos) return;
            
            const scaleX = imgRef.current.naturalWidth / imgRef.current.getBoundingClientRect().width;
            const scaleY = imgRef.current.naturalHeight / imgRef.current.getBoundingClientRect().height;
            const dx = (pos.x - dragStartPos.current.x) * scaleX;
            const dy = (pos.y - dragStartPos.current.y) * scaleY;

            let newX = dragStartCrop.current.x + dx;
            let newY = dragStartCrop.current.y + dy;

            newX = Math.max(0, Math.min(newX, imgRef.current.naturalWidth - dragStartCrop.current.width));
            newY = Math.max(0, Math.min(newY, imgRef.current.naturalHeight - dragStartCrop.current.height));

            setCrop(prev => prev ? { ...prev, x: newX, y: newY } : null);
        };

        const handleUp = () => setIsDragging(false);

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('touchmove', handleMove);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('touchend', handleUp);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchend', handleUp);
        };
    }, [isDragging]);

    const handleApply = () => {
        if (!crop || !imgRef.current) {
            onCropComplete(null);
            return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = crop.width;
        canvas.height = crop.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.drawImage(
            imgRef.current,
            crop.x, crop.y, crop.width, crop.height,
            0, 0, crop.width, crop.height
        );
        onCropComplete(canvas.toDataURL());
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4" onMouseDown={onClose}>
            <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
                <div ref={containerRef} className="relative w-full aspect-square flex items-center justify-center select-none overflow-hidden bg-black">
                    <img ref={imgRef} src={imageUrl} alt="For cropping" className="max-w-full max-h-full" draggable="false" />
                    {screenCrop && (
                        <>
                            <div className="absolute inset-0 bg-black/70 pointer-events-none" style={{
                                clipPath: `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, ${screenCrop.x}px ${screenCrop.y}px, ${screenCrop.x}px ${screenCrop.y + screenCrop.height}px, ${screenCrop.x + screenCrop.width}px ${screenCrop.y + screenCrop.height}px, ${screenCrop.x + screenCrop.width}px ${screenCrop.y}px, ${screenCrop.x}px ${screenCrop.y}px)`
                            }}></div>
                            <div
                                className="absolute border-2 border-dashed border-blue-400 cursor-move"
                                style={{
                                    left: screenCrop.x, top: screenCrop.y,
                                    width: screenCrop.width, height: screenCrop.height,
                                }}
                                onMouseDown={handleInteractionStart}
                                onTouchStart={handleInteractionStart}
                            ></div>
                        </>
                    )}
                </div>
                <div className="p-4 bg-slate-800/50 flex justify-end items-center gap-4">
                     <button onClick={initSquareCrop} className="px-4 py-2 bg-slate-600 hover:bg-slate-700 rounded-lg text-white font-semibold transition-colors">Center Square</button>
                    <button onClick={onClose} className="px-4 py-2 bg-slate-600 hover:bg-slate-700 rounded-lg text-white font-semibold transition-colors">{t.cropper_cancel}</button>
                    <button onClick={handleApply} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors">{t.cropper_apply}</button>
                </div>
            </div>
        </div>
    );
};

export default ImageCropperOverlay;