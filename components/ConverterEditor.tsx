import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

// Declare global fabric object
declare const fabric: any;

type AspectRatioMode = '1:1' | '4:5' | 'free';

interface ConverterEditorProps {
    sourceUrl: string;
    onApply: (dataUrl: string) => void;
    onClose: () => void;
    initialAspectRatio?: AspectRatioMode;
}

const ConverterEditor: React.FC<ConverterEditorProps> = ({ sourceUrl, onApply, onClose, initialAspectRatio }) => {
    const { t } = useLanguage();
    
    const [outputWidth, setOutputWidth] = useState('');
    const [outputHeight, setOutputHeight] = useState('');
    const [aspectRatioMode, setAspectRatioMode] = useState<AspectRatioMode>(initialAspectRatio || 'free');
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const cropFrameRef = useRef<HTMLDivElement>(null);
    
    const fabricCanvasRef = useRef<any>(null);
    const imageRef = useRef<any>(null);
    const isPanning = useRef(false);
    const lastPanPoint = useRef({ x: 0, y: 0 });
    const isMounted = useRef(false);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const getAspectRatio = useCallback(() => {
        switch (aspectRatioMode) {
            case '1:1': return 1;
            case '4:5': return 4 / 5;
            default:
                const w = parseInt(outputWidth, 10);
                const h = parseInt(outputHeight, 10);
                return (w > 0 && h > 0) ? w / h : null;
        }
    }, [aspectRatioMode, outputWidth, outputHeight]);


    const fitImageToFrame = useCallback(() => {
        const canvas = fabricCanvasRef.current;
        const image = imageRef.current;
        const frame = cropFrameRef.current;
        if (!canvas || !image || !frame) return;
        
        const frameRect = frame.getBoundingClientRect();
        
        const imgAspect = image.width / image.height;
        const frameAspect = frameRect.width / frameRect.height;
        
        let scale;
        if (imgAspect > frameAspect) {
            // Image is wider than frame, fit to height
            scale = frameRect.height / image.height;
        } else {
            // Image is taller than frame, fit to width
            scale = frameRect.width / image.width;
        }

        image.scale(scale);
        canvas.centerObject(image);
        canvas.renderAll();
    }, []);

    const constrainImageBounds = useCallback(() => {
        const canvas = fabricCanvasRef.current;
        const image = imageRef.current;
        const frame = cropFrameRef.current;
        if (!canvas || !image || !frame) return;

        const frameRect = frame.getBoundingClientRect();
        const canvasRect = canvas.getElement().getBoundingClientRect();
        
        const frameLeft = frameRect.left - canvasRect.left;
        const frameTop = frameRect.top - canvasRect.top;

        const scaledWidth = image.getScaledWidth();
        const scaledHeight = image.getScaledHeight();

        // Only apply panning constraints if the image is larger than the frame in at least one dimension.
        // This allows smaller images to be panned freely inside the frame.
        if (scaledWidth > frameRect.width || scaledHeight > frameRect.height) {
            const imgBounds = image.getBoundingRect();

            // Constrain left edge
            if (imgBounds.left > frameLeft) {
                image.left = frameLeft + imgBounds.width / 2;
            }
            // Constrain top edge
            if (imgBounds.top > frameTop) {
                image.top = frameTop + imgBounds.height / 2;
            }
            // Constrain right edge
            if (imgBounds.left + imgBounds.width < frameLeft + frameRect.width) {
                image.left = frameLeft + frameRect.width - imgBounds.width / 2;
            }
            // Constrain bottom edge
            if (imgBounds.top + imgBounds.height < frameTop + frameRect.height) {
                image.top = frameTop + frameRect.height - imgBounds.height / 2;
            }
        }
        
        image.setCoords();

    }, []);
    
    // Initialize Fabric canvas
    useEffect(() => {
        if (!canvasRef.current || !canvasContainerRef.current) return;

        const canvas = new fabric.Canvas(canvasRef.current, {
            selection: false,
            backgroundColor: '#ffffff' // Set to white as per user request
        });
        fabricCanvasRef.current = canvas;

        fabric.Image.fromURL(sourceUrl, (img: any) => {
            if (!isMounted.current) return;
            imageRef.current = img;
            img.set({
                originX: 'center',
                originY: 'center',
                selectable: false,
                evented: true,
                hasControls: false,
                hasBorders: false,
            });
            canvas.add(img);
            if (!initialAspectRatio) {
              setOutputWidth(img.width.toString());
              setOutputHeight(img.height.toString());
            } else if (initialAspectRatio === '1:1') {
                const size = Math.min(img.width, img.height);
                setOutputWidth(size.toString());
                setOutputHeight(size.toString());
            }
            fitImageToFrame();
        }, { crossOrigin: 'anonymous' });
        
        // Pan logic
        canvas.on('mouse:down', (opt: any) => {
            const e = opt.e;
            if (opt.target) {
                isPanning.current = true;
                lastPanPoint.current = { x: e.clientX, y: e.clientY };
                canvas.selection = false; // Disable selection while panning
            }
        });
        canvas.on('mouse:move', (opt: any) => {
            if (!isPanning.current) return;
            const e = opt.e;
            imageRef.current.left += e.clientX - lastPanPoint.current.x;
            imageRef.current.top += e.clientY - lastPanPoint.current.y;
            imageRef.current.setCoords();
            constrainImageBounds();
            canvas.renderAll();
            lastPanPoint.current = { x: e.clientX, y: e.clientY };
        });
        canvas.on('mouse:up', () => {
            isPanning.current = false;
            canvas.selection = true;
        });

        // Zoom logic
        canvas.on('mouse:wheel', (opt: any) => {
            const delta = opt.e.deltaY;
            const zoomAmount = -delta / 1000;
            const newScale = imageRef.current.scaleX + zoomAmount;
            
            // Prevent zoom from becoming too small (or negative)
            if (newScale < 0.01) {
                return;
            }
            
            imageRef.current.scale(newScale).setCoords();
            constrainImageBounds();
            canvas.renderAll();
            opt.e.preventDefault();
            opt.e.stopPropagation();
        });


        const resizeObserver = new ResizeObserver(entries => {
            if (!isMounted.current || !entries[0]) return;
            const { width, height } = entries[0].contentRect;
            canvas.setWidth(width);
            canvas.setHeight(height);
            fitImageToFrame();
        });

        resizeObserver.observe(canvasContainerRef.current);

        return () => {
            if (canvasContainerRef.current) {
                resizeObserver.unobserve(canvasContainerRef.current);
            }
            canvas.dispose();
        };
    }, [sourceUrl, fitImageToFrame, constrainImageBounds, initialAspectRatio]);
    
    // Recalculate image fit when aspect ratio changes
    useEffect(() => {
        fitImageToFrame();
    }, [aspectRatioMode, fitImageToFrame]);


    const handleApply = useCallback(() => {
        const canvas = fabricCanvasRef.current;
        const image = imageRef.current;
        const frame = cropFrameRef.current;
        if (!canvas || !frame || !image) return;
    
        const finalWidth = parseInt(outputWidth, 10);
        const finalHeight = parseInt(outputHeight, 10);
        if (isNaN(finalWidth) || isNaN(finalHeight) || finalWidth <= 0 || finalHeight <= 0) {
            alert("Please enter valid width and height.");
            return;
        }
    
        const frameRect = frame.getBoundingClientRect();
        const canvasEl = canvas.getElement();
        const canvasRect = canvasEl.getBoundingClientRect();
    
        const frameLeftOnCanvas = frameRect.left - canvasRect.left;
        const frameTopOnCanvas = frameRect.top - canvasRect.top;

        // Calculate the source crop area based on the image's position and scale
        const zoom = image.scaleX; // Assuming uniform scaling
        const imgLeftOnCanvas = image.left - image.getScaledWidth() / 2;
        const imgTopOnCanvas = image.top - image.getScaledHeight() / 2;

        const sx = (frameLeftOnCanvas - imgLeftOnCanvas) / zoom;
        const sy = (frameTopOnCanvas - imgTopOnCanvas) / zoom;
        const sWidth = frameRect.width / zoom;
        const sHeight = frameRect.height / zoom;
    
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = finalWidth;
        exportCanvas.height = finalHeight;
        const ctx = exportCanvas.getContext('2d');
        if (!ctx) return;
    
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, finalWidth, finalHeight);
        ctx.imageSmoothingQuality = 'high';

        const sourceAspectRatio = sWidth / sHeight;
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
            image.getElement(), // The original image element
            sx, sy, sWidth, sHeight, // Source crop rectangle (from original image)
            destX, destY, destWidth, destHeight // Destination rectangle (on final canvas)
        );

        const finalDataUrl = exportCanvas.toDataURL('image/png');
        onApply(finalDataUrl);

    }, [outputWidth, outputHeight, onApply]);

    const handleSetAspectRatioMode = useCallback((mode: AspectRatioMode) => {
        setAspectRatioMode(mode);
        const ratio = mode === '1:1' ? 1 : mode === '4:5' ? 4 / 5 : null;
        if (ratio) {
            const currentW = parseInt(outputWidth, 10);
            if (!isNaN(currentW) && currentW > 0) {
                setOutputHeight(Math.round(currentW / ratio).toString());
            }
        }
    }, [outputWidth]);

    const handleWidthChange = useCallback((value: string) => {
        setOutputWidth(value);
        const ratio = getAspectRatio();
        if (ratio) {
            const widthNum = parseInt(value, 10);
            if (!isNaN(widthNum) && widthNum > 0) {
                setOutputHeight(Math.round(widthNum / ratio).toString());
            } else if (value === '') {
                 setOutputHeight('');
            }
        }
    }, [getAspectRatio]);

    const handleHeightChange = useCallback((value: string) => {
        setOutputHeight(value);
        const ratio = getAspectRatio();
        if (ratio) {
            const heightNum = parseInt(value, 10);
            if (!isNaN(heightNum) && heightNum > 0) {
                setOutputWidth(Math.round(heightNum * ratio).toString());
            } else if (value === '') {
                 setOutputWidth('');
            }
        }
    }, [getAspectRatio]);

    const frameStyle: React.CSSProperties = {};
    const currentAspectRatio = getAspectRatio();
    if (currentAspectRatio) {
        frameStyle.aspectRatio = `${currentAspectRatio}`;
    }


    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4" onMouseDown={onClose}>
            <div 
                className="bg-slate-900 rounded-2xl shadow-2xl w-[95vw] h-[95vh] flex flex-col overflow-hidden" 
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div 
                    ref={canvasContainerRef}
                    className="flex-grow flex flex-col min-h-0 relative w-full h-full cursor-grab active:cursor-grabbing"
                >
                    <canvas ref={canvasRef} className="w-full h-full" />
                    <div 
                        ref={cropFrameRef}
                        className={`absolute m-auto inset-0 border-2 border-dashed border-blue-400 pointer-events-none ${currentAspectRatio ? 'w-auto h-auto max-w-full max-h-full' : 'w-full h-full'}`}
                        style={{
                            ...frameStyle,
                            boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)',
                        }}
                    ></div>
                </div>

                <div className="p-4 bg-slate-800/50 border-t border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="flex items-center gap-2">
                             <input
                                type="number"
                                value={outputWidth}
                                onChange={(e) => handleWidthChange(e.target.value)}
                                placeholder={t.width}
                                className="w-full bg-slate-850 text-white placeholder-slate-400 p-2 rounded-md border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-slate-400">x</span>
                             <input
                                type="number"
                                value={outputHeight}
                                onChange={(e) => handleHeightChange(e.target.value)}
                                placeholder={t.height}
                                className="w-full bg-slate-850 text-white placeholder-slate-400 p-2 rounded-md border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        
                        <div className="flex items-center gap-2 justify-start md:justify-center">
                            <button onClick={() => handleSetAspectRatioMode('1:1')} className={`px-3 py-2 text-sm rounded-lg font-semibold transition-colors ${aspectRatioMode === '1:1' ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>{t.cropper_square}</button>
                            <button onClick={() => handleSetAspectRatioMode('4:5')} className={`px-3 py-2 text-sm rounded-lg font-semibold transition-colors ${aspectRatioMode === '4:5' ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>{t.cropper_4_5}</button>
                            <button onClick={() => handleSetAspectRatioMode('free')} className={`px-3 py-2 text-sm rounded-lg font-semibold transition-colors ${aspectRatioMode === 'free' ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>{t.cropper_free}</button>
                            
                        </div>

                        <div className="flex justify-end items-center gap-4">
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

export default ConverterEditor;