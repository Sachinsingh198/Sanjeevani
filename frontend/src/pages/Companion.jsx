import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  HeartHandshake, Mic, MicOff, Send, Volume2, VolumeX,
  Sparkles, Heart, PhoneCall, BookOpen, ShieldAlert,
  ArrowLeft, MessageSquare, Home, ArrowRight, Play, Pause, Flame
} from 'lucide-react';
import { speakCue } from '../lib/audioSynthesizer';
import toast from 'react-hot-toast';
import StructuredBotMessage from '../components/StructuredBotMessage';
import PageVoiceGuide from '../components/PageVoiceGuide';
import BackButton from '../components/BackButton';
import { getStories, getDailyThought, sendCompanionMessage } from '../api/companionClient';

/* ── Mood options ───────────────────────────────────────────────────────── */
const MOOD_OPTIONS = [
  { id: 'lonely',    label: 'Akela Hoon',       sub: 'अकेला',      icon: '🕊️', speak: 'Akela-pan lag raha hai. Saathi se baat karke mann halka karein.', color: 'bg-gold-warm/15 text-gold-warm dark:text-gold-warm border-gold-warm/30' },
  { id: 'sad',       label: 'Udas Hoon',         sub: 'उदास',       icon: '🌧️', speak: 'Udaasi mehsoos ho rahi hai. Saathi aapko sunne ke liye taiyaar hai.', color: 'bg-rose-soft/15 text-rose-soft dark:text-rose-soft border-rose-soft/30' },
  { id: 'nostalgic', label: 'Yaadein Aa Rahi',   sub: 'यादें',     icon: '💭', speak: 'Purani yaadein sataa rahi hain. Aaiye baatein karein.', color: 'bg-warm-indigo/15 text-primary dark:text-muted border-warm-indigo/30' },
  { id: 'anxious',   label: 'Chinta Hai',        sub: 'चिंता',     icon: '🍃', speak: 'Kisi baat ki chinta ya ghabrahat hai. Aaram se batayein.', color: 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-300' },
  { id: 'peaceful',  label: 'Mann Shant Hai',    sub: 'शांत',      icon: '🌸', speak: 'Mann shaant aur prasann hai. Yeh bahut achhi बात hai.', color: 'bg-sage/15 text-sage dark:text-booti-glow border-sage/30' },
];

/* ── Gateway Portals for Hierarchy (Pages inside Page) ─────────────────── */
const SAATHI_PORTALS = [
  {
    id: 'chat',
    slug: 'chat',
    titleHi: 'बातचीत कक्ष',
    titleEn: 'Heart-to-Heart Chat',
    subHi: 'साथी से अपने दिल की बात कहें',
    subEn: 'Speak your heart out with your companion',
    descHi: 'अकेलापन, मन का बोझ या कोई भी चिंता — साथी हमेशा बिना किसी झिझक के सुनने और सांत्वना देने के लिए तैयार है।',
    descEn: 'Loneliness or worries — your companion is always here to listen and comfort you.',
    icon: '💬',
    badgeHi: '24x7 उपलब्ध',
    badgeEn: '24x7 Available',
    badgeColor: 'bg-gold-warm/15 text-gold-warm border-gold-warm/30',
    btnTextHi: 'बातचीत कक्ष में प्रवेश करें →',
    btnTextEn: 'Enter Chat Room →',
    btnColor: 'bg-gold-warm text-primary hover:bg-gold-warm/90',
  },
  {
    id: 'voice',
    slug: 'chat?voice=1',
    titleHi: 'आवाज़ में संवाद',
    titleEn: 'Live Voice Room',
    subHi: 'बिना लिखे सिर्फ बोलकर बातें करें',
    subEn: 'Talk naturally without typing',
    descHi: 'टाइप करने की कोई आवश्यकता नहीं। बस बोलिए और साथी भाषिणी या सर्वम न्यूरल वाणी में आपसे सीधे बात करेगा।',
    descEn: 'No need to type. Just speak and your companion will respond in natural neural voice.',
    icon: '🎙️',
    badgeHi: 'न्यूरल वॉइस AI',
    badgeEn: 'Neural Voice AI',
    badgeColor: 'bg-sage/15 text-sage dark:text-booti-glow border-sage/30',
    btnTextHi: 'बोलकर बात शुरू करें →',
    btnTextEn: 'Start Speaking →',
    btnColor: 'bg-sage text-white hover:bg-sage/90',
  },
  {
    id: 'stories',
    slug: 'stories',
    titleHi: 'पहाड़ी लोक-कहानियां',
    titleEn: 'Pahadi Folk Stories',
    subHi: 'गढ़वाल और कुमाऊं की मिठास भरी प्रेरक कथाएं',
    subEn: 'Inspiring folklore from Garhwal & Kumaon',
    descHi: 'उत्तराखंड की प्राचीन लोक-कहानियां, जो मन को सुकून देती हैं और प्रेरणा से भर देती हैं। ऑडियो में सुनें या पढ़ें।',
    descEn: 'Traditional folk tales that bring calm and warmth. Listen aloud or read.',
    icon: '📖',
    badgeHi: 'ऑडियो वाचन',
    badgeEn: 'Audio Narration',
    badgeColor: 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30',
    btnTextHi: 'कहानियां सुनें व पढ़ें →',
    btnTextEn: 'Listen & Read Stories →',
    btnColor: 'bg-purple-600 text-white hover:bg-purple-700',
  },
  {
    id: 'help',
    slug: 'help',
    titleHi: 'सहायता व सुकून',
    titleEn: 'Helpline & Support',
    subHi: 'Tele-MANAS, राष्ट्रीय हेल्पलाइन व 5 मिनट विश्राम',
    subEn: 'Tele-MANAS, National Helpline & 5-min rest',
    descHi: 'मुश्किल समय में तुरंत मदद के लिए 14416 व अन्य आपातकालीन नंबर, और मन को तुरंत शांत करने वाले सरल अभ्यास।',
    descEn: 'Immediate toll-free help at 14416 and simple soothing exercises.',
    icon: '🆘',
    badgeHi: 'टोल-फ्री 14416',
    badgeEn: 'Toll-Free 14416',
    badgeColor: 'bg-rose-soft/15 text-rose-soft border-rose-soft/30',
    btnTextHi: 'सहायता केंद्र देखें →',
    btnTextEn: 'View Help Center →',
    btnColor: 'bg-rose-soft text-white hover:bg-rose-soft/90',
  },
];

/* ── Quick-prompt tiles shown on the "ghar" home tab ───────────────────── */
const QUICK_PROMPTS = [
  { icon: '📖', label: 'Kahani Sunao', sub: 'कहानी सुनाओ', prompt: 'Mujhe ek pahadi kahani sunao.' },
  { icon: '☀️', label: 'Subah Ki Baat', sub: 'सुबह की बात', prompt: 'Aaj subah kaise mehsoos ho raha hai mujhe?' },
  { icon: '🌿', label: 'Sukoon Ka Upaay', sub: 'सुकून का उपाय', prompt: 'Mann ko shant karne ke liye koi upaay batao.' },
  { icon: '💌', label: 'Koi Dua', sub: 'कोई दुआ', prompt: 'Mujhe koi achhi baat ya dua sunao.' },
];

/* ── Tabs config ────────────────────────────────────────────────────────── */
const TABS = [
  { id: 'ghar',  icon: '🏠', labelHi: 'मुख्य द्वार', labelEn: 'Home' },
  { id: 'baat',  icon: '💬', labelHi: 'बातचीत कक्ष', labelEn: 'Chat Room' },
  { id: 'kisse', icon: '📖', labelHi: 'कहानियां',     labelEn: 'Stories' },
  { id: 'madad', icon: '🆘', labelHi: 'सहायता',       labelEn: 'Help & Care' },
];

const INITIAL_MESSAGES = [
  {
    sender: 'companion',
    text:
      'Namaste! Swagat hai aapka Sanjeevani Saathi mein.\n\n'
      + 'Main hoon aapka apna dost — hamesha aapke paas hoon sunnae ke liye, baat karne ke liye.\n\n'
      + 'Aaj aapka din kaisa chal raha hai?',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
];

export default function Companion() {
  const { user } = useAuth();
  const { l, isHindi, toEnglishDigits } = useLanguage();
  const { subpage } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Derive active tab from subpage URL param
  const getTabFromSubpage = (sub) => {
    if (!sub || sub === 'ghar' || sub === 'home') return 'ghar';
    if (sub === 'chat' || sub === 'baat') return 'baat';
    if (sub === 'stories' || sub === 'kisse') return 'kisse';
    if (sub === 'help' || sub === 'madad') return 'madad';
    return 'ghar';
  };

  const activeTab = getTabFromSubpage(subpage);

  const basePath = location.pathname.includes('/companion')
    ? (location.pathname.startsWith('/patient') ? '/patient/companion' : '/mitra/companion')
    : (location.pathname.startsWith('/patient') ? '/patient/saathi' : '/mitra/saathi');

  const navigateToTab = (tabId) => {
    if (tabId === 'ghar') {
      navigate(basePath);
    } else {
      const slug = tabId === 'baat' ? 'chat' : tabId === 'kisse' ? 'stories' : 'help';
      navigate(`${basePath}/${slug}`);
    }
  };

  const [messages, setMessages]       = useState(INITIAL_MESSAGES);
  const [inputText, setInputText]     = useState('');
  const [selectedMood, setSelectedMood] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isReplying, setIsReplying]   = useState(false);
  const [stories, setStories]         = useState([]);
  const [dailyThought, setDailyThought] = useState(null);
  const [autoSpeak, setAutoSpeak]     = useState(true);
  const [playingStoryId, setPlayingStoryId] = useState(null);

  const handlePlayStoryAudio = (story) => {
    if (playingStoryId === story.id) {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setPlayingStoryId(null);
      toast('कहानी रोकी गई', { icon: '⏸️' });
    } else {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setPlayingStoryId(story.id);
      speakCue(story.text, 'hi-IN');
      toast.success(`🔊 "${story.title}" शुरू हो रही है`);
    }
  };

  const messagesEndRef = useRef(null);
  const chatInputRef   = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  /* Auto-resize textarea — compact starting height for mobile */
  useEffect(() => {
    const textarea = chatInputRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.min(Math.max(scrollHeight, 36), 110);
    textarea.style.height = `${newHeight}px`;
  }, [inputText]);

  useEffect(() => {
    getStories()
      .then((data) => { if (data?.stories) setStories(data.stories); })
      .catch(() => setStories([
        {
          id: 'story-1', title: 'Chidiyan Aur Shivram Dada Ki Dosti', duration: '3 min',
          summary: 'Garhwal ke ek akele dada ji aur ek gauraiya chidiya ki dosti ki dil chhoo lene wali kahani.',
          text: 'Gopeshwar ke paas ek gaon me Shivram Dada akele rehte the. Rojana subah ek choti gauraiya unke aangan me aati. Dada muskura kar kehte — "Tu mujhe kabhi akela nahi mehsoos hone deti!" Prakriti hamesha humare sath hoti hai.',
        },
        {
          id: 'story-2', title: 'Mandakini Ke Kinare Ki Shanti', duration: '4 min',
          summary: 'Nadi ki behti dhara se seekhein ki chinta ko kaise pahaadi hawa me behne diya jata hai.',
          text: 'Kedar ghaati me Mandakini nadi hamesha behti rehti hai. Pahaad chahe kitne bhi kathin hon, nadi rasta bana hi leti hai. Apni chintaon ko is behti nadi ke hawale kar dijiye.',
        },
        {
          id: 'story-3', title: 'Badrinath Ki Teetli', duration: '5 min',
          summary: 'Ek choti teetli ki yatra jo Badrinath tak pahunchi aur sabko khushiyaan di.',
          text: 'Badrinath ke paas ek rang birangi teetli rehti thi. Woh roz mandir ke charon taraf udti aur apni taraf se phoolon ka uphar chadhaati. Prakriti ki yeh chhoti si बात bahut badi khushi de sakti hai.',
        },
      ]));

    getDailyThought()
      .then((data) => { if (data?.thought) setDailyThought(data.thought); })
      .catch(() => setDailyThought({
        quote: 'Aap akele bilkul nahi hain — pahaadon ki shanti aur hamara sneh hamesha aapke sath hai.',
        author: 'Sanjeevani Saathi',
        action: 'Aaj thodi der dhoop me baithkar ek gunguni chai ka anand lein.',
      }));

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.continuous = false; rec.interimResults = false; rec.lang = 'hi-IN';
      rec.onresult = (e) => {
        const t = e.results[0][0].transcript;
        setInputText(t);
        handleSendMessage(t);
      };
      rec.onerror = () => setIsListening(false);
      rec.onend   = () => setIsListening(false);
      recognitionRef.current = rec;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Voice room auto-trigger when ?voice=1 query param is present
  useEffect(() => {
    if (searchParams.get('voice') === '1' && activeTab === 'baat') {
      const timer = setTimeout(() => {
        if (!isListening && recognitionRef.current) {
          try {
            recognitionRef.current.start();
            setIsListening(true);
            toast('आपकी आवाज़ सुन रहा हूँ... बोलिए', { icon: '🎙️' });
          } catch {
            // Already listening or unsupported
          }
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchParams, activeTab, isListening]);

  const handleToggleMic = () => {
    if (!recognitionRef.current) {
      toast.error('Voice input is not supported in this browser. Please type your message.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop(); setIsListening(false);
    } else {
      try {
        recognitionRef.current.start(); setIsListening(true);
        toast('Aapki aawaz sun raha hoon... Kahiye', { icon: '🎙️' });
      } catch { setIsListening(false); }
    }
  };

  const handleSelectMood = (mood) => {
    setSelectedMood(mood.id);
    handleSendMessage(`Maine abhi mehsoos kiya ki main thoda "${mood.label}" hoon.`, mood.id);
    navigate(`${basePath}/chat`);
  };

  const handleSendMessage = async (textToSend = inputText, overrideMood = selectedMood) => {
    const text = (textToSend || '').trim();
    if (!text) return;

    setMessages((prev) => [...prev, {
      sender: 'user', text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
    setInputText('');
    setIsReplying(true);

    try {
      const historyTurns = messages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant', text: m.text,
      }));
      const resData = await sendCompanionMessage({
        message: text,
        user_name: user?.name || 'Aadarniya Mitra',
        language: 'hindi',
        mood: overrideMood,
        history: historyTurns,
      });
      const replyText = resData.reply;
      setMessages((prev) => [...prev, {
        sender: 'companion', text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        emergency: resData.emergency_triggered,
      }]);
      if (autoSpeak) speakCue(replyText, 'hi-IN');
    } catch {
      const fallbacks = [
        'Aapki baat mere dil ko chhoo gayi. Main hamesha yahin hoon aapke liye.',
        'Aap bilkul akele nahi hain. Pahaadon ki hawa aur suraj ki dhoop bhi saath hain.',
        'Sanjeevani Saathi aapke sath hai. Aur kya mann me chal raha hai?',
      ];
      const reply = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      setMessages((prev) => [...prev, {
        sender: 'companion', text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      if (autoSpeak) speakCue(reply, 'hi-IN');
    } finally {
      setIsReplying(false);
    }
  };

  /* ── RENDER ─────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-mist dark:bg-card text-primary pb-20 safe-bottom-nav transition-colors duration-300">

      {/* ── Sleek Static Top Bar (Compact, minimal screen footprint) ──────────────── */}
      <div className="bg-white/90 dark:bg-card/90 border-b border-gray-200/60 dark:border-gray-800 py-2.5 px-3.5 sm:px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <BackButton fallback="/mitra" />
            <div className="min-w-0">
              <h1 className="font-serif text-sm sm:text-base font-bold text-primary truncate flex items-center gap-1.5">
                <span>संजीवनी साथी</span>
                <span className="text-sm">🤝</span>
              </h1>
            </div>
            {activeTab !== 'ghar' && (
              <button
                type="button"
                onClick={() => navigate(basePath)}
                className="hidden xs:inline-flex items-center gap-1 text-[11px] font-bold text-gold-warm dark:text-gold-warm bg-gold-warm/10 hover:bg-gold-warm/20 px-2 py-1 rounded-lg transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>हब</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href="tel:14416"
              className="touch-target inline-flex items-center gap-1.5 bg-rose-soft hover:bg-rose-soft/90 text-white text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-xl transition-all shadow-2xs"
              title="14416 Tele-MANAS Helpline"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>14416</span>
            </a>
            <button
              type="button"
              onClick={() => setAutoSpeak(!autoSpeak)}
              className={`touch-target p-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                autoSpeak
                  ? 'bg-sage/15 text-sage dark:text-booti-glow border-sage/30'
                  : 'bg-white dark:bg-warm-indigo text-muted border-gray-300 dark:border-gray-700'
              }`}
              title={autoSpeak ? l("आवाज़ चालू है", "Voice On") : l("आवाज़ बंद है", "Voice Muted")}
              aria-label="Toggle Voice"
            >
              {autoSpeak ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Sub-Nav Tabs (Static, scrolls naturally without sticking to screen) ─────────────── */}
      <div className="relative z-10 bg-card/95 dark:bg-card/95 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-800">
        <div className="max-w-3xl mx-auto flex">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigateToTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-all relative cursor-pointer ${
                  active
                    ? 'text-gold-warm dark:text-gold-warm'
                    : 'text-muted dark:text-muted hover:text-primary'
                }`}
              >
                <span className="text-lg sm:text-xl leading-none">{tab.icon}</span>
                <span className="text-[11px] sm:text-xs font-bold tracking-wide">{isHindi ? tab.labelHi : tab.labelEn}</span>
                {active && (
                  <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-gold-warm rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-3.5 sm:px-6 mt-4 sm:mt-6">

        {/* ── Page Voice Guide ────────────────────────────────────── */}
        <PageVoiceGuide pageKey="companion" className="mb-4 sm:mb-5" />

        {/* ── Sub-view Breadcrumb Header (When inside dedicated Sub-pages) ── */}
        {activeTab !== 'ghar' && (
          <div className="flex items-center justify-between bg-white/95 dark:bg-card p-3 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-xs mb-4 sm:mb-5 animate-fadeIn">
            <button
              onClick={() => navigate(basePath)}
              className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-gold-warm dark:text-gold-warm hover:underline cursor-pointer group"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:-translate-x-1 transition-transform" />
              <span>{l('← साथी मुख्य द्वार', '← Back to Saathi Hub')}</span>
            </button>
            <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-full bg-gold-warm/15 text-gold-warm">
              {activeTab === 'baat' ? l('💬 बातचीत कक्ष', '💬 Chat Room') : activeTab === 'kisse' ? l('📖 लोक-कहानियां', '📖 Folk Stories') : l('🆘 आपातकालीन मदद', '🆘 Emergency Help')}
            </span>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            PAGE 1: GHAR (साथी मुख्य द्वार / Home Hub)
            ════════════════════════════════════════════════════════ */}
        {activeTab === 'ghar' && (
          <div className="space-y-6 animate-fadeIn">

            {/* ── INTERACTIVE VISUAL HERO CARD FOR ACCESSIBILITY & LOW LITERACY ── */}
            <div className="relative rounded-3xl overflow-hidden shadow-md border border-gold-warm/40 bg-gradient-to-br from-amber-900/90 via-[#1E2A43] to-primary text-white">
              {/* Responsive Hero Picture Container */}
              <div className="relative h-56 sm:h-72 w-full overflow-hidden group">
                <img
                  src="/assets/saathi/companion_hero.jpg"
                  alt="संजीवनी साथी - आपका अपना बुजुर्ग साथी"
                  className="w-full h-full object-cover object-center filter brightness-95 contrast-105 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-4 sm:p-6">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-warm/90 text-primary text-[10px] sm:text-xs font-extrabold uppercase tracking-wider mb-1.5 w-fit shadow-md">
                    <span>🍵 {l('अपना पहाड़ी साथी', 'Elder Companion')}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-white leading-tight drop-shadow-md">
                    "आओ बेटा, बैठो... मन का बोझ हल्का करो"
                  </h2>
                  <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-xl leading-relaxed drop-shadow-sm">
                    लिखने या पढ़ने की कोई ज़रूरत नहीं! बस माइक दबाएं और दिल की बात बोलें — साथी हमेशा आपके साथ है।
                  </p>
                </div>

                {/* 1-Tap Audio Guide Button for Illiterate Users */}
                <button
                  onClick={() => speakCue('Namaste! Main hoon aapka apna snehil Saathi. Likhne padhne ki chinta chhodkar aaram se baithiye aur bolkar baat kijiye. Main hamesha sunne ke liye taiyaar hoon.', 'hi-IN')}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold-warm hover:bg-gold-warm/95 text-primary text-xs font-bold shadow-lg active:scale-95 transition-all cursor-pointer"
                  title="साथी की आवाज़ में सुनें"
                >
                  <Volume2 className="w-4 h-4 text-primary animate-bounce" />
                  <span>🔊 आवाज़ सुनें</span>
                </button>
              </div>

              {/* Accessible Action Bar with Large Touch Targets */}
              <div className="p-3.5 sm:p-5 bg-white dark:bg-[#1E2A43] text-primary dark:text-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-gold-warm/20">
                <div className="flex items-center gap-2 text-xs text-muted dark:text-gray-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-sage inline-block animate-pulse" />
                  <span className="font-semibold">24x7 निःशुल्क सेवा • बिना किसी झिझक के बात करें</span>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    onClick={() => navigate(`${basePath}/chat?voice=1`)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-sage hover:bg-sage/90 text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all cursor-pointer ring-2 ring-sage/30 min-h-[44px]"
                  >
                    <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
                    <span>🎙️ बोलकर बात करें</span>
                  </button>

                  <button
                    onClick={() => navigate(`${basePath}/chat`)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gold-warm hover:bg-gold-warm/90 text-primary font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all cursor-pointer min-h-[44px]"
                  >
                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>💬 बातचीत कक्ष</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Daily Blessing Banner */}
            {dailyThought && (
              <div className="bg-gradient-to-r from-gold-warm/15 via-white dark:via-card to-sage/15 rounded-3xl p-4 sm:p-5 border border-gold-warm/30 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gold-warm text-primary flex items-center justify-center shrink-0 shadow-sm text-lg sm:text-xl">
                    ✨
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-gold-warm dark:text-gold-warm mb-0.5">Aaj Ka Sandesh</p>
                    <p className="font-serif italic text-xs sm:text-sm text-primary leading-relaxed">
                      "{dailyThought.quote}"
                    </p>
                    <p className="text-[11px] text-muted dark:text-muted mt-1">
                      <strong className="text-sage dark:text-booti-glow">Sujhaav:</strong>{' '}
                      {dailyThought.action}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => speakCue(`${dailyThought.quote}. ${dailyThought.action}`, 'hi-IN')}
                  className="flex items-center gap-1.5 text-xs font-bold text-gold-warm dark:text-gold-warm bg-gold-warm/10 hover:bg-gold-warm/20 px-3 py-1.5 sm:py-2 rounded-xl transition-all shrink-0 cursor-pointer self-end sm:self-center"
                >
                  <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>🔊 Suniye</span>
                </button>
              </div>
            )}

            {/* Mood Check-In — COMPACT MOBILE-FRIENDLY & AUDIO-AIDED GRID */}
            <div>
              <div className="flex items-center justify-between mb-2.5 sm:mb-3.5">
                <div>
                  <h2 className="font-serif text-base sm:text-lg font-bold text-primary flex items-center gap-2">
                    <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-rose-soft" />
                    Aaj Mann Kaisa Hai?
                  </h2>
                  <p className="text-[11px] sm:text-xs text-muted dark:text-muted mt-0.5">
                    Apna haal chunein — Saathi sune ga
                  </p>
                </div>
                <button
                  onClick={() => speakCue('Aaj aapka mann kaisa hai? Kisi bhi button ko dabakar batayein, saathi aapse baat karega.', 'hi-IN')}
                  className="flex items-center gap-1 text-xs text-gold-warm font-bold cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> सुनें
                </button>
              </div>
              <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
                {MOOD_OPTIONS.map((mood) => {
                  const isSel = selectedMood === mood.id;
                  return (
                    <button
                      key={mood.id}
                      onClick={() => handleSelectMood(mood)}
                      className={`flex flex-col items-center justify-center gap-1 sm:gap-1.5 p-2 sm:p-3.5 rounded-2xl border-2 transition-all active:scale-95 cursor-pointer min-h-[68px] sm:min-h-[88px] ${
                        isSel
                          ? `${mood.color} ring-2 ring-gold-warm/60 shadow-md scale-105`
                          : 'bg-white dark:bg-warm-indigo border-gray-200 dark:border-gray-700 hover:border-gold-warm/40'
                      }`}
                    >
                      <span className="text-2xl sm:text-3xl leading-none">{mood.icon}</span>
                      <span className="text-[10px] sm:text-xs font-bold text-center text-primary leading-tight truncate w-full">{mood.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Hierarchical Gateway Cards (Pages Inside Saathi) ─────────── */}
            <div>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div>
                  <h2 className="font-serif text-base sm:text-lg font-bold text-primary flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-gold-warm" />
                    {l('साथी के मुख्य कक्ष व विभाग', 'Saathi Dedicated Rooms')}
                  </h2>
                  <p className="text-[11px] sm:text-xs text-muted dark:text-muted">
                    {l('अपनी सुविधा अनुसार समर्पित कक्ष में प्रवेश करें:', 'Enter the dedicated room of your choice:')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {SAATHI_PORTALS.map((portal) => (
                  <div
                    key={portal.id}
                    onClick={() => {
                      if (portal.slug.includes('?')) {
                        navigate(`${basePath}/${portal.slug}`);
                      } else {
                        navigate(`${basePath}/${portal.slug}`);
                      }
                    }}
                    className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-warm-indigo/60 border border-gray-200/80 dark:border-gray-800 hover:border-gold-warm/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group active:scale-[0.99]"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="w-10 h-10 rounded-xl bg-gold-warm/15 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">
                          {portal.icon}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${portal.badgeColor}`}>
                          {isHindi ? portal.badgeHi : portal.badgeEn}
                        </span>
                      </div>
                      <h3 className="font-serif font-bold text-sm sm:text-base text-primary mb-1">
                        {isHindi ? portal.titleHi : portal.titleEn}
                      </h3>
                      <p className="text-xs text-muted dark:text-muted leading-relaxed mb-4">
                        {isHindi ? portal.descHi : portal.descEn}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between">
                      <span className="text-xs font-bold text-gold-warm dark:text-gold-warm flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        <span>{isHindi ? portal.btnTextHi : portal.btnTextEn}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Prompt Tiles */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-base font-bold text-primary">
                  {l('💬 त्वरित शुरुआत', '💬 Quick Prompts')}
                </h2>
                <button
                  onClick={() => speakCue('Kisi ek tile ko dabaakar turant baat shuru karein.', 'hi-IN')}
                  className="flex items-center gap-1 text-xs text-gold-warm font-bold cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" /> {l('सुनें', 'Listen')}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {QUICK_PROMPTS.map((qp) => (
                  <button
                    key={qp.prompt}
                    onClick={() => {
                      handleSendMessage(qp.prompt);
                      navigate(`${basePath}/chat`);
                    }}
                    className="flex flex-col items-center justify-center gap-1.5 p-3 sm:p-4 rounded-2xl bg-white dark:bg-warm-indigo border border-gray-200 dark:border-gray-700 hover:border-gold-warm/50 hover:shadow-xs transition-all active:scale-95 text-center cursor-pointer"
                  >
                    <span className="text-2xl sm:text-3xl">{qp.icon}</span>
                    <p className="font-bold text-xs text-primary leading-tight">{qp.label}</p>
                    <p className="text-[10px] text-muted dark:text-muted">{qp.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Big CTA */}
            <button
              onClick={() => navigate(`${basePath}/chat`)}
              className="w-full flex items-center justify-center gap-2.5 p-4 sm:p-5 rounded-2xl bg-gold-warm hover:bg-gold-warm/90 text-primary font-bold text-sm sm:text-base transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>{l('साथी से सीधा संवाद शुरू करें →', 'Enter Chat Room →')}</span>
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            PAGE 2: BAAT KAREIN (बातचीत कक्ष / Dedicated Chat Page)
            ════════════════════════════════════════════════════════ */}
        {activeTab === 'baat' && (
          <div className="animate-fadeIn space-y-4">
            <div className="bg-white dark:bg-warm-indigo rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col h-[calc(100dvh-200px)] sm:h-[72vh] min-h-[400px]">

              {/* Chat Header */}
              <div className="p-2.5 sm:p-3.5 bg-sand/50 dark:bg-card border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <button
                    type="button"
                    onClick={() => navigate(basePath)}
                    className="p-1.5 rounded-xl text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                    title="साथी हब पर वापस जाएं"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gold-warm text-primary flex items-center justify-center shadow-xs text-sm sm:text-base shrink-0">
                    🤝
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-xs sm:text-sm text-primary leading-tight">
                      {l('संजीवनी साथी', 'Sanjeevani Saathi')}
                    </h4>
                    <p className="text-[9px] sm:text-[10px] text-muted dark:text-muted flex items-center gap-1 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-sage inline-block animate-pulse" />
                      {l('हमेशा आपके साथ', 'Always with you')}
                    </p>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    onClick={() => handleSendMessage('Mujhe ek purani sundar kahani sunao.')}
                    className="hidden sm:inline-flex bg-white dark:bg-sand hover:bg-gray-100 dark:hover:bg-gray-700 px-2.5 py-1 rounded-xl border border-gray-200 dark:border-gray-700 text-[11px] transition-all cursor-pointer"
                  >
                    📖 {l('कहानी', 'Story')}
                  </button>
                  <button
                    onClick={() => navigate(`${basePath}/help`)}
                    className="bg-rose-soft/10 text-rose-soft hover:bg-rose-soft/20 px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer"
                  >
                    🆘 {l('मदद', 'Help')}
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-2.5 sm:p-4 overflow-y-auto space-y-3 sm:space-y-4">
                {messages.map((m, idx) => {
                  const isUser = m.sender === 'user';
                  return (
                    <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                      {!isUser && (
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-gold-warm text-primary flex items-center justify-center shrink-0 mr-1.5 sm:mr-2 mt-1 text-xs sm:text-base">🤝</div>
                      )}
                      <div
                        className={`max-w-[88%] sm:max-w-[75%] rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 shadow-2xs relative ${
                          isUser
                            ? 'bg-sage text-white rounded-br-none'
                            : 'bg-sand dark:bg-sand text-primary border border-gray-200/80 dark:border-gray-700/80 rounded-bl-none'
                        }`}
                      >
                        {!isUser && (
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gold-warm dark:text-gold-warm">
                              {l('साथी', 'Saathi')}
                            </span>
                            <button
                              onClick={() => speakCue(m.text, 'hi-IN')}
                              className="text-muted dark:text-muted hover:text-primary transition-colors p-0.5 cursor-pointer"
                              title={l('बोलकर सुनाएं', 'Read aloud')}
                              aria-label="Speak aloud"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        {isUser ? (
                          <p className="text-xs md:text-sm whitespace-pre-wrap leading-relaxed">{m.text}</p>
                        ) : (
                          <StructuredBotMessage text={m.text} />
                        )}
                        <div className={`text-[8px] sm:text-[9px] mt-1 text-right ${isUser ? 'text-white/70' : 'text-muted dark:text-muted'}`}>
                          {m.timestamp}
                        </div>
                      </div>
                      {isUser && (
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-sage text-white flex items-center justify-center shrink-0 ml-1.5 sm:ml-2 mt-1 text-xs sm:text-base">🙂</div>
                      )}
                    </div>
                  );
                })}

                {isReplying && (
                  <div className="flex justify-start">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-gold-warm text-primary flex items-center justify-center shrink-0 mr-1.5 sm:mr-2 text-xs sm:text-base">🤝</div>
                    <div className="bg-sand dark:bg-sand p-2.5 sm:p-3 rounded-2xl rounded-bl-none border border-gray-200 dark:border-gray-700 text-xs text-muted dark:text-muted flex items-center gap-2 animate-pulse">
                      <HeartHandshake className="w-4 h-4 text-gold-warm" />
                      <span>{l('स्नेह से सोच रहा हूँ...', 'Thinking warmly...')}</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* ── Compact Responsive Mobile Input Bar ────────────────── */}
              <div className="p-2 sm:p-3 bg-white dark:bg-warm-indigo border-t border-gray-200 dark:border-gray-800 shrink-0">
                {isListening && (
                  <div className="flex items-center justify-center gap-1.5 mb-1.5 text-rose-soft text-[11px] sm:text-xs font-bold animate-pulse">
                    <Mic className="w-3.5 h-3.5" />
                    <span>{l('आपकी आवाज़ सुन रहा हूँ... बोलिए', 'Listening... Please speak')}</span>
                  </div>
                )}
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                  className="flex items-end gap-1.5 sm:gap-2"
                >
                  <button
                    type="button"
                    onClick={handleToggleMic}
                    className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl font-bold transition-all shadow-2xs shrink-0 cursor-pointer ${
                      isListening
                        ? 'bg-rose-soft text-white animate-pulse ring-2 ring-rose-400'
                        : 'bg-sage/15 text-sage dark:text-booti-glow border border-sage/30 hover:border-sage/60'
                    }`}
                    title={isListening ? l('सुनना बंद करें', 'Stop listening') : l('बोलिए', 'Speak (Mic)')}
                    aria-label="Toggle Voice Input"
                  >
                    {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4" />}
                  </button>
                  <textarea
                    ref={chatInputRef}
                    rows={1}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={isListening ? l('आपकी आवाज़ सुन रहा हूँ...', 'Listening...') : l('साथी से बात करें या बोलें...', 'Chat or speak with your companion...')}
                    className="flex-1 min-w-0 bg-gray-50 dark:bg-card border border-gray-300 dark:border-gray-700 rounded-xl sm:rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-primary focus:outline-none focus:ring-2 focus:ring-gold-warm resize-none overflow-y-auto leading-normal min-h-[36px] max-h-[110px] transition-[height] duration-75"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isReplying}
                    className="mb-0.5 bg-gold-warm hover:bg-gold-warm/90 disabled:opacity-40 text-primary p-2 sm:p-2.5 rounded-xl sm:rounded-2xl font-bold transition-all shadow-2xs shrink-0 cursor-pointer"
                    title="Send"
                    aria-label="Send Message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>

            {/* Bottom Return Action */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => navigate(basePath)}
                className="inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-gold-warm cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{l('← साथी मुख्य द्वार पर वापस जाएं', '← Back to Saathi Hub')}</span>
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            PAGE 3: KISSE (पहाड़ी लोक-कहानियां / Dedicated Stories Page)
            ════════════════════════════════════════════════════════ */}
        {activeTab === 'kisse' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-primary flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-sage" />
                  Pahadi Kisse 📖
                </h2>
                <p className="text-xs text-muted dark:text-muted mt-0.5">
                  Uttarakhand ki meethi lok-kathayein — aawaz mein sunein
                </p>
              </div>
              <button
                onClick={() => speakCue('Yahaan pahaadi lok-kathayein hain. Har kahani ke paas suniye ka button hai, use dabakar aaram se sunein.', 'hi-IN')}
                className="flex items-center gap-1.5 text-xs text-gold-warm font-bold bg-gold-warm/15 hover:bg-gold-warm/25 px-3 py-2 rounded-xl transition-all cursor-pointer"
              >
                <Volume2 className="w-4 h-4 animate-bounce" /> <span>🔊 गाइड सुनें</span>
              </button>
            </div>

            {/* ── FEATURED STORYTELLING VISUAL HERO CARD ── */}
            <div className="relative rounded-3xl overflow-hidden shadow-lg border border-purple-500/30 bg-gradient-to-br from-purple-950/90 via-[#1E2A43] to-primary text-white">
              <div className="relative h-60 sm:h-72 w-full overflow-hidden group">
                <img
                  src="/assets/saathi/storytelling.jpg"
                  alt="पहाड़ी अलाव की लोक-कहानियां"
                  className="w-full h-full object-cover object-center filter brightness-95 contrast-105 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent flex flex-col justify-end p-4 sm:p-6">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-600/90 text-white text-[10px] sm:text-xs font-extrabold uppercase tracking-wider mb-1.5 w-fit shadow-md">
                    <span>🔥 {l('पहाड़ी अलाव कथा', 'Fireside Folklore')}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-white leading-tight drop-shadow-md">
                    {l('पहाड़ों की मीठी कहानियां', 'Folk Stories Aloud')}
                  </h3>
                  <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-xl leading-relaxed drop-shadow-sm">
                    पढ़ने की चिंता बिल्कुल छोड़िए! बस बटन दबाएं और अलाव की गर्माहट में दादी-नानी के किस्से सुनें।
                  </p>
                </div>
              </div>

              {/* Active Audio Bar & Action Strip */}
              <div className="p-4 sm:p-5 bg-white dark:bg-[#1E2A43] text-primary dark:text-gray-100 flex flex-wrap items-center justify-between gap-3 border-t border-purple-500/20">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const first = stories[0];
                      if (first) handlePlayStoryAudio(first);
                    }}
                    className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all cursor-pointer min-h-[44px] ${
                      playingStoryId === stories[0]?.id
                        ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
                        : 'bg-sage hover:bg-sage/90 text-white'
                    }`}
                  >
                    {playingStoryId === stories[0]?.id ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                    <span>{playingStoryId === stories[0]?.id ? l('⏸️ कहानी रोकें', '⏸️ Pause Story') : l('▶️ पहली कहानी सुनें', '▶️ Listen to First Story')}</span>
                  </button>

                  {playingStoryId && (
                    <div className="flex items-center gap-1 text-xs text-sage dark:text-booti-glow font-bold animate-pulse">
                      <span className="w-1.5 h-4 bg-sage rounded-full animate-bounce" />
                      <span className="w-1.5 h-6 bg-sage rounded-full animate-bounce delay-100" />
                      <span className="w-1.5 h-3 bg-sage rounded-full animate-bounce delay-200" />
                      <span className="ml-1 text-[11px]">ऑडियो चालू है...</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => speakCue('Yahaan pahaadi kisse hain. Kisi bhi kahani ke suniye button ko dabayein.', 'hi-IN')}
                  className="text-xs font-bold text-purple-600 dark:text-purple-300 flex items-center gap-1.5 hover:underline cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 ऑडियो सहायता</span>
                </button>
              </div>
            </div>

            {/* Stories Grid */}
            <div className="space-y-4">
              {stories.map((story) => {
                const isPlaying = playingStoryId === story.id;
                return (
                  <div
                    key={story.id}
                    className={`bg-white dark:bg-warm-indigo rounded-3xl border transition-all overflow-hidden shadow-xs hover:shadow-md ${
                      isPlaying
                        ? 'border-sage ring-2 ring-sage/30'
                        : 'border-gray-200/80 dark:border-gray-800'
                    }`}
                  >
                    {/* Story cover */}
                    <div className="bg-gradient-to-r from-sage/15 via-gold-warm/10 to-transparent p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-sage/20 dark:bg-sage/30 flex items-center justify-center text-2xl sm:text-3xl shrink-0">
                          📖
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] bg-sage/20 text-sage dark:text-booti-glow px-2 py-0.5 rounded-full font-bold uppercase">
                              {story.category || 'Lok Katha'}
                            </span>
                            <span className="text-[10px] text-muted dark:text-muted">⏱ {story.duration}</span>
                            {isPlaying && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full animate-pulse">
                                🔊 बजाया जा रहा है
                              </span>
                            )}
                          </div>
                          <h3 className="font-serif font-bold text-base sm:text-lg text-primary leading-tight">
                            {story.title}
                          </h3>
                          <p className="text-xs text-muted dark:text-muted mt-0.5 leading-relaxed line-clamp-2">
                            {story.summary}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Story text preview */}
                    <div className="p-4 sm:p-5 space-y-4">
                      <p className="text-xs sm:text-sm text-primary leading-relaxed font-serif italic border-l-4 border-gold-warm/50 pl-4 py-0.5 bg-gold-warm/5 rounded-r-xl">
                        "{story.text}"
                      </p>

                      {/* Action buttons with 44px+ touch targets */}
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handlePlayStoryAudio(story)}
                          className={`flex items-center justify-center gap-2 p-3 sm:p-3.5 rounded-2xl font-bold text-xs sm:text-sm transition-all active:scale-95 shadow-sm cursor-pointer min-h-[44px] ${
                            isPlaying
                              ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
                              : 'bg-sage hover:bg-sage/90 text-white'
                          }`}
                        >
                          {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                          <span>{isPlaying ? l('⏸️ रोकें', '⏸️ Pause') : l('🔊 सुनें', '🔊 Listen Aloud')}</span>
                        </button>
                        <button
                          onClick={() => {
                            handleSendMessage(`Mujhe yeh kahani sunao: ${story.title}`);
                            navigate(`${basePath}/chat`);
                          }}
                          className="flex items-center justify-center gap-2 p-3 sm:p-3.5 rounded-2xl bg-gold-warm/15 hover:bg-gold-warm/25 text-gold-warm dark:text-gold-warm border border-gold-warm/30 font-bold text-xs sm:text-sm transition-all active:scale-95 cursor-pointer min-h-[44px]"
                        >
                          <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>💬 इस पर बात करें</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Return Action */}
            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={() => navigate(basePath)}
                className="inline-flex items-center gap-2 text-xs font-bold text-gold-warm hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{l('← साथी मुख्य द्वार पर वापस जाएं', '← Back to Saathi Hub')}</span>
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            PAGE 4: MADAD (सहायता व सुकून / Dedicated Help Page)
            ════════════════════════════════════════════════════════ */}
        {activeTab === 'madad' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl font-bold text-primary flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-soft" />
                  Madad & Sahara 🆘
                </h2>
                <p className="text-xs text-muted dark:text-muted mt-0.5">
                  Zaroorat ke waqt yahan daben — 24 ghante madad milegi
                </p>
              </div>
              <button
                onClick={() => speakCue('Zaroorat ke waqt in helpline numbers ko call karein. Yeh toll-free hain aur 24 ghante uplabdh hain.', 'hi-IN')}
                className="flex items-center gap-1 text-xs text-gold-warm font-bold bg-gold-warm/10 px-3 py-2 rounded-xl cursor-pointer"
              >
                <Volume2 className="w-4 h-4" /> 🔊 सुनें
              </button>
            </div>

            {/* SOS Helpline Cards */}
            <div className="space-y-4">
              {[
                { icon: '🧠', color: 'bg-warm-indigo hover:bg-warm-indigo/90', number: '14416', name: 'Tele-MANAS', sub: 'Mann ki madad • Toll-Free • 24/7', speak: 'Tele MANAS helpline. Mann ki takleef ke liye call karein.' },
                { icon: '🌸', color: 'bg-rose-soft hover:bg-rose-soft/90', number: '1800-599-0019', name: 'Vandrevala Foundation', sub: 'Aatma-hatya rokne wali helpline', speak: 'Vandrevala Foundation. Aatmhatya rokne ke liye call karein.' },
                { icon: '👵', color: 'bg-sage hover:bg-sage/90', number: '14567', name: 'iCall Helpline', sub: 'Buzurgon ke liye vishesh sahara', speak: 'Buzurgon ke liye helpline. Akelepe ya mansik pareshani mein madad milegi.' },
                { icon: '🚑', color: 'bg-gold-warm hover:bg-gold-warm/90', number: '108', name: 'Ambulance / Emergency', sub: 'Tatkal chikitsa sahayata', speak: 'Emergency Ambulance. Tatkal madad ke liye call karein.' },
              ].map((h) => (
                <a
                  key={h.number}
                  href={`tel:${h.number}`}
                  className={`${h.color} text-white flex items-center gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl transition-all active:scale-95 shadow-md`}
                  onClick={() => speakCue(h.speak, 'hi-IN')}
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/15 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shrink-0">
                    {h.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base sm:text-lg leading-tight">{h.name}</p>
                    <p className="text-xs sm:text-sm font-bold opacity-90 mt-0.5">{h.number}</p>
                    <p className="text-[10px] sm:text-[11px] opacity-70 mt-0.5">{h.sub}</p>
                  </div>
                  <PhoneCall className="w-6 h-6 sm:w-7 sm:h-7 opacity-70 shrink-0" />
                </a>
              ))}
            </div>

            {/* Self-Care Reminder */}
            <div className="bg-white dark:bg-warm-indigo rounded-3xl p-5 border border-gray-200 dark:border-gray-800 space-y-4">
              <h3 className="font-serif font-bold text-base text-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold-warm" />
                Apna Khyaal Rakhein 💛
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { icon: '🌬️', label: 'Saans Lo', sub: '5 baar gehri saans', action: 'Aankhein band karein. Naak se gehri saans len. Yahi 5 baar karein.' },
                  { icon: '🚶', label: 'Thoda Ghoomein', sub: '5 minute ki sair', action: 'Ghar se bahar 5 minute ke liye chalein. Taza hawa mein aram milega.' },
                  { icon: '🍵', label: 'Chai Piyein', sub: 'Garam chai peeyein', action: 'Garm chai piyein aur sukoon se baithein. Yeh bhi ek upchar hai.' },
                  { icon: '🙏', label: 'Pooja Karein', sub: 'Mann ki shanti', action: 'Thodi der pooja mein baith kar mann shaant karein.' },
                  { icon: '💤', label: 'Aaram Karein', sub: 'Neend lena zaroori', action: 'Aankhein band karein. Sone ki koshish karein. Thaka hua mann zyada darta hai.' },
                  { icon: '🤝', label: 'Saathi Ko Bulayein', sub: 'Kisi se baat karein', action: 'Kisi apne ko bulayein ya call karein. Baat karna hi ilaj hai.' },
                ].map((tip) => (
                  <button
                    key={tip.label}
                    onClick={() => speakCue(tip.action, 'hi-IN')}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-mist dark:bg-card hover:bg-gold-warm/10 border border-gray-200 dark:border-gray-700 transition-all active:scale-95 text-center cursor-pointer"
                  >
                    <span className="text-3xl">{tip.icon}</span>
                    <span className="text-xs font-bold text-primary">{tip.label}</span>
                    <span className="text-[10px] text-muted dark:text-muted">{tip.sub}</span>
                    <span className="text-[9px] text-gold-warm font-bold">🔊 Tap karein</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Saathi CTA */}
            <button
              onClick={() => navigate(`${basePath}/chat`)}
              className="w-full flex items-center justify-center gap-3 p-4 sm:p-5 rounded-2xl bg-gold-warm hover:bg-gold-warm/90 text-primary font-bold text-sm sm:text-base transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>Saathi Se Baat Karein →</span>
            </button>

            {/* Bottom Return Action */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => navigate(basePath)}
                className="inline-flex items-center gap-2 text-xs font-bold text-gold-warm hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{l('← साथी मुख्य द्वार पर वापस जाएं', '← Back to Saathi Hub')}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
