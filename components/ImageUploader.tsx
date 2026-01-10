import React, { useState, useCallback, useRef, useEffect } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { useLanguage } from '../contexts/LanguageContext';

interface ImageUploaderProps {
  onImageUpload: (files: File[]) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload }) => {
  const { t } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const processFiles = useCallback((files: File[]) => {
      setError(null);
      setWarning(null);

      if (files.length > 30) {
          setError(t.fileLimitWarning);
          setTimeout(() => { if (isMounted.current) setError(null); }, 4000);
          return;
      }
      
      const isBatch = files.length > 1;
      const validFiles: File[] = [];
      let pdfSkipped = false;

      for (const file of files) {
          const isPdf = file.type === 'application/pdf';
          const isImage = file.type.startsWith('image/');
          
          if (isBatch && isPdf) {
              pdfSkipped = true;
              continue; // Skip PDFs in batch mode
          }
          
          if (isImage || isPdf) {
              validFiles.push(file);
          }
      }
      
      if (pdfSkipped) {
          setWarning(t.pdfSkippedWarning);
          setTimeout(() => { if (isMounted.current) setWarning(null); }, 4000);
      }

      if (validFiles.length > 0) {
          onImageUpload(validFiles);
      } else if (!pdfSkipped) {
           setError(t.imageFileWarning);
           setTimeout(() => { if (isMounted.current) setError(null); }, 3000);
      }

  }, [onImageUpload, t]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const borderClasses = error 
    ? 'border-red-500/80' 
    : isDragging 
    ? 'border-blue-400 bg-slate-700/50' 
    : 'border-slate-600 hover:border-slate-500';

  return (
    <div className="w-full max-w-2xl text-center">
      <div 
        className={`relative p-10 border-4 border-dashed rounded-2xl transition-all duration-300 ease-in-out ${borderClasses}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          id="imageUpload"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          disabled={!!error}
          multiple
        />
        <label htmlFor="imageUpload" className="flex flex-col items-center justify-center cursor-pointer">
          <UploadIcon className="w-24 h-24 mb-6 text-slate-500" />
          <p className="text-2xl font-semibold text-slate-300">
            <span className="text-blue-400">{t.clickToUpload}</span> {t.orDragAndDrop}
          </p>
          <p className="text-slate-500 mt-2">{t.supportedFormatsConverter}</p>
        </label>
      </div>
      {error && <p className="mt-4 text-red-400 font-semibold">{error}</p>}
      {warning && <p className="mt-4 text-yellow-400 font-semibold">{warning}</p>}
    </div>
  );
};

export default React.memo(ImageUploader);
