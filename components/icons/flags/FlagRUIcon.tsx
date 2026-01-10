import React from 'react';

export const FlagRUIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" {...props}>
        <path d="M0 0h60v30H0z" fill="#fff"/>
        <path d="M0 10h60v20H0z" fill="#0039a6"/>
        <path d="M0 20h60v10H0z" fill="#d52b1e"/>
    </svg>
);