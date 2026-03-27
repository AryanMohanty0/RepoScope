// src/components/icons/ScopeIcon.tsx
import React from 'react';

type ScopeIconProps = {
  className?: string; // Allows you to set size and color via Tailwind
};

export const ScopeIcon: React.FC<ScopeIconProps> = ({ className }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 1. Outer Ring (The Scope Body) */}
      <circle
        cx="50"
        cy="50"
        r="48"
        stroke="currentColor" // This inherits Tailwind's text color
        strokeWidth="4"
      />

      {/* 2. Inner Lens (Glass effect with a faint blue tint) */}
      <circle
        cx="50"
        cy="50"
        r="44"
        fill="url(#lensGradient)"
      />

      {/* 3. Crosshairs (Thin reticle lines) */}
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        {/* Horizontal */}
        <line x1="15" y1="50" x2="40" y2="50" />
        <line x1="60" y1="50" x2="85" y2="50" />
        {/* Vertical */}
        <line x1="50" y1="15" x2="50" y2="40" />
        <line x1="50" y1="60" x2="50" y2="85" />
      </g>

      {/* 4. Center Dot */}
      <circle cx="50" cy="50" r="3" fill="currentColor" />

      {/* 5. Measurement Reticles (Small tick marks) */}
      <g stroke="currentColor" strokeWidth="1" strokeOpacity="0.5">
        <line x1="30" y1="47" x2="30" y2="53" />
        <line x1="70" y1="47" x2="70" y2="53" />
        <line x1="47" y1="30" x2="53" y2="30" />
        <line x1="47" y1="70" x2="53" y2="70" />
      </g>

      {/* 6. Light Highlight (Simulates reflection) */}
      <ellipse
        cx="70"
        cy="30"
        rx="8"
        ry="12"
        fill="white"
        fillOpacity="0.1"
        transform="rotate(-30 70 30)"
      />

      {/* 7. Define Gradient for the lens effect */}
      <defs>
        <radialGradient
          id="lensGradient"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(50 50) rotate(90) scale(44)"
        >
          <stop stopColor="#6366F1" stopOpacity="0.1" /> {/* Indigo-500 tint */}
          <stop offset="1" stopColor="#6366F1" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
};