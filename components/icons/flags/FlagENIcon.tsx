import React from 'react';

export const FlagENIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" {...props}>
    <clipPath id="a">
      <path d="M30 15h30v15zv15h-30zH0z" />
    </clipPath>
    <path d="M0 0v30h60V0z" fill="#00247d" />
    <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6" />
    <path d="M0 0l60 30m0-30L0 30" clipPath="url(#a)" stroke="#cf142b" strokeWidth="4" />
    <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10" />
    <path d="M30 0v30M0 15h60" stroke="#cf142b" strokeWidth="6" />
  </svg>
);