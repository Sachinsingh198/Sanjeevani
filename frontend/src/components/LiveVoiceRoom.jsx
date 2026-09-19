import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PhoneOff, Volume2, Mic, X, AlertCircle, Sparkles } from 'lucide-react';
import { sendChatMessage, getOrCreateConversationId } from '../api/client';
import { speakText, preloadSpeech, base64ToAudioUrl } from '../api/voiceClient';
import SanjeevaniOrb from './SanjeevaniOrb';

/* ─── Tier colour mapping ──────────────────────────────────────────────── */
const TIER_COLOR = {
  Green:  { bg: 'bg-[#5A7855]/20', text: 'text-[#8ED14C]', dot: 'bg-[#8ED14C]' },
  Yellow: { bg: 'bg-[#D4A359]/20', text: 'text-[#D4A359]', dot: 'bg-[#D4A359]' },
  Red:    { bg: 'bg-[#B85042]/25', text: 'text-[#FF7878]', dot: 'bg-[#B85042]' },
};

const INITIAL_GREETING = 'Namaste! Main Sanjeevani hoon. Aap kaisa mehsoos kar rahe hain? Baat karein…';

export default function LiveVoiceRoom({ onClose }) {
  const [convState, setConvState]             = useState('idle'); // idle | listening | thinking | speaking
  const [latestUserText, setLatestUserText]   = useState('');
  const [interimUserText, setInterimUserText] = useState('');
  const [latestReply, setLatestReply]         = useState(INITIAL_GREETING);
  const [tier, setTier]                       = useState('Green');
  const [isLiveActive, setIsLiveActive]       = useState(true);
  const [transcript, setTranscript]           = useState([]);
  const [micNotice, setMicNotice]             = useState('');

  const convId           = useRef(getOrCreateConversationId());
  const convStateRef     = useRef('idle');
  const isLiveActiveRef  = useRef(true);
  const recognitionRef   = useRef(null);
  const currentAudioRef  = useRef(null);
  const stopSpeakRef     = useRef(null);
  const silenceTimerRef  = useRef(null);
  const speechBufferRef  = useRef('');
  const isRecognizingRef = useRef(false);

  /* ── State synchronizer ─────────────────────────────────────────────── */
  const updateConvState = useCallback((nextState) => {
    convStateRef.current = nextState;
    setConvState(nextState);
  }, []);

  /* ── Speech Recognition Controls ────────────────────────────────────── */
  const startListening = useCallback(() => {
    if (!isLiveActiveRef.current) return;
    if (convStateRef.current === 'speaking' || convStateRef.current === 'thinking') return;
    try {
      if (recognitionRef.current && !isRecognizingRef.current) {
        recognitionRef.current.start();
      }
      updateConvState('listening');
      setMicNotice('');
    } catch (err) {
      if (err?.name !== 'InvalidStateError') {
        console.debug('[Sanjeevani Voice] startListening note:', err);
      }
    }
  }, [updateConvState]);

  const stopCurrentAudio = useCallback(() => {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.src = '';
      } catch { /* ignore */ }
      currentAudioRef.current = null;
    }
    stopSpeakRef.current?.();
    window.speechSynthesis?.cancel();
  }, []);

  const fallbackToVoiceClient = useCallback((text) => {
    stopSpeakRef.current?.();
    stopSpeakRef.current = speakText(text, {
      language: 'hi',
      gender: 'female',
      onStart: () => updateConvState('speaking'),
      onEnd: () => {
        updateConvState('listening');
        if (isLiveActiveRef.current) {
          setTimeout(startListening, 250);
        }
      },
    });
  }, [updateConvState, startListening]);

  const playVoiceAudio = useCallback((audioBase64, audioFormat, fallbackText) => {
    stopCurrentAudio();

    if (audioBase64) {
      try {
        const audioUrl = base64ToAudioUrl(audioBase64, audioFormat || 'wav');
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;

        audio.onplay = () => {
          updateConvState('speaking');
        };

        audio.onended = () => {
          try { URL.revokeObjectURL(audioUrl); } catch { /* ignore */ }
          currentAudioRef.current = null;
          updateConvState('listening');
          if (isLiveActiveRef.current) {
            setTimeout(startListening, 200);
          }
        };

        audio.onerror = (e) => {
          console.warn('[Sanjeevani Voice] Inline audio element error, falling back:', e);
          fallbackToVoiceClient(fallbackText);
        };

        audio.play().catch((playErr) => {
          console.warn('[Sanjeevani Voice] Play prevented by browser policy:', playErr);
          fallbackToVoiceClient(fallbackText);
        });
        return;
      } catch (err) {
        console.warn('[Sanjeevani Voice] Error initializing audio blob:', err);
      }
    }

    fallbackToVoiceClient(fallbackText);
  }, [stopCurrentAudio, updateConvState, startListening, fallbackToVoiceClient]);

  /* ── Dispatch User Query ────────────────────────────────────────────── */
  const dispatchUserMessage = useCallback(async (userText) => {
    if (!userText || !userText.trim()) return;
    const cleanText = userText.trim();

    // Reset speech accumulator and update UI
    setInterimUserText('');
    setLatestUserText(cleanText);
    speechBufferRef.current = '';
    setTranscript(prev => [...prev, { role: 'user', text: cleanText }]);
    updateConvState('thinking');

    try {
      // High-speed combined call: returns triage text AND inline Sarvam TTS audio
      const res = await sendChatMessage(convId.current, cleanText, [], 'auto', true, 'female');
      setLatestReply(res.reply_text);
      setTier(res.tier || 'Green');
      setTranscript(prev => [...prev, { role: 'ai', text: res.reply_text }]);

      const voiceText = res.spoken_reply_text || res.reply_text;
      playVoiceAudio(res.audio_base64, res.audio_format, voiceText);
    } catch (err) {
      console.error('[Sanjeevani Live] Pipeline Error:', err);
      const fallback = 'Kshama karein, kuch takneeki samasya aayi. Kripya dobara boliye.';
      setLatestReply(fallback);
      setTranscript(prev => [...prev, { role: 'ai', text: fallback }]);
      fallbackToVoiceClient(fallback);
    }
  }, [updateConvState, playVoiceAudio, fallbackToVoiceClient]);

  /* ── Initialize Speech Recognition + Lifecycle ──────────────────────── */
  useEffect(() => {
    isLiveActiveRef.current = true;
    preloadSpeech(INITIAL_GREETING, 'hi', 'female');

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setMicNotice('Aapke browser me speech recognition upalabdha nahi hai. Kripya Chrome ya Edge istemaal karein.');
      return;
    }

    const rec = new SR();
    rec.lang = 'hi-IN';
    rec.interimResults = true;  // Live instant feedback as user speaks
    rec.continuous = true;      // Never terminate on small natural pauses
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      isRecognizingRef.current = true;
      if (convStateRef.current !== 'speaking' && convStateRef.current !== 'thinking') {
        updateConvState('listening');
      }
    };

    rec.onresult = (e) => {
      // Barge-in: if Sanjeevani is currently speaking, immediately stop voice
      if (convStateRef.current === 'speaking') {
        stopCurrentAudio();
        updateConvState('listening');
      }

      let currentInterim = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        const item = e.results[i];
        const text = item[0]?.transcript || '';
        if (item.isFinal) {
          speechBufferRef.current = (speechBufferRef.current ? speechBufferRef.current + ' ' : '') + text;
        } else {
          currentInterim += text;
        }
      }

      const activeText = ((speechBufferRef.current ? speechBufferRef.current + ' ' : '') + currentInterim).trim();
      setInterimUserText(activeText);

      // Fast Voice Activity Detection (VAD) debounce:
      // When user pauses speaking for ~1000ms, dispatch immediately without waiting for browser silence timeout
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (activeText.length >= 2) {
        silenceTimerRef.current = setTimeout(() => {
          const finalSpoken = activeText.trim();
          if (finalSpoken && convStateRef.current !== 'thinking') {
            dispatchUserMessage(finalSpoken);
          }
        }, 1050);
      }
    };

    rec.onerror = (e) => {
      if (e.error === 'not-allowed') {
        setMicNotice('Microphone ki anumati (permission) band hai. Kripya browser me mic allow karein.');
      } else if (e.error === 'no-speech') {
        // Normal quiet cycle: restart if still active
        if (isLiveActiveRef.current && convStateRef.current !== 'speaking' && convStateRef.current !== 'thinking') {
          setTimeout(startListening, 300);
        }
      }
    };

    rec.onend = () => {
      isRecognizingRef.current = false;
      // Persistent auto-reconnect watchdog
      if (isLiveActiveRef.current && convStateRef.current !== 'speaking' && convStateRef.current !== 'thinking') {
        setTimeout(startListening, 200);
      }
    };

    recognitionRef.current = rec;

    // Greet user and initiate listening loop
    fallbackToVoiceClient(INITIAL_GREETING);
    const bootTimer = setTimeout(() => {
      startListening();
    }, 500);

    return () => {
      isLiveActiveRef.current = false;
      clearTimeout(bootTimer);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try { rec.abort(); } catch { /* ignore */ }
      stopCurrentAudio();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Interactive Orb / Mic Button Tap ────────────────────────────────── */
  const toggleListeningOrInterrupt = () => {
    if (convState === 'speaking') {
      stopCurrentAudio();
      updateConvState('listening');
      startListening();
    } else if (convState === 'thinking') {
      // currently synthesizing
    } else {
      startListening();
    }
  };

  const handleEndCall = () => {
    setIsLiveActive(false);
    isLiveActiveRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    try { recognitionRef.current?.abort(); } catch { /* ignore */ }
    stopCurrentAudio();
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
    idle: 'Bolna shuru karein ya Orb tap karein',
    listening: 'Baat karte rahiye (1 sec ke thairav par jawab milega)',
    thinking: 'Sanjeevani uttar taiyar kar rahi hai…',
    speaking: 'Sanjeevani bol rahi hai (Rokne ke liye Orb tap karein)',
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
            <h2 className="font-serif font-bold text-white text-base sm:text-lg leading-tight tracking-wide flex items-center gap-2">
              Sanjeevani Live
              <span className="text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full bg-[#8ED14C]/20 text-[#8ED14C] border border-[#8ED14C]/30 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Ultra Fast
              </span>
            </h2>
            <p className="text-[11px] text-white/50">Real-time Hands-free Voice Consultation • Garhwali & Hindi</p>
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
          
          {/* Permission Notice Banner if needed */}
          {micNotice && (
            <div className="w-full mb-4 px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between gap-2 shadow-lg backdrop-blur-md">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{micNotice}</span>
              </div>
              <button
                onClick={startListening}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-bold text-[11px] transition-colors shrink-0"
              >
                Mic Chalu Karein
              </button>
            </div>
          )}

          {/* Interactive Centered Orb (Clickable to interrupt / start) */}
          <div
            onClick={toggleListeningOrInterrupt}
            className="relative flex items-center justify-center mb-7 sm:mb-9 cursor-pointer group"
            title={convState === 'speaking' ? 'Tap karein bolna band karne ke liye' : 'Tap karein bolna shuru karne ke liye'}
          >
            {/* Ambient Outer Aura */}
            <div
              className={`absolute rounded-full transition-all duration-700 pointer-events-none ${
                convState === 'speaking'
                  ? 'w-52 h-52 sm:w-60 sm:h-60 bg-[#8ED14C]/20 shadow-[0_0_90px_rgba(142,209,76,0.35)]'
                  : convState === 'listening'
                  ? 'w-52 h-52 sm:w-60 sm:h-60 bg-[#D4A359]/20 shadow-[0_0_90px_rgba(212,163,89,0.35)]'
                  : convState === 'thinking'
                  ? 'w-52 h-52 sm:w-60 sm:h-60 bg-[#2E4057]/50 shadow-[0_0_80px_rgba(46,64,87,0.5)]'
                  : 'w-40 h-40 sm:w-48 sm:h-48 bg-white/5'
              }`}
            />

            {/* Pulsing Ripple Halo */}
            <div
              className={`absolute rounded-full border-2 transition-all duration-700 pointer-events-none ${
                convState === 'listening'
                  ? 'w-44 h-44 sm:w-52 sm:h-52 border-[#D4A359]/50 animate-ping'
                  : convState === 'speaking'
                  ? 'w-44 h-44 sm:w-52 sm:h-52 border-[#8ED14C]/45 animate-ping'
                  : 'w-36 h-36 border-white/5'
              }`}
            />

            {/* Majestic Sanjeevani Orb */}
            <SanjeevaniOrb state={convState === 'idle' ? 'idle' : convState} size={124} />

            {/* Mic / Volume State Badge */}
            <div className="absolute -bottom-2.5 flex items-center justify-center shadow-xl">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 border-[#09121A] transition-all ${
                convState === 'listening'
                  ? 'bg-[#D4A359] text-[#1E2A43] shadow-[0_0_20px_rgba(212,163,89,0.6)] scale-105'
                  : convState === 'speaking'
                  ? 'bg-[#5A7855] text-white shadow-[0_0_20px_rgba(90,120,85,0.6)]'
                  : convState === 'thinking'
                  ? 'bg-[#2E4057] text-white'
                  : 'bg-white/15 text-white/70'
              }`}>
                {convState === 'speaking'
                  ? <Volume2 className="w-4 h-4 animate-pulse" />
                  : <Mic className={`w-4 h-4 ${convState === 'listening' ? 'animate-bounce' : ''}`} />
              }
              </div>
            </div>
          </div>

          {/* Status Label & Micro Hint */}
          <div className="text-center mb-3 sm:mb-4">
            <h3 className="font-serif text-white text-lg sm:text-xl md:text-2xl font-bold leading-tight tracking-wide drop-shadow-sm">
              {statusLabel}
            </h3>
            <p className="text-white/65 text-xs sm:text-sm mt-1 font-medium">
              {statusHint}
            </p>
          </div>

          {/* Live Response Card */}
          <div className="w-full bg-white/8 backdrop-blur-md border border-white/15 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl transition-all">
            {/* Real-time Streaming User Speech Display */}
            {interimUserText ? (
              <div className="px-4 py-2 border-b border-white/10 bg-[#D4A359]/15 flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#D4A359] uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#D4A359] animate-ping" />
                  Sun raha hoon:
                </span>
                <span className="text-white text-xs font-semibold italic truncate">"{interimUserText}"</span>
              </div>
            ) : latestUserText ? (
              <div className="px-4 py-1.5 border-b border-white/10 bg-black/15 flex items-center gap-2">
                <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider shrink-0">Aapne kaha:</span>
                <span className="text-white/90 text-xs italic truncate">"{latestUserText}"</span>
              </div>
            ) : (
              <div className="px-4 py-1.5 border-b border-white/10 bg-black/15 flex items-center justify-between">
                <span className="text-[10px] text-white/40 italic">Aapki awaaz ka intezaar hai… (Boliye ya Orb tap karein)</span>
                <span className="text-[9px] text-[#8ED14C] font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8ED14C] animate-pulse" />
                  Mic On
                </span>
              </div>
            )}

            {/* Sanjeevani Reply Text */}
            <div className="px-4 py-2.5 sm:py-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${tc.text}`}>
                  Sanjeevani
                </span>
                <span className="text-[10px] text-white/40 font-mono">
                  {convState === 'thinking' ? 'Generating Voice…' : 'Real-time Voice'}
                </span>
              </div>
              <p className="font-serif text-white/95 text-xs sm:text-sm md:text-base leading-relaxed line-clamp-2 sm:line-clamp-3">
                {latestReply}
              </p>
            </div>
          </div>

          {/* End Conversation Button */}
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
        Sanjeevani apne aap sunti aur bolti hai • Kisi bhi waqt bolkar ya Orb tap karke baat karein
      </footer>
    </div>
  );
}
