import React from 'react';

/**
 * SanjeevaniOrb 2.0 — Upgraded visual signature for the Sanjeevani AI.
 *
 * A multi-ring breathing orb inspired by the mythic Sanjeevani Booti herb,
 * glowing on a Himalayan mountainside. Layered SVG rings with state-driven
 * color palettes, animated particle dots, and a radiant inner leaf/flame glyph.
 *
 * States:
 *  idle       → slow sage-green breath, calm
 *  listening  → gold pulse, attentive ring brightens
 *  thinking   → spinning mid-ring, indigo swirl
 *  processing → same as thinking
 *  speaking   → warm green wave, outward glow
 *  emergency  → rapid red/rose pulse, warning ring
 */

const STATE_PALETTE = {
  idle: {
    core: ['#8ED14C', '#5A7855', '#2B4A30'],
    ring: '#5A7855',
    halo: '#8ED14C',
    particles: '#8ED14C',
  },
  listening: {
    core: ['#FFE8B5', '#D4A359', '#8C5E24'],
    ring: '#D4A359',
    halo: '#F5C842',
    particles: '#D4A359',
  },
  thinking: {
    core: ['#B8C9E8', '#2E4057', '#1A2433'],
    ring: '#2E4057',
    halo: '#6B8DB5',
    particles: '#6B8DB5',
  },
  processing: {
    core: ['#B8C9E8', '#2E4057', '#1A2433'],
    ring: '#2E4057',
    halo: '#6B8DB5',
    particles: '#6B8DB5',
  },
  speaking: {
    core: ['#C3F08C', '#8ED14C', '#5A7855'],
    ring: '#8ED14C',
    halo: '#8ED14C',
    particles: '#8ED14C',
  },
  emergency: {
    core: ['#FFA494', '#B85042', '#5A1A14'],
    ring: '#B85042',
    halo: '#FF5C4D',
    particles: '#FF7878',
  },
};

const PARTICLE_ANGLES = [0, 60, 120, 180, 240, 300]; // 6 equidistant positions

export default function SanjeevaniOrb({
  state = 'idle',
  size = 44,
  onClick = null,
  label = null,
  showLabel = false,
  className = '',
}) {
  const palette = STATE_PALETTE[state] || STATE_PALETTE.idle;
  const uid = `orb-${state}-${size}`;

  const isEmergency  = state === 'emergency';
  const isListening  = state === 'listening';
  const isThinking   = state === 'thinking' || state === 'processing';
  const isSpeaking   = state === 'speaking';

  // Animation class for the outer halo
  const haloAnim = isEmergency ? 'sj-orb-emergency'
    : isListening  ? 'sj-orb-listening'
    : isThinking   ? 'sj-orb-thinking'
    : isSpeaking   ? 'sj-orb-speaking'
    : 'sj-orb-idle';

  // Animation for the mid-ring spinner
  const midRingAnim = isThinking ? 'sj-ring-spin' : '';

  // State label text
  const stateText = {
    idle: 'Taiyar',
    listening: 'Sun raha hoon…',
    thinking: 'Soch raha hoon…',
    processing: 'Soch raha hoon…',
    speaking: 'Bol raha hoon…',
    emergency: 'Tatkal!',
  }[state] || '';

  return (
    <div
      className={`flex flex-col items-center gap-1.5 ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      role={onClick ? 'button' : 'img'}
      aria-label={label || `Sanjeevani Orb: ${state}`}
    >
      <div
        className={`sj-orb relative inline-flex items-center justify-center shrink-0`}
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 80 80"
          width="100%"
          height="100%"
          overflow="visible"
          aria-hidden="true"
        >
          <defs>
            {/* Core radial gradient */}
            <radialGradient id={`${uid}-core`} cx="50%" cy="42%" r="58%">
              <stop offset="0%"   stopColor={palette.core[0]} stopOpacity="1" />
              <stop offset="52%"  stopColor={palette.core[1]} stopOpacity="0.9" />
              <stop offset="100%" stopColor={palette.core[2]} stopOpacity="0.85" />
            </radialGradient>

            {/* Outer halo gradient */}
            <radialGradient id={`${uid}-halo`} cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor={palette.halo} stopOpacity="0.25" />
              <stop offset="70%"  stopColor={palette.halo} stopOpacity="0.08" />
              <stop offset="100%" stopColor={palette.halo} stopOpacity="0" />
            </radialGradient>

            {/* Soft inner glow */}
            <radialGradient id={`${uid}-glow`} cx="50%" cy="35%" r="55%">
              <stop offset="0%"  stopColor="#ffffff" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>

            {/* Drop-shadow filter */}
            <filter id={`${uid}-shadow`} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Mid-ring dash pattern */}
            <filter id={`${uid}-glow-filter`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ── Layer 1: Outermost breathing halo ── */}
          <circle
            cx="40" cy="40" r="36"
            fill={`url(#${uid}-halo)`}
            className={`sj-orb-halo ${haloAnim}`}
          />

          {/* ── Layer 2: Mid spinning ring (dashed, state-coloured) ── */}
          <circle
            cx="40" cy="40" r="28"
            fill="none"
            stroke={palette.ring}
            strokeWidth="1"
            strokeOpacity="0.35"
            strokeDasharray="5 3"
            className={midRingAnim}
            style={{ transformOrigin: '40px 40px' }}
            filter={`url(#${uid}-glow-filter)`}
          />

          {/* ── Layer 3: Inner accent ring ── */}
          <circle
            cx="40" cy="40" r="22"
            fill="none"
            stroke={palette.ring}
            strokeWidth="1.5"
            strokeOpacity="0.5"
          />

          {/* ── Layer 4: Particle dots at 6 positions ── */}
          {PARTICLE_ANGLES.map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const r = 25;
            const px = 40 + r * Math.cos(rad);
            const py = 40 + r * Math.sin(rad);
            return (
              <circle
                key={i}
                cx={px} cy={py}
                r="1.5"
                fill={palette.particles}
                opacity="0.6"
                className={`sj-particle-${i % 3}`}
              />
            );
          })}

          {/* ── Layer 5: Main glowing orb core ── */}
          <circle
            cx="40" cy="40" r="18"
            fill={`url(#${uid}-core)`}
            filter={`url(#${uid}-shadow)`}
          />

          {/* ── Layer 6: Specular highlight ── */}
          <circle
            cx="40" cy="40" r="18"
            fill={`url(#${uid}-glow)`}
          />

          {/* ── Layer 7: Sanjeevani Booti glyph (leaf/flame) ── */}
          <g opacity="0.88">
            {/* Central flame-leaf */}
            <path
              d="M40 26
                 C44.5 29.5 47 34 47 38.5
                 C47 43.8 44 47.5 40 47.5
                 C36 47.5 33 43.8 33 38.5
                 C33 34 35.5 29.5 40 26Z"
              fill="white"
              opacity="0.85"
            />
            {/* Small left leaf */}
            <path
              d="M36.5 35
                 C34 32.5 31.5 33.5 31 36
                 C31.5 37.5 33 38 35 37.5
                 C36.5 37 37 36 36.5 35Z"
              fill="white"
              opacity="0.5"
            />
            {/* Small right leaf */}
            <path
              d="M43.5 35
                 C46 32.5 48.5 33.5 49 36
                 C48.5 37.5 47 38 45 37.5
                 C43.5 37 43 36 43.5 35Z"
              fill="white"
              opacity="0.5"
            />
            {/* Stem */}
            <line
              x1="40" y1="47" x2="40" y2="51"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.5"
            />
          </g>

          {/* ── Emergency pulsing ring overlay ── */}
          {isEmergency && (
            <circle
              cx="40" cy="40" r="34"
              fill="none"
              stroke="#FF5C4D"
              strokeWidth="2"
              strokeOpacity="0.6"
              className="sj-orb-emergency-ring"
            />
          )}

          {/* ── Listening shimmer ring ── */}
          {isListening && (
            <circle
              cx="40" cy="40" r="32"
              fill="none"
              stroke="#F5C842"
              strokeWidth="1.5"
              strokeOpacity="0.5"
              strokeDasharray="3 5"
              className="sj-ring-spin-slow"
              style={{ transformOrigin: '40px 40px' }}
            />
          )}
        </svg>

        {/* Glow backdrop blur ring (CSS-based) */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${palette.halo}22 0%, transparent 70%)`,
          }}
        />
      </div>

      {/* Optional state label */}
      {showLabel && (
        <span
          className="text-[9px] font-bold uppercase tracking-widest"
          style={{ color: palette.ring }}
        >
          {stateText}
        </span>
      )}
    </div>
  );
}
