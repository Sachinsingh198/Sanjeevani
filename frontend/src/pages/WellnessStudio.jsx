import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles, Wind, Activity, Music, Play, Pause, RotateCcw,
  Volume2, VolumeX, Camera, CameraOff, Flame, Trophy, Clock,
  CheckCircle2, AlertCircle, Heart, Leaf, Shield, Award,
  ChevronRight, RefreshCw, Eye, ArrowRight, Sun, Moon, Mountain,
  Droplet, Coffee, Compass, Check, Sliders, Bell, ArrowLeft
} from 'lucide-react';
import {
  YOGA_ASANAS, evaluatePosture, drawSkeletonOnCanvas, detectPoseFromVideo, POSE_LANDMARKS, resetPoseSmoothing
} from '../lib/poseDetection';
import { initPoseLandmarker } from '../lib/mediapipePoseClient';
import {
  playSingingBowl, playTempleBell, playMeditationChime, playWaterDrop, playHapticPulse,
  ambientSoundscape, speakCue
} from '../lib/audioSynthesizer';
import MountainRidge from '../components/MountainRidge';
import PageVoiceGuide from '../components/PageVoiceGuide';
import BackButton from '../components/BackButton';
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

// ── TRI-DOSHA QUESTIONS ──────────────────────────────────────────────────────
const DOSHA_QUESTIONS = [
  {
    id: 'energy',
    question: 'How does your daily energy feel? (आपकी शारीरिक ऊर्जा कैसी रहती है?)',
    options: [
      { label: 'Fast, variable, gets tired quickly (चंचल, जल्दी थकने वाली)', dosha: 'vata' },
      { label: 'Intense, strong, goal-oriented (तीव्र, केंद्रित और उत्साही)', dosha: 'pitta' },
      { label: 'Calm, steady, slow to start (धीमी, स्थिर और टिकाऊ)', dosha: 'kapha' },
    ],
  },
  {
    id: 'digestion',
    question: 'How is your appetite & digestion? (आपकी भूख और पाचन क्रिया कैसी है?)',
    options: [
      { label: 'Irregular, prone to gas/bloating (अनियमित, गैस की समस्या)', dosha: 'vata' },
      { label: 'Strong, irritable if meals delayed (तीव्र भूख, पित्त/एसिडिटी)', dosha: 'pitta' },
      { label: 'Slow, feels heavy after food (धीमी, भारीपन महसूस होना)', dosha: 'kapha' },
    ],
  },
  {
    id: 'mind',
    question: 'How is your mind & sleep rhythm? (मन की स्थिति और नींद कैसी है?)',
    options: [
      { label: 'Overthinking, light/broken sleep (ज्यादा सोचना, कच्ची नींद)', dosha: 'vata' },
      { label: 'Sharp mind, intense/vivid dreams (सक्रिय बुद्धि, गहरी पर छोटी नींद)', dosha: 'pitta' },
      { label: 'Peaceful, heavy, loves long sleep (गहरी नींद, सुबह उठने में आलस्य)', dosha: 'kapha' },
    ],
  },
  {
    id: 'climate',
    question: 'What mountain weather suits your body best? (आपको कैसा मौसम अनुकूल लगता है?)',
    options: [
      { label: 'Craves warmth & sun, sensitive to cold wind (धूप व गर्माहट पसंद)', dosha: 'vata' },
      { label: 'Craves cool breeze, easily feels overheated (ठंडी हवा व छांव पसंद)', dosha: 'pitta' },
      { label: 'Craves dry warmth, dislikes damp chilly fog (सूखा व गर्म मौसम पसंद)', dosha: 'kapha' },
    ],
  },
];

// ── HIMALAYAN MARMA POINTS ───────────────────────────────────────────────────
const MARMA_POINTS = [
  {
    id: 'adhipati',
    name: 'Adhipati Marma (अधिपति मर्म)',
    location: 'Crown of Head (सिर का शीर्ष)',
    category: 'Cerebral Calm & Insomnia',
    instruction: 'Place your palm on the crown. Apply gentle circular pressure with your middle three fingers.',
    benefits: 'Calms sensory overload, relieves mountain headaches, and induces deep alpha brainwave stillness.',
    idealHoldSec: 30,
  },
  {
    id: 'kshipra',
    name: 'Kshipra Marma (क्षिप्र मर्म)',
    location: 'Hand Web (अंगूठे व तर्जनी के मध्य)',
    category: 'Rapid Tension & Joint Relief',
    instruction: 'Pinch the webbing between thumb and index finger firmly with the opposite thumb.',
    benefits: 'Releases shoulder tension, reduces altitude nausea, and relieves acute neck stiffness.',
    idealHoldSec: 30,
  },
  {
    id: 'hridaya',
    name: 'Hridaya Marma (हृदय मर्म)',
    location: 'Center of Sternum (छाती का केंद्र)',
    category: 'Emotional Courage & Anahata',
    instruction: 'Place right palm flat over sternum center. Breathe deeply and tap or apply gentle warmth.',
    benefits: 'Steadies palpitations, dispels grief and loneliness, and opens respiratory breath capacity.',
    idealHoldSec: 30,
  },
  {
    id: 'nabhi',
    name: 'Nabhi Marma (नाभि मर्म)',
    location: 'Navel Center (नाभि केंद्र)',
    category: 'Digestive Fire (Samana Vayu)',
    instruction: 'Lie down gently. Place fingertips around the navel and apply soft rhythmic pulsing.',
    benefits: 'Kindles metabolic agni, reduces stomach cramping, and anchors scattered vitality.',
    idealHoldSec: 30,
  },
  {
    id: 'janu',
    name: 'Janu Marma (जानु मर्म)',
    location: 'Knee Joint Crease (घुटने का जोड़)',
    category: 'Mountain Trail Mobility',
    instruction: 'Cup both palms over the kneecap while seated. Massage clockwise with warm gentle pressure.',
    benefits: 'Essential for Pahadi villagers climbing steep terraced slopes; lubricates synovial fluid.',
    idealHoldSec: 30,
  },
];

// ── ALPINE HERBARIUM & TEAS ──────────────────────────────────────────────────
const HIMALAYAN_HERBS = [
  {
    id: 'tulsi',
    name: 'Himalayan Krishna Tulsi (तुलसी)',
    botanical: 'Ocimum sanctum',
    benefit: 'Powerful adaptogen that lowers cortisol and shields against altitude lung irritation.',
    tag: 'Immunity & Breath',
    flavor: 'Peppery, warm, sacred herbal note',
    recipe: 'Boil 5-6 fresh leaves with crushed ginger and honey for 3 minutes.',
  },
  {
    id: 'buransh',
    name: 'Wild Buransh Petals (बुरांश)',
    botanical: 'Rhododendron arboreum',
    benefit: 'State flower of Uttarakhand. Rich in flavonoids, supports heart health and reduces inflammation.',
    tag: 'Heart & Vitality',
    flavor: 'Tangy, floral, refreshing nectar note',
    recipe: 'Steep dried crimson petals in hot mountain spring water with a hint of rock sugar.',
  },
  {
    id: 'giloy',
    name: 'Pahadi Giloy / Amrita (गिलोय)',
    botanical: 'Tinospora cordifolia',
    benefit: 'The divine nectar vine. Cleanses deep metabolic toxins and strengthens systemic immunity.',
    tag: 'Immunity Shield',
    flavor: 'Deeply bitter, purifying earthy tonic',
    recipe: 'Crush a 2-inch stem and boil down until water reduces to half. Drink warm.',
  },
  {
    id: 'timur',
    name: 'Chamoli Timur Berry (तिम्मूर)',
    botanical: 'Zanthoxylum armatum',
    benefit: 'High-altitude wild prickly ash. Warms peripheral circulation and relieves joint stiffness.',
    tag: 'Warmth & Joints',
    flavor: 'Citrusy, tingling, invigorating aroma',
    recipe: 'Lightly crush 3-4 seeds into hot black tea during freezing winter mornings.',
  },
  {
    id: 'jatamansi',
    name: 'Alpine Jatamansi (जटामांसी)',
    botanical: 'Nardostachys jatamansi',
    benefit: 'Rare Himalayan rhizome. Renowned in Charaka Samhita as the premier natural neural sedative.',
    tag: 'Deep Sleep & Mind',
    flavor: 'Woody, earthy, deeply grounded scent',
    recipe: 'Infuse a pinch with warm milk or chamomile 30 minutes before sleep.',
  },
];

const TEA_RECIPES = [
  {
    id: 'buransh-tulsi',
    title: 'Buransh-Tulsi Mountain Kadha',
    hindiTitle: 'बुरांश-तुलसी पर्वतीय काढ़ा',
    steepSeconds: 60,
    herbs: ['Wild Buransh', 'Krishna Tulsi', 'Ginger'],
    benefits: 'Antioxidant heart shield, soothes sore throat from cold mountain drafts.',
  },
  {
    id: 'timur-chai',
    title: 'Timur Winter Hearth Infusion',
    hindiTitle: 'तिम्मूर उष्णता चाय',
    steepSeconds: 90,
    herbs: ['Chamoli Timur', 'Cinnamon', 'Black Tea'],
    benefits: 'Warms icy feet and fingers, stimulates sluggish morning circulation.',
  },
  {
    id: 'jatamansi-shanti',
    title: 'Alpine Nidra Night Brew',
    hindiTitle: 'जटामांसी सुखद निद्रा पेय',
    steepSeconds: 120,
    herbs: ['Jatamansi', 'Cardamom', 'Chamomile'],
    benefits: 'Melts away cerebral tension for deep restorative Himalayan sleep.',
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
      { type: 'pranayama', title: 'Anulom Vilom (3 Mins)' },
      { type: 'yoga', title: 'Tadasana Alignment (4 Mins)' },
      { type: 'herbs', title: 'Timur Morning Tea Brew' },
      { type: 'sound', title: 'Singing Bowl Centering' },
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
      { type: 'marma', title: 'Janu Knee Marma Stimulation' },
      { type: 'yoga', title: 'Bhadrasana Hip Opening (5 Mins)' },
      { type: 'pranayama', title: 'Sahaj Flow Breath (3 Mins)' },
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
      { type: 'pranayama', title: 'Bhramari Humming Breath (4 Mins)' },
      { type: 'marma', title: 'Adhipati Crown Pressure Point' },
      { type: 'herbs', title: 'Alpine Nidra Tea Brew' },
      { type: 'sound', title: 'Alaknanda Stream Soundscape' },
    ],
  },
];

// ── 7 INTERACTIVE SACRED WELLNESS PILLARS (PAGES INSIDE PAGE) ───────────────
const WELLNESS_PILLARS = [
  {
    id: 'pranayama',
    title: 'प्राणायाम व ध्यान (Sacred Breathing Mandala)',
    shortTitle: 'प्राणायाम (Pranayama)',
    hindiName: 'श्वास चक्र व शांति',
    tag: 'श्वास व ध्यान • Breathwork',
    duration: '5-15 Mins',
    icon: Wind,
    badge: 'Most Loved',
    badgeColor: 'bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30',
    description: 'Expanding sacred geometric mandala with 5 authentic Himalayan techniques: Anulom-Vilom, 4-7-8 Deep Sleep, Bhramari Bee Breath, and Box Breathing with audio cues.',
    actionText: 'श्वास अभ्यास करें (Start Breath)',
  },
  {
    id: 'dosha',
    title: 'त्रि-दोष प्रकृति परीक्षण (Tri-Dosha Assessment)',
    shortTitle: 'दोष परीक्षण (Dosha)',
    hindiName: 'वात, पित्त व कफ संतुलन',
    tag: 'आयुर्वेद • Ayurvedic Type',
    duration: '3 Mins',
    icon: Compass,
    badge: 'Self-Discovery',
    badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
    description: 'Discover your unique body constitution (Vata, Pitta, Kapha) through 4 intuitive lifestyle questions with tailored Himalayan dietary and seasonal advice.',
    actionText: 'दोष परीक्षण करें (Scan Dosha)',
  },
  {
    id: 'marma',
    title: 'मर्म बिंदु चिकित्सा (Himalayan Marma Points)',
    shortTitle: 'मर्म चिकित्सा (Marma)',
    hindiName: 'एक्यूप्रेशर ऊर्जा केंद्र',
    tag: 'ऊर्जा बिंदु • Acupressure',
    duration: '5 Mins',
    icon: Heart,
    badge: 'Instant Relief',
    badgeColor: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30',
    description: '6 vital high-altitude acupressure points (Adhipati crown, Kshipra hand web, Hridaya heart center, Janu knee) with hold timers to dispel headaches and stress.',
    actionText: 'मर्म बिंदु देखें (Explore Marma)',
  },
  {
    id: 'herbs',
    title: 'हिमालयी औषधि व चाय (Alpine Herbalist & Teas)',
    shortTitle: 'औषधि व चाय (Herbal Teas)',
    hindiName: 'पहाड़ी जड़ी-बूटी व काढ़ा',
    tag: 'जड़ी-बूटी • Natural Herbs',
    duration: 'Kitchen Brew',
    icon: Coffee,
    badge: 'Pahadi Remedies',
    badgeColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    description: 'Timur pepper tea, Buransh (Rhododendron) heart nectar, Tulsi-Ginger mountain kadha and Haldi-Doodh traditional recipes for immunity and altitude vitality.',
    actionText: 'हर्बल चाय बनाएं (Brew Teas)',
  },
  {
    id: 'sound',
    title: 'ध्वनि चिकित्सा (Sound Healing & Bowls)',
    shortTitle: 'ध्वनि ध्यान (Sound)',
    hindiName: 'नाद योग व कांस्य घंटियां',
    tag: 'ध्वनि तरंग • Acoustic Healing',
    duration: 'Continuous',
    icon: Bell,
    badge: '136.1Hz Om / 528Hz',
    badgeColor: 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30',
    description: 'Tibetan singing bowls, pahadi temple bronze bells, Solfeggio 528Hz DNA tone, and pure Alaknanda river stream acoustic pink noise to calm the nervous system.',
    actionText: 'ध्वनि ध्यान सुनें (Play Soundscapes)',
  },
  {
    id: 'yoga',
    title: 'योगाभ्यास व मुद्रा (AI Posture Coach)',
    shortTitle: 'योगाभ्यास (AI Yoga)',
    hindiName: 'कंप्यूटर विजन आसन मार्गदर्शन',
    tag: 'आसन • Computer Vision',
    duration: '10 Mins',
    icon: Trophy,
    badge: 'Camera AI',
    badgeColor: 'bg-gold-warm/20 text-gold-warm border-gold-warm/40',
    description: 'Real-time on-device MediaPipe pose tracking for Tadasana, Bhadrasana, Vrikshasana & Virabhadrasana with auditory postural alignment cues.',
    actionText: 'योगाभ्यास करें (Open Yoga AI)',
  },
  {
    id: 'flow',
    title: 'दैनिक दिनचर्या (Curated Wellness Journeys)',
    shortTitle: 'दैनिक यात्रा (Flows)',
    hindiName: 'क्रमबद्ध दैनिक स्वास्थ्य यात्रा',
    tag: 'दिनचर्या • Multi-step Flow',
    duration: '12-15 Mins',
    icon: Sparkles,
    badge: 'Full Routines',
    badgeColor: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30',
    description: 'Holistic step-by-step journeys: Morning Vitality, Mountain Joint Relief, and Evening Nidra combining breathing, gentle movement, tea, and soundscapes.',
    actionText: 'दैनिक यात्रा चुनें (View Flows)',
  },
];

export default function WellnessStudio({ defaultTab = 'hub' }) {
  const { section } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const basePath = location.pathname.startsWith('/patient') ? '/patient/wellness' : '/mitra/wellness';

  // Support both /mitra/wellness/:section and query string ?tab=...
  const rawParam = section || searchParams.get('tab') || defaultTab || 'hub';
  const normalizedInitial = rawParam === 'dhyan' ? 'pranayama' : rawParam;
  
  const VALID_TABS = ['hub', 'flow', 'pranayama', 'dosha', 'marma', 'herbs', 'sound', 'yoga'];
  const activeTab = VALID_TABS.includes(normalizedInitial) ? normalizedInitial : 'hub';

  const handleNavigateToPillar = (pillarId) => {
    if (pillarId === 'hub') {
      navigate(basePath);
    } else {
      navigate(`${basePath}/${pillarId}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleTabChange = handleNavigateToPillar;

  // ── UNIFIED WELLNESS STATS & HYDRATION ─────────────────────────────────────
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
      waterGlassesToday: 3,
    };
  });

  const saveStats = (updated) => {
    setWellnessStats(updated);
    try {
      localStorage.setItem('sanjeevani_wellness_stats', JSON.stringify(updated));
    } catch {}
  };

  const handleDrinkWater = (glassIndex) => {
    playWaterDrop();
    const current = wellnessStats.waterGlassesToday;
    const nextCount = glassIndex < current ? glassIndex : Math.min(8, glassIndex + 1);
    const updated = { ...wellnessStats, waterGlassesToday: nextCount };
    saveStats(updated);
    if (nextCount === 8) {
      toast.success('शानदार! आज का 2 लीटर हिमालयी जल लक्ष्य पूरा हुआ!', { icon: '💧' });
      playTempleBell(980, 3);
    } else {
      toast(`जल ग्रहण: ${nextCount}/8 गिलास`, { icon: '💧' });
    }
  };

  // ── AMBIENT SOUND ENGINE ───────────────────────────────────────────────────
  const [ambientTrack, setAmbientTrack] = useState('off');

  const toggleAmbientSound = (track) => {
    if (ambientTrack === track) {
      ambientSoundscape.stop();
      setAmbientTrack('off');
      toast('Soundscape paused', { icon: '🔇' });
    } else {
      ambientSoundscape.start(track);
      setAmbientTrack(track);
      const names = {
        river: 'Alaknanda River Stream',
        om: '136.1Hz Cosmic Om Drone',
        bowls: 'Tibetan Singing Bowls',
        bells: 'Pahadi Temple Bells',
        wind: 'Himalayan Pine Wind',
      };
      toast(`Playing ${names[track] || track}`, { icon: '🎶' });
    }
  };

  useEffect(() => {
    return () => {
      ambientSoundscape.stop();
    };
  }, []);

  // ── SACRED PRANAYAMA MANDALA ENGINE ────────────────────────────────────────
  const [selectedPranayama, setSelectedPranayama] = useState(PRANAYAMA_PATTERNS[0]);
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState('idle'); // 'inhale' | 'hold-in' | 'exhale' | 'hold-out'
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(0);
  const [breathCyclesDone, setBreathCyclesDone] = useState(0);

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
              setBreathCyclesDone((c) => {
                const nextC = c + 1;
                if (nextC % 5 === 0) {
                  playTempleBell(852, 4);
                  toast.success(`अद्भुत! ${nextC} प्राणायाम चक्र पूर्ण हुए!`, { icon: '🪷' });
                }
                return nextC;
              });
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

  // Compute mandala scale & aura based on breath phase
  const getMandalaVisuals = () => {
    switch (breathPhase) {
      case 'inhale':
        return {
          scale: 'scale-125 sm:scale-135',
          glow: 'from-emerald-400/40 via-teal-300/30 to-sage/50',
          borderColor: 'border-emerald-400',
          label: 'श्वास अंदर लें (Inhale)',
          sub: 'Fill your chest with pure Himalayan prana',
        };
      case 'hold-in':
        return {
          scale: 'scale-120 sm:scale-130',
          glow: 'from-amber-400/40 via-gold-warm/40 to-amber-500/50',
          borderColor: 'border-gold-warm',
          label: 'कुम्भक (Hold Prana)',
          sub: 'Retain the sacred stillness inside',
        };
      case 'exhale':
        return {
          scale: 'scale-85 sm:scale-90',
          glow: 'from-indigo-400/30 via-slate-400/20 to-sky-500/40',
          borderColor: 'border-indigo-400',
          label: 'श्वास बाहर छोड़ें (Exhale)',
          sub: 'Release all tension down to the earth',
        };
      case 'hold-out':
        return {
          scale: 'scale-90',
          glow: 'from-purple-400/20 via-pink-400/20 to-indigo-500/30',
          borderColor: 'border-purple-400',
          label: 'बाह्य कुम्भक (Rest)',
          sub: 'Rest in pure awareness',
        };
      default:
        return {
          scale: 'scale-100',
          glow: 'from-sage/20 via-gold-warm/15 to-sage/30',
          borderColor: 'border-sage/40',
          label: 'तैयार रहें (Ready)',
          sub: 'Press Start to begin guided sacred breathing',
        };
    }
  };

  const mandalaVisuals = getMandalaVisuals();

  // ── TRI-DOSHA BALANCE SCANNER STATE ────────────────────────────────────────
  const [doshaAnswers, setDoshaAnswers] = useState({});
  const [doshaResult, setDoshaResult] = useState(null);

  const handleSelectDoshaOption = (questionId, doshaType) => {
    playHapticPulse();
    const nextAnswers = { ...doshaAnswers, [questionId]: doshaType };
    setDoshaAnswers(nextAnswers);

    const totalAns = Object.keys(nextAnswers).length;
    let counts = { vata: 0, pitta: 0, kapha: 0 };
    Object.values(nextAnswers).forEach((d) => counts[d]++);

    const vataPct = Math.round((counts.vata / Math.max(1, totalAns)) * 100);
    const pittaPct = Math.round((counts.pitta / Math.max(1, totalAns)) * 100);
    const kaphaPct = 100 - vataPct - pittaPct;

    let dominant = 'vata';
    if (counts.pitta > counts.vata && counts.pitta >= counts.kapha) dominant = 'pitta';
    else if (counts.kapha > counts.vata && counts.kapha > counts.pitta) dominant = 'kapha';

    setDoshaResult({
      vataPct,
      pittaPct,
      kaphaPct,
      dominant,
      isComplete: totalAns === DOSHA_QUESTIONS.length,
    });

    if (totalAns === DOSHA_QUESTIONS.length) {
      playTempleBell(852, 3);
      toast.success('दोष परीक्षण पूर्ण हुआ! नीचे अपनी व्यक्तिगत औषधि देखें।', { icon: '🌿' });
    }
  };

  const resetDosha = () => {
    setDoshaAnswers({});
    setDoshaResult(null);
  };

  // ── MARMA ACUPRESSURE STATE ────────────────────────────────────────────────
  const [selectedMarma, setSelectedMarma] = useState(MARMA_POINTS[0]);
  const [marmaPressing, setMarmaPressing] = useState(false);
  const [marmaTimeLeft, setMarmaTimeLeft] = useState(selectedMarma.idealHoldSec);

  useEffect(() => {
    setMarmaTimeLeft(selectedMarma.idealHoldSec);
    setMarmaPressing(false);
  }, [selectedMarma]);

  useEffect(() => {
    let timer = null;
    if (marmaPressing) {
      playHapticPulse();
      timer = setInterval(() => {
        setMarmaTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setMarmaPressing(false);
            playTempleBell(852, 4);
            toast.success(`${selectedMarma.name} मर्म उद्दीपन सफल रहा!`, { icon: '✨' });
            saveStats({
              ...wellnessStats,
              mindfulMinutesToday: wellnessStats.mindfulMinutesToday + 1,
            });
            return selectedMarma.idealHoldSec;
          }
          if (prev % 5 === 0) playHapticPulse();
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [marmaPressing, selectedMarma]);

  // ── ALPINE TEA BREW KETTLE TIMER STATE ─────────────────────────────────────
  const [selectedTea, setSelectedTea] = useState(TEA_RECIPES[0]);
  const [teaBrewing, setTeaBrewing] = useState(false);
  const [teaSecondsLeft, setTeaSecondsLeft] = useState(selectedTea.steepSeconds);

  useEffect(() => {
    setTeaSecondsLeft(selectedTea.steepSeconds);
    setTeaBrewing(false);
  }, [selectedTea]);

  useEffect(() => {
    let teaTimer = null;
    if (teaBrewing) {
      playWaterDrop();
      teaTimer = setInterval(() => {
        setTeaSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(teaTimer);
            setTeaBrewing(false);
            playTempleBell(740, 4);
            toast.success(`आपकी ${selectedTea.title} पककर तैयार है! आनंद लें।`, { icon: '☕' });
            return selectedTea.steepSeconds;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (teaTimer) clearInterval(teaTimer);
    };
  }, [teaBrewing, selectedTea]);

  // ── YOGASHALA AI STATE ─────────────────────────────────────────────────────
  const [selectedAsana, setSelectedAsana] = useState(YOGA_ASANAS[0]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isSimulatedMode, setIsSimulatedMode] = useState(false);
  const [poseModelLoading, setPoseModelLoading] = useState(false);
  const [isHoldingPose, setIsHoldingPose] = useState(false);
  const [holdTimerSec, setHoldTimerSec] = useState(selectedAsana.targetHoldsSec);
  const [alignmentScore, setAlignmentScore] = useState(0);
  const [postureChecks, setPostureChecks] = useState([]);
  const [feedbackMessage, setFeedbackMessage] = useState('Camera ke samne pura sharir dikhayein taaki jaanch ho sake.');
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const holdIntervalRef = useRef(null);

  const startCamera = async () => {
    try {
      setIsSimulatedMode(false);
      setPoseModelLoading(true);
      resetPoseSmoothing();

      const modelPromise = initPoseLandmarker().catch((err) => {
        console.warn('Pose model preload warning:', err);
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

      await modelPromise;
      setPoseModelLoading(false);
      toast.success('Camera connected! Full body frame check active.');
      playSingingBowl(216, 2.5);
    } catch (err) {
      setPoseModelLoading(false);
      toast.error('Camera nahi mila. Practice Simulation Mode shuru kiya gaya.');
      startSimulationMode();
    }
  };

  const stopCamera = () => {
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
  };

  // Video pose processing loop
  useEffect(() => {
    let tick = 0;
    const processFrame = () => {
      tick++;
      let landmarks = null;

      if (isSimulatedMode) {
        const wobble = Math.sin(tick / 15) * 0.015;
        landmarks = [
          { x: 0.5, y: 0.15, visibility: 0.95 },
          { x: 0.52, y: 0.14, visibility: 0.9 },
          { x: 0.53, y: 0.14, visibility: 0.9 },
          { x: 0.54, y: 0.14, visibility: 0.9 },
          { x: 0.48, y: 0.14, visibility: 0.9 },
          { x: 0.47, y: 0.14, visibility: 0.9 },
          { x: 0.46, y: 0.14, visibility: 0.9 },
          { x: 0.56, y: 0.16, visibility: 0.8 },
          { x: 0.44, y: 0.16, visibility: 0.8 },
          { x: 0.52, y: 0.18, visibility: 0.9 },
          { x: 0.48, y: 0.18, visibility: 0.9 },
          { x: 0.42, y: 0.25, visibility: 0.95 },
          { x: 0.58, y: 0.25, visibility: 0.95 },
          { x: 0.38, y: 0.23, visibility: 0.9 },
          { x: 0.62, y: 0.23, visibility: 0.9 },
          { x: 0.35, y: 0.22 + wobble, visibility: 0.9 },
          { x: 0.65, y: 0.22 - wobble, visibility: 0.9 },
          { x: 0.34, y: 0.12, visibility: 0.7 },
          { x: 0.66, y: 0.12, visibility: 0.7 },
          { x: 0.34, y: 0.13, visibility: 0.7 },
          { x: 0.66, y: 0.13, visibility: 0.7 },
          { x: 0.35, y: 0.14, visibility: 0.7 },
          { x: 0.65, y: 0.14, visibility: 0.7 },
          { x: 0.45, y: 0.5, visibility: 0.95 },
          { x: 0.55, y: 0.5, visibility: 0.95 },
          { x: 0.45, y: 0.72 + wobble, visibility: 0.95 },
          { x: 0.55, y: 0.72 - wobble, visibility: 0.95 },
          { x: 0.45, y: 0.9, visibility: 0.95 },
          { x: 0.55, y: 0.9, visibility: 0.95 },
          { x: 0.45, y: 0.94, visibility: 0.8 },
          { x: 0.55, y: 0.94, visibility: 0.8 },
          { x: 0.47, y: 0.95, visibility: 0.8 },
          { x: 0.53, y: 0.95, visibility: 0.8 },
        ];
      } else if (!poseModelLoading && isCameraActive && videoRef.current && videoRef.current.readyState >= 2) {
        landmarks = detectPoseFromVideo(videoRef.current, selectedAsana.id);
      }

      if (canvasRef.current) {
        const assessment = evaluatePosture(landmarks, selectedAsana.id);
        setAlignmentScore(assessment.score);
        setPostureChecks(assessment.checks);

        if (assessment.score >= 80) {
          setFeedbackMessage(assessment.isReady ? 'उत्तम! मुद्रा बिल्कुल सही है। सांस पर ध्यान रखें।' : (assessment.feedbackText || 'मुद्रा सही है।'));
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

  // Hold timer
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

  return (
    <div className="min-h-screen bg-mist text-primary transition-colors duration-300 relative pb-24 safe-bottom-nav">
      {/* Background Mountain Contours */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none opacity-20 dark:opacity-10 z-0">
        <MountainRidge tone="pine" className="w-full h-44 object-cover" />
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 relative z-10 space-y-5">
        {/* ── Universal Back Button for Mobile & Desktop ─────────────────── */}
        <div className="flex items-center justify-between pb-1">
          <BackButton fallback="/mitra" label="डैशबोर्ड (Dashboard)" />
          {activeTab !== 'hub' && (
            <button
              onClick={() => handleTabChange('hub')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-sage dark:text-booti-glow bg-sage/10 hover:bg-sage/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>हब पर वापस (Wellness Hub)</span>
            </button>
          )}
        </div>

        {/* ── TOP HERO BANNER & INTERACTIVE HYDRATION / VITALITY BAR ── */}
        <div className="bg-white/95 dark:bg-card backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-sage/20 dark:border-gray-800 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
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
                आरोग्यशाला (Interactive Wellness Sanctuary)
              </h1>
              <p className="text-xs sm:text-sm text-muted dark:text-muted mt-0.5">
                Sacred Breathing Mandala, Tri-Dosha Scanner, Marma Acupressure & Alpine Tea Herbalist.
              </p>
            </div>

            {/* Mindful Minutes & Daily Streak */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="bg-mist dark:bg-card border border-sage/25 rounded-xl px-3 py-1.5 flex items-center gap-2">
                <Clock className="w-4 h-4 text-sage dark:text-booti-glow" />
                <div>
                  <span className="text-[9px] text-gray-500 uppercase font-bold block leading-none">Mindful</span>
                  <span className="text-xs sm:text-sm font-bold text-primary">
                    {wellnessStats.mindfulMinutesToday} Mins
                  </span>
                </div>
              </div>

              <div className="bg-mist dark:bg-card border border-gold-warm/30 rounded-xl px-3 py-1.5 flex items-center gap-2">
                <Activity className="w-4 h-4 text-gold-warm" />
                <div>
                  <span className="text-[9px] text-gray-500 uppercase font-bold block leading-none">Breaths</span>
                  <span className="text-xs sm:text-sm font-bold text-primary">
                    {wellnessStats.breathCyclesToday}
                  </span>
                </div>
              </div>

              <div className="bg-mist dark:bg-card border border-orange-500/30 rounded-xl px-3 py-1.5 flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <div>
                  <span className="text-[9px] text-gray-500 uppercase font-bold block leading-none">Streak</span>
                  <span className="text-xs sm:text-sm font-bold text-primary">
                    {wellnessStats.streakDays} Days 🔥
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Himalayan Spring Water Tracker */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Droplet className="w-4 h-4 text-sky-500 animate-bounce" />
              <span className="text-xs font-bold text-primary">
                Daily Mountain Hydration (जल साधना):
              </span>
              <span className="text-xs font-semibold text-gray-500">
                {wellnessStats.waterGlassesToday}/8 Glasses ({wellnessStats.waterGlassesToday * 250}ml)
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => {
                const filled = idx < wellnessStats.waterGlassesToday;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleDrinkWater(idx)}
                    title={`Glass ${idx + 1}`}
                    className={`w-7 h-8 sm:w-8 sm:h-9 rounded-lg border flex flex-col items-center justify-center transition-all cursor-pointer ${
                      filled
                        ? 'bg-sky-500 text-white border-sky-600 shadow-xs scale-105'
                        : 'bg-mist dark:bg-card border-gray-300 dark:border-gray-700 text-gray-400 hover:border-sky-400'
                    }`}
                  >
                    <Droplet className={`w-3.5 h-3.5 ${filled ? 'fill-current' : ''}`} />
                    <span className="text-[8px] font-bold mt-0.5">{idx + 1}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  saveStats({ ...wellnessStats, waterGlassesToday: 0 });
                  toast('Hydration reset for new day', { icon: '💧' });
                }}
                className="text-[10px] text-gray-400 hover:text-gray-600 px-1 py-1 rounded-md cursor-pointer"
                title="Reset water log"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Page Voice Guide Banner ── */}
        <PageVoiceGuide pageKey="wellness" />

        {/* ── PERSISTENT SOUNDTRACK BAR ── */}
        <div className="bg-gradient-to-r from-sage/10 via-[#D4A359]/10 to-sage/10 dark:from-sage/20 dark:via-card dark:to-sage/20 border border-sage/30 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 shrink-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${ambientTrack !== 'off' ? 'bg-sage text-white animate-pulse' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>
              <Music className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-sage dark:text-booti-glow block leading-none">
                Himalayan Soundscape
              </span>
              <span className="text-xs font-bold text-primary">
                {ambientTrack === 'river' ? 'Alaknanda Stream (Pink Noise)' : ambientTrack === 'om' ? '136.1Hz Cosmic Om' : ambientTrack === 'bowls' ? 'Tibetan Bowls' : ambientTrack === 'bells' ? 'Temple Bells' : ambientTrack === 'wind' ? 'Pine Wind' : 'Acoustics Off'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => toggleAmbientSound('river')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${ambientTrack === 'river' ? 'bg-sage text-white shadow-xs' : 'bg-white dark:bg-warm-indigo text-gray-700 dark:text-gray-300 hover:bg-sage/10'}`}
            >
              🌊 Stream
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
              🥣 Bowls
            </button>
            {ambientTrack !== 'off' && (
              <button
                onClick={() => toggleAmbientSound(ambientTrack)}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl cursor-pointer"
                title="Mute Soundscape"
              >
                <VolumeX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            PAGES INSIDE PAGE ARCHITECTURE:
            1. HUB VIEW: 7 Distinct Pillar Cards (No horizontal scroll!)
            2. SUB-VIEW HEADER: Back to Hub + Quick Switcher
        ══════════════════════════════════════════════════════════════ */}

        {/* ── SUB-VIEW NAVIGATION HEADER (When inside a specific pillar) ── */}
        {activeTab !== 'hub' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 dark:bg-card p-3 sm:p-4 rounded-2xl border border-sage/20 dark:border-gray-800 shadow-xs animate-fadeIn">
            <button
              onClick={() => handleTabChange('hub')}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-sage dark:text-booti-glow hover:underline cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>← आरोग्यशाला हब पर वापस (Back to Wellness Hub)</span>
            </button>

            {/* Responsive Pillar Selector (wrapped pills, zero horizontal scroll!) */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => handleTabChange('hub')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-mist dark:bg-[#131E2B] text-muted hover:text-primary transition-all cursor-pointer"
              >
                🏠 हब (Hub)
              </button>
              {WELLNESS_PILLARS.map((p) => {
                const Icon = p.icon;
                const isActive = activeTab === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleTabChange(p.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-sage text-white shadow-xs'
                        : 'bg-mist dark:bg-[#131E2B] text-muted hover:text-primary'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{p.shortTitle}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 1. SANCTUARY HUB (When activeTab === 'hub') ── */}
        {activeTab === 'hub' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Hub Header & Motivation */}
            <div className="bg-gradient-to-r from-sage/15 via-gold-warm/10 to-sage/15 dark:from-sage/20 dark:via-[#131E2B] dark:to-sage/20 border border-sage/25 rounded-3xl p-5 sm:p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sage text-white">
                      🌿 7 दिव्य स्तंभ • 7 Wellness Pillars
                    </span>
                    <span className="text-xs text-muted font-medium">समर्पित कक्ष (Dedicated Spaces)</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                    आरोग्यशाला कक्ष चुनें (Select Wellness Practice)
                  </h2>
                  <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed max-w-2xl">
                    प्रत्येक स्तंभ एक स्वतंत्र आरोग्य कक्ष है। अपनी आवश्यकतानुसार किसी भी अभ्यास पर टैप करें और समर्पित अनुभव प्राप्त करें।
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted font-bold">त्वरित यात्रा:</span>
                  <button
                    onClick={() => handleTabChange('flow')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gold-warm text-primary font-bold text-xs shadow-xs hover:bg-gold-warm/90 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>दैनिक यात्रा (Daily Flow)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 7 Interactive Pillar Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {WELLNESS_PILLARS.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div
                    key={pillar.id}
                    onClick={() => handleTabChange(pillar.id)}
                    className="group bg-white/95 dark:bg-[#131E2B] border border-gray-200/80 dark:border-gray-800 hover:border-sage/50 dark:hover:border-sage/50 rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Badges & Icon */}
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-sage/10 dark:bg-sage/20 text-sage dark:text-booti-glow flex items-center justify-center group-hover:scale-110 group-hover:bg-sage group-hover:text-white transition-all shadow-2xs">
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${pillar.badgeColor}`}>
                            {pillar.badge}
                          </span>
                          <span className="text-[10px] font-mono text-muted flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gold-warm" /> {pillar.duration}
                          </span>
                        </div>
                      </div>

                      {/* Titles & Hindi Subtitle */}
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sage dark:text-booti-glow">
                        {pillar.tag}
                      </span>
                      <h3 className="font-serif font-bold text-base sm:text-lg text-primary mt-0.5 leading-snug group-hover:text-sage dark:group-hover:text-booti-glow transition-colors">
                        {pillar.title}
                      </h3>
                      <p className="text-xs text-muted mt-2 line-clamp-3 leading-relaxed">
                        {pillar.description}
                      </p>
                    </div>

                    {/* Bottom Action CTA */}
                    <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs font-bold text-sage dark:text-booti-glow group-hover:translate-x-0.5 transition-transform">
                      <span>{pillar.actionText}</span>
                      <div className="w-7 h-7 rounded-full bg-sage/10 dark:bg-sage/20 flex items-center justify-center group-hover:bg-sage group-hover:text-white transition-all">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 1: SACRED PRANAYAMA MANDALA (IMMERSIVE BREATHING)
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'pranayama' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Pattern Selector Cards */}
              <div className="lg:col-span-4 space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
                  Select Breath Rhythm (प्राणायाम विधि):
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
                          playMeditationChime('inhale');
                        }}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sage text-white border-sage shadow-xs'
                            : 'bg-white dark:bg-warm-indigo border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 hover:border-sage/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-serif font-bold text-sm">{p.name}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                            {p.inhaleSec}-{p.holdInSec}-{p.exhaleSec}-{p.holdOutSec}
                          </span>
                        </div>
                        <span className={`text-[11px] block mt-0.5 ${isSelected ? 'text-white/80' : 'text-gold-warm'}`}>
                          {p.hindiName}
                        </span>
                        <p className={`text-xs mt-1 line-clamp-1 ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                          {p.benefits}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Tempo Speed Selector */}
                <div className="bg-white dark:bg-warm-indigo border border-gray-200 dark:border-gray-800 rounded-2xl p-3 space-y-2">
                  <span className="text-[11px] font-bold text-gray-500 block">Mindful Audio Guidance:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => playSingingBowl(216, 4)}
                      className="flex-1 py-1.5 bg-sage/15 hover:bg-sage/25 text-sage dark:text-booti-glow rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      🥣 Singing Bowl
                    </button>
                    <button
                      onClick={() => playTempleBell(852, 3)}
                      className="flex-1 py-1.5 bg-gold-warm/15 hover:bg-gold-warm/25 text-gold-warm rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      🔔 Temple Bell
                    </button>
                  </div>
                </div>
              </div>

              {/* LIVE SACRED LOTUS MANDALA VISUALIZER */}
              <div className="lg:col-span-8 bg-white dark:bg-warm-indigo border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-xs relative overflow-hidden min-h-[460px]">
                
                {/* Dynamic Aura Gradient in background */}
                <div className={`absolute w-72 h-72 sm:w-88 sm:h-88 rounded-full bg-gradient-to-tr ${mandalaVisuals.glow} blur-2xl opacity-60 transition-all duration-1000 pointer-events-none`} />

                {/* THE SACRED MANDALA CONTAINER */}
                <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center mb-6">
                  
                  {/* Rotating Multi-Petal SVG Lotus Mandala */}
                  <svg
                    viewBox="0 0 200 200"
                    className={`absolute inset-0 w-full h-full animate-mandala-spin transition-transform duration-1000 ease-out ${mandalaVisuals.scale}`}
                  >
                    <defs>
                      <linearGradient id="mandalaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4A6741" stopOpacity="0.4" />
                        <stop offset="50%" stopColor="#D4A359" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#2D4A22" stopOpacity="0.6" />
                      </linearGradient>
                    </defs>

                    {/* Outer 8 Lotus Petals */}
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                      <g key={deg} transform={`rotate(${deg} 100 100)`}>
                        <path
                          d="M 100 20 C 112 50, 120 70, 100 95 C 80 70, 88 50, 100 20 Z"
                          fill="url(#mandalaGrad)"
                          stroke="currentColor"
                          strokeWidth="0.75"
                          className="text-sage/40 dark:text-booti-glow/40"
                        />
                      </g>
                    ))}

                    {/* Inner 8 Lotus Petals */}
                    {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((deg) => (
                      <g key={deg} transform={`rotate(${deg} 100 100)`}>
                        <path
                          d="M 100 45 C 108 65, 112 78, 100 92 C 88 78, 92 65, 100 45 Z"
                          fill="#D4A359"
                          fillOpacity="0.3"
                          stroke="currentColor"
                          strokeWidth="0.5"
                          className="text-gold-warm/60"
                        />
                      </g>
                    ))}

                    {/* Center Ring */}
                    <circle cx="100" cy="100" r="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" className="text-sage/60" />
                  </svg>

                  {/* Circular Stroke Progress Countdown Ring */}
                  <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="70"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="text-gray-200 dark:text-gray-800"
                    />
                    {isBreathingActive && (
                      <circle
                        cx="50%"
                        cy="50%"
                        r="70"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="5"
                        strokeDasharray={440}
                        strokeDashoffset={440 - (440 * (phaseSecondsLeft / Math.max(1, selectedPranayama.inhaleSec)))}
                        strokeLinecap="round"
                        className={`transition-all duration-1000 ${
                          breathPhase === 'inhale' ? 'text-emerald-500' : breathPhase === 'hold-in' ? 'text-amber-500' : 'text-indigo-500'
                        }`}
                      />
                    )}
                  </svg>

                  {/* Central Mandala Nucleus */}
                  <div
                    className={`w-36 h-36 sm:w-40 sm:h-40 rounded-full shadow-lg flex flex-col items-center justify-center transition-all duration-1000 z-10 border-2 ${mandalaVisuals.borderColor} ${
                      breathPhase === 'inhale'
                        ? 'bg-gradient-to-tr from-sage to-emerald-500 text-white shadow-emerald-500/20'
                        : breathPhase === 'hold-in'
                        ? 'bg-gradient-to-tr from-gold-warm to-amber-500 text-primary shadow-amber-500/20'
                        : breathPhase === 'exhale'
                        ? 'bg-gradient-to-tr from-[#1E2A43] to-indigo-600 text-white shadow-indigo-500/20'
                        : 'bg-gradient-to-tr from-sage to-[#7A9A75] text-white'
                    }`}
                  >
                    <span className="text-[10px] uppercase tracking-wider font-extrabold opacity-90 px-2 text-center">
                      {breathPhase === 'inhale' ? 'श्वास लें' : breathPhase === 'hold-in' ? 'रोकें' : breathPhase === 'exhale' ? 'छोड़ें' : breathPhase === 'hold-out' ? 'विश्राम' : 'आरंभ'}
                    </span>
                    <span className="text-4xl font-serif font-extrabold my-0.5">
                      {isBreathingActive ? `${phaseSecondsLeft}s` : 'ॐ'}
                    </span>
                    <span className="text-[10px] font-bold opacity-80">
                      Cycle: {breathCyclesDone}
                    </span>
                  </div>
                </div>

                {/* Subtitle & Cue */}
                <h3 className="text-base sm:text-lg font-serif font-bold text-primary mb-1">
                  {mandalaVisuals.label}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-5">
                  {mandalaVisuals.sub}
                </p>

                {/* Interactive Controls */}
                <div className="flex items-center gap-3">
                  {!isBreathingActive ? (
                    <button
                      onClick={() => {
                        setIsBreathingActive(true);
                        playSingingBowl(216, 3);
                      }}
                      className="bg-sage hover:bg-sage/90 text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 cursor-pointer shadow-md transition-all hover:scale-105"
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
                  <button
                    onClick={() => {
                      setIsBreathingActive(false);
                      setBreathCyclesDone(0);
                      toast('Breath counter reset', { icon: '🔄' });
                    }}
                    className="p-3 bg-mist dark:bg-card border border-gray-300 dark:border-gray-700 rounded-2xl text-gray-500 hover:text-primary cursor-pointer"
                    title="Reset cycles"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 2: TRI-DOSHA BALANCE SCANNER (INTERACTIVE DIAL)
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'dosha' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-warm-indigo border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-8 shadow-xs">
              <div className="max-w-xl mx-auto text-center space-y-2 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gold-warm/20 text-gold-warm mx-auto flex items-center justify-center">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-bold text-xl text-primary">
                  त्रि-दोष संतुलन परीक्षण (Tri-Dosha Balance Scanner)
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  Touch the dial for each symptom to discover your current Vata-Pitta-Kapha bio-energy balance and Himalayan remedies.
                </p>
              </div>

              {/* 4 Interactive Touch Dials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DOSHA_QUESTIONS.map((q, qIdx) => (
                  <div key={q.id} className="bg-mist dark:bg-card border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sage block">
                      प्रश्न {qIdx + 1} of 4
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-primary">
                      {q.question}
                    </h4>

                    <div className="space-y-1.5 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const isChosen = doshaAnswers[q.id] === opt.dosha;
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleSelectDoshaOption(q.id, opt.dosha)}
                            className={`w-full text-left p-2.5 rounded-xl text-xs font-medium border transition-all cursor-pointer flex items-center justify-between ${
                              isChosen
                                ? 'bg-sage text-white border-sage shadow-xs'
                                : 'bg-white dark:bg-warm-indigo border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-sage/50'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {isChosen && <Check className="w-4 h-4 shrink-0 ml-2" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* REAL-TIME ANIMATED DOSHA BALANCE METER */}
              {doshaResult && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-serif font-bold text-base text-primary">
                        Your Bio-Energy Profile (आपका प्रकृतिक संतुलन)
                      </h4>
                      <span className="text-xs text-gray-500">
                        Dominant Dosha: <strong className="text-sage uppercase">{doshaResult.dominant}</strong>
                      </span>
                    </div>
                    <button
                      onClick={resetDosha}
                      className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Re-scan
                    </button>
                  </div>

                  {/* Multi-Colored Segmented Meter */}
                  <div className="space-y-1.5">
                    <div className="h-4 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden flex">
                      <div
                        style={{ width: `${doshaResult.vataPct}%` }}
                        className="bg-sky-500 transition-all duration-500"
                        title={`Vata ${doshaResult.vataPct}%`}
                      />
                      <div
                        style={{ width: `${doshaResult.pittaPct}%` }}
                        className="bg-amber-500 transition-all duration-500"
                        title={`Pitta ${doshaResult.pittaPct}%`}
                      />
                      <div
                        style={{ width: `${doshaResult.kaphaPct}%` }}
                        className="bg-emerald-500 transition-all duration-500"
                        title={`Kapha ${doshaResult.kaphaPct}%`}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-sky-500">वात (Vata): {doshaResult.vataPct}%</span>
                      <span className="text-amber-500">पित्त (Pitta): {doshaResult.pittaPct}%</span>
                      <span className="text-emerald-500">कफ (Kapha): {doshaResult.kaphaPct}%</span>
                    </div>
                  </div>

                  {/* Tailored Ayurvedic Wisdom Card */}
                  <div className="bg-sage/10 border border-sage/30 rounded-2xl p-4 flex items-start gap-3">
                    <Leaf className="w-5 h-5 text-sage shrink-0 mt-0.5" />
                    <div className="text-xs text-primary space-y-1">
                      <strong className="font-bold text-sage block">
                        {doshaResult.dominant === 'vata'
                          ? 'Vata Grounding Protocol (वात शमन)':
                          doshaResult.dominant === 'pitta'
                          ? 'Pitta Cooling Protocol (पित्त शमन)':
                          'Kapha Energizing Protocol (कफ जागरण)'}
                      </strong>
                      <p className="text-gray-600 dark:text-gray-300">
                        {doshaResult.dominant === 'vata'
                          ? 'Warm sesame oil self-massage (Abhyanga), warm cooked grains, avoid chilly dry winds, and drink Tulsi-Ginger infusion. Practice Anulom-Vilom.'
                          : doshaResult.dominant === 'pitta'
                          ? 'Cooling drinks like Buransh petal tea, sweet fruits, avoid excessive spicy chilies. Practice Bhramari pranayama and meditation.'
                          : 'Warm spiced drinks with Timur and black pepper, brisk walking on village trails, avoid heavy oily dairy foods. Practice vigorous Kapalabhati.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 3: HIMALAYAN MARMA ACUPRESSURE STUDIO
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'marma' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Marma Point List */}
              <div className="lg:col-span-5 space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
                  Select Himalayan Marma Point (मर्म बिंदु):
                </span>
                <div className="space-y-2">
                  {MARMA_POINTS.map((m) => {
                    const isSelected = selectedMarma.id === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMarma(m)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sage text-white border-sage shadow-xs'
                            : 'bg-white dark:bg-warm-indigo border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 hover:border-sage/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-serif font-bold text-sm">{m.name}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                            {m.location}
                          </span>
                        </div>
                        <span className={`text-[11px] block mt-0.5 ${isSelected ? 'text-white/80' : 'text-gold-warm'}`}>
                          {m.category}
                        </span>
                        <p className={`text-xs mt-1 line-clamp-2 ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                          {m.benefits}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* TACTILE 30-SECOND PRESSURE COACH */}
              <div className="lg:col-span-7 bg-white dark:bg-warm-indigo border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-xs relative overflow-hidden min-h-[460px]">
                <div className="max-w-md mx-auto space-y-2 mb-6">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-sage/15 text-sage">
                    {selectedMarma.location}
                  </span>
                  <h3 className="font-serif font-bold text-xl text-primary">
                    {selectedMarma.name}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {selectedMarma.instruction}
                  </p>
                </div>

                {/* Tactile Pressure Orb with Pulse Rings */}
                <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center mb-6">
                  {marmaPressing && (
                    <>
                      <div className="absolute inset-0 rounded-full border-2 border-sage/40 animate-ripple pointer-events-none" />
                      <div className="absolute inset-4 rounded-full border border-gold-warm/40 animate-ping pointer-events-none" />
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (!marmaPressing) {
                        setMarmaPressing(true);
                      } else {
                        setMarmaPressing(false);
                      }
                    }}
                    className={`w-44 h-44 sm:w-48 sm:h-48 rounded-full shadow-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                      marmaPressing
                        ? 'bg-gradient-to-tr from-sage via-emerald-600 to-teal-500 text-white scale-105 shadow-emerald-500/30'
                        : 'bg-gradient-to-tr from-gold-warm via-amber-500 to-sage text-primary hover:scale-102 shadow-amber-500/20'
                    }`}
                  >
                    <Heart className={`w-8 h-8 mb-1 ${marmaPressing ? 'animate-pulse text-white' : 'text-primary'}`} />
                    <span className="text-2xl font-serif font-bold">
                      {marmaPressing ? `${marmaTimeLeft}s` : 'Press & Hold'}
                    </span>
                    <span className="text-[10px] font-bold uppercase opacity-85 mt-1">
                      {marmaPressing ? 'Breathe Deeply' : 'Tap to Stimulate'}
                    </span>
                  </button>
                </div>

                {/* Key Benefits Card */}
                <div className="bg-mist dark:bg-card border border-gray-200 dark:border-gray-800 rounded-2xl p-3.5 max-w-sm text-left flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-sage shrink-0 mt-0.5" />
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    <strong className="text-primary block font-bold">Clinical Benefit:</strong>
                    {selectedMarma.benefits}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 4: ALPINE HERBARIUM & LIVE TEA BREW KETTLE
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'herbs' && (
          <div className="space-y-6">
            
            {/* Live Tea Brew Kettle Assistant */}
            <div className="bg-gradient-to-r from-amber-500/10 via-gold-warm/10 to-sage/10 dark:from-card dark:to-card border border-gold-warm/30 rounded-3xl p-5 sm:p-7 shadow-xs">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                
                {/* Kettle Animated Graphic */}
                <div className="md:col-span-4 flex flex-col items-center justify-center text-center">
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    {teaBrewing && (
                      <div className="absolute -top-3 flex gap-2">
                        <span className="w-1.5 h-6 bg-gray-400/40 rounded-full animate-steam" />
                        <span className="w-2 h-8 bg-gray-400/50 rounded-full animate-steam delay-150" />
                        <span className="w-1.5 h-5 bg-gray-400/40 rounded-full animate-steam delay-300" />
                      </div>
                    )}
                    
                    <div className={`w-28 h-28 rounded-3xl bg-gold-warm/20 text-gold-warm flex items-center justify-center text-5xl shadow-md transition-all ${teaBrewing ? 'animate-bounce' : ''}`}>
                      🫖
                    </div>
                  </div>
                  <span className="text-xs font-bold text-primary mt-1">
                    {teaBrewing ? 'Simmering Himalayan Spring Water...' : 'Kettle Ready'}
                  </span>
                </div>

                {/* Recipe & Steep Controls */}
                <div className="md:col-span-8 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {TEA_RECIPES.map((recipe) => (
                      <button
                        key={recipe.id}
                        onClick={() => setSelectedTea(recipe)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedTea.id === recipe.id
                            ? 'bg-gold-warm text-primary shadow-xs'
                            : 'bg-white dark:bg-warm-indigo border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {recipe.title}
                      </button>
                    ))}
                  </div>

                  <div>
                    <h4 className="font-serif font-bold text-lg text-primary">
                      {selectedTea.title} ({selectedTea.hindiTitle})
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                      {selectedTea.benefits}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-bold">Ingredients:</span>
                    {selectedTea.herbs.map((h, i) => (
                      <span key={i} className="bg-sage/15 text-sage px-2 py-0.5 rounded-md text-[11px] font-medium">
                        {h}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => setTeaBrewing(!teaBrewing)}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all ${
                        teaBrewing ? 'bg-amber-500 text-white' : 'bg-sage text-white hover:bg-sage/90'
                      }`}
                    >
                      {teaBrewing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                      <span>{teaBrewing ? `Steeping (${teaSecondsLeft}s)` : `Start Steep (${selectedTea.steepSeconds}s)`}</span>
                    </button>

                    <button
                      onClick={() => {
                        handleDrinkWater(wellnessStats.waterGlassesToday);
                        toast.success('चाय पीकर जल साधना में दर्ज किया गया!', { icon: '☕' });
                      }}
                      className="px-3 py-2 bg-white dark:bg-warm-indigo border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gold-warm/20 flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Log Cup Drunk
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Alpine Herbarium Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-base text-primary">
                  Sacred Himalayan Herbarium (हिमालयी जड़ी-बूटी ज्ञान)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {HIMALAYAN_HERBS.map((herb) => (
                  <div
                    key={herb.id}
                    className="bg-white dark:bg-warm-indigo border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-2.5 shadow-xs hover:border-sage transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sage/15 text-sage">
                        {herb.tag}
                      </span>
                      <span className="text-[11px] italic text-gray-400">{herb.botanical}</span>
                    </div>

                    <div>
                      <h4 className="font-serif font-bold text-sm text-primary">{herb.name}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                        {herb.benefit}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px] space-y-1">
                      <div className="text-gold-warm font-semibold">
                        🍵 <strong>Pahadi Method:</strong> {herb.recipe}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 5: MULTI-TRACK SOUND SANCTUARY MIXER
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'sound' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-warm-indigo border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xs">
              <div className="max-w-xl mx-auto text-center space-y-2 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gold-warm/20 text-gold-warm mx-auto flex items-center justify-center">
                  <Music className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-bold text-xl text-primary">
                  Vedic Naad Sanctuary Console (ध्वनि चिकित्सा मिक्सर)
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  Pure acoustic harmonic frequencies generated directly in your browser without internet streaming.
                </p>
              </div>

              {/* 5 Sound Generators Console */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* 1. Alaknanda Stream */}
                <div className="bg-mist dark:bg-card border border-gray-200 dark:border-gray-800 rounded-2xl p-4 text-center space-y-3">
                  <span className="text-3xl block">🌊</span>
                  <div>
                    <h4 className="font-serif font-bold text-sm text-primary">Alaknanda Stream</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">Low-pass filtered pink noise mimicking mountain waters.</p>
                  </div>
                  <button
                    onClick={() => toggleAmbientSound('river')}
                    className={`w-full py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${ambientTrack === 'river' ? 'bg-red-500 text-white' : 'bg-sage text-white hover:bg-sage/90'}`}
                  >
                    {ambientTrack === 'river' ? 'Stop Stream' : 'Play Stream'}
                  </button>
                </div>

                {/* 2. 136.1Hz Cosmic Om */}
                <div className="bg-mist dark:bg-card border border-gray-200 dark:border-gray-800 rounded-2xl p-4 text-center space-y-3">
                  <span className="text-3xl block">🕉️</span>
                  <div>
                    <h4 className="font-serif font-bold text-sm text-primary">136.1Hz Cosmic Om</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">Sanskrit planetary tuning frequency for somatic calm.</p>
                  </div>
                  <button
                    onClick={() => toggleAmbientSound('om')}
                    className={`w-full py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${ambientTrack === 'om' ? 'bg-red-500 text-white' : 'bg-gold-warm text-primary hover:bg-gold-warm/90'}`}
                  >
                    {ambientTrack === 'om' ? 'Stop Drone' : 'Continuous Om'}
                  </button>
                </div>

                {/* 3. Singing Bowls */}
                <div className="bg-mist dark:bg-card border border-gray-200 dark:border-gray-800 rounded-2xl p-4 text-center space-y-3">
                  <span className="text-3xl block">🥣</span>
                  <div>
                    <h4 className="font-serif font-bold text-sm text-primary">Tibetan Singing Bowl</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">216Hz Anahata frequency with acoustic overtones.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => playSingingBowl(216, 5.0)}
                      className="flex-1 bg-sage text-white py-2 rounded-xl text-xs font-bold hover:bg-sage/90 cursor-pointer"
                    >
                      Strike Once
                    </button>
                    <button
                      onClick={() => toggleAmbientSound('bowls')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer ${ambientTrack === 'bowls' ? 'bg-red-500 text-white' : 'bg-sage/20 text-sage'}`}
                    >
                      {ambientTrack === 'bowls' ? 'Stop' : 'Loop'}
                    </button>
                  </div>
                </div>

                {/* 4. Pahadi Temple Bells */}
                <div className="bg-mist dark:bg-card border border-gray-200 dark:border-gray-800 rounded-2xl p-4 text-center space-y-3">
                  <span className="text-3xl block">🔔</span>
                  <div>
                    <h4 className="font-serif font-bold text-sm text-primary">Brass Temple Bell</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">Pure brass bell chime for awakening mental clarity.</p>
                  </div>
                  <button
                    onClick={() => playTempleBell(852, 4.0)}
                    className="w-full bg-gold-warm text-primary py-2 rounded-xl text-xs font-bold hover:bg-gold-warm/90 cursor-pointer"
                  >
                    Ring Bell (घंटी बजाएं)
                  </button>
                </div>

                {/* 5. Himalayan Pine Wind */}
                <div className="bg-mist dark:bg-card border border-gray-200 dark:border-gray-800 rounded-2xl p-4 text-center space-y-3">
                  <span className="text-3xl block">🌲</span>
                  <div>
                    <h4 className="font-serif font-bold text-sm text-primary">Alpine Pine Wind</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">Soft rustling pine needle breeze for insomnia.</p>
                  </div>
                  <button
                    onClick={() => toggleAmbientSound('wind')}
                    className={`w-full py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${ambientTrack === 'wind' ? 'bg-red-500 text-white' : 'bg-sage text-white hover:bg-sage/90'}`}
                  >
                    {ambientTrack === 'wind' ? 'Stop Wind' : 'Play Breeze'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 6: YOGASHALA (POSTURE CAMERA AI & ASANAS)
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'yoga' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Asana Selection Carousel */}
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
                      Key Alignment Focus:
                    </strong>
                    <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed">
                      {selectedAsana.keyFocus}
                    </p>
                  </div>

                  {selectedAsana.precautions && (
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gold-warm">
                      ⚠️ <strong>सावधानी (Precautions):</strong> {selectedAsana.precautions}
                    </div>
                  )}
                </div>
              </div>

              {/* Live Camera Viewport */}
              <div className="lg:col-span-8 space-y-4">
                <div className="relative aspect-4/3 w-full bg-black rounded-3xl overflow-hidden border-2 border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-center">
                  
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] ${isCameraActive && !isSimulatedMode ? 'opacity-100' : 'opacity-0'}`}
                  />

                  <canvas
                    ref={canvasRef}
                    width={640}
                    height={480}
                    className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] pointer-events-none z-10 ${isCameraActive ? 'opacity-100' : 'opacity-0'}`}
                  />

                  {poseModelLoading && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center text-white">
                      <div className="w-12 h-12 border-3 border-sage border-t-transparent rounded-full animate-spin mb-4" />
                      <h4 className="font-bold text-sm text-white font-serif">
                        AI model load ho raha hai...
                      </h4>
                      <p className="text-xs text-white/70 mt-1 max-w-xs">
                        Real-time skeletal tracking model initialize ho raha hai.
                      </p>
                    </div>
                  )}

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

                  {isCameraActive && (
                    <div className="absolute bottom-3 left-3 right-3 z-20 bg-black/80 backdrop-blur-md p-3 rounded-2xl border border-white/15 text-white flex items-center justify-between gap-3">
                      <div className="text-xs">
                        <span className="text-[10px] text-emerald-400 font-bold uppercase block">AI Instructor:</span>
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
            TAB 7: CURATED WELLNESS JOURNEYS (DAILY FLOW)
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
                        <div className="w-10 h-10 rounded-2xl bg-gold-warm/20 text-gold-warm flex items-center justify-center">
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
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Himalayan Protocol:</span>
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
          </div>
        )}

        {/* Sub-view Footer: Back to Hub */}
        {activeTab !== 'hub' && (
          <div className="pt-6 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <p className="text-xs text-muted">
              सत्र समाप्त हुआ? अन्य दिव्य अभ्यासों के लिए आरोग्यशाला हब पर लौटें।
            </p>
            <button
              onClick={() => handleTabChange('hub')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sage/10 hover:bg-sage/20 text-sage dark:text-booti-glow font-bold text-xs sm:text-sm transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← आरोग्यशाला हब पर वापस जाएं (Back to Hub)</span>
            </button>
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
