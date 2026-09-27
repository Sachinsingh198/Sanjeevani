import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Universal Mobile-First BackButton
 * Navigates to previous page in browser history or falls back to a safe route.
 */
export default function BackButton({
  fallback = '/mitra',
  label = 'वापस जाएं (Back)',
  className = '',
  showLabel = true,
  onClick,
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-card/80 hover:bg-mist dark:hover:bg-gray-800 text-primary border border-gray-200 dark:border-gray-700/80 shadow-2xs hover:border-sage/40 transition-all active:scale-95 cursor-pointer text-xs font-bold shrink-0 ${className}`}
      aria-label="Previous Page"
      title="Peechhe jayein / Go back"
    >
      <ArrowLeft className="w-4 h-4 text-sage dark:text-booti-glow shrink-0" />
      {showLabel && <span className="truncate">{label}</span>}
    </button>
  );
}
