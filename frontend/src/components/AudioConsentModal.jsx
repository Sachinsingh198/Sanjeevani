import React from 'react';
import { ShieldCheck, Mic, Lock, CheckCircle2, X } from 'lucide-react';

/**
 * AudioConsentModal — Clinical voice processing and patient privacy consent dialog.
 * Ensures ethical, transparent voice consultation for rural users before audio capture.
 */
export default function AudioConsentModal({ isOpen, onConsent, onDecline }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn select-none">
      <div className="relative w-full max-w-md bg-white dark:bg-[#131E2B] rounded-3xl shadow-2xl border border-sage/25 dark:border-gray-800 overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 bg-sage/12 dark:bg-sage/20 border-b border-sage/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sage text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm sm:text-base text-primary">
                आवाज़ परामर्श सहमति (Voice Consent)
              </h3>
              <p className="text-[10px] text-muted dark:text-muted">
                Patient Privacy & Medical Data Confidentiality
              </p>
            </div>
          </div>
          <button
            onClick={onDecline}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 hover:text-primary transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          <p className="text-xs sm:text-sm text-primary dark:text-[#E2E8F0] leading-relaxed">
            संजीवनी AI में आपकी बात को ध्यान से सुनकर सही सलाह दी जाती है। आपकी गोपनीयता हमारी प्राथमिकता है:
          </p>

          <div className="space-y-2.5 bg-mist/60 dark:bg-card/50 p-3.5 rounded-2xl border border-sage/15 text-xs text-muted dark:text-muted">
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-sage shrink-0 mt-0.5" />
              <span>
                <strong>पूर्णतः गोपनीय:</strong> आपकी आवाज़ केवल लक्षणों की क्लिनिकल जांच और डॉक्टर पर्चा तैयार करने के लिए उपयोग होती है।
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <Mic className="w-4 h-4 text-gold-warm shrink-0 mt-0.5" />
              <span>
                <strong>स्थानीय भाषा:</strong> आप हिन्दी, गढ़वाली या कुमाऊँनी में बेझिझक बोल सकते हैं।
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>नियंत्रण आपके पास:</strong> आप कभी भी माइक बंद कर सकते हैं या लिख कर बता सकते हैं।
              </span>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 text-center">
            जारी रखने के लिए सहमति दें या केवल टाइप करके बात करें।
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onDecline}
              className="w-full sm:flex-1 py-2.5 px-3 rounded-xl border border-gray-300 dark:border-gray-700 text-primary dark:text-gray-200 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
            >
              केवल लिखकर बताएं (Type Only)
            </button>
            <button
              type="button"
              onClick={onConsent}
              className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-sage hover:bg-sage/90 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>सहमत हूँ (I Consent)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
