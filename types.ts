// FIX: Import React to provide types for React.FC and other React-specific types.
import React from 'react';

export type AppMode = 'generator' | 'converter' | 'qrGenerator' | 'editor';

export interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Icon {
  width: number;
  height: number;
  dataUrl: string;
  filename: string;
}

export interface IconDefinition {
  width: number;
  height: number;
  filename: string;
}

export interface Profile {
  id: string;
  name: string;
  description: string;
  icons: IconDefinition[];
  iconComponent: React.FC<React.SVGProps<SVGSVGElement>>;
}

// QR Code Generator Types
export interface QrType {
    id: string;
    labelKey: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    fields: QrField[];
    initialData: QrData;
}

export interface QrField {
    name: string;
    labelKey: string;
    type: 'text' | 'textarea' | 'tel' | 'email' | 'number' | 'datetime-local' | 'select';
    placeholderKey: string;
    required?: boolean;
    options?: { value: string; labelKey: string }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type QrData = Record<string, any>;

export interface DesignOptions {
    dotsColor: string;
    backgroundColor: string;
    cornersColor: string;
    dotsType: 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'square' | 'extra-rounded';
    cornersType: 'square' | 'dot' | 'extra-rounded';
    logo: string | null;
    logoSize: number;
    captionText: string;
    captionColor: string;
    captionSize: number;
    captionMargin: number;
}

// Image Editor Types
export type EditorTool = 'select' | 'pan' | 'pen' | 'eraser' | 'crop' | 'undo' | 'flipHorizontal' | 'flipVertical' | 'arrow' | 'rect' | 'circle' | 'text' | 'sign' | 'stampR' | 'addImage' | 'line';