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

export default function PhaseProgress({ currentPhase, turnCount = 0, symptomProfile = null }) {
  let currentStep = 0;

  if (currentPhase === 'GREETING' || currentPhase === 'GUARDRAIL_BLOCKED') {
    currentStep = 0;
  } else if (currentPhase === 'CONSULTATION') {
    if (turnCount >= 2 || Boolean(symptomProfile?.duration || symptomProfile?.comorbidities_asked)) {
      currentStep = 2; // Assessment
    } else {
      currentStep = 1; // Symptoms
    }
  } else if (currentPhase === 'INTAKE') {
    currentStep = 1;
  } else if (currentPhase === 'PROBING') {
    currentStep = 2;
  } else if (currentPhase === 'CONCLUDED' || currentPhase === 'EMERGENCY') {
    currentStep = 3;
  } else {
    currentStep = 0;
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
                  ${isDone ? 'bg-sage text-white shadow-xs' : ''}
                  ${isActive ? 'bg-gold-warm text-[#1A263D] ring-2 ring-gold-warm/60 ring-offset-1 ring-offset-mist shadow-md font-bold' : ''}
                  ${isFuture ? 'bg-surface text-muted border border-border-subtle' : ''}
                `}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span
                className={`text-xs font-bold uppercase tracking-wide transition-colors duration-300
                  ${isDone ? 'text-sage' : ''}
                  ${isActive ? 'text-gold-warm font-extrabold' : ''}
                  ${isFuture ? 'text-muted' : ''}
                `}
              >
                {phase.label}
              </span>
            </div>

            {idx < PHASES.length - 1 && (
              <div
                className={`
                  flex-1 h-0.5 mx-1 rounded-full transition-all duration-500
                  ${idx < currentStep ? 'bg-sage' : 'bg-surface'}
                `}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
