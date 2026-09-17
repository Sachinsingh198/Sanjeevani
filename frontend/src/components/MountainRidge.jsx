import React from 'react';

/**
 * MountainRidge — the redesign's single recurring structural motif: a
 * hairline silhouette of the Garhwal ridgeline. Meant to appear ONCE per
 * page (behind a hero or a page header), never tiled as decoration.
 *
 * tone: 'pine' (default, quiet) | 'stone' (for use on dark surfaces)
 */
export default function MountainRidge({ tone = 'pine', className = '' }) {
  const fill = tone === 'stone' ? '#F5F0E6' : 'var(--sage)';
  const opacity = tone === 'stone' ? 0.14 : 0.16;

  return (
    <svg
      viewBox="0 0 1200 220"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M0 190 L90 110 L160 160 L260 60 L340 150 L430 90 L520 170 L610 40 L700 140 L780 95 L860 175 L950 70 L1040 155 L1120 100 L1200 180 L1200 220 L0 220 Z"
        fill={fill}
        opacity={opacity}
      />
      <path
        d="M0 205 L120 140 L210 185 L320 100 L420 180 L540 120 L650 195 L760 80 L870 175 L980 130 L1090 190 L1200 150 L1200 220 L0 220 Z"
        fill={fill}
        opacity={opacity * 0.6}
      />
    </svg>
  );
}
