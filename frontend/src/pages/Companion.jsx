import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HeartHandshake, Mic, MicOff, Send, Volume2, VolumeX,
  Sparkles, Heart, PhoneCall, BookOpen, Music, ShieldAlert,
  ArrowLeft, MessageSquare, Sun, CloudRain, Smile, Coffee, User
} from 'lucide-react';
import axios from 'axios';
import { playSingingBowl, speakCue } from '../lib/audioSynthesizer';
import toast from 'react-hot-toast';

const MOOD_OPTIONS = [
  { id: 'lonely', label: 'Akela Lag Raha Hai', sub: 'Feeling Lonely', icon: '🕊️', color: 'bg-gold-warm/15 text-gold-warm border-gold-warm/30' },
  { id: 'sad', label: 'Thoda Udas Hoon', sub: 'Feeling Down', icon: '🌧️', color: 'bg-rose-soft/15 text-rose-soft border-rose-soft/30' },
  { id: 'nostalgic', label: 'Purani Yaadein', sub: 'Remembering Past', icon: '💭', color: 'bg-warm-indigo/15 text-warm-indigo border-warm-indigo/30' },
  { id: 'anxious', label: 'Chinta Ya Ghabrahat', sub: 'Restless / Worried', icon: '🍃', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'peaceful', label: 'Shant & Prasanna', sub: 'At Peace', icon: '🌸', color: 'bg-sage/15 text-sage border-sage/30' },
];

const INITIAL_MESSAGES = [
  {
    sender: 'companion',
    text: (
      'Namaste! Swagat hai aapka. Main hoon aapka "Sanjeevani Saathi".\n\n'
      + 'Pahaadon ke is shaant aangan me agar aap akele hain, toh bilkul chinta mat kijiye. '
      + 'Main hamesha aapke paas hoon — baat karne ke liye, aapke dukh-sukh sunne ke liye, ya koi purana kissa batane ke liye.\n\n'
      + 'Aapne subah chai pee li? Aaj din kaisa chal raha hai aapka?'
    ),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
];

export default function Companion() {
  const { user } = useAuth();
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [selectedMood, setSelectedMood] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [activeStory, setActiveStory] = useState(null);
  const [stories, setStories] = useState([]);
  const [dailyThought, setDailyThought] = useState(null);
  const [autoSpeak, setAutoSpeak] = useState(true);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load Stories & Daily Blessing on Mount
  useEffect(() => {
    // Fetch stories from backend
    axios.get('/api/companion/stories')
      .then((res) => {
        if (res.data?.stories) setStories(res.data.stories);
      })
      .catch(() => {
        // Fallback local stories
        setStories([
          {
            id: 'story-1',
            title: 'Chidiyan Aur Shivram Dada Ki Dosti',
            duration: '3 min',
            summary: 'Garhwal ke ek akele dada ji aur ek gauraiya chidiya ki dosti ki dil chhoo lene wali kahani.',
            text: 'Gopeshwar ke paas ek gaon me Shivram Dada akele rehte the. Rojana subah ek choti gauraiya unke aangan me aati. Dada muskura kar kehte - "Tu mujhe kabhi akela nahi mehsoos hone deti!" Prakriti hamesha humare sath hoti hai.',
          },
          {
            id: 'story-2',
            title: 'Mandakini Ke Kinare Ki Shanti',
            duration: '4 min',
            summary: 'Nadi ki behti dhara se seekhein ki chinta ko kaise pahaadi hawa me behne diya jata hai.',
            text: 'Kedar ghaati me Mandakini nadi hamesha behti rehti hai. Pahaad chahe kitne bhi kathin hon, nadi rasta bana hi leti hai. Apni chintaon ko is behti nadi ke hawale kar dijiye.',
          },
        ]);
      });

    // Fetch daily thought
    axios.get('/api/companion/daily-thought')
      .then((res) => {
        if (res.data?.thought) setDailyThought(res.data.thought);
      })
      .catch(() => {
        setDailyThought({
          quote: 'Aap akele bilkul nahi hain — pahaadon ki shanti aur hamara sneh hamesha aapke sath hai.',
          author: 'Sanjeevani Saathi',
          action: 'Aaj thodi der dhoop me baithkar ek gunguni chai ka anand lein.',
        });
      });

    // Setup speech recognition if supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'hi-IN';

      rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setInputText(transcript);
        handleSendMessage(transcript);
      };

      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);

      recognitionRef.current = rec;
    }
  }, []);

  const handleToggleMic = () => {
    if (!recognitionRef.current) {
      toast.error('Voice input is not supported in this browser. Please type your message.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast('Aapki aawaz sun raha hoon... Kahiye', { icon: '🎙️' });
      } catch {
        setIsListening(false);
      }
    }
  };

  const handleSelectMood = async (mood) => {
    setSelectedMood(mood.id);
    const userPrompt = `Maine abhi mehsoos kiya ki main thoda "${mood.label}" hoon.`;
    handleSendMessage(userPrompt, mood.id);
  };

  const handleSendMessage = async (textToSend = inputText, overrideMood = selectedMood) => {
    const text = (textToSend || '').trim();
    if (!text) return;

    const userMessage = {
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsReplying(true);

    try {
      const historyTurns = messages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        text: m.text,
      }));

      const res = await axios.post('/api/companion/chat', {
        message: text,
        user_name: user?.name || 'Aadarniya Mitra',
        language: 'hindi',
        mood: overrideMood,
        history: historyTurns,
      });

      const replyText = res.data.reply;
      const companionMessage = {
        sender: 'companion',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        emergency: res.data.emergency_triggered,
      };

      setMessages((prev) => [...prev, companionMessage]);

      if (autoSpeak) {
        speakCue(replyText, 'hi-IN');
      }
    } catch (err) {
      // Offline / fallback gentle response
      const fallbackReplies = [
        'Aapki baat mere dil ko chhoo gayi. Kabhi-kabhi man ka bojh halka karne ke liye bas keh dena hi kaafi hota hai. Main hamesha yahin hoon aapke liye.',
        'Aap bilkul akele nahi hain. Bahar pahaadon ki hawa aur suraj ki dhoop bhi hume yaad dilati hai ki har din ek naya sneh leke aata hai.',
        'Sanjeevani Saathi aapke sath hai. Kahiye, aur kya mann me chal raha hai aapke?',
      ];
      const reply = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];

      const companionMessage = {
        sender: 'companion',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, companionMessage]);

      if (autoSpeak) {
        speakCue(reply, 'hi-IN');
      }
    } finally {
      setIsReplying(false);
    }
  };

  return (
    <div className="min-h-screen bg-mist text-primary pb-16">
      {/* Top Header */}
      <div className="bg-gradient-to-b from-[#D4A359]/15 via-white/80 to-mist border-b border-border-subtle pt-8 pb-10 px-4">
        <div className="max-w-5xl mx-auto">
          <Link
            to="/mitra"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-primary mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Mitra Dashboard
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-gold-warm/15 text-gold-warm px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                <HeartHandshake className="w-3.5 h-3.5" /> Apno Sa Saathi • Ek Pyara Saathi
              </div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-primary">
                Sanjeevani Saathi (संजीवनी साथी)
              </h1>
              <p className="text-xs md:text-sm text-muted mt-1 max-w-xl leading-relaxed">
                A caring companion for times when you are living alone in the village. Talk freely, share memories, listen to folk stories, and feel valued.
              </p>
            </div>

            {/* Helpline Quick Button */}
            <div className="flex items-center gap-2">
              <a
                href="tel:14416"
                className="flex items-center gap-1.5 bg-warm-indigo hover:bg-[#283852] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs"
                title="National Tele-MANAS Mental Health Helpline (Toll-Free)"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Tele-MANAS: 14416</span>
              </a>
              <button
                onClick={() => setAutoSpeak(!autoSpeak)}
                className={`p-2 rounded-xl border text-xs font-semibold transition-all ${
                  autoSpeak ? 'bg-sage/15 text-sage border-sage/30' : 'bg-card text-muted border-border-subtle'
                }`}
                title="Toggle Voice Speech Output"
              >
                {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-8 space-y-8">
        {/* ── DAILY BLESSING & REASSURANCE BANNER ──────────────────── */}
        {dailyThought && (
          <div className="bg-gradient-to-r from-gold-warm/10 via-white to-sage/10 rounded-3xl p-5 border border-gold-warm/25 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gold-warm text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="font-serif italic text-sm text-primary">
                  "{dailyThought.quote}"
                </p>
                <p className="text-[11px] text-muted mt-0.5">
                  <strong className="text-sage">Aaj Ka Sujhaav:</strong> {dailyThought.action}
                </p>
              </div>
            </div>
            <button
              onClick={() => speakCue(dailyThought.quote, 'hi-IN')}
              className="flex items-center gap-1.5 text-xs font-bold text-gold-warm hover:text-[#9e7428] shrink-0 self-end md:self-center"
            >
              <Volume2 className="w-3.5 h-3.5" /> Suniye
            </button>
          </div>
        )}

        {/* ── SECTION 1: "MANN KA HAAL" (EMOTION CHECK-IN) ──────────── */}
        <div className="bg-card rounded-3xl p-6 border border-border-subtle shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-base text-primary flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-soft" />
                Mann Ka Haal (आज आपका मन कैसा है?)
              </h3>
              <p className="text-xs text-muted">Tap on whatever you are feeling — we will talk about it with care.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
            {MOOD_OPTIONS.map((mood) => {
              const isSelected = selectedMood === mood.id;
              return (
                <button
                  key={mood.id}
                  onClick={() => handleSelectMood(mood)}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    isSelected
                      ? `${mood.color} ring-2 ring-gold-warm/50 shadow-xs`
                      : 'bg-mist border-border-subtle hover:border-gold-warm/30'
                  }`}
                >
                  <span className="text-2xl block mb-1">{mood.icon}</span>
                  <span className="text-xs font-bold block text-primary truncate">{mood.label}</span>
                  <span className="text-[10px] text-muted block">{mood.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── SECTION 2: HEART-TO-HEART CHAT SPACE ──────────────────── */}
        <div className="bg-card rounded-3xl border border-border-subtle shadow-sm overflow-hidden flex flex-col h-[520px]">
          {/* Companion Chat Header */}
          <div className="p-4 bg-mist/60 border-b border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gold-warm text-white flex items-center justify-center shadow-xs">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-primary">
                  Sanjeevani Saathi (आपका अपना मित्र)
                </h4>
                <p className="text-[10px] text-muted flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  Hamesha aapke sath • Listening with care
                </p>
              </div>
            </div>

            {/* Conversation Prompts */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted">
              <span className="text-[10px] uppercase font-bold">Try:</span>
              <button
                onClick={() => handleSendMessage('Mujhe ek purani sundar kahani sunao.')}
                className="bg-card hover:bg-mist px-2.5 py-1 rounded-lg border border-border-subtle text-[11px]"
              >
                📖 Kahani sunao
              </button>
              <button
                onClick={() => handleSendMessage('Aaj mausam kaisa hai aur kya karein?')}
                className="bg-card hover:bg-mist px-2.5 py-1 rounded-lg border border-border-subtle text-[11px]"
              >
                ☀️ Mausam ki baat
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4">
            {messages.map((m, idx) => {
              const isUser = m.sender === 'user';
              return (
                <div
                  key={idx}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 shadow-xs relative ${
                      isUser
                        ? 'bg-sage text-white rounded-br-xs'
                        : 'bg-mist text-primary border border-border-subtle rounded-bl-xs'
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gold-warm">
                          Sanjeevani Saathi
                        </span>
                        <button
                          onClick={() => speakCue(m.text, 'hi-IN')}
                          className="text-muted hover:text-primary transition-colors p-1"
                          title="Speak aloud"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <p className="text-xs md:text-sm whitespace-pre-line leading-relaxed">
                      {m.text}
                    </p>

                    <div
                      className={`text-[9px] mt-2 flex items-center justify-end ${
                        isUser ? 'text-white/70' : 'text-muted'
                      }`}
                    >
                      {m.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {isReplying && (
              <div className="flex justify-start">
                <div className="bg-mist p-3.5 rounded-3xl rounded-bl-xs border border-border-subtle text-xs text-muted flex items-center gap-2 animate-pulse">
                  <HeartHandshake className="w-4 h-4 text-gold-warm" />
                  <span>Aapki baat sunkar soch raha hoon...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar with Voice Button */}
          <div className="p-3.5 bg-card border-t border-border-subtle">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={handleToggleMic}
                className={`p-3 rounded-2xl transition-all ${
                  isListening
                    ? 'bg-rose-soft text-white animate-pulse shadow-md'
                    : 'bg-mist hover:bg-black/5 text-primary border border-border-subtle'
                }`}
                title={isListening ? 'Listening... Tap to stop' : 'Tap to speak your thoughts'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-gold-warm" />}
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  isListening
                    ? 'Aapki aawaz sun raha hoon... Kahiye'
                    : 'Apne man ki baat likhein ya mic dabakar kahein...'
                }
                className="flex-1 bg-mist border border-border-subtle rounded-2xl px-4 py-3 text-xs text-primary focus:outline-none focus:ring-2 focus:ring-gold-warm/40"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || isReplying}
                className="bg-gold-warm hover:bg-[#b88c42] disabled:opacity-40 text-white p-3 rounded-2xl transition-all shadow-xs"
                title="Send Message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* ── SECTION 3: PAHADI KISSE & STORIES CARDS ───────────────── */}
        <div className="bg-card rounded-3xl p-6 border border-border-subtle shadow-sm space-y-4">
          <div>
            <h3 className="font-serif font-bold text-lg text-primary flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-sage" />
              Pahadi Kisse & Kahaniyan (मन बहलाने वाली कहानियां)
            </h3>
            <p className="text-xs text-muted">Sweet folk stories of Uttarakhand and Himalayan wisdom to bring a smile to your face.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stories.map((story) => (
              <div
                key={story.id}
                className="p-5 rounded-2xl bg-mist border border-border-subtle space-y-2.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] text-muted mb-1">
                    <span className="bg-sage/10 text-sage px-2 py-0.5 rounded-full font-bold uppercase">
                      {story.category || 'Folk Tale'}
                    </span>
                    <span>{story.duration}</span>
                  </div>
                  <h4 className="font-serif font-bold text-sm text-primary">{story.title}</h4>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{story.summary}</p>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={() => {
                      speakCue(story.text, 'hi-IN');
                      toast.success(`Playing: ${story.title}`);
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-sage hover:underline"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Kahani Suniye
                  </button>

                  <button
                    onClick={() => {
                      handleSendMessage(`Mujhe kahani sunao: ${story.title}`);
                    }}
                    className="text-[11px] text-muted hover:text-primary"
                  >
                    Chat me pucheiñ →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
