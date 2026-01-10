// FIX: Import useEffect from react to resolve 'Cannot find name' error.
import React, { useState, useRef, useLayoutEffect, useCallback, useMemo, useEffect, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent, memo } from 'react';
import type { Crop } from '../types';

interface ImageEditorProps {
  src: string;
  crop: Crop | null;
  onCropChange: (crop: Crop | null) => void;
  isAspectLocked: boolean;
  onLoad: (info: {
    bounds: { x: number; y: number; width: number; height: number; };
    naturalSize: { width: number; height: number; };
  }) => void;
}

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
type Action = 'idle' | 'moving' | { type: 'resizing'; direction: ResizeDirection };

const HANDLE_SIZE = 8;
const HANDLE_OFFSET = HANDLE_SIZE / 2;

const getEventPosition = (e: MouseEvent | TouchEvent | ReactMouseEvent | ReactTouchEvent): { x: number; y: number } | null => {
    if ('touches' in e && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if ('clientX' in e && typeof e.clientX === 'number' && 'clientY' in e && typeof e.clientY === 'number') {
        return { x: e.clientX, y: e.clientY };
    }
    return null;
};


const ImageEditor: React.FC<ImageEditorProps> = ({ src, crop, onCropChange, isAspectLocked, onLoad }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [action, setAction] = useState<Action>('idle');
  const [imgInfo, setImgInfo] = useState<{
    bounds: { x: number; y: number; width: number; height: number; };
    naturalSize: { width: number; height: number; };
  } | null>(null);
  const [overrideCursor, setOverrideCursor] = useState<string | null>(null);
  
  // Internal state for smooth visual feedback during interactions
  const [visualCrop, setVisualCrop] = useState<Crop | null>(crop);
  const debounceTimer = useRef<number | null>(null);

  // Sync internal state when the external prop changes from the parent
  useEffect(() => {
    setVisualCrop(crop);
  }, [crop]);

  const actionDetails = useRef({
      startPos: { x: 0, y: 0 },
      startCrop: { x: 0, y: 0, width: 0, height: 0 },
  });
    
  useLayoutEffect(() => {
    const calculateBounds = () => {
      if (imgRef.current && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const imgRect = imgRef.current.getBoundingClientRect();
        const newImgInfo = {
          bounds: {
            x: imgRect.left - containerRect.left,
            y: imgRect.top - containerRect.top,
            width: imgRect.width,
            height: imgRect.height,
          },
          naturalSize: {
            width: imgRef.current.naturalWidth,
            height: imgRef.current.naturalHeight,
          }
        };
        setImgInfo(newImgInfo);
        onLoad(newImgInfo);
      }
    };
    const imgElement = imgRef.current;
    if (imgElement) {
      imgElement.addEventListener('load', calculateBounds);
      if (imgElement.complete) {
        calculateBounds();
      }
      window.addEventListener('resize', calculateBounds);
      return () => {
        imgElement.removeEventListener('load', calculateBounds);
        window.removeEventListener('resize', calculateBounds);
      };
    }
  }, [src, onLoad]);

  const screenSelection = useMemo(() => {
    if (!visualCrop || !imgInfo) return null;
    const { bounds, naturalSize } = imgInfo;
    const scaleX = bounds.width / naturalSize.width;
    const scaleY = bounds.height / naturalSize.height;

    return {
      x: Math.round(visualCrop.x * scaleX + bounds.x),
      y: Math.round(visualCrop.y * scaleY + bounds.y),
      width: Math.round(visualCrop.width * scaleX),
      height: Math.round(visualCrop.height * scaleY),
    };
  }, [visualCrop, imgInfo]);
  
  const getPosInContainer = useCallback((e: MouseEvent | TouchEvent | ReactMouseEvent | ReactTouchEvent) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = getEventPosition(e);
    if (!pos) return null;
    return {
      x: pos.x - rect.left,
      y: pos.y - rect.top
    };
  }, []);
  
  const handleInteractionStart = (
    e: ReactMouseEvent<HTMLDivElement> | ReactTouchEvent<HTMLDivElement>,
    newAction: Action
  ) => {
    if ('button' in e && e.button !== 0) return;
    if (!visualCrop) return;

    const startPos = getPosInContainer(e);
    if (!startPos) return;
    
    e.stopPropagation();
    setAction(newAction);
    actionDetails.current.startPos = startPos;
    actionDetails.current.startCrop = visualCrop;
  };
  
  const handleSelectionInteractionStart = (e: ReactMouseEvent<HTMLDivElement> | ReactTouchEvent<HTMLDivElement>) => {
    handleInteractionStart(e, 'moving');
  };

  const handleHandleInteractionStart = (
    e: ReactMouseEvent<HTMLDivElement> | ReactTouchEvent<HTMLDivElement>,
    direction: ResizeDirection
  ) => {
    handleInteractionStart(e, { type: 'resizing', direction });
  };


  const updateVisualCrop = useCallback((newCrop: Crop) => {
    if (!imgInfo) return;
    const { naturalSize } = imgInfo;
    let { x, y, width, height } = newCrop;

    // Constrain to image boundaries
    x = Math.max(0, x);
    y = Math.max(0, y);
    if (x + width > naturalSize.width) {
      width = naturalSize.width - x;
    }
    if (y + height > naturalSize.height) {
      height = naturalSize.height - y;
    }
    
    setVisualCrop({ 
      x: x, 
      y: y, 
      width: Math.max(0, width), 
      height: Math.max(0, height) 
    });

  }, [imgInfo]);


  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (action === 'idle' || !imgInfo) return;
      
      // Prevent scrolling on touch devices
      if (e.cancelable) e.preventDefault();

      const pos = getPosInContainer(e);
      if (!pos) return;
      
      const { startPos, startCrop } = actionDetails.current;
      const { bounds, naturalSize } = imgInfo;

      // Calculate movement in terms of the natural image dimensions
      const scaleX = naturalSize.width / bounds.width;
      const scaleY = naturalSize.height / bounds.height;
      const dx = (pos.x - startPos.x) * scaleX;
      const dy = (pos.y - startPos.y) * scaleY;

      let newCrop = { ...startCrop };
      
      if (action === 'moving') {
          newCrop.x = startCrop.x + dx;
          newCrop.y = startCrop.y + dy;
      } else if (action.type === 'resizing') {
          let { x, y, width, height } = startCrop;
          const right = x + width;
          const bottom = y + height;

          let dw = 0;
          let dh = 0;

          // Determine delta width/height from mouse/touch movement
          if (action.direction.includes('e')) dw = dx;
          if (action.direction.includes('w')) dw = -dx;
          if (action.direction.includes('s')) dh = dy;
          if (action.direction.includes('n')) dh = -dy;

          if (isAspectLocked) {
              const aspect = startCrop.width / startCrop.height;
              // Adjust delta to maintain aspect ratio
              if (action.direction.length === 2) { // Corner resize
                  if (Math.abs(dw) > Math.abs(dh * aspect)) {
                      dh = dw / aspect;
                  } else {
                      dw = dh * aspect;
                  }
              } else { // Edge resize
                  if (action.direction.includes('n') || action.direction.includes('s')) {
                      dw = dh * aspect;
                  } else {
                      dh = dw / aspect;
                  }
              }
          }

          width += dw;
          height += dh;
          
          // Center aspect-locked edge resizes
          if (isAspectLocked && action.direction.length === 1) {
            if (action.direction.includes('n') || action.direction.includes('s')) {
              x = startCrop.x + (startCrop.width - width) / 2;
            } else {
              y = startCrop.y + (startCrop.height - height) / 2;
            }
          }
          
          // Adjust origin for north and west resizes
          if (action.direction.includes('n')) y = bottom - height;
          if (action.direction.includes('w')) x = right - width;
          
          // Prevent crop flipping
          if (width < 0) { x += width; width = Math.abs(width); }
          if (height < 0) { y += height; height = Math.abs(height); }

          newCrop = { x, y, width, height };
      }
      updateVisualCrop(newCrop);
    };

    const handleUp = () => {
      if (action === 'idle') return;
      setAction('idle');
    };
    
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, [action, getPosInContainer, imgInfo, isAspectLocked, updateVisualCrop]);
  
  // Debounce updates to the parent component for better performance
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = window.setTimeout(() => {
        if (visualCrop) {
            const roundedCrop = {
                x: Math.round(visualCrop.x),
                y: Math.round(visualCrop.y),
                width: Math.round(visualCrop.width),
                height: Math.round(visualCrop.height)
            };
            if (JSON.stringify(roundedCrop) !== JSON.stringify(crop)) {
                onCropChange(roundedCrop);
            }
        } else if (crop !== null) {
            onCropChange(null);
        }
    }, 500);

    return () => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }
    };
  }, [visualCrop, onCropChange, crop]);

  const getCursorForDirection = (direction: ResizeDirection): string => {
      switch (direction) {
          case 'n': case 's': return 'ns-resize';
          case 'e': case 'w': return 'ew-resize';
          case 'ne': case 'sw': return 'nesw-resize';
          case 'nw': case 'se': return 'nwse-resize';
          default: return 'auto';
      }
  };
  
  const getCursor = () => {
    if (action !== 'idle') {
        if (action === 'moving') return 'grabbing';
        if (action.type === 'resizing') return getCursorForDirection(action.direction);
    }
    return overrideCursor || 'default';
  };

  const handles: ResizeDirection[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

  return (
    <div className="flex-grow flex items-center justify-center bg-slate-900/50 rounded-lg overflow-hidden relative touch-none select-none" ref={containerRef}>
      <div 
        className={`relative w-full h-full`}
        style={{ cursor: getCursor() }}
      >
        <img
          ref={imgRef}
          src={src}
          alt="Uploaded preview"
          className="max-w-full max-h-[60vh] object-contain mx-auto pointer-events-none"
          draggable="false"
        />
        {screenSelection && (
          <>
            <div className="absolute inset-0 bg-black/60 pointer-events-none" style={{
                clipPath: `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, ${screenSelection.x}px ${screenSelection.y}px, ${screenSelection.x}px ${screenSelection.y + screenSelection.height}px, ${screenSelection.x + screenSelection.width}px ${screenSelection.y + screenSelection.height}px, ${screenSelection.x + screenSelection.width}px ${screenSelection.y}px, ${screenSelection.x}px ${screenSelection.y}px)`
            }}>
            </div>
            <div
              className="absolute border-2 border-dashed border-blue-400"
              style={{
                left: `${screenSelection.x}px`,
                top: `${screenSelection.y}px`,
                width: `${screenSelection.width}px`,
                height: `${screenSelection.height}px`,
              }}
              onMouseDown={handleSelectionInteractionStart}
              onTouchStart={handleSelectionInteractionStart}
              onMouseEnter={() => setOverrideCursor('move')}
              onMouseLeave={() => setOverrideCursor(null)}
            >
              {handles.map(dir => {
                const style: React.CSSProperties = {
                  left: dir.includes('w') ? `-${HANDLE_OFFSET}px` : dir.includes('e') ? 'auto' : `calc(50% - ${HANDLE_OFFSET}px)`,
                  right: dir.includes('e') ? `-${HANDLE_OFFSET}px` : 'auto',
                  top: dir.includes('n') ? `-${HANDLE_OFFSET}px` : dir.includes('s') ? 'auto' : `calc(50% - ${HANDLE_OFFSET}px)`,
                  bottom: dir.includes('s') ? `-${HANDLE_OFFSET}px` : 'auto',
                  cursor: getCursorForDirection(dir),
                };
                return (
                  <div
                    key={dir}
                    className="absolute w-2 h-2 bg-blue-400 border border-slate-900 rounded-sm"
                    style={style}
                    onMouseDown={(e) => handleHandleInteractionStart(e, dir)}
                    onTouchStart={(e) => handleHandleInteractionStart(e, dir)}
                    onMouseEnter={() => setOverrideCursor(getCursorForDirection(dir))}
                    onMouseLeave={() => setOverrideCursor(null)}
                  />
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default memo(ImageEditor);