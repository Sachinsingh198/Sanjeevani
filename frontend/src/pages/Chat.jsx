import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Send, Mic, MicOff, RefreshCw, User, AlertTriangle, AlertCircle, RotateCcw,
  Volume2, Settings2, Wifi, WifiOff, FileDown, PhoneCall,
  Sparkles, Stethoscope, X, ChevronLeft, ChevronRight,
  MessageSquare, Plus, Clock, Trash2, Leaf, Edit3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import TierBadge from '../components/TierBadge';
import EscalationCard from '../components/EscalationCard';
import RemedyCard from '../components/RemedyCard';
import PhaseProgress from '../components/PhaseProgress';
import CalmLoader from '../components/CalmLoader';
import SanjeevaniOrb from '../components/SanjeevaniOrb';
import SymptomChips from '../components/SymptomChips';
import AccessibilityBar from '../components/AccessibilityBar';
import StructuredBotMessage from '../components/StructuredBotMessage';
import {
  sendChatMessage, getOrCreateConversationId, resetConversationId, setStoredConversationId, getConversationDetails, checkBackendHealth,
} from '../api/client';
import { speakText, transcribeAudio } from '../api/voiceClient';
import { downloadConsultationReport } from '../api/reportsClient';
import { listSessions, clearSessionHistory, recordSessionTurn } from '../lib/sessionStore';
import { evaluateLocalRedFlags } from '../lib/localTriageFallback';

const COMORBIDITY_OPTIONS = [
  { label: 'BP', value: 'hypertension', icon: '❤️' },
  { label: 'Acidity', value: 'Hyperacidity/PepticUlcer', icon: '🫁' },
  { label: 'Pregnancy', value: 'Pregnancy', icon: '🤰' },
  { label: 'Diabetes', value: 'diabetes', icon: '💉' },
];

const QUICK_SYMPTOMS = [
  { emoji: '🌡️', label: 'Bukhar', value: 'Mujhe bukhar hai aur thakan lag rahi hai.' },
  { emoji: '🫁', label: 'Khansi', value: 'Mujhe khansi aur seene mein dard hai.' },
  { emoji: '🤕', label: 'Pet Dard', value: 'Mera pet dard ho raha hai.' },
  { emoji: '😣', label: 'Sar Dard', value: 'Mujhe sar dard aur chakkar aa rahe hain.' },
];

const INITIAL_BOT_MESSAGE = {
  sender: 'bot',
  text: 'Namaste! Main Sanjeevani hoon — aapki shaant swasthya sahayak.\n\nAap apni takleef ya lakshan yahan bolkar ya likhkar bata sakte hain. Aaram se, jaldi ki koi baat nahi.',
  tier: 'Green',
  remedies: [],
  phase: 'GREETING',
};

/* ══════════════════════════════════════════════════════════════════════
   Main Chat Component
   ══════════════════════════════════════════════════════════════════ */
export default function Chat() {
  const conversationIdRef = useRef(getOrCreateConversationId());

  /* State */
  const [messages, setMessages]             = useState([INITIAL_BOT_MESSAGE]);
  const [inputText, setInputText]           = useState('');
  const [isListening, setIsListening]       = useState(false);
  const [loading, setLoading]               = useState(false);
  const [knownConditions, setKnownConditions] = useState([]);
  const [currentPhase, setCurrentPhase]     = useState('GREETING');
  const [error, setError]                   = useState(null);
  const [sidebarOpen, setSidebarOpen]       = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const [textScale, setTextScale]           = useState(() => {
    try {
      const saved = localStorage.getItem('sanjeevani_text_scale');
      return saved ? parseFloat(saved) : 1;
    } catch {
      return 1;
    }
  });
  const [uiLang, setUiLang]                 = useState(() => {
    try {
      return localStorage.getItem('sanjeevani_ui_lang') || 'hi';
    } catch {
      return 'hi';
    }
  });
  const [detectedLanguage, setDetectedLanguage] = useState('hindi');
  const [sttLangOverride, setSttLangOverride]   = useState(null);
  const [correctingIdx, setCorrectingIdx]       = useState(null);
  const [correctionText, setCorrectionText]     = useState('');
  const [backendOnline, setBackendOnline]   = useState(null);
  const [speakingMsgIdx, setSpeakingMsgIdx] = useState(null);
  const [downloadingIdx, setDownloadingIdx] = useState(null);
  const [sessions, setSessions]             = useState([]);
  const [settingsOpen, setSettingsOpen]     = useState(false);

  /* Persist accessibility text-scale and UI language */
  useEffect(() => {
    try { localStorage.setItem('sanjeevani_text_scale', textScale); } catch { /* ignore */ }
  }, [textScale]);

  useEffect(() => {
    try { localStorage.setItem('sanjeevani_ui_lang', uiLang); } catch { /* ignore */ }
  }, [uiLang]);

  /* Refs */
  const chatEndRef        = useRef(null);
  const inputRef          = useRef(null);
  const recognitionRef    = useRef(null);
  const mediaRecorderRef  = useRef(null);
  const audioChunksRef    = useRef([]);
  const mediaStreamRef    = useRef(null);
  const stopSpeakingRef   = useRef(null);

  /* Auto-scroll */
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  /* Auto-resize textarea height to accommodate multiline text */
  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.min(Math.max(scrollHeight, 40), 140);
    textarea.style.height = `${newHeight}px`;
  }, [inputText]);

  /* Backend health */
  useEffect(() => {
    let ok = true;
    checkBackendHealth().then(v => { if (ok) setBackendOnline(v); });
    return () => { ok = false; };
  }, []);

  /* Cleanup TTS and MediaRecorder on unmount */
  useEffect(() => () => {
    stopSpeakingRef.current?.();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
    }
    if (mediaStreamRef.current) {
      try { mediaStreamRef.current.getTracks().forEach(t => t.stop()); } catch { /* ignore */ }
    }
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
  }, []);

  /* Load session history */
  const refreshSessions = useCallback(() => setSessions(listSessions()), []);
  useEffect(() => { if (sidebarOpen) refreshSessions(); }, [sidebarOpen, refreshSessions]);

  /* ── Handlers ─────────────────────────────────────────────────── */
  const toggleCondition = useCallback(v => {
    setKnownConditions(p => p.includes(v) ? p.filter(c => c !== v) : [...p, v]);
  }, []);

  const handleSelectSession = useCallback(async (session) => {
    if (!session?.conversationId) return;
    try {
      setStoredConversationId(session.conversationId);
      conversationIdRef.current = session.conversationId;
      setError(null);
      const detail = await getConversationDetails(session.conversationId).catch(() => null);
      if (detail && (detail.final_reply_text || detail.summary)) {
        setMessages([
          INITIAL_BOT_MESSAGE,
          {
            sender: 'user',
            text: `[Pichla Session ${session.conversationId.slice(0, 8)}...]`
          },
          {
            sender: 'bot',
            text: detail.final_reply_text || detail.summary,
            tier: detail.tier || session.tier || 'Green',
            flags: detail.flags || [],
            remedies: [],
            phase: detail.phase || 'CONCLUDED'
          }
        ]);
        setCurrentPhase(detail.phase || 'CONCLUDED');
        toast.success(`Session ${session.conversationId.slice(0, 8)} load hua`);
      } else {
        setMessages([
          INITIAL_BOT_MESSAGE,
          {
            sender: 'bot',
            text: `Pichla paramarsh sanchhipt: ${session.summary}`,
            tier: session.tier || 'Green',
            remedies: [],
            phase: 'CONCLUDED'
          }
        ]);
        setCurrentPhase('CONCLUDED');
        toast.success(`Session ${session.conversationId.slice(0, 8)} resume hua`);
      }
    } catch (err) {
      console.warn('Failed to load session details:', err);
    }
  }, []);

  const handleNewSession = useCallback(() => {
    resetConversationId();
    conversationIdRef.current = getOrCreateConversationId();
    setMessages([INITIAL_BOT_MESSAGE]);
    setCurrentPhase('GREETING');
    setKnownConditions([]);
    setError(null);
    inputRef.current?.focus();
    refreshSessions();
    toast.success('Naya paramarsh session shuru hua');
  }, [refreshSessions]);

  /* Fallback to browser SpeechRecognition if MediaRecorder or Sarvam STT is unavailable */
  const fallbackToWebSpeech = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Aapke browser mein aawaz pehchan upalabdh nahi hai.');
      setIsListening(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    const effectiveLang = sttLangOverride || (detectedLanguage === 'english' ? 'en-IN' : 'hi-IN');
    r.lang = effectiveLang;
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = e => {
      setInputText(e.results[0][0].transcript);
      setIsListening(false);
      toast.success('Aawaz pehchani gayi');
    };
    r.onerror = () => { setIsListening(false); };
    r.onend = () => setIsListening(false);
    recognitionRef.current = r;
    r.start();
    setIsListening(true);
    toast(`Sun raha hoon... (${effectiveLang === 'en-IN' ? 'English' : 'Hindi'} mode)`, { icon: '🎙️' });
  }, [detectedLanguage, sttLangOverride]);

  const toggleListening = useCallback(async () => {
    if (isListening) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      fallbackToWebSpeech();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        setIsListening(false);
        try {
          stream.getTracks().forEach(track => track.stop());
        } catch { /* ignore */ }

        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (audioBlob.size > 500) {
          const loadingToast = toast.loading('Sarvam Saaras STT se pehchan rahe hain...');
          try {
            const data = await transcribeAudio(audioBlob);
            toast.dismiss(loadingToast);
            if (data.transcript && data.transcript.trim()) {
              setInputText(data.transcript.trim());
              toast.success('Aawaz pehchani gayi (Sarvam AI)');
            } else {
              toast('Kripya thoda saaf ya zor se boliye.', { icon: 'ℹ️' });
            }
          } catch (err) {
            toast.dismiss(loadingToast);
            console.warn('[Sarvam STT failed, falling back to Web Speech]:', err);
            toast.error('Sarvam STT asuvidha. Offline pehchan chalu...');
            fallbackToWebSpeech();
          }
        }
      };

      recorder.start(200);
      setIsListening(true);
      toast('Sun raha hoon... Kahiye (Sarvam Saaras v3)', { icon: '🎙️' });
    } catch (err) {
      console.warn('[Microphone getUserMedia error]:', err);
      fallbackToWebSpeech();
    }
  }, [isListening, fallbackToWebSpeech]);

  const readAloud = useCallback((text, idx) => {
    stopSpeakingRef.current?.();
    stopSpeakingRef.current = speakText(text, {
      language: uiLang === 'hi' ? 'hi' : 'en', gender: 'female',
      onStart: () => setSpeakingMsgIdx(idx),
      onEnd: () => setSpeakingMsgIdx(cur => cur === idx ? null : cur),
    });
  }, [uiLang]);

  const handleDownloadReport = useCallback(async (msg, idx, format = 'docx') => {
    setDownloadingIdx(`${idx}-${format}`);
    try {
      await downloadConsultationReport({
        conversationId: conversationIdRef.current,
        tier: msg.tier,
        flags: msg.flags ?? [],
        remedies: msg.remedies ?? [],
        consultationSummary: msg.text,
        format,
      });
      toast.success(`Doctor ke liye parcha download ho gaya (${format.toUpperCase()})`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Parcha taiyar nahi ho saka.');
    } finally { setDownloadingIdx(null); }
  }, []);

  const inferPhase = response => {
    if (response.phase === 'GUARDRAIL_BLOCKED' || response.guardrail_blocked) return 'GUARDRAIL_BLOCKED';
    if (response.phase === 'EMERGENCY' || response.escalation_triggered || response.tier === 'Red') return 'EMERGENCY';
    if (response.phase === 'CONCLUDED' || response.remedies?.length > 0) return 'CONCLUDED';
    if (response.phase === 'CONSULTATION') return 'CONSULTATION';
    if (response.phase === 'GREETING') return 'GREETING';
    return currentPhase;
  };

  const lastUserText = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === 'user') return messages[i].text;
    }
    return '';
  }, [messages]);

  const lastBotIdx = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === 'bot') return i;
    }
    return -1;
  }, [messages]);

  const sendText = useCallback(async rawText => {
    const trimmed = rawText.trim();
    if (!trimmed || loading) return;
    setInputText(''); setError(null);
    setMessages(p => [...p, { sender: 'user', text: trimmed }]);
    setLoading(true);
    try {
      // Enforce client-side timeout (~20s) distinct from generic axios timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('REQUEST_TIMEOUT: AI paramarsh mein 20 second se zyada samay laga. Network slow ho sakta hai.'));
        }, 20000);
      });

      const res = await Promise.race([
        sendChatMessage(conversationIdRef.current, trimmed, knownConditions),
        timeoutPromise
      ]);

      if (res.detected_language) setDetectedLanguage(res.detected_language);
      const phase = (res.phase !== undefined && res.phase !== null && res.phase !== '') ? res.phase : inferPhase(res);
      setCurrentPhase(phase);
      setMessages(p => [...p, {
        sender: 'bot',
        text: res.reply_text,
        tier: res.tier,
        flags: res.flags ?? [],
        remedies: res.remedies ?? [],
        escalation: res.escalation_triggered,
        phase,
        consultation_summary: res.consultation_summary,
        is_offline_fallback: Boolean(res.is_offline_fallback),
      }]);
      recordSessionTurn({ conversationId: conversationIdRef.current, summary: trimmed, tier: res.tier });
      refreshSessions();
    } catch (err) {
      setError(err?.response?.data?.detail ?? err.message ?? 'Unknown error');
      // Deliberately conservative fail-safe check to prevent emergency downgrade during network dropouts; not a full triage replacement.
      const fallbackCheck = evaluateLocalRedFlags(trimmed);
      if (fallbackCheck.isRed) {
        setCurrentPhase('EMERGENCY');
        setMessages(p => [...p, {
          sender: 'bot',
          text: 'चेतावनी: आपातकालीन लक्षण पहचाने गए हैं। नेटवर्क उपलब्ध न होने के कारण कृपया तुरंत 108 एम्बुलेंस को कॉल करें। (Emergency symptoms detected — network unavailable, call 108 immediately.)',
          tier: 'Red',
          flags: [fallbackCheck.flag || 'CLIENT_FALLBACK_FLAG: possible emergency — network unavailable, please call 108'],
          remedies: [],
          escalation: true,
          phase: 'EMERGENCY',
          is_offline_fallback: true,
        }]);
      } else {
        setMessages(p => [...p, {
          sender: 'bot',
          text: 'Kshama karein, abhi sampark me asuvidha hai ya timeout hua. Kripya punah prayas karein.',
          tier: 'Green',
          remedies: [],
          is_offline_fallback: true,
        }]);
      }
    } finally { setLoading(false); inputRef.current?.focus(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, knownConditions, currentPhase, refreshSessions]);

  const handleCorrectionSubmit = useCallback((e) => {
    e?.preventDefault();
    if (!correctionText.trim()) return;
    const corrected = correctionText.trim();
    setCorrectingIdx(null);
    sendText(`[CORRECTION] ${corrected}`);
  }, [correctionText, sendText]);

  const handleSend    = useCallback(e => { e?.preventDefault(); sendText(inputText); }, [inputText, sendText]);
  const handleKeyDown = useCallback(e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e); }, [handleSend]);

  /* ── Derived UI ──────────────────────────────────────────────── */
  const isEmptyChat = messages.length === 1 && messages[0].sender === 'bot';

  const orbState = loading ? 'thinking'
    : isListening ? 'listening'
    : speakingMsgIdx !== null ? 'speaking'
    : currentPhase === 'EMERGENCY' ? 'emergency'
    : 'idle';

  const stateLabel = { idle: 'Taiyar hoon', listening: 'Sun raha hoon…', thinking: 'Soch raha hoon…', speaking: 'Bol raha hoon…', emergency: 'Tatkal!' }[orbState] || '';
  const stateColor = { idle: '#5A7855', listening: '#D4A359', thinking: '#6B8DB5', speaking: '#8ED14C', emergency: '#B85042' }[orbState] || '#5A7855';

  /* ══════════════════════════════════════════════════════════════
     RENDER — ChatGPT/Gemini-style 3-column layout
     [Sidebar] [Chat Column]
     ════════════════════════════════════════════════════════════ */
  return (
    <div
      className="flex bg-mist dark:bg-[#0F1521] text-primary overflow-hidden w-full h-full"
      style={{ fontSize: `${textScale}rem` }}
    >

      {/* Mobile Backdrop for Sidebar */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs animate-fadeIn"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ════════════════════════════════════════════════════════
          LEFT SIDEBAR — History + Controls (like ChatGPT)
          ════════════════════════════════════════════════════ */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-50 md:z-0
        shrink-0 flex flex-col border-r border-sage/15 dark:border-gray-800 bg-white dark:bg-[#131E2B]
        transition-all duration-300 overflow-hidden h-full
        ${sidebarOpen ? 'w-72 md:w-64 translate-x-0 shadow-2xl md:shadow-none' : 'w-0 -translate-x-full md:translate-x-0'}
      `}>
        {sidebarOpen && (
          <>
            {/* Sidebar Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-sage/10 dark:border-gray-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-sage flex items-center justify-center">
                  <Stethoscope className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-serif font-bold text-sm text-primary">Sanjeevani</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* New Chat Button */}
            <div className="px-3 py-2.5 shrink-0">
              <button onClick={handleNewSession}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-sage/25 dark:border-gray-700 text-sage dark:text-booti-glow hover:bg-sage/8 dark:hover:bg-sage/15 transition-all text-sm font-semibold group">
                <Plus className="w-4 h-4 shrink-0" />
                Naya Paramarsh
              </button>
            </div>

            {/* Session History */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 min-h-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 px-1 mb-2 mt-1">Itihas</p>

              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Clock className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    Abhi tak koi<br />consultation record nahi
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {sessions.map(s => (
                    <div key={s.conversationId}
                      onClick={() => handleSelectSession(s)}
                      className="group flex items-start gap-2 px-2.5 py-2 rounded-xl hover:bg-sage/6 dark:hover:bg-sage/12 cursor-pointer transition-all">
                      <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${s.tier === 'Red' ? 'bg-rose-soft' : s.tier === 'Yellow' ? 'bg-gold-warm' : 'bg-sage'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-primary dark:text-[#C8D4E0] leading-snug line-clamp-2 group-hover:text-primary dark:group-hover:text-white">{s.summary || 'Consultation'}</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">{new Date(s.updatedAt).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar Bottom — Conditions + Emergency */}
            <div className="shrink-0 border-t border-sage/10 dark:border-gray-800 px-3 py-3 space-y-2">
              {/* Comorbidities */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1.5">Aapki Sthitiyan</p>
                <div className="flex flex-wrap gap-1.5">
                  {COMORBIDITY_OPTIONS.map(opt => {
                    const on = knownConditions.includes(opt.value);
                    return (
                      <button key={opt.value} onClick={() => toggleCondition(opt.value)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all ${on ? 'bg-sage text-white border-sage' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-sage/40'}`}>
                        {opt.icon} {on ? '✓ ' : ''}{opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Clear History */}
              {sessions.length > 0 && (
                <button onClick={() => { clearSessionHistory(); setSessions([]); }}
                  className="w-full flex items-center justify-center gap-1.5 text-[11px] text-rose-soft/70 hover:text-rose-soft hover:bg-rose-soft/8 py-1.5 rounded-lg transition-all">
                  <Trash2 className="w-3 h-3" /> Itihas Saaf Karein
                </button>
              )}

              {/* Emergency */}
              <a href="tel:108" className="w-full flex items-center justify-center gap-1.5 bg-rose-soft hover:bg-rose-soft/90 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-sm">
                <PhoneCall className="w-3.5 h-3.5" /> 108 Aapaatkaal
              </a>
            </div>
          </>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════
          MAIN CHAT COLUMN
          ════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden">

        {/* ── Top Bar (permanently pinned) ──────────────────── */}
        <div className="shrink-0 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white/95 dark:bg-[#131E2B]/95 backdrop-blur-md border-b border-sage/12 dark:border-gray-800 z-10">

          {/* Sidebar toggle */}
          <button onClick={() => setSidebarOpen(o => !o)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-sage hover:bg-sage/8 transition-all shrink-0">
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {/* ── Orb + Identity — centred like Gemini ──── */}
          <div className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group" onClick={toggleListening} title={isListening ? 'Sunna band karein' : 'Mic — tap to speak'}>
            <div className="relative shrink-0">
              <div className="hidden sm:block"><SanjeevaniOrb state={orbState} size={38} /></div>
              <div className="sm:hidden"><SanjeevaniOrb state={orbState} size={30} /></div>
              {/* Mic badge */}
              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-white dark:border-[#131E2B] flex items-center justify-center transition-all ${
                isListening ? 'bg-rose-soft animate-pulse' : 'bg-sage group-hover:bg-gold-warm'
              }`}>
                {isListening ? <MicOff className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-white" /> : <Mic className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-white" />}
              </div>
            </div>
            <div>
              <p className="font-serif font-bold text-xs sm:text-sm text-primary leading-tight">Dr. Sanjeevani</p>
              <p className="text-[9px] sm:text-[10px] font-semibold" style={{ color: stateColor }}>{stateLabel}</p>
            </div>
          </div>

          {/* Connection */}
          {backendOnline !== false && (
            <div className={`hidden sm:flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg ${
              backendOnline === null ? 'text-gray-400' : 'text-sage bg-sage/10'
            }`}>
              {backendOnline === null ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
              <span className="hidden md:inline">{backendOnline === null ? 'Jud raha…' : 'Online'}</span>
            </div>
          )}

          <div className="flex-1" />

          {/* Phase tracker (compact) */}
          <div className="hidden lg:block">
            <PhaseProgress currentPhase={currentPhase} />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <AccessibilityBar scale={textScale} onScaleChange={setTextScale} lang={uiLang} onLangChange={setUiLang} />
            <button onClick={() => setSettingsOpen(o => !o)}
              className={`p-1.5 sm:p-2 rounded-xl border text-xs transition-all ${settingsOpen ? 'bg-sage text-white border-sage' : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-sage/40'}`}>
              <Settings2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleNewSession} className="p-1.5 sm:p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:border-sage/40 transition-all" title="Naya session">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Settings Panel ──────────────────────────────────── */}
        {settingsOpen && (
          <div className="shrink-0 bg-white dark:bg-[#1A2538] border-b border-sage/12 dark:border-gray-800 px-4 py-3 animate-fadeIn">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-primary">Pahle Se Maujood Sthitiyan:</span>
              <button onClick={() => setSettingsOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {COMORBIDITY_OPTIONS.map(opt => {
                const on = knownConditions.includes(opt.value);
                return (
                  <button key={opt.value} onClick={() => toggleCondition(opt.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${on ? 'bg-sage text-white border-sage' : 'bg-white dark:bg-[#1E2A43] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-sage/40'}`}>
                    {opt.icon} {on ? '✓ ' : ''}{opt.label}
                  </button>
                );
              })}
            </div>
            {/* Mobile Phase */}
            <div className="lg:hidden mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <PhaseProgress currentPhase={currentPhase} />
            </div>
          </div>
        )}

        {/* ── Full-Width Sticky Offline Banner ──────────────────── */}
        {backendOnline === false && (
          <div className="shrink-0 mx-4 mt-2 bg-gold-warm/15 border border-gold-warm/40 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-primary animate-fadeIn shadow-xs">
            <WifiOff className="w-4 h-4 shrink-0 text-gold-warm mt-0.5" />
            <div>
              <strong className="block font-bold text-gold-warm">
                ऑफ़लाइन डेमो मोड (Offline Demo Mode):
              </strong>
              <span>
                सर्वर से संपर्क नहीं हो पा रहा है। यह अनुमानित ऑफ़लाइन सलाह है — पुष्टि हेतु नेटवर्क उपलब्ध होने पर पुनः जांचें।
              </span>
            </div>
          </div>
        )}

        {/* ── Error Banner ────────────────────────────────────── */}
        {error && (
          <div className="shrink-0 mx-4 mt-2 bg-rose-soft/10 border border-rose-soft/30 rounded-2xl p-3 flex items-start gap-2 text-xs text-rose-soft animate-fadeIn">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div><strong className="block font-bold">Takneeki Asuvidha:</strong>{error}</div>
          </div>
        )}

        {/* ── MESSAGE AREA (only this area scrolls) ── */}
        <div className="flex-1 overflow-y-auto min-h-0 relative overscroll-contain">

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              EMPTY STATE — Big centred Orb when no convo yet
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {isEmptyChat ? (
            <div className="flex flex-col items-center justify-center h-full py-4 sm:py-8 px-3 sm:px-6 animate-fadeIn">
              {/* The hero Orb */}
              <div className="relative mb-3 sm:mb-6 cursor-pointer group" onClick={toggleListening}>
                {/* Glow behind orb */}
                <div className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, ${stateColor}20 0%, transparent 70%)`, transform: 'scale(1.6)' }} />
                <div className="hidden sm:block"><SanjeevaniOrb state={orbState} size={120} showLabel={false} /></div>
                <div className="sm:hidden"><SanjeevaniOrb state={orbState} size={64} showLabel={false} /></div>
                {/* Big mic ring */}
                <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold shadow-md transition-all ${
                  isListening
                    ? 'bg-rose-soft text-white animate-pulse'
                    : 'bg-white dark:bg-warm-indigo text-sage dark:text-booti-glow border border-sage/30 group-hover:border-sage'
                }`}>
                  {isListening ? <><MicOff className="w-3 h-3" /> Ruk jaiye</> : <><Mic className="w-3 h-3" /> Boliye</>}
                </div>
              </div>

              {/* Title */}
              <h2 className="font-serif text-lg sm:text-2xl font-bold text-primary text-center mt-2 sm:mt-4 mb-0.5 sm:mb-1">
                Namaste! 🙏
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs mb-3 sm:mb-8">
                Main Dr. Sanjeevani hoon. Aapki takleef sunne ke liye taiyar hoon.
              </p>

              {/* Symptom quick-pick tiles */}
              <div className="w-full max-w-md">
                <p className="text-[10px] sm:text-[11px] font-semibold text-gray-400 uppercase tracking-widest text-center mb-2 sm:mb-3">
                  Ya yahan se chuniye
                </p>
                <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-2.5 sm:mb-4">
                  {QUICK_SYMPTOMS.map(s => (
                    <button key={s.value} onClick={() => sendText(s.value)}
                      className="flex flex-col items-center gap-1 sm:gap-1.5 py-2 sm:py-3 px-1 sm:px-2 rounded-xl sm:rounded-2xl bg-white dark:bg-[#1A2538] border border-gray-200 dark:border-gray-700 hover:border-sage/50 hover:shadow-sm transition-all active:scale-95 group">
                      <span className="text-lg sm:text-2xl group-hover:scale-110 transition-transform">{s.emoji}</span>
                      <span className="text-[10px] sm:text-[11px] font-bold text-primary dark:text-[#C8D4E0] truncate max-w-full">{s.label}</span>
                    </button>
                  ))}
                </div>
                {/* Text chips */}
                <SymptomChips disabled={loading} onPick={val => sendText(val)} />
              </div>
            </div>
          ) : (
            /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                ACTIVE CHAT — message bubbles
               ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
            <div className="max-w-2xl mx-auto w-full px-2.5 sm:px-4 py-3 sm:py-6 space-y-2.5 sm:space-y-4">
              {messages.map((msg, idx) => (
                <MessageBubble
                  key={idx}
                  msg={msg}
                  isSpeaking={speakingMsgIdx === idx}
                  isDownloading={downloadingIdx?.startsWith(`${idx}-`)}
                  downloadingFormat={downloadingIdx?.replace(`${idx}-`, '')}
                  isLatestBot={idx === lastBotIdx}
                  currentPhase={currentPhase}
                  isCorrecting={correctingIdx === idx}
                  correctionText={correctionText}
                  onStartCorrection={() => {
                    setCorrectionText(lastUserText);
                    setCorrectingIdx(idx);
                  }}
                  onCancelCorrection={() => setCorrectingIdx(null)}
                  onCorrectionChange={setCorrectionText}
                  onSubmitCorrection={handleCorrectionSubmit}
                  onReadAloud={() => readAloud(msg.text, idx)}
                  onDownloadReport={(format) => handleDownloadReport(msg, idx, format)}
                />
              ))}
              {loading && <div className="py-1"><CalmLoader /></div>}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* ── INPUT BAR — permanently docked ─────────────────── */}
        <div className="shrink-0 bg-white/95 dark:bg-[#131E2B]/95 backdrop-blur-md border-t border-sage/12 dark:border-gray-800 z-10">
          {/* Condition strip */}
          {knownConditions.length > 0 && (
            <div className="max-w-2xl mx-auto px-3 sm:px-4 pt-1.5 sm:pt-2 flex items-center gap-1.5">
              <Leaf className="w-3 h-3 text-sage shrink-0" />
              <span className="text-[9px] sm:text-[10px] text-gray-400 truncate">Sthitiyan: {knownConditions.join(', ')}</span>
            </div>
          )}
          <form onSubmit={handleSend} className="max-w-2xl mx-auto flex items-end gap-1.5 sm:gap-2 p-2 sm:p-3">
            {/* Mic */}
            <button type="button" onClick={toggleListening}
              className={`shrink-0 w-9 h-9 sm:w-10 sm:h-10 mb-0.5 rounded-lg sm:rounded-xl flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-rose-soft text-white animate-pulse ring-4 ring-[#B85042]/20 shadow-md'
                  : 'bg-sage/10 border border-sage/25 text-sage dark:text-booti-glow hover:bg-sage/15'
              }`}
              aria-label="Voice input"
            >
              {isListening ? <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>

            {/* Manual EN/HI STT Voice Toggle */}
            <button
              type="button"
              onClick={() => {
                const current = sttLangOverride || (detectedLanguage === 'english' ? 'en-IN' : 'hi-IN');
                const next = current === 'en-IN' ? 'hi-IN' : 'en-IN';
                setSttLangOverride(next);
                toast.success(`Voice language: ${next === 'en-IN' ? 'English (en-IN)' : 'Hindi (hi-IN)'}`);
              }}
              className="shrink-0 h-9 sm:h-10 mb-0.5 px-2 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1A2538] text-[10px] sm:text-[11px] font-bold text-sage dark:text-booti-glow hover:bg-sage/10 transition-all flex items-center justify-center"
              title="Voice Language Toggle (EN/HI)"
            >
              {(sttLangOverride || (detectedLanguage === 'english' ? 'en-IN' : 'hi-IN')) === 'en-IN' ? 'EN' : 'HI'}
            </button>

            {/* Expandable Textarea */}
            <textarea
              ref={inputRef}
              rows={1}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? 'Sun raha hoon… 🎙️' : 'Apne lakshan batayein ya likhein… (Shift+Enter for new line)'}
              disabled={loading}
              className="flex-1 min-w-0 bg-mist dark:bg-[#0F1521] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-primary focus:outline-none focus:ring-2 focus:ring-sage/50 disabled:opacity-60 placeholder-gray-400 dark:placeholder-gray-600 resize-none overflow-y-auto leading-relaxed transition-[height] duration-75 ease-out"
            />

            {/* Send */}
            <button type="submit" disabled={!inputText.trim() || loading}
              className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 mb-0.5 bg-sage hover:bg-sage/90 text-white rounded-lg sm:rounded-xl flex items-center justify-center transition-all disabled:opacity-40 shadow-sm"
              aria-label="Send"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

/* ── MessageBubble ─────────────────────────────────────────────────────── */
function MessageBubble({
  msg,
  onReadAloud,
  isSpeaking,
  onDownloadReport,
  isDownloading,
  downloadingFormat,
  isLatestBot,
  currentPhase,
  isCorrecting,
  correctionText,
  onStartCorrection,
  onCancelCorrection,
  onCorrectionChange,
  onSubmitCorrection,
}) {
  const isUser = msg.sender === 'user';
  return (
    <div className={`flex gap-1.5 sm:gap-2.5 ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
      {!isUser && (
        <div className="shrink-0 mt-0.5">
          <div className="hidden sm:block"><SanjeevaniOrb state={isSpeaking ? 'speaking' : 'idle'} size={28} /></div>
          <div className="sm:hidden"><SanjeevaniOrb state={isSpeaking ? 'speaking' : 'idle'} size={22} /></div>
        </div>
      )}
      <div className={`max-w-[88%] sm:max-w-[75%] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm shadow-xs ${
        isUser
          ? 'bg-sage text-white rounded-br-none'
          : msg.tier === 'Red'
            ? 'bg-red-50/95 dark:bg-[#201010] text-primary rounded-bl-none border-t-4 border-t-red-600 border-x border-b border-red-500/40 shadow-md ring-2 ring-red-500/20'
            : 'bg-white dark:bg-[#1A2538] text-primary rounded-bl-none border border-sage/10 dark:border-gray-700/60'
      }`}>
        {!isUser && (
          <div className={`mb-1.5 sm:mb-2 flex items-center justify-between gap-2 border-b ${msg.tier === 'Red' ? 'border-red-500/30' : 'border-sage/10 dark:border-gray-700/50'} pb-1 sm:pb-1.5`}>
            {msg.tier === 'Red' ? (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600 text-white font-extrabold text-[11px] shadow-sm animate-pulse">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>EMERGENCY ALERT (108)</span>
              </div>
            ) : (msg.tier === 'Yellow' || msg.remedies?.length > 0 || msg.phase === 'CONCLUDED') ? (
              <TierBadge tier={msg.tier} />
            ) : (
              <span className="text-[10px] sm:text-[11px] font-bold text-sage dark:text-booti-glow uppercase tracking-wider">
                Dr. Sanjeevani
              </span>
            )}
            <button onClick={onReadAloud}
              className={`p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${isSpeaking ? 'text-booti-glow animate-pulse' : 'text-gray-400 hover:text-sage'}`}
              aria-label="Read aloud">
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {!isUser && msg.is_offline_fallback && (
          <div className="mb-2 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1.5 shadow-2xs">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Answered offline (unconfirmed) • ऑफ़लाइन उत्तर (अपुष्ट)</span>
          </div>
        )}
        <div className="leading-relaxed text-xs sm:text-sm">
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
          ) : (
            <StructuredBotMessage text={msg.text} tier={msg.tier} summary={msg.consultation_summary} />
          )}
        </div>

        {/* In-consultation symptom correction */}
        {!isUser && isLatestBot && currentPhase === 'CONSULTATION' && (
          <div className="mt-2 pt-1.5 border-t border-sage/10 dark:border-gray-700/40">
            {!isCorrecting ? (
              <button
                type="button"
                onClick={onStartCorrection}
                className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 hover:text-sage dark:hover:text-booti-glow transition-colors"
                title="Pichla lakshan sudharein"
              >
                <Edit3 className="w-3 h-3" />
                <span>यह सही नहीं था / correct this</span>
              </button>
            ) : (
              <form onSubmit={onSubmitCorrection} className="mt-1 space-y-1.5 animate-fadeIn">
                <p className="text-[10px] font-semibold text-sage dark:text-booti-glow">
                  Apna lakshan sahi karein:
                </p>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={correctionText}
                    onChange={(e) => onCorrectionChange(e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-[#131E2B] text-primary focus:outline-none focus:ring-1 focus:ring-sage"
                    placeholder="Sahi lakshan likhein..."
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-sage text-white hover:bg-sage/90 transition-colors"
                  >
                    Bhejein
                  </button>
                  <button
                    type="button"
                    onClick={onCancelCorrection}
                    className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300"
                  >
                    Radd
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
        {!isUser && (msg.tier === 'Red' || msg.tier === 'Yellow') && (
          <div className="mt-2 sm:mt-2.5"><EscalationCard tier={msg.tier} flags={msg.flags ?? []} /></div>
        )}
        {!isUser && msg.phase === 'CONCLUDED' && msg.remedies?.length > 0 && (
          <div className="mt-2.5 sm:mt-3 space-y-2 pt-2 border-t border-sage/10 dark:border-gray-700/40">
            <div className="text-[10px] sm:text-[11px] font-bold text-sage dark:text-booti-glow uppercase tracking-wider">
              Sarkari AYUSH Pramanit Parcha (Verified Clinical Records):
            </div>
            {msg.remedies.map((r, i) => <RemedyCard key={i} remedy={r} index={i} />)}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => onDownloadReport('docx')}
                disabled={isDownloading}
                className="touch-target flex items-center justify-center gap-1.5 sm:gap-2 bg-gold-warm/15 hover:bg-gold-warm/25 text-primary dark:text-gold-warm text-xs font-bold py-2 sm:py-2.5 px-3 rounded-xl border border-gold-warm/30 transition-all disabled:opacity-60 cursor-pointer"
              >
                {isDownloading && downloadingFormat === 'docx' ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Taiyar ho raha hai…</>
                ) : (
                  <><FileDown className="w-3.5 h-3.5" /> Parcha (.docx)</>
                )}
              </button>
              <button
                type="button"
                onClick={() => onDownloadReport('pdf')}
                disabled={isDownloading}
                className="touch-target flex items-center justify-center gap-1.5 sm:gap-2 bg-sage/15 hover:bg-sage/25 text-primary dark:text-booti-glow text-xs font-bold py-2 sm:py-2.5 px-3 rounded-xl border border-sage/30 transition-all disabled:opacity-60 cursor-pointer"
              >
                {isDownloading && downloadingFormat === 'pdf' ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> PDF ban raha hai…</>
                ) : (
                  <><FileDown className="w-3.5 h-3.5 text-rose-500" /> Parcha (PDF)</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-sage text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
          <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </div>
      )}
    </div>
  );
}