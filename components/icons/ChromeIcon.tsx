import React from 'react';

export const ChromeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" {...props}>
    <defs>
      <linearGradient id="red-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{stopColor: '#f76d6d'}} />
        <stop offset="100%" style={{stopColor: '#ea4335'}} />
      </linearGradient>
      <linearGradient id="green-grad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" style={{stopColor: '#5eda80'}} />
        <stop offset="100%" style={{stopColor: '#34a853'}} />
      </linearGradient>
      <linearGradient id="yellow-grad" x1="100%" y1="50%" x2="0%" y2="50%">
        <stop offset="0%" style={{stopColor: '#fde477'}} />
        <stop offset="100%" style={{stopColor: '#fbbc05'}} />
      </linearGradient>
      <radialGradient id="blue-grad-center">
        <stop offset="0%" style={{stopColor: '#8ab4f8'}} />
        <stop offset="100%" style={{stopColor: '#4285f4'}} />
      </radialGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
        <feOffset dx="1" dy="2" result="offsetblur"/>
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.5"/>
        </feComponentTransfer>
        <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <g filter="url(#shadow)">
        <path d="M62,32A30,30,0,0,1,32,62" fill="url(#yellow-grad)" />
        <path d="M32,62A30,30,0,0,1,2,32" fill="url(#green-grad)" />
        <path d="M2,32A30,30,0,0,1,32,2" fill="url(#red-grad)" />
        <path d="M32,2A30,30,0,0,1,62,32" fill="#4285f4"/>
        <path d="M32,54A22,22,0,1,1,54,32,22,22,0,0,1,32,54Z" fill="#fff"/>
        <path d="M32,50a18,18,0,1,1,18-18A18,18,0,0,1,32,50Z" fill="url(#blue-grad-center)"/>
    </g>
  </svg>
);