import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneOff, Volume2 } from 'lucide-react';
import { sendChatMessage, getOrCreateConversationId } from '../api/client';
import SanjeevaniOrb from './SanjeevaniOrb';

export default function LiveVoiceRoom({ onClose }) {
  const [isLiveActive, setIsLiveActive] = useState(true);
  const [conversationState, setConversationState] = useState('idle'); // 'listening' | 'thinking' | 'speaking'
  const [latestUserText, setLatestUserText] = useState('');
  const [latestAgentReply, setLatestAgentReply] = useState('Namaste. Main Sanjeevani hoon. Aap kaisa mehsoos kar rahe hain? Kripya aaram se batayein...');
  const [tier, setTier] = useState('Green');

  // FIX: previously each turn used a brand-new `'live-session-' + Date.now()`
  // conversation id, so the backend had no way to link turns together —
  // the exact "multi-turn bug" client.js's own comments say was fixed for
  // text chat, but voice mode had silently regressed. We now share the
  // same persisted conversation id as the text chat session.
  const conversationIdRef = useRef(getOrCreateConversationId());

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN'; // Hindi ASR — the closest supported locale for Garhwali speech
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      setConversationState('listening');
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      if (!transcript.trim()) return;

      setLatestUserText(transcript);
      setConversationState('thinking');

      try {
        // Send to Sanjeevani's Triage Engine using the SAME conversation id
        // every turn, so multi-turn context (already-asked questions,
        // phase progression) is preserved for voice sessions too.
        const res = await sendChatMessage(conversationIdRef.current, transcript);
        setLatestAgentReply(res.reply_text);
        setTier(res.tier || 'Green');

        speakAgentResponse(res.reply_text);
      } catch (err) {
        speakAgentResponse('Aapki aawaz theek se sunai nahi di, kripya dobara batayein.');
      }
    };

    recognition.onerror = (e) => {
      console.warn('Speech Recognition Event:', e.error);
      if (isLiveActive && conversationState !== 'speaking') {
        setTimeout(() => startListening(), 800);
      }
    };

    recognition.onend = () => {
      if (isLiveActive && conversationState === 'listening') {
        setTimeout(() => startListening(), 500);
      }
    };

    recognitionRef.current = recognition;
    speakAgentResponse(latestAgentReply);

    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      if (synthRef.current) synthRef.current.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startListening = () => {
    try {
      if (recognitionRef.current && conversationState !== 'speaking') {
        recognitionRef.current.start();
        setConversationState('listening');
      }
    } catch (e) {
      // Already running
    }
  };

  const speakAgentResponse = (text) => {
    if (!synthRef.current) return;

    synthRef.current.cancel();
    setConversationState('speaking');

    const cleanText = text.replace(/[*_#]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.92;

    const voices = synthRef.current.getVoices();
    const hindiVoice = voices.find((v) => v.lang.includes('hi') || v.name.includes('India'));
    if (hindiVoice) utterance.voice = hindiVoice;

    utterance.onend = () => {
      setConversationState('idle');
      if (isLiveActive) {
        setTimeout(() => startListening(), 400);
      }
    };

    synthRef.current.speak(utterance);
  };

  const handleEndCall = () => {
    setIsLiveActive(false);
    if (recognitionRef.current) recognitionRef.current.abort();
    if (synthRef.current) synthRef.current.cancel();
    onClose();
  };

  const orbState = conversationState === 'idle' ? 'idle' : conversationState;

  return (
    <div className="fixed inset-0 z-50 bg-warm-indigo/95 backdrop-blur-xl text-white flex flex-col items-center justify-between p-6 md:p-12 animate-fadeIn">

      {/* Top Calming Header */}
      <div className="w-full max-w-xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <SanjeevaniOrb state={orbState} size={36} />
          <div>
            <h3 className="font-serif font-bold text-lg text-white">Sanjeevani Live</h3>
            <p className="text-xs text-[#EFE9D9]/70">Continuous Compassionate Dialogue • Hands-Free</p>
          </div>
        </div>

        <div className="px-3 py-1 rounded-full text-xs font-semibold bg-card/10 border border-white/15 text-gold-warm flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sage animate-ping" />
          {conversationState === 'listening' ? 'Listening to you...' : conversationState === 'speaking' ? 'Speaking softly...' : 'Understanding...'}
        </div>
      </div>

      {/* Central Breathing Orb (Visual Feedback) — now the shared Sanjeevani identity */}
      <div className="flex flex-col items-center justify-center my-auto text-center max-w-lg px-4">

        <div className="relative mb-10">
          <div
            className={`w-44 h-44 md:w-56 md:h-56 rounded-full flex items-center justify-center transition-all duration-700 ${
              conversationState === 'speaking'
                ? 'bg-gradient-to-tr from-[#5A7855] via-[#D4A359] to-[#5A7855] animate-calm-pulse'
                : conversationState === 'listening'
                ? 'bg-gradient-to-tr from-[#243B55] to-[#5A7855] scale-105 shadow-[0_0_60px_rgba(90,120,85,0.4)]'
                : 'bg-card/10 scale-95 opacity-60'
            }`}
          >
            <div className="w-36 h-36 md:w-48 md:h-48 rounded-full bg-warm-indigo flex items-center justify-center">
              {conversationState === 'speaking' ? (
                <Volume2 className="w-12 h-12 text-gold-warm animate-bounce" />
              ) : conversationState === 'listening' ? (
                <Mic className="w-12 h-12 text-sage animate-pulse" />
              ) : (
                <SanjeevaniOrb state="idle" size={64} />
              )}
            </div>
          </div>
        </div>

        <div className="min-h-[100px] flex flex-col items-center justify-center space-y-2">
          {latestUserText && (
            <p className="text-xs md:text-sm text-white/60 italic">"{latestUserText}"</p>
          )}
          <p className="font-serif text-lg md:text-xl text-[#F7F5EE] leading-relaxed max-w-md font-medium">
            {latestAgentReply}
          </p>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="w-full max-w-md flex flex-col items-center gap-4">
        <p className="text-xs text-white/50 text-center">
          Just speak naturally without pressing any buttons. Sanjeevani listens and responds continuously.
        </p>

        <button
          onClick={handleEndCall}
          className="flex items-center gap-2 bg-rose-soft hover:bg-[#a14336] text-white px-8 py-3.5 rounded-full font-bold shadow-lg transition-transform hover:scale-105"
        >
          <PhoneOff className="w-5 h-5" />
          End Conversation
        </button>
      </div>

    </div>
  );
}
