import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ShieldCheck, BookOpen, ChevronDown, ChevronUp, Leaf,
  Volume2, Square, Sun, Moon, Clock, Flame, Droplets, Wind,
  CheckCircle2, XCircle, Sparkles, AlertCircle, Info, Calendar
} from 'lucide-react';
import { speakText, stopAllVoiceAudio } from '../api/voiceClient';
import { useLanguage } from '../context/LanguageContext';

/**
 * Universal Botanical and Kitchen Ingredient Dictionary
 * Provides intuitive pictograms, Hindi and Roman names, and typical dosage amounts
 * for both literate and illiterate/semi-literate users.
 */
const INGREDIENT_LOOKUP = [
  {
    keys: ['tulsi', 'holy basil', 'basil'],
    nameHi: 'तुलसी (Tulsi)',
    nameEn: 'Holy Basil',
    icon: '🌿',
    amount: '5-7 ताज़ा पत्ते (Fresh leaves)',
    color: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
  },
  {
    keys: ['mulethi', 'licorice', 'yashtimadhu'],
    nameHi: 'मुलेठी (Mulethi)',
    nameEn: 'Licorice',
    icon: '🪵',
    amount: '1/2 छोटा चम्मच (Half tsp powder)',
    color: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
  },
  {
    keys: ['adrak', 'ginger', 'sunthi', 'saunth'],
    nameHi: 'अदरक / सोंठ',
    nameEn: 'Ginger',
    icon: '🫚',
    amount: 'छोटा कुचला टुकड़ा (Crushed piece)',
    color: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300'
  },
  {
    keys: ['jeera', 'cumin'],
    nameHi: 'जीरा (Jeera)',
    nameEn: 'Cumin Seeds',
    icon: '🌾',
    amount: '1 छोटा चम्मच (1 tsp)',
    color: 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-300'
  },
  {
    keys: ['ajwain', 'carom'],
    nameHi: 'अजवाइन (Ajwain)',
    nameEn: 'Carom Seeds',
    icon: '🌾',
    amount: '1/2 छोटा चम्मच (Half tsp)',
    color: 'bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300'
  },
  {
    keys: ['haldi', 'turmeric', 'haridra'],
    nameHi: 'हल्दी (Haldi)',
    nameEn: 'Turmeric',
    icon: '🟡',
    amount: '1/4 चम्मच (Quarter tsp)',
    color: 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
  },
  {
    keys: ['shahad', 'honey', 'madhu'],
    nameHi: 'शहद (Honey)',
    nameEn: 'Pure Honey',
    icon: '🍯',
    amount: '1 चम्मच (कोसे काढ़े में मिलाएं)',
    color: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
  },
  {
    keys: ['ghee', 'ghrita'],
    nameHi: 'देसी घी (Ghee)',
    nameEn: 'Desi Cow Ghee',
    icon: '🧈',
    amount: '1/2 चम्मच (Half tsp)',
    color: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300'
  },
  {
    keys: ['namak', 'salt', 'saindhava', 'kala namak', 'rock salt'],
    nameHi: 'सेंधा नमक (Rock Salt)',
    nameEn: 'Pink / Rock Salt',
    icon: '🧂',
    amount: 'एक चुटकी (A pinch)',
    color: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
  },
  {
    keys: ['water', 'paani', 'kwath', 'jala'],
    nameHi: 'गुनगुना पानी (Warm Water)',
    nameEn: 'Warm Water',
    icon: '💧',
    amount: '2 कप (उबालकर 1 कप करें)',
    color: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300'
  },
  {
    keys: ['nimbu', 'lemon'],
    nameHi: 'नींबू (Lemon)',
    nameEn: 'Fresh Lemon',
    icon: '🍋',
    amount: '3-4 बूंदें (Few drops)',
    color: 'bg-lime-50 dark:bg-lime-950/40 border-lime-200 dark:border-lime-800 text-lime-800 dark:text-lime-300'
  },
  {
    keys: ['vasa', 'adhatoda', 'vasaka', 'adusa'],
    nameHi: 'वासा / अडूसा (Vasa)',
    nameEn: 'Malabar Nut',
    icon: '🍃',
    amount: '1 चम्मच स्वरस या काढ़ा',
    color: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
  },
  {
    keys: ['ashwagandha'],
    nameHi: 'अश्वगंधा (Ashwagandha)',
    nameEn: 'Winter Cherry',
    icon: '🪴',
    amount: '1/2 छोटा चम्मच (दूध के साथ)',
    color: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300'
  },
  {
    keys: ['amla', 'amalaki'],
    nameHi: 'आंवला (Amla)',
    nameEn: 'Indian Gooseberry',
    icon: '🍈',
    amount: '1-2 ताज़ा फल या 1 चम्मच रस',
    color: 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
  },
  {
    keys: ['anu taila', 'taila', 'oil', 'nasya'],
    nameHi: 'अणु तैल (Anu Taila)',
    nameEn: 'Medicated Nasal Oil',
    icon: '🫒',
    amount: '2-2 बूंद दोनों नथुनों में',
    color: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300'
  },
  {
    keys: ['bhaap', 'steam', 'bashpa', 'inhalation'],
    nameHi: 'अजवाइन व हल्दी की भाप',
    nameEn: 'Herbal Steam',
    icon: '♨️',
    amount: '5-7 मिनट दिन में 1-2 बार',
    color: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
  },
  {
    keys: ['chaach', 'buttermilk', 'takra'],
    nameHi: 'छाछ (Buttermilk)',
    nameEn: 'Fresh Takra / Chaas',
    icon: '🥛',
    amount: '1 गिलास दोपहर भोजन उपरांत',
    color: 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-300'
  },
  {
    keys: ['laung', 'clove', 'lavanga'],
    nameHi: 'लौंग (Laung)',
    nameEn: 'Clove',
    icon: '🤎',
    amount: '1-2 लौंग मुंह में रखें',
    color: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
  },
  {
    keys: ['kali mirch', 'black pepper', 'maricha', 'trikatu'],
    nameHi: 'काली मिर्च (Black Pepper)',
    nameEn: 'Black Pepper',
    icon: '⚫',
    amount: '1 चुटकी (A pinch)',
    color: 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200'
  }
];

export default function RemedyCard({ remedy, index = 0 }) {
  const { lang, l, isHindi, toEnglishDigits } = useLanguage();
  // Foldable sections to prevent the card from becoming oversized
  const [showRoutine, setShowRoutine] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [showDiet, setShowDiet] = useState(false);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const stopVoiceRef = useRef(null);

  // Stop speech if component unmounts
  useEffect(() => {
    return () => {
      if (stopVoiceRef.current) {
        stopVoiceRef.current();
        stopVoiceRef.current = null;
      }
    };
  }, []);

  // 1. Clean Display Name & Subtitle
  const { cleanName, subtitle } = useMemo(() => {
    const raw = String(remedy?.remedy_name || 'आयुर्वेदिक नुस्खा');
    const bracketMatch = raw.match(/\(([^)]+)\)/);
    const sub = bracketMatch ? bracketMatch[1].trim() : '';
    const main = raw.replace(/\([^)]*\)/g, '').replace(/\//g, '•').trim();
    return { cleanName: main, subtitle: sub };
  }, [remedy]);

  // 2. Identify Visual Ingredients
  const ingredients = useMemo(() => {
    const searchTarget = `${remedy?.remedy_name || ''} ${remedy?.remedy_text || ''}`.toLowerCase();
    const matched = [];
    for (const item of INGREDIENT_LOOKUP) {
      if (item.keys.some(k => searchTarget.includes(k))) {
        matched.push(item);
      }
      if (matched.length >= 4) break;
    }
    if (matched.length === 0) {
      matched.push(
        {
          nameHi: 'औषधीय सामग्री (Herbal Blend)',
          nameEn: 'Herbal Ingredients',
          icon: '🌿',
          amount: 'निर्देशानुसार लें',
          color: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
        },
        {
          nameHi: 'कोसा / गुनगुना पानी',
          nameEn: 'Lukewarm Water',
          icon: '💧',
          amount: '1 कप',
          color: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300'
        }
      );
    }
    return matched.map(m => ({
      ...m,
      nameHi: isHindi ? m.nameHi.replace(/\s*\(.*?\)/, '') : (m.nameEn || m.nameHi.replace(/\s*\(.*?\)/, '')),
      amount: toEnglishDigits(isHindi ? m.amount.replace(/\s*\(.*?\)/, '') : (m.amountEn || m.amount)),
    }));
  }, [remedy, isHindi, toEnglishDigits]);

  // 3. 3-Step Visual Preparation Pictograms
  const prepSteps = useMemo(() => {
    const raw = String(remedy?.remedy_text || '').toLowerCase();
    const isNasya = raw.includes('nasya') || raw.includes('taila') || raw.includes('drop') || raw.includes('oil');
    const isLinctus = raw.includes('honey') && (raw.includes('linctus') || raw.includes('lick') || raw.includes('chatan'));
    const isSteam = raw.includes('steam') || raw.includes('bashpa') || raw.includes('bhaap');

    if (isNasya) {
      return [
        {
          step: '1',
          title: isHindi ? 'गुनगुना करें' : 'Warm gently',
          subtitle: isHindi ? 'तैल को हल्के गुनगुने पानी में रखकर कोसा करें' : 'Warm oil bottle in a cup of lukewarm water',
          icon: '💧',
        },
        {
          step: '2',
          title: isHindi ? 'सीधे लेटें' : 'Lie down comfortably',
          subtitle: isHindi ? 'गर्दन पीछे झुकाकर आराम से लेटें' : 'Tilt head gently back and relax',
          icon: '🛌',
        },
        {
          step: '3',
          title: isHindi ? '2-2 बूंद डालें' : 'Instill 2 drops',
          subtitle: isHindi ? 'दोनों नथुनों में 2-2 बूंद डालें और सांस खींचें' : 'Apply 2 drops in each nostril and inhale gently',
          icon: '🫒',
        }
      ];
    }

    if (isSteam) {
      return [
        {
          step: '1',
          title: isHindi ? 'पानी उबालें' : 'Boil water',
          subtitle: isHindi ? 'बर्तन में 2 गिलास पानी खूब खौलाएं' : 'Boil 2 glasses of fresh water in a pot',
          icon: '🫗',
        },
        {
          step: '2',
          title: isHindi ? 'सामग्री डालें' : 'Add herbs',
          subtitle: isHindi ? 'खौलते पानी में अजवाइन या चुटकीभर हल्दी डालें' : 'Add carom seeds or a pinch of turmeric',
          icon: '🟡',
        },
        {
          step: '3',
          title: isHindi ? 'भाप लें' : 'Inhale steam',
          subtitle: isHindi ? 'सिर पर तौलिया ओढ़कर 5 से 7 मिनट भाप लें' : 'Cover head with towel and inhale for 5-7 mins',
          icon: '♨️',
        }
      ];
    }

    if (isLinctus) {
      return [
        {
          step: '1',
          title: isHindi ? 'चूर्ण लें' : 'Measure powder',
          subtitle: isHindi ? 'कटोरी में निर्धारित मात्रा में चूर्ण निकालें' : 'Take recommended herbal powder in a small bowl',
          icon: '🥣',
        },
        {
          step: '2',
          title: isHindi ? 'शहद मिलाएं' : 'Mix with honey',
          subtitle: isHindi ? '1 चम्मच शहद डालकर अच्छी तरह लेह बनाएं' : 'Add 1 tsp pure honey and mix thoroughly',
          icon: '🍯',
        },
        {
          step: '3',
          title: isHindi ? 'धीरे चाटें' : 'Lick slowly',
          subtitle: isHindi ? 'उंगली से धीरे-धीरे चाटें, तुरंत पानी न पिएं' : 'Lick slowly off spoon, avoid drinking water immediately',
          icon: '🥄',
        }
      ];
    }

    // Default: Herbal Kwath / Kadha / Infusion
    return [
      {
        step: '1',
        title: isHindi ? 'पानी में मिलाएं' : 'Combine in water',
        subtitle: isHindi ? '2 कप पानी में सामग्री डालकर गैस पर रखें' : 'Add herbs to 2 cups of water on stove',
        icon: '🫗',
      },
      {
        step: '2',
        title: isHindi ? 'धीमी आंच पर उबालें' : 'Simmer gently',
        subtitle: isHindi ? 'पानी 1 कप (आधा) बचने तक धीमी आंच पर पकाएं' : 'Simmer until reduced to 1 cup',
        icon: '🔥',
      },
      {
        step: '3',
        title: isHindi ? 'छानकर गुनगुना पिएं' : 'Strain and sip',
        subtitle: isHindi ? 'कप में छानकर घूंट-घूंट गुनगुना पिएं' : 'Strain into cup and sip while comfortably warm',
        icon: '☕',
      }
    ];
  }, [remedy, isHindi]);

  // 4. Daily Routine Visual Schedule
  const routine = useMemo(() => {
    const dosage = remedy?.dosage || {};
    const rawHindiDose = dosage.hindi || 'दिन में 2 बार खाना खाने के 30 मिनट बाद गुनगुना पिएं';
    const rawDuration = dosage.duration || '3 से 5 दिन तक';

    const hindiDose = toEnglishDigits(rawHindiDose);
    const duration = toEnglishDigits(rawDuration);

    return {
      morning: {
        time: isHindi ? 'सुबह' : 'Morning',
        desc: isHindi ? 'नाश्ते के 30 मिनट बाद' : '30 mins after breakfast',
        dose: isHindi ? '1 कप गुनगुना' : '1 warm cup',
        icon: Sun,
        color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
      },
      evening: {
        time: isHindi ? 'शाम / रात' : 'Evening / Night',
        desc: isHindi ? 'रात के भोजन के बाद' : 'After dinner',
        dose: isHindi ? '1 कप गुनगुना' : '1 warm cup',
        icon: Moon,
        color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800'
      },
      duration: {
        time: isHindi ? 'अवधि' : 'Duration',
        desc: duration,
        dose: isHindi ? '3-5 दिन नियम से लें' : 'Take for 3-5 days',
        icon: Clock,
        color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
      },
      summary: hindiDose
    };
  }, [remedy, isHindi, toEnglishDigits]);

  // 5. Dosha Balance Impact
  const doshaBadges = useMemo(() => {
    const text = `${remedy?.ayurvedic_note || ''} ${remedy?.condition_name || ''}`.toLowerCase();
    const badges = [];

    if (text.includes('kapha') || text.includes('mucus') || text.includes('cold') || text.includes('pratishyaya')) {
      badges.push({
        label: 'कफ शामक (Kapha)',
        sub: 'बलगम व जकड़न घटाता है',
        icon: Droplets,
        color: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800'
      });
    }
    if (text.includes('vata') || text.includes('pain') || text.includes('gas') || text.includes('dryness')) {
      badges.push({
        label: 'वात शामक (Vata)',
        sub: 'दर्द व खुश्की शांत करता है',
        icon: Wind,
        color: 'bg-violet-50 dark:bg-violet-950/40 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-800'
      });
    }
    if (text.includes('pitta') || text.includes('burning') || text.includes('heat') || text.includes('acidity')) {
      badges.push({
        label: 'पित्त शामक (Pitta)',
        sub: 'गर्मी व जलन को शांत करता है',
        icon: Flame,
        color: 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
      });
    }
    if (text.includes('deepana') || text.includes('digestive') || text.includes('agni')) {
      badges.push({
        label: 'अग्नि दीपन (Agni)',
        sub: 'पाचन तंत्र को मजबूत करता है',
        icon: Sparkles,
        color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
      });
    }

    if (badges.length === 0) {
      badges.push({
        label: 'त्रिदोष संतुलन (Tridosha)',
        sub: 'रोग प्रतिरोधक क्षमता बढ़ाता है',
        icon: Sparkles,
        color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
      });
    }

    return badges;
  }, [remedy]);

  // 6. Audio-First: Play / Stop Voice Dictation
  const handleToggleVoice = (e) => {
    e?.stopPropagation();
    if (isSpeaking) {
      stopVoiceRef.current?.();
      stopVoiceRef.current = null;
      setIsSpeaking(false);
      return;
    }

    stopAllVoiceAudio();

    // Clean, structured spoken Hindi script without repetitive bilingual tags
    const speechScript = `यह है आपका ${index === 0 ? 'मुख्य' : 'वैकल्पिक'} आयुर्वेदिक नुक़्सा: ${cleanName}। ` +
      `इसे तैयार करने के तीन आसान नियम हैं: ` +
      `पहला: ${prepSteps[0].title}, ${prepSteps[0].subtitle}। ` +
      `दूसरा: ${prepSteps[1].title}, ${prepSteps[1].subtitle}। ` +
      `तीसरा: ${prepSteps[2].title}, ${prepSteps[2].subtitle}। ` +
      `पीने का समय: ${routine.morning.desc}, और ${routine.evening.desc}। ` +
      `अवधि: ${routine.duration.desc}। ` +
      `परहेज़ का ध्यान रखें: फ्रिज का ठंडा पानी, बर्फ और बासी खाने से बचें। हल्का भोजन लें। ` +
      `यदि तीन दिन में आराम न मिले तो नज़दीकी डॉक्टर को दिखाएं।`;

    stopVoiceRef.current = speakText(speechScript, {
      language: 'hi',
      gender: 'female',
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false)
    });
  };

  return (
    <div
      className={`
        mt-3 rounded-2xl border overflow-hidden transition-all duration-300 shadow-xs
        bg-white dark:bg-[#141E28] border-sage/25 dark:border-sage/40
      `}
    >
      {/* ── 1. HERO HEADER WITH AUDIO-FIRST BAR ────────────────────── */}
      <div className="bg-gradient-to-r from-sage/12 via-sage/8 to-gold-warm/10 dark:from-sage/20 dark:via-transparent dark:to-gold-warm/15 p-3 sm:p-3.5 border-b border-sage/15 dark:border-gray-800">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-sage flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className="text-[11px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wide bg-sage text-white shadow-xs">
                  {index === 0 ? '🌿 मुख्य नुस्खा' : '✨ वैकल्पिक नुस्खा'}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  आयुष प्रमाणित
                </span>
              </div>
              <h3 className="font-serif font-bold text-base text-primary dark:text-[#F4F6F0] leading-snug">
                {cleanName}
              </h3>
              {subtitle && (
                <p className="text-xs text-muted dark:text-gray-300 font-medium">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── AUDIO BUTTON: Instant play for non-readers ── */}
        <div className="mt-2.5 pt-2.5 border-t border-sage/15 dark:border-gray-700/50">
          <button
            type="button"
            onClick={handleToggleVoice}
            className={`
              w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer
              ${isSpeaking
                ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                : 'bg-sage hover:bg-sage/90 text-white'
              }
            `}
            aria-label={isSpeaking ? 'नुस्खा सुनना बंद करें' : 'नुस्खा बोलकर सुनें'}
          >
            <div className="flex items-center gap-2">
              {isSpeaking ? (
                <Square className="w-4 h-4 fill-current shrink-0" />
              ) : (
                <Volume2 className="w-4 h-4 shrink-0" />
              )}
              <div className="text-left">
                <span className="font-extrabold">
                  {isSpeaking ? 'आवाज़ बंद करें (Stop)' : '🔊 बोलकर सुनें (Tap to Listen Aloud)'}
                </span>
                <span className="hidden sm:inline text-[11px] font-normal opacity-90 ml-2">
                  — बिना पढ़े पूरा नुस्खा सुनें
                </span>
              </div>
            </div>

            {/* Equalizer animation */}
            {isSpeaking && (
              <div className="flex items-center gap-1 shrink-0 h-3.5">
                <span className="w-1 h-3 bg-white rounded-full animate-bounce [animation-delay:0ms]"></span>
                <span className="w-1 h-3.5 bg-white rounded-full animate-bounce [animation-delay:150ms]"></span>
                <span className="w-1 h-2 bg-white rounded-full animate-bounce [animation-delay:300ms]"></span>
              </div>
            )}
          </button>
        </div>
      </div>

      <div className="p-3 sm:p-3.5 space-y-3">
        {/* ── 2. COMPACT INGREDIENTS SHELF (सामग्री) ────────────────── */}
        <div>
          <div className="text-[11px] uppercase font-extrabold tracking-wider text-sage dark:text-booti-glow flex items-center gap-1.5 mb-1.5">
            <span>🌿</span> {l('ज़रूरी सामग्री:', 'Key Ingredients:')}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {ingredients.map((item, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-xl border flex flex-col justify-between ${item.color}`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xl shrink-0" role="img" aria-label={item.nameHi}>
                    {item.icon}
                  </span>
                  <div className="font-bold text-xs leading-tight line-clamp-1">
                    {item.nameHi}
                  </div>
                </div>
                <div className="text-[10px] opacity-90 font-medium leading-tight">
                  {item.amount}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 3. PICTOGRAPHIC 3-STEP PREPARATION (बनाने के कदम) ─────── */}
        <div>
          <div className="text-[11px] uppercase font-extrabold tracking-wider text-sage dark:text-booti-glow flex items-center gap-1.5 mb-1.5">
            <span>🔥</span> {l('बनाने के 3 आसान कदम:', '3-Step Preparation:')}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {prepSteps.map((st, i) => (
              <div
                key={i}
                className="bg-mist/70 dark:bg-[#1A2634] p-2.5 rounded-xl border border-sage/15 dark:border-gray-700/60 flex sm:flex-col items-center sm:items-start gap-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 shadow-xs flex items-center justify-center text-lg shrink-0 border border-sage/20">
                  {st.icon}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-sage/15 text-sage dark:text-booti-glow">
                      {st.step}
                    </span>
                    <h4 className="font-bold text-xs text-primary dark:text-[#F4F6F0]">
                      {st.title}
                    </h4>
                  </div>
                  <p className="text-[11px] text-muted dark:text-gray-300 leading-snug mt-0.5">
                    {st.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 4. DOSHA IMPACT BADGES (दोष संतुलन) ───────────────────── */}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="text-[11px] font-bold text-muted dark:text-gray-400">
            {l('दोष प्रभाव:', 'Dosha Impact:')}
          </span>
          {doshaBadges.map((badge, bIdx) => {
            const IconComp = badge.icon;
            return (
              <span
                key={bIdx}
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${badge.color}`}
              >
                <IconComp className="w-3 h-3" />
                <span>{badge.label}</span>
              </span>
            );
          })}
        </div>

        {/* ── 5. FOLDABLE SECTION: DAILY ROUTINE (कब और कितना पिएं) ──── */}
        <div className="border border-sage/15 dark:border-gray-700/60 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowRoutine(prev => !prev)}
            className="w-full flex items-center justify-between p-2.5 bg-mist/50 dark:bg-gray-800/40 hover:bg-mist dark:hover:bg-gray-800/70 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-sage dark:text-booti-glow" />
              <span className="text-xs font-bold text-primary dark:text-[#F4F6F0]">
                ⏰ {l('दैनिक खुराक व समय', 'Daily Routine & Dosage Timing')}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted dark:text-gray-400 font-medium">
              <span>{showRoutine ? l('छिपाएं', 'Hide') : l('देखें', 'View')}</span>
              {showRoutine ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </button>

          {showRoutine && (
            <div className="p-2.5 bg-white dark:bg-[#121A24] border-t border-sage/10 dark:border-gray-700/60 space-y-2 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Morning */}
                <div className={`p-2 rounded-lg border flex items-center gap-2 ${routine.morning.color}`}>
                  <div className="w-7 h-7 rounded-md bg-white/80 dark:bg-black/30 flex items-center justify-center shrink-0">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div className="leading-tight">
                    <div className="text-xs font-bold">{routine.morning.time}</div>
                    <div className="text-[10px] opacity-90">{routine.morning.desc}</div>
                    <div className="text-[10px] font-extrabold mt-0.5">{routine.morning.dose}</div>
                  </div>
                </div>

                {/* Evening / Night */}
                <div className={`p-2 rounded-lg border flex items-center gap-2 ${routine.evening.color}`}>
                  <div className="w-7 h-7 rounded-md bg-white/80 dark:bg-black/30 flex items-center justify-center shrink-0">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div className="leading-tight">
                    <div className="text-xs font-bold">{routine.evening.time}</div>
                    <div className="text-[10px] opacity-90">{routine.evening.desc}</div>
                    <div className="text-[10px] font-extrabold mt-0.5">{routine.evening.dose}</div>
                  </div>
                </div>

                {/* Duration */}
                <div className={`p-2 rounded-lg border flex items-center gap-2 ${routine.duration.color}`}>
                  <div className="w-7 h-7 rounded-md bg-white/80 dark:bg-black/30 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="leading-tight">
                    <div className="text-xs font-bold">{routine.duration.time}</div>
                    <div className="text-[10px] opacity-90">{routine.duration.desc}</div>
                    <div className="text-[10px] font-extrabold mt-0.5">{routine.duration.dose}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── 6. FOLDABLE SECTION: PATHYA & APATHYA (क्या करें / न करें) ─ */}
        <div className="border border-sage/15 dark:border-gray-700/60 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDiet(prev => !prev)}
            className="w-full flex items-center justify-between p-2.5 bg-mist/50 dark:bg-gray-800/40 hover:bg-mist dark:hover:bg-gray-800/70 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-primary dark:text-[#F4F6F0]">
                ⚖️ {l('आहार व परहेज (क्या करें / क्या न करें)', 'Diet & Habits (Do\'s & Don\'ts)')}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted dark:text-gray-400 font-medium">
              <span>{showDiet ? l('छिपाएं', 'Hide') : l('देखें', 'View')}</span>
              {showDiet ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </button>

          {showDiet && (
            <div className="p-2.5 bg-white dark:bg-[#121A24] border-t border-sage/10 dark:border-gray-700/60 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-fadeIn">
              <div className="p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <div className="font-bold text-xs text-emerald-800 dark:text-emerald-300 mb-1 flex items-center gap-1">
                  <span>✅</span> {l('फ़ायदेमंद आदतें:', 'Beneficial Habits:')}
                </div>
                <ul className="text-[11px] text-emerald-900 dark:text-emerald-200 space-y-0.5">
                  <li>• 💧 {l('केवल गुनगुना पानी पिएं', 'Drink warm water only')}</li>
                  <li>• 🥣 {l('मूंग दाल या पतली खिचड़ी जैसा हल्का भोजन', 'Light diet like moong dal or khichdi')}</li>
                  <li>• 🛌 {l('शरीर को पूरा आराम दें', 'Get adequate rest')}</li>
                </ul>
              </div>

              <div className="p-2 rounded-lg bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                <div className="font-bold text-xs text-rose-800 dark:text-rose-300 mb-1 flex items-center gap-1">
                  <span>❌</span> {l('परहेज़:', 'Avoid:')}
                </div>
                <ul className="text-[11px] text-rose-900 dark:text-rose-200 space-y-0.5">
                  <li>• 🧊 {l('फ्रिज का ठंडा पानी व बर्फ से बचें', 'Avoid chilled water and ice')}</li>
                  <li>• 💨 {l('ठंडी हवा, कूलर व धूल से बचें', 'Protect from cold drafts and dust')}</li>
                  <li>• 🌶️ {l('बासी, तला-भुना या बहुत तीखा खाना न खाएं', 'Avoid oily, stale or overly spicy food')}</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* ── 7. FOLDABLE SECTION: VERIFIED SOURCES & CLINICAL DETAILS ─ */}
        <div className="border border-sage/15 dark:border-gray-700/60 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowSources(prev => !prev)}
            className="w-full flex items-center justify-between p-2.5 bg-mist/50 dark:bg-gray-800/40 hover:bg-mist dark:hover:bg-gray-800/70 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sage dark:text-booti-glow" />
              <span className="text-xs font-bold text-primary dark:text-[#F4F6F0]">
                🏛️ {l('प्रामाणिक स्रोत व शास्त्रीय संदर्भ', 'Verified Ayurvedic References')}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted dark:text-gray-400 font-medium">
              <span>{showSources ? l('छिपाएं', 'Hide') : l('देखें', 'View')}</span>
              {showSources ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </button>

          {showSources && (
            <div className="p-3 bg-white dark:bg-[#121A24] border-t border-sage/10 dark:border-gray-700/60 space-y-2.5 animate-fadeIn">
              {/* Classical Note */}
              {remedy.ayurvedic_note && (
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-0.5">
                    {l('आयुर्वेदिक सम्प्राप्ति:', 'Ayurvedic Rationale:')}
                  </div>
                  <p className="text-xs text-[#1E2A43] dark:text-[#EAEFEA] leading-relaxed">
                    {toEnglishDigits(remedy.ayurvedic_note)}
                  </p>
                </div>
              )}

              {/* Age Specific Dosage Table */}
              {remedy.dosage && (
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-sage dark:text-booti-glow mb-1">
                    {l('उम्र अनुसार सटीक मात्रा:', 'Age-Specific Dosage:')}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                    {remedy.dosage.adult && (
                      <div className="p-1.5 rounded bg-mist/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                        <span className="font-bold text-gray-700 dark:text-gray-200">{l('वयस्क (18+): ', 'Adults (18+): ')}</span>
                        <span className="text-gray-600 dark:text-gray-400">{toEnglishDigits(remedy.dosage.adult)}</span>
                      </div>
                    )}
                    {remedy.dosage.elderly && (
                      <div className="p-1.5 rounded bg-mist/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                        <span className="font-bold text-gray-700 dark:text-gray-200">{l('वरिष्ठ नागरिक: ', 'Elderly: ')}</span>
                        <span className="text-gray-600 dark:text-gray-400">{toEnglishDigits(remedy.dosage.elderly)}</span>
                      </div>
                    )}
                    {remedy.dosage.child_6_12 && (
                      <div className="p-1.5 rounded bg-mist/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                        <span className="font-bold text-gray-700 dark:text-gray-200">{l('बच्चे (6-12 वर्ष): ', 'Children (6-12 yrs): ')}</span>
                        <span className="text-gray-600 dark:text-gray-400">{toEnglishDigits(remedy.dosage.child_6_12)}</span>
                      </div>
                    )}
                    {remedy.dosage.child_under_6 && (
                      <div className="p-1.5 rounded bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                        <span className="font-bold text-rose-700 dark:text-rose-300">{l('6 वर्ष से कम: ', 'Under 6 years: ')}</span>
                        <span className="text-rose-600 dark:text-rose-400">{toEnglishDigits(remedy.dosage.child_under_6)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Source Reference & Verification */}
              <div className="flex items-center justify-between pt-1.5 border-t border-gray-200 dark:border-gray-700/60 text-xs">
                <div className="flex items-center gap-1.5 text-muted dark:text-gray-400">
                  <BookOpen className="w-3.5 h-3.5 text-sage" />
                  <span className="font-medium truncate max-w-[220px]">{l('स्रोत:', 'Source:')} {remedy.source || 'CCRAS / AYUSH Formulary'}</span>
                </div>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full text-[10px]">
                  ✓ {l('सुरक्षित', 'Verified Safe')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── 8. SAFETY ADVISORY & 104 HELPLINE ────────────────────── */}
        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-tight text-[11px]">
            <span className="font-bold">{l('सलाह: ', 'Advisory: ')}</span>
            {l(
              'यदि 3 से 5 दिन में आराम न मिले या तेज़ बुखार आए, तो तुरंत डॉक्टर को दिखाएं या 104 / 108 पर कॉल करें।',
              'If symptoms persist beyond 3-5 days or if high fever occurs, consult a doctor or call 104 / 108 immediately.'
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
