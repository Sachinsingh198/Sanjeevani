import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Send, Mic, MicOff, RefreshCw, User, AlertTriangle, AlertCircle, RotateCcw,
  Volume2, VolumeX, Settings2, Wifi, WifiOff, FileDown, PhoneCall,
  Sparkles, Stethoscope, X, ChevronLeft, ChevronRight,
  MessageSquare, Plus, Clock, Trash2, Leaf, Edit3, ThumbsUp, ThumbsDown,
  QrCode, Camera, Share2, MessageCircle, Pill, HeartPulse, Eye, ArrowRight
} from 'lucide-react';
import useTypewriter from '../lib/useTypewriter';
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
import BackButton from '../components/BackButton';
import AudioConsentModal from '../components/AudioConsentModal';
import ReferralQRModal from '../components/ReferralQRModal';
import MedicalVisionModal from '../components/MedicalVisionModal';
import ConfirmModal from '../components/ConfirmModal';
import FamilySelector from '../components/FamilySelector';
import PathyaApathyaCard from '../components/PathyaApathyaCard';
import FollowUpBanner from '../components/FollowUpBanner';
import LiveVoiceRoom from '../components/LiveVoiceRoom';
import JanAushadhiCard from '../components/JanAushadhiCard';
import { getActiveFamilyMember } from '../lib/familyStore';
import { scheduleFollowUp } from '../lib/followUpStore';
import {
  sendChatMessage, streamChatMessage, getOrCreateConversationId, resetConversationId, setStoredConversationId, getConversationDetails, checkBackendHealth,
} from '../api/client';
import { speakText, transcribeAudio } from '../api/voiceClient';
import { downloadConsultationReport } from '../api/reportsClient';
import { listSessions, clearSessionHistory, deleteSession, recordSessionTurn, fetchServerSessions, saveSessionMessages, loadSessionMessages } from '../lib/sessionStore';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { evaluateLocalRedFlags } from '../lib/localTriageFallback';
import { processOfflineConsultation } from '../lib/offlineTriageEngine';
import { queueOfflineChat } from '../lib/offlineSyncManager';

const getComorbidityOptions = (l) => [
  { label: l ? l('रक्तचाप (BP)', 'Blood Pressure (BP)', 'BP') : 'Blood Pressure (BP)', value: 'hypertension', icon: '❤️' },
  { label: l ? l('अम्लता / पित्त', 'Acidity / GERD', 'Acidity') : 'Acidity / GERD', value: 'Hyperacidity/PepticUlcer', icon: '🫁' },
  { label: l ? l('गर्भावस्था', 'Pregnancy', 'Pregnancy') : 'Pregnancy', value: 'Pregnancy', icon: '🤰' },
  { label: l ? l('मधुमेह', 'Diabetes', 'Diabetes') : 'Diabetes', value: 'diabetes', icon: '💉' },
];

const COMORBIDITY_OPTIONS = [
  { label: 'Blood Pressure (BP)', value: 'hypertension', icon: '❤️' },
  { label: 'Acidity / GERD', value: 'Hyperacidity/PepticUlcer', icon: '🫁' },
  { label: 'Pregnancy', value: 'Pregnancy', icon: '🤰' },
  { label: 'Diabetes', value: 'diabetes', icon: '💉' },
];

const STARTER_SYMPTOM_CHIPS = [
  { label: '🤒 Bukhar aur Thakan (Fever & Fatigue)', text: 'Mujhe bukhar aur badan me thakan ho rahi hai' },
  { label: '🗣️ Gale me Kharash / Khasi (Cough & Cold)', text: 'Mere gale me kharash aur sookhi khasi hai' },
  { label: '🤢 Pet me Gas / Apach (Indigestion)', text: 'Mere pet me gas, bharipan aur apach ho raha hai' },
  { label: '🤕 Sir Dard / Mund Peed (Headache)', text: 'Mere sir me dard (mund peed) ho raha hai' },
  { label: '🦵 Kamar aur Jod Dard (Joint Pain)', text: 'Mere ghutno aur kamar me dard hai' },
  { label: '🔥 Acidity aur Jalan (Heartburn)', text: 'Mujhe khatti dakar aur seene me jalan (angaro) ho rahi hai' },
];

const getQuickSymptoms = (lang) => {
  if (lang === 'en') {
    return [
      { emoji: '🌡️', label: 'Fever', value: 'I have a fever and feel fatigued.' },
      { emoji: '🫁', label: 'Cough', value: 'I have a persistent cough and chest congestion.' },
      { emoji: '🤕', label: 'Stomach Pain', value: 'I am experiencing stomach pain.' },
      { emoji: '😣', label: 'Headache', value: 'I have a headache and feel dizzy.' },
    ];
  }
  if (lang === 'hi') {
    return [
      { emoji: '🌡️', label: 'बुखार', value: 'मुझे बुखार है और थकान लग रही है।' },
      { emoji: '🫁', label: 'खांसी', value: 'मुझे खांसी और सीने में जकड़न है।' },
      { emoji: '🤕', label: 'पेट दर्द', value: 'मेरा पेट दर्द हो रहा है।' },
      { emoji: '😣', label: 'सिर दर्द', value: 'मुझे सिर दर्द और चक्कर आ रहे हैं।' },
    ];
  }
  return [
    { emoji: '🌡️', label: 'Bukhar', value: 'Mujhe bukhar hai aur thakan lag rahi hai.' },
    { emoji: '🫁', label: 'Khansi', value: 'Mujhe khansi aur seene mein dard hai.' },
    { emoji: '🤕', label: 'Pet Dard', value: 'Mera pet dard ho raha hai.' },
    { emoji: '😣', label: 'Sar Dard', value: 'Mujhe sar dard aur chakkar aa rahe hain.' },
  ];
};

const getInitialBotMessage = (lang) => {
  if (lang === 'en') {
    return {
      sender: 'bot',
      text: 'Hello! I am Dr. Sanjeevani — your calm clinical health companion.\n\nPlease describe what symptoms you are experiencing by typing or speaking. Take your time, there is no hurry.',
      tier: 'Green',
      remedies: [],
      phase: 'GREETING',
    };
  }
  if (lang === 'hi') {
    return {
      sender: 'bot',
      text: 'नमस्ते! मैं डॉ. संजीवनी हूँ — आपकी शांत स्वास्थ्य सहायक।\n\nआप अपनी तकलीफ या लक्षण यहाँ बोलकर या लिखकर बता सकते हैं। आराम से, जल्दबाज़ी की कोई बात नहीं है।',
      tier: 'Green',
      remedies: [],
      phase: 'GREETING',
    };
  }
  return {
    sender: 'bot',
    text: 'Namaste! Main Dr. Sanjeevani hoon — aapki shaant swasthya sahayak.\n\nAap apni takleef ya lakshan yahan bolkar ya likhkar bata sakte hain. Aaram se, jaldi ki koi baat nahi.',
    tier: 'Green',
    remedies: [],
    phase: 'GREETING',
  };
};

/* ══════════════════════════════════════════════════════════════════════
   Main Chat Component
   ══════════════════════════════════════════════════════════════════ */
export default function Chat() {
  const { lang, setLang, l, t, isHindi, isEnglish, isHinglish, toEnglishDigits, formatDate, textScale, setTextScale } = useLanguage();
  const [searchParams] = useSearchParams();
  const convQueryParam = searchParams.get('conv');
  const conversationIdRef = useRef(getOrCreateConversationId());

  /* State */
  const [messages, setMessages]             = useState(() => [getInitialBotMessage(lang)]);
  const [inputText, setInputText]           = useState('');
  const [isListening, setIsListening]       = useState(false);
  const [loading, setLoading]               = useState(false);
  const [showVisionModal, setShowVisionModal] = useState(false);
  const [showLiveRoom, setShowLiveRoom]     = useState(false);
  const [showJanAushadhiModal, setShowJanAushadhiModal] = useState(false);
  const [currentFamilyMember, setCurrentFamilyMember] = useState(getActiveFamilyMember);
  const [knownConditions, setKnownConditions] = useState(() => {
    try {
      const saved = localStorage.getItem('sanjeevani_conditions') || localStorage.getItem('sanjeevani_known_conditions');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [currentPhase, setCurrentPhase]     = useState('GREETING');
  const [error, setError]                   = useState(null);
  const [sidebarOpen, setSidebarOpen]       = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const [detectedLanguage, setDetectedLanguage] = useState(lang === 'en' ? 'english' : 'hindi');
  const [sttLangOverride, setSttLangOverride]   = useState(null);
  const [mobileContextOpen, setMobileContextOpen] = useState(false);

  /* Persist known conditions to both storage keys */
  useEffect(() => {
    try {
      localStorage.setItem('sanjeevani_conditions', JSON.stringify(knownConditions));
      localStorage.setItem('sanjeevani_known_conditions', JSON.stringify(knownConditions));
    } catch {}
  }, [knownConditions]);

  const [correctingIdx, setCorrectingIdx]       = useState(null);
  const [correctionText, setCorrectionText]     = useState('');
  const [backendOnline, setBackendOnline]   = useState(null);
  const [speakingMsgIdx, setSpeakingMsgIdx] = useState(null);
  const [downloadingIdx, setDownloadingIdx] = useState(null);
  const [sessions, setSessions]             = useState([]);
  const [settingsOpen, setSettingsOpen]     = useState(false);


  const [showConsentModal, setShowConsentModal] = useState(false);
  const [qrModalData, setQrModalData] = useState(null);
  const [deleteModalConfig, setDeleteModalConfig] = useState({
    isOpen: false,
    type: 'single',
    targetId: null,
    title: '',
    message: '',
  });

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
  }, []);

  /* ── Mobile Virtual Keyboard Accommodation ──────────────────────── */
  /* Uses the Visual Viewport API to dynamically resize the chat
     container when the on-screen keyboard appears, preventing the
     input bar from being hidden and messages from jumping. */
  const chatContainerRef = useRef(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return; // Not supported — graceful fallback
    const container = chatContainerRef.current;

    const handleResize = () => {
      const currentContainer = chatContainerRef.current;
      if (!currentContainer) return;
      // On mobile, when keyboard opens, visualViewport.height shrinks
      // We set the container height to match so the input stays visible
      const offsetTop = currentContainer.getBoundingClientRect().top;
      const availableHeight = vv.height - offsetTop;
      currentContainer.style.height = `${Math.max(availableHeight, 200)}px`;
    };

    vv.addEventListener('resize', handleResize);
    vv.addEventListener('scroll', handleResize);
    // Initial call
    handleResize();

    return () => {
      vv.removeEventListener('resize', handleResize);
      vv.removeEventListener('scroll', handleResize);
      // Reset height on unmount
      if (container) {
        container.style.height = '';
      }
    };
  }, []);

  /* Load session history scoped per user */
  const { user } = useAuth();
  const refreshSessions = useCallback(() => {
    fetchServerSessions(user?.id).then(res => {
      if (Array.isArray(res)) setSessions(res);
      else setSessions(listSessions(user?.id));
    }).catch(() => {
      setSessions(listSessions(user?.id));
    });
  }, [user]);

  useEffect(() => {
    refreshSessions();
  }, [user, refreshSessions]);

  const handleFamilyMemberChange = useCallback((member) => {
    setCurrentFamilyMember(member);
    if (member?.knownConditions?.length) {
      setKnownConditions(prev => Array.from(new Set([...prev, ...member.knownConditions])));
    }
  }, []);

  const handleVisionScanComplete = useCallback((scanResult) => {
    if (!scanResult) return;
    const isMedicine = scanResult.scan_type === 'prescription_medicine';
    const userMsg = {
      sender: 'user',
      text: isMedicine
        ? l('दवा पर्ची / स्ट्रिप की फोटो भेजी गई', 'Uploaded medicine strip/Rx photo for analysis', 'Dawa strip photo upload kiya')
        : l('त्वचा लक्षण / चकत्ते की फोटो भेजी गई', 'Uploaded skin rash photo for analysis', 'Skin rash photo upload kiya'),
      image: scanResult.image_url,
      isDocument: true,
    };
    const remedyList = scanResult.ayurvedic_interaction_note ? [{
      remedy_name: isMedicine
        ? l('दवा एवं आयुर्वेदिक इंटरेक्शन सलाह', 'Medicine & Ayurvedic Interaction Advisory', 'Dawa aur Ayurvedic Interaction Salah')
        : l('त्वचा देखभाल (आयुर्वेदिक लेप व काढ़ा)', 'Skin Care (Ayurvedic Lepa & Wash)', 'Twacha Care (Ayurvedic Lepa)'),
      remedy_text: scanResult.ayurvedic_interaction_note,
      ayurvedic_note: scanResult.ayurvedic_interaction_note,
      dosage: isMedicine
        ? l('एलोपैथिक दवा और आयुर्वेदिक काढ़े के बीच कम से कम 1 से 2 घंटे का अंतर रखें।', 'Maintain 1-2 hours gap between allopathic medication and Ayurvedic herbal decoctions.', 'Dawa aur kadhe me 1-2 ghante ka gap rakhein.')
        : l('दिन में 1-2 बार प्रभावित त्वचा पर हल्के हाथ से लगाएं (केवल बाहरी उपयोग हेतु)।', 'Apply gently to affected area 1-2 times daily (topical use only).', 'Din me 1-2 baar halka lagayein.'),
      source: l('आयुर्वेदिक दिशानिर्देश', 'Ayurvedic Clinical Guidance', 'Ayurvedic Margdarshika'),
      safety_check: l('सुरक्षित उपयोग मार्गदर्शिका', 'Safety Verified Guidance', 'Safety Check'),
    }] : [];

    const botMsg = {
      sender: 'bot',
      text: scanResult.plain_language_summary,
      tier: scanResult.recommended_tier || 'Green',
      phase: 'CONCLUDED',
      visionAnalysis: scanResult,
      remedies: remedyList,
      flags: scanResult.safety_warnings || [],
    };
    setMessages(prev => {
      const nextMsgs = [...prev, userMsg, botMsg];
      recordSessionTurn({
        conversationId: conversationIdRef.current,
        summary: scanResult.title || (isMedicine ? 'Medicine Strip Scan' : 'Skin Rash Scan'),
        tier: scanResult.recommended_tier || 'Green',
        userId: user?.id,
        messages: nextMsgs,
      });
      return nextMsgs;
    });
    setCurrentPhase('CONCLUDED');
    refreshSessions();
  }, [l, user?.id, refreshSessions]);


  const handleFollowUpEscalation = useCallback((followUpData) => {
    const alertMsg = {
      sender: 'bot',
      text: l(
        `ध्यान दें: 24 घंटे बाद भी ${followUpData.condition || 'लक्षण'} में सुधार नहीं हुआ है। यह स्थिति बिगड़ सकती है। कृपया तुरंत 104 या नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC) से संपर्क करें।`,
        `Attention: No improvement in ${followUpData.condition || 'symptoms'} after 24 hours. Condition may escalate. Please consult a PHC doctor or call 104 immediately.`,
        `Dhyan dein: 24 ghante baad bhi ${followUpData.condition || 'lakshan'} me sudhar nahi hua hai. Kripya turant 104 ya PHC doctor se sampark karein.`
      ),
      tier: 'Amber',
      flags: ['PROACTIVE_FOLLOWUP_WORSENED: Symptoms unresolved after 24h follow-up check-in'],
      phase: 'EMERGENCY',
      remedies: [],
    };
    setMessages(p => [...p, alertMsg]);
    setCurrentPhase('EMERGENCY');
  }, [l]);

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

      // 1. Immediately check and render local cached conversation history
      const localCached = loadSessionMessages(session.conversationId);
      if (localCached && Array.isArray(localCached) && localCached.length > 0) {
        setMessages(localCached);
        const lastBot = [...localCached].reverse().find(m => m.sender === 'bot');
        if (lastBot?.phase) setCurrentPhase(lastBot.phase);
        else setCurrentPhase('CONCLUDED');
      }

      // 2. Fetch server-side consultation details
      const detail = await getConversationDetails(session.conversationId).catch(() => null);

      if (detail && Array.isArray(detail.turns) && detail.turns.length > 0) {
        const restored = [getInitialBotMessage(lang)];

        detail.turns.forEach((turn) => {
          const rawUser = turn.raw_user_message;
          if (rawUser) {
            const isScan = /मेडिकल स्कैन|medical scan|scan photo|skin rash/i.test(rawUser);
            // Re-bind image preview from local cache if available
            const localUserMatch = localCached?.find(
              m => m.sender === 'user' && (m.text === rawUser || (isScan && m.image))
            );
            restored.push({
              sender: 'user',
              text: rawUser,
              image: localUserMatch?.image || (isScan ? turn.image_url : null),
              isDocument: isScan,
            });
          }

          if (turn.final_reply_text) {
            const isVision = (
              turn.final_reply_text.includes('Visual Skin') ||
              turn.final_reply_text.includes('Medical scan') ||
              turn.final_reply_text.includes('Findings:') ||
              /मेडिकल स्कैन|medical scan/i.test(rawUser || '')
            );

            const localBotMatch = localCached?.find(
              m => m.sender === 'bot' && m.text === turn.final_reply_text
            );

            restored.push({
              sender: 'bot',
              text: turn.final_reply_text,
              spoken_text: turn.final_reply_text,
              tier: turn.tier || session.tier || 'Green',
              flags: Array.isArray(turn.flags) ? turn.flags : [],
              remedies: Array.isArray(turn.remedies_served) && turn.remedies_served.length > 0
                ? turn.remedies_served
                : (detail.remedies || []),
              phase: turn.dialogue_phase || detail.phase || 'CONCLUDED',
              visionAnalysis: localBotMatch?.visionAnalysis || (isVision ? (detail.vision_analysis || {
                title: 'Visual Skin / Symptom Inspection',
                plain_language_summary: turn.final_reply_text,
                recommended_tier: turn.tier || 'Green',
              }) : null),
            });
          }
        });

        setMessages(restored);
        saveSessionMessages(session.conversationId, restored, user?.id);

        const latestTurn = detail.turns[detail.turns.length - 1];
        setCurrentPhase(latestTurn?.dialogue_phase || detail.phase || 'CONCLUDED');
        toast.success(l(`सत्र ${session.conversationId.slice(0, 8)} लोड हुआ`, `Session ${session.conversationId.slice(0, 8)} loaded`, `Session ${session.conversationId.slice(0, 8)} load hua`));
      } else if (!localCached && detail && (detail.final_recommendation || detail.final_reply_text || detail.summary)) {
        const replyText = detail.final_recommendation || detail.final_reply_text || detail.summary;
        const isVision = detail.vision_analysis || replyText.includes('Visual Skin') || replyText.includes('Medical scan');
        const fallbackMsgs = [
          getInitialBotMessage(lang),
          {
            sender: 'bot',
            text: replyText,
            tier: detail.tier || session.tier || 'Green',
            flags: detail.flags || [],
            remedies: detail.remedies || [],
            phase: detail.phase || 'CONCLUDED',
            visionAnalysis: detail.vision_analysis || (isVision ? {
              title: 'Visual Skin / Symptom Inspection',
              plain_language_summary: replyText,
              recommended_tier: detail.tier || 'Green',
            } : null),
          }
        ];
        setMessages(fallbackMsgs);
        saveSessionMessages(session.conversationId, fallbackMsgs, user?.id);
        setCurrentPhase(detail.phase || 'CONCLUDED');
        toast.success(l(`सत्र ${session.conversationId.slice(0, 8)} लोड हुआ`, `Session ${session.conversationId.slice(0, 8)} loaded`, `Session ${session.conversationId.slice(0, 8)} load hua`));
      } else if (!localCached) {
        setMessages([
          getInitialBotMessage(lang),
          {
            sender: 'bot',
            text: isEnglish
              ? `Previous consultation summary: ${session.summary}`
              : isHindi
              ? `पिछला परामर्श सारांश: ${session.summary}`
              : `Pichla paramarsh sanchhipt: ${session.summary}`,
            tier: session.tier || 'Green',
            remedies: [],
            phase: 'CONCLUDED'
          }
        ]);
        setCurrentPhase('CONCLUDED');
      }
    } catch (err) {
      console.warn('Failed to load session details:', err);
    }
  }, [lang, isEnglish, isHindi, l, user]);

  /* Restore session from URL query param if present */
  useEffect(() => {
    if (convQueryParam) {
      handleSelectSession({ conversationId: convQueryParam });
    }
  }, [convQueryParam, handleSelectSession]);

  const handleNewSession = useCallback(() => {
    resetConversationId();
    conversationIdRef.current = getOrCreateConversationId();
    setMessages([getInitialBotMessage(lang)]);
    setCurrentPhase('GREETING');
    setKnownConditions([]);
    setError(null);
    inputRef.current?.focus();
    refreshSessions();
    toast.success(l('नया परामर्श सत्र शुरू हुआ', 'New consultation started', 'Naya paramarsh session shuru hua'));
  }, [lang, l, refreshSessions]);

  const handleDeleteSession = useCallback((conversationId, e) => {
    e?.stopPropagation();
    e?.preventDefault();
    setDeleteModalConfig({
      isOpen: true,
      type: 'single',
      targetId: conversationId,
      title: l('परामर्श हटाएं', 'Delete Consultation'),
      message: l('क्या आप इस परामर्श को हटाना चाहते हैं?', 'Are you sure you want to delete this consultation?'),
    });
  }, [l]);

  const handleClearHistory = useCallback(() => {
    setDeleteModalConfig({
      isOpen: true,
      type: 'all',
      targetId: null,
      title: l('संपूर्ण इतिहास साफ करें', 'Clear All Consultation History'),
      message: l('क्या आप सभी परामर्श इतिहास हटाना चाहते हैं? यह वापस नहीं लाया जा सकता।', 'Are you sure you want to delete all consultation history? This cannot be undone.'),
    });
  }, [l]);

  const handleConfirmDelete = useCallback(async () => {
    if (deleteModalConfig.type === 'single') {
      const conversationId = deleteModalConfig.targetId;
      if (!conversationId) return;
      try {
        await deleteSession(conversationId, user?.id);
        setSessions((prev) => prev.filter((s) => s.conversationId !== conversationId));
        if (conversationIdRef.current === conversationId) {
          handleNewSession();
        }
        toast.success(l('परामर्श हटा दिया गया 🗑️', 'Consultation deleted 🗑️'));
      } catch (err) {
        console.warn('Failed to delete session:', err);
        toast.error(l('सत्र हटाने में विफल', 'Failed to delete session'));
      }
    } else if (deleteModalConfig.type === 'all') {
      try {
        await clearSessionHistory(user?.id);
        setSessions([]);
        handleNewSession();
        toast.success(l('संपूर्ण बातचीत इतिहास साफ कर दिया गया 🗑️', 'All consultation history cleared 🗑️'));
      } catch (err) {
        console.warn('Failed to clear session history:', err);
        toast.error(l('इतिहास साफ करने में विफल', 'Failed to clear history'));
      }
    }
  }, [deleteModalConfig, user, handleNewSession, l]);

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

  const startRecordingStream = useCallback(async () => {
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
  }, [fallbackToWebSpeech]);

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

    const consent = localStorage.getItem('sanjeevani_audio_consent');
    if (consent !== 'granted') {
      setShowConsentModal(true);
      return;
    }

    startRecordingStream();
  }, [isListening, startRecordingStream]);

  const handleConsentGranted = useCallback(() => {
    localStorage.setItem('sanjeevani_audio_consent', 'granted');
    setShowConsentModal(false);
    toast.success('आवाज़ सहमति दर्ज हुई! बोलिए 🎙️');
    startRecordingStream();
  }, [startRecordingStream]);

  const handleConsentDeclined = useCallback(() => {
    setShowConsentModal(false);
    toast('लिखित परामर्श जारी रखें।', { icon: '⌨️' });
    inputRef.current?.focus();
  }, []);

  const readAloud = useCallback((text, idx, spokenText) => {
    stopSpeakingRef.current?.();
    const candidateText = (spokenText || text || '')
      .replace(/[*_#`~>\[\]]/g, ' ')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    stopSpeakingRef.current = speakText(candidateText, {
      language: detectedLanguage === 'english' || lang === 'en' ? 'en' : 'hi',
      gender: 'female',
      onStart: () => setSpeakingMsgIdx(idx),
      onEnd: () => setSpeakingMsgIdx(cur => cur === idx ? null : cur),
    });
  }, [detectedLanguage, lang]);

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
      toast.success(l(`डॉक्टर के लिए पर्चा डाउनलोड हो गया (${format.toUpperCase()})`, `Prescription downloaded successfully (${format.toUpperCase()})`, `Doctor ke liye parcha download ho gaya (${format.toUpperCase()})`));
    } catch (err) {
      toast.error(err?.response?.data?.detail || l('पर्चा तैयार नहीं हो सका।', 'Failed to generate prescription.', 'Parcha taiyar nahi ho saka.'));
    } finally { setDownloadingIdx(null); }
  }, [l]);

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

  const lastBotText = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === 'bot') return (messages[i].text || '').toLowerCase();
    }
    return '';
  }, [messages]);

  const contextualQuickReplies = useMemo(() => {
    if (currentPhase !== 'CONSULTATION' || loading) return [];
    if (lastBotText.includes('kitne din') || lastBotText.includes('kab se') || lastBotText.includes('kitna samay') || lastBotText.includes('how many days') || lastBotText.includes('duration')) {
      return ["Aaj subah se (1 din)", "2 din se", "3–4 din se", "1 hafte se zyada"];
    }
    if (lastBotText.includes('bukhar') || lastBotText.includes('kamzori') || lastBotText.includes('saath mein') || lastBotText.includes('aur koi') || lastBotText.includes('associated') || lastBotText.includes('lakshan')) {
      return ["Haan, halka bukhar hai", "Haan, kamzori lag rahi hai", "Nahi, aur koi lakshan nahi hai"];
    }
    if (lastBotText.includes('bp') || lastBotText.includes('acidity') || lastBotText.includes('pregnancy') || lastBotText.includes('sugar') || lastBotText.includes('bimari') || lastBotText.includes('comorbid')) {
      return ["Nahi, koi bimari nahi hai", "Mujhe High BP hai", "Mujhe Acidity / Gas rehti hai", "Mujhe Sugar (Diabetes) hai"];
    }
    return [];
  }, [currentPhase, loading, lastBotText]);

  const sendText = useCallback(async rawText => {
    const trimmed = rawText.trim();
    if (!trimmed || loading) return;
    setInputText(''); setError(null);
    setMessages(p => [...p, { sender: 'user', text: trimmed }]);
    setLoading(true);

    try {
      let streamedText = '';
      let placeholderAdded = false;

      // Enforce client-side timeout (~45s) aligned with axios timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('REQUEST_TIMEOUT: AI paramarsh mein 45 second se zyada samay laga. Network slow ho sakta hai.'));
        }, 45000);
      });

      const streamingPromise = streamChatMessage(
        {
          conversation_id: conversationIdRef.current,
          message: trimmed,
          patient_context: {
            known_conditions: knownConditions,
            age: currentFamilyMember?.age,
            gender: currentFamilyMember?.gender,
          },
          language_hint: /\b(?:hindi|devanagari)\b/i.test(trimmed)
            ? 'hi'
            : /\b(?:garhwali|pahadi)\b/i.test(trimmed)
            ? 'garhwali'
            : /\b(?:english|angrezi)\b/i.test(trimmed)
            ? 'en'
            : lang === 'en'
            ? 'en'
            : lang === 'hinglish'
            ? 'hinglish'
            : 'hi',

          include_audio: false,
          voice_gender: 'female',
        },
        null,
        [],
        'auto',
        false,
        'female',
        {
          onToken: (chunk) => {
            streamedText += chunk;
            setMessages(p => {
              const last = p[p.length - 1];
              if (last && last.sender === 'bot' && last.isLiveStreaming) {
                const updated = [...p];
                updated[updated.length - 1] = {
                  ...last,
                  text: streamedText,
                };
                return updated;
              } else if (!placeholderAdded) {
                placeholderAdded = true;
                return [
                  ...p,
                  {
                    sender: 'bot',
                    text: streamedText,
                    isLiveStreaming: true,
                    tier: 'Green',
                    phase: 'CONSULTATION',
                    remedies: [],
                  }
                ];
              }
              return p;
            });
          },
          onComplete: () => {
            // handled below when Promise resolves
          },
          onError: (streamErr) => {
            console.warn('[ChatStream fallback note]:', streamErr);
          },
        }
      );

      const res = await Promise.race([streamingPromise, timeoutPromise]);

      if (res.detected_language) setDetectedLanguage(res.detected_language);
      const phase = (res.phase !== undefined && res.phase !== null && res.phase !== '') ? res.phase : inferPhase(res);
      setCurrentPhase(phase);

      if (Array.isArray(res.detected_conditions) && res.detected_conditions.length > 0) {
        setKnownConditions(prev => {
          const updated = Array.from(new Set([...prev, ...res.detected_conditions]));
          try {
            localStorage.setItem('sanjeevani_conditions', JSON.stringify(updated));
            localStorage.setItem('sanjeevani_known_conditions', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }

      const finalBotMsg = {
        sender: 'bot',
        text: res.reply_text,
        spoken_text: res.spoken_reply_text || res.reply_text,
        tier: res.tier,
        flags: res.flags ?? [],
        remedies: res.remedies ?? [],
        blocked_remedies: res.blocked_remedies ?? [],
        detected_conditions: res.detected_conditions ?? [],
        symptom_profile: res.symptom_profile ?? null,
        escalation: res.escalation_triggered,
        phase,
        consultation_summary: res.consultation_summary,
        is_offline_fallback: Boolean(res.is_offline_fallback),
        isLiveStreaming: false,
      };

      setMessages(p => {
        const last = p[p.length - 1];
        let nextMsgs;
        if (last && last.sender === 'bot' && last.isLiveStreaming) {
          const updated = [...p];
          updated[updated.length - 1] = finalBotMsg;
          nextMsgs = updated;
        } else {
          nextMsgs = [...p, finalBotMsg];
        }
        recordSessionTurn({
          conversationId: conversationIdRef.current,
          summary: trimmed,
          tier: res.tier,
          userId: user?.id,
          messages: nextMsgs,
        });
        return nextMsgs;
      });

      refreshSessions();

      // Persist concluded or escalated consultations to localStorage under sanjeevani_consultations
      if (phase === 'CONCLUDED' || phase === 'EMERGENCY' || res.escalation_triggered || res.tier === 'Red') {
        try {
          const stored = JSON.parse(localStorage.getItem('sanjeevani_consultations') || '[]');
          const firstUserSymptom = messages.find(m => m.sender === 'user')?.text || trimmed;
          const newEntry = {
            id: Date.now(),
            date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            symptom: firstUserSymptom,
            tier: res.tier || (phase === 'EMERGENCY' ? 'Red' : 'Green'),
            status: res.remedies?.length
              ? res.remedies[0].remedy_name
              : (res.tier === 'Red' || phase === 'EMERGENCY' ? '108 Emergency Alert' : 'PHC Referral'),
          };
          localStorage.setItem('sanjeevani_consultations', JSON.stringify([newEntry, ...stored.filter(item => item.id !== newEntry.id)].slice(0, 20)));
        } catch (e) {
          console.warn('Failed to sync consultation to localStorage:', e);
        }
      }

      if (phase === 'CONCLUDED' && res.remedies?.length > 0) {
        scheduleFollowUp({
          conversationId: conversationIdRef.current,
          condition: res.consultation_summary?.condition || trimmed,
          tier: res.tier,
          patientName: currentFamilyMember?.name || 'Self',
        });
      }
    } catch (err) {
      setError(err?.response?.data?.detail ?? err.message ?? 'Unknown error');
      // Deliberately conservative fail-safe check to prevent emergency downgrade during network dropouts; not a full triage replacement.
      const fallbackCheck = evaluateLocalRedFlags(trimmed);
      if (fallbackCheck.isRed) {
        setCurrentPhase('EMERGENCY');
        setMessages(p => {
          const filtered = p.filter(m => !m.isLiveStreaming);
          const nextEmergencyMsgs = [...filtered, {
            sender: 'bot',
            text: l(
              'चेतावनी: आपातकालीन लक्षण पहचाने गए हैं। नेटवर्क उपलब्ध न होने के कारण कृपया तुरंत 108 एम्बुलेंस को कॉल करें।',
              'Warning: Emergency symptoms detected. Network unavailable, please call 108 ambulance immediately.'
            ),
            tier: 'Red',
            flags: [fallbackCheck.flag || 'CLIENT_FALLBACK_FLAG: possible emergency — network unavailable, please call 108'],
            remedies: [],
            escalation: true,
            phase: 'EMERGENCY',
            is_offline_fallback: true,
          }];
          recordSessionTurn({
            conversationId: conversationIdRef.current,
            summary: trimmed,
            tier: 'Red',
            userId: user?.id,
            messages: nextEmergencyMsgs,
          });
          return nextEmergencyMsgs;
        });
      } else {
        const offlineRes = processOfflineConsultation(trimmed, knownConditions, conversationIdRef.current, messages);
        const resolvedPhase = offlineRes.phase || 'CONCLUDED';
        setCurrentPhase(resolvedPhase);
        setMessages(p => {
          const filtered = p.filter(m => !m.isLiveStreaming);
          const nextOfflineMsgs = [...filtered, {
            sender: 'bot',
            text: offlineRes.reply_text,
            tier: offlineRes.tier,
            flags: offlineRes.flags || [],
            remedies: offlineRes.remedies || [],
            escalation: offlineRes.escalation_triggered,
            phase: resolvedPhase,
            consultation_summary: offlineRes.consultation_summary,
            is_offline_fallback: true,
          }];
          recordSessionTurn({
            conversationId: conversationIdRef.current,
            summary: trimmed,
            tier: offlineRes.tier,
            userId: user?.id,
            messages: nextOfflineMsgs,
          });
          return nextOfflineMsgs;
        });
        refreshSessions();
        try {
          queueOfflineChat(offlineRes);
        } catch (qErr) {
          console.warn('[OfflineSync] Failed to queue chat encounter:', qErr);
        }
      }
    } finally { setLoading(false); inputRef.current?.focus(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, knownConditions, currentPhase, refreshSessions, messages]);

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

  const latestSymptomProfile = messages[messages.length - 1]?.symptom_profile || null;
  const activeTier = messages.slice().reverse().find(m => m.tier)?.tier || 'Green';

  const getPhaseDescription = () => {
    switch (currentPhase) {
      case 'GREETING':
        return l('स्वागत एवं प्रारंभिक लक्षण intake', 'Welcome & initial symptom intake', 'Swagat aur initial intake');
      case 'CONSULTATION':
        return messages.length <= 2
          ? l('लक्षण अवधि व तीव्रता निर्धारण', 'Symptom characterization & duration', 'Lakshan avadhi aur tivrata nirdharan')
          : l('संबंधित लक्षण व नैदानिक मूल्यांकन', 'Associated symptoms & clinical safety assessment', 'Sambandhit lakshan aur safety assessment');
      case 'CONCLUDED':
        return l('सत्यापित आयुष नुस्खे व सलाह प्रस्तुत', 'Verified AYUSH remedy & clinical advice delivered', 'Satyapit upchar aur salah');
      case 'EMERGENCY':
        return l('आपातकालीन 108 अस्पताल रेफरल', 'Immediate 108 hospital escalation', 'Apatkaleen 108 hospital referral');
      default:
        return l('नैदानिक परामर्श प्रगति पर', 'Clinical consultation in progress', 'Paramarsh pragati par');
    }
  };

  /* ══════════════════════════════════════════════════════════════
     RENDER — 2-Column Responsive Clinical Workspace
     Left (8-9 cols): Main Chat Pane
     Right (3-4 cols): Clinical Context & Safeguards Sidebar
     ════════════════════════════════════════════════════════════ */
  return (
    <div
      ref={chatContainerRef}
      className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-2 lg:py-4 h-[calc(100dvh-7.5rem)] md:h-[calc(100dvh-4.25rem)] w-full overflow-hidden"
      style={{ fontSize: `${textScale}rem` }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full overflow-hidden">

        {/* ════════════════════════════════════════════════════════
            LEFT / MAIN CHAT PANE
            ════════════════════════════════════════════════════ */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col h-full bg-card rounded-2xl border border-border-subtle shadow-sm overflow-hidden">
          
          {/* Slim Sticky Chat Header */}
          <div className="px-4 py-2.5 border-b border-border-subtle flex items-center justify-between gap-2 shrink-0 bg-card">
            {/* Left: Avatar + Title + Subtitle + Tier Badge */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-sage/15 text-sage flex items-center justify-center font-bold text-sm shrink-0">
                🌿
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-serif font-bold text-sm text-primary truncate leading-tight">
                    Dr. Sanjeevani
                  </h2>
                  <TierBadge tier={activeTier} />
                </div>
                <p className="text-[10px] text-muted truncate leading-tight">
                  Bhashini · MTS Triage
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Mobile-only toggle for Context & Comorbidities */}
              <button
                type="button"
                onClick={() => setMobileContextOpen((o) => !o)}
                className={`lg:hidden px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  mobileContextOpen
                    ? 'bg-sage text-white border-sage'
                    : 'border-border-subtle text-muted hover:text-primary bg-surface'
                }`}
                title={l('मरीज स्थितियां देखें', 'View patient tags')}
              >
                <Leaf className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold">Tags ({knownConditions.length})</span>
              </button>

              {/* Live Voice Button */}
              <button
                type="button"
                onClick={() => setShowLiveRoom(true)}
                className="touch-target inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-sage to-[#4a6346] hover:from-[#4a6346] hover:to-[#3b5038] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                title={l('लाइव आवाज़ कॉल शुरू करें', 'Start Live Voice Call')}
              >
                <Mic className="w-3.5 h-3.5 animate-pulse" />
                <span className="hidden sm:inline">{l('🎙️ लाइव कॉल', '🎙️ Live Voice', '🎙️ Live Voice')}</span>
              </button>

              {/* New Session Button */}
              <button
                type="button"
                onClick={handleNewSession}
                className="p-2 rounded-xl border border-border-subtle text-muted hover:border-sage/40 hover:text-primary transition-all cursor-pointer"
                title={l('नया सत्र शुरू करें', 'New Session', 'Naya Session')}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Mobile-Only Compact Progress Strip */}
          <div className="lg:hidden px-3 py-1.5 bg-surface/60 border-b border-border-subtle shrink-0">
            <PhaseProgress
              currentPhase={currentPhase}
              turnCount={messages.length}
              symptomProfile={latestSymptomProfile}
            />

            {/* Collapsible Mobile Drawer for Patient Tags */}
            {mobileContextOpen && (
              <div className="mt-2 pt-2 border-t border-border-subtle space-y-1.5 animate-fadeIn">
                <div className="flex items-center justify-between text-[11px] font-bold text-muted">
                  <span>{l('स्वास्थ्य स्थितियां (Comorbidity Safeguards):', 'Pre-existing Conditions:')}</span>
                  <button
                    type="button"
                    onClick={() => setMobileContextOpen(false)}
                    className="text-muted hover:text-primary p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {getComorbidityOptions(l).map((opt) => {
                    const on = knownConditions.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleCondition(opt.value)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold transition-all text-[11px] border cursor-pointer ${
                          on
                            ? 'bg-sage text-white border-sage shadow-2xs font-bold'
                            : 'bg-card text-muted border-border-subtle hover:border-sage/40'
                        }`}
                      >
                        <span>{opt.icon}</span>
                        <span>{on ? '✓ ' : ''}{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sticky Offline / Technical Error Banners */}
          {backendOnline === false && (
            <div className="shrink-0 mx-4 mt-2 bg-gold-warm/15 border border-gold-warm/40 rounded-2xl p-2.5 flex items-start gap-2.5 text-xs text-primary animate-fadeIn shadow-xs">
              <WifiOff className="w-4 h-4 shrink-0 text-gold-warm mt-0.5" />
              <div>
                <strong className="block font-bold text-gold-warm">
                  {l('ऑफ़लाइन मोड सक्रिय:', 'Offline Mode Active:')}
                </strong>
                <span>
                  {l('सर्वर से संपर्क नहीं हो पा रहा है। यह स्थानीय ऑफ़लाइन प्राथमिक सलाह है।', 'Server unavailable. Providing offline estimated guidance.')}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="shrink-0 mx-4 mt-2 bg-rose-soft/10 border border-rose-soft/30 rounded-2xl p-2.5 flex items-start gap-2 text-xs text-rose-soft animate-fadeIn">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div><strong className="block font-bold">{l('तकनीकी असुविधा:', 'Technical Error:')}</strong>{error}</div>
            </div>
          )}

          <FollowUpBanner onEscalate={handleFollowUpEscalation} />

          {/* Scrollable Conversation Stream */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 min-h-0 relative overscroll-contain">
            {isEmptyChat ? (
              <div className="flex flex-col items-center justify-center h-full py-4 sm:py-8 px-3 sm:px-6 animate-fadeIn">
                <div className="relative mb-3 sm:mb-6 cursor-pointer group" onClick={toggleListening}>
                  <div className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, ${stateColor}20 0%, transparent 70%)`, transform: 'scale(1.6)' }} />
                  <div className="hidden sm:block"><SanjeevaniOrb state={orbState} size={110} showLabel={false} /></div>
                  <div className="sm:hidden"><SanjeevaniOrb state={orbState} size={64} showLabel={false} /></div>
                  <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold shadow-md transition-all ${
                    isListening
                      ? 'bg-rose-soft text-white animate-pulse'
                      : 'bg-card text-sage border border-sage/30 group-hover:border-sage'
                  }`}>
                    {isListening ? <><MicOff className="w-3 h-3" /> {l('रोकें', 'Stop', 'Ruk jaiye')}</> : <><Mic className="w-3 h-3" /> {l('बोलें', 'Speak', 'Boliye')}</>}
                  </div>
                </div>

                <h2 className="font-serif text-lg sm:text-2xl font-bold text-primary text-center mt-2 sm:mt-4 mb-0.5 sm:mb-1">
                  {l('नमस्ते! 🙏', 'Hello! 🙏', 'Namaste! 🙏')}
                </h2>
                <p className="text-xs sm:text-sm text-muted text-center max-w-xs mb-3 sm:mb-6">
                  {l('मैं डॉ. संजीवनी हूँ। आपकी तकलीफ सुनने के लिए तैयार हूँ।', 'I am Dr. Sanjeevani. Ready to listen and assist with your symptoms.', 'Main Dr. Sanjeevani hoon. Aapki takleef sunne ke liye taiyar hoon.')}
                </p>

                <div className="w-full max-w-md">
                  <p className="text-[10px] sm:text-[11px] font-semibold text-muted uppercase tracking-widest text-center mb-2 sm:mb-3">
                    {l('या यहाँ से लक्षण चुनें', 'Or choose from quick symptoms below', 'Ya yahan se chuniye')}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
                    {getQuickSymptoms(lang).map(s => (
                      <button key={s.value} onClick={() => sendText(s.value)}
                        className="symptom-tile flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-surface border border-border-subtle hover:border-sage/50 hover:shadow-md transition-all active:scale-95 group cursor-pointer">
                        <span className="text-2xl group-hover:scale-110 transition-transform">{s.emoji}</span>
                        <span className="text-xs font-bold text-primary truncate max-w-full">{s.label}</span>
                      </button>
                    ))}
                  </div>
                  <SymptomChips disabled={loading} onPick={val => sendText(val)} />
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto w-full space-y-4">
                {messages.map((msg, idx) => (
                  <MessageBubble
                    key={idx}
                    msg={msg}
                    conversationId={conversationIdRef.current}
                    turnIndex={idx}
                    patientMember={currentFamilyMember}
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
                    onReadAloud={() => readAloud(msg.text, idx, msg.spoken_text || msg.spoken_reply_text)}
                    onStopSpeaking={() => {
                      stopSpeakingRef.current?.();
                      setSpeakingMsgIdx(null);
                    }}
                    onDownloadReport={(format) => handleDownloadReport(msg, idx, format)}
                    onShowReferralQR={(data) => setQrModalData(data)}
                    onOpenJanAushadhi={() => setShowJanAushadhiModal(true)}
                  />
                ))}
                {loading && <div className="py-1"><CalmLoader /></div>}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Bottom Composer Dock */}
          <div className="shrink-0 bg-surface/50 border-t border-border-subtle p-2.5 sm:p-3.5 space-y-2">
            {/* Quick-Select / Quick-Reply Chip Rail */}
            {messages.length === 1 && currentPhase === 'GREETING' ? (
              <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap no-scrollbar animate-fadeIn">
                {STARTER_SYMPTOM_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sendText(chip.text)}
                    disabled={loading}
                    className="touch-target shrink-0 text-xs px-3 py-1.5 rounded-full bg-surface hover:bg-sage/15 text-primary border border-border-subtle hover:border-sage/40 transition-all font-medium shadow-2xs cursor-pointer active:scale-95 whitespace-nowrap"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            ) : contextualQuickReplies.length > 0 ? (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar animate-fadeIn">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <MessageCircle className="w-3 h-3 text-sage" />
                  <span>{l('त्वरित उत्तर:', 'Quick Reply:', 'Jaldi Jawab:')}</span>
                </span>
                {contextualQuickReplies.map((pill, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => sendText(pill)}
                    disabled={loading}
                    className="touch-target shrink-0 text-xs px-3 py-1.5 rounded-full bg-sage/15 hover:bg-sage/25 text-sage border border-sage/30 hover:border-sage transition-all font-semibold cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap"
                  >
                    {pill}
                  </button>
                ))}
              </div>
            ) : null}

            {/* Input Row */}
            <form onSubmit={handleSend} className="flex items-center gap-2">
              {/* Mic Button */}
              <button
                type="button"
                onClick={toggleListening}
                className={`min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  isListening
                    ? 'bg-rose-soft text-white animate-pulse ring-2 ring-rose-soft/30 shadow-md'
                    : 'bg-sage/10 hover:bg-sage/20 border border-sage/30 text-sage'
                }`}
                aria-label="Voice input"
                title={isListening ? l('सुनना बंद करें', 'Stop listening') : l('बोलकर बताएं', 'Speak symptoms')}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Camera Vision Scanner */}
              <button
                type="button"
                onClick={() => setShowVisionModal(true)}
                disabled={loading}
                className="min-w-[44px] min-h-[44px] rounded-xl border border-border-subtle bg-surface hover:bg-sage/15 text-muted hover:text-primary flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                title={l('दवा पर्ची या लक्षण फोटो स्कैन करें', 'Scan Rx, medicine strip or symptom photo')}
              >
                <Camera className="w-4 h-4" />
              </button>

              {/* Text Input */}
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? l('सुन रहा हूँ… 🎙️', 'Listening… 🎙️') : l('लक्षण लिखें या बोलें...', 'Type or speak your symptoms...')}
                disabled={loading}
                className="flex-1 py-2.5 px-4 text-sm bg-surface text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-sage/40 transition-all placeholder:text-muted"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim() || loading}
                className="min-w-[44px] min-h-[44px] bg-sage hover:bg-sage/90 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-40 shadow-sm cursor-pointer"
                aria-label="Send"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            RIGHT CLINICAL CONTEXT SIDEBAR (Desktop Only)
            ════════════════════════════════════════════════════ */}
        <div className="hidden lg:flex lg:col-span-4 xl:col-span-3 flex-col gap-4 h-full overflow-y-auto no-scrollbar">
          {/* Card 1 — Consultation Stage */}
          <div className="bg-card rounded-2xl p-4 border border-border-subtle shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-sm text-primary flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-sage" />
                <span>{l('परामर्श प्रगति', 'Consultation Progress', 'Consultation Progress')}</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sage/15 text-sage">
                {currentPhase}
              </span>
            </div>

            <PhaseProgress
              currentPhase={currentPhase}
              turnCount={messages.length}
              symptomProfile={latestSymptomProfile}
            />

            <p className="text-xs text-muted leading-relaxed bg-surface/50 p-2.5 rounded-xl border border-border-subtle/60">
              {getPhaseDescription()}
            </p>
          </div>

          {/* Card 2 — Patient Health Profile & Comorbidities */}
          <div className="bg-card rounded-2xl p-4 border border-border-subtle shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-sm text-primary flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-rose-soft" />
                <span>{l('स्वास्थ्य प्रोफ़ाइल व सुरक्षा', 'Health Profile & Safeguards', 'Health Profile')}</span>
              </h3>
              <span className="text-[10px] text-muted font-bold">
                {knownConditions.length} {l('सक्रिय', 'Active')}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {getComorbidityOptions(l).map((opt) => {
                const on = knownConditions.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleCondition(opt.value)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-semibold transition-all text-xs border cursor-pointer ${
                      on
                        ? 'bg-sage text-white border-sage shadow-2xs font-bold'
                        : 'bg-surface text-muted border-border-subtle hover:border-sage/40'
                    }`}
                  >
                    <span>{opt.icon}</span>
                    <span>{on ? '✓ ' : ''}{opt.label}</span>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-muted leading-relaxed bg-surface/40 p-2.5 rounded-xl border border-border-subtle/50">
              {l(
                '💡 सक्रिय स्थितियां नेटवर्क-एक्स सुरक्षा ग्राफ द्वारा अनुचित जड़ी-बूटियों को स्वतः हटा देती हैं।',
                '💡 Active conditions automatically filter out contraindicated herbs via the NetworkX Safety Graph.',
                '💡 Active conditions automatically filter out contraindicated remedies.'
              )}
            </p>
          </div>

          {/* Card 3 — Quick Clinical Tools */}
          <div className="bg-card rounded-2xl p-4 border border-border-subtle shadow-sm mt-auto space-y-3">
            <h3 className="font-serif font-bold text-xs uppercase tracking-wider text-muted">
              {l('त्वरित नैदानिक साधन', 'Quick Clinical Tools', 'Quick Tools')}
            </h3>

            {/* Direct shortcut to Eye Biomarker Scan */}
            <Link
              to="/patient/screen"
              className="flex items-center justify-between p-3 rounded-xl bg-surface hover:bg-sage/10 text-primary border border-border-subtle hover:border-sage/30 transition-all text-xs font-semibold group"
            >
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-sage" />
                <span>{l('नेत्र बायोमार्कर जांच', 'Eye Biomarker Scan', 'Aankh Jaanch')}</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-muted group-hover:text-sage group-hover:translate-x-0.5 transition-all" />
            </Link>

            {/* Emergency Helpline Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href="tel:108"
                className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-rose-soft hover:bg-rose-soft/90 text-white text-xs font-bold shadow-xs transition-transform active:scale-95"
                title="108 Emergency Ambulance"
              >
                <PhoneCall className="w-3.5 h-3.5 animate-pulse" />
                <span>108 SOS</span>
              </a>
              <a
                href="tel:104"
                className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-surface hover:bg-sage/15 text-primary border border-border-subtle text-xs font-bold transition-all"
                title="104 National Health Helpline"
              >
                <span>104 Health</span>
              </a>
            </div>

            {/* Recent Sessions Quick Switcher */}
            {sessions.length > 0 && (
              <div className="pt-2 border-t border-border-subtle/60">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5 flex items-center justify-between">
                  <span>{l('इतिहास', 'History', 'Itihas')}</span>
                  <span className="text-[9px] font-normal">{sessions.length} records</span>
                </p>
                <div className="space-y-1 max-h-24 overflow-y-auto no-scrollbar">
                  {sessions.slice(0, 3).map((s) => (
                    <button
                      key={s.conversationId}
                      type="button"
                      onClick={() => handleSelectSession(s)}
                      className="w-full text-left p-1.5 rounded-lg hover:bg-surface text-[11px] truncate flex items-center gap-1.5 cursor-pointer text-muted hover:text-primary transition-colors"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.tier === 'Red' ? 'bg-rose-soft' : s.tier === 'Yellow' ? 'bg-gold-warm' : 'bg-sage'}`} />
                      <span className="truncate flex-1">{s.summary || 'Consultation'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Audio Voice Privacy Consent Modal */}
      <AudioConsentModal
        isOpen={showConsentModal}
        onConsent={handleConsentGranted}
        onDecline={handleConsentDeclined}
      />

      {/* Referral QR Pass Modal */}
      {qrModalData && (
        <ReferralQRModal
          isOpen={!!qrModalData}
          onClose={() => setQrModalData(null)}
          consultation={qrModalData}
          patientName={user?.name || 'Aapka Naam'}
        />
      )}

      {/* Medical Vision Multimodal Scanner Modal */}
      <MedicalVisionModal
        isOpen={showVisionModal}
        onClose={() => setShowVisionModal(false)}
        conversationId={conversationIdRef.current}
        onScanComplete={handleVisionScanComplete}
      />

      {/* Live Hands-Free Voice Consultation Room */}
      {showLiveRoom && <LiveVoiceRoom onClose={() => setShowLiveRoom(false)} />}

      {/* Jan Aushadhi Generic Medicine Estimator Modal */}
      {showJanAushadhiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#131E2B] rounded-3xl p-4 sm:p-6 border border-sage/20 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-emerald-600" />
                <h3 className="font-serif font-bold text-base sm:text-lg text-primary">
                  {l('जन औषधि केंद्र - सस्ती जेनेरिक दवा विकल्प', 'Jan Aushadhi Generic Alternatives & Prices', 'Jan Aushadhi Generic Dawa Rates')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowJanAushadhiModal(false)}
                className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <JanAushadhiCard />
          </div>
        </div>
      )}

      {/* In-app Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalConfig.isOpen}
        onClose={() => setDeleteModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmDelete}
        title={deleteModalConfig.title}
        message={deleteModalConfig.message}
        confirmText={l('हटाएं', 'Delete')}
        cancelText={l('रद्द करें', 'Cancel')}
        isDestructive={true}
      />
    </div>
  );
}

/* ── MessageBubble ─────────────────────────────────────────────────────── */
function MessageBubble({
  msg,
  conversationId,
  turnIndex,
  patientMember = null,
  onReadAloud,
  isSpeaking,
  onStopSpeaking,
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
  onShowReferralQR,
  onOpenJanAushadhi,
}) {
  const { l, isHindi } = useLanguage();

  const formatShareSummary = () => {
    const patientName = patientMember?.name || 'Self';
    const patientAge = patientMember?.age ? ` (${patientMember.age}y)` : '';
    const condition = msg.consultation_summary?.condition || msg.text?.slice(0, 50) || 'Health Consultation';
    const tier = msg.tier || 'Green';
    const remedies = msg.remedies?.map(r => `• *${r.remedy_name}*: ${r.remedy_text}`).join('\n') || '';
    
    let pathyaText = '';
    if (msg.consultation_summary?.pathya?.length) {
      pathyaText = `\n\n🥗 *Pathya (क्या खाएं / Foods to eat):*\n` + msg.consultation_summary.pathya.map(p => `• ${p}`).join('\n');
    }
    let apathyaText = '';
    if (msg.consultation_summary?.apathya?.length) {
      apathyaText = `\n\n🚫 *Apathya (परहेज़ करें / To avoid):*\n` + msg.consultation_summary.apathya.map(a => `• ${a}`).join('\n');
    }

    return `🌿 *Sanjeevani Health Consultation Summary*\n👤 Patient: ${patientName}${patientAge}\n🩺 *Condition:* ${condition} (${tier} Tier)\n\n🍵 *Recommended Home Remedy:*\n${remedies}${pathyaText}${apathyaText}\n\n⚠️ *Emergency Helpline:* 108 | Health Advice: 104\n_Note: This is preliminary AYUSH clinical triage guidance._`;
  };

  const handleWhatsAppShare = () => {
    const text = formatShareSummary();
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSmsShare = () => {
    const text = formatShareSummary();
    window.location.href = `sms:?body=${encodeURIComponent(text)}`;
  };
  const isUser = msg.sender === 'user';
  // Typewriter streaming: only the latest bot message animates if not already streamed live
  const shouldStream = !isUser && isLatestBot && !msg.is_offline_fallback && !msg.isLiveStreaming;
  const { displayText, isStreaming, skipToEnd } = useTypewriter(
    msg.text || '',
    shouldStream,
    16,  // speed: 16ms per tick
    3    // chunkSize: 3 chars per tick (~185 chars/sec)
  );
  const visibleText = shouldStream ? displayText : msg.text;
  const [feedback, setFeedback] = useState(null);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggleLocalTTS = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onReadAloud?.();
      return;
    }

    if (isPlayingTTS || isSpeaking) {
      window.speechSynthesis.cancel();
      setIsPlayingTTS(false);
      onStopSpeaking?.();
      return;
    }

    window.speechSynthesis.cancel();
    const rawText = msg.spoken_text || msg.spoken_reply_text || visibleText || msg.text || '';
    const cleanText = rawText
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_#`~>]/g, ' ')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'hi-IN';
      utterance.rate = 0.92;
      utterance.onend = () => setIsPlayingTTS(false);
      utterance.onerror = () => setIsPlayingTTS(false);
      setIsPlayingTTS(true);
      window.speechSynthesis.speak(utterance);
    } catch {
      onReadAloud?.();
    }
  };

  return (
    <div className={`flex gap-1.5 sm:gap-2.5 ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
      {!isUser && (
        <div className="shrink-0 mt-0.5">
          <div className="hidden sm:block"><SanjeevaniOrb state={isSpeaking || isPlayingTTS ? 'speaking' : (isStreaming || msg.isLiveStreaming ? 'thinking' : 'idle')} size={28} /></div>
          <div className="sm:hidden"><SanjeevaniOrb state={isSpeaking || isPlayingTTS ? 'speaking' : (isStreaming || msg.isLiveStreaming ? 'thinking' : 'idle')} size={22} /></div>
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
                <span>{l('आपातकालीन चेतावनी (108)', 'EMERGENCY ALERT (108)')}</span>
              </div>
            ) : (msg.tier === 'Yellow' || msg.remedies?.length > 0 || msg.phase === 'CONCLUDED') ? (
              <TierBadge tier={msg.tier} />
            ) : (
              <span className="text-[10px] sm:text-[11px] font-bold text-sage dark:text-booti-glow uppercase tracking-wider">
                Dr. Sanjeevani
              </span>
            )}
            {isPlayingTTS || isSpeaking ? (
              <button
                type="button"
                onClick={handleToggleLocalTTS}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-500/30 transition-all cursor-pointer shadow-2xs"
                title={l('आवाज़ रोकें', 'Stop voice playback')}
              >
                <VolumeX className="w-3 h-3 text-amber-500" />
                <span>{l('⏹️ Rokein', '⏹️ Stop')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleToggleLocalTTS}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sage/15 hover:bg-sage/25 text-sage dark:text-booti-glow text-[10px] font-bold border border-sage/30 transition-all cursor-pointer shadow-2xs"
                aria-label="Read aloud in Hindi"
                title={l('हिंदी में सुनें', 'Listen aloud in Hindi')}
              >
                <Volume2 className="w-3 h-3 text-sage" />
                <span>{l('🔊 Suniye', '🔊 Listen')}</span>
              </button>
            )}
          </div>
        )}
        {!isUser && msg.is_offline_fallback && (
          <div className="mb-2 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1.5 shadow-2xs">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>{l('ऑफ़लाइन उत्तर (अपुष्ट)', 'Answered offline (unconfirmed)')}</span>
          </div>
        )}
        <div className="leading-relaxed text-xs sm:text-sm">
          {msg.image && (
            <div className="mb-2 max-w-xs rounded-xl overflow-hidden border border-black/10 dark:border-gray-700 shadow-xs">
              <img src={msg.image} alt="Medical scan" className="w-full max-h-56 object-cover" />
            </div>
          )}
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
          ) : (
            <>
              {msg.visionAnalysis && (
                <div className="mb-3.5 p-3.5 sm:p-4 rounded-2xl bg-sage/10 dark:bg-gray-800/90 border border-sage/20 dark:border-gray-700 space-y-2.5 text-left shadow-xs">
                  {/* Header with Title & Tier Badge */}
                  <div className="flex items-center justify-between border-b border-sage/15 dark:border-gray-700 pb-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-sage dark:text-booti-glow">
                      {msg.visionAnalysis.scan_type === 'prescription_medicine' ? (
                        <Pill className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Sparkles className="w-4 h-4 shrink-0 text-sage dark:text-booti-glow" />
                      )}
                      <span>{msg.visionAnalysis.title}</span>
                    </div>
                    <TierBadge tier={msg.visionAnalysis.recommended_tier || 'Green'} />
                  </div>

                  {/* Identified Item Pills */}
                  {Array.isArray(msg.visionAnalysis.identified_items) && msg.visionAnalysis.identified_items.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {msg.visionAnalysis.identified_items.map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white/80 dark:bg-gray-900/80 text-primary dark:text-cream text-[11px] font-semibold border border-sage/20 dark:border-gray-700 shadow-2xs"
                        >
                          {msg.visionAnalysis.scan_type === 'prescription_medicine' ? (
                            <Pill className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Stethoscope className="w-3 h-3 text-sage dark:text-booti-glow shrink-0" />
                          )}
                          {item}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Key Findings: What this medicine / skin condition is all about */}
                  {msg.visionAnalysis.key_findings && (
                    <div className="p-2.5 rounded-xl bg-white/80 dark:bg-gray-800/90 text-xs border border-sage/15 dark:border-gray-700/80 space-y-1">
                      <strong className="block text-[10px] font-bold tracking-wider text-sage dark:text-booti-glow uppercase">
                        {msg.visionAnalysis.scan_type === 'prescription_medicine'
                          ? l('दवा का विवरण एवं कार्य (Medicine Overview & Purpose):', 'Medicine Overview & Indications:', 'Dawa Ka Vivaran Aur Upyog:')
                          : l('त्वचा जांच निष्कर्ष (Visual Skin & Rash Findings):', 'Skin Examination Findings:', 'Twacha Jaanch Nishkarsh:')}
                      </strong>
                      <p className="text-xs text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                        {msg.visionAnalysis.key_findings}
                      </p>
                    </div>
                  )}

                  {/* Doctor's Recommendation / Dosage instructions */}
                  {msg.visionAnalysis.dosage_instructions && (
                    <div className="p-2.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 text-xs border border-emerald-200/70 dark:border-emerald-800/50 space-y-1 text-emerald-950 dark:text-emerald-200">
                      <strong className="block text-[10px] font-bold tracking-wider text-emerald-700 dark:text-emerald-400 uppercase">
                        {msg.visionAnalysis.scan_type === 'prescription_medicine'
                          ? l('डॉक्टर की सलाह एवं खुराक (Doctor Recommendation & Dosage):', 'Doctor Recommendation & Dosage:', 'Doctor Ki Salah Aur Dosage:')
                          : l('प्राथमिक देखभाल एवं निर्देश (First Aid & Hygiene Instructions):', 'First Aid & Hygiene Guidelines:', 'Prathmik Dekhbhal Nirdesh:')}
                      </strong>
                      <span className="leading-relaxed font-medium block">{msg.visionAnalysis.dosage_instructions}</span>
                    </div>
                  )}

                  {/* Safety Warnings & Precautions */}
                  {Array.isArray(msg.visionAnalysis.safety_warnings) && msg.visionAnalysis.safety_warnings.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-rose-50/90 dark:bg-rose-950/40 text-xs border border-rose-200/70 dark:border-rose-800/50 space-y-1.5 text-rose-950 dark:text-rose-200">
                      <div className="flex items-center gap-1.5 font-bold text-[10px] tracking-wider uppercase text-rose-700 dark:text-rose-400">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{l('महत्वपूर्ण चेतावनियां व सावधानियां (Safety Precautions):', 'Safety Precautions & Warnings:', 'Zaroori Chetawaniyan:')}</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-900 dark:text-rose-300">
                        {msg.visionAnalysis.safety_warnings.map((warn, wIdx) => (
                          <li key={wIdx} className="leading-snug">{warn}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Ayurvedic Interaction Advice */}
                  {msg.visionAnalysis.ayurvedic_interaction_note && (
                    <div className="p-2.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 text-xs border border-amber-200/70 dark:border-amber-800/50 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-[10px] tracking-wider uppercase text-amber-800 dark:text-amber-300">
                        <Leaf className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>
                          {msg.visionAnalysis.scan_type === 'prescription_medicine'
                            ? l('आयुर्वेदिक काढ़ा व दवा का अंतर (Herb-Drug Interaction):', 'Herb-Drug Interaction Advisory:', 'Ayurvedic Kadha Aur Dawa Gap:')
                            : l('आयुर्वेदिक देखभाल व घरेलू उपचार (Ayurvedic Soothing Care):', 'Ayurvedic Soothing Options:', 'Ayurvedic Upchar Aur Dekhbhal:')}
                        </span>
                      </div>
                      <span className="leading-relaxed font-medium text-[11px] block">{msg.visionAnalysis.ayurvedic_interaction_note}</span>
                    </div>
                  )}

                  {/* Annotated Image Overlay Toggle (if available for skin rash) */}
                  {msg.visionAnalysis.annotated_image_url && (
                    <div className="pt-1">
                      <details className="group rounded-xl border border-sage/20 dark:border-gray-700 bg-white/70 dark:bg-gray-900/70 p-2 text-xs cursor-pointer">
                        <summary className="font-semibold text-sage dark:text-booti-glow flex items-center justify-between select-none">
                          <span>{l('कंप्यूटर विज़न विश्लेषित तस्वीर देखें', 'View Computer Vision Biomarker Overlay', 'Computer Vision Annotated Photo Dekhein')}</span>
                          <span className="text-[10px] text-muted group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div className="mt-2 rounded-lg overflow-hidden border border-sage/20">
                          <img
                            src={msg.visionAnalysis.annotated_image_url}
                            alt="Annotated clinical vision overlay"
                            className="w-full max-h-56 object-contain mx-auto bg-black/5"
                          />
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              )}
              <StructuredBotMessage
                text={visibleText}
                tier={msg.tier}
                summary={isStreaming || msg.isLiveStreaming ? null : msg.consultation_summary}
                conversationId={conversationId}
                turnIndex={turnIndex}
                isConcluded={msg.phase === 'CONCLUDED' || (msg.remedies && msg.remedies.length > 0)}
                remedies={msg.remedies}
                onReadAloud={onReadAloud}
                isSpeaking={isSpeaking}
                onStopSpeaking={onStopSpeaking}
              />
              {/* Streaming cursor & skip button */}
              {(isStreaming || msg.isLiveStreaming) && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="inline-block w-1.5 h-4 bg-sage dark:bg-booti-glow rounded-full animate-pulse" />
                  {isStreaming && (
                    <button
                      onClick={skipToEnd}
                      className="text-[10px] text-muted dark:text-muted hover:text-primary transition-colors cursor-pointer opacity-70 hover:opacity-100"
                    >
                      {l('पूरा दिखाएं ↓', 'Show full response ↓')}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* In-consultation symptom correction */}
        {!isUser && isLatestBot && currentPhase === 'CONSULTATION' && (
          <div className="mt-2 pt-1.5 border-t border-sage/10 dark:border-gray-700/40">
            {!isCorrecting ? (
              <button
                type="button"
                onClick={onStartCorrection}
                className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 hover:text-sage dark:hover:text-booti-glow transition-colors cursor-pointer"
                title={l('पिछला लक्षण सुधारें', 'Correct previous symptom')}
              >
                <Edit3 className="w-3 h-3" />
                <span>{l('सुधार करें', 'Correct this')}</span>
              </button>
            ) : (
              <form onSubmit={onSubmitCorrection} className="mt-1 space-y-1.5 animate-fadeIn">
                <p className="text-[10px] font-semibold text-sage dark:text-booti-glow">
                  {l('अपना लक्षण सही करें:', 'Correct your symptom:')}
                </p>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={correctionText}
                    onChange={(e) => onCorrectionChange(e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-[#131E2B] text-primary focus:outline-none focus:ring-1 focus:ring-sage"
                    placeholder={l('सही लक्षण लिखें...', 'Type corrected symptom...')}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-sage text-white hover:bg-sage/90 transition-colors cursor-pointer"
                  >
                    {l('भेजें', 'Send')}
                  </button>
                  <button
                    type="button"
                    onClick={onCancelCorrection}
                    className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 cursor-pointer"
                  >
                    {l('रद्द', 'Cancel')}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
        {!isUser && (msg.tier === 'Red' || msg.tier === 'Yellow') && (
          <div className="mt-2 sm:mt-2.5 space-y-2">
            <EscalationCard tier={msg.tier} flags={msg.flags ?? []} />
            {onShowReferralQR && (
              <button
                type="button"
                onClick={() => onShowReferralQR({
                  conversationId,
                  tier: msg.tier,
                  flags: msg.flags,
                  remedies: msg.remedies,
                  consultationSummary: msg.text,
                  timestamp: new Date().toISOString(),
                })}
                className="touch-target w-full flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold py-2 px-3 rounded-xl border border-rose-500/30 transition-all cursor-pointer shadow-xs"
              >
                <QrCode className="w-3.5 h-3.5 text-rose-500" />
                <span>{l('तत्काल डॉक्टर रेफरल पास (QR)', 'Emergency Doctor Referral Pass (QR)')}</span>
              </button>
            )}
          </div>
        )}

        {/* Safety Notice Banner for Blocked/Contraindicated Remedies */}
        {!isUser && Array.isArray(msg.blocked_remedies) && msg.blocked_remedies.length > 0 && (
          <div className="mt-2.5 p-3 rounded-xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-1.5 shadow-2xs animate-fadeIn">
            <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{l('सुरक्षा सूचना • रोके गए घरेलू उपचार (Safety Notice)', 'Safety Notice • Contraindicated Remedies Withheld', 'Suraksha Suchna • Withheld Remedies')}</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              {l(
                'आपकी मौजूदा स्वास्थ्य स्थिति के अनुसार निम्नलिखित उपचार सुरक्षित नहीं पाए गए और सुरक्षा कारणों से रोक दिए गए हैं:',
                'Based on your reported health condition, the following remedies were identified as contraindicated and safely withheld:',
                'Aapki svasthya sthiti ke mutabik yeh nuskhe surakshit nahi hain aur rok diye gaye hain:'
              )}
            </p>
            <ul className="space-y-1 pt-0.5">
              {msg.blocked_remedies.map((b, bIdx) => (
                <li key={bIdx} className="flex items-start gap-1.5 text-[11px] bg-white/70 dark:bg-gray-900/60 p-2 rounded-lg border border-amber-500/20">
                  <span className="font-semibold text-amber-800 dark:text-amber-300">
                    {typeof b === 'object' ? (b.remedy_name || b.remedy || 'Remedy') : b}:
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {typeof b === 'object' ? (b.reason || 'Contraindicated for your condition') : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!isUser && msg.phase === 'CONCLUDED' && msg.remedies?.length > 0 && (
          <div className="mt-2.5 sm:mt-3 space-y-2 pt-2 border-t border-sage/10 dark:border-gray-700/40">
            <div className="text-[10px] sm:text-[11px] font-bold text-sage dark:text-booti-glow uppercase tracking-wider">
              {l('आयुष प्रमाणित उपचार पर्चा:', 'AYUSH Verified Clinical Prescription:')}
            </div>
            <RemedyCard remedies={msg.remedies} />
            {(msg.consultation_summary?.pathya?.length > 0 || msg.consultation_summary?.apathya?.length > 0) && (
              <PathyaApathyaCard
                pathya={msg.consultation_summary.pathya}
                apathya={msg.consultation_summary.apathya}
                condition={msg.consultation_summary.condition}
              />
            )}
            <div className="py-2 px-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-900 dark:text-amber-200 text-center font-medium italic">
              {l('यह AI का प्रारंभिक अनुमान है, डॉक्टर का निश्चित निदान नहीं।', "This is an AI estimation, not a doctor's definitive diagnosis.")}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => onDownloadReport('docx')}
                disabled={isDownloading}
                className="touch-target flex items-center justify-center gap-1.5 sm:gap-2 bg-gold-warm/15 hover:bg-gold-warm/25 text-primary dark:text-gold-warm text-xs font-bold py-2 sm:py-2.5 px-3 rounded-xl border border-gold-warm/30 transition-all disabled:opacity-60 cursor-pointer"
              >
                {isDownloading && downloadingFormat === 'docx' ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> {l('तैयार हो रहा है…', 'Preparing…')}</>
                ) : (
                  <><FileDown className="w-3.5 h-3.5" /> {l('उपचार पर्चा (.docx)', 'Prescription (.docx)')}</>
                )}
              </button>
              <button
                type="button"
                onClick={() => onDownloadReport('pdf')}
                disabled={isDownloading}
                className="touch-target flex items-center justify-center gap-1.5 sm:gap-2 bg-sage/15 hover:bg-sage/25 text-primary dark:text-booti-glow text-xs font-bold py-2 sm:py-2.5 px-3 rounded-xl border border-sage/30 transition-all disabled:opacity-60 cursor-pointer"
              >
                {isDownloading && downloadingFormat === 'pdf' ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> {l('PDF बन रहा है…', 'Generating PDF…')}</>
                ) : (
                  <><FileDown className="w-3.5 h-3.5 text-rose-500" /> {l('उपचार पर्चा (PDF)', 'Prescription (PDF)')}</>
                )}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="touch-target flex items-center justify-center gap-1.5 sm:gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 sm:py-2.5 px-3 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{l('व्हाट्सएप पर शेयर करें', 'Share to WhatsApp', 'WhatsApp Par Share Karein')}</span>
              </button>
              <button
                type="button"
                onClick={handleSmsShare}
                className="touch-target flex items-center justify-center gap-1.5 sm:gap-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold py-2 sm:py-2.5 px-3 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{l('SMS सारांश भेजें', 'Send SMS Summary', 'SMS Summary Bhejein')}</span>
              </button>
            </div>
            {onShowReferralQR && (
              <button
                type="button"
                onClick={() => onShowReferralQR({
                  conversationId,
                  tier: msg.tier,
                  flags: msg.flags,
                  remedies: msg.remedies,
                  consultationSummary: msg.text,
                  timestamp: new Date().toISOString(),
                })}
                className="touch-target w-full flex items-center justify-center gap-2 bg-booti-dark/10 hover:bg-booti-dark/20 dark:bg-booti-glow/10 dark:hover:bg-booti-glow/20 text-booti-dark dark:text-booti-glow text-xs font-bold py-2 sm:py-2.5 px-3 rounded-xl border border-booti-dark/30 dark:border-booti-glow/30 transition-all cursor-pointer mt-1"
              >
                <QrCode className="w-4 h-4" />
                <span>{l('प्राथमिक स्वास्थ्य केंद्र रेफरल पास (QR)', 'PHC Doctor Referral Pass (QR)')}</span>
              </button>
            )}
            {onOpenJanAushadhi && (
              <button
                type="button"
                onClick={onOpenJanAushadhi}
                className="touch-target w-full flex items-center justify-center gap-2 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-800 dark:text-emerald-300 text-xs font-bold py-2 sm:py-2.5 px-3 rounded-xl border border-emerald-600/30 transition-all cursor-pointer mt-1"
              >
                <Pill className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{l('💊 जन औषधि सस्ती जेनेरिक दवाएं (90% बचत)', '💊 Jan Aushadhi Generic Prices (Save up to 90%)', '💊 Jan Aushadhi Sasti Generic Dawa (90% Bachat)')}</span>
              </button>
            )}
          </div>
        )}

        {/* Helpful Feedback row for Bot responses */}
        {!isUser && !isStreaming && (
          <div className="mt-2.5 pt-1.5 flex items-center justify-between gap-2 text-[10px] text-gray-400 border-t border-sage/10 dark:border-gray-800">
            <span className="truncate">{l('क्या यह सलाह उपयोगी रही?', 'Was this advice helpful?')}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setFeedback('yes');
                  toast.success(l('धन्यवाद! आपकी प्रतिक्रिया दर्ज की गई। 🙏', 'Thank you! Your feedback has been recorded. 🙏'));
                }}
                className={`px-2 py-0.5 rounded-full flex items-center gap-1 transition-all cursor-pointer ${
                  feedback === 'yes'
                    ? 'bg-sage text-white font-bold'
                    : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400'
                }`}
                title={l('हाँ, उपयोगी रही', 'Yes, it was helpful')}
              >
                <ThumbsUp className="w-3 h-3" />
                <span>{l('हाँ', 'Yes')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFeedback('no');
                  toast.success(l('धन्यवाद! हम इसे और सुधारेंगे।', 'Thank you! We will improve this.'));
                }}
                className={`px-2 py-0.5 rounded-full flex items-center gap-1 transition-all cursor-pointer ${
                  feedback === 'no'
                    ? 'bg-rose-soft text-white font-bold'
                    : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400'
                }`}
                title={l('नहीं', 'No')}
              >
                <ThumbsDown className="w-3 h-3" />
                <span>{l('नहीं', 'No')}</span>
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