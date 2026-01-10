import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Icon } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

// Declare global variables from CDN scripts to satisfy TypeScript
declare var JSZip: any;
declare var saveAs: any;

interface IconPreviewProps {
  icons: Icon[];
  profileId: string;
  isLoading: boolean;
}

const IconPreview: React.FC<IconPreviewProps> = ({ icons, profileId, isLoading }) => {
  const { t } = useLanguage();
  
  const [isPreparing, setIsPreparing] = useState(false);
  const [preparedZipFile, setPreparedZipFile] = useState<File | null>(null);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Reset prepared file when icons change
  useEffect(() => {
    setPreparedZipFile(null);
  }, [icons]);

  const handlePrepareZip = useCallback(async () => {
    if (typeof JSZip === 'undefined' || icons.length === 0) {
      if (typeof JSZip === 'undefined') alert(t.downloadLibrariesWarning);
      return;
    }
    setIsPreparing(true);
    try {
      const zip = new JSZip();

      // FIX: Add all the generated icon images to the zip file.
      for (const icon of icons) {
        // icon.dataUrl is in the format "data:image/png;base64,iVBORw0KGgo..."
        // We need to extract the base64 part after the comma.
        const base64Data = icon.dataUrl.split(',')[1];
        if (base64Data) {
            zip.file(icon.filename, base64Data, { base64: true });
        }
      }
      
      // Add manifest files for specific profiles
      if (profileId === 'favicon') {
        const manifest = {
          name: "My Awesome App",
          short_name: "Awesome App",
          icons: [
            {
              src: "/android-chrome-192x192.png",
              sizes: "192x192",
              type: "image/png"
            },
            {
              src: "/android-chrome-512x512.png",
              sizes: "512x512",
              type: "image/png"
            }
          ],
          theme_color: "#ffffff",
          background_color: "#ffffff",
          display: "standalone"
        };
        zip.file("site.webmanifest", JSON.stringify(manifest, null, 2));
      } else if (profileId === 'pwa') {
        const pwaIcons = icons.map(icon => {
            const iconDetails = {
                src: `/${icon.filename}`,
                sizes: `${icon.width}x${icon.height}`,
                type: "image/png"
            };
            if (icon.width >= 192) {
                return { ...iconDetails, purpose: 'any maskable' };
            }
            return iconDetails;
        });

        const manifest = {
            name: "My Progressive Web App",
            short_name: "My PWA",
            icons: pwaIcons,
            start_url: ".",
            display: "standalone",
            theme_color: "#ffffff",
            background_color: "#ffffff"
        };
        zip.file("manifest.webmanifest", JSON.stringify(manifest, null, 2));
      }


      // FIX: Explicitly type blob as Blob because JSZip.generateAsync may return a value of type 'any' or 'unknown'.
      const blob = await zip.generateAsync({ type: 'blob' }) as Blob;
      // FIX: Use a more descriptive filename.
      const file = new File([blob], `icons-${profileId}.zip`, { type: 'application/zip' });
      if (isMounted.current) {
        setPreparedZipFile(file);
      }
    } catch (error) {
        if (isMounted.current) {
            console.error("Error preparing zip file:", error);
        }
    } finally {
      if (isMounted.current) {
        setIsPreparing(false);
      }
    }
  }, [icons, profileId, t.downloadLibrariesWarning]);

  const handleDownloadZip = useCallback(() => {
    if (!preparedZipFile || typeof saveAs === 'undefined') {
        if (typeof saveAs === 'undefined') alert(t.downloadLibrariesWarning);
        return;
    }
    saveAs(preparedZipFile, preparedZipFile.name);
  }, [preparedZipFile, t.downloadLibrariesWarning]);

  return (
    <div className="bg-slate-800/50 p-6 rounded-2xl shadow-lg flex flex-col h-full">
      <h2 className="text-2xl font-bold mb-4 text-slate-200">{t.preview}</h2>
      <div className="flex-grow space-y-4 overflow-y-auto pr-2">
        {isLoading ? (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400"></div>
            </div>
        ) : icons.length > 0 ? (
          icons.map((icon) => (
            <div key={icon.filename} className="flex items-center bg-slate-700/50 p-3 rounded-lg">
              <div className="w-16 h-16 mr-4 bg-white/10 rounded flex-shrink-0 flex items-center justify-center">
                <img src={icon.dataUrl} alt={`${icon.width}x${icon.height} icon`} className="max-w-full max-h-full object-contain"/>
              </div>
              <div className="flex-grow overflow-hidden">
                <p className="font-semibold text-lg">{`${icon.width} x ${icon.height}`}</p>
                <p className="text-sm text-slate-400 truncate" title={icon.filename}>{icon.filename}</p>
              </div>
              <a 
                href={icon.dataUrl} 
                download={icon.filename}
                className="p-2 rounded-full hover:bg-slate-600 transition-colors flex-shrink-0"
                title={`${t.download} ${icon.filename}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            <p>{t.iconsAppearHere}</p>
          </div>
        )}
      </div>
      <div className="mt-6">
        {preparedZipFile ? (
            <button 
              onClick={handleDownloadZip}
              className="w-full bg-brand-green hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              {t.downloadZip}
            </button>
        ) : (
          <button 
            onClick={handlePrepareZip}
            disabled={icons.length === 0 || isLoading || isPreparing}
            className="w-full bg-brand-blue hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            {isPreparing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                {t.preparing}
              </>
            ) : (
              t.prepareZip
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default IconPreview;