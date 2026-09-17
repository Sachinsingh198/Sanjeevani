import React, { useState, useEffect, useRef } from 'react';
import { PhoneOff, Volume2, Mic, X } from 'lucide-react';
import { sendChatMessage, getOrCreateConversationId } from '../api/client';
import { speakText } from '../api/voiceClient';
import SanjeevaniOrb from './SanjeevaniOrb';

/* ─── Tier colour mapping ──────────────────────────────────────────────── */
const TIER_COLOR = {
  Green:  { bg: 'bg-[#5A7855]/20', text: 'text-[#8ED14C]', dot: 'bg-[#8ED14C]' },
  Yellow: { bg: 'bg-[#D4A359]/20', text: 'text-[#D4A359]', dot: 'bg-[#D4A359]' },
  Red:    { bg: 'bg-[#B85042]/25', text: 'text-[#FF7878]', dot: 'bg-[#B85042]' },
};

export default function LiveVoiceRoom({ onClose }) {
  const [convState, setConvState]         = useState('idle'); // idle | listening | thinking | speaking
  const [latestUserText, setLatestUserText] = useState('');
  const [latestReply, setLatestReply]     = useState(
    'Namaste! Main Sanjeevani hoon.\nAap kaisa mehsoos kar rahe hain? Baat karein…'
  );
  const [tier, setTier]                   = useState('Green');
  const [isLiveActive, setIsLiveActive]   = useState(true);
  const [transcript, setTranscript]       = useState([]); // array of {role, text}

  const convId     = useRef(getOrCreateConversationId());
  const recognitionRef = useRef(null);
  const stopSpeakRef   = useRef(null);

  /* ── Init speech recognition + greet ─────────────────────────────── */
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('Speech recognition is not supported. Please use Chrome or Edge.');
      return;
    }

    const rec = new SR();
    rec.lang = 'hi-IN';
    rec.interimResults = false;
    rec.continuous = false;

    rec.onstart = () => setConvState('listening');

    rec.onresult = async (e) => {
      const text = e.results[0][0].transcript;
      if (!text.trim()) return;
      setLatestUserText(text);
      setTranscript(prev => [...prev, { role: 'user', text }]);
      setConvState('thinking');
      try {
        const res = await sendChatMessage(convId.current, text);
        setLatestReply(res.reply_text);
        setTier(res.tier || 'Green');
        setTranscript(prev => [...prev, { role: 'ai', text: res.reply_text }]);
        speakReply(res.reply_text);
      } catch {
        const fallback = 'Kshama karein, kuch gadbad hua. Dobara boliye.';
        setLatestReply(fallback);
        setTranscript(prev => [...prev, { role: 'ai', text: fallback }]);
        speakReply(fallback);
      }
    };

    rec.onerror = () => { if (isLiveActive) setTimeout(startListening, 800); };
    rec.onend   = () => { if (isLiveActive && convState === 'listening') setTimeout(startListening, 500); };

    recognitionRef.current = rec;
    speakReply(latestReply); // greet

    return () => {
      rec.abort();
      stopSpeakRef.current?.();
      window.speechSynthesis?.cancel();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startListening = () => {
    try {
      if (recognitionRef.current && convState !== 'speaking') {
        recognitionRef.current.start();
        setConvState('listening');
      }
    } catch { /* already running */ }
  };

  const speakReply = (text) => {
    stopSpeakRef.current?.();
    setConvState('speaking');
    stopSpeakRef.current = speakText(text, {
      language: 'hi', gender: 'female',
      onEnd: () => {
        setConvState('idle');
        if (isLiveActive) setTimeout(startListening, 400);
      },
    });
  };

  const handleEndCall = () => {
    setIsLiveActive(false);
    recognitionRef.current?.abort();
    stopSpeakRef.current?.();
    window.speechSynthesis?.cancel();
    onClose();
  };

  /* ── Lock background scroll while Live room is open ────────────────── */
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  /* ── Derived UI values ─────────────────────────────────────────────── */
  const tc = TIER_COLOR[tier] || TIER_COLOR.Green;

  const statusLabel = {
    idle: 'Taiyar hoon…',
    listening: 'Aapki baat sun raha hoon…',
    thinking: 'Soch raha hoon…',
    speaking: 'Bol raha hoon…',
  }[convState];

  const statusHint = {
    idle: 'Bolna shuru karein',
    listening: 'Baat karte rahiye',
    thinking: 'Thoda ruko…',
    speaking: 'Sanjeevani bol rahi hai',
  }[convState];

  /* ── RENDER ────────────────────────────────────────────────────────── */
  return (
    <div
      className="fixed inset-0 z-[99999] w-screen h-screen flex flex-col justify-between overflow-hidden select-none"
      style={{ background: 'radial-gradient(ellipse at center top, #182838 0%, #0E1824 50%, #081118 100%)' }}
    >
      {/* ── TOP HEADER BAR (CLEAN & FULL-WIDTH) ─────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4 border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <SanjeevaniOrb state={convState === 'idle' ? 'idle' : convState} size={28} />
          <div>
            <h2 className="font-serif font-bold text-white text-base sm:text-lg leading-tight tracking-wide">
              Sanjeevani Live
            </h2>
            <p className="text-[11px] text-white/50">Haath-mukt aawaz paramarsh • Hands-free Voice Consultation</p>
          </div>
        </div>

        {/* Tier + Status chip + Close button */}
        <div className="flex items-center gap-2.5">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-white/10 ${tc.bg} ${tc.text}`}>
            <span className={`w-2 h-2 rounded-full ${tier === 'Green' ? 'animate-pulse' : ''} ${tc.dot}`} />
            Tier {tier}
          </div>
          <button
            onClick={handleEndCall}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#B85042] text-white flex items-center justify-center transition-all shadow-md"
            aria-label="End call"
            title="Baat Band Karein"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── CENTRAL HERO & CONVERSATION AREA ───────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-2 sm:py-3 min-h-0 overflow-hidden">
        
        <div className="w-full max-w-md sm:max-w-lg flex flex-col items-center">
          
          {/* Majestic Centered Orb with ample breathing room for full radial animations */}
          <div className="relative flex items-center justify-center mb-8 sm:mb-10">
            {/* Ambient Outer Aura */}
            <div
              className={`absolute rounded-full transition-all duration-700 pointer-events-none ${
                convState === 'speaking'
                  ? 'w-52 h-52 sm:w-60 sm:h-60 bg-[#8ED14C]/15 shadow-[0_0_80px_rgba(142,209,76,0.3)]'
                  : convState === 'listening'
                  ? 'w-52 h-52 sm:w-60 sm:h-60 bg-[#D4A359]/15 shadow-[0_0_80px_rgba(212,163,89,0.3)]'
                  : convState === 'thinking'
                  ? 'w-52 h-52 sm:w-60 sm:h-60 bg-[#2E4057]/45 shadow-[0_0_70px_rgba(46,64,87,0.45)]'
                  : 'w-40 h-40 sm:w-48 sm:h-48 bg-white/5'
              }`}
            />

            {/* Pulsing Ripple Halo */}
            <div
              className={`absolute rounded-full border-2 transition-all duration-700 pointer-events-none ${
                convState === 'listening'
                  ? 'w-44 h-44 sm:w-52 sm:h-52 border-[#D4A359]/40 animate-ping'
                  : convState === 'speaking'
                  ? 'w-44 h-44 sm:w-52 sm:h-52 border-[#8ED14C]/35 animate-ping'
                  : 'w-36 h-36 border-white/5'
              }`}
            />

            {/* Majestic Sanjeevani Orb */}
            <SanjeevaniOrb state={convState === 'idle' ? 'idle' : convState} size={124} />

            {/* Mic / Volume State Badge */}
            <div className="absolute -bottom-2.5 flex items-center justify-center shadow-xl">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 border-[#09121A] transition-all ${
                convState === 'listening'
                  ? 'bg-[#D4A359] text-[#1E2A43] shadow-[0_0_20px_rgba(212,163,89,0.5)]'
                  : convState === 'speaking'
                  ? 'bg-[#5A7855] text-white shadow-[0_0_20px_rgba(90,120,85,0.5)]'
                  : convState === 'thinking'
                  ? 'bg-[#2E4057] text-white'
                  : 'bg-white/15 text-white/70'
              }`}>
                {convState === 'speaking'
                  ? <Volume2 className="w-4 h-4" />
                  : <Mic className={`w-4 h-4 ${convState === 'listening' ? 'animate-pulse' : ''}`} />
              }
              </div>
            </div>
          </div>

          {/* Status Label & Micro Hint */}
          <div className="text-center mb-3.5 sm:mb-4">
            <h3 className="font-serif text-white text-lg sm:text-xl md:text-2xl font-bold leading-tight tracking-wide drop-shadow-sm">
              {statusLabel}
            </h3>
            <p className="text-white/60 text-xs sm:text-sm mt-1 font-medium">
              {statusHint}
            </p>
          </div>

          {/* Live Response Card (lowered to give orb animation full clearance) */}
          <div className="w-full bg-white/8 backdrop-blur-md border border-white/15 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl transition-all">
            {/* User Speech Snippet */}
            {latestUserText ? (
              <div className="px-4 py-1.5 border-b border-white/10 bg-black/15 flex items-center gap-2">
                <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider shrink-0">Aapne kaha:</span>
                <span className="text-white/90 text-xs italic truncate">"{latestUserText}"</span>
              </div>
            ) : (
              <div className="px-4 py-1.5 border-b border-white/10 bg-black/15">
                <span className="text-[10px] text-white/35 italic">Aapki awaaz ka intezaar hai… (Bolna shuru karein)</span>
              </div>
            )}

            {/* Sanjeevani Reply Text */}
            <div className="px-4 py-2.5 sm:py-3">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${tc.text}`}>
                  Sanjeevani
                </span>
                <span className="text-[10px] text-white/40 font-mono">Real-time Voice</span>
              </div>
              <p className="font-serif text-white/95 text-xs sm:text-sm md:text-base leading-relaxed line-clamp-2 sm:line-clamp-3">
                {latestReply}
              </p>
            </div>
          </div>

          {/* End Conversation Button — WITH A PROPER, GENEROUS GAP BELOW THE RESPONSE BLOCK */}
          <div className="w-full mt-6 sm:mt-7 space-y-2">
            <button
              onClick={handleEndCall}
              className="touch-target w-full flex items-center justify-center gap-2.5 bg-[#B85042] hover:bg-[#a03e31] active:scale-98 text-white py-3 px-6 rounded-2xl font-bold text-sm sm:text-base transition-all shadow-xl shadow-[#B85042]/35 border border-white/10"
            >
              <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Baat Khatam Karein • End Call</span>
            </button>
            
            <div className="flex items-center justify-between px-2 text-[11px] text-white/45">
              <span>Haath-mukt paramarsh sakriya</span>
              <a href="tel:108" className="hover:text-red-400 font-semibold underline transition-colors">
                108 Aapaatkaal (Ambulance)
              </a>
            </div>
          </div>

        </div>

      </main>

      {/* Subtle Bottom Ambient Note */}
      <footer className="shrink-0 py-2.5 text-center text-white/30 text-[11px]">
        Koi button dabaane ki zaroorat nahi — Sanjeevani apne aap sunti aur bolti hai
      </footer>
    </div>
  );
}
