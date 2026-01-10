
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import ConverterEditor from './ConverterEditor';
import { ShareIcon } from './icons/ShareIcon';
import { PuzzleIcon } from './icons/PuzzleIcon';

declare var saveAs: any;
declare var pdfjsLib: any;
declare var jspdf: any;
declare var JSZip: any;

type PDFDocumentProxy = any;

interface ImageConverterProps {
  imageFiles: File[];
  onNewImage: () => void;
  onAppendFiles: (files: File[]) => void;
  activeImageDataUrl: string | null;
  onImageProcessed: (dataUrl: string) => void;
}

type OutputFormat = 'png' | 'jpeg' | 'webp' | 'gif' | 'pdf';

const ImageConverter: React.FC<ImageConverterProps> = ({ imageFiles, onNewImage, onAppendFiles, activeImageDataUrl, onImageProcessed }) => {
    const { t } = useLanguage();
    const [outputFormat, setOutputFormat] = useState<OutputFormat>('webp');
    const [isConverting, setIsConverting] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isMounted = useRef(false);
    
    const [filenamePrefix, setFilenamePrefix] = useState('');
    const [filenameModel, setFilenameModel] = useState('');

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);
    
    const isBatchMode = imageFiles.length > 1;
    const singleImageFile = useMemo(() => isBatchMode ? null : imageFiles[0] || null, [imageFiles, isBatchMode]);

    const [convertedFile, setConvertedFile] = useState<File | null>(null);
    
    const isShareApiSupported = typeof navigator !== 'undefined' && !!navigator.share;
    const [canShareFile, setCanShareFile] = useState(false);

    const [isPdf, setIsPdf] = useState(false);
    const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [isPdfRendering, setIsPdfRendering] = useState(false);
    
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [originalFilename, setOriginalFilename] = useState<string>('');
    
    const [isAppendDragging, setIsAppendDragging] = useState(false);
    const [appendError, setAppendError] = useState<string | null>(null);
    const [appendWarning, setAppendWarning] = useState<string | null>(null);
    
    const resetConvertedState = useCallback(() => {
        setConvertedFile(null);
    }, []);

    useEffect(() => {
        if (singleImageFile && !isPdf && originalFilename === '') {
            setIsEditorOpen(true);
        }
    }, [singleImageFile, isPdf, originalFilename]);

    useEffect(() => {
        if (singleImageFile) {
            const base = singleImageFile.name.substring(0, singleImageFile.name.lastIndexOf('.')) || singleImageFile.name;
            setOriginalFilename(base);
            setFilenameModel(base);
        }
    }, [singleImageFile]);

    useEffect(() => {
        if (convertedFile && isShareApiSupported && !isBatchMode) {
            setCanShareFile(navigator.canShare ? navigator.canShare({ files: [convertedFile] }) : true);
        } else {
            setCanShareFile(false);
        }
    }, [convertedFile, isShareApiSupported, isBatchMode]);

    useEffect(() => {
        resetConvertedState();
    }, [imageFiles, outputFormat, activeImageDataUrl, currentPage, resetConvertedState]);

    useEffect(() => {
        setIsPdf(false);
        setPdfDoc(null);
        setTotalPages(0);
        setCurrentPage(1);
        setOutputFormat('webp');

        if (singleImageFile && singleImageFile.type === 'application/pdf') {
            setIsPdf(true);
            setOutputFormat('jpeg');
            if (typeof pdfjsLib !== 'undefined') {
                setIsPdfRendering(true);
                const loadingTask = pdfjsLib.getDocument(URL.createObjectURL(singleImageFile));
                loadingTask.promise.then((doc: PDFDocumentProxy) => {
                    if (!isMounted.current) return;
                    setPdfDoc(doc);
                    setTotalPages(doc.numPages);
                }).catch(() => {});
            }
        }
    }, [singleImageFile]);
    
    const handleEditApply = useCallback((dataUrl: string) => {
      onImageProcessed(dataUrl);
      setIsEditorOpen(false);
    }, [onImageProcessed]);

    const renderPdfPage = useCallback(async (pageNumber: number) => {
        if (!pdfDoc) return;
        setIsPdfRendering(true);
        try {
            const page = await pdfDoc.getPage(pageNumber);
            if (!isMounted.current) return;
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = canvasRef.current;
            if (!canvas) return;
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            const renderContext = { canvasContext: canvas.getContext('2d')!, viewport: viewport };
            await page.render(renderContext).promise;
        } finally {
            if (isMounted.current) setIsPdfRendering(false);
        }
    }, [pdfDoc]);

    useEffect(() => {
        if (pdfDoc && isPdf) renderPdfPage(currentPage);
    }, [pdfDoc, currentPage, isPdf, renderPdfPage]);
    
    const generateFinalFilename = useCallback((extension: string) => {
        const prefix = filenamePrefix.trim();
        const model = filenameModel.trim();
        if (!isBatchMode && !isPdf && (prefix || model)) {
            const parts = [prefix, model].filter(Boolean);
            return `${parts.join('-')}.${extension}`;
        }
        return `${originalFilename}.${extension}`;
    }, [filenamePrefix, filenameModel, isBatchMode, isPdf, originalFilename]);

    const getSingleFileBlob = useCallback((): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const imageSourceForConversion = activeImageDataUrl;
            if (!imageSourceForConversion) return reject(new Error('No image source.'));

            if (!isPdf && outputFormat === 'pdf') {
                if (typeof jspdf === 'undefined' || !jspdf.jsPDF) return reject(new Error('jsPDF not loaded.'));
                const img = new Image();
                img.onload = () => {
                    const { jsPDF } = jspdf;
                    const pdf = new jsPDF({ orientation: img.naturalWidth > img.naturalHeight ? 'l' : 'p', unit: 'px', format: [img.naturalWidth, img.naturalHeight] });
                    pdf.addImage(img, 'auto', 0, 0, img.naturalWidth, img.naturalHeight);
                    resolve(pdf.output('blob'));
                };
                img.src = imageSourceForConversion;
                return;
            }

            if (isPdf) {
                const canvas = canvasRef.current;
                if (!canvas) return reject(new Error('Canvas missing.'));
                canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Blob fail')), `image/${outputFormat}`, 0.95);
            } else {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return reject(new Error('Context missing'));
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    if (outputFormat === 'jpeg') { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
                    ctx.drawImage(img, 0, 0);
                    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Blob fail')), `image/${outputFormat}`, 0.95);
                };
                img.src = imageSourceForConversion;
            }
        });
    }, [activeImageDataUrl, outputFormat, isPdf]);

    const handleConvert = useCallback(async () => {
        if (imageFiles.length === 0) return;
        setIsConverting(true);

        if (isBatchMode) {
            if (typeof JSZip === 'undefined' || typeof saveAs === 'undefined') {
                alert(t.downloadLibrariesWarning);
                setIsConverting(false);
                return;
            }
            const zip = new JSZip();
            for (const file of imageFiles) {
                try {
                    const dataUrl = await new Promise<string>((res) => {
                        const r = new FileReader(); r.onload = e => res(e.target?.result as string); r.readAsDataURL(file);
                    });
                    const img = await new Promise<HTMLImageElement>((res) => {
                        const i = new Image(); i.onload = () => res(i); i.src = dataUrl;
                    });
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = img.naturalWidth; tempCanvas.height = img.naturalHeight;
                    const tempCtx = tempCanvas.getContext('2d')!;
                    if (outputFormat === 'jpeg') { tempCtx.fillStyle = '#FFFFFF'; tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height); }
                    tempCtx.drawImage(img, 0, 0);
                    const blob = await new Promise<Blob | null>(res => tempCanvas.toBlob(res, `image/${outputFormat}`, 0.95));
                    if (blob) zip.file(`${file.name.split('.')[0]}.${outputFormat}`, blob);
                } catch (e) {}
            }
            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, 'converted-images.zip');
        } else if (singleImageFile) {
            try {
                const blob = await getSingleFileBlob();
                const finalName = generateFinalFilename(outputFormat);
                const file = new File([blob], finalName, { type: blob.type });
                setConvertedFile(file);
                if (typeof saveAs !== 'undefined') saveAs(file, finalName);
            } catch (e: any) {
                alert(`Error: ${e.message}`);
            }
        }
        if (isMounted.current) setIsConverting(false);
    }, [imageFiles, isBatchMode, singleImageFile, getSingleFileBlob, outputFormat, generateFinalFilename, t]);

    const handleDownload = useCallback(() => {
        if (!convertedFile || typeof saveAs === 'undefined') return;
        saveAs(convertedFile, convertedFile.name);
    }, [convertedFile]);

    const processAppendedFiles = useCallback((incomingFiles: File[]) => {
        setAppendError(null);
        setAppendWarning(null);
        const limit = 30;
        const current = imageFiles.length;
        if (current >= limit) { setAppendError(t.appendFileLimitReached); return; }
        const filesToAdd = incomingFiles.slice(0, limit - current);
        if (incomingFiles.length > (limit - current)) setAppendWarning(t.appendFileLimitPartial.replace('{count}', (limit - current).toString()));
        const valid = filesToAdd.filter(f => f.type.startsWith('image/'));
        if (valid.length > 0) onAppendFiles(valid);
    }, [imageFiles.length, onAppendFiles, t]);

    const appendDropzoneClasses = isAppendDragging ? 'border-blue-400 bg-slate-700/50' : 'border-slate-700 hover:border-slate-600';

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-800/50 p-6 rounded-2xl shadow-lg flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-slate-200">
                        {isBatchMode ? t.batchModeTitle.replace('{count}', imageFiles.length.toString()) : originalFilename}
                    </h2>
                    <button onClick={onNewImage} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold transition-colors">
                        {t.new}
                    </button>
                </div>

                {!isBatchMode && !isPdf && (
                    <button onClick={() => setIsEditorOpen(true)} className="mb-4 w-full bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                        {t.editResize}
                    </button>
                )}

                <div className="flex-grow flex items-center justify-center bg-slate-900/50 rounded-lg overflow-hidden relative min-h-[300px]">
                    {isPdf ? <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" /> : <img src={activeImageDataUrl || ''} alt="Preview" className="max-w-full max-h-[50vh] object-contain" />}
                    {isPdfRendering && <div className="absolute inset-0 bg-slate-800/50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div></div>}
                </div>
                
                {isPdf && totalPages > 1 && (
                    <div className="flex justify-center items-center mt-4 gap-4">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="px-3 py-1 bg-slate-700 rounded">{'<'}</button>
                        <span>{currentPage} / {totalPages}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="px-3 py-1 bg-slate-700 rounded">{'>'}</button>
                    </div>
                )}
                
                {isBatchMode && (
                    <div className="mt-4">
                        <div className={`p-6 border-2 border-dashed rounded-lg text-center ${appendDropzoneClasses}`}
                            onDrop={(e) => { e.preventDefault(); setIsAppendDragging(false); if(e.dataTransfer.files) processAppendedFiles(Array.from(e.dataTransfer.files)); }}
                            onDragOver={(e) => e.preventDefault()} onDragEnter={() => setIsAppendDragging(true)} onDragLeave={() => setIsAppendDragging(false)}>
                            <label className="cursor-pointer">
                                <PuzzleIcon className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                                <span className="text-slate-300 font-semibold">{t.addMoreFiles}</span>
                                <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => e.target.files && processAppendedFiles(Array.from(e.target.files))} />
                            </label>
                        </div>
                        {appendError && <p className="mt-2 text-sm text-red-400">{appendError}</p>}
                        {appendWarning && <p className="mt-2 text-sm text-yellow-400">{appendWarning}</p>}
                    </div>
                )}
            </div>

            <div className="bg-slate-800/50 p-6 rounded-2xl shadow-lg flex flex-col justify-between">
                 <div>
                    <h3 className="text-xl font-bold mb-4 text-slate-200">{t.outputFormat}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                        {['png', 'jpeg', 'webp', 'gif', 'pdf'].map(f => (
                            <button key={f} onClick={() => setOutputFormat(f as OutputFormat)} 
                                className={`py-3 rounded-lg font-semibold transition-colors ${outputFormat === f ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                {f.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    
                    {!isBatchMode && !isPdf && (
                         <div className="border-t border-slate-700 pt-6">
                            <h3 className="text-xl font-bold mb-4 text-slate-200">{t.filename}</h3>
                             <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">{t.filename_prefix}</label>
                                    <input type="text" value={filenamePrefix} onChange={(e) => setFilenamePrefix(e.target.value)}
                                        className="w-full bg-slate-850 text-white p-2 rounded-md border border-slate-700 focus:ring-2 focus:ring-blue-500" />
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">{t.filename_model}</label>
                                     <div className="flex gap-2">
                                        <input type="text" value={filenameModel} onChange={(e) => setFilenameModel(e.target.value)}
                                            className="w-full bg-slate-850 text-white p-2 rounded-md border border-slate-700" />
                                         <button onClick={() => { setFilenamePrefix(''); setFilenameModel(originalFilename); }} className="px-3 bg-slate-700 rounded-md text-sm">{t.clear}</button>
                                     </div>
                                </div>
                                 <div className="flex flex-wrap gap-2 pt-2">
                                    {['ajax', 'ezviz', 'hikvision', 'ip-camera', 'nvr', 'switch'].map((p) => (
                                      <button key={p} onClick={() => setFilenamePrefix(p)} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-full text-xs">{p}</button>
                                    ))}
                                </div>
                                <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                                    <p className="text-xs text-blue-300 font-mono truncate">
                                        Result: {generateFinalFilename(outputFormat)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 space-y-3">
                    <button onClick={handleConvert} disabled={isConverting} className="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-slate-600">
                        {isConverting ? t.converting : t.convert}
                    </button>
                    {convertedFile && !isBatchMode && (
                        <div className="flex gap-3">
                           <button onClick={handleDownload} className="flex-grow bg-brand-green hover:bg-green-600 text-white font-bold py-3 rounded-lg">
                                {t.downloadFile}
                            </button>
                            {isShareApiSupported && (
                                <button onClick={() => navigator.share({ files: [convertedFile] })} className="p-3 bg-slate-600 rounded-lg"><ShareIcon className="w-5 h-5" /></button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            {isEditorOpen && singleImageFile && activeImageDataUrl && (
                 <ConverterEditor sourceUrl={activeImageDataUrl} onApply={handleEditApply} onClose={() => setIsEditorOpen(false)} initialAspectRatio={'1:1'} />
            )}
        </div>
    );
};

export default React.memo(ImageConverter);
