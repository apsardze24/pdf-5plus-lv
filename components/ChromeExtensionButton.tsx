
import React, { useCallback, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { ChromeIcon } from './icons/ChromeIcon';
import { MANIFEST_JSON, BACKGROUND_JS, OPTIONS_HTML, OPTIONS_JS, ICON_BASE64 } from '../constants/extensionTemplate';

// Declare globals for libraries loaded via CDN
declare var JSZip: any;
declare var saveAs: any;

const ChromeExtensionButton: React.FC = () => {
    const { t } = useLanguage();
    const [isGenerating, setIsGenerating] = useState(false);

    const handleDownloadExtension = useCallback(async (e: React.MouseEvent) => {
        e.preventDefault();
        
        if (typeof JSZip === 'undefined' || typeof saveAs === 'undefined') {
            alert("Required libraries not loaded yet. Please wait a moment.");
            return;
        }

        setIsGenerating(true);

        try {
            const zip = new JSZip();
            
            // Add extension files
            zip.file("manifest.json", MANIFEST_JSON);
            zip.file("background.js", BACKGROUND_JS);
            zip.file("options.html", OPTIONS_HTML);
            zip.file("options.js", OPTIONS_JS);
            
            // Convert base64 icon to blob
            const iconResponse = await fetch(`data:image/png;base64,${ICON_BASE64}`);
            const iconBlob = await iconResponse.blob();
            
            zip.file("icon16.png", iconBlob);
            zip.file("icon48.png", iconBlob);
            zip.file("icon128.png", iconBlob);

            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, "pdf-editor-extension.zip");
            
        } catch (error) {
            console.error("Failed to generate extension zip:", error);
            alert("Failed to generate extension. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    }, []);

    return (
        <button
            onClick={handleDownloadExtension}
            title={t.getChromeExtensionTooltip}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-full text-white font-semibold transition-colors duration-200 animate-fade-in disabled:bg-slate-600 disabled:cursor-wait"
            disabled={isGenerating}
        >
            {isGenerating ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
                <ChromeIcon className="w-5 h-5" />
            )}
            <span>{t.getChromeExtension} (.zip)</span>
        </button>
    );
};

export default ChromeExtensionButton;
