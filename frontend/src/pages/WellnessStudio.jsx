import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Sparkles, Wind, Activity, Music, Play, Pause, RotateCcw,
  Volume2, VolumeX, Camera, CameraOff, Flame, Trophy, Clock,
  CheckCircle2, AlertCircle, Heart, Leaf, Shield, Award,
  ChevronRight, RefreshCw, Eye, ArrowRight, Sun, Moon, Mountain
} from 'lucide-react';
import {
  YOGA_ASANAS, evaluatePosture, drawSkeletonOnCanvas, detectPoseFromVideo, POSE_LANDMARKS, resetPoseSmoothing
} from '../lib/poseDetection';
import { initPoseLandmarker } from '../lib/mediapipePoseClient';
import {
  playSingingBowl, playMeditationChime, ambientSoundscape, speakCue
} from '../lib/audioSynthesizer';
import MountainRidge from '../components/MountainRidge';
import toast from 'react-hot-toast';

// ── PRANAYAMA PRESETS ────────────────────────────────────────────────────────
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

// ── GUIDED MEDITATIONS ───────────────────────────────────────────────────────
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
    title: 'Yoga Nidra for Peaceful Sleep (योग निद्रा विश्राम)',
    duration: '8 Min',
    category: 'Rest & Recovery',
    description: 'Deep somatic relaxation of each body part to induce restorative slumber in mountain cold.',
    script: [
      'Shavasana me aaram se let jaiye. Sharir ko bilkul dheela chhod dijiye.',
      'Apne pairon ke angoothe se lekar sir tak har ek ang ko shanti ka sandesh dein.',
      'Saari thakan pighal kar dharti me samahit ho rahi hai.',
      'Shubh ratri... Gehri sukhad neend me vishram karein.',
    ],
  },
];

// ── CURATED WELLNESS JOURNEYS ────────────────────────────────────────────────
const WELLNESS_JOURNEYS = [
  {
    id: 'morning-vitality',
    title: 'Himalayan Morning Vitality (प्रातःकालीन ऊर्जा)',
    duration: '15 Mins',
    icon: Sun,
    badge: 'Best for Morning',
    tag: 'ऊर्जा व प्राण',
    description: 'Awaken your spine, kindle digestive fire, and center your mind for the day ahead in the hills.',
    steps: [
      { type: 'dhyan', targetId: 'anulom-vilom', title: 'Anulom Vilom (3 Mins)' },
      { type: 'yoga', targetId: 'tadasana', title: 'Tadasana Alignment (4 Mins)' },
      { type: 'yoga', targetId: 'vrikshasana', title: 'Vrikshasana Balance (4 Mins)' },
      { type: 'sound', targetId: 'bowls', title: 'Singing Bowl Centering (4 Mins)' },
    ],
  },
  {
    id: 'joint-relief',
    title: 'Mountain Joint & Back Relief (जोड़ों व कमर का सुख)',
    duration: '12 Mins',
    icon: Mountain,
    badge: 'Gentle & Safe',
    tag: 'कमर व घुटने',
    description: 'Special low-impact mobility asanas and warming breathwork designed for rural arthritis & back ache.',
    steps: [
      { type: 'dhyan', targetId: 'sahaj', title: 'Sahaj Flow Breath (3 Mins)' },
      { type: 'yoga', targetId: 'bhadrasana', title: 'Bhadrasana Hip Opening (5 Mins)' },
      { type: 'yoga', targetId: 'tadasana', title: 'Gentle Spine Extension (4 Mins)' },
    ],
  },
  {
    id: 'evening-nidra',
    title: 'Evening Calm & Restful Sleep (संध्या शांति व निद्रा)',
    duration: '14 Mins',
    icon: Moon,
    badge: 'Night Care',
    tag: 'तनाव मुक्ति',
    description: 'Release physical fatigue from climbing steep village paths and soothe runaway thoughts.',
    steps: [
      { type: 'dhyan', targetId: 'bhramari', title: 'Bhramari Humming Breath (4 Mins)' },
      { type: 'dhyan', targetId: 'relax-478', title: '4-7-8 Sleep Pacing (4 Mins)' },
      { type: 'sound', targetId: 'river', title: 'Alaknanda Stream Soundscape (6 Mins)' },
    ],
  },
];

export default function WellnessStudio({ defaultTab = 'flow' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Tab State: 'flow' | 'yoga' | 'dhyan' | 'sound'
  const initialTab = searchParams.get('tab') || defaultTab || 'flow';
  const [activeTab, setActiveTab] = useState(
    ['flow', 'yoga', 'dhyan', 'sound'].includes(initialTab) ? initialTab : 'flow'
  );

  // Sync tab with URL parameter changes
  useEffect(() => {
    const tabParam = searchParams.get('tab') || defaultTab;
    if (tabParam && ['flow', 'yoga', 'dhyan', 'sound'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams, defaultTab]);

  // Sync tab with URL
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  // ── UNIFIED WELLNESS STATS ─────────────────────────────────────────────────
  const [wellnessStats, setWellnessStats] = useState(() => {
    try {
      const saved = localStorage.getItem('sanjeevani_wellness_stats');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      mindfulMinutesToday: 8,
      asanasCompletedToday: 2,
      breathCyclesToday: 24,
      streakDays: 4,
    };
  });

  const saveStats = (updated) => {
    setWellnessStats(updated);
    try {
      localStorage.setItem('sanjeevani_wellness_stats', JSON.stringify(updated));
    } catch {}
  };

  // ── AMBIENT SOUNDTRACK ENGINE ──────────────────────────────────────────────
  const [ambientTrack, setAmbientTrack] = useState('off'); // 'off' | 'river' | 'om' | 'bowls'
  const [voiceCuesEnabled, setVoiceCuesEnabled] = useState(true);

  const toggleAmbientSound = (track) => {
    if (ambientTrack === track) {
      ambientSoundscape.stop();
      setAmbientTrack('off');
      toast('Ambient sound stopped', { icon: '🔇' });
    } else {
      ambientSoundscape.start(track);
      setAmbientTrack(track);
      toast(`Playing Himalayan ${track === 'river' ? 'Alaknanda River' : track === 'om' ? '136.1Hz Om Drone' : 'Singing Bowls'}`, { icon: '🎶' });
    }
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      ambientSoundscape.stop();
    };
  }, []);

  // ── YOGA SUB-STUDIO STATE ──────────────────────────────────────────────────
  const [selectedAsana, setSelectedAsana] = useState(YOGA_ASANAS[0]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isSimulatedMode, setIsSimulatedMode] = useState(false);
  const [poseModelLoading, setPoseModelLoading] = useState(false);
  const [poseInitTimeout, setPoseInitTimeout] = useState(false);
  const [isHoldingPose, setIsHoldingPose] = useState(false);
  const [holdTimerSec, setHoldTimerSec] = useState(selectedAsana.targetHoldsSec);
  const [alignmentScore, setAlignmentScore] = useState(0);
  const [postureChecks, setPostureChecks] = useState([]);
  const [feedbackMessage, setFeedbackMessage] = useState('Camera ke samne pura sharir dikhayein taaki mudra ki jaanch ho sake.');
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const holdIntervalRef = useRef(null);
  const currentScoreRef = useRef(0);
  const poseTimeoutTimerRef = useRef(null);

  const startCamera = async () => {
    try {
      setIsSimulatedMode(false);
      setPoseModelLoading(true);
      setPoseInitTimeout(false);
      resetPoseSmoothing();

      if (poseTimeoutTimerRef.current) clearTimeout(poseTimeoutTimerRef.current);
      poseTimeoutTimerRef.current = setTimeout(() => {
        setPoseInitTimeout(true);
      }, 20000);

      // Launch MediaPipe pose initialization in parallel
      const modelPromise = initPoseLandmarker().catch((err) => {
        console.warn('Pose model preload warning in WellnessStudio:', err);
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);

      // Settle model initialization
      await modelPromise;
      if (poseTimeoutTimerRef.current) clearTimeout(poseTimeoutTimerRef.current);
      setPoseInitTimeout(false);
      setPoseModelLoading(false);

      toast.success('Camera connected! Stand back to fit your full body.');
      playSingingBowl(216, 2.5);
      if (voiceCuesEnabled) speakCue('Camera chalu ho gaya hai. Kripya thoda peeche hokar mudra shuru karein.', 'hi-IN');
    } catch (err) {
      if (poseTimeoutTimerRef.current) clearTimeout(poseTimeoutTimerRef.current);
      setPoseInitTimeout(false);
      setPoseModelLoading(false);
      console.warn('Camera access error:', err);
      toast.error('Camera access nahi mila. Practice Simulation Mode shuru kiya gaya.');
      startSimulationMode();
    }
  };

  const stopCamera = () => {
    if (poseTimeoutTimerRef.current) clearTimeout(poseTimeoutTimerRef.current);
    setPoseInitTimeout(false);
    resetPoseSmoothing();
    setPoseModelLoading(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsSimulatedMode(false);
    setIsHoldingPose(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const startSimulationMode = () => {
    stopCamera();
    setIsSimulatedMode(true);
    setIsCameraActive(true);
    toast('Practice Mode Active (Simulated joint geometry).', { icon: '🧘' });
    if (voiceCuesEnabled) speakCue('Abhyas mode chalu hua. Mudra ka santulan dekhein.', 'hi-IN');
  };

  // Generate simulated landmarks for demo when camera is off
  const generateSimulatedLandmarks = (asanaId, tick) => {
    const wobble = Math.sin(tick / 15) * 0.015;
    let leftKneeY = 0.72 + wobble;
    let rightKneeY = 0.72 - wobble;
    let leftAnkleX = 0.45;
    let rightAnkleX = 0.55;
    let leftWristX = 0.35;
    let rightWristX = 0.65;
    let leftWristY = 0.22 + wobble;
    let rightWristY = 0.22 - wobble;

    if (asanaId === 'vrikshasana') {
      rightKneeY = 0.58;
      rightAnkleX = 0.48;
    } else if (asanaId === 'bhadrasana') {
      leftKneeY = 0.65;
      rightKneeY = 0.65;
    }

    return [
      { x: 0.5, y: 0.15, visibility: 0.95 },   // 0: NOSE
      { x: 0.52, y: 0.14, visibility: 0.9 },   // 1
      { x: 0.53, y: 0.14, visibility: 0.9 },   // 2: LEFT_EYE
      { x: 0.54, y: 0.14, visibility: 0.9 },   // 3
      { x: 0.48, y: 0.14, visibility: 0.9 },   // 4
      { x: 0.47, y: 0.14, visibility: 0.9 },   // 5: RIGHT_EYE
      { x: 0.46, y: 0.14, visibility: 0.9 },   // 6
      { x: 0.56, y: 0.16, visibility: 0.8 },   // 7
      { x: 0.44, y: 0.16, visibility: 0.8 },   // 8
      { x: 0.52, y: 0.18, visibility: 0.9 },   // 9
      { x: 0.48, y: 0.18, visibility: 0.9 },   // 10
      { x: 0.42, y: 0.25, visibility: 0.95 },  // 11: LEFT_SHOULDER
      { x: 0.58, y: 0.25, visibility: 0.95 },  // 12: RIGHT_SHOULDER
      { x: 0.38, y: 0.23, visibility: 0.9 },   // 13: LEFT_ELBOW
      { x: 0.62, y: 0.23, visibility: 0.9 },   // 14: RIGHT_ELBOW
      { x: leftWristX, y: leftWristY, visibility: 0.9 },   // 15: LEFT_WRIST
      { x: rightWristX, y: rightWristY, visibility: 0.9 }, // 16: RIGHT_WRIST
      { x: 0.34, y: 0.12, visibility: 0.7 },   // 17
      { x: 0.66, y: 0.12, visibility: 0.7 },   // 18
      { x: 0.34, y: 0.13, visibility: 0.7 },   // 19
      { x: 0.66, y: 0.13, visibility: 0.7 },   // 20
      { x: 0.35, y: 0.14, visibility: 0.7 },   // 21
      { x: 0.65, y: 0.14, visibility: 0.7 },   // 22
      { x: 0.45, y: 0.5, visibility: 0.95 },   // 23: LEFT_HIP
      { x: 0.55, y: 0.5, visibility: 0.95 },   // 24: RIGHT_HIP
      { x: 0.45, y: leftKneeY, visibility: 0.95 },  // 25: LEFT_KNEE
      { x: 0.55, y: rightKneeY, visibility: 0.95 }, // 26: RIGHT_KNEE
      { x: leftAnkleX, y: 0.9, visibility: 0.95 },  // 27: LEFT_ANKLE
      { x: rightAnkleX, y: 0.9, visibility: 0.95 }, // 28: RIGHT_ANKLE
      { x: 0.45, y: 0.94, visibility: 0.8 },
      { x: 0.55, y: 0.94, visibility: 0.8 },
      { x: 0.47, y: 0.95, visibility: 0.8 },
      { x: 0.53, y: 0.95, visibility: 0.8 },
    ];
  };

  // Video pose processing loop
  useEffect(() => {
    let tick = 0;
    const processFrame = () => {
      tick++;
      let landmarks = null;

      if (isSimulatedMode) {
        landmarks = generateSimulatedLandmarks(selectedAsana.id, tick);
      } else if (!poseModelLoading && isCameraActive && videoRef.current && videoRef.current.readyState >= 2) {
        landmarks = detectPoseFromVideo(videoRef.current, selectedAsana.id);
      }

      if (canvasRef.current) {
        const assessment = evaluatePosture(landmarks, selectedAsana.id);
        setAlignmentScore(assessment.score);
        setPostureChecks(assessment.checks);
        currentScoreRef.current = assessment.score;

        if (assessment.score >= 80) {
          setFeedbackMessage(assessment.isReady ? 'उत्तम! मुद्रा बिल्कुल सही है। सांस पर ध्यान केंद्रित रखें।' : (assessment.feedbackText || 'मुद्रा सही है।'));
        } else {
          setFeedbackMessage(assessment.feedbackText || 'कैमरे के सामने पूरे शरीर के साथ खड़े रहें।');
        }

        drawSkeletonOnCanvas(canvasRef.current, landmarks, assessment.checks);
      }

      if (isCameraActive) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
      }
    };

    if (isCameraActive) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isCameraActive, isSimulatedMode, selectedAsana, poseModelLoading]);

  // Hold Timer logic
  useEffect(() => {
    if (isHoldingPose) {
      holdIntervalRef.current = setInterval(() => {
        setHoldTimerSec((prev) => {
          if (prev <= 1) {
            clearInterval(holdIntervalRef.current);
            setIsHoldingPose(false);
            playMeditationChime('start');
            setShowCompletionModal(true);
            saveStats({
              ...wellnessStats,
              mindfulMinutesToday: wellnessStats.mindfulMinutesToday + Math.round(selectedAsana.targetHoldsSec / 60),
              asanasCompletedToday: wellnessStats.asanasCompletedToday + 1,
            });
            if (voiceCuesEnabled) speakCue(`Badhaai ho! Aapne ${selectedAsana.name} poori safalta se samapan kiya.`, 'hi-IN');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    }

    return () => {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, [isHoldingPose, selectedAsana]);

  // ── DHYAN & PRANAYAMA SUB-STUDIO STATE ─────────────────────────────────────
  const [selectedPranayama, setSelectedPranayama] = useState(PRANAYAMA_PATTERNS[0]);
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState('idle'); // 'inhale' | 'hold-in' | 'exhale' | 'hold-out'
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(0);
  const [breathCyclesDone, setBreathCyclesDone] = useState(0);

  // Guided Meditation state
  const [activeMeditation, setActiveMeditation] = useState(null);
  const [meditationStepIndex, setMeditationStepIndex] = useState(0);
  const [isMeditationPlaying, setIsMeditationPlaying] = useState(false);

  // Breathing interval engine
  useEffect(() => {
    let breathTimer = null;
    if (isBreathingActive) {
      const p = selectedPranayama;
      const sequence = [
        { phase: 'inhale', dur: p.inhaleSec, text: 'श्वास लें (Inhale)' },
        { phase: 'hold-in', dur: p.holdInSec, text: 'रोकें (Hold)' },
        { phase: 'exhale', dur: p.exhaleSec, text: 'श्वास छोड़ें (Exhale)' },
        { phase: 'hold-out', dur: p.holdOutSec, text: 'विश्राम (Hold)' },
      ].filter((s) => s.dur > 0);

      let currentSeqIdx = 0;
      setBreathPhase(sequence[0].phase);
      setPhaseSecondsLeft(sequence[0].dur);
      playMeditationChime(sequence[0].phase);

      breathTimer = setInterval(() => {
        setPhaseSecondsLeft((prev) => {
          if (prev <= 1) {
            currentSeqIdx = (currentSeqIdx + 1) % sequence.length;
            const nextStep = sequence[currentSeqIdx];
            setBreathPhase(nextStep.phase);
            playMeditationChime(nextStep.phase);

            if (currentSeqIdx === 0) {
              setBreathCyclesDone((c) => c + 1);
              saveStats({
                ...wellnessStats,
                breathCyclesToday: wellnessStats.breathCyclesToday + 1,
                mindfulMinutesToday: wellnessStats.mindfulMinutesToday + 1,
              });
            }
            return nextStep.dur;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setBreathPhase('idle');
      setPhaseSecondsLeft(0);
    }

    return () => {
      if (breathTimer) clearInterval(breathTimer);
    };
  }, [isBreathingActive, selectedPranayama]);

  // Guided meditation speech narration
  useEffect(() => {
    let narrationTimeout = null;
    if (isMeditationPlaying && activeMeditation) {
      const currentText = activeMeditation.script[meditationStepIndex];
      speakCue(currentText, 'hi-IN');

      narrationTimeout = setTimeout(() => {
        if (meditationStepIndex < activeMeditation.script.length - 1) {
          setMeditationStepIndex((prev) => prev + 1);
        } else {
          setIsMeditationPlaying(false);
          playSingingBowl(216, 5);
          toast.success('Dhyan abhyas safal raha! Shanti me vishram karein.');
        }
      }, 18000); // 18 seconds per script line for unhurried Pahadi presence
    }

    return () => {
      if (narrationTimeout) clearTimeout(narrationTimeout);
    };
  }, [isMeditationPlaying, meditationStepIndex, activeMeditation]);

  const startMeditation = (med) => {
    setActiveMeditation(med);
    setMeditationStepIndex(0);
    setIsMeditationPlaying(true);
    playSingingBowl(216, 3.5);
  };

  return (
    <div className="min-h-screen bg-mist text-primary transition-colors duration-300 relative pb-24">
      {/* Background Mountain Contours */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none opacity-25 dark:opacity-10 z-0">
        <MountainRidge tone="pine" className="w-full h-44 object-cover" />
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 relative z-10 space-y-6">

        {/* ── TOP HERO HEADER & VITALITY RING BAR ────────────────────── */}
        <div className="bg-white/95 dark:bg-card backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-sage/20 dark:border-gray-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sage/15 text-sage dark:text-booti-glow">
                Sanjeevani Wellness Studio
              </span>
              <span className="text-[10px] text-gray-500 flex items-center gap-1 font-medium">
                <Mountain className="w-3 h-3 text-gold-warm" /> Chamoli Hill Sanctuary
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-primary">
              आरोग्यशाला (Himalayan Wellness Studio)
            </h1>
            <p className="text-xs sm:text-sm text-muted dark:text-muted mt-0.5">
              Vedic Yoga Posture AI, Ancient Pranayama, Guided Meditations, and Sound Healing.
            </p>
          </div>

          {/* Unified Daily Vitality Badges */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Mindful Minutes */}
            <div className="bg-mist dark:bg-card border border-sage/25 rounded-xl sm:rounded-2xl px-3 py-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-sage dark:text-booti-glow" />
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block leading-none">Mindful</span>
                <span className="text-xs sm:text-sm font-bold text-primary">
                  {wellnessStats.mindfulMinutesToday} Mins
                </span>
              </div>
            </div>

            {/* Asanas Done */}
            <div className="bg-mist dark:bg-card border border-gold-warm/30 rounded-xl sm:rounded-2xl px-3 py-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-gold-warm dark:text-gold-warm" />
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block leading-none">Asanas</span>
                <span className="text-xs sm:text-sm font-bold text-primary">
                  {wellnessStats.asanasCompletedToday} Held
                </span>
              </div>
            </div>

            {/* Daily Streak */}
            <div className="bg-mist dark:bg-card border border-orange-500/30 rounded-xl sm:rounded-2xl px-3 py-2 flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block leading-none">Streak</span>
                <span className="text-xs sm:text-sm font-bold text-primary">
                  {wellnessStats.streakDays} Days 🔥
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── PERSISTENT AMBIENT SOUND HEALING BAR ───────────────────── */}
        <div className="bg-gradient-to-r from-sage/10 via-[#D4A359]/10 to-sage/10 dark:from-sage/20 dark:via-card dark:to-sage/20 border border-sage/30 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-2 shrink-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${ambientTrack !== 'off' ? 'bg-sage text-white animate-pulse' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>
              <Music className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-sage dark:text-booti-glow block leading-none">
                Himalayan Soundscape
              </span>
              <span className="text-xs font-bold text-primary">
                {ambientTrack === 'river' ? 'Alaknanda Stream (Pink Noise)' : ambientTrack === 'om' ? '136.1Hz Cosmic Om Drone' : ambientTrack === 'bowls' ? 'Tibetan Singing Bowls Loop' : 'Pahadi Sound Off'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => toggleAmbientSound('river')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${ambientTrack === 'river' ? 'bg-sage text-white shadow-xs' : 'bg-white dark:bg-warm-indigo text-gray-700 dark:text-gray-300 hover:bg-sage/10'}`}
            >
              🌊 River Stream
            </button>
            <button
              onClick={() => toggleAmbientSound('om')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${ambientTrack === 'om' ? 'bg-gold-warm text-primary shadow-xs' : 'bg-white dark:bg-warm-indigo text-gray-700 dark:text-gray-300 hover:bg-gold-warm/10'}`}
            >
              🕉️ Om 136Hz
            </button>
            <button
              onClick={() => toggleAmbientSound('bowls')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${ambientTrack === 'bowls' ? 'bg-sage text-white shadow-xs' : 'bg-white dark:bg-warm-indigo text-gray-700 dark:text-gray-300 hover:bg-sage/10'}`}
            >
              🥣 Singing Bowls
            </button>
            {ambientTrack !== 'off' && (
              <button
                onClick={() => toggleAmbientSound(ambientTrack)}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl"
                title="Mute Soundscape"
              >
                <VolumeX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── STUDIO 4-PILLAR NAVIGATION TABS ───────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-card dark:bg-card p-1.5 rounded-2xl border border-gray-200 dark:border-gray-800 backdrop-blur-md">
          <button
            onClick={() => handleTabChange('flow')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'flow'
                ? 'bg-sage text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-4 h-4 text-gold-warm" />
            <span>दैनिक यात्रा (Flows)</span>
          </button>

          <button
            onClick={() => handleTabChange('yoga')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'yoga'
                ? 'bg-sage text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>योगाभ्यास (Posture AI)</span>
          </button>

          <button
            onClick={() => handleTabChange('dhyan')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'dhyan'
                ? 'bg-sage text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Wind className="w-4 h-4 text-booti-glow" />
            <span>प्राणायाम (Breathing)</span>
          </button>

          <button
            onClick={() => handleTabChange('sound')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'sound'
                ? 'bg-sage text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Music className="w-4 h-4 text-gold-warm" />
            <span>ध्वनि चिकित्सा (Sound)</span>
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            TAB 1: CURATED WELLNESS JOURNEYS (DAILY FLOW)
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'flow' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {WELLNESS_JOURNEYS.map((journey) => {
                const Icon = journey.icon;
                return (
                  <div
                    key={journey.id}
                    className="bg-white dark:bg-warm-indigo border border-gray-200 dark:border-gray-800 rounded-3xl p-5 flex flex-col justify-between shadow-xs hover:border-sage transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-sage/15 text-sage dark:text-booti-glow px-2.5 py-1 rounded-full">
                          {journey.badge}
                        </span>
                        <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {journey.duration}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-gold-warm/20 text-gold-warm dark:text-gold-warm flex items-center justify-center">
                          <Icon className="w-5 h-5" />
                        </div>
                        <h3 className="font-serif font-bold text-base text-primary">
                          {journey.title}
                        </h3>
                      </div>

                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                        {journey.description}
                      </p>

                      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">3-Part Himalayan Protocol:</span>
                        {journey.steps.map((st, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-primary dark:text-muted">
                            <span className="w-4 h-4 rounded-full bg-sage/20 text-sage text-[10px] font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span>{st.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const firstStep = journey.steps[0];
                        handleTabChange(firstStep.type);
                        toast.success(`Starting ${journey.title}!`);
                      }}
                      className="mt-5 w-full bg-sage hover:bg-sage/90 text-white py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>यह अभ्यास शुरू करें</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Ayurvedic Dinacharya Principles Note */}
            <div className="bg-gold-warm/10 border border-gold-warm/30 rounded-2xl p-4 flex items-start gap-3">
              <Leaf className="w-5 h-5 text-gold-warm dark:text-gold-warm shrink-0 mt-0.5" />
              <div className="text-xs text-primary">
                <strong className="font-bold text-gold-warm dark:text-gold-warm block mb-1">
                  Vedic Dinacharya (दैनिक दिनचर्या का नियम):
                </strong>
                प्रातःकाल सूर्योदय के समय खुली हवा में 15 मिनट प्राणायाम और योगाभ्यास करने से फेफड़ों की कार्यक्षमता बढ़ती है और पहाड़ी ठंड में वात-दोष संतुलित रहता है।
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 2: YOGASHALA (POSTURE CAMERA AI & ASANAS)
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'yoga' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Asana Selection Carousel / List */}
              <div className="lg:col-span-4 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
                  Select Asana (मुद्रा चुनें):
                </span>
                <div className="space-y-2">
                  {YOGA_ASANAS.map((asana) => {
                    const isSelected = selectedAsana.id === asana.id;
                    return (
                      <div
                        key={asana.id}
                        onClick={() => {
                          setSelectedAsana(asana);
                          setHoldTimerSec(asana.targetHoldsSec);
                          setIsHoldingPose(false);
                          if (voiceCuesEnabled) speakCue(`${asana.name}. ${asana.benefits || asana.keyFocus}`, 'hi-IN');
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-sage text-white border-sage shadow-xs'
                            : 'bg-white dark:bg-warm-indigo border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 hover:border-sage/50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-serif font-bold text-sm">{asana.name}</h4>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-sans font-bold uppercase ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                              {asana.difficulty}
                            </span>
                          </div>
                          <p className={`text-xs mt-0.5 line-clamp-1 ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                            {asana.benefits || asana.keyFocus}
                          </p>
                        </div>
                        <span className={`text-xs font-bold shrink-0 ml-2 ${isSelected ? 'text-white' : 'text-sage'}`}>
                          {asana.targetHoldsSec}s
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Target Joint Alignment & Key Focus Info */}
                <div className="bg-white dark:bg-warm-indigo border border-gray-200 dark:border-gray-800 rounded-2xl p-4 text-xs space-y-2.5">
                  <div>
                    <strong className="font-bold text-gray-700 dark:text-gray-300 block mb-0.5">
                      Key Alignment Focus (मुख्य संरेखण):
                    </strong>
                    <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed">
                      {selectedAsana.keyFocus}
                    </p>
                  </div>

                  <div>
                    <strong className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                      Step-by-Step Method (अभ्यास विधि):
                    </strong>
                    <ul className="space-y-1 text-gray-500 dark:text-gray-400">
                      {(selectedAsana.steps || []).map((step, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-sage mt-1 shrink-0" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {selectedAsana.precautions && (
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gold-warm dark:text-gold-warm">
                      ⚠️ <strong>सावधानी (Precautions):</strong> {selectedAsana.precautions}
                    </div>
                  )}
                </div>
              </div>

              {/* Live Camera & Skeleton Viewport */}
              <div className="lg:col-span-8 space-y-4">
                <div className="relative aspect-4/3 w-full bg-black rounded-3xl overflow-hidden border-2 border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-center">
                  
                  {/* Real Video Stream */}
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] ${isCameraActive && !isSimulatedMode ? 'opacity-100' : 'opacity-0'}`}
                  />

                  {/* Real-time Skeleton Overlay Canvas */}
                  <canvas
                    ref={canvasRef}
                    width={640}
                    height={480}
                    className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] pointer-events-none z-10 ${isCameraActive ? 'opacity-100' : 'opacity-0'}`}
                  />

                  {/* MediaPipe Pose Model Loading State Overlay */}
                  {poseModelLoading && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center text-white">
                      <div className="w-12 h-12 border-3 border-sage border-t-transparent rounded-full animate-spin mb-4" />
                      <h4 className="font-bold text-sm text-white font-serif">
                        {poseInitTimeout ? 'Model load hone mein samay lag raha hai' : 'AI model load ho raha hai... 10-15 second lagenge'}
                      </h4>
                      <p className="text-xs text-white/70 mt-1 max-w-xs">
                        {poseInitTimeout
                          ? 'Skeletal tracking model initialize hone mein 20 second se zyada samay laga. Network slow ho sakta hai.'
                          : 'Real-time skeletal tracking model initialize ho raha hai. Kripya prateeksha karein.'}
                      </p>
                      {poseInitTimeout && (
                        <div className="mt-4 flex flex-col sm:flex-row items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              stopCamera();
                              setTimeout(() => startCamera(), 100);
                            }}
                            className="px-4 py-2 bg-sage hover:bg-sage/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Retry Model (पुनः प्रयास)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              stopCamera();
                              startSimulationMode();
                            }}
                            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Practice Mode (अभ्यास मोड)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Standby Camera Placard */}
                  {!isCameraActive && (
                    <div className="text-center p-6 space-y-3 z-10">
                      <div className="w-16 h-16 rounded-3xl bg-white/10 mx-auto flex items-center justify-center text-white/70">
                        <Camera className="w-8 h-8" />
                      </div>
                      <h4 className="text-white font-serif font-bold text-lg">AI Posture Camera</h4>
                      <p className="text-xs text-white/60 max-w-sm mx-auto">
                        Turn on your camera to check joint angles in real time, or test in simulated practice mode.
                      </p>
                      <div className="flex items-center justify-center gap-3 pt-2">
                        <button
                          onClick={startCamera}
                          className="bg-sage hover:bg-sage/90 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md"
                        >
                          <Camera className="w-4 h-4" /> Start Camera
                        </button>
                        <button
                          onClick={startSimulationMode}
                          className="bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" /> Practice Mode
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Live Alignment HUD Header */}
                  {isCameraActive && (
                    <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
                      <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl text-white flex items-center gap-2 border border-white/10">
                        <span className={`w-2 h-2 rounded-full ${alignmentScore >= 80 ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                        <span className="text-xs font-bold">Accuracy: {alignmentScore}%</span>
                      </div>

                      <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl text-white flex items-center gap-2 border border-white/10">
                        <Clock className="w-3.5 h-3.5 text-gold-warm" />
                        <span className="text-xs font-bold">Hold: {holdTimerSec}s</span>
                      </div>
                    </div>
                  )}

                  {/* Floating Live Guidance Feedback */}
                  {isCameraActive && (
                    <div className="absolute bottom-3 left-3 right-3 z-20 bg-black/80 backdrop-blur-md p-3 rounded-2xl border border-white/15 text-white flex items-center justify-between gap-3">
                      <div className="text-xs">
                        <span className="text-[10px] text-emerald-400 font-bold uppercase block">AI Instructor Feedback:</span>
                        <span className="leading-snug">{feedbackMessage}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isHoldingPose ? (
                          <button
                            onClick={() => {
                              setIsHoldingPose(true);
                              playSingingBowl(216, 2);
                            }}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                          >
                            Start Hold
                          </button>
                        ) : (
                          <button
                            onClick={() => setIsHoldingPose(false)}
                            className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                          >
                            Pause
                          </button>
                        )}
                        <button
                          onClick={stopCamera}
                          className="bg-red-500/80 hover:bg-red-600 text-white p-1.5 rounded-xl cursor-pointer"
                          title="Stop Camera"
                        >
                          <CameraOff className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Joint Status Pill Chips */}
                {isCameraActive && postureChecks.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {postureChecks.map((chk, i) => (
                      <div
                        key={i}
                        className={`text-xs px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                          chk.passed
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {chk.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        <span>{chk.name}: <strong>{chk.current}</strong></span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 3: DHYAN GURU (BREATHING ORB & GUIDED MEDITATIONS)
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'dhyan' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Pranayama Technique Selector */}
              <div className="lg:col-span-4 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
                  Select Pranayama (प्राणायाम चुनें):
                </span>
                <div className="space-y-2">
                  {PRANAYAMA_PATTERNS.map((p) => {
                    const isSelected = selectedPranayama.id === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPranayama(p);
                          setIsBreathingActive(false);
                          if (voiceCuesEnabled) speakCue(p.audioIntro, 'hi-IN');
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sage text-white border-sage shadow-xs'
                            : 'bg-white dark:bg-warm-indigo border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 hover:border-sage/50'
                        }`}
                      >
                        <h4 className="font-serif font-bold text-sm">{p.name}</h4>
                        <span className={`text-[11px] block mt-0.5 ${isSelected ? 'text-white/80' : 'text-gold-warm dark:text-gold-warm'}`}>
                          {p.hindiName}
                        </span>
                        <p className={`text-xs mt-1 line-clamp-2 ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                          {p.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Breathing Visualizer Orb */}
              <div className="lg:col-span-8 bg-white dark:bg-warm-indigo border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-xs relative overflow-hidden min-h-[420px]">
                
                {/* Breathing Visualizer Orb */}
                <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center mb-6">
                  {/* Expanding / Contracting Aura Circles */}
                  <div
                    className={`absolute inset-0 rounded-full transition-all duration-1000 ${
                      breathPhase === 'inhale'
                        ? 'scale-125 bg-emerald-400/20'
                        : breathPhase === 'hold-in' || breathPhase === 'hold-out'
                        ? 'scale-115 bg-amber-400/20 animate-pulse'
                        : breathPhase === 'exhale'
                        ? 'scale-90 bg-indigo-400/20'
                        : 'scale-100 bg-sage/15'
                    }`}
                  />
                  <div
                    className={`w-40 h-40 sm:w-48 sm:h-48 rounded-full shadow-lg flex flex-col items-center justify-center transition-all duration-1000 z-10 ${
                      breathPhase === 'inhale'
                        ? 'scale-110 bg-gradient-to-tr from-sage to-emerald-400 text-white'
                        : breathPhase === 'hold-in'
                        ? 'scale-105 bg-gradient-to-tr from-gold-warm to-amber-400 text-primary'
                        : breathPhase === 'exhale'
                        ? 'scale-85 bg-gradient-to-tr from-[#1E2A43] to-indigo-600 text-white'
                        : 'scale-100 bg-gradient-to-tr from-sage to-[#7A9A75] text-white'
                    }`}
                  >
                    <span className="text-[11px] uppercase tracking-wider font-bold opacity-80">
                      {breathPhase === 'inhale' ? 'Inhale (श्वास लें)' : breathPhase === 'hold-in' ? 'Hold (रोकें)' : breathPhase === 'exhale' ? 'Exhale (छोड़ें)' : breathPhase === 'hold-out' ? 'Rest (विश्राम)' : 'तैयार रहें'}
                    </span>
                    <span className="text-4xl font-serif font-extrabold my-1">
                      {isBreathingActive ? `${phaseSecondsLeft}s` : 'ॐ'}
                    </span>
                    <span className="text-[10px] font-bold opacity-75">
                      Cycle: {breathCyclesDone}
                    </span>
                  </div>
                </div>

                {/* Breathing Action Controls */}
                <div className="flex items-center gap-3">
                  {!isBreathingActive ? (
                    <button
                      onClick={() => {
                        setIsBreathingActive(true);
                        playSingingBowl(216, 2.5);
                      }}
                      className="bg-sage hover:bg-sage/90 text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 cursor-pointer shadow-md"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>प्राणायाम शुरू करें (Start Breathwork)</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsBreathingActive(false)}
                      className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 cursor-pointer shadow-md"
                    >
                      <Pause className="w-4 h-4 fill-current" />
                      <span>विश्राम दें (Pause)</span>
                    </button>
                  )}
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 max-w-md">
                  💡 {selectedPranayama.benefits}
                </p>
              </div>
            </div>

            {/* Guided Himalayan Audio Meditations */}
            <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-800">
              <h3 className="font-serif font-bold text-base text-primary">
                Guided Himalayan Peace Meditations (पर्वतीय शांत ध्यान)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {GUIDED_MEDITATIONS.map((med) => {
                  const isCurrent = activeMeditation?.id === med.id && isMeditationPlaying;
                  return (
                    <div
                      key={med.id}
                      className="bg-white dark:bg-warm-indigo border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col justify-between shadow-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                          <span className="font-bold uppercase tracking-wider text-[10px] text-sage">{med.category}</span>
                          <span>{med.duration}</span>
                        </div>
                        <h4 className="font-serif font-bold text-sm text-primary">{med.title}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{med.description}</p>
                      </div>

                      <button
                        onClick={() => startMeditation(med)}
                        className={`mt-4 w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-amber-500 text-white animate-pulse'
                            : 'bg-sage/15 text-sage dark:text-booti-glow hover:bg-sage hover:text-white'
                        }`}
                      >
                        {isCurrent ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        <span>{isCurrent ? 'Playing Audio...' : 'Listen Guide'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 4: SOUND HEALING & TIBETAN BOWLS (NAAD SHANTI)
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'sound' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-warm-indigo border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xs">
              <div className="max-w-xl mx-auto text-center space-y-3">
                <div className="w-14 h-14 rounded-3xl bg-gold-warm/20 text-gold-warm dark:text-gold-warm mx-auto flex items-center justify-center">
                  <Music className="w-7 h-7" />
                </div>
                <h3 className="font-serif font-bold text-xl text-primary">
                  Vedic Sound Sanctuary (नाद ब्रह्म चिकित्सा)
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  Pure acoustic harmonic frequencies generated directly in your browser. Proven to lower cortisol, steady the respiratory sinus arrhythmia, and induce alpha brainwaves.
                </p>
              </div>

              {/* Sound Generators Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                
                {/* 1. Tibetan Singing Bowl */}
                <div className="bg-mist dark:bg-card border border-gray-200 dark:border-gray-800 rounded-2xl p-4 text-center space-y-3">
                  <span className="text-3xl block">🥣</span>
                  <div>
                    <h4 className="font-serif font-bold text-sm text-primary">Tibetan Singing Bowl</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">216Hz Anahata heart frequency with warm acoustic overtones.</p>
                  </div>
                  <button
                    onClick={() => playSingingBowl(216, 5.0)}
                    className="w-full bg-sage text-white py-2 rounded-xl text-xs font-bold hover:bg-sage/90 cursor-pointer"
                  >
                    Strike Bowl (घंटी बजाएं)
                  </button>
                </div>

                {/* 2. Cosmic Om Drone */}
                <div className="bg-mist dark:bg-card border border-gray-200 dark:border-gray-800 rounded-2xl p-4 text-center space-y-3">
                  <span className="text-3xl block">🕉️</span>
                  <div>
                    <h4 className="font-serif font-bold text-sm text-primary">136.1Hz Cosmic Om</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">Sanskrit planetary tuning frequency for somatic grounding.</p>
                  </div>
                  <button
                    onClick={() => toggleAmbientSound('om')}
                    className={`w-full py-2 rounded-xl text-xs font-bold cursor-pointer ${ambientTrack === 'om' ? 'bg-red-500 text-white' : 'bg-gold-warm text-primary'}`}
                  >
                    {ambientTrack === 'om' ? 'Stop Drone' : 'Continuous Om'}
                  </button>
                </div>

                {/* 3. Alaknanda Stream */}
                <div className="bg-mist dark:bg-card border border-gray-200 dark:border-gray-800 rounded-2xl p-4 text-center space-y-3">
                  <span className="text-3xl block">🌊</span>
                  <div>
                    <h4 className="font-serif font-bold text-sm text-primary">Alaknanda Mountain Stream</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">Natural low-pass filtered alpine water sounds for sleep.</p>
                  </div>
                  <button
                    onClick={() => toggleAmbientSound('river')}
                    className={`w-full py-2 rounded-xl text-xs font-bold cursor-pointer ${ambientTrack === 'river' ? 'bg-red-500 text-white' : 'bg-sage text-white'}`}
                  >
                    {ambientTrack === 'river' ? 'Stop Stream' : 'Stream Sound'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-warm-indigo border border-sage/30 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-xl text-primary">
                अभ्यास पूर्ण हुआ!
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                You successfully held <strong>{selectedAsana.name}</strong> for {selectedAsana.targetHoldsSec} seconds.
              </p>
            </div>
            <button
              onClick={() => setShowCompletionModal(false)}
              className="w-full bg-sage text-white py-2.5 rounded-xl font-bold text-xs cursor-pointer shadow-md"
            >
              धन्यवाद (Continue)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
