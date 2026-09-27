import React from 'react';

/**
 * SkeletonLoader — Unified, accessible skeleton placeholder for async data.
 * Variants:
 *  - 'card': For dashboard metrics & overview cards
 *  - 'table-row': For user directory, encounter queues & audit logs
 *  - 'list-item': For session drawer & notifications
 *  - 'chat-bubble': For conversational history loading
 */
export default function SkeletonLoader({
  variant = 'card',
  count = 3,
  className = '',
}) {
  const items = Array.from({ length: Math.max(1, count) });

  if (variant === 'card') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`} aria-busy="true" aria-label="Loading data">
        {items.map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-warm-indigo/60 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-xs animate-pulse"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-9 h-9 rounded-2xl bg-gray-200 dark:bg-gray-800" />
              <div className="w-12 h-5 rounded-full bg-gray-200 dark:bg-gray-800" />
            </div>
            <div className="w-20 h-7 rounded-xl bg-gray-200 dark:bg-gray-800 mb-2" />
            <div className="w-32 h-3.5 rounded bg-gray-100 dark:bg-gray-800/80" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table-row') {
    return (
      <div className={`divide-y divide-gray-100 dark:divide-gray-800 ${className}`} aria-busy="true" aria-label="Loading list">
        {items.map((_, i) => (
          <div key={i} className="p-4 sm:p-5 flex items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gray-200 dark:bg-gray-800 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="w-1/3 h-4 rounded bg-gray-200 dark:bg-gray-800" />
                <div className="w-1/2 h-3 rounded bg-gray-100 dark:bg-gray-800/70" />
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-16 h-6 rounded-full bg-gray-200 dark:bg-gray-800" />
              <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'list-item') {
    return (
      <div className={`space-y-3 ${className}`} aria-busy="true" aria-label="Loading items">
        {items.map((_, i) => (
          <div key={i} className="p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 animate-pulse flex items-center justify-between">
            <div className="space-y-1.5 flex-1">
              <div className="w-2/5 h-3.5 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="w-3/5 h-2.5 rounded bg-gray-100 dark:bg-gray-800/60" />
            </div>
            <div className="w-12 h-4 rounded-full bg-gray-200 dark:bg-gray-800 ml-3" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'chat-bubble') {
    return (
      <div className={`space-y-4 p-4 ${className}`} aria-busy="true" aria-label="Loading messages">
        {items.map((_, i) => (
          <div key={i} className={`flex items-start gap-3 ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            {i % 2 === 0 && <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 shrink-0 animate-pulse" />}
            <div className={`rounded-2xl p-4 max-w-[75%] space-y-2 animate-pulse ${
              i % 2 === 0 ? 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800' : 'bg-forest/10 dark:bg-forest/20'
            }`}>
              <div className="w-48 h-3.5 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="w-36 h-3 rounded bg-gray-100 dark:bg-gray-800/70" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}
