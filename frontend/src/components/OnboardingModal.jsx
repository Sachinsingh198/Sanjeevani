import React, { useState, useEffect } from 'react';
import {
  Mic, ShieldAlert, FileText, QrCode, Sparkles, X, ChevronRight,
  ChevronLeft, CheckCircle2, Volume2, VolumeX, ArrowRight, Heart
} from 'lucide-react';
import { speakText } from '../api/voiceClient';

const ONBOARDING_STEPS = [
  {
    step: 1,
    badge: 'Kadam 1 / Step 1',
    title: 'Bolkar Baat Karein 🎙️',
    englishTitle: 'Voice-First Consultation',
    desc: 'Likhne ya type karne ki koi jhijhak nahi. Bas mic button dabayein aur apni bhasha (Hindi ya Pahadi) mein batayein kya takleef hai.',
    englishDesc: 'No need to type. Just press the microphone and explain your symptoms naturally in Hindi or English.',
    icon: Mic,
    color: 'from-emerald-500/20 to-teal-500/10',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    iconBg: 'bg-emerald-500 text-white',
    audioText: 'Kadam ek: Bolkar baat karein. Likhne ya type karne ki koi zaroorat nahi. Bas mic dabayein aur apni takleef batayein.',
  },
  {
    step: 2,
    badge: 'Kadam 2 / Step 2',
    title: 'Jaanch & Doctor Parcha 🏥',
    englishTitle: 'Clinical Triage & QR Pass',
    desc: 'AI turant triage rang (Green = Aam, Yellow = Dhyan dein, Red = Tatkal) nirdharit karta hai aur doctor ke liye instant QR Referral Pass banata hai.',
    englishDesc: 'Instant color-coded severity triage with a digital QR Referral Pass that local PHC doctors can scan immediately.',
    icon: QrCode,
    color: 'from-amber-500/20 to-orange-500/10',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-800 dark:text-amber-400',
    iconBg: 'bg-amber-600 text-white',
    audioText: 'Kadam do: Jaanch aur doctor parcha. AI turant gambhirta ki jaanch karta hai aur doctor ke liye QR pass taiyar karta hai.',
  },
  {
    step: 3,
    badge: 'Kadam 3 / Step 3',
    title: 'AYUSH Nuskhe & 108 Madad 🌿',
    englishTitle: 'AYUSH Remedies & Emergency Help',
    desc: 'Sarkari AYUSH pramanit gharelu upchar, dawai lene ki aawazi ghanti, aur aapatkal mein 1-tap 108 ambulance call ki suvidha.',
    englishDesc: 'Verified AYUSH herbal remedies, spoken audio medicine chimes, and instant 1-tap 108 emergency ambulance dialing.',
    icon: Heart,
    color: 'from-rose-500/20 to-pink-500/10',
    borderColor: 'border-rose-500/30',
    textColor: 'text-rose-800 dark:text-rose-400',
    iconBg: 'bg-rose-600 text-white',
    audioText: 'Kadam teen: Ayush nuskhe aur ek sau aath madad. Pramanit gharelu nuskhe aur aapatkal mein turant ambulance call.',
  },
];

export default function OnboardingModal({ isOpen, onClose, onStartChat }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

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
              Sanjeevani Sahayak Margdarshak
            </span>
          </div>
          <button
            type="button"
            onClick={handleComplete}
            aria-label="Band karein (Close)"
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
          <p className="text-xs text-gray-400 dark:text-gray-500 italic max-w-sm">
            {stepData.englishDesc}
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
                <span>Rukiye (Pause Audio)</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>Aawaz mein sunein (Listen Aloud)</span>
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
              <span>Peeche</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              className="touch-target text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline underline-offset-2"
            >
              Chhodein (Skip)
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            className="touch-target px-5 py-2.5 rounded-xl bg-sage hover:bg-sage/90 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>{isLast ? 'Paramarsh Shuru Karein 🙏' : 'Aage (Next)'}</span>
            {isLast ? <CheckCircle2 className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

      </div>
    </div>
  );
}
