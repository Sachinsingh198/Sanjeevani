import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Wind, Volume2, VolumeX, Play, Pause, RotateCcw,
  Sparkles, CheckCircle2, Heart, Leaf, Shield, Award,
  Clock, ArrowLeft, Music, Info, HelpCircle
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
  },
  {
    id: 'box-breathing',
    name: 'Box Breathing (Samavritti)',
    hindiName: 'समवृत्ति (बॉक्स ब्रीदिंग)',
    description: 'Equal 4-part rhythmic breath used by yogis and protectors to enter a state of deep calm under stress.',
    inhaleSec: 4,
    holdInSec: 4,
    exhaleSec: 4,
    holdOutSec: 4,
    benefits: 'Resets the autonomic nervous system and relieves sharp emotional panic.',
  },
  {
    id: 'bhramari',
    name: 'Bhramari (Humming Bee Breath)',
    hindiName: 'भ्रामरी प्राणायाम',
    description: 'Making a gentle humming sound like a bee on exhale produces nitric oxide, soothing the brain immediately.',
    inhaleSec: 4,
    holdInSec: 2,
    exhaleSec: 7,
    holdOutSec: 1,
    benefits: 'Instant release of cerebral tension, high blood pressure, and sleeplessness.',
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
    how: 'Touch tip of index finger with tip of thumb, keep other three fingers straight.',
    benefit: 'Enhances memory, cures insomnia, develops spiritual peace.',
  },
  {
    name: 'Prana Mudra (प्राण मुद्रा)',
    element: 'Vital Life Force',
    how: 'Touch tips of little finger and ring finger to tip of thumb.',
    benefit: 'Energizes whole body, removes fatigue, strengthens eyesight and immunity.',
  },
  {
    name: 'Vayu Mudra (वायु मुद्रा)',
    element: 'Joint & Air Balance',
    how: 'Bend index finger to base of thumb, press gently with thumb.',
    benefit: 'Relieves joint pain, arthritis, gas, and mountain muscle stiffness.',
  },
];

export default function MeditationTeacher() {
  const [selectedPattern, setSelectedPattern] = useState(PRANAYAMA_PATTERNS[0]);
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState('inhale'); // 'inhale' | 'hold-in' | 'exhale' | 'hold-out'
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(selectedPattern.inhaleSec);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);

  // Audio settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceCuesEnabled, setVoiceCuesEnabled] = useState(true);
  const [activeSoundscape, setActiveSoundscape] = useState(null); // 'river' | 'om' | 'bowls' | null

  // Active Guided Meditation Track
  const [activeTrack, setActiveTrack] = useState(null);
  const [trackScriptIndex, setTrackScriptIndex] = useState(0);
  const [isTrackPlaying, setIsTrackPlaying] = useState(false);

  // Streak & Statistics
  const [stats, setStats] = useState(() => {
    try {
      const saved = localStorage.getItem('sanjeevani_meditation_stats');
      return saved ? JSON.parse(saved) : { totalMinutes: 18, sessions: 5, streak: 3 };
    } catch {
      return { totalMinutes: 18, sessions: 5, streak: 3 };
    }
  });

  const timerRef = useRef(null);

  // Handle Breathing Timer Phase Progression
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

        // Phase finished — transition to next phase
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
    toast.success('Pranayama session started. Sit tall and relax.');
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ambientSoundscape.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Guided Track Player Loop
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
        toast.success('Dhyana session concluded with peace 🙏');
      }
    }, 9000);

    return () => clearTimeout(interval);
  }, [isTrackPlaying, activeTrack, trackScriptIndex, voiceCuesEnabled]);

  const getPhaseText = () => {
    if (breathPhase === 'inhale') return { hi: 'श्वास लें', en: 'Inhale Deeply', sub: 'Fill your chest with Himalayan air' };
    if (breathPhase === 'hold-in') return { hi: 'श्वास रोकें', en: 'Hold Calmly', sub: 'Internal tranquility' };
    if (breathPhase === 'exhale') return { hi: 'श्वास छोड़ें', en: 'Exhale Gently', sub: 'Release all tension and worries' };
    return { hi: 'शांत रहें', en: 'Rest in Silence', sub: 'Stillness and awareness' };
  };

  const phaseInfo = getPhaseText();

  // Circle scale animation styling
  const isExpanding = breathPhase === 'inhale';
  const isContracting = breathPhase === 'exhale';

  return (
    <div className="min-h-screen bg-mist text-primary pb-16">
      {/* Top Himalayan Header */}
      <div className="bg-gradient-to-b from-[#5A7855]/15 via-white/80 to-mist border-b border-border-subtle pt-8 pb-10 px-4">
        <div className="max-w-5xl mx-auto">
          <Link
            to="/mitra"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-primary mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Mitra Dashboard
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-sage/10 text-sage px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                <Wind className="w-3.5 h-3.5" /> Himalayan Dhyana Guru
              </div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-primary">
                Dhyan & Pranayama Kendra (ध्यान व प्राणायाम)
              </h1>
              <p className="text-xs md:text-sm text-muted mt-1 max-w-xl leading-relaxed">
                Ancient Vedic breathwork and mindfulness crafted for Himalayan high-altitude vitality, anxiety reduction, and inner stillness.
              </p>
            </div>

            {/* Quick Stats Badge */}
            <div className="bg-card border border-sage/20 rounded-2xl p-3.5 shadow-sm flex items-center gap-4">
              <div className="text-center">
                <p className="text-lg font-bold text-sage">{stats.streak} Days</p>
                <p className="text-[10px] text-muted uppercase font-bold">Mindful Streak</p>
              </div>
              <div className="h-8 w-px bg-border-subtle" />
              <div className="text-center">
                <p className="text-lg font-bold text-gold-warm">{cyclesCompleted}</p>
                <p className="text-[10px] text-muted uppercase font-bold">Rounds Today</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-8 space-y-8">
        {/* ── SECTION 1: INTERACTIVE PRANAYAMA STUDIO ───────────────── */}
        <div className="bg-card rounded-3xl p-6 md:p-8 border border-border-subtle shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-serif text-xl font-bold text-primary flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-gold-warm" />
                Pranayama Breathing Studio (प्राणायाम अभ्यास)
              </h2>
              <p className="text-xs text-muted mt-0.5">Select a breathing rhythm and sync your breath with the expanding mandala.</p>
            </div>

            {/* Controls: Audio, Voice & Bowl */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  soundEnabled ? 'bg-sage/15 text-sage' : 'bg-gray-100 text-muted'
                }`}
                title="Toggle Bell Chimes"
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>Chimes</span>
              </button>

              <button
                onClick={() => setVoiceCuesEnabled(!voiceCuesEnabled)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  voiceCuesEnabled ? 'bg-gold-warm/15 text-gold-warm' : 'bg-gray-100 text-muted'
                }`}
                title="Toggle Spoken Cues"
              >
                <Info className="w-3.5 h-3.5" />
                <span>Voice Guidance</span>
              </button>

              <button
                onClick={() => playSingingBowl(216, 4.5)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-warm-indigo/10 hover:bg-warm-indigo hover:text-white text-primary text-xs font-semibold transition-all"
                title="Ring Tibetan Bowl"
              >
                🔔 Ring Bowl
              </button>
            </div>
          </div>

          {/* Pattern Selector Pills */}
          <div className="flex flex-wrap gap-2 mb-8">
            {PRANAYAMA_PATTERNS.map((p) => {
              const isSelected = selectedPattern.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPattern(p);
                    handleResetBreathing();
                  }}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-sage text-white shadow-sm'
                      : 'bg-mist text-primary hover:bg-black/5 border border-border-subtle'
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>

          {/* Mandala Breathing Visualizer Display */}
          <div className="flex flex-col items-center justify-center py-8 relative overflow-hidden">
            {/* Pulsing ambient background halo */}
            <div
              className={`absolute w-72 h-72 rounded-full transition-all duration-1000 ease-in-out pointer-events-none blur-2xl ${
                breathPhase === 'inhale'
                  ? 'bg-sage/25 scale-125'
                  : breathPhase === 'exhale'
                  ? 'bg-gold-warm/20 scale-75'
                  : 'bg-warm-indigo/15 scale-100'
              }`}
            />

            {/* Central Animated Breathing Orb */}
            <div className="relative flex items-center justify-center w-64 h-64">
              {/* Outer decorative ring */}
              <div
                className={`absolute inset-0 rounded-full border-2 border-dashed border-sage/40 transition-transform duration-1000 ease-in-out ${
                  isExpanding ? 'scale-110 rotate-45' : isContracting ? 'scale-90 rotate-0' : 'scale-100'
                }`}
              />

              {/* Inner glowing core */}
              <div
                className={`w-48 h-48 rounded-full shadow-2xl flex flex-col items-center justify-center text-center p-4 transition-all duration-1000 ease-in-out transform ${
                  breathPhase === 'inhale'
                    ? 'scale-115 bg-gradient-to-tr from-sage via-[#6b8e64] to-sage-light text-white shadow-sage/40'
                    : breathPhase === 'exhale'
                    ? 'scale-85 bg-gradient-to-tr from-gold-warm via-[#e0b268] to-amber-100 text-primary shadow-gold-warm/30'
                    : 'scale-100 bg-gradient-to-tr from-warm-indigo via-[#425a80] to-indigo-200 text-white shadow-warm-indigo/30'
                }`}
              >
                <span className="text-3xl font-extrabold tracking-tight mb-1 font-mono">
                  {phaseSecondsLeft}s
                </span>
                <span className="font-serif text-lg font-bold">
                  {phaseInfo.hi}
                </span>
                <span className="text-[11px] font-sans uppercase tracking-wider opacity-90">
                  {phaseInfo.en}
                </span>
              </div>
            </div>

            {/* Step Explanation */}
            <div className="text-center mt-6">
              <p className="text-sm font-semibold text-primary">{phaseInfo.sub}</p>
              <p className="text-xs text-muted mt-1 max-w-md mx-auto">
                {selectedPattern.description}
              </p>
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-3 mt-6">
              {!isBreathingActive ? (
                <button
                  onClick={handleStartBreathing}
                  className="flex items-center gap-2 bg-sage hover:bg-[#4a6346] text-white font-bold px-6 py-3 rounded-2xl shadow-md transition-all transform hover:-translate-y-0.5 text-sm"
                >
                  <Play className="w-4 h-4 fill-white" /> Start Breathing
                </button>
              ) : (
                <button
                  onClick={handlePauseBreathing}
                  className="flex items-center gap-2 bg-gold-warm hover:bg-[#c29148] text-white font-bold px-6 py-3 rounded-2xl shadow-md transition-all text-sm"
                >
                  <Pause className="w-4 h-4 fill-white" /> Pause
                </button>
              )}

              <button
                onClick={handleResetBreathing}
                className="p-3 rounded-2xl bg-mist hover:bg-black/5 text-muted hover:text-primary transition-all"
                title="Reset Pattern"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── SECTION 2: HIMALAYAN SOUNDSCAPES ───────────────────────── */}
        <div className="bg-card rounded-3xl p-6 border border-border-subtle shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif font-bold text-lg text-primary flex items-center gap-2">
                <Music className="w-5 h-5 text-sage" />
                Himalayan Ambient Soundscapes (शांत प्राकृतिक ध्वनियां)
              </h3>
              <p className="text-xs text-muted">Web Audio generated pure acoustic soundscapes — 100% offline & gentle.</p>
            </div>
            {activeSoundscape && (
              <span className="text-[10px] bg-sage/15 text-sage px-2.5 py-0.5 rounded-full font-bold uppercase animate-pulse">
                Playing Now
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => handleToggleSoundscape('river')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                activeSoundscape === 'river'
                  ? 'bg-sage/10 border-sage shadow-xs'
                  : 'bg-mist border-border-subtle hover:border-sage/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg">🌊</span>
                <span className={`text-[10px] font-bold uppercase ${activeSoundscape === 'river' ? 'text-sage' : 'text-muted'}`}>
                  {activeSoundscape === 'river' ? 'Active' : 'Play'}
                </span>
              </div>
              <h4 className="font-bold text-sm text-primary mt-2">Alaknanda Stream</h4>
              <p className="text-[11px] text-muted mt-0.5">Gentle mountain river white noise for focus.</p>
            </button>

            <button
              onClick={() => handleToggleSoundscape('om')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                activeSoundscape === 'om'
                  ? 'bg-gold-warm/15 border-gold-warm shadow-xs'
                  : 'bg-mist border-border-subtle hover:border-gold-warm/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg">🕉️</span>
                <span className={`text-[10px] font-bold uppercase ${activeSoundscape === 'om' ? 'text-gold-warm' : 'text-muted'}`}>
                  {activeSoundscape === 'om' ? 'Active' : 'Play'}
                </span>
              </div>
              <h4 className="font-bold text-sm text-primary mt-2">136.1Hz Om Drone</h4>
              <p className="text-[11px] text-muted mt-0.5">Vedic cosmic resonance for deep relaxation.</p>
            </button>

            <button
              onClick={() => handleToggleSoundscape('bowls')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                activeSoundscape === 'bowls'
                  ? 'bg-warm-indigo/15 border-warm-indigo shadow-xs'
                  : 'bg-mist border-border-subtle hover:border-warm-indigo/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg">🔔</span>
                <span className={`text-[10px] font-bold uppercase ${activeSoundscape === 'bowls' ? 'text-warm-indigo' : 'text-muted'}`}>
                  {activeSoundscape === 'bowls' ? 'Active' : 'Play'}
                </span>
              </div>
              <h4 className="font-bold text-sm text-primary mt-2">Tibetan Singing Bowls</h4>
              <p className="text-[11px] text-muted mt-0.5">Harmonic bell chimes to quiet wandering thoughts.</p>
            </button>
          </div>
        </div>

        {/* ── SECTION 3: GUIDED DHYANA MEDITATIONS ──────────────────── */}
        <div className="bg-card rounded-3xl p-6 border border-border-subtle shadow-sm space-y-4">
          <div>
            <h3 className="font-serif font-bold text-lg text-primary flex items-center gap-2">
              <Leaf className="w-5 h-5 text-gold-warm" />
              Guided Himalayan Dhyana Tracks (निर्देशित ध्यान)
            </h3>
            <p className="text-xs text-muted">Spoken step-by-step sessions with voice guidance for deep emotional grounding.</p>
          </div>

          <div className="space-y-3">
            {GUIDED_MEDITATIONS.map((med) => {
              const isPlayingThis = isTrackPlaying && activeTrack?.id === med.id;
              return (
                <div
                  key={med.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isPlayingThis ? 'bg-sage/5 border-sage/40' : 'bg-mist border-border-subtle'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase bg-gold-warm/15 text-gold-warm px-2 py-0.5 rounded-md">
                        {med.category}
                      </span>
                      <span className="text-[10px] text-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {med.duration}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-primary mt-1">{med.title}</h4>
                    <p className="text-xs text-muted mt-0.5 leading-relaxed">{med.description}</p>
                    {isPlayingThis && (
                      <p className="text-xs font-semibold text-sage mt-2 italic animate-fadeIn">
                        🗣️ "{med.script[trackScriptIndex]}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
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
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        isPlayingThis
                          ? 'bg-gold-warm text-white'
                          : 'bg-sage hover:bg-[#4a6346] text-white shadow-xs'
                      }`}
                    >
                      {isPlayingThis ? (
                        <>
                          <Pause className="w-3.5 h-3.5" /> Pause Session
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" /> Start Dhyana
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── SECTION 4: HASTA MUDRA GUIDE ───────────────────────────── */}
        <div className="bg-card rounded-3xl p-6 border border-border-subtle shadow-sm space-y-4">
          <div>
            <h3 className="font-serif font-bold text-lg text-primary flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-soft" />
              Hasta Mudras for Seated Meditation (हस्त मुद्रा निर्देश)
            </h3>
            <p className="text-xs text-muted">Hold these hand gestures gently while seated to direct subtle nerve energy.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MUDRAS.map((m, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-mist border border-border-subtle space-y-2">
                <h4 className="font-serif font-bold text-sm text-primary">{m.name}</h4>
                <p className="text-[11px] text-gold-warm font-semibold">{m.element}</p>
                <p className="text-xs text-muted leading-relaxed"><strong className="text-primary">How:</strong> {m.how}</p>
                <p className="text-xs text-sage font-medium"><strong className="text-primary">Benefit:</strong> {m.benefit}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
