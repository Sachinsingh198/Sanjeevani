import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Mic, MicOff, RefreshCw, User, AlertTriangle, RotateCcw,
  Clock, Volume2, Settings2, Wifi, WifiOff, FileDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import TierBadge from '../components/TierBadge';
import EscalationCard from '../components/EscalationCard';
import RemedyCard from '../components/RemedyCard';
import PhaseProgress from '../components/PhaseProgress';
import CalmLoader from '../components/CalmLoader';
import SanjeevaniOrb from '../components/SanjeevaniOrb';
import SymptomChips from '../components/SymptomChips';
import SessionHistoryDrawer from '../components/SessionHistoryDrawer';
import AccessibilityBar from '../components/AccessibilityBar';
import {
  sendChatMessage, getOrCreateConversationId, resetConversationId, checkBackendHealth,
} from '../api/client';
import { speakText } from '../api/voiceClient';
import { downloadConsultationReport } from '../api/reportsClient';
import { recordSessionTurn } from '../lib/sessionStore';

// ---------------------------------------------------------------------------
// Simple inline markdown renderer — handles **bold**, *italic*, \n newlines.
// ---------------------------------------------------------------------------
function renderMarkdown(text) {
  if (!text) return null;
  return text.split('\n').map((line, li) => {
    if (!line.trim()) return <br key={li} />;
    const tokens = [];
    const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
    let lastIdx = 0;
    let match;
    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIdx) tokens.push(line.slice(lastIdx, match.index));
      if (match[1] !== undefined) {
        tokens.push(<strong key={`b-${li}-${match.index}`} className="font-semibold">{match[1]}</strong>);
      } else if (match[2] !== undefined) {
        tokens.push(<em key={`i-${li}-${match.index}`} className="italic">{match[2]}</em>);
      }
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < line.length) tokens.push(line.slice(lastIdx));
    return <p key={li} className="leading-relaxed mb-0.5">{tokens}</p>;
  });
}

const COMORBIDITY_OPTIONS = [
  { label: 'BP / Hypertension', value: 'hypertension' },
  { label: 'Gastric Ulcer', value: 'Hyperacidity/PepticUlcer' },
  { label: 'Pregnancy', value: 'Pregnancy' },
  { label: 'Diabetes', value: 'diabetes' },
];

export default function Chat() {
  const conversationIdRef = useRef(getOrCreateConversationId());

  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Namaste! Main Sanjeevani hoon — aapki shaant swasthya sahayak.\n\nAap apni bimaari ya lakshan yahan bolkar ya likhkar bata sakte hain. Aaram se, jaldi ki koi baat nahi.',
      tier: 'Green',
      remedies: [],
      phase: 'GREETING',
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [knownConditions, setKnownConditions] = useState([]);
  const [currentPhase, setCurrentPhase] = useState('GREETING');
  const [error, setError] = useState(null);

  // ── New feature state ────────────────────────────────────────────────
  const [historyOpen, setHistoryOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false); // collapses tags/session id out of the default view
  const [textScale, setTextScale] = useState(1);
  const [uiLang, setUiLang] = useState('hi');
  const [backendOnline, setBackendOnline] = useState(null); // null = checking
  const [speakingMsgIdx, setSpeakingMsgIdx] = useState(null); // which bubble is currently being read aloud
  const [downloadingIdx, setDownloadingIdx] = useState(null); // which bubble's report is being generated

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const stopSpeakingRef = useRef(null); // cleanup fn returned by speakText()

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // NEW: connection status pill — checked once on mount so the patient
  // always knows whether they're talking to the real triage engine or the
  // client-side demo simulation, instead of that switch happening silently.
  useEffect(() => {
    let mounted = true;
    checkBackendHealth().then((ok) => { if (mounted) setBackendOnline(ok); });
    return () => { mounted = false; };
  }, []);

  // Stop any in-flight speech (backend Bhashini audio or browser fallback)
  // when the component unmounts.
  useEffect(() => {
    return () => { stopSpeakingRef.current?.(); };
  }, []);

  const toggleCondition = useCallback((value) => {
    setKnownConditions(prev =>
      prev.includes(value) ? prev.filter(c => c !== value) : [...prev, value]
    );
  }, []);

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

    recognition.onresult = (e) => { setInputText(e.results[0][0].transcript); setIsListening(false); };
    recognition.onerror = () => { setIsListening(false); toast.error('Voice input error. Please try again.'); };
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  // NEW: read a bot message aloud using the backend's Bhashini (AI4Bharat /
  // Digital India) TTS pipeline for a natural Indian-accent Hindi voice.
  // Automatically falls back to the browser's built-in speechSynthesis if
  // Bhashini isn't configured or the request fails, so this never goes
  // silent. Respects the Hindi/English toggle in AccessibilityBar.
  const readAloud = useCallback((text, idx) => {
    // Stop whatever was playing before (backend audio or browser fallback)
    stopSpeakingRef.current?.();

    stopSpeakingRef.current = speakText(text, {
      language: uiLang === 'hi' ? 'hi' : 'en',
      gender: 'female',
      onStart: () => setSpeakingMsgIdx(idx),
      onEnd: () => setSpeakingMsgIdx((cur) => (cur === idx ? null : cur)),
    });
  }, [uiLang]);

  // NEW: lets the patient download the concluded consultation (tier,
  // remedies, notes) as a .docx to print or show a PHC/CHC doctor. The
  // idx param drives a per-bubble loading spinner on the download button.
  const handleDownloadReport = useCallback(async (msg, idx) => {
    setDownloadingIdx(idx);
    try {
      await downloadConsultationReport({
        conversationId: conversationIdRef.current,
        tier: msg.tier,
        flags: msg.flags ?? [],
        remedies: msg.remedies ?? [],
        consultationSummary: msg.text,
      });
      toast.success('Consultation report downloaded');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not generate report. Please try again.');
    } finally {
      setDownloadingIdx(null);
    }
  }, []);

  const inferPhase = (response) => {
    if (response.escalation_triggered || response.tier === 'Red') return 'EMERGENCY';
    if (response.remedies?.length > 0) return 'CONCLUDED';
    return currentPhase;
  };

  const sendText = useCallback(async (rawText) => {
    const trimmed = rawText.trim();
    if (!trimmed || loading) return;

    setInputText('');
    setError(null);
    setMessages(prev => [...prev, { sender: 'user', text: trimmed }]);
    setLoading(true);

    try {
      const response = await sendChatMessage(conversationIdRef.current, trimmed, knownConditions);
      const newPhase = response.phase ?? inferPhase(response);
      setCurrentPhase(newPhase);

      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: response.reply_text,
          tier: response.tier,
          flags: response.flags ?? [],
          remedies: response.remedies ?? [],
          escalation: response.escalation_triggered,
          phase: newPhase,
        },
      ]);

      // NEW: mirror this turn into local session history so it's browsable
      // later from the History drawer.
      recordSessionTurn({
        conversationId: conversationIdRef.current,
        summary: trimmed,
        tier: response.tier,
      });
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
  }, [loading, knownConditions, currentPhase]);

  const handleSend = useCallback((e) => {
    e?.preventDefault();
    sendText(inputText);
  }, [inputText, sendText]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) handleSend(e);
  }, [handleSend]);

  const showQuickChips = messages.length <= 2 && !loading;

  return (
    <div
      className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-4"
      style={{ fontSize: `${textScale}rem` }}
    >
      <SessionHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />

      {/* ── Minimal Calm Header ───────────────────────────────────────── */}
      <div className="bg-card rounded-3xl shadow-sm border border-border-subtle px-4 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <SanjeevaniOrb state={loading ? 'thinking' : 'idle'} size={40} />
          <div className="min-w-0">
            <h2 className="font-serif font-bold text-lg text-warm-indigo leading-tight truncate">
              Dr. Sanjeevani
            </h2>
            <p className="text-[11px] text-muted flex items-center gap-1">
              {backendOnline === null ? (
                'Connecting…'
              ) : backendOnline ? (
                <><Wifi className="w-3 h-3 text-sage" /> Connected</>
              ) : (
                <><WifiOff className="w-3 h-3 text-gold-warm" /> Offline demo mode</>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <AccessibilityBar scale={textScale} onScaleChange={setTextScale} lang={uiLang} onLangChange={setUiLang} />
          <button
            onClick={() => setHistoryOpen(true)}
            className="p-2 rounded-xl text-muted hover:text-primary hover:bg-black/5 transition-colors"
            title="Past sessions"
          >
            <Clock className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDetailsOpen(o => !o)}
            className={`p-2 rounded-xl transition-colors ${detailsOpen ? 'bg-warm-indigo text-white' : 'text-muted hover:text-primary hover:bg-black/5'}`}
            title="Consultation details"
          >
            <Settings2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleNewSession}
            className="p-2 rounded-xl text-muted hover:text-primary hover:bg-black/5 transition-colors"
            title="Start a new consultation session"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Collapsible Details (phase + comorbidity tags) ───────────────
          Kept out of the default view so the chat itself stays uncluttered
          — a patient in distress shouldn't have to parse a dashboard. */}
      {detailsOpen && (
        <div className="bg-card rounded-2xl border border-border-subtle p-4 animate-fadeIn space-y-3">
          <PhaseProgress currentPhase={currentPhase} />
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border-subtle">
            <span className="text-xs font-semibold text-warm-indigo">Patient Tags:</span>
            {COMORBIDITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => toggleCondition(opt.value)}
                className={`px-2.5 py-1 rounded-full text-xs border font-medium transition-all ${
                  knownConditions.includes(opt.value)
                    ? 'bg-warm-indigo text-white border-warm-indigo'
                    : 'bg-gray-100 text-primary border-gray-200 hover:border-warm-indigo/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400">
            Session ID: <code className="font-mono">{conversationIdRef.current}</code>
          </p>
        </div>
      )}

      {/* ── Error Banner ──────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span><strong>Error:</strong> {error}</span>
        </div>
      )}

      {/* ── Chat Window ───────────────────────────────────────────────── */}
      <div
        className="bg-card rounded-3xl shadow-sm border border-border-subtle flex flex-col overflow-hidden"
        style={{ height: 'clamp(440px, 60vh, 660px)' }}
      >
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
          {messages.map((msg, idx) => (
            <MessageBubble
              key={idx}
              msg={msg}
              isSpeaking={speakingMsgIdx === idx}
              isDownloading={downloadingIdx === idx}
              onReadAloud={() => readAloud(msg.text, idx)}
              onDownloadReport={() => handleDownloadReport(msg, idx)}
            />
          ))}

          {showQuickChips && (
            <div className="pt-1">
              <p className="text-[11px] text-muted mb-1.5 px-1">Ya jaldi chunein:</p>
              <SymptomChips disabled={loading} onPick={(val) => sendText(val)} />
            </div>
          )}

          {loading && <CalmLoader />}

          <div ref={chatEndRef} />
        </div>

        <form
          onSubmit={handleSend}
          className="p-3.5 bg-gray-50 border-t border-border-subtle flex items-center gap-2"
        >
          <button
            type="button"
            onClick={toggleListening}
            className={`p-2.5 rounded-xl transition-all shrink-0 ${
              isListening
                ? 'bg-rose-soft text-white animate-pulse'
                : 'bg-card border border-gray-300 text-warm-indigo hover:bg-gray-100'
            }`}
            title="Click to speak (Hindi / Garhwali)"
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Apne lakshan batayein (e.g. Gale me kharash aur sookhi khasi hai)…"
            disabled={loading}
            className="flex-1 bg-card border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-warm-indigo disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className="bg-gold-warm hover:opacity-90 text-warm-indigo p-2.5 rounded-xl font-bold transition-all disabled:opacity-50 shrink-0"
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>

      <p className="text-center text-[10px] text-gray-400">
        {knownConditions.length > 0
          ? `Active tags: ${knownConditions.join(', ')}`
          : 'Sanjeevani sirf saathi hai, doctor ka vikalp nahi.'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MessageBubble — renders a single chat turn
// ---------------------------------------------------------------------------
function MessageBubble({ msg, onReadAloud, isSpeaking, onDownloadReport, isDownloading }) {
  const isUser = msg.sender === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="shrink-0 mt-1">
          <SanjeevaniOrb state={isSpeaking ? 'speaking' : 'idle'} size={32} />
        </div>
      )}

      <div className={`
        max-w-[88%] md:max-w-[76%] rounded-2xl p-4 text-sm shadow-sm
        ${isUser
          ? 'bg-sage text-white rounded-br-none'
          : 'bg-[#F3EFE4] text-[#2A2E35] rounded-bl-none border border-border-subtle'
        }
      `}>
        {!isUser && msg.tier && (
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <TierBadge tier={msg.tier} />
            <button
              onClick={onReadAloud}
              className={`p-1 rounded-full hover:bg-black/5 transition-colors shrink-0 ${
                isSpeaking ? 'text-sage animate-pulse' : 'text-muted hover:text-warm-indigo'
              }`}
              title="Read aloud (natural Hindi voice)"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="whitespace-pre-line">
          {isUser ? msg.text : renderMarkdown(msg.text)}
        </div>

        {!isUser && (msg.tier === 'Red' || msg.tier === 'Yellow') && (
          <EscalationCard tier={msg.tier} flags={msg.flags ?? []} />
        )}

        {!isUser && msg.remedies?.length > 0 && (
          <div className="mt-2 space-y-1">
            {msg.remedies.map((remedy, i) => (
              <RemedyCard key={i} remedy={remedy} index={i} />
            ))}
            <button
              onClick={onDownloadReport}
              disabled={isDownloading}
              className="w-full mt-2 flex items-center justify-center gap-1.5 bg-warm-indigo/5 hover:bg-warm-indigo/10 text-warm-indigo text-xs font-bold py-2.5 rounded-xl border border-warm-indigo/15 transition-all disabled:opacity-60"
              title="Download this consultation as a printable report"
            >
              {isDownloading ? (
                <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Preparing report…</>
              ) : (
                <><FileDown className="w-3.5 h-3.5" /> Download Report for Doctor</>
              )}
            </button>
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-sage text-white flex items-center justify-center shrink-0 mt-1">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}