import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, AlertTriangle, PhoneCall, X, ThumbsUp, ArrowRight } from 'lucide-react';
import { getPendingFollowUp, updateFollowUpStatus } from '../lib/followUpStore';
import { useLanguage } from '../context/LanguageContext';

export default function FollowUpBanner({ onEscalate }) {
  const { l } = useLanguage();
  const [followUp, setFollowUp] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState(null);

  useEffect(() => {
    const pending = getPendingFollowUp();
    if (pending) {
      setFollowUp(pending);
    }
  }, []);

  if (!followUp) return null;

  const handleOutcome = (outcome) => {
    updateFollowUpStatus(followUp.id, outcome);
    setFeedbackGiven(outcome);

    if (outcome === 'worsened') {
      onEscalate?.(followUp);
    } else {
      setTimeout(() => setFollowUp(null), 4000);
    }
  };

  const handleDismiss = () => {
    updateFollowUpStatus(followUp.id, 'dismissed');
    setFollowUp(null);
  };

  return (
    <div className="shrink-0 mx-3 sm:mx-4 mt-2 p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-sage/15 via-emerald-500/10 to-sage/10 dark:from-warm-indigo dark:to-gray-800 border border-sage/30 dark:border-gray-700 shadow-md animate-fadeIn">
      <div className="flex items-start justify-between gap-2">
        
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-xl bg-sage/20 text-sage dark:text-booti-glow shrink-0 mt-0.5">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sage dark:text-booti-glow">
                {l('24 घंटे रिकवरी फॉलो-अप', '24-Hour Recovery Follow-Up', '24-Hour Recovery Follow-Up')}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sage/20 font-semibold text-primary dark:text-cream">
                {followUp.condition}
              </span>
            </div>

            <p className="text-xs font-bold text-primary dark:text-cream mt-0.5">
              {l(
                `${followUp.patientName || 'आपकी'} तबीयत अब कैसी है? क्या आराम मिला?`,
                `How is ${followUp.patientName || 'your'} condition now? Any improvement?`,
                `${followUp.patientName || 'Aapki'} tabiyat ab kaisi hai? Aaram mila?`
              )}
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Outcome Feedback Buttons */}
      {!feedbackGiven ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => handleOutcome('recovered')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{l('बिल्कुल ठीक हैं', 'Fully Recovered', 'Bilkul Theek')}</span>
          </button>

          <button
            onClick={() => handleOutcome('improving')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>{l('थोड़ा आराम है', 'Slightly Better', 'Thoda Aaram Hai')}</span>
          </button>

          <button
            onClick={() => handleOutcome('worsened')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{l('आराम नहीं / तकलीफ बढ़ी', 'Worsened / No Relief', 'Aaram Nahi / Takleef Badhi')}</span>
          </button>
        </div>
      ) : feedbackGiven === 'recovered' ? (
        <div className="mt-2.5 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>
            {l('बहुत अच्छा! स्वास्थ्य बनाए रखने के लिए संतुलित आहार व गुनगुने पानी का सेवन जारी रखें।', 'Wonderful news! Maintain adequate hydration and wholesome diet to stay healthy.', 'Bahut badhiya! Healthy aahar aur gunguna paani jaari rakhein.')}
          </span>
        </div>
      ) : feedbackGiven === 'improving' ? (
        <div className="mt-2.5 p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-400 font-bold flex items-center gap-2">
          <Clock className="w-4 h-4 shrink-0" />
          <span>
            {l('अच्छी प्रगति है! घरेलू काढ़ा / नुस्खा 1-2 दिन और जारी रखें।', 'Good progress! Continue the prescribed home remedy for 1-2 more days.', 'Achha progress hai! Nuskha 1-2 din aur continue rakhein.')}
          </span>
        </div>
      ) : (
        <div className="mt-2.5 p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-bold space-y-1.5">
          <div className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{l('चेतावनी: लक्षण 24 घंटे में नहीं सुधरे हैं। तुरंत नजदीकी PHC चिकित्सक को दिखाएं।', 'Warning: Symptoms have not resolved in 24h. Please visit your nearest PHC doctor immediately.', 'Warning: Lakshan improve nahi hue. Turant PHC doctor ko dikhayein.')}</span>
          </div>
          <div className="flex gap-2">
            <a
              href="tel:104"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold shadow-xs hover:bg-rose-700"
            >
              <PhoneCall className="w-3 h-3" />
              <span>104 Medical Advice</span>
            </a>
            <a
              href="tel:108"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-700 text-white text-[11px] font-bold shadow-xs hover:bg-red-800"
            >
              <PhoneCall className="w-3 h-3" />
              <span>108 Emergency</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
