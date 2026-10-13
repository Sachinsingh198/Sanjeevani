import React, { useState, useEffect } from 'react';
import {
  Mic, ShieldAlert, FileText, QrCode, Sparkles, X, ChevronRight,
  ChevronLeft, CheckCircle2, Volume2, VolumeX, ArrowRight, Heart
} from 'lucide-react';
import { speakText } from '../api/voiceClient';
import { useLanguage } from '../context/LanguageContext';

export default function OnboardingModal({ isOpen, onClose, onStartChat }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const { lang, l } = useLanguage();

  const ONBOARDING_STEPS = [
    {
      step: 1,
      badge: l('चरण 1', 'Step 1', 'Kadam 1'),
      title: l('बोलकर परामर्श लें 🎙️', 'Voice-First Consultation 🎙️', 'Bolkar Baat Karein 🎙️'),
      englishTitle: l('प्राकृतिक आवाज में बात करें', 'Speak Naturally in Your Language', 'Apni aawaz mein baat karein'),
      desc: l(
        'लिखने या टाइप करने की आवश्यकता नहीं। बस माइक दबाएं और अपनी भाषा में अपनी समस्या बताएं।',
        'No need to type. Just press the microphone and explain your symptoms naturally in pure English.',
        'Likhne ya type karne ki koi jhijhak nahi. Bas mic button dabayein aur apni bhasha mein batayein kya takleef hai.'
      ),
      icon: Mic,
      color: 'from-emerald-500/20 to-teal-500/10',
      borderColor: 'border-emerald-500/30',
      textColor: 'text-emerald-700 dark:text-emerald-400',
      iconBg: 'bg-emerald-500 text-white',
      audioText: l(
        'चरण 1: बोलकर परामर्श लें। लिखने की आवश्यकता नहीं, बस माइक दबाकर अपनी समस्या बताएं।',
        'Step 1: Voice first consultation. No need to type, just press the microphone and explain your symptoms.',
        'Kadam 1: Bolkar baat karein. Likhne ya type karne ki koi zaroorat nahi. Bas mic dabayein aur apni takleef batayein.'
      ),
    },
    {
      step: 2,
      badge: l('चरण 2', 'Step 2', 'Kadam 2'),
      title: l('जांच व डिजिटल पर्चा 🏥', 'Clinical Triage & Digital Pass 🏥', 'Jaanch & Doctor Parcha 🏥'),
      englishTitle: l('त्वरित प्राथमिकता निर्धारण व क्यूआर कोड', 'Instant Severity Triage & QR Pass', 'Instant Triage aur QR Pass'),
      desc: l(
        'एआई तुरंत गंभीरता (हरा = सामान्य, पीला = ध्यान दें, लाल = तत्काल) निर्धारित करता है और डॉक्टर के लिए क्यूआर पास बनाता है।',
        'Instant color-coded severity triage with a digital QR Referral Pass that local PHC doctors can scan immediately.',
        'AI turant triage rang (Green = Aam, Yellow = Dhyan dein, Red = Tatkal) nirdharit karta hai aur doctor ke liye instant QR Referral Pass banata hai.'
      ),
      icon: QrCode,
      color: 'from-amber-500/20 to-orange-500/10',
      borderColor: 'border-amber-500/30',
      textColor: 'text-amber-800 dark:text-amber-400',
      iconBg: 'bg-amber-600 text-white',
      audioText: l(
        'चरण 2: जांच और डिजिटल पर्चा। एआई तुरंत गंभीरता की जांच करता है और डॉक्टर के लिए क्यूआर पास तैयार करता है।',
        'Step 2: Clinical triage and digital pass. AI evaluates severity and generates an instant QR referral pass.',
        'Kadam 2: Jaanch aur doctor parcha. AI turant gambhirta ki jaanch karta hai aur doctor ke liye QR pass taiyar karta hai.'
      ),
    },
    {
      step: 3,
      badge: l('चरण 3', 'Step 3', 'Kadam 3'),
      title: l('आयुष उपचार व 108 सहायता 🌿', 'AYUSH Remedies & Emergency Help 🌿', 'AYUSH Nuskhe & 108 Madad 🌿'),
      englishTitle: l('प्रमाणित घरेलू नुस्खे व आपातकालीन मदद', 'Verified Home Remedies & Emergency 108', 'Gharelu Upchar aur 108 Ambulance'),
      desc: l(
        'सरकारी आयुष प्रमाणित घरेलू उपचार, दवा लेने की आवाज में घंटी, और आपातकाल में 1-टैप 108 एम्बुलेंस कॉल की सुविधा।',
        'Verified AYUSH herbal remedies, spoken audio medicine chimes, and instant 1-tap 108 emergency ambulance dialing.',
        'Sarkari AYUSH pramanit gharelu upchar, dawai lene ki aawazi ghanti, aur aapatkal mein 1-tap 108 ambulance call ki suvidha.'
      ),
      icon: Heart,
      color: 'from-rose-500/20 to-pink-500/10',
      borderColor: 'border-rose-500/30',
      textColor: 'text-rose-800 dark:text-rose-400',
      iconBg: 'bg-rose-600 text-white',
      audioText: l(
        'चरण 3: आयुष उपचार और 108 सहायता। प्रमाणित घरेलू नुस्खे और आपातकाल में तुरंत एम्बुलेंस कॉल।',
        'Step 3: AYUSH remedies and 108 emergency help. Verified remedies and 1-tap emergency ambulance dialing.',
        'Kadam 3: Ayush nuskhe aur 108 madad. Pramanit gharelu nuskhe aur aapatkal mein turant ambulance call.'
      ),
    },
  ];

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentStep]);

  if (!isOpen) return null;

  const stepData = ONBOARDING_STEPS[currentStep];
  const IconComponent = stepData.icon;
  const isLast = currentStep === ONBOARDING_STEPS.length - 1;

  const handleAudioReadout = () => {
    if (isPlayingAudio) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
      return;
    }

    setIsPlayingAudio(true);
    speakText(stepData.audioText, {
      language: 'hi',
      gender: 'female',
      onEnd: () => setIsPlayingAudio(false),
    });
  };

  const handleNext = () => {
    if (isPlayingAudio && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    }
    if (isLast) {
      handleComplete();
    } else {
      setCurrentStep((c) => c + 1);
    }
  };

  const handlePrev = () => {
    if (isPlayingAudio && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    }
    if (currentStep > 0) {
      setCurrentStep((c) => c - 1);
    }
  };

  const handleComplete = () => {
    try {
      localStorage.setItem('sanjeevani_onboarding_completed', 'true');
    } catch {}
    onClose();
    if (onStartChat) onStartChat();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
    >
      <div className="bg-white dark:bg-[#131E2B] border border-sage/20 dark:border-gray-700/80 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col transition-all duration-300">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8ED14C] animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-sage dark:text-booti-glow">
              {l('संजीवनी सहायक मार्गदर्शक', 'Sanjeevani Assistant Guide', 'Sanjeevani Sahayak Guide')}
            </span>
          </div>
          <button
            type="button"
            onClick={handleComplete}
            aria-label={l('बंद करें', 'Close', 'Band karein')}
            className="touch-target p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div className="flex items-center gap-1.5 px-6 pt-3">
          {ONBOARDING_STEPS.map((s, idx) => (
            <div
              key={idx}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                idx === currentStep
                  ? 'bg-sage dark:bg-booti-glow'
                  : idx < currentStep
                  ? 'bg-sage/40 dark:bg-booti-glow/40'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Card Body */}
        <div className="p-6 flex-1 flex flex-col items-center text-center">
          {/* Animated Hero Icon */}
          <div className={`w-16 h-16 rounded-2xl ${stepData.iconBg} flex items-center justify-center shadow-lg shadow-black/10 mb-4 transition-transform duration-300 scale-100 hover:scale-105`}>
            <IconComponent className="w-8 h-8" />
          </div>

          <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${stepData.borderColor} ${stepData.textColor} bg-white dark:bg-gray-800 mb-2`}>
            {stepData.badge}
          </span>

          <h3 id="onboarding-modal-title" className="font-serif text-xl sm:text-2xl font-bold text-primary mb-1">
            {stepData.title}
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-3">
            {stepData.englishTitle}
          </p>

          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-sm mb-2">
            {stepData.desc}
          </p>

          {/* Voice Readout Button */}
          <button
            type="button"
            onClick={handleAudioReadout}
            className={`touch-target mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              isPlayingAudio
                ? 'bg-sage text-white border-sage animate-pulse'
                : 'bg-sage/10 text-sage dark:text-booti-glow border-sage/20 hover:bg-sage/20'
            }`}
          >
            {isPlayingAudio ? (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>{l('रोकें (ऑडियो रोकें)', 'Pause Audio', 'Rukiye (Audio pause karein)')}</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>{l('आवाज में सुनें', 'Listen Aloud', 'Aawaz mein sunein')}</span>
              </>
            )}
          </button>
        </div>

        {/* Footer Navigation Buttons */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-[#0F1521] border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
          {currentStep > 0 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="touch-target px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{l('पीछे', 'Previous', 'Peeche')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              className="touch-target text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline underline-offset-2"
            >
              {l('छोड़ें', 'Skip', 'Chhodein')}
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            className="touch-target px-5 py-2.5 rounded-xl bg-sage hover:bg-sage/90 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>
              {isLast
                ? l('परामर्श शुरू करें 🙏', 'Start Consultation 🙏', 'Paramarsh Shuru Karein 🙏')
                : l('आगे', 'Next', 'Aage')}
            </span>
            {isLast ? <CheckCircle2 className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

      </div>
    </div>
  );
}
