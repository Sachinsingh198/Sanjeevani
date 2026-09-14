import React from 'react';

/**
 * SanjeevaniOrb — the single recurring visual signature of the app.
 *
 * The mythic Sanjeevani Booti is a life-restoring herb glowing on a
 * mountainside. This orb is that idea distilled into an interface element:
 * a soft leaf-glow core that breathes slowly (4s inhale/exhale cycle),
 * used everywhere the assistant "speaks" — chat avatar, voice room,
 * loading state — so the identity is instantly recognizable and calming
 * rather than clinical.
 *
 * States:
 *  - idle:      slow ambient breathing
 *  - listening: brighter ring, faster gentle pulse
 *  - thinking:  inward swirl, softer
 *  - speaking:  warm outward glow pulse
 */
export default function SanjeevaniOrb({ state = 'idle', size = 40 }) {
  const ringClass = {
    idle: 'sj-orb-idle',
    listening: 'sj-orb-listening',
    thinking: 'sj-orb-thinking',
    speaking: 'sj-orb-speaking',
  }[state] || 'sj-orb-idle';

  return (
    <div
      className={`sj-orb ${ringClass}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" width="100%" height="100%">
        <defs>
          <radialGradient id="sj-orb-core" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="var(--herb-glow-light)" />
            <stop offset="55%" stopColor="var(--herb-glow)" />
            <stop offset="100%" stopColor="var(--sage)" />
          </radialGradient>
        </defs>
        {/* Outer breathing halo */}
        <circle cx="20" cy="20" r="18" fill="url(#sj-orb-core)" opacity="0.18" className="sj-orb-halo" />
        {/* Core */}
        <circle cx="20" cy="20" r="12" fill="url(#sj-orb-core)" />
        {/* Simple stylised leaf/flame mark — the "booti" glyph */}
        <path
          d="M20 12c3.5 2.4 5.4 5.6 5.4 8.6 0 3.6-2.4 6.4-5.4 6.4s-5.4-2.8-5.4-6.4c0-3 1.9-6.2 5.4-8.6z"
          fill="var(--mist)"
          opacity="0.9"
        />
      </svg>
    </div>
  );
}
