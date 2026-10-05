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
  showLabel = false,
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
      className={`touch-target p-1 -ml-1 text-primary hover:text-sage dark:hover:text-booti-glow transition-colors active:scale-90 cursor-pointer flex items-center justify-center shrink-0 ${
        showLabel ? 'gap-1' : ''
      } ${className}`}
      aria-label="Previous Page"
      title={label || "Peechhe jayein / Go back"}
    >
      <ArrowLeft className="w-5 h-5 text-primary hover:text-sage dark:hover:text-booti-glow transition-colors" />
      {showLabel && <span className="text-xs font-bold truncate text-primary">{label}</span>}
    </button>
  );
}
