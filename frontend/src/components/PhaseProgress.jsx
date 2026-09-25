import React from 'react';
import { MessageCircle, Stethoscope, Search, CheckCircle2 } from 'lucide-react';

/**
 * PhaseProgress — 4-step consultation breadcrumb.
 * Animates as the LangGraph state machine advances through phases.
 * Now uses theme tokens instead of one-off hex codes.
 */
const PHASES = [
  { key: 'GREETING', label: 'Welcome', icon: MessageCircle },
  { key: 'CONSULTATION_EARLY', label: 'Symptoms', icon: Stethoscope },
  { key: 'CONSULTATION_LATE', label: 'Assessment', icon: Search },
  { key: 'CONCLUDED', label: 'Remedy', icon: CheckCircle2 },
];

export default function PhaseProgress({ currentPhase, turnCount = 0 }) {
  let currentStep = 0;

  if (currentPhase === 'CONCLUDED' || currentPhase === 'EMERGENCY') {
    currentStep = 3;
  } else if (currentPhase === 'CONSULTATION') {
    // turnCount >= 2 moves from Symptoms intake to Assessment probing
    currentStep = turnCount >= 2 ? 2 : 1;
  } else if (currentPhase === 'INTAKE') {
    currentStep = 1;
  } else if (currentPhase === 'PROBING') {
    currentStep = 2;
  } else {
    currentStep = 0; // GREETING, GUARDRAIL_BLOCKED
  }

  return (
    <div className="flex items-center w-full px-1 py-2">
      {PHASES.map((phase, idx) => {
        const Icon = phase.icon;
        const isDone = idx < currentStep;
        const isActive = idx === currentStep;
        const isFuture = idx > currentStep;

        return (
          <React.Fragment key={phase.key}>
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500
                  ${isDone ? 'bg-sage text-white shadow-sm' : ''}
                  ${isActive ? 'bg-warm-indigo text-white ring-2 ring-gold-warm ring-offset-1 shadow-md' : ''}
                  ${isFuture ? 'bg-gray-200 text-gray-400' : ''}
                `}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span
                className={`text-xs font-bold uppercase tracking-wide transition-colors duration-300
                  ${isDone ? 'text-sage' : ''}
                  ${isActive ? 'text-warm-indigo' : ''}
                  ${isFuture ? 'text-gray-400' : ''}
                `}
              >
                {phase.label}
              </span>
            </div>

            {idx < PHASES.length - 1 && (
              <div
                className={`
                  flex-1 h-0.5 mx-1 rounded-full transition-all duration-500
                  ${idx < currentStep ? 'bg-sage' : 'bg-gray-200'}
                `}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
