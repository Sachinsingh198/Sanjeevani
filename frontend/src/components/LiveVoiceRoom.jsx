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
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'linear-gradient(160deg, #0F1A2B 0%, #1C2B3A 45%, #16231C 100%)' }}
    >
      {/* ── TOP BAR ────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <SanjeevaniOrb state={convState === 'idle' ? 'idle' : convState} size={28} />
          <div>
            <h2 className="font-serif font-bold text-white text-base leading-tight">Sanjeevani Live</h2>
            <p className="text-[10px] text-white/40">Haath-mukt aawaz paramarsh</p>
          </div>
        </div>

        {/* Tier + Status chip */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border border-white/10 ${tc.bg} ${tc.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${tier === 'Green' ? 'animate-pulse' : ''} ${tc.dot}`} />
            Tier {tier}
          </div>
          <button
            onClick={handleEndCall}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#B85042]/80 text-white flex items-center justify-center transition-all"
            aria-label="End call"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── CENTRAL ORB AREA ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 px-6 py-2">

        {/* The large interactive orb */}
        <div className="relative flex items-center justify-center mb-6">
          {/* Glow ring behind orb */}
          <div
            className={`absolute rounded-full transition-all duration-700 ${
              convState === 'speaking'
                ? 'w-52 h-52 bg-[#8ED14C]/12 shadow-[0_0_80px_rgba(142,209,76,0.25)]'
                : convState === 'listening'
                ? 'w-52 h-52 bg-[#D4A359]/12 shadow-[0_0_80px_rgba(212,163,89,0.25)]'
                : convState === 'thinking'
                ? 'w-52 h-52 bg-[#2E4057]/40 shadow-[0_0_60px_rgba(46,64,87,0.4)]'
                : 'w-40 h-40 bg-white/3'
            }`}
          />

          {/* Pulsing outer ring */}
          <div
            className={`absolute rounded-full border-2 transition-all duration-500 ${
              convState === 'listening'
                ? 'w-44 h-44 border-[#D4A359]/40 animate-ping'
                : convState === 'speaking'
                ? 'w-44 h-44 border-[#8ED14C]/30 animate-ping'
                : 'w-36 h-36 border-white/5'
            }`}
          />

          {/* The actual big Orb SVG */}
          <SanjeevaniOrb state={convState === 'idle' ? 'idle' : convState} size={160} />

          {/* State icon overlay at bottom of orb */}
          <div className="absolute -bottom-3 flex items-center justify-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 border-[#0F1A2B] shadow-lg transition-all ${
              convState === 'listening'
                ? 'bg-[#D4A359] text-[#1E2A43]'
                : convState === 'speaking'
                ? 'bg-[#5A7855] text-white'
                : convState === 'thinking'
                ? 'bg-[#2E4057] text-white'
                : 'bg-white/10 text-white/60'
            }`}>
              {convState === 'speaking'
                ? <Volume2 className="w-4 h-4" />
                : <Mic className={`w-4 h-4 ${convState === 'listening' ? 'animate-pulse' : ''}`} />
              }
            </div>
          </div>
        </div>

        {/* Status label */}
        <div className="text-center mb-5 mt-2">
          <p className="font-serif text-white text-xl font-bold leading-tight">{statusLabel}</p>
          <p className="text-white/40 text-xs mt-1">{statusHint}</p>
        </div>

        {/* Live transcript area — scrollable, compact */}
        <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {/* Latest user utterance */}
          {latestUserText ? (
            <div className="px-4 pt-3 pb-2 border-b border-white/8">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Aapne kaha:</p>
              <p className="text-white/70 text-xs italic">"{latestUserText}"</p>
            </div>
          ) : (
            <div className="px-4 pt-3 pb-2 border-b border-white/8">
              <p className="text-[10px] text-white/25 italic">Aapki awaaz ka intezaar hai…</p>
            </div>
          )}

          {/* AI reply */}
          <div className="px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: TIER_COLOR[tier]?.text?.replace('text-', '') || '#8ED14C' }}>
              <span className={tc.text}>Sanjeevani:</span>
            </p>
            <p className="font-serif text-white/90 text-sm leading-relaxed line-clamp-4">
              {latestReply}
            </p>
          </div>
        </div>

        {/* Instruction hint */}
        <p className="text-center text-white/25 text-[10px] mt-4 max-w-xs leading-relaxed">
          Koi button dabaane ki zaroorat nahi — Sanjeevani apne aap sunaati aur sunti hai
        </p>
      </div>

      {/* ── BOTTOM END CALL ────────────────────────────────────────── */}
      <div className="shrink-0 flex flex-col items-center gap-3 px-6 pb-8 pt-4">
        {/* Big Red End Call pill */}
        <button
          onClick={handleEndCall}
          className="flex items-center gap-3 bg-[#B85042] hover:bg-[#9a4035] active:scale-95 text-white px-10 py-4 rounded-2xl font-bold text-base transition-all shadow-lg shadow-[#B85042]/30"
        >
          <PhoneOff className="w-5 h-5" />
          Baat Khatam Karein
        </button>
        <p className="text-white/30 text-[10px]">108 Aapaatkaal ke liye call karein</p>
      </div>
    </div>
  );
}
