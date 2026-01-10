import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { QrType, QrData, DesignOptions } from '../types';
import { QR_TYPES } from '../constants/qrConstants';
import { formatQrData } from '../services/qrFormatter';
import TypeSelector from './qr/TypeSelector';
import DataForm from './qr/DataForm';
import DesignPanel from './qr/DesignPanel';
import PreviewPanel from './qr/PreviewPanel';
import ImageCropperOverlay from './qr/ImageCropperOverlay';
import HowItWorksGuide from './HowItWorksGuide';

interface QrCodeGeneratorProps {
    initialLogoUrl?: string | null;
}

const QrCodeGenerator: React.FC<QrCodeGeneratorProps> = ({ initialLogoUrl }) => {
    const { t } = useLanguage();

    const [qrType, setQrType] = useState<QrType | null>(null);
    const [qrData, setQrData] = useState<QrData>({});
    const [designOptions, setDesignOptions] = useState<DesignOptions>({
        dotsColor: '#ffffff',
        backgroundColor: '#1e293b',
        cornersColor: '#ffffff',
        dotsType: 'rounded',
        cornersType: 'extra-rounded',
        logo: null,
        logoSize: 0.4,
        captionText: '',
        captionColor: '#ffffff',
        captionSize: 8,
        captionMargin: 4,
    });
    
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [isCropperOpen, setIsCropperOpen] = useState(false);

    useEffect(() => {
        if (initialLogoUrl) {
            setDesignOptions(prev => ({ ...prev, logo: initialLogoUrl }));
        }
    }, [initialLogoUrl]);

    const handleTypeChange = useCallback((type: QrType) => {
        setQrType(type);
        setQrData(type.initialData);
    }, []);

    const handleLogoUpload = (file: File) => {
        setLogoFile(file);
        setIsCropperOpen(true);
    };

    const handleCroppedLogo = (image: string | null) => {
        setDesignOptions(prev => ({ ...prev, logo: image }));
        setIsCropperOpen(false);
        setLogoFile(null); // Clear original file
    };

    const handleRemoveLogo = () => {
        setDesignOptions(prev => ({ ...prev, logo: null }));
    };

    const formattedQrString = useMemo(() => {
        if (!qrType) return '';
        return formatQrData(qrType, qrData);
    }, [qrType, qrData]);

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Panel: Controls */}
                <div className="bg-slate-800/50 p-6 rounded-2xl shadow-lg flex flex-col gap-8">
                    <div>
                        <h2 className="text-xl font-bold text-slate-200 mb-4">{t.step1_title}</h2>
                        <TypeSelector types={QR_TYPES} selectedType={qrType} onTypeChange={handleTypeChange} />
                    </div>
                    
                    {qrType ? (
                        <>
                            <div className="flex-grow">
                                <h2 className="text-xl font-bold text-slate-200 mb-4">{t.step2_title}</h2>
                                <DataForm type={qrType} data={qrData} onDataChange={setQrData} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-200 mb-4">{t.step3_title}</h2>
                                <DesignPanel
                                    options={designOptions}
                                    onOptionsChange={setDesignOptions}
                                    onLogoUpload={handleLogoUpload}
                                    onRemoveLogo={handleRemoveLogo}
                                />
                            </div>
                        </>
                    ) : (
                        <HowItWorksGuide mode="qrGenerator" />
                    )}
                </div>

                {/* Right Panel: Preview */}
                <PreviewPanel data={formattedQrString} options={designOptions} />
            </div>

            {isCropperOpen && logoFile && (
                <ImageCropperOverlay
                    imageFile={logoFile}
                    onCropComplete={handleCroppedLogo}
                    onClose={() => setIsCropperOpen(false)}
                />
            )}
        </>
    );
};

export default QrCodeGenerator;