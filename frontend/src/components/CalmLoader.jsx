import React from 'react';
import SanjeevaniOrb from './SanjeevaniOrb';

/**
 * CalmLoader — replaces the old 3-dot TypingIndicator.
 *
 * Rapid bouncing dots read as "hurry up" — the opposite of what a worried
 * patient needs while the triage engine (LLM + vector search) thinks.
 * Instead we show the breathing orb with a one-line reassurance, so the
 * wait itself feels like a small pause to breathe rather than a stall.
 */
export default function CalmLoader({ label = 'Sanjeevani soch rahi hai…' }) {
  return (
    <div className="flex items-center gap-3 justify-start">
      <SanjeevaniOrb state="thinking" size={32} />
      <div className="bg-[color:var(--bg-card)] border border-border-subtle rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
        <span className="text-xs text-muted italic">{label}</span>
      </div>
    </div>
  );
}
