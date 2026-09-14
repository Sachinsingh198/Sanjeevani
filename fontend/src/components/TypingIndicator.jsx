import React from 'react';

/**
 * TypingIndicator — animated 3-dot pulse that appears while the
 * LangGraph pipeline is processing (LLM + vector search).
 */
export default function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start">
      {/* Bot Avatar */}
      <div className="w-8 h-8 rounded-full bg-[#1C2B4A] text-white flex items-center justify-center shrink-0">
        <span className="text-sm">🌿</span>
      </div>

      {/* Bubble */}
      <div className="bg-[#F3EFE4] border border-border-subtle rounded-2xl rounded-bl-none px-4 py-3.5 shadow-sm flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-2 h-2 bg-[#5F7A52] rounded-full inline-block"
            style={{
              animation: `typing-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
        <style>{`
          @keyframes typing-bounce {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
            40%            { transform: translateY(-6px); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}
