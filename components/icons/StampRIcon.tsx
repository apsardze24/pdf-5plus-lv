import React from 'react';

// Using a simple text-based SVG for the 'R' stamp icon.
// The font 'Russo One' is loaded globally in index.html.
export const StampRIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <text
            x="50%"
            y="52%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontSize="16"
            fontWeight="900"
            fontFamily="'Russo One', sans-serif"
        >
            R
        </text>
    </svg>
);
