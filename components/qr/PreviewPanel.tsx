import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { DesignOptions } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { ShareIcon } from '../icons/ShareIcon';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare var QRCodeStyling: any;
declare var saveAs: any;

interface PreviewPanelProps {
    data: string;
    options: DesignOptions;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ data, options }) => {
    const { t } = useLanguage();
    const [qrCodeInstance, setQrCodeInstance] = useState<any>(null);
    const displayCanvasRef = useRef<HTMLCanvasElement>(null);
    const [downloadSize, setDownloadSize] = useState<number>(1024);
    const hasCaption = useMemo(() => options.captionText.trim().length > 0, [options.captionText]);
    const isMounted = useRef(false);
    
    // Share functionality state
    const isShareApiSupported = typeof navigator !== 'undefined' && !!navigator.share;
    const [shareableFile, setShareableFile] = useState<File | null>(null);
    const [canShareFile, setCanShareFile] = useState(false);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const qrOptions = useMemo(() => ({
        width: 1000,
        height: 1000,
        data: data || "QR Code Generator",
        image: options.logo || undefined,
        dotsOptions: {
            color: options.dotsColor,
            type: options.dotsType,
        },
        backgroundOptions: {
            color: options.backgroundColor,
        },
        cornersSquareOptions: {
            color: options.cornersColor,
            type: options.cornersType,
        },
        cornersDotOptions: {
            color: options.cornersColor,
        },
        imageOptions: {
            crossOrigin: 'anonymous',
            margin: 5,
            imageSize: options.logoSize
        },
    }), [data, options]);

    // Initialize or update the QR code instance
    useEffect(() => {
        if (typeof QRCodeStyling === 'undefined') return;
        if (!qrCodeInstance) {
            setQrCodeInstance(new QRCodeStyling(qrOptions));
        } else {
            qrCodeInstance.update(qrOptions);
        }
    }, [qrOptions, qrCodeInstance]);

    // Main drawing effect - Renders QR code + caption to the display canvas instantly
    useEffect(() => {
        const drawQrCode = async () => {
            if (!qrCodeInstance || !displayCanvasRef.current) return;

            const canvas = displayCanvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            try {
                const qrCodeBlob = await qrCodeInstance.getRawData('png');
                if (!qrCodeBlob || !isMounted.current) return;
                
                const img = new Image();
                const objectUrl = URL.createObjectURL(qrCodeBlob);

                img.onload = () => {
                    if (!isMounted.current) {
                        URL.revokeObjectURL(objectUrl);
                        return;
                    }

                    const qrSize = 1000; // Use a fixed high-res internal size for drawing
                    const pixelFontSize = hasCaption ? (options.captionSize / 100) * qrSize : 0;
                    const pixelMargin = hasCaption ? (options.captionMargin / 100) * qrSize : 0;
                    const captionHeight = hasCaption ? pixelFontSize + pixelMargin : 0;

                    canvas.width = qrSize;
                    canvas.height = qrSize + captionHeight;

                    // Draw background
                    ctx.fillStyle = options.backgroundColor;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    // Draw QR code
                    ctx.drawImage(img, 0, 0, qrSize, qrSize);

                    // Draw caption
                    if (hasCaption) {
                        ctx.fillStyle = options.captionColor;
                        ctx.font = `${pixelFontSize}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'top';
                        ctx.fillText(options.captionText, qrSize / 2, qrSize + pixelMargin);
                    }
                    
                    URL.revokeObjectURL(objectUrl);
                    
                    // After drawing, prepare the file for sharing
                    if (isShareApiSupported) {
                        canvas.toBlob((blob) => {
                            if (blob && isMounted.current) {
                                const file = new File([blob], 'qr-code.png', { type: 'image/png' });
                                setShareableFile(file);
                            }
                        }, 'image/png');
                    }
                };
                
                img.onerror = () => {
                    URL.revokeObjectURL(objectUrl);
                };
                
                img.src = objectUrl;

            } catch (error) {
                if (isMounted.current) {
                    console.error("Failed to draw QR code", error);
                }
            }
        };

        drawQrCode();
    }, [qrCodeInstance, options, hasCaption, isShareApiSupported]);

    // Effect to check if the prepared file can be shared
    useEffect(() => {
        if (shareableFile && isShareApiSupported) {
            if (navigator.canShare && navigator.canShare({ files: [shareableFile] })) {
                setCanShareFile(true);
            } else if (!navigator.canShare) {
                // Fallback for older browsers with .share but not .canShare
                setCanShareFile(true);
            } else {
                setCanShareFile(false);
            }
        } else {
            setCanShareFile(false);
        }
    }, [shareableFile, isShareApiSupported]);

    const generateFilename = useCallback((extension: 'png' | 'svg'): string => {
        let baseName = 'QR';
    
        const caption = options.captionText.trim();
        if (caption) {
            baseName = `QR-${caption}`;
        } else if (data) {
            let contentPart = '';
            const lowerData = data.toLowerCase();
            
            if (lowerData.startsWith('http')) {
                try {
                    const url = new URL(data);
                    contentPart = url.hostname.replace(/^www\./, '');
                } catch (e) {
                    contentPart = 'url';
                }
            } else if (lowerData.startsWith('tel:')) {
                contentPart = data.substring(4);
            } else if (lowerData.startsWith('mailto:')) {
                contentPart = data.substring(7).split('?')[0];
            } else if (lowerData.startsWith('begin:vcard')) {
                const nameMatch = data.match(/(?:FN|N):([^;\n]+)/);
                if (nameMatch && nameMatch[1]) {
                    contentPart = nameMatch[1].replace(';', ' ');
                } else {
                    contentPart = 'vCard';
                }
            } else {
                contentPart = data.substring(0, 25);
            }
            
            if (contentPart) {
                baseName = `QR-${contentPart}`;
            }
        }
    
        let sanitizedBaseName = baseName
            .replace(/[\\/:*?"<>|]/g, '') // Remove invalid filename chars
            .trim()
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .substring(0, 60);
    
        if (extension === 'png') {
            sanitizedBaseName += `_${downloadSize}x${downloadSize}px`;
        }
    
        return `${sanitizedBaseName}.${extension}`;
    }, [options.captionText, data, downloadSize]);

    const handleDownload = useCallback(async (extension: 'png' | 'svg') => {
        if (!qrCodeInstance || typeof saveAs === 'undefined') return;
        
        const filename = generateFilename(extension);

        if (extension === 'png') {
            const sourceCanvas = displayCanvasRef.current;
            if (!sourceCanvas) return;

            // Create a new canvas with the desired download size
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            if (!tempCtx) return;

            tempCanvas.width = downloadSize;
            tempCanvas.height = downloadSize * (sourceCanvas.height / sourceCanvas.width);
            
            // Draw the high-res preview canvas onto the temp canvas, scaling it
            tempCtx.drawImage(sourceCanvas, 0, 0, tempCanvas.width, tempCanvas.height);

            tempCanvas.toBlob((blob) => {
                if (blob && isMounted.current) saveAs(blob, filename);
            }, 'image/png');

        } else if (extension === 'svg' && !hasCaption) {
            try {
                const svgBlob = await qrCodeInstance.getRawData('svg');
                if (isMounted.current) saveAs(svgBlob, filename);
            } catch (error) {
                 if (isMounted.current) console.error("SVG Download failed", error);
            }
        }
    }, [qrCodeInstance, downloadSize, hasCaption, generateFilename]);

    const handleShare = useCallback(() => {
        if (!shareableFile || !canShareFile) return;

        navigator.share({ files: [shareableFile] }).catch((error) => {
            if (error.name === 'AbortError') return; // User cancelled
            console.error('Sharing failed:', error);
            if (error.name === 'NotAllowedError') {
                alert(t.sharePermissionDenied);
            } else {
                alert(t.shareFailed);
            }
        });
    }, [shareableFile, t, canShareFile]);
    
    const sizeOptions = [256, 512, 1024, 2000];

    return (
        <div className="bg-slate-800/50 p-6 rounded-2xl shadow-lg flex flex-col items-center justify-between sticky top-8 h-full min-h-[500px] lg:min-h-0">
            <h2 className="text-2xl font-bold text-slate-200 mb-4 self-start">{t.preview_title}</h2>
            
            <div className="w-full max-w-[400px] flex items-center justify-center flex-grow">
                 <canvas
                    ref={displayCanvasRef}
                    className="max-w-full max-h-full object-contain"
                    style={{ visibility: data ? 'visible' : 'hidden' }}
                />
            </div>

            <div className="w-full max-w-sm space-y-4 mt-6">
                <div>
                     <label className="block text-sm font-medium text-slate-400 mb-2 text-center">{t.preview_download_size}</label>
                     <div className="grid grid-cols-4 gap-2">
                        {sizeOptions.map(size => (
                             <button 
                                key={size} 
                                onClick={() => setDownloadSize(size)} 
                                className={`px-2 py-2 text-sm rounded-md transition-colors ${downloadSize === size ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}
                            >
                                 {size}px
                             </button>
                        ))}
                     </div>
                </div>

                <div className="flex items-stretch gap-3">
                    <button 
                        onClick={() => handleDownload('png')} 
                        disabled={!data}
                        className="flex-grow px-4 py-3 bg-brand-green hover:bg-green-600 rounded-md text-white font-semibold transition-colors disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"
                    >
                        {t.preview_download_png}
                    </button>
                     <button 
                        onClick={() => handleDownload('svg')} 
                        disabled={!data || hasCaption}
                        title={hasCaption ? t.preview_svg_caption_warning : undefined}
                        className="flex-grow px-4 py-3 bg-brand-green hover:bg-green-600 rounded-md text-white font-semibold transition-colors disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"
                    >
                        {t.preview_download_svg}
                    </button>
                    {isShareApiSupported && (
                        <button
                            onClick={handleShare}
                            disabled={!canShareFile}
                            className="p-3 bg-slate-600 hover:bg-slate-700 rounded-md text-white font-semibold transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={canShareFile ? t.share : t.shareNotSupportedTooltip}
                            aria-label={t.share}
                        >
                            <ShareIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PreviewPanel;