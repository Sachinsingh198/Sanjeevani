import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Mic, MicOff, RefreshCw, User, AlertTriangle, RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import TierBadge from '../components/TierBadge';
import EscalationCard from '../components/EscalationCard';
import RemedyCard from '../components/RemedyCard';
import PhaseProgress from '../components/PhaseProgress';
import TypingIndicator from '../components/TypingIndicator';
import { sendChatMessage, getOrCreateConversationId, resetConversationId } from '../api/client';

// ---------------------------------------------------------------------------
// Simple inline markdown renderer — handles **bold**, *italic*, \n newlines.
// Keeps the render dependency-free (no extra npm package needed).
// ---------------------------------------------------------------------------
function renderMarkdown(text) {
  if (!text) return null;

  // Split on newlines, then process each line
  return text.split('\n').map((line, li) => {
    if (!line.trim()) return <br key={li} />;

    // Parse inline tokens: **bold**, *italic*, plain text
    const tokens = [];
    const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
    let lastIdx = 0;
    let match;

    while ((match = regex.exec(line)) !== null) {
      // Text before this token
      if (match.index > lastIdx) {
        tokens.push(line.slice(lastIdx, match.index));
      }
      if (match[1] !== undefined) {
        // **bold**
        tokens.push(<strong key={`b-${li}-${match.index}`} className="font-semibold">{match[1]}</strong>);
      } else if (match[2] !== undefined) {
        // *italic*
        tokens.push(<em key={`i-${li}-${match.index}`} className="italic">{match[2]}</em>);
      }
      lastIdx = regex.lastIndex;
    }
    // Remaining text
    if (lastIdx < line.length) {
      tokens.push(line.slice(lastIdx));
    }

    return <p key={li} className="leading-relaxed mb-0.5">{tokens}</p>;
  });
}

// ---------------------------------------------------------------------------
// Comorbidity toggle configuration
// ---------------------------------------------------------------------------
const COMORBIDITY_OPTIONS = [
  { label: 'BP / Hypertension', value: 'hypertension' },
  { label: 'Gastric Ulcer',     value: 'Hyperacidity/PepticUlcer' },
  { label: 'Pregnancy',         value: 'Pregnancy' },
  { label: 'Diabetes',          value: 'diabetes' },
];

// ---------------------------------------------------------------------------
// Main Chat Component
// ---------------------------------------------------------------------------
export default function Chat() {
  // Stable conversation ID persisted in sessionStorage across re-renders
  const conversationIdRef = useRef(getOrCreateConversationId());

  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Namaste! Main Sanjeevani hoon — aapka AI swasthya sahayak.\n\nAap apni bimaari ya lakshan yahan bolkar ya likhkar bata sakte hain. Main aapki puri baat sunkar ek surakshit, verified gharelu upchaar suggest karunga.\n\n*(Aap Garhwali, Hindi ya Hinglish mein baat kar sakte hain)*',
      tier: 'Green',
      remedies: [],
      phase: 'GREETING',
    },
  ]);

  const [inputText, setInputText]         = useState('');
  const [isListening, setIsListening]     = useState(false);
  const [loading, setLoading]             = useState(false);
  const [knownConditions, setKnownConditions] = useState([]);
  const [currentPhase, setCurrentPhase]   = useState('GREETING');
  const [error, setError]                 = useState(null);

  const chatEndRef  = useRef(null);
  const inputRef    = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // ---------------------------------------------------------------------------
  // Comorbidity toggle
  // ---------------------------------------------------------------------------
  const toggleCondition = useCallback((value) => {
    setKnownConditions(prev =>
      prev.includes(value) ? prev.filter(c => c !== value) : [...prev, value]
    );
  }, []);

  // ---------------------------------------------------------------------------
  // New Session — clears browser session, resets messages & phase
  // ---------------------------------------------------------------------------
  const handleNewSession = useCallback(() => {
    resetConversationId();
    conversationIdRef.current = getOrCreateConversationId();
    setMessages([
      {
        sender: 'bot',
        text: 'Namaste! Naya session shuru ho gaya hai. Kripya apne naye lakshan batayein.',
        tier: 'Green',
        remedies: [],
        phase: 'GREETING',
      },
    ]);
    setCurrentPhase('GREETING');
    setKnownConditions([]);
    setError(null);
    inputRef.current?.focus();
    toast.success('New consultation session started');
  }, []);

  // ---------------------------------------------------------------------------
  // Voice Input (Web Speech API)
  // ---------------------------------------------------------------------------
  const toggleListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Voice input is not supported in this browser. Please type your symptoms.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult  = (e) => { setInputText(e.results[0][0].transcript); setIsListening(false); };
    recognition.onerror   = ()  => { setIsListening(false); toast.error('Voice input error. Please try again.'); };
    recognition.onend     = ()  => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  // ---------------------------------------------------------------------------
  // Send Message
  // ---------------------------------------------------------------------------
  const handleSend = useCallback(async (e) => {
    e?.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || loading) return;

    setInputText('');
    setError(null);
    setMessages(prev => [...prev, { sender: 'user', text: trimmed }]);
    setLoading(true);

    try {
      const response = await sendChatMessage(
        conversationIdRef.current,
        trimmed,
        knownConditions,
      );

      const newPhase = response.phase ?? inferPhase(response);
      setCurrentPhase(newPhase);

      setMessages(prev => [
        ...prev,
        {
          sender:    'bot',
          text:      response.reply_text,
          tier:      response.tier,
          flags:     response.flags ?? [],
          remedies:  response.remedies ?? [],
          escalation: response.escalation_triggered,
          phase:     newPhase,
        },
      ]);
    } catch (err) {
      const detail = err?.response?.data?.detail ?? err.message ?? 'Unknown error';
      setError(detail);
      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: 'Kshama karein, abhi sampark me asuvidha hai. Kripya kuch samay baad punah prayas karein.',
          tier: 'Green',
          remedies: [],
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [inputText, loading, knownConditions]);

  // Handle Enter key
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) handleSend(e);
  }, [handleSend]);

  // ---------------------------------------------------------------------------
  // Infer phase from response when backend doesn't expose it directly
  // (Fallback for multi-turn phase inference on frontend)
  // ---------------------------------------------------------------------------
  const inferPhase = (response) => {
    if (response.escalation_triggered || response.tier === 'Red') return 'EMERGENCY';
    if (response.remedies?.length > 0) return 'CONCLUDED';
    return currentPhase; // keep current if no signal
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-4">

      {/* ── Top Panel ─────────────────────────────────────────────────── */}
      <div className="bg-card rounded-2xl shadow-sm border border-border-subtle p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="font-serif font-bold text-xl text-[#1C2B4A] flex items-center gap-2">
              <span>🌿</span> Dr. Sanjeevani — AI Triage Room
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Manchester Triage System · Negation-Aware · RAG-Verified · LangGraph
            </p>
          </div>

          {/* Session Reset */}
          <button
            onClick={handleNewSession}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#1C2B4A] border border-[#1C2B4A]/20 px-3 py-1.5 rounded-xl hover:bg-[#1C2B4A]/5 transition-colors"
            title="Start a new consultation session"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            New Session
          </button>
        </div>

        {/* Phase Progress */}
        <PhaseProgress currentPhase={currentPhase} />

        {/* Comorbidity Tags */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border-subtle">
          <span className="text-xs font-semibold text-[#1C2B4A]">Patient Tags:</span>
          {COMORBIDITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => toggleCondition(opt.value)}
              className={`px-2.5 py-1 rounded-full text-xs border font-medium transition-all ${
                knownConditions.includes(opt.value)
                  ? 'bg-[#1C2B4A] text-white border-[#1C2B4A]'
                  : 'bg-gray-100 text-primary border-gray-200 hover:border-[#1C2B4A]/40'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error Banner ──────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span><strong>Error:</strong> {error}</span>
        </div>
      )}

      {/* ── Chat Window ───────────────────────────────────────────────── */}
      <div className="bg-card rounded-2xl shadow-sm border border-border-subtle flex flex-col overflow-hidden"
           style={{ height: 'clamp(420px, 58vh, 640px)' }}>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
          {messages.map((msg, idx) => (
            <MessageBubble key={idx} msg={msg} />
          ))}

          {/* Typing Indicator */}
          {loading && <TypingIndicator />}

          <div ref={chatEndRef} />
        </div>

        {/* ── Input Bar ─────────────────────────────────────────────── */}
        <form
          onSubmit={handleSend}
          className="p-3.5 bg-gray-50 border-t border-border-subtle flex items-center gap-2"
        >
          {/* Voice Button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`p-2.5 rounded-xl transition-all shrink-0 ${
              isListening
                ? 'bg-[#A83A32] text-white animate-pulse'
                : 'bg-card border border-gray-300 text-[#1C2B4A] hover:bg-gray-100'
            }`}
            title="Click to speak (Hindi / Garhwali)"
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Apne lakshan batayein (e.g. Gale me kharash aur sookhi khasi hai)…"
            disabled={loading}
            className="flex-1 bg-card border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C2B4A] disabled:opacity-60"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className="bg-[#E8A33D] hover:bg-[#d4902d] text-[#1C2B4A] p-2.5 rounded-xl font-bold transition-all disabled:opacity-50 shrink-0"
          >
            {loading
              ? <RefreshCw className="w-5 h-5 animate-spin" />
              : <Send className="w-5 h-5" />
            }
          </button>
        </form>
      </div>

      {/* ── Session Footer ────────────────────────────────────────────── */}
      <p className="text-center text-[10px] text-gray-400">
        Session ID: <code className="font-mono">{conversationIdRef.current}</code>
        &nbsp;·&nbsp;
        {knownConditions.length > 0
          ? `Active tags: ${knownConditions.join(', ')}`
          : 'No comorbidity tags active'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MessageBubble — renders a single chat turn
// ---------------------------------------------------------------------------
function MessageBubble({ msg }) {
  const isUser = msg.sender === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Bot Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-[#1C2B4A] text-white flex items-center justify-center shrink-0 mt-1 text-base">
          🌿
        </div>
      )}

      {/* Bubble */}
      <div className={`
        max-w-[88%] md:max-w-[76%] rounded-2xl p-4 text-sm shadow-sm
        ${isUser
          ? 'bg-[#5F7A52] text-white rounded-br-none'
          : 'bg-[#F3EFE4] text-[#2A2E35] rounded-bl-none border border-border-subtle'
        }
      `}>
        {/* Tier Badge */}
        {!isUser && msg.tier && (
          <div className="mb-2.5">
            <TierBadge tier={msg.tier} />
          </div>
        )}

        {/* Message Text with Markdown */}
        <div className="whitespace-pre-line">
          {isUser ? msg.text : renderMarkdown(msg.text)}
        </div>

        {/* Escalation Card (Red / Yellow tiers) */}
        {!isUser && (msg.tier === 'Red' || msg.tier === 'Yellow') && (
          <EscalationCard tier={msg.tier} flags={msg.flags ?? []} />
        )}

        {/* Remedy Cards (all verified remedies, not just first) */}
        {!isUser && msg.remedies?.length > 0 && (
          <div className="mt-2 space-y-1">
            {msg.remedies.map((remedy, i) => (
              <RemedyCard key={i} remedy={remedy} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-[#5F7A52] text-white flex items-center justify-center shrink-0 mt-1">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}