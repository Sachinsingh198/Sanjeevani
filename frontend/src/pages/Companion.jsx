import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HeartHandshake, Mic, MicOff, Send, Volume2, VolumeX,
  Sparkles, Heart, PhoneCall, BookOpen, ShieldAlert,
  ArrowLeft, MessageSquare, Home,
} from 'lucide-react';
import axios from 'axios';
import { speakCue } from '../lib/audioSynthesizer';
import toast from 'react-hot-toast';
import StructuredBotMessage from '../components/StructuredBotMessage';

/* ── Mood options ───────────────────────────────────────────────────────── */
const MOOD_OPTIONS = [
  { id: 'lonely',    label: 'Akela Hoon',       sub: 'अकेला',      icon: '🕊️', color: 'bg-[#D4A359]/15 text-[#8C5E24] dark:text-[#D4A359] border-[#D4A359]/30' },
  { id: 'sad',       label: 'Udas Hoon',         sub: 'उदास',       icon: '🌧️', color: 'bg-[#B85042]/15 text-[#B85042] dark:text-[#F08080] border-[#B85042]/30' },
  { id: 'nostalgic', label: 'Yaadein Aa Rahi',   sub: 'यादें',     icon: '💭', color: 'bg-[#2E4057]/15 text-[#2E4057] dark:text-[#A8B4C2] border-[#2E4057]/30' },
  { id: 'anxious',   label: 'Chinta Hai',        sub: 'चिंता',     icon: '🍃', color: 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-300' },
  { id: 'peaceful',  label: 'Mann Shant Hai',    sub: 'शांत',      icon: '🌸', color: 'bg-[#5A7855]/15 text-[#2B4A30] dark:text-[#8ED14C] border-[#5A7855]/30' },
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
  { id: 'ghar',  icon: '🏠', label: 'Ghar',         sub: 'घर' },
  { id: 'baat',  icon: '💬', label: 'Baat Karein',  sub: 'बात करें' },
  { id: 'kisse', icon: '📖', label: 'Kisse',         sub: 'कहानियां' },
  { id: 'madad', icon: '🆘', label: 'Madad',         sub: 'सहायता' },
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
  const [activeTab, setActiveTab]     = useState('ghar');
  const [messages, setMessages]       = useState(INITIAL_MESSAGES);
  const [inputText, setInputText]     = useState('');
  const [selectedMood, setSelectedMood] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isReplying, setIsReplying]   = useState(false);
  const [stories, setStories]         = useState([]);
  const [dailyThought, setDailyThought] = useState(null);
  const [autoSpeak, setAutoSpeak]     = useState(true);

  const messagesEndRef = useRef(null);
  const chatInputRef   = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* Auto-resize textarea */
  useEffect(() => {
    const textarea = chatInputRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.min(Math.max(scrollHeight, 44), 140);
    textarea.style.height = `${newHeight}px`;
  }, [inputText]);

  useEffect(() => {
    axios.get('/api/companion/stories')
      .then((res) => { if (res.data?.stories) setStories(res.data.stories); })
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
          text: 'Badrinath ke paas ek rang birangi teetli rehti thi. Woh roz mandir ke charon taraf udti aur apni taraf se phoolon ka uphar chadhaati. Prakriti ki yeh chhoti si baat bahut badi khushi de sakti hai.',
        },
      ]));

    axios.get('/api/companion/daily-thought')
      .then((res) => { if (res.data?.thought) setDailyThought(res.data.thought); })
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
    setActiveTab('baat'); // jump to chat after mood selection
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
      const res = await axios.post('/api/companion/chat', {
        message: text,
        user_name: user?.name || 'Aadarniya Mitra',
        language: 'hindi',
        mood: overrideMood,
        history: historyTurns,
      });
      const replyText = res.data.reply;
      setMessages((prev) => [...prev, {
        sender: 'companion', text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        emergency: res.data.emergency_triggered,
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
    <div className="min-h-screen bg-[#F4F6F0] dark:bg-[#151D28] text-[#1E2A43] dark:text-[#EAEFEA] pb-20 transition-colors duration-300">

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-[#D4A359]/20 via-white/80 dark:via-[#1E2A43]/80 to-transparent border-b border-gray-200/60 dark:border-gray-800 pt-8 pb-6 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/patient"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#556376] dark:text-[#A8B4C2] hover:text-[#1E2A43] dark:hover:text-[#F4F6F0] mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Mitra Dashboard Par Wapas</span>
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#D4A359]/20 text-[#8C5E24] dark:text-[#D4A359] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>Apno Sa Saathi</span>
              </div>
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#1E2A43] dark:text-[#F4F6F0]">
                संजीवनी साथी 🤝
              </h1>
              <p className="text-xs text-[#556376] dark:text-[#A8B4C2] mt-1">
                Sunnae wala, baat karnae wala, apna dost
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="tel:14416"
                className="flex items-center gap-2 bg-[#B85042] hover:bg-[#9a4035] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm"
              >
                <PhoneCall className="w-4 h-4" />
                <span>14416 Madad</span>
              </a>
              <button
                onClick={() => setAutoSpeak(!autoSpeak)}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  autoSpeak
                    ? 'bg-[#5A7855]/15 text-[#2B4A30] dark:text-[#8ED14C] border-[#5A7855]/30'
                    : 'bg-white dark:bg-[#1E2A43] text-[#556376] border-gray-300 dark:border-gray-700'
                }`}
                title="Toggle Voice"
                aria-label="Toggle Voice"
              >
                {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation (icon-first, large touch targets) ─────────── */}
      <div className="sticky top-0 z-20 bg-white/90 dark:bg-[#1A2538]/90 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-800">
        <div className="max-w-3xl mx-auto flex">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3.5 transition-all relative ${
                  active
                    ? 'text-[#D4A359] dark:text-[#D4A359]'
                    : 'text-[#556376] dark:text-[#A8B4C2] hover:text-[#1E2A43] dark:hover:text-[#F4F6F0]'
                }`}
              >
                <span className="text-2xl leading-none">{tab.icon}</span>
                <span className="text-[10px] font-bold tracking-wide">{tab.label}</span>
                <span className="text-[9px] text-gray-400 dark:text-gray-600">{tab.sub}</span>
                {active && (
                  <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[#D4A359] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-6">

        {/* ══════════════════════════════════════════════════════════
            TAB: GHAR — Icon-first home with mood selection
            ════════════════════════════════════════════════════════ */}
        {activeTab === 'ghar' && (
          <div className="space-y-6 animate-fadeIn">

            {/* Daily Blessing Banner */}
            {dailyThought && (
              <div className="bg-gradient-to-r from-[#D4A359]/15 via-white dark:via-[#1E2A43] to-[#5A7855]/15 rounded-3xl p-5 border border-[#D4A359]/30 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#D4A359] text-[#1E2A43] flex items-center justify-center shrink-0 shadow-sm text-xl">
                    ✨
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-[#8C5E24] dark:text-[#D4A359] mb-1">Aaj Ka Sandesh</p>
                    <p className="font-serif italic text-sm text-[#1E2A43] dark:text-[#F4F6F0] leading-relaxed">
                      "{dailyThought.quote}"
                    </p>
                    <p className="text-[11px] text-[#556376] dark:text-[#A8B4C2] mt-1">
                      <strong className="text-[#5A7855] dark:text-[#8ED14C]">Sujhaav:</strong>{' '}
                      {dailyThought.action}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => speakCue(`${dailyThought.quote}. ${dailyThought.action}`, 'hi-IN')}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#8C5E24] dark:text-[#D4A359] bg-[#D4A359]/10 hover:bg-[#D4A359]/20 px-3 py-2 rounded-xl transition-all shrink-0"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 Suniye</span>
                </button>
              </div>
            )}

            {/* Mood Check-In — BIG ICON TILES */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-serif text-lg font-bold text-[#1E2A43] dark:text-[#F4F6F0] flex items-center gap-2">
                    <Heart className="w-5 h-5 text-[#B85042]" />
                    Aaj Mann Kaisa Hai?
                  </h2>
                  <p className="text-xs text-[#556376] dark:text-[#A8B4C2] mt-0.5">
                    Apna haal chunein — Saathi sune ga
                  </p>
                </div>
                <button
                  onClick={() => speakCue('Aaj aapka mann kaisa hai? Apni bhaavna chunein aur hum baat karenge.', 'hi-IN')}
                  className="flex items-center gap-1 text-xs text-[#D4A359] font-bold"
                >
                  <Volume2 className="w-4 h-4" /> सुनें
                </button>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {MOOD_OPTIONS.map((mood) => {
                  const isSel = selectedMood === mood.id;
                  return (
                    <button
                      key={mood.id}
                      onClick={() => handleSelectMood(mood)}
                      className={`flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border-2 transition-all active:scale-95 ${
                        isSel
                          ? `${mood.color} ring-2 ring-[#D4A359]/60 shadow-md scale-105`
                          : 'bg-white dark:bg-[#1E2A43] border-gray-200 dark:border-gray-700 hover:border-[#D4A359]/40'
                      }`}
                    >
                      <span className="text-3xl sm:text-4xl">{mood.icon}</span>
                      <span className="text-[10px] sm:text-xs font-bold text-center text-[#1E2A43] dark:text-[#F4F6F0] leading-tight">{mood.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Prompt Tiles — Big 4-tile grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-lg font-bold text-[#1E2A43] dark:text-[#F4F6F0]">
                  💬 Jaldi Baat Karein
                </h2>
                <button
                  onClick={() => speakCue('Kisi ek tile ko dabaakar turant baat shuru karein.', 'hi-IN')}
                  className="flex items-center gap-1 text-xs text-[#D4A359] font-bold"
                >
                  <Volume2 className="w-4 h-4" /> सुनें
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {QUICK_PROMPTS.map((qp) => (
                  <button
                    key={qp.prompt}
                    onClick={() => { handleSendMessage(qp.prompt); setActiveTab('baat'); }}
                    className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-white dark:bg-[#1E2A43] border border-gray-200 dark:border-gray-700 hover:border-[#D4A359]/50 hover:shadow-md transition-all active:scale-95 text-center"
                  >
                    <span className="text-4xl">{qp.icon}</span>
                    <div>
                      <p className="font-bold text-sm text-[#1E2A43] dark:text-[#F4F6F0]">{qp.label}</p>
                      <p className="text-xs text-[#556376] dark:text-[#A8B4C2]">{qp.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Big CTA to chat */}
            <button
              onClick={() => setActiveTab('baat')}
              className="w-full flex items-center justify-center gap-3 p-5 rounded-2xl bg-[#D4A359] hover:bg-[#c29148] text-[#1E2A43] font-bold text-base transition-all shadow-md active:scale-95"
            >
              <MessageSquare className="w-6 h-6" />
              <span>Saathi Se Seedha Baat Karein →</span>
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB: BAAT KAREIN — Full Chat Interface
            ════════════════════════════════════════════════════════ */}
        {activeTab === 'baat' && (
          <div className="animate-fadeIn">
            <div className="bg-white dark:bg-[#1E2A43] rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col h-[72vh]">

              {/* Chat Header */}
              <div className="p-4 bg-[#F7F2E8]/50 dark:bg-[#182332] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D4A359] text-[#1E2A43] flex items-center justify-center shadow-sm text-lg">
                    🤝
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-sm text-[#1E2A43] dark:text-[#F4F6F0]">
                      Sanjeevani Saathi
                    </h4>
                    <p className="text-[10px] text-[#556376] dark:text-[#A8B4C2] flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-[#5A7855] inline-block animate-pulse" />
                      Hamesha aapke sath
                    </p>
                  </div>
                </div>
                {/* Quick chips */}
                <div className="hidden sm:flex items-center gap-2 text-xs">
                  <button
                    onClick={() => handleSendMessage('Mujhe ek purani sundar kahani sunao.')}
                    className="bg-white dark:bg-[#253247] hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-[11px] transition-all"
                  >
                    📖 Kahani
                  </button>
                  <button
                    onClick={() => handleSendMessage('Koi achhi baat ya dua sunao.')}
                    className="bg-white dark:bg-[#253247] hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-[11px] transition-all"
                  >
                    💌 Dua
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 p-4 md:p-5 overflow-y-auto space-y-4">
                {messages.map((m, idx) => {
                  const isUser = m.sender === 'user';
                  return (
                    <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                      {!isUser && (
                        <div className="w-8 h-8 rounded-xl bg-[#D4A359] text-[#1E2A43] flex items-center justify-center shrink-0 mr-2 mt-1 text-base">🤝</div>
                      )}
                      <div
                        className={`max-w-[80%] sm:max-w-[72%] rounded-3xl p-4 shadow-xs relative ${
                          isUser
                            ? 'bg-[#2B4A30] text-white rounded-br-none'
                            : 'bg-[#F7F2E8] dark:bg-[#253247] text-[#1E2A43] dark:text-[#EAEFEA] border border-gray-200/80 dark:border-gray-700/80 rounded-bl-none'
                        }`}
                      >
                        {!isUser && (
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C5E24] dark:text-[#D4A359]">
                              Saathi
                            </span>
                            <button
                              onClick={() => speakCue(m.text, 'hi-IN')}
                              className="text-[#556376] dark:text-[#A8B4C2] hover:text-[#1E2A43] transition-colors p-1"
                              title="Speak aloud"
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
                        <div className={`text-[9px] mt-1.5 text-right ${isUser ? 'text-white/70' : 'text-[#556376] dark:text-[#A8B4C2]'}`}>
                          {m.timestamp}
                        </div>
                      </div>
                      {isUser && (
                        <div className="w-8 h-8 rounded-xl bg-[#5A7855] text-white flex items-center justify-center shrink-0 ml-2 mt-1 text-base">🙂</div>
                      )}
                    </div>
                  );
                })}

                {isReplying && (
                  <div className="flex justify-start">
                    <div className="w-8 h-8 rounded-xl bg-[#D4A359] text-[#1E2A43] flex items-center justify-center shrink-0 mr-2 text-base">🤝</div>
                    <div className="bg-[#F7F2E8] dark:bg-[#253247] p-3.5 rounded-3xl rounded-bl-none border border-gray-200 dark:border-gray-700 text-xs text-[#556376] dark:text-[#A8B4C2] flex items-center gap-2 animate-pulse">
                      <HeartHandshake className="w-4 h-4 text-[#D4A359]" />
                      <span>Sneh se soch raha hoon...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <div className="p-3.5 bg-white dark:bg-[#1E2A43] border-t border-gray-200 dark:border-gray-800 shrink-0">
                {/* Voice button — BIG, prominent */}
                <div className="flex justify-center mb-3">
                  <button
                    onClick={handleToggleMic}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-sm ${
                      isListening
                        ? 'bg-[#A23B33] text-white animate-pulse scale-105'
                        : 'bg-[#5A7855]/15 text-[#2B4A30] dark:text-[#8ED14C] border-2 border-[#5A7855]/30 hover:border-[#5A7855]/60'
                    }`}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    <span>{isListening ? '🔴 Ruk jaiye...' : '🎙️ Baat Karein'}</span>
                  </button>
                </div>
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                  className="flex items-end gap-2"
                >
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
                    placeholder={isListening ? 'Sun raha hoon...' : 'Ya yahan likhein... (Shift+Enter for new line)'}
                    className="flex-1 bg-gray-50 dark:bg-[#151D28] border border-gray-300 dark:border-gray-700 rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#1E2A43] dark:text-[#F4F6F0] focus:outline-none focus:ring-2 focus:ring-[#D4A359] resize-none overflow-y-auto leading-relaxed transition-[height] duration-75"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isReplying}
                    className="mb-0.5 bg-[#D4A359] hover:bg-[#c29148] disabled:opacity-40 text-[#1E2A43] p-3 rounded-2xl font-bold transition-all shadow-sm shrink-0"
                    title="Send"
                    aria-label="Send Message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB: KISSE — Pahadi Folk Stories with Audio
            ════════════════════════════════════════════════════════ */}
        {activeTab === 'kisse' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl font-bold text-[#1E2A43] dark:text-[#F4F6F0] flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#5A7855]" />
                  Pahadi Kisse 📖
                </h2>
                <p className="text-xs text-[#556376] dark:text-[#A8B4C2] mt-0.5">
                  Uttarakhand ki meethi lok-kathayein — suniye ya padhiye
                </p>
              </div>
              <button
                onClick={() => speakCue('Yahaan pahaadi kisse hain. Koi bhi tile dabaakar kahani suniye.', 'hi-IN')}
                className="flex items-center gap-1 text-xs text-[#D4A359] font-bold bg-[#D4A359]/10 px-3 py-2 rounded-xl"
              >
                <Volume2 className="w-4 h-4" /> 🔊 सुनें
              </button>
            </div>

            {stories.map((story) => (
              <div
                key={story.id}
                className="bg-white dark:bg-[#1E2A43] rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden"
              >
                {/* Story cover */}
                <div className="bg-gradient-to-r from-[#5A7855]/15 to-[#D4A359]/10 p-5 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-[#5A7855]/20 dark:bg-[#5A7855]/30 flex items-center justify-center text-3xl shrink-0">
                      📖
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] bg-[#5A7855]/15 text-[#2B4A30] dark:text-[#8ED14C] px-2 py-0.5 rounded-full font-bold uppercase">
                          {story.category || 'Lok Katha'}
                        </span>
                        <span className="text-[10px] text-[#556376] dark:text-[#A8B4C2]">⏱ {story.duration}</span>
                      </div>
                      <h3 className="font-serif font-bold text-base text-[#1E2A43] dark:text-[#F4F6F0] leading-tight">
                        {story.title}
                      </h3>
                      <p className="text-xs text-[#556376] dark:text-[#A8B4C2] mt-1 leading-relaxed line-clamp-2">
                        {story.summary}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Story text preview */}
                <div className="p-5 space-y-4">
                  <p className="text-xs sm:text-sm text-[#1E2A43] dark:text-[#EAEFEA] leading-relaxed font-serif italic border-l-4 border-[#D4A359]/40 pl-4">
                    {story.text}
                  </p>

                  {/* Action buttons — BIG, icon-first */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => { speakCue(story.text, 'hi-IN'); toast.success(`🔊 ${story.title} chal raha hai`); }}
                      className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-[#5A7855] hover:bg-[#4a6847] text-white font-bold text-sm transition-all active:scale-95 shadow-sm"
                    >
                      <Volume2 className="w-5 h-5" />
                      <span>🔊 Suniye</span>
                    </button>
                    <button
                      onClick={() => { handleSendMessage(`Mujhe kahani sunao: ${story.title}`); setActiveTab('baat'); }}
                      className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-[#D4A359]/15 hover:bg-[#D4A359]/25 text-[#8C5E24] dark:text-[#D4A359] border border-[#D4A359]/30 font-bold text-sm transition-all active:scale-95"
                    >
                      <MessageSquare className="w-5 h-5" />
                      <span>💬 Baat Karein</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB: MADAD — Emergency & Helpline Resources
            ════════════════════════════════════════════════════════ */}
        {activeTab === 'madad' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl font-bold text-[#1E2A43] dark:text-[#F4F6F0] flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-[#B85042]" />
                  Madad & Sahara 🆘
                </h2>
                <p className="text-xs text-[#556376] dark:text-[#A8B4C2] mt-0.5">
                  Zaroorat ke waqt yahan daben — 24 ghante madad milegi
                </p>
              </div>
              <button
                onClick={() => speakCue('Zaroorat ke waqt in helpline numbers ko call karein. Yeh toll-free hain aur 24 ghante uplabdh hain.', 'hi-IN')}
                className="flex items-center gap-1 text-xs text-[#D4A359] font-bold bg-[#D4A359]/10 px-3 py-2 rounded-xl"
              >
                <Volume2 className="w-4 h-4" /> 🔊 सुनें
              </button>
            </div>

            {/* SOS Helpline Cards — very large, easy to tap */}
            <div className="space-y-4">
              {[
                { icon: '🧠', color: 'bg-[#2E4057] hover:bg-[#243347]', number: '14416', name: 'Tele-MANAS', sub: 'Mann ki madad • Toll-Free • 24/7', speak: 'Tele MANAS helpline. Mann ki takleef ke liye call karein.' },
                { icon: '🌸', color: 'bg-[#B85042] hover:bg-[#9a4035]', number: '1800-599-0019', name: 'Vandrevala Foundation', sub: 'Aatma-hatya rokne wali helpline', speak: 'Vandrevala Foundation. Aatmhatya rokne ke liye call karein.' },
                { icon: '👵', color: 'bg-[#5A7855] hover:bg-[#4a6847]', number: '14567', name: 'iCall Helpline', sub: 'Buzurgon ke liye vishesh sahara', speak: 'Buzurgon ke liye helpline. Akelepe ya mansik pareshani mein madad milegi.' },
                { icon: '🚑', color: 'bg-[#D4A359] hover:bg-[#c29148]', number: '108', name: 'Ambulance / Emergency', sub: 'Tatkal chikitsa sahayata', speak: 'Emergency Ambulance. Tatkal madad ke liye call karein.' },
              ].map((h) => (
                <a
                  key={h.number}
                  href={`tel:${h.number}`}
                  className={`${h.color} text-white flex items-center gap-5 p-5 rounded-2xl transition-all active:scale-95 shadow-md`}
                  onClick={() => speakCue(h.speak, 'hi-IN')}
                >
                  <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center text-3xl shrink-0">
                    {h.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-lg leading-tight">{h.name}</p>
                    <p className="text-sm font-bold opacity-90 mt-0.5">{h.number}</p>
                    <p className="text-[11px] opacity-70 mt-0.5">{h.sub}</p>
                  </div>
                  <PhoneCall className="w-7 h-7 opacity-70 shrink-0" />
                </a>
              ))}
            </div>

            {/* Self-Care Reminder */}
            <div className="bg-white dark:bg-[#1E2A43] rounded-3xl p-5 border border-gray-200 dark:border-gray-800 space-y-4">
              <h3 className="font-serif font-bold text-base text-[#1E2A43] dark:text-[#F4F6F0] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D4A359]" />
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
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[#F4F6F0] dark:bg-[#182332] hover:bg-[#D4A359]/10 border border-gray-200 dark:border-gray-700 transition-all active:scale-95 text-center"
                  >
                    <span className="text-3xl">{tip.icon}</span>
                    <span className="text-xs font-bold text-[#1E2A43] dark:text-[#F4F6F0]">{tip.label}</span>
                    <span className="text-[10px] text-[#556376] dark:text-[#A8B4C2]">{tip.sub}</span>
                    <span className="text-[9px] text-[#D4A359] font-bold">🔊 Tap karein</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Saathi CTA */}
            <button
              onClick={() => setActiveTab('baat')}
              className="w-full flex items-center justify-center gap-3 p-5 rounded-2xl bg-[#D4A359] hover:bg-[#c29148] text-[#1E2A43] font-bold text-base transition-all shadow-md active:scale-95"
            >
              <MessageSquare className="w-6 h-6" />
              <span>Saathi Se Baat Karein →</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
