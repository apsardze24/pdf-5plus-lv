
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Crop, Icon, IconDefinition, AppMode } from './types';
import ImageUploader from './components/ImageUploader';
import ImageEditor from './components/ImageEditor';
import IconPreview from './components/IconPreview';
import ProfileSelector from './components/ProfileSelector';
import CustomSizeInput from './components/CustomSizeInput';
import { getProfiles } from './constants/profiles';
import { useLanguage } from './contexts/LanguageContext';
import LanguageSwitcher from './components/LanguageSwitcher';
import { ShieldIcon } from './components/icons/ShieldIcon';
import HowItWorksGuide from './components/HowItWorksGuide';
import ModeSelector from './components/ModeSelector';
import ImageConverter from './components/ImageConverter';
import CookieConsentBanner from './components/CookieConsentBanner';
import QrCodeGenerator from './components/QrCodeGenerator';
import ImageEditorMode from './components/ImageEditorMode';
import FeedbackModal from './components/FeedbackModal';
import { ShareIcon } from './components/icons/ShareIcon';
import ChromeExtensionButton from './components/ChromeExtensionButton';

interface ImageInfo {
  bounds: { x: number; y: number; width: number; height: number; };
  naturalSize: { width: number; height: number; };
}

const App: React.FC = () => {
  const { language, t } = useLanguage();
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [editedDataUrl, setEditedDataUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('favicon');
  const [generatedIcons, setGeneratedIcons] = useState<Icon[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [customIcons, setCustomIcons] = useState<IconDefinition[]>([]);
  const [isAspectLocked, setIsAspectLocked] = useState<boolean>(false);
  const [imgInfo, setImgInfo] = useState<ImageInfo | null>(null);
  const [mode, setMode] = useState<AppMode>('editor');
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [shareText, setShareText] = useState(t.shareApp);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isUrlLoading, setIsUrlLoading] = useState(false);
  const [isChromeDesktop, setIsChromeDesktop] = useState(false);
  const [isLoadedFromUrl, setIsLoadedFromUrl] = useState(false);
  
  const initialProcessingRef = useRef(false);

  useEffect(() => {
    const isChrome = /Chrome/.test(navigator.userAgent) && !/Mobile/.test(navigator.userAgent);
    setIsChromeDesktop(isChrome);
  }, []);

  const PROFILES = useMemo(() => getProfiles(t), [t]);
  
  useEffect(() => {
    const handleError = (message: Event | string, source?: string, lineno?: number, colno?: number, error?: Error) => {
      if (typeof message === 'string' && message.toLowerCase().includes('script error')) {
        console.warn("Ignoring generic cross-origin 'Script error.'");
        return true;
      }
      
      let formattedError = 'An unexpected error occurred.';
      if (typeof message === 'string') {
          formattedError = `Error: ${message}`;
          if (source) formattedError += `\nSource: ${source.substring(source.lastIndexOf('/') + 1)}`;
          if (lineno) formattedError += ` @ ${lineno}:${colno}`;
      } else if (error) {
          formattedError = `Error: ${error.message}\nStack: ${error.stack || 'No stack trace'}`;
      }
      setLastError(formattedError);
      return true;
    };

    const handlePromiseRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      let formattedError = 'Unhandled Promise Rejection: ';
      if (reason instanceof Error) {
          formattedError += `${reason.message}\nStack: ${reason.stack || 'No stack trace'}`;
      } else {
          formattedError += String(reason);
      }
      setLastError(formattedError);
    };

    window.onerror = handleError;
    window.addEventListener('unhandledrejection', handlePromiseRejection);

    return () => {
      window.onerror = null;
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
    };
  }, []);

  const handleImageUpload = useCallback((files: File[], fromUrl: boolean = false) => {
    setImageFiles(files);
    setCrop(null);
    setGeneratedIcons([]);
    setImgInfo(null);
    setIsAspectLocked(false);
    setEditedDataUrl(null);
    if (!fromUrl) {
      setIsLoadedFromUrl(false);
    }
  }, []);

  useEffect(() => {
    const processUrlParams = async () => {
        if (initialProcessingRef.current) return;
        
        const params = new URLSearchParams(window.location.search);
        const imageUrl = params.get('image');
        const urlMode = params.get('mode') as AppMode;

        if (!imageUrl && !urlMode) return;
        
        initialProcessingRef.current = true;
        let urlChanged = false;

        if (urlMode && ['generator', 'converter', 'qrGenerator', 'editor'].includes(urlMode)) {
            setMode(urlMode);
            urlChanged = true;
        }

        if (imageUrl) {
            setIsUrlLoading(true);
            setIsLoadedFromUrl(true);
            urlChanged = true;
            try {
                // Use corsproxy.io for better reliability with binary image data
                const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(imageUrl)}`;
                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
                
                const blob = await response.blob();
                // Try to infer filename from URL, remove query params
                const cleanUrl = imageUrl.split('?')[0];
                const filename = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1) || 'remote-image.jpg';
                const file = new File([blob], filename, { type: blob.type });
                
                handleImageUpload([file], true);
                
                if (!urlMode) {
                    setMode('converter');
                }
            } catch (error) {
                console.error("Error loading image from URL:", error);
                setIsLoadedFromUrl(false);
            } finally {
                setIsUrlLoading(false);
            }
        }
        
        if (urlChanged) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    };

    processUrlParams();
  }, [handleImageUpload]);

  useEffect(() => {
    setShareText(t.shareApp);
  }, [t.shareApp]);

  useEffect(() => {
    document.documentElement.lang = language;
    const updateTag = (id: string, content: string, attribute = 'content') => {
      const el = document.getElementById(id);
      if (el) {
        if (el.tagName === 'TITLE') {
          el.innerText = content;
        } else if (el.tagName === 'SCRIPT' && el.getAttribute('type') === 'application/ld+json') {
           try {
              const json = JSON.parse(el.innerText);
              json.name = t.metaTitle;
              json.description = t.metaDescription;
              json.keywords = t.metaKeywords;
              json.inLanguage = language;
              el.innerText = JSON.stringify(json, null, 2);
           } catch(e) {}
        } else {
          el.setAttribute(attribute, content);
        }
      }
    };
    updateTag('meta-title', t.metaTitle);
    updateTag('meta-description', t.metaDescription);
    updateTag('meta-keywords', t.metaKeywords);
    updateTag('meta-og-title', t.metaTitle);
    updateTag('meta-og-description', t.ogDescription);
    updateTag('meta-twitter-title', t.metaTitle);
    updateTag('meta-twitter-description', t.ogDescription);
  }, [language, t]);
  
  const singleImageFile = useMemo(() => imageFiles.length > 0 ? imageFiles[0] : null, [imageFiles]);

  const objectUrlFromFile = useMemo(() => {
    if (singleImageFile) {
      return URL.createObjectURL(singleImageFile);
    }
    return null;
  }, [singleImageFile]);

  const activeImageDataUrl = useMemo(() => editedDataUrl || objectUrlFromFile, [editedDataUrl, objectUrlFromFile]);

  useEffect(() => {
    return () => {
        if(objectUrlFromFile) URL.revokeObjectURL(objectUrlFromFile);
    }
  }, [objectUrlFromFile]);
  
  const selectedProfile = useMemo(() => {
    return PROFILES.find(p => p.id === selectedProfileId) || PROFILES[0];
  }, [selectedProfileId, PROFILES]);

  const pageTitle = useMemo(() => {
    if (mode === 'generator') return t.mainTitleGenerator;
    if (mode === 'converter') return t.mainTitleConverter;
    if (mode === 'qrGenerator') return t.mainTitleQr;
    if (mode === 'editor') return t.mainTitleEditor;
    return 'Icon Generator';
  }, [mode, t]);

  const processImage = useCallback(async () => {
    if (!activeImageDataUrl || !crop || crop.width <= 0 || crop.height <= 0) return;
    setIsLoading(true);

    const img = new Image();
    img.src = activeImageDataUrl;
    await new Promise(resolve => img.onload = resolve);

    const icons: Icon[] = [];
    const iconDefsToProcess = selectedProfile.id === 'custom' ? customIcons : selectedProfile.icons;

    for (const iconDef of iconDefsToProcess) {
      const canvas = document.createElement('canvas');
      canvas.width = iconDef.width;
      canvas.height = iconDef.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, iconDef.width, iconDef.height);
      ctx.imageSmoothingQuality = 'high';
      
      const cropAspectRatio = crop.width / crop.height;
      const iconAspectRatio = iconDef.width / iconDef.height;

      let destWidth, destHeight, destX, destY;

      if (cropAspectRatio > iconAspectRatio) {
          destWidth = iconDef.width;
          destHeight = destWidth / cropAspectRatio;
          destX = 0;
          destY = (iconDef.height - destHeight) / 2;
      } else {
          destHeight = iconDef.height;
          destWidth = destHeight * cropAspectRatio;
          destY = 0;
          destX = (iconDef.width - destWidth) / 2;
      }

      ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, destX, destY, destWidth, destHeight);
      icons.push({ width: iconDef.width, height: iconDef.height, dataUrl: canvas.toDataURL('image/png'), filename: iconDef.filename });
    }
    setGeneratedIcons(icons);
    setIsLoading(false);
  }, [activeImageDataUrl, crop, selectedProfile, customIcons]);

  useEffect(() => {
    if (mode === 'generator' && activeImageDataUrl && crop) {
      processImage();
    }
  }, [processImage, activeImageDataUrl, crop, mode]);
  
  const handleAppendFiles = useCallback((filesToAppend: File[]) => {
    setImageFiles(prevFiles => [...prevFiles, ...filesToAppend]);
  }, []);
  
  const handleProfileChange = useCallback((profileId: string) => {
    setSelectedProfileId(profileId);
  }, []);
  
  const handleAddCustomIcon = useCallback((newSize: { width: number; height: number }) => {
    const alreadyExists = customIcons.some(
      (icon) => icon.width === newSize.width && icon.height === newSize.height
    );
    if (alreadyExists) return;

    const newIcon: IconDefinition = {
      ...newSize,
      filename: `custom-${newSize.width}x${newSize.height}.png`,
    };

    setCustomIcons((prev) =>
      [...prev, newIcon].sort((a, b) => a.width * a.height - b.width * b.height)
    );
  }, [customIcons]);
  
  const handleRemoveCustomIcon = useCallback((iconToRemove: { width: number; height: number }) => {
    setCustomIcons((prev) =>
      prev.filter(
        (icon) => !(icon.width === iconToRemove.width && icon.height === iconToRemove.height)
      )
    );
  }, []);

  const handleClearCrop = useCallback(() => {
    setCrop(null);
    setGeneratedIcons([]);
    setIsAspectLocked(false);
  }, []);

  const handleNewImage = useCallback(() => {
      setImageFiles([]);
      setCrop(null);
      setGeneratedIcons([]);
      setImgInfo(null);
      setEditedDataUrl(null);
      setIsLoadedFromUrl(false);
  }, []);
  
  const handleImageProcessed = useCallback((dataUrl: string) => {
    setEditedDataUrl(dataUrl);
  }, []);

  const handleInitiateSquareCrop = useCallback(() => {
    if (!imgInfo) return;
    const { naturalSize } = imgInfo;
    const aspect = naturalSize.width / naturalSize.height;

    let sqWidth, sqHeight, sx, sy;
    if (aspect > 1) {
      sqHeight = naturalSize.height;
      sqWidth = sqHeight;
      sx = (naturalSize.width - sqWidth) / 2;
      sy = 0;
    } else {
      sqWidth = naturalSize.width;
      sqHeight = sqWidth;
      sx = 0;
      sy = (naturalSize.height - sqHeight) / 2;
    }
    
    setCrop({ x: sx, y: sy, width: sqWidth, height: sqHeight });
    setIsAspectLocked(true);
  }, [imgInfo]);

  const handleInitiateFullScreenCrop = useCallback(() => {
      if (!imgInfo) return;
      const { naturalSize } = imgInfo;
      setCrop({ x: 0, y: 0, width: naturalSize.width, height: naturalSize.height });
      setIsAspectLocked(false);
  }, [imgInfo]);
  
  const handleModeChange = useCallback((newMode: AppMode) => {
    const seamlessModes: AppMode[] = ['converter', 'editor', 'generator'];
    const isSwitchingSeamlessly = seamlessModes.includes(mode) && seamlessModes.includes(newMode);
    
    if (!isSwitchingSeamlessly && newMode !== 'qrGenerator') {
       handleNewImage();
    }
    
    setMode(newMode);
  }, [handleNewImage, mode]);

  const handleShareApp = useCallback(async () => {
    const canonicalUrl = "https://pdf.5plus.lv/";
    const shareData = {
      title: t.metaTitle,
      text: t.ogDescription,
      url: canonicalUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(canonicalUrl).then(() => {
        setShareText(t.copiedToClipboard);
        setTimeout(() => setShareText(t.shareApp), 2000);
      }).catch(err => {
        console.error('Failed to copy:', err);
      });
    }
  }, [t]);

  const renderGenerator = () => (
     <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-8">
        <aside className="md:col-span-1 lg:col-span-1">
            <ProfileSelector 
                profiles={PROFILES}
                selectedProfileId={selectedProfileId}
                onProfileChange={handleProfileChange}
            />
            {selectedProfileId === 'custom' && (
              <CustomSizeInput
                customIcons={customIcons}
                onAdd={handleAddCustomIcon}
                onRemove={handleRemoveCustomIcon}
              />
            )}
        </aside>
        <div className="md:col-span-3 lg:col-span-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-slate-800/50 p-6 rounded-2xl shadow-lg flex flex-col">
              <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                 <div className="flex items-center gap-2">
                    {!crop ? (
                        <>
                            <button onClick={handleInitiateSquareCrop} disabled={!imgInfo} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition-colors duration-200">
                                {t.centerSquare}
                            </button>
                            <button onClick={handleInitiateFullScreenCrop} disabled={!imgInfo} className="px-4 py-2 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition-colors duration-200">
                                {t.fullImage}
                            </button>
                        </>
                    ) : (
                        <button onClick={handleClearCrop} className="px-4 py-2 bg-slate-600 hover:bg-slate-700 rounded-lg text-white font-semibold transition-colors duration-200">
                            {t.resetCrop}
                        </button>
                    )}
                 </div>
                 <div className="flex items-center gap-2">
                    <button onClick={handleNewImage} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold transition-colors duration-200">
                        <span className="hidden sm:inline">{t.newImage}</span>
                        <span className="sm:hidden">{t.new}</span>
                    </button>
                 </div>
              </div>
              <ImageEditor 
                src={activeImageDataUrl!} 
                crop={crop}
                onCropChange={setCrop}
                isAspectLocked={isAspectLocked}
                onLoad={setImgInfo}
              />
            </div>
            
            <IconPreview 
              icons={generatedIcons} 
              profileId={selectedProfileId}
              isLoading={isLoading}
            />
        </div>
      </div>
  );
  
  const renderConverter = () => (
      <ImageConverter 
        imageFiles={imageFiles}
        onNewImage={handleNewImage}
        onAppendFiles={handleAppendFiles}
        activeImageDataUrl={activeImageDataUrl}
        onImageProcessed={handleImageProcessed}
      />
  );

  const renderQrGenerator = () => (
      <QrCodeGenerator initialLogoUrl={editedDataUrl}/>
  );
  
  const renderEditor = () => (
      <ImageEditorMode 
        imageFiles={imageFiles}
        onNewImage={handleNewImage}
        activeImageDataUrl={activeImageDataUrl}
        onImageProcessed={handleImageProcessed}
      />
  );

  const renderCurrentMode = () => {
    switch(mode) {
      case 'generator': return renderGenerator();
      case 'converter': return renderConverter();
      case 'editor': return renderEditor();
      default: return null;
    }
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 flex flex-col items-center">
      {isUrlLoading && (
        <div className="fixed inset-0 bg-slate-900/80 z-[200] flex flex-col items-center justify-center backdrop-blur-sm">
            <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-blue-400"></div>
            <p className="mt-6 text-xl text-slate-300">Loading image from URL...</p>
        </div>
      )}

      <header className="w-full max-w-7xl mb-8 flex flex-col items-center">
        <div className="hidden sm:flex w-full justify-between items-start gap-4 mb-2">
          <div className="flex-1 flex justify-start"></div>
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300 text-center flex-shrink-0 pt-1">
            {pageTitle}
          </h1>
          <div className="flex-1 flex justify-end items-start gap-4">
            <div className="flex flex-col items-center gap-2">
              <LanguageSwitcher />
              {isChromeDesktop && <ChromeExtensionButton />}
            </div>
            <button
                onClick={handleShareApp}
                className="w-9 h-9 flex items-center justify-center rounded-full border-2 border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-400"
                title={t.shareApp}
            >
                <ShareIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex sm:hidden w-full flex-col items-center gap-4 mb-2">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300 text-center">
                {pageTitle}
            </h1>
            <div className="flex items-center gap-4">
                <LanguageSwitcher />
                 <button
                    onClick={handleShareApp}
                    className="w-9 h-9 flex items-center justify-center rounded-full border-2 border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-400"
                >
                    <ShareIcon className="w-5 h-5" />
                </button>
            </div>
        </div>

        <p className="text-lg text-slate-400 mb-6 text-center">{t.subTitle}</p>
        <ModeSelector currentMode={mode} onModeChange={handleModeChange} />
      </header>

      <main className="w-full max-w-7xl flex-grow">
        {mode === 'qrGenerator' ? (
          renderQrGenerator()
        ) : imageFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-8">
            <ImageUploader onImageUpload={handleImageUpload} />
            <div className="mt-16 w-full">
                <HowItWorksGuide mode={mode} />
            </div>
          </div>
        ) : (
          renderCurrentMode()
        )}
      </main>
       <footer className="w-full max-w-7xl text-center mt-12 pt-8 border-t border-slate-700/50 pb-6 sm:pb-4">
         <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 text-center md:text-left">
              <div className="flex items-center gap-3 text-slate-400">
                  <ShieldIcon className="w-8 h-8 text-green-400 flex-shrink-0" />
                  <div>
                      <p className="font-bold text-slate-300">{t.privacyTitle}</p>
                      <p className="text-sm">{t.privacyDescription}</p>
                  </div>
              </div>
               <div className="flex items-center gap-4 md:gap-8 flex-wrap justify-center md:justify-start">
                    <a href={`/features_${language}.html`} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-slate-200 transition-colors font-semibold">{t.learnMore}</a>
                     <button onClick={handleShareApp} className="text-sm text-slate-400 hover:text-slate-200 transition-colors font-semibold flex items-center gap-2">
                        <ShareIcon className="w-4 h-4" />
                        {shareText}
                      </button>
                    <a href="#" onClick={(e) => { e.preventDefault(); setIsFeedbackModalOpen(true); }} className="text-sm text-slate-400 hover:text-slate-200 transition-colors font-semibold">{t.feedbackSupportLink}</a>
                    <a href={`/terms_${language}.html`} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-slate-200 transition-colors font-semibold">{t.termsAndPrivacy}</a>
               </div>
            </div>
            <div className="text-slate-500 text-center md:text-right mt-4 md:mt-0">
                <p>
                  {t.developedBy}{' '}
                  <a href="https://apsardze24.lv" target="_blank" rel="noopener noreferrer" className="font-semibold text-red-700 hover:text-red-600 transition-colors">apsardze24.lv</a>
                </p>
                <p className="text-xs mt-1">v3.4.9 &copy; {new Date().getFullYear()}</p>
            </div>
         </div>
      </footer>
      <CookieConsentBanner />
      {isFeedbackModalOpen && <FeedbackModal onClose={() => setIsFeedbackModalOpen(false)} />}
      
      {lastError && (
          <div className="fixed bottom-4 right-4 bg-red-800/90 text-white p-4 rounded-lg shadow-2xl max-w-md z-[100] animate-fade-in backdrop-blur-sm">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h4 className="font-bold mb-2">Error Log:</h4>
                <pre className="text-xs whitespace-pre-wrap font-mono">{lastError}</pre>
              </div>
              <button onClick={() => setLastError(null)} className="p-1 rounded-full text-xl leading-none hover:bg-red-700 flex-shrink-0">&times;</button>
            </div>
          </div>
      )}
    </div>
  );
};

export default App;
