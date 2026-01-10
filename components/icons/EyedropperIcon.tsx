import React from 'react';

// Using a similar-style icon for Eyedropper
export const EyedropperIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L4.2 15.3m15.6 0c1.25.313 1.25 2.132 0 2.445l-1.57.393a9.065 9.065 0 01-6.23.693 9.065 9.065 0 01-6.23-.693L4.2 17.745c-1.25-.313-1.25-2.132 0-2.445l1.57-.393a9.065 9.065 0 016.23.693 9.065 9.065 0 016.23-.693l1.57-.393z" />
    </svg>
);
