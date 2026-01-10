import React, { useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { AppMode } from '../types';
import { Translation } from '../constants/translations';

import { StepUploadIcon } from './icons/StepUploadIcon';
import { StepCropIcon } from './icons/StepCropIcon';
import { StepDownloadIcon } from './icons/StepDownloadIcon';
import { StepSelectIcon } from './icons/StepSelectIcon';
import { StepQrTypeIcon } from './icons/StepQrTypeIcon';
import { StepCustomizeIcon } from './icons/StepCustomizeIcon';
import { EditorIcon } from './icons/EditorIcon';


interface Step {
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
  // FIX: The 'translations' object was not in scope. Using the imported 'Translation' type instead.
  titleKey: keyof Translation;
  descriptionKey: keyof Translation;
}

interface HowItWorksGuideProps {
  mode: AppMode;
}

const HowItWorksGuide: React.FC<HowItWorksGuideProps> = ({ mode }) => {
  const { t } = useLanguage();

  const guideContent = useMemo(() => {
    switch (mode) {
      case 'converter':
        return {
          steps: [
            { Icon: StepUploadIcon, titleKey: 'step1TitleConverter', descriptionKey: 'step1DescriptionConverter' },
            { Icon: StepSelectIcon, titleKey: 'step2TitleConverter', descriptionKey: 'step2DescriptionConverter' },
            { Icon: StepDownloadIcon, titleKey: 'step3TitleConverter', descriptionKey: 'step3DescriptionConverter' },
          ] as Step[],
        };
      case 'editor':
        return {
          steps: [
            { Icon: StepUploadIcon, titleKey: 'step1TitleEditor', descriptionKey: 'step1DescriptionEditor' },
            { Icon: EditorIcon, titleKey: 'step2TitleEditor', descriptionKey: 'step2DescriptionEditor' },
            { Icon: StepDownloadIcon, titleKey: 'step3TitleEditor', descriptionKey: 'step3DescriptionEditor' },
          ] as Step[],
        };
      case 'qrGenerator':
        return {
          steps: [
            { Icon: StepQrTypeIcon, titleKey: 'step1TitleQr', descriptionKey: 'step1DescriptionQr' },
            { Icon: StepCustomizeIcon, titleKey: 'step2TitleQr', descriptionKey: 'step2DescriptionQr' },
            { Icon: StepDownloadIcon, titleKey: 'step3TitleQr', descriptionKey: 'step3DescriptionQr' },
          ] as Step[],
        };
      case 'generator':
      default:
        return {
          steps: [
            { Icon: StepUploadIcon, titleKey: 'step1TitleGenerator', descriptionKey: 'step1DescriptionGenerator' },
            { Icon: StepCropIcon, titleKey: 'step2TitleGenerator', descriptionKey: 'step2DescriptionGenerator' },
            { Icon: StepDownloadIcon, titleKey: 'step3TitleGenerator', descriptionKey: 'step3DescriptionGenerator' },
          ] as Step[],
        };
    }
  }, [mode]);

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-8 text-slate-200">{t.howItWorksTitle}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        {guideContent.steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center p-4">
            <step.Icon className="w-16 h-16 mb-4 text-blue-400" />
            <h3 className="text-xl font-semibold mb-2">{t[step.titleKey]}</h3>
            <p className="text-slate-400">{t[step.descriptionKey]}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HowItWorksGuide;