import React from 'react';
import { MessageCircle, Stethoscope, Search, CheckCircle2 } from 'lucide-react';

/**
 * PhaseProgress — 4-step consultation breadcrumb.
 * Animates as the LangGraph state machine advances through phases.
 */
const PHASES = [
  { key: 'GREETING',  label: 'Welcome',     icon: MessageCircle },
  { key: 'INTAKE',    label: 'Symptoms',    icon: Stethoscope   },
  { key: 'PROBING',   label: 'Assessment',  icon: Search        },
  { key: 'CONCLUDED', label: 'Remedy',      icon: CheckCircle2  },
];

export default function PhaseProgress({ currentPhase }) {
  // Map non-linear phases to a step index
  const phaseToStep = {
    GREETING: 0,
    INTAKE: 1,
    PROBING: 2,
    CONCLUDED: 3,
    EMERGENCY: 3,
    GUARDRAIL_BLOCKED: 0,
  };

  const currentStep = phaseToStep[currentPhase] ?? 0;

  return (
    <div className="flex items-center w-full px-1 py-2">
      {PHASES.map((phase, idx) => {
        const Icon = phase.icon;
        const isDone = idx < currentStep;
        const isActive = idx === currentStep;
        const isFuture = idx > currentStep;

        return (
          <React.Fragment key={phase.key}>
            {/* Step Node */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500
                  ${isDone  ? 'bg-[#5F7A52] text-white shadow-sm'  : ''}
                  ${isActive ? 'bg-[#1C2B4A] text-white ring-2 ring-[#E8A33D] ring-offset-1 shadow-md' : ''}
                  ${isFuture ? 'bg-gray-200 text-gray-400' : ''}
                `}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span
                className={`text-[9px] font-semibold uppercase tracking-wide transition-colors duration-300
                  ${isDone  ? 'text-[#5F7A52]'  : ''}
                  ${isActive ? 'text-[#1C2B4A]' : ''}
                  ${isFuture ? 'text-gray-400'  : ''}
                `}
              >
                {phase.label}
              </span>
            </div>

            {/* Connector Line (not after last item) */}
            {idx < PHASES.length - 1 && (
              <div
                className={`
                  flex-1 h-0.5 mx-1 rounded-full transition-all duration-500
                  ${idx < currentStep ? 'bg-[#5F7A52]' : 'bg-gray-200'}
                `}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
