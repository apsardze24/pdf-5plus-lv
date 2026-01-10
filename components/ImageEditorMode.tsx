

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { EditorTool } from '../types';
import { Translation } from '../constants/translations';
import EditorResizeAndCropOverlay from './EditorResizeAndCropOverlay';
import SignaturePadOverlay from './SignaturePadOverlay';
import { FONT_FAMILES, PRESET_COLORS } from '../constants';
import FontSelector from './FontSelector';

import { CropIcon } from './icons/CropIcon';
import { UndoIcon } from './icons/UndoIcon';
import { FlipHorizontalIcon } from './icons/FlipHorizontalIcon';
import { FlipVerticalIcon } from './icons/FlipVerticalIcon';
import { ArrowIcon } from './icons/ArrowIcon';
import { RectangleIcon } from './icons/RectangleIcon';
import { CircleIcon } from './icons/CircleIcon';
import { TextIcon } from './icons/TextIcon';
import { ShareIcon } from './icons/ShareIcon';
import { SlidersIcon } from './icons/SlidersIcon';
import { TrashIcon } from './icons/TrashIcon';
import { SignatureIcon } from './icons/SignatureIcon';
import { PenIcon } from './icons/PenIcon';
import { EraserIcon } from './icons/EraserIcon';
import { EyedropperIcon } from './icons/EyedropperIcon';
import { CloseIcon } from './icons/CloseIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { PuzzleIcon } from './icons/PuzzleIcon';
import { StampRIcon } from './icons/StampRIcon';
import { ImageIcon } from './icons/ImageIcon';
import { LineIcon } from './icons/LineIcon';
import { SaveIcon } from './icons/SaveIcon';


// Declare global libraries from CDN scripts
declare const fabric: any;
declare const JSZip: any;
declare const jspdf: any;
declare const pdfjsLib: any;
// Declare global saveAs function from CDN script to prevent TypeScript errors.
declare var saveAs: any;

// Make EyeDropper API available on window
declare global {
    interface Window {
        EyeDropper?: any;
    }
}


interface ImageEditorModeProps {
  imageFiles: File[];
  onNewImage: () => void;
  activeImageDataUrl: string | null;
  onImageProcessed: (dataUrl: string) => void;
}

interface CurrentProperties {
    color: string;
    thickness: number;
    transparencyEnabled: boolean;
    transparency: number; // 0-100 (where 100 is fully transparent)
    fontFamily: string;
    fontSize: number;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
}


// A simple debounce function that returns a function with a `cancel` method
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce(func: (...args: any[]) => void, wait: number) {
    let timeout: number | undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const debounced = function(this: any, ...args: any[]) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const context = this;
        const later = function() {
            timeout = undefined;
            func.apply(context, args);
        };
        clearTimeout(timeout);
        timeout = window.setTimeout(later, wait);
    };

    debounced.cancel = () => {
        clearTimeout(timeout);
    };

    return debounced;
}


// Helper function to safely get coordinates from mouse or touch events
const getEventPosition = (e: any) => {
    if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (typeof e.clientX !== 'undefined' && typeof e.clientY !== 'undefined') {
        return { x: e.clientX, y: e.clientY };
    }
    return null;
};


const RangeInput: React.FC<{ label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number, unit?: string; disabled?: boolean; }> = ({ label, value, onChange, min = 0, max = 100, step = 1, unit = '', disabled }) => {
    const displayValue = value.toFixed(!Number.isInteger(step) ? 1 : 0);
    return (
        <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">{label} ({displayValue}{unit})</label>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full"
            />
        </div>
    );
};


const ImageEditorMode: React.FC<ImageEditorModeProps> = ({ imageFiles, onNewImage, activeImageDataUrl, onImageProcessed }) => {
    const { t } = useLanguage();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [fabricCanvas, setFabricCanvas] = useState<any>(null);
    const [activeObject, setActiveObject] = useState<any>(null);
    
    const [history, setHistory] = useState<any[]>([]);
    const [currentStateIndex, setCurrentStateIndex] = useState<number>(-1);
    const historyLock = useRef(false);
    
    const [editorTool, setEditorTool] = useState<EditorTool>('select');
    const currentToolRef = useRef(editorTool);
    useEffect(() => {
        currentToolRef.current = editorTool;
    }, [editorTool]);

    const [currentProperties, setCurrentProperties] = useState<CurrentProperties>({
        color: '#4285F4',
        thickness: 30,
        transparencyEnabled: false,
        transparency: 0,
        fontFamily: 'Arial',
        fontSize: 80,
        fontWeight: 'normal',
        fontStyle: 'normal',
    });
    const currentPropertiesRef = useRef(currentProperties);
    useEffect(() => {
        currentPropertiesRef.current = currentProperties;
    }, [currentProperties]);
    
    const [canvasBackgroundColor, setCanvasBackgroundColor] = useState('#FFFFFF');
    const isMounted = useRef(false);

    // Create a ref to hold the latest history state to avoid stale closures in canvas event listeners.
    const historyRef = useRef({ history, currentStateIndex });
    useEffect(() => {
        historyRef.current = { history, currentStateIndex };
    }, [history, currentStateIndex]);


    const [isResizeCropOpen, setIsResizeCropOpen] = useState(false);
    const [resizeCropSourceUrl, setResizeCropSourceUrl] = useState('');
    const [isProcessingZip, setIsProcessingZip] = useState(false);
    
    const [propertiesPanelState, setPropertiesPanelState] = useState<'open' | 'closed'>('closed');
    
    const isBatchMode = useMemo(() => imageFiles.length > 1, [imageFiles]);
    
    const isPinchingRef = useRef(false);
    const isInitialZoomRef = useRef(false);

    // PDF specific state
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [isPdf, setIsPdf] = useState(false);
    const [isPdfRendering, setIsPdfRendering] = useState(false);
    const [isSignaturePadOpen, setIsSignaturePadOpen] = useState(false);
    
    const singleImageFile = useMemo(() => imageFiles.length === 1 ? imageFiles[0] : null, [imageFiles]);

    const LATVIAN_RED = '#9D2235';
    
    const getFinalDataUrl = useCallback(() => {
        if (!fabricCanvas) return null;

        const bgImage = fabricCanvas.backgroundImage;
        if (!bgImage) return fabricCanvas.toDataURL({ format: 'png', quality: 1 });

        const originalWidth = fabricCanvas.getWidth();
        const originalHeight = fabricCanvas.getHeight();
        const originalZoom = fabricCanvas.getZoom();
        const originalVpt = [...fabricCanvas.viewportTransform];

        fabricCanvas.setWidth(bgImage.width);
        fabricCanvas.setHeight(bgImage.height);
        fabricCanvas.setZoom(1);
        fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        
        const dataURL = fabricCanvas.toDataURL({ format: 'png', quality: 1 });

        fabricCanvas.setWidth(originalWidth);
        fabricCanvas.setHeight(originalHeight);
        fabricCanvas.setZoom(originalZoom);
        fabricCanvas.setViewportTransform(originalVpt);
        fabricCanvas.renderAll();

        return dataURL;
    }, [fabricCanvas]);

    // Automatically save the canvas state to the parent component when unmounting (e.g., switching modes)
    useEffect(() => {
        return () => {
            if (fabricCanvas) {
                const dataUrl = getFinalDataUrl();
                if (dataUrl) {
                    onImageProcessed(dataUrl);
                }
            }
        };
    }, [fabricCanvas, getFinalDataUrl, onImageProcessed]);


    const undo = useCallback(() => {
        if (!isMounted.current || currentStateIndex <= 0 || !fabricCanvas) return;

        historyLock.current = true;
        const newIndex = currentStateIndex - 1;
        const prevState = history[newIndex];
        
        fabricCanvas.loadFromJSON(prevState, () => {
            if (!isMounted.current) return;
            fabricCanvas.renderAll();
            historyLock.current = false;
            setCurrentStateIndex(newIndex);
            setActiveObject(fabricCanvas.getActiveObject());
        });
    }, [fabricCanvas, history, currentStateIndex]);
    
    const deleteSelectedObject = useCallback(() => {
        if (!fabricCanvas) return;
        const activeObj = fabricCanvas.getActiveObject();
        if (!activeObj) return;

        if (activeObj.type === 'activeSelection') {
             // Create a safe copy of the objects array before iterating
            const objectsToRemove = [...activeObj.getObjects()];
            fabricCanvas.discardActiveObject();
            objectsToRemove.forEach((obj: any) => {
                fabricCanvas.remove(obj);
            });
        } else {
            fabricCanvas.remove(activeObj);
        }
        fabricCanvas.requestRenderAll();
    }, [fabricCanvas]);

    // Keyboard delete listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!fabricCanvas) return;
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
                return;
            }

            const activeObj = fabricCanvas.getActiveObject();
            if (activeObj && (e.key === 'Delete' || e.key === 'Backspace')) {
                e.preventDefault();
                deleteSelectedObject();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [fabricCanvas, deleteSelectedObject]);

    // Initialize Fabric.js canvas - runs only once on mount
    useEffect(() => {
        isMounted.current = true;
        if (!canvasRef.current || typeof fabric === 'undefined') {
             if (typeof fabric === 'undefined') {
                console.error("Fabric.js library not loaded. Cannot initialize editor.");
            }
            return;
        }
        
        // --- Custom Delete Control ---
        const renderDeleteControl = (ctx: CanvasRenderingContext2D, left: number, top: number) => {
            const size = 20;
            const radius = size / 2;
            ctx.save();
            ctx.translate(left, top);
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2, false);
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#94a3b8'; // slate-400 for border
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-radius * 0.5, 0);
            ctx.lineTo(radius * 0.5, 0);
            ctx.strokeStyle = '#ef4444'; // red-500 for minus
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        };

        const deleteObjectAction = (eventData: MouseEvent, transform: any) => {
            const target = transform.target;
            const canvas = target.canvas;
            if (!target || !canvas) return false;

            if (target.type === 'activeSelection') {
                // Create a copy of the objects array before modification to prevent iterator issues
                const objectsToRemove = [...target.getObjects()];
                canvas.discardActiveObject();
                objectsToRemove.forEach((obj: any) => canvas.remove(obj));
            } else {
                canvas.remove(target);
            }
            canvas.requestRenderAll();
            return true;
        };

        const deleteControl = new fabric.Control({
            x: 0.5,
            y: -0.5,
            offsetY: -12,
            offsetX: 12,
            cursorStyle: 'pointer',
            mouseUpHandler: deleteObjectAction,
            render: renderDeleteControl,
            cornerSize: 24,
        });
        
        fabric.Object.prototype.controls.deleteControl = deleteControl;
        fabric.Object.prototype.transparentCorners = false;
        fabric.Object.prototype.cornerColor = '#4285F4';
        fabric.Object.prototype.cornerStyle = 'circle';
        fabric.Object.prototype.cornerSize = 10;
        fabric.Object.prototype.borderColor = '#4285F4';
        fabric.Object.prototype.borderScaleFactor = 2;
        // --- End Custom Delete Control ---


        const canvas = new fabric.Canvas(canvasRef.current, { 
            backgroundColor: '#FFFFFF', // Initial color, will be updated by effect
            preserveObjectStacking: true,
        });
        setFabricCanvas(canvas);
        
        const resizeObserver = new ResizeObserver(entries => {
            if (!entries || entries.length === 0) return;
            const { width, height } = entries[0].contentRect;
            canvas.setWidth(width);
            canvas.setHeight(height);

            if (isInitialZoomRef.current && canvas.backgroundImage) {
                const bgImage = canvas.backgroundImage;
                const canvasWidth = canvas.getWidth();
                const canvasHeight = canvas.getHeight();
                const zoomX = canvasWidth / bgImage.width;
                const zoomY = canvasHeight / bgImage.height;
                const zoom = Math.min(zoomX, zoomY) * 0.95; // Fit with a little padding
                
                canvas.setZoom(zoom);
                const vpt = canvas.viewportTransform;
                vpt[4] = (canvasWidth - (bgImage.width * zoom)) / 2;
                vpt[5] = (canvasHeight - (bgImage.height * zoom)) / 2;
                
                isInitialZoomRef.current = false;
            }

            canvas.renderAll();
        });

        if (canvasContainerRef.current) {
            resizeObserver.observe(canvasContainerRef.current);
        }

        const handleSelection = (e: any) => {
            const selection = e.target || (e.selected && e.selected.length > 0 ? e.selected[0] : null);
            setActiveObject(selection);
        };
        
        const updateHistory = () => {
            if (historyLock.current) return;
            const json = canvas.toJSON(['backgroundImage']);
            const { history: currentHistory, currentStateIndex: currentIndex } = historyRef.current;
            
            const newHistory = currentHistory.slice(0, currentIndex + 1);
            newHistory.push(json);

            setHistory(newHistory);
            setCurrentStateIndex(newHistory.length - 1);
        };

        const debouncedUpdateHistory = debounce(updateHistory, 300);

        canvas.on({
            'selection:created': handleSelection,
            'selection:updated': handleSelection,
            'selection:cleared': () => setActiveObject(null),
            'object:modified': (e: any) => {
                setActiveObject(canvas.getActiveObject());
                debouncedUpdateHistory();
            },
            'object:added': debouncedUpdateHistory,
            'object:removed': debouncedUpdateHistory,
            'path:created': (e: any) => {
                if (currentToolRef.current === 'pen') {
                    canvas.setActiveObject(e.path);
                    setEditorTool('select');
                    canvas.renderAll();
                } else if (currentToolRef.current === 'eraser') {
                    e.path.set({
                        selectable: false,
                        evented: false,
                    });
                    // Don't change tool, don't set active object
                    canvas.renderAll();
                }
            },
        });

        // --- Panning and Zooming Logic ---
        canvas.on('mouse:wheel', function(this: any, opt: any) {
            if (currentToolRef.current === 'pen' || currentToolRef.current === 'eraser') return;
            const delta = opt.e.deltaY;
            let zoom = this.getZoom();
            
            // Use a multiplicative factor for smoother zoom
            zoom *= 1 - (delta / 500);

            // Set max and a much lower min zoom
            if (zoom > 20) zoom = 20;
            if (zoom < 0.05) zoom = 0.05; // Allow zooming out much further
            
            this.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
            opt.e.preventDefault();
            opt.e.stopPropagation();
        });

        let pinchStartDistance = 0;

        canvas.on('mouse:down', function(this: any, opt: any) {
            const e = opt.e;
            if (e.touches && e.touches.length === 2) {
                isPinchingRef.current = true;
                this.isDragging = false;
                pinchStartDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
            } else if (!opt.target) {
                if (currentToolRef.current !== 'select') return;
                const pos = getEventPosition(e);
                if (pos) {
                    this.isDragging = true;
                    this.selection = false;
                    this.lastPosX = pos.x;
                    this.lastPosY = pos.y;
                }
            }
        });

        canvas.on('mouse:move', function(this: any, opt: any) {
            const e = opt.e;
            if (this.isDragging) {
                 if (currentToolRef.current !== 'select') {
                    this.isDragging = false;
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
            }

            if (e.touches && e.touches.length === 2) {
                this.isDragging = false;

                if (!isPinchingRef.current) {
                    isPinchingRef.current = true;
                    pinchStartDistance = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                }

                const currentDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );

                if (pinchStartDistance > 0) {
                    let zoom = this.getZoom() * (currentDist / pinchStartDistance);
                    if (zoom > 20) zoom = 20;
                    if (zoom < 0.05) zoom = 0.05; // Lower min zoom limit, matching mouse wheel
                    
                    const rect = this.getElement().getBoundingClientRect();
                    const center = {
                        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
                    };
                    const point = new fabric.Point(center.x - rect.left, center.y - rect.top);
                    this.zoomToPoint(point, zoom);
                }
                pinchStartDistance = currentDist;

            } else if (this.isDragging) {
                const pos = getEventPosition(e);
                if (pos && typeof this.lastPosX !== 'undefined') {
                    const vpt = this.viewportTransform;
                    vpt[4] += pos.x - this.lastPosX;
                    vpt[5] += pos.y - this.lastPosY;
                    this.requestRenderAll();
                    this.lastPosX = pos.x;
                    this.lastPosY = pos.y;
                }
            }
        });

        canvas.on('mouse:up', function(this: any) {
            if (this.isDragging) {
                this.setViewportTransform(this.viewportTransform);
            }
            this.isDragging = false;
            this.selection = true;
            pinchStartDistance = 0;
            isPinchingRef.current = false;
        });
        
        const upperCanvasEl = canvas.upperCanvasEl;
        const preventDefault = (e: Event) => {
             // Only prevent default if we're panning the canvas itself, not interacting with an object
            if (canvas.isDragging) {
                e.preventDefault();
            }
        }
        upperCanvasEl.addEventListener('touchstart', preventDefault, { passive: true }); // Let browser decide for start
        upperCanvasEl.addEventListener('touchmove', preventDefault, { passive: false }); // Actively prevent scroll during move


        return () => {
             isMounted.current = false;
             if (canvasContainerRef.current) {
                resizeObserver.unobserve(canvasContainerRef.current);
            }
            // Cancel any pending history updates to prevent errors on unmount
            debouncedUpdateHistory.cancel();
            upperCanvasEl.removeEventListener('touchstart', preventDefault);
            upperCanvasEl.removeEventListener('touchmove', preventDefault);
            canvas.dispose();
        };
    }, []); // Empty dependency array ensures this runs only once.
    
    // Effect to update canvas background color when it changes
    useEffect(() => {
        if (fabricCanvas) {
            fabricCanvas.set('backgroundColor', canvasBackgroundColor);
            fabricCanvas.renderAll();
        }
    }, [fabricCanvas, canvasBackgroundColor]);

    // Effect for handling editor tool changes
    useEffect(() => {
        if (!fabricCanvas) return;

        // Default state: select/pan mode
        fabricCanvas.isDrawingMode = false;
        fabricCanvas.selection = true;
        fabricCanvas.forEachObject((obj: any) => obj.set({ selectable: true }));
        fabricCanvas.defaultCursor = 'grab';
        fabricCanvas.hoverCursor = 'move';

        switch (editorTool) {
            case 'pen':
                fabricCanvas.isDrawingMode = true;
                fabricCanvas.selection = false;
                fabricCanvas.forEachObject((obj: any) => obj.set({ selectable: false }));
                fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
                fabricCanvas.freeDrawingBrush.color = currentProperties.color;
                fabricCanvas.freeDrawingBrush.width = currentProperties.thickness;
                break;
            case 'eraser':
                fabricCanvas.isDrawingMode = true;
                fabricCanvas.selection = false;
                fabricCanvas.forEachObject((obj: any) => obj.set({ selectable: false }));
                fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
                fabricCanvas.freeDrawingBrush.color = '#FFFFFF';
                fabricCanvas.freeDrawingBrush.width = currentProperties.thickness;
                break;
            case 'select':
                 // Already set as default
                break;
        }
        fabricCanvas.renderAll();
    }, [editorTool, fabricCanvas, currentProperties.color, currentProperties.thickness]);

    const activeObjectType = useMemo(() => {
        if (!activeObject) return null;
        if (activeObject.type === 'activeSelection') return 'group';
        if (activeObject.isSignature) return 'signature';
        if (activeObject.type === 'i-text') return 'text';
        if (activeObject.type === 'image') return 'image';
        return 'shape';
    }, [activeObject]);

    // Sync active object's properties TO the properties panel state
    useEffect(() => {
        if (activeObject && activeObjectType !== 'group') {
            const isText = activeObjectType === 'text';
            const opacity = activeObject.get('opacity') || 1;
            const transparency = Math.round((1 - opacity) * 100);

            setCurrentProperties(prev => ({
                ...prev,
                color: (isText ? activeObject.get('fill') : activeObject.get('stroke')) || '#000000',
                thickness: activeObject.get('strokeWidth') || 0,
                transparencyEnabled: transparency > 0,
                transparency: transparency,
                fontFamily: activeObject.get('fontFamily') || 'Arial',
                fontSize: activeObject.get('fontSize') || 40,
                fontWeight: activeObject.get('fontWeight') || 'normal',
                fontStyle: activeObject.get('fontStyle') || 'normal',
            }));
             if (propertiesPanelState === 'closed') {
                setPropertiesPanelState('open');
            }
        }
    }, [activeObject, activeObjectType, propertiesPanelState]);

    const loadImageToCanvas = useCallback((imageUrl: string) => {
        if (!fabricCanvas || !canvasContainerRef.current) return;
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            if (!isMounted.current) return;
            const fabricImage = new fabric.Image(img);
            fabricCanvas.clear();
            setHistory([]);
            setCurrentStateIndex(-1);
            
            fabricCanvas.setBackgroundImage(fabricImage, () => {
                if (!isMounted.current) return;
                fabricCanvas.renderAll();
                const initialJson = fabricCanvas.toJSON(['backgroundImage']);
                setHistory([initialJson]);
                setCurrentStateIndex(0);
                historyLock.current = false;
                isInitialZoomRef.current = true;
                setEditorTool('select'); 
            }, {});
            
            if(canvasContainerRef.current) {
                canvasContainerRef.current.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
            }
        };
        img.src = imageUrl;
    
    }, [fabricCanvas]);
    
    const renderPdfPage = useCallback(async (pageNumber: number) => {
        if (!pdfDoc || !fabricCanvas) return;
        setIsPdfRendering(true);
        try {
            const page = await pdfDoc.getPage(pageNumber);
            if (!isMounted.current) return;
            const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better quality
            const tempCanvas = document.createElement('canvas');
            tempCanvas.height = viewport.height;
            tempCanvas.width = viewport.width;
            const renderContext = {
                canvasContext: tempCanvas.getContext('2d')!,
                viewport: viewport,
            };
            await page.render(renderContext).promise;
            if (isMounted.current) {
                loadImageToCanvas(tempCanvas.toDataURL('image/png'));
            }
        } finally {
            if (isMounted.current) {
                setIsPdfRendering(false);
            }
        }
    }, [pdfDoc, fabricCanvas, loadImageToCanvas]);

    useEffect(() => {
        if (pdfDoc && isPdf) {
            renderPdfPage(currentPage);
        }
    }, [pdfDoc, isPdf, currentPage, renderPdfPage]);
    
    useEffect(() => {
        if (fabricCanvas && singleImageFile) {
            if (singleImageFile.type === 'application/pdf') {
                if (isPdf) return; // Already a PDF, probably page change
                setIsPdf(true);
                setPdfDoc(null);
                setTotalPages(0);
                setCurrentPage(1);
                setCanvasBackgroundColor('#FFFFFF'); // PDFs usually have white background

                if (typeof pdfjsLib === 'undefined') {
                    alert('PDF library not loaded.'); return;
                }
                const loadingTask = pdfjsLib.getDocument(URL.createObjectURL(singleImageFile));
                loadingTask.promise.then((doc: any) => {
                    if (isMounted.current) {
                        setPdfDoc(doc);
                        setTotalPages(doc.numPages);
                    }
                });
            } else {
                setIsPdf(false);
                setCanvasBackgroundColor('#1e293b'); // Default for images
                if (activeImageDataUrl) loadImageToCanvas(activeImageDataUrl);
            }
        }
    }, [fabricCanvas, activeImageDataUrl, singleImageFile, loadImageToCanvas]);
    
    const handlePropertyChange = useCallback((updates: Partial<CurrentProperties>) => {
        const newProps = { ...currentProperties, ...updates };
        setCurrentProperties(newProps);

        if (!activeObject || activeObjectType === 'group') return;

        const isText = activeObjectType === 'text';
        
        const propsToSet: any = {};
        
        if (updates.color !== undefined) {
            propsToSet[isText ? 'fill' : 'stroke'] = updates.color;
        }
        if (updates.thickness !== undefined) {
            propsToSet.strokeWidth = updates.thickness;
        }
        if (updates.transparency !== undefined || updates.transparencyEnabled !== undefined) {
             const enabled = updates.transparencyEnabled !== undefined ? updates.transparencyEnabled : newProps.transparencyEnabled;
             const value = updates.transparency !== undefined ? updates.transparency : newProps.transparency;
             propsToSet.opacity = enabled ? (100 - value) / 100 : 1;
        }
        if (updates.fontFamily !== undefined) {
            propsToSet.fontFamily = updates.fontFamily;
        }
        if (updates.fontSize !== undefined) {
            propsToSet.fontSize = updates.fontSize;
        }
        if (updates.fontWeight !== undefined) {
            propsToSet.fontWeight = updates.fontWeight;
        }
        if (updates.fontStyle !== undefined) {
            propsToSet.fontStyle = updates.fontStyle;
        }
        
        activeObject.set(propsToSet);
        fabricCanvas.renderAll();
    }, [activeObject, fabricCanvas, activeObjectType, currentProperties]);
    
    const handleEyedropper = useCallback(async () => {
        if (!window.EyeDropper) {
            console.warn('EyeDropper API not supported in this browser.');
            return;
        }
        try {
            const eyeDropper = new window.EyeDropper();
            const result = await eyeDropper.open();
            handlePropertyChange({ color: result.sRGBHex });
        } catch (e) {
            // This is expected if the user cancels the eyedropper.
            console.log('EyeDropper was canceled by user.');
        }
    }, [handlePropertyChange]);

    const addShape = useCallback((shape: { type?: string; [key: string]: any; }, customProps: any = {}) => {
        if (!fabricCanvas) return;
        
        const isText = (shape as any).type === 'i-text';
        
        const defaultProps: any = {
            strokeUniform: true,
            opacity: currentPropertiesRef.current.transparencyEnabled ? (100 - currentPropertiesRef.current.transparency) / 100 : 1,
        };

        if (isText) {
            if (customProps.fill === undefined) defaultProps.fill = currentPropertiesRef.current.color;
            if (customProps.strokeWidth === undefined) defaultProps.strokeWidth = 0;
        } else if ((shape as any).type !== 'image' && !(shape as any).isSignature) { // Don't apply default stroke to images or signatures
            if (customProps.stroke === undefined) defaultProps.stroke = currentPropertiesRef.current.color;
            if (customProps.strokeWidth === undefined) defaultProps.strokeWidth = currentPropertiesRef.current.thickness;
        }
    
        const finalProps = { ...defaultProps, ...customProps };
        shape.set(finalProps);

        const zoom = fabricCanvas.getZoom();
        
        // Don't rescale images/signatures that are already scaled on creation
        if ((shape as any).type !== 'image' && !(shape as any).isSignature) {
            shape.scaleX = (shape.scaleX || 1) / zoom;
            shape.scaleY = (shape.scaleY || 1) / zoom;
        }

        const vpCenter = fabricCanvas.getVpCenter();
        
        shape.set({
            left: vpCenter.x,
            top: vpCenter.y,
            originX: shape.originX || 'center',
            originY: shape.originY || 'center',
        });

        fabricCanvas.add(shape);
        fabricCanvas.setActiveObject(shape);
        setEditorTool('select');
    }, [fabricCanvas, setEditorTool]);

    const handleImageShapeUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !fabricCanvas) return;

        const files = Array.from(e.target.files);

        files.forEach(file => {
            if (!file.type.startsWith('image/')) return;

            const reader = new FileReader();
            reader.onload = (f) => {
                const dataUrl = f.target?.result as string;
                fabric.Image.fromURL(dataUrl, (img: any) => {
                    if (!isMounted.current) return;
                    
                    const zoom = fabricCanvas.getZoom();
                    const targetWidth = (fabricCanvas.getWidth() / zoom) * 0.3;
                    img.scaleToWidth(targetWidth);
                    
                    addShape(img);
                }, { crossOrigin: 'anonymous' });
            };
            reader.readAsDataURL(file);
        });

        e.target.value = '';
    }, [fabricCanvas, addShape]);

    const addText = () => addShape(new fabric.IText('Text', {
        fontSize: currentProperties.fontSize, 
        fontFamily: currentProperties.fontFamily, 
        fontWeight: currentProperties.fontWeight,
        fontStyle: currentProperties.fontStyle,
        originX: 'center', 
        originY: 'center',
    }));

    const addStampR = () => {
        const stampText = new fabric.IText('Uz vietas Rīgā', {
            fontSize: 100,
            fontFamily: 'Russo One',
            fontWeight: 'normal',
            originX: 'center',
            originY: 'center',
        });
        addShape(stampText, { fill: LATVIAN_RED });
    };

    const addArrow = () => {
        const arrow = new fabric.Path('M 0 0 L 40 0 M 30 5 L 40 0 L 30 -5', {
            fill: false,
            scaleX: 3, scaleY: 3, angle: -45,
            originX: 'left', originY: 'center'
        });
        addShape(arrow);
    };

    const addLine = () => {
        const line = new fabric.Line([50, 100, 200, 100], {
            scaleX: 2, scaleY: 2,
            originX: 'center', originY: 'center'
        });
        addShape(line);
    };

    const addRect = () => addShape(new fabric.Rect({ fill: null, width: 200, height: 200, originX: 'center', originY: 'center' }));
    const addCircle = () => addShape(new fabric.Circle({ fill: null, radius: 100, originX: 'center', originY: 'center' }));
    
    const handleSignatureApply = useCallback((signatureDataUrl: string) => {
        if (!fabricCanvas || !signatureDataUrl) return;
        fabric.Image.fromURL(signatureDataUrl, (img: any) => {
            if (!isMounted.current) return;
            img.set({ isSignature: true }); // Custom property
            img.scaleToWidth(200 / fabricCanvas.getZoom());
            addShape(img);
        }, { crossOrigin: 'anonymous' });
        setIsSignaturePadOpen(false);
    }, [fabricCanvas, addShape]);

    const transformCanvas = (action: EditorTool) => {
        if (!fabricCanvas || !fabricCanvas.backgroundImage) return;
        const img = fabricCanvas.backgroundImage;
        switch (action) {
            case 'flipHorizontal': img.flipX = !img.flipX; break;
            case 'flipVertical': img.flipY = !img.flipY; break;
        }
        fabricCanvas.renderAll();
        // Manually trigger history update for background image changes
        const updateHistory = () => {
            if (historyLock.current) return;
            const json = fabricCanvas.toJSON(['backgroundImage']);
            const { history: currentHistory, currentStateIndex: currentIndex } = historyRef.current;
            const newHistory = currentHistory.slice(0, currentIndex + 1);
            newHistory.push(json);
            setHistory(newHistory);
            setCurrentStateIndex(newHistory.length - 1);
        };
        updateHistory();
    };

    const openResizeCropper = () => {
        if (!fabricCanvas) return;
        setResizeCropSourceUrl(getFinalDataUrl() || '');
        setIsResizeCropOpen(true);
    };
    
    const handleResizeCropApply = (dataUrl: string) => {
      loadImageToCanvas(dataUrl);
      onImageProcessed(dataUrl); // Update shared state
      setIsResizeCropOpen(false);
    };

    const downloadImage = async () => {
        const getBaseName = (fileName: string) => fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
        const baseFilename = singleImageFile ? getBaseName(singleImageFile.name) : (isPdf ? 'document' : 'image');
    
        if (isPdf) {
            if (typeof jspdf === 'undefined' || !jspdf.jsPDF) {
                 alert('jsPDF library not loaded.'); return;
            }
    
            const dataURL = getFinalDataUrl();
            if (!dataURL) return;
    
            const img = new Image();
            img.onload = () => {
                if (!isMounted.current) return;
                const { jsPDF } = jspdf;
                const pdf = new jsPDF({ 
                    orientation: img.naturalWidth > img.naturalHeight ? 'l' : 'p', 
                    unit: 'px', 
                    format: [img.naturalWidth, img.naturalHeight] 
                });
                pdf.addImage(img, 'PNG', 0, 0, img.naturalWidth, img.naturalHeight);
                pdf.save(`${baseFilename}-page-${currentPage}-edited.pdf`);
            };
            img.src = dataURL;
        } else {
            const dataURL = getFinalDataUrl();
            if (!dataURL) return;
    
            const link = document.createElement('a');
            link.download = `${baseFilename}-edited.png`;
            link.href = dataURL;
            link.click();
        }
    };

    const downloadZip = async () => {
        if (!isBatchMode) {
            // This should not be reachable if the button is disabled, but as a safeguard.
            return;
        }
        if (typeof JSZip === 'undefined' || typeof saveAs === 'undefined') {
            alert(t.downloadLibrariesWarning);
            return;
        }
        if (!fabricCanvas) return;

        // As per the UI hint, find a single text object to use as a watermark
        // FIX: Explicitly cast the objects and use any for the search predicate to avoid 'unknown' errors.
        const watermarkObject = (fabricCanvas.getObjects() as any[]).find((obj: any) => (obj as any).type === 'i-text');
        
        if (!watermarkObject) {
            alert(t.batch_watermark_info);
            return;
        }
        
        setIsProcessingZip(true);
        const zip = new JSZip();

        try {
            for (const file of imageFiles) {
                try {
                    const dataUrl = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = e => resolve(e.target?.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });

                    const tempCanvasEl = document.createElement('canvas');
                    const tempFabricCanvas = new fabric.Canvas(tempCanvasEl, { renderOnAddRemove: false });

                    const img = await new Promise<any>((resolve, reject) => {
                        fabric.Image.fromURL(dataUrl, (fabricImage: any) => {
                            if (fabricImage) resolve(fabricImage);
                            else reject(new Error('Failed to load image for zipping.'));
                        }, { crossOrigin: 'anonymous' });
                    });

                    tempFabricCanvas.setWidth(img.width);
                    tempFabricCanvas.setHeight(img.height);
                    tempFabricCanvas.setBackgroundImage(img, tempFabricCanvas.renderAll.bind(tempFabricCanvas));
                    
                    await new Promise<void>(resolve => {
                        watermarkObject.clone((cloned: any) => {
                            tempFabricCanvas.add(cloned);
                            cloned.center();
                            tempFabricCanvas.renderAll();
                            resolve();
                        });
                    });
                    
                    const blob: Blob | null = await new Promise<Blob | null>(resolve => tempCanvasEl.toBlob(resolve, 'image/png'));

                    if (blob) {
                        const baseFilename = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                        zip.file(`${baseFilename}-watermarked.png`, blob);
                    }
                    tempFabricCanvas.dispose();
                } catch (fileError) {
                    console.error(`Error processing ${file.name}:`, fileError);
                    // Optionally, inform the user that a file failed.
                }
            }
            
            // FIX: Await the zip generation and cast the result directly in the saveAs call to ensure correct type resolution.
            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content as any, 'watermarked-images.zip');

        } catch (error) {
            console.error('Batch processing failed:', error);
            alert('An error occurred during batch processing.');
        } finally {
            if (isMounted.current) {
                setIsProcessingZip(false);
            }
        }
    };

    const shareImage = async () => {
        const dataURL = getFinalDataUrl();
        if(!dataURL) return;
        const blob = await (await fetch(dataURL)).blob();
        const file = new File([blob], 'edited-image.png', { type: 'image/png' });

        if (navigator.share && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({ files: [file], title: 'Edited Image' });
            } catch (error) {
                console.error('Sharing failed', error);
                alert(t.shareFailed);
            }
        } else {
             alert(t.shareNotSupported);
        }
    };

    const toolActions: { name: EditorTool, icon: React.FC<any>, tooltipKey: keyof Translation, action: () => void }[] = [
        { name: 'crop', icon: CropIcon, tooltipKey: 'tool_crop', action: openResizeCropper },
        { name: 'flipHorizontal', icon: FlipHorizontalIcon, tooltipKey: 'flip_horizontal', action: () => transformCanvas('flipHorizontal')},
        { name: 'flipVertical', icon: FlipVerticalIcon, tooltipKey: 'flip_vertical', action: () => transformCanvas('flipVertical') },
    ];
    
    const isDrawingTool = (tool: EditorTool) => ['pen', 'eraser', 'arrow', 'rect', 'circle', 'text', 'sign', 'stampR', 'addImage', 'line'].includes(tool);

    const toolModes: { name: EditorTool, icon: React.FC<any>, tooltipKey: keyof Translation, action?: () => void }[] = [
        { name: 'pen', icon: PenIcon, tooltipKey: 'tool_pen' },
        { name: 'eraser', icon: EraserIcon, tooltipKey: 'tool_eraser' },
        { name: 'sign', icon: SignatureIcon, tooltipKey: 'tool_sign', action: () => setIsSignaturePadOpen(true) },
        { name: 'stampR', icon: StampRIcon, tooltipKey: 'stampR_tooltip', action: addStampR },
        { name: 'addImage', icon: ImageIcon, tooltipKey: 'tool_add_image', action: () => imageInputRef.current?.click() },
        { name: 'arrow', icon: ArrowIcon, tooltipKey: 'tool_arrow', action: addArrow },
        { name: 'line', icon: LineIcon, tooltipKey: 'tool_line', action: addLine },
        { name: 'rect', icon: RectangleIcon, tooltipKey: 'tool_rect', action: addRect },
        { name: 'circle', icon: CircleIcon, tooltipKey: 'tool_circle', action: addCircle },
        { name: 'text', icon: TextIcon, tooltipKey: 'tool_text', action: addText },
    ];
    
    const handleToolClick = (tool: { name: EditorTool, action?: () => void }) => {
        if (tool.action) {
            tool.action();
        } else {
            setEditorTool(prev => prev === tool.name ? 'select' : tool.name);
        }

        if (isDrawingTool(tool.name) && propertiesPanelState === 'closed') {
             setPropertiesPanelState('open');
        }
    };

    const renderFullPropertiesPanel = () => {
        const selectedToolIsDrawing = isDrawingTool(editorTool);
        const activeObjectIsShapeOrText = activeObjectType === 'shape' || activeObjectType === 'text' || activeObjectType === 'signature';
        const isEraser = editorTool === 'eraser';
        const isTextToolOrObject = editorTool === 'text' || activeObjectType === 'text';

        return (
            <>
                <div className="flex justify-between items-center pb-2 border-b border-slate-700 mb-4 flex-shrink-0">
                    <h3 className="font-bold text-lg">{t.properties}</h3>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setPropertiesPanelState('closed')} className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700">
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="flex flex-col gap-3">
                    {(selectedToolIsDrawing || activeObjectIsShapeOrText) && !isEraser && (
                        <div className="space-y-3">
                            {/* Color & Opacity Group */}
                            <div className="bg-slate-850/50 p-3 rounded-lg space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-slate-300 font-semibold text-sm">{t.color}</label>
                                    <div className="flex items-center gap-2">
                                        {window.EyeDropper && <button onClick={handleEyedropper} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-md"><EyedropperIcon className="w-4 h-4" /></button>}
                                        <div className="relative w-8 h-8 rounded-md border border-slate-600 overflow-hidden">
                                            <input type="color" value={currentProperties.color} onChange={(e) => { handlePropertyChange({ color: e.target.value }); }} className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {PRESET_COLORS.map(c => <button key={c} onClick={() => { handlePropertyChange({ color: c }); }} className="w-6 h-6 rounded-full border-2 border-slate-900" style={{backgroundColor: c}} />)}
                                </div>
                                <RangeInput 
                                    label={t.transparency} 
                                    value={currentProperties.transparency}
                                    min={0} max={100} unit="%" 
                                    onChange={(v) => handlePropertyChange({ transparency: v, transparencyEnabled: v > 0 })} 
                                />
                            </div>

                            {/* Stroke / Font Group */}
                            { isTextToolOrObject ? (
                                <div className="bg-slate-850/50 p-3 rounded-lg space-y-4">
                                    <RangeInput label={t.font_size} value={currentProperties.fontSize} min={10} max={500} onChange={(v) => handlePropertyChange({ fontSize: v })} />
                                    <div className="grid grid-cols-4 gap-2 items-end">
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-slate-400 mb-1">{t.font_family}</label>
                                            <FontSelector
                                                value={currentProperties.fontFamily}
                                                options={FONT_FAMILES}
                                                onChange={(v) => handlePropertyChange({ fontFamily: v })}
                                            />
                                        </div>
                                        <button 
                                            onClick={() => handlePropertyChange({ fontWeight: currentProperties.fontWeight === 'bold' ? 'normal' : 'bold' })}
                                            data-tooltip={t.font_bold}
                                            className={`w-full py-2 px-3 rounded-md border border-slate-700 transition-colors font-bold text-xl ${currentProperties.fontWeight === 'bold' ? 'bg-blue-600 text-white' : 'bg-slate-850 hover:bg-slate-700 text-slate-300'}`}
                                        >
                                            B
                                        </button>
                                        <button 
                                            onClick={() => handlePropertyChange({ fontStyle: currentProperties.fontStyle === 'italic' ? 'normal' : 'italic' })}
                                            data-tooltip={t.font_italic}
                                            className={`w-full py-2 px-3 rounded-md border border-slate-700 transition-colors font-bold text-xl italic ${currentProperties.fontStyle === 'italic' ? 'bg-blue-600 text-white' : 'bg-slate-850 hover:bg-slate-700 text-slate-300'}`}
                                        >
                                            I
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-850/50 p-3 rounded-lg">
                                    <RangeInput label={t.thickness} value={currentProperties.thickness} min={1} max={100} step={1} unit="px" onChange={(v) => handlePropertyChange({ thickness: v })} disabled={activeObjectType === 'signature'} />
                                </div>
                            )}
                        </div>
                    )}
                     {isEraser && (
                        <div className="bg-slate-850/50 p-3 rounded-lg">
                            <RangeInput label={t.thickness} value={currentProperties.thickness} min={1} max={100} step={1} unit="px" onChange={(v) => handlePropertyChange({ thickness: v })} />
                        </div>
                    )}
                </div>
            </>
        )
    };

    const renderPagination = () => (
        <div className="flex items-center justify-center gap-2">
            <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage <= 1 || isPdfRendering} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-sm">&lt;</button>
            <span className="text-slate-300 font-semibold text-sm">{t.pdfPage} {currentPage} {t.pdfOf} {totalPages}</span>
            <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages || isPdfRendering} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-sm">&gt;</button>
        </div>
    );

    const renderPropertiesToggle = () => {
        // Show button on all screen sizes if panel is closed and an object is active or a drawing tool is selected
        const showButton = propertiesPanelState === 'closed' && (activeObjectType !== null || isDrawingTool(editorTool));
        if(!showButton) return null;
        
        return (
            <button 
                onClick={() => setPropertiesPanelState('open')} 
                data-tooltip={t.toggle_properties}
                className="p-3 rounded-md transition-colors bg-slate-700 hover:bg-slate-600 animate-fade-in"
            >
                <SlidersIcon className="w-6 h-6" />
            </button>
        )
    }

    return (
        <div className="w-full h-full flex flex-col gap-4">
             {isResizeCropOpen && <EditorResizeAndCropOverlay sourceDataUrl={resizeCropSourceUrl} onApply={handleResizeCropApply} onClose={() => setIsResizeCropOpen(false)} />}
             {isSignaturePadOpen && <SignaturePadOverlay onApply={handleSignatureApply} onClose={() => setIsSignaturePadOpen(false)} />}
             <input
                type="file"
                ref={imageInputRef}
                className="hidden"
                accept="image/png, image/jpeg, image/webp, image/gif"
                multiple
                onChange={handleImageShapeUpload}
             />
            
            {/* Top Action Bar */}
            <div className="bg-slate-800/50 p-2 rounded-xl flex justify-between items-center flex-wrap gap-2">
                 <div className="flex items-center gap-2">
                    <button onClick={onNewImage} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold transition-colors duration-200">
                        <span className="hidden sm:inline">{t.newImage}</span>
                        <span className="sm:hidden">{t.new}</span>
                    </button>
                    {isPdf && totalPages > 0 && renderPagination()}
                 </div>
                <div className="flex items-center gap-2">
                   {isBatchMode ? (
                        <button onClick={downloadZip} disabled={isProcessingZip} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold disabled:bg-slate-600 disabled:cursor-wait">
                            {isProcessingZip ? t.preparing : t.download_zip_batch.replace('{count}', imageFiles.length.toString())}
                        </button>
                   ) : (
                       <>
                            <button onClick={downloadImage} data-tooltip={t.save} className="p-2.5 bg-slate-600 hover:bg-slate-700 rounded-lg">
                               <SaveIcon className="w-6 h-6"/>
                           </button>
                           <button onClick={downloadImage} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold">
                                <span className="hidden sm:inline">{t.download_image}</span>
                                <span className="sm:hidden">{t.downloadShort}</span>
                           </button>
                           {navigator.share && <button onClick={shareImage} data-tooltip={t.share} className="p-2.5 bg-slate-600 hover:bg-slate-700 rounded-lg"><ShareIcon className="w-5 h-5"/></button>}
                       </>
                   )}
                </div>
            </div>

            {/* Toolbar */}
             <div className="bg-slate-800/50 p-2 rounded-xl flex items-center flex-wrap justify-start gap-2">
                <button onClick={undo} data-tooltip={t.undo} disabled={currentStateIndex <= 0} className={`p-3 rounded-md transition-colors flex-shrink-0 ${ currentStateIndex <= 0 ? 'bg-slate-700/50 cursor-not-allowed text-slate-500' : 'bg-slate-700 hover:bg-slate-600' }`}><UndoIcon className="w-6 h-6"/></button>
                <div className="h-8 w-px bg-slate-700 mx-1"></div>
                {toolModes.map(tool => {
                    const isDisabled = (isBatchMode && !['text', 'sign'].includes(tool.name)) || (tool.name === 'sign' && !isPdf);
                    const isSelected = editorTool === tool.name;
                    return (
                        <button key={tool.name} onClick={() => handleToolClick(tool)} data-tooltip={t[tool.tooltipKey]} disabled={isDisabled}
                            className={`p-3 rounded-md transition-colors flex-shrink-0 ${ isDisabled ? 'bg-slate-700/50 cursor-not-allowed text-slate-500' : isSelected ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600' }`}>
                            <tool.icon className="w-6 h-6"/>
                        </button>
                    )
                })}
                 <div className="h-8 w-px bg-slate-700 mx-1"></div>
                 {toolActions.map(tool => (
                     <button key={tool.name} onClick={tool.action} data-tooltip={t[tool.tooltipKey]} className={`p-3 rounded-md transition-colors flex-shrink-0 bg-slate-700 hover:bg-slate-600`}>
                        <tool.icon className="w-6 h-6"/>
                     </button>
                 ))}
                <div className="h-8 w-px bg-slate-700 mx-1"></div>
                <div className="flex items-center gap-2">
                    {renderPropertiesToggle()}
                </div>
            </div>

            {/* Main Editor Layout */}
            <div className="flex-grow flex flex-col md:flex-row gap-4 min-h-0 relative">
                {/* Canvas Container */}
                <div ref={canvasContainerRef} className="flex-grow bg-slate-900/50 rounded-xl overflow-hidden flex items-center justify-center min-h-[60vh] w-full relative touch-none">
                    <canvas ref={canvasRef} />
                    {isPdfRendering && (
                        <div className="absolute inset-0 bg-slate-800/50 flex items-center justify-center rounded-lg">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
                        </div>
                    )}
                </div>
                
                {/* Desktop: Right Properties Panel */}
                {propertiesPanelState === 'open' && !isBatchMode && (
                     <div className="hidden md:flex flex-col bg-slate-800/50 p-4 rounded-xl w-80 flex-shrink-0 animate-fade-in overflow-y-auto">
                         {renderFullPropertiesPanel()}
                     </div>
                )}

                {/* Mobile: Bottom Properties Panel (Drawer) is removed as per user feedback */}

            </div>
        </div>
    );
};

export default ImageEditorMode;

