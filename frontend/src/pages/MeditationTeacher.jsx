import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Wind, Volume2, VolumeX, Play, Pause, RotateCcw,
  Sparkles, Heart, Leaf, Shield, Award,
  Clock, ArrowLeft, Music, Info, Waves, HandMetal
} from 'lucide-react';
import {
  playSingingBowl, playMeditationChime, ambientSoundscape, speakCue
} from '../lib/audioSynthesizer';
import toast from 'react-hot-toast';

const PRANAYAMA_PATTERNS = [
  {
    id: 'anulom-vilom',
    name: 'Anulom Vilom (Nadi Shodhana)',
    hindiName: 'अनुलोम-विलोम प्राणायाम',
    description: 'Balances nervous system hemispheres, purifies subtle energy nadis, and clears mental fog.',
    inhaleSec: 4,
    holdInSec: 4,
    exhaleSec: 4,
    holdOutSec: 2,
    benefits: 'Calms anxiety, steadies heartbeat, relieves altitude headaches.',
    audioIntro: 'Anulom Vilom sharir aur mastishk ko shant karne ke liye sabse uttam pranayama hai.',
  },
  {
    id: 'box-breathing',
    name: 'Box Breathing (Samavritti)',
    hindiName: 'समवृत्ति (बॉक्स ब्रीदिंग)',
    description: 'Equal 4-part rhythmic breath used by yogis to enter a state of deep calm under stress.',
    inhaleSec: 4,
    holdInSec: 4,
    exhaleSec: 4,
    holdOutSec: 4,
    benefits: 'Resets the autonomic nervous system and relieves sharp emotional panic.',
    audioIntro: 'Samavritti pranayama tanaav ko turant door karta hai.',
  },
  {
    id: 'bhramari',
    name: 'Bhramari (Humming Bee Breath)',
    hindiName: 'भ्रामरी प्राणायाम',
    description: 'Gentle humming sound like a bee on exhale produces nitric oxide, soothing the brain immediately.',
    inhaleSec: 4,
    holdInSec: 2,
    exhaleSec: 7,
    holdOutSec: 1,
    benefits: 'Instant release of cerebral tension, high blood pressure, and sleeplessness.',
    audioIntro: 'Bhramari me saans chhodte samay bhawre jaisi gungunahat karein.',
  },
  {
    id: 'relax-478',
    name: '4-7-8 Deep Sleep Breathing',
    hindiName: '४-७-८ सुखद निद्रा श्वास',
    description: 'Scientifically proven sedative breath pattern to calm runaway thoughts and drift into peaceful sleep.',
    inhaleSec: 4,
    holdInSec: 7,
    exhaleSec: 8,
    holdOutSec: 1,
    benefits: 'Natural tranquilizer for anxious thoughts and insomnia.',
    audioIntro: 'Chaar saat aath vidhi gehri sukhad neend ke liye anukool hai.',
  },
  {
    id: 'sahaj',
    name: 'Sahaj Dhyan (Natural Flow)',
    hindiName: 'सहज ध्यान (प्राकृतिक श्वास)',
    description: 'Gentle, natural wave of breath that requires no force. Perfect for beginners and elderly folks.',
    inhaleSec: 5,
    holdInSec: 0,
    exhaleSec: 5,
    holdOutSec: 0,
    benefits: 'Deep physical relaxation without breath retention effort.',
    audioIntro: 'Sahaj dhyan bina kisi dabav ke prakritik saans lene ka saral abhyas hai.',
  },
];

const GUIDED_MEDITATIONS = [
  {
    id: 'himalayan-silence',
    title: 'Himalayan Mountain Silence (पर्वत शांति ध्यान)',
    duration: '5 Min',
    category: 'Stillness',
    description: 'Visualize yourself seated near the snowy peaks of Chamoli, grounded like the mighty mountain.',
    script: [
      'Aankhein band kijiye... Apni reedh ki haddi ko seedha rakhein.',
      'Sochiye aap Himalaya ke ek shaant aangan me baithe hain, jahan thandi shuddh hawa chal rahi hai.',
      'Pahaad hamesha sthir rehta hai — chahe aandhi aaye ya toofan. Aap bhi is pahaad ki tarah sthir hain.',
      'Apne har saans ke sath saari chintaon ko pahaadi nadi me behne dijiye. Aap bilkul shaant hain.',
    ],
  },
  {
    id: 'anxiety-relief',
    title: 'Anxiety & Worry Release (चिंता मुक्ति ध्यान)',
    duration: '6 Min',
    category: 'Emotional Peace',
    description: 'Gently disarm worries about the future, family, or health through compassionate presence.',
    script: [
      'Dhyan ko apni chhati ke beech, hriday sthan par layein.',
      'Ek gehri lambi saans lein... aur sochiye ki aap surakshit hain.',
      'Jo baatein aapke bas me nahi hain, unhe eeshwar ke haath me chhod dijiye.',
      'Har ek pal naya jeevan leke aata hai. Aapka mann ab phool ki tarah halka ho raha hai.',
    ],
  },
  {
    id: 'deep-sleep',
    title: 'Nidra Dhyan (गहरी सुखद नींद का ध्यान)',
    duration: '7 Min',
    category: 'Rest & Recovery',
    description: 'Release daily muscle tension from head to toe for deeply refreshing restorative sleep.',
    script: [
      'Aaram se let ya baith jaiye. Apne shareer ko poora dheela chhod dijiye.',
      'Apne maathe, aakhein aur jabde ko shaant kijiye.',
      'Kandhon par se saare din ka bojh utaar dijiye.',
      'Shaant... bilkul shaant... Sukhad neend aapka aalingan kar rahi hai.',
    ],
  },
];

const MUDRAS = [
  {
    name: 'Gyan Mudra (ज्ञान मुद्रा)',
    element: 'Air & Consciousness',
    icon: '👌',
    how: 'Touch tip of index finger with tip of thumb, keep other three fingers straight.',
    benefit: 'Enhances memory, cures insomnia, develops spiritual peace.',
    audio: 'Gyan mudra me anguthe aur pehli ungli ke sire ko milayein.',
  },
  {
    name: 'Prana Mudra (प्राण मुद्रा)',
    element: 'Vital Life Force',
    icon: '✌️',
    how: 'Touch tips of little finger and ring finger to tip of thumb.',
    benefit: 'Energizes whole body, removes fatigue, strengthens eyesight and immunity.',
    audio: 'Prana mudra me choti aur anamik ungli ko anguthe se milayein.',
  },
  {
    name: 'Vayu Mudra (वायु मुद्रा)',
    element: 'Joint & Air Balance',
    icon: '🤞',
    how: 'Bend index finger to base of thumb, press gently with thumb.',
    benefit: 'Relieves joint pain, arthritis, gas, and mountain muscle stiffness.',
    audio: 'Vayu mudra gathiya aur jod ke dard me laabhdayak hai.',
  },
];

export default function MeditationTeacher() {
  const [activeTab, setActiveTab] = useState('pranayama'); // 'pranayama' | 'soundscapes' | 'guided' | 'mudras'
  const [selectedPattern, setSelectedPattern] = useState(PRANAYAMA_PATTERNS[0]);
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState('inhale');
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(selectedPattern.inhaleSec);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);

  // Audio settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceCuesEnabled, setVoiceCuesEnabled] = useState(true);
  const [activeSoundscape, setActiveSoundscape] = useState(null);

  // Active Guided Track
  const [activeTrack, setActiveTrack] = useState(null);
  const [trackScriptIndex, setTrackScriptIndex] = useState(0);
  const [isTrackPlaying, setIsTrackPlaying] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    if (!isBreathingActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setPhaseSecondsLeft((prev) => {
        if (prev > 1) {
          return prev - 1;
        }

        let nextPhase = 'inhale';
        let nextDuration = selectedPattern.inhaleSec;

        if (breathPhase === 'inhale') {
          if (selectedPattern.holdInSec > 0) {
            nextPhase = 'hold-in';
            nextDuration = selectedPattern.holdInSec;
            if (soundEnabled) playMeditationChime('hold');
            if (voiceCuesEnabled) speakCue('Saans rokein... Hold', 'hi-IN');
          } else {
            nextPhase = 'exhale';
            nextDuration = selectedPattern.exhaleSec;
            if (soundEnabled) playMeditationChime('exhale');
            if (voiceCuesEnabled) speakCue('Dheere dheere saans chhodein... Exhale', 'hi-IN');
          }
        } else if (breathPhase === 'hold-in') {
          nextPhase = 'exhale';
          nextDuration = selectedPattern.exhaleSec;
          if (soundEnabled) playMeditationChime('exhale');
          if (voiceCuesEnabled) speakCue('Saans chhodein... Exhale', 'hi-IN');
        } else if (breathPhase === 'exhale') {
          if (selectedPattern.holdOutSec > 0) {
            nextPhase = 'hold-out';
            nextDuration = selectedPattern.holdOutSec;
            if (soundEnabled) playMeditationChime('hold');
            if (voiceCuesEnabled) speakCue('Shaant rahein... Rest', 'hi-IN');
          } else {
            nextPhase = 'inhale';
            nextDuration = selectedPattern.inhaleSec;
            setCyclesCompleted((c) => c + 1);
            if (soundEnabled) playMeditationChime('inhale');
            if (voiceCuesEnabled) speakCue('Gehri saans lijiye... Inhale', 'hi-IN');
          }
        } else if (breathPhase === 'hold-out') {
          nextPhase = 'inhale';
          nextDuration = selectedPattern.inhaleSec;
          setCyclesCompleted((c) => c + 1);
          if (soundEnabled) playMeditationChime('inhale');
          if (voiceCuesEnabled) speakCue('Gehri saans lijiye... Inhale', 'hi-IN');
        }

        setBreathPhase(nextPhase);
        return nextDuration;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isBreathingActive, breathPhase, selectedPattern, soundEnabled, voiceCuesEnabled]);

  const handleStartBreathing = () => {
    setIsBreathingActive(true);
    setBreathPhase('inhale');
    setPhaseSecondsLeft(selectedPattern.inhaleSec);
    if (soundEnabled) playSingingBowl(216, 4.0);
    if (voiceCuesEnabled) speakCue('Gehri saans lijiye... Inhale', 'hi-IN');
    toast.success('Pranayama shuru hua. Shanti se baithein 🙏');
  };

  const handlePauseBreathing = () => {
    setIsBreathingActive(false);
  };

  const handleResetBreathing = () => {
    setIsBreathingActive(false);
    setBreathPhase('inhale');
    setPhaseSecondsLeft(selectedPattern.inhaleSec);
    setCyclesCompleted(0);
  };

  const handleToggleSoundscape = (name) => {
    if (activeSoundscape === name) {
      ambientSoundscape.stop();
      setActiveSoundscape(null);
    } else {
      ambientSoundscape.start(name);
      setActiveSoundscape(name);
      toast.success(`Himalayan ${name} soundscape active 🌿`);
    }
  };

  useEffect(() => {
    return () => {
      ambientSoundscape.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isTrackPlaying || !activeTrack) return;

    const currentScript = activeTrack.script[trackScriptIndex];
    if (currentScript && voiceCuesEnabled) {
      speakCue(currentScript, 'hi-IN');
    }

    const interval = setTimeout(() => {
      if (trackScriptIndex < activeTrack.script.length - 1) {
        setTrackScriptIndex((prev) => prev + 1);
      } else {
        setIsTrackPlaying(false);
        setTrackScriptIndex(0);
        playSingingBowl(216, 5.0);
        toast.success('Dhyana session sampanna hua 🙏');
      }
    }, 9000);

    return () => clearTimeout(interval);
  }, [isTrackPlaying, activeTrack, trackScriptIndex, voiceCuesEnabled]);

  const getPhaseText = () => {
    if (breathPhase === 'inhale') return { hi: 'श्वास लें (Inhale)', en: 'Inhale Deeply', sub: 'Himalayi shuddh hawa se chhati bharein' };
    if (breathPhase === 'hold-in') return { hi: 'श्वास रोकें (Hold)', en: 'Hold Calmly', sub: 'Aantrik sthirta aur shanti' };
    if (breathPhase === 'exhale') return { hi: 'श्वास छोड़ें (Exhale)', en: 'Exhale Gently', sub: 'Saari chinta aur tanaav bahar nikaalein' };
    return { hi: 'शांत रहें (Rest)', en: 'Rest in Silence', sub: 'Keval shant upasthiti' };
  };

  const phaseInfo = getPhaseText();
  const isExpanding = breathPhase === 'inhale';
  const isContracting = breathPhase === 'exhale';

  const meditationTabs = [
    { id: 'pranayama', label: 'प्राणायाम', sub: 'Breathing', icon: Wind },
    { id: 'soundscapes', label: 'प्राकृतिक ध्वनियां', sub: 'Sounds', icon: Waves },
    { id: 'guided', label: 'कथा ध्यान', sub: 'Guided', icon: Sparkles },
    { id: 'mudras', label: 'हस्त मुद्राएं', sub: 'Mudras', icon: HandMetal },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6F0] dark:bg-[#151D28] text-[#2E4057] dark:text-[#F4F6F0] pb-20 transition-colors duration-300">
      
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-[#5A7855]/15 via-white/80 dark:via-[#1E2A43]/80 to-[#F4F6F0] dark:to-[#151D28] border-b border-gray-200/80 dark:border-gray-800 pt-6 pb-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <Link
            to="/patient"
            className="touch-target inline-flex items-center gap-2 text-xs font-semibold text-[#556376] dark:text-[#A8B4C2] hover:text-[#2E4057] dark:hover:text-[#F4F6F0] mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Mitra Hub Par Wapas</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#5A7855]/10 dark:bg-[#5A7855]/25 text-[#5A7855] dark:text-[#8ED14C] px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                <Wind className="w-3.5 h-3.5 text-[#D4A359]" />
                <span>Himalayan Dhyana Guru • ध्यान व प्राणायाम</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2E4057] dark:text-[#F4F6F0]">
                Dhyan & Pranayama Studio
              </h1>
            </div>

            {/* Quick Cycles Badge */}
            <div className="bg-white dark:bg-[#1E2A43] border border-[#5A7855]/20 dark:border-gray-800 rounded-2xl px-4 py-2.5 shadow-xs flex items-center gap-4 self-start sm:self-center">
              <div>
                <p className="text-lg font-bold text-[#5A7855] dark:text-[#8ED14C] leading-none">{cyclesCompleted}</p>
                <p className="text-[10px] text-[#556376] dark:text-[#A8B4C2] uppercase font-bold mt-0.5">Aavartan Aaj</p>
              </div>
              <button
                onClick={() => playSingingBowl(216, 4.5)}
                className="touch-target px-3 py-1.5 rounded-xl bg-[#D4A359]/15 text-[#8C5E24] dark:text-[#D4A359] text-xs font-bold hover:bg-[#D4A359]/25 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Ring Tibetan Bowl"
              >
                <span>🔔 Bowl</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-3 sm:px-6 mt-6 space-y-6">

        {/* ── FOCUSED 4-TAB NAVIGATION (PAGE-INSIDE-PAGE) ───────────── */}
        <div className="bg-white dark:bg-[#1E2A43] rounded-3xl p-2 border border-[#5A7855]/20 dark:border-gray-800 shadow-xs flex items-center justify-between gap-1 overflow-x-auto">
          {meditationTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  speakCue(`${tab.label} khula`, 'hi-IN');
                }}
                className={`touch-target flex-1 min-w-[70px] sm:min-w-[90px] py-2.5 px-2 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#5A7855] text-white shadow-sm scale-102 font-bold'
                    : 'text-[#556376] dark:text-[#A8B4C2] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs font-bold leading-tight truncate">{tab.label}</span>
                <span className={`text-[10px] hidden sm:block leading-none mt-0.5 ${isActive ? 'text-white/80' : 'opacity-70'}`}>
                  {tab.sub}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: PRANAYAMA STUDIO (BREATHING MANDALA) ───────────── */}
        {activeTab === 'pranayama' && (
          <div className="bg-white dark:bg-[#1E2A43] rounded-3xl p-6 sm:p-8 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-6 animate-fadeIn">
            
            {/* Pattern Selection Pills */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#556376] dark:text-[#A8B4C2]">
                  Pranayama Vidhi Chuniye:
                </span>
                <button
                  onClick={() => speakCue(selectedPattern.audioIntro || selectedPattern.name, 'hi-IN')}
                  className="touch-target inline-flex items-center gap-1 text-xs font-bold text-[#5A7855] dark:text-[#8ED14C] hover:underline"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Vidhi Sunein</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {PRANAYAMA_PATTERNS.map((p) => {
                  const isSelected = selectedPattern.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPattern(p);
                        handleResetBreathing();
                        speakCue(`${p.hindiName} chuna gaya`, 'hi-IN');
                      }}
                      className={`touch-target p-3 rounded-2xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'bg-[#5A7855] text-white shadow-xs scale-102'
                          : 'bg-[#F4F6F0]/80 dark:bg-[#182332] text-[#2E4057] dark:text-[#F4F6F0] border border-gray-200 dark:border-gray-700 hover:border-[#5A7855]/40'
                      }`}
                    >
                      <span className="truncate w-full">{p.hindiName.split(' ')[0]}</span>
                      <span className={`text-[10px] font-normal truncate w-full ${isSelected ? 'text-white/80' : 'text-[#556376] dark:text-[#A8B4C2]'}`}>
                        {p.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mandala Visualizer */}
            <div className="flex flex-col items-center justify-center py-6 relative overflow-hidden">
              <div
                className={`absolute w-64 h-64 rounded-full transition-all duration-1000 ease-in-out pointer-events-none blur-2xl ${
                  breathPhase === 'inhale'
                    ? 'bg-[#5A7855]/25 scale-125'
                    : breathPhase === 'exhale'
                    ? 'bg-[#D4A359]/20 scale-75'
                    : 'bg-[#2E4057]/15 scale-100'
                }`}
              />

              <div className="relative flex items-center justify-center w-60 h-60">
                <div
                  className={`absolute inset-0 rounded-full border-2 border-dashed border-[#5A7855]/40 transition-transform duration-1000 ease-in-out ${
                    isExpanding ? 'scale-110 rotate-45' : isContracting ? 'scale-90 rotate-0' : 'scale-100'
                  }`}
                />

                <div
                  className={`w-44 h-44 rounded-full shadow-xl flex flex-col items-center justify-center text-center p-4 transition-all duration-1000 ease-in-out transform ${
                    breathPhase === 'inhale'
                      ? 'scale-110 bg-gradient-to-tr from-[#5A7855] to-[#8ED14C] text-white shadow-[#5A7855]/40'
                      : breathPhase === 'exhale'
                      ? 'scale-85 bg-gradient-to-tr from-[#D4A359] to-[#F4F6F0] text-[#2E4057] shadow-[#D4A359]/30'
                      : 'scale-100 bg-gradient-to-tr from-[#2E4057] to-[#5A7855] text-white shadow-[#2E4057]/30'
                  }`}
                >
                  <span className="text-3xl font-extrabold tracking-tight mb-1 font-mono">
                    {phaseSecondsLeft}s
                  </span>
                  <span className="font-serif text-sm font-bold">
                    {phaseInfo.hi}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider opacity-90 mt-0.5">
                    {phaseInfo.en}
                  </span>
                </div>
              </div>

              {/* Explanatory subtext */}
              <div className="text-center mt-4">
                <p className="text-xs sm:text-sm font-bold text-[#2E4057] dark:text-[#F4F6F0]">{phaseInfo.sub}</p>
                <p className="text-xs text-[#556376] dark:text-[#A8B4C2] mt-0.5 max-w-sm mx-auto">
                  {selectedPattern.benefits}
                </p>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-3 mt-6">
                {!isBreathingActive ? (
                  <button
                    onClick={handleStartBreathing}
                    className="touch-target-lg flex items-center gap-2.5 bg-[#5A7855] hover:bg-[#4a6346] text-white font-bold px-8 py-4 rounded-2xl shadow-md shadow-[#5A7855]/25 transition-all text-sm sm:text-base cursor-pointer"
                  >
                    <Play className="w-5 h-5 fill-white" />
                    <span>Dhyan Shuru Karein (Start)</span>
                  </button>
                ) : (
                  <button
                    onClick={handlePauseBreathing}
                    className="touch-target-lg flex items-center gap-2.5 bg-[#D4A359] hover:bg-[#c29148] text-[#2E4057] font-bold px-8 py-4 rounded-2xl shadow-md transition-all text-sm sm:text-base cursor-pointer"
                  >
                    <Pause className="w-5 h-5 fill-[#2E4057]" />
                    <span>Viraam (Pause)</span>
                  </button>
                )}

                <button
                  onClick={handleResetBreathing}
                  className="touch-target p-3.5 rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-[#556376] dark:text-[#A8B4C2] transition-all cursor-pointer"
                  title="Reset Pattern"
                  aria-label="Reset Pattern"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: AMBIENT SOUNDSCAPES (ध्वनियां) ────────────────── */}
        {activeTab === 'soundscapes' && (
          <div className="bg-white dark:bg-[#1E2A43] rounded-3xl p-6 sm:p-8 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-5 animate-fadeIn">
            <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
              <h3 className="font-serif font-bold text-lg sm:text-xl text-[#2E4057] dark:text-[#F4F6F0] flex items-center gap-2">
                <Music className="w-5 h-5 text-[#5A7855]" />
                Himalayan Pure Soundscapes (शांत प्राकृतिक ध्वनियां)
              </h3>
              <p className="text-xs text-[#556376] dark:text-[#A8B4C2] mt-0.5">
                Bina internet ke Web Audio dwara sthir dhyan dhwaniyan
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => handleToggleSoundscape('river')}
                className={`touch-target p-5 rounded-3xl border text-left transition-all cursor-pointer ${
                  activeSoundscape === 'river'
                    ? 'bg-[#5A7855]/15 border-[#5A7855] shadow-xs'
                    : 'bg-[#F4F6F0]/60 dark:bg-[#182332] border-gray-200 dark:border-gray-700 hover:border-[#5A7855]/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">🌊</span>
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                    activeSoundscape === 'river' ? 'bg-[#5A7855] text-white' : 'bg-gray-200 dark:bg-gray-700 text-[#556376]'
                  }`}>
                    {activeSoundscape === 'river' ? 'Baj Raha Hai' : 'Bajayein'}
                  </span>
                </div>
                <h4 className="font-bold text-base text-[#2E4057] dark:text-[#F4F6F0] mt-3">Alaknanda Nadi</h4>
                <p className="text-xs text-[#556376] dark:text-[#A8B4C2] mt-0.5">Pahadi nadi ka shaant bahav.</p>
              </button>

              <button
                onClick={() => handleToggleSoundscape('om')}
                className={`touch-target p-5 rounded-3xl border text-left transition-all cursor-pointer ${
                  activeSoundscape === 'om'
                    ? 'bg-[#D4A359]/20 border-[#D4A359] shadow-xs'
                    : 'bg-[#F4F6F0]/60 dark:bg-[#182332] border-gray-200 dark:border-gray-700 hover:border-[#D4A359]/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">🕉️</span>
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                    activeSoundscape === 'om' ? 'bg-[#D4A359] text-[#2E4057]' : 'bg-gray-200 dark:bg-gray-700 text-[#556376]'
                  }`}>
                    {activeSoundscape === 'om' ? 'Baj Raha Hai' : 'Bajayein'}
                  </span>
                </div>
                <h4 className="font-bold text-base text-[#2E4057] dark:text-[#F4F6F0] mt-3">136.1Hz Om Drone</h4>
                <p className="text-xs text-[#556376] dark:text-[#A8B4C2] mt-0.5">Aatmik shanti aur naad dhyan.</p>
              </button>

              <button
                onClick={() => handleToggleSoundscape('bowls')}
                className={`touch-target p-5 rounded-3xl border text-left transition-all cursor-pointer ${
                  activeSoundscape === 'bowls'
                    ? 'bg-[#2E4057]/20 border-[#2E4057] shadow-xs'
                    : 'bg-[#F4F6F0]/60 dark:bg-[#182332] border-gray-200 dark:border-gray-700 hover:border-[#2E4057]/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">🔔</span>
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                    activeSoundscape === 'bowls' ? 'bg-[#2E4057] text-white' : 'bg-gray-200 dark:bg-gray-700 text-[#556376]'
                  }`}>
                    {activeSoundscape === 'bowls' ? 'Baj Raha Hai' : 'Bajayein'}
                  </span>
                </div>
                <h4 className="font-bold text-base text-[#2E4057] dark:text-[#F4F6F0] mt-3">Tibetan Bowls</h4>
                <p className="text-xs text-[#556376] dark:text-[#A8B4C2] mt-0.5">Vichaaron ko sthir karne wali jhankaar.</p>
              </button>
            </div>
          </div>
        )}

        {/* ── TAB 3: GUIDED DHYAN (कथा ध्यान) ────────────────────── */}
        {activeTab === 'guided' && (
          <div className="bg-white dark:bg-[#1E2A43] rounded-3xl p-6 sm:p-8 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4 animate-fadeIn">
            <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
              <h3 className="font-serif font-bold text-lg sm:text-xl text-[#2E4057] dark:text-[#F4F6F0] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#D4A359]" />
                Guided Himalayan Dhyana Tracks (निर्देशित ध्यान)
              </h3>
              <p className="text-xs text-[#556376] dark:text-[#A8B4C2] mt-0.5">
                Aawaz dwara margdarshit dhyan katha jo dil ki chintaon ko door kare
              </p>
            </div>

            <div className="space-y-3">
              {GUIDED_MEDITATIONS.map((med) => {
                const isPlayingThis = isTrackPlaying && activeTrack?.id === med.id;
                return (
                  <div
                    key={med.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isPlayingThis ? 'bg-[#5A7855]/10 border-[#5A7855]/50' : 'bg-[#F4F6F0]/60 dark:bg-[#182332] border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase bg-[#D4A359]/20 text-[#8C5E24] dark:text-[#D4A359] px-2.5 py-0.5 rounded-md">
                          {med.category}
                        </span>
                        <span className="text-xs text-[#556376] dark:text-[#A8B4C2] flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {med.duration}
                        </span>
                      </div>
                      <h4 className="font-serif font-bold text-base text-[#2E4057] dark:text-[#F4F6F0] mt-1.5">{med.title}</h4>
                      <p className="text-xs text-[#556376] dark:text-[#A8B4C2] mt-0.5">{med.description}</p>
                      {isPlayingThis && (
                        <p className="text-xs font-semibold text-[#5A7855] dark:text-[#8ED14C] mt-2 italic animate-fadeIn bg-white/80 dark:bg-[#1E2A43]/80 p-3 rounded-xl border border-[#5A7855]/20">
                          🗣️ "{med.script[trackScriptIndex]}"
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        if (isPlayingThis) {
                          setIsTrackPlaying(false);
                        } else {
                          setActiveTrack(med);
                          setTrackScriptIndex(0);
                          setIsTrackPlaying(true);
                          playSingingBowl(216, 4.0);
                        }
                      }}
                      className={`touch-target flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        isPlayingThis
                          ? 'bg-[#D4A359] text-[#2E4057]'
                          : 'bg-[#5A7855] hover:bg-[#4a6346] text-white shadow-xs'
                      }`}
                    >
                      {isPlayingThis ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                      <span>{isPlayingThis ? 'Viraam (Pause)' : 'Suniye (Play)'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB 4: HASTA MUDRAS (हस्त मुद्राएं) ────────────────── */}
        {activeTab === 'mudras' && (
          <div className="bg-white dark:bg-[#1E2A43] rounded-3xl p-6 sm:p-8 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4 animate-fadeIn">
            <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
              <h3 className="font-serif font-bold text-lg sm:text-xl text-[#2E4057] dark:text-[#F4F6F0] flex items-center gap-2">
                <Heart className="w-5 h-5 text-[#B85042]" />
                Hasta Mudras for Seated Meditation (हस्त मुद्रा निर्देश)
              </h3>
              <p className="text-xs text-[#556376] dark:text-[#A8B4C2] mt-0.5">
                Baithte samay haathon ki ye mudraayein urja ka sanchar karti hain
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {MUDRAS.map((m, idx) => (
                <div key={idx} className="p-5 rounded-3xl bg-[#F4F6F0]/60 dark:bg-[#182332] border border-gray-200 dark:border-gray-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{m.icon}</span>
                    <button
                      onClick={() => speakCue(`${m.name}. ${m.audio || m.how}`, 'hi-IN')}
                      className="touch-target p-1 text-[#5A7855]"
                      title="Audio sunein"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="font-serif font-bold text-base text-[#2E4057] dark:text-[#F4F6F0]">{m.name}</h4>
                  <p className="text-xs text-[#8C5E24] dark:text-[#D4A359] font-semibold">{m.element}</p>
                  <p className="text-xs text-[#556376] dark:text-[#A8B4C2] leading-relaxed"><strong>Vidhi:</strong> {m.how}</p>
                  <p className="text-xs text-[#5A7855] dark:text-[#8ED14C] font-semibold"><strong>Laabh:</strong> {m.benefit}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
