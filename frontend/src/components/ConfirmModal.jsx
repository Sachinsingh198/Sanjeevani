import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  isDestructive = true,
  icon: Icon = Trash2,
}) {
  const { l } = useLanguage();

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-white dark:bg-[#131E2B] rounded-3xl p-5 sm:p-6 shadow-2xl border border-sage/20 dark:border-gray-700/80 animate-fadeIn overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Close Icon Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          aria-label={l('बंद करें', 'Close')}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header & Icon */}
        <div className="flex items-start gap-3.5 mb-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
              isDestructive
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25'
                : 'bg-sage/15 text-sage dark:text-booti-glow border border-sage/25'
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0 pr-6">
            <h3 className="font-serif text-base font-bold text-primary dark:text-[#F4F6F0] leading-snug">
              {title || (isDestructive ? l('हटाने की पुष्टि करें', 'Confirm Deletion') : l('पुष्टि करें', 'Confirm'))}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {isDestructive ? l('यह क्रिया वापस नहीं ली जा सकती।', 'This action cannot be undone.') : ''}
            </p>
          </div>
        </div>

        {/* Message Body */}
        {message && (
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
            {message}
          </p>
        )}

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-gray-800/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all cursor-pointer"
          >
            {cancelText || l('रद्द करें', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm?.();
              onClose?.();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                : 'bg-sage hover:bg-sage/90 shadow-sage/20'
            }`}
          >
            {isDestructive && <Trash2 className="w-3.5 h-3.5" />}
            <span>{confirmText || (isDestructive ? l('हटाएं', 'Delete') : l('ठीक है', 'OK'))}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}
