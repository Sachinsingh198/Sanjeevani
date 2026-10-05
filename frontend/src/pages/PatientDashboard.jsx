import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Mic, MessageSquare, Eye, Heart, Leaf, MapPin, Clock, ShieldCheck,
  PhoneCall, AlertCircle, Plus, CheckCircle2, ChevronRight,
  ShieldAlert, BookOpen, ChevronDown, ChevronUp, Sparkles, Navigation,
  Wind, Activity, HeartHandshake, ArrowRight, Stethoscope, Hospital,
  Volume2, VolumeX, Square, Home, FileText, Bandage, ArrowLeft, FileDown, Share2, RefreshCw, Printer,
  Bell, QrCode, Trash2
} from 'lucide-react';
import LiveVoiceRoom from '../components/LiveVoiceRoom';
import NearbyFacilityFinder from '../components/NearbyFacilityFinder';
import SanjeevaniOrb from '../components/SanjeevaniOrb';
import MountainRidge from '../components/MountainRidge';
import SessionHistoryDrawer from '../components/SessionHistoryDrawer';
import SkeletonLoader from '../components/SkeletonLoader';
import ReferralQRModal from '../components/ReferralQRModal';
import FamilyProfileSelector from '../components/FamilyProfileSelector';
import { listSessions, deleteSession, clearSessionHistory } from '../lib/sessionStore';
import { getChatHistory } from '../api/client';
import { downloadConsultationReport } from '../api/reportsClient';
import { speakCue, stopCue } from '../lib/audioSynthesizer';
import PageVoiceGuide from '../components/PageVoiceGuide';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

const REMEDIES_STORAGE_KEY = 'sanjeevani_patient_remedies_v1';
const ADVISORY_STORAGE_KEY = 'sanjeevani_district_advisory';

const DEFAULT_REMEDIES = [
  { id: 'rem-1', name: 'Tulsi & Adrak Kadha', timing: 'Subah (Morning)', note: 'Drink warm after light breakfast for dry throat', completed: true },
  { id: 'rem-2', name: 'Steam Inhalation with Nilgiri / Pudina', timing: 'Dophar (Afternoon)', note: '5-7 mins deep breathing for airway congestion', completed: false },
  { id: 'rem-3', name: 'Haldi Doodh (Golden Milk) with Kali Mirch', timing: 'Raat (Night)', note: '1 cup warm milk with 1/2 tsp turmeric before sleep', completed: false },
];

export default function PatientDashboard() {
  const { user } = useAuth();
  const { lang, l, isHindi, toEnglishDigits, formatDate } = useLanguage();
  const [activeTab, setActiveTab] = useState('hub'); // 'hub' | 'remedies' | 'history' | 'facilities' | 'firstaid'
  const [showLiveRoom, setShowLiveRoom] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [openFirstAidIndex, setOpenFirstAidIndex] = useState(null);

  // Dynamic Consultation History
  const [consultations, setConsultations] = useState([]);
  const [loadingConsultations, setLoadingConsultations] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [activeFamilyMember, setActiveFamilyMember] = useState(null);

  const handlePlayRemedyReminder = (remedy) => {
    const text = `${remedy.name} lene ka samay ho gaya hai! Kripya gungune paani ya nirdeshit matra ke sath lein.`;
    speakCue(text);
    toast.success(`Dawa / Kadha Reminder: ${remedy.name} 🔔`, { icon: '🌿' });
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  };

  // District Health Advisory
  const [advisory, setAdvisory] = useState('');

  // Daily Herbal & Medicine Schedule
  const [remedies, setRemedies] = useState(() => {
    try {
      const saved = localStorage.getItem(REMEDIES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [newRemedyName, setNewRemedyName] = useState('');
  const [newRemedyTiming, setNewRemedyTiming] = useState('Subah (Morning)');
  const [showAddRemedy, setShowAddRemedy] = useState(false);

  const handleLoadSampleRemedies = () => {
    setRemedies(DEFAULT_REMEDIES);
    try {
      localStorage.setItem(REMEDIES_STORAGE_KEY, JSON.stringify(DEFAULT_REMEDIES));
    } catch {}
    toast.success('Sample remedies schedule loaded! 🌿');
  };

  const handleLoadSampleConsultations = () => {
    setConsultations([
      { conversationId: 'demo-1', updatedAt: '2026-09-15T09:30:00.000Z', summary: 'Gale me kharash aur sookhi khasi (Dry Cough)', tier: 'Green' },
      { conversationId: 'demo-2', updatedAt: '2026-09-12T14:15:00.000Z', summary: 'Do din se bukhar aur thakan (Mild Fever)', tier: 'Yellow' },
    ]);
    toast.success('Sample consultation records loaded.');
  };

  const refreshConsultations = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const historyData = await getChatHistory();
      if (Array.isArray(historyData) && historyData.length > 0) {
        setConsultations(historyData.map((item) => ({
          conversationId: item.conversation_id,
          summary: item.summary,
          tier: item.tier,
          updatedAt: item.updated_at || item.created_at,
        })));
        toast.success('Parcha itihas taaza ho gaya! 🔄');
        setIsRefreshing(false);
        return;
      }
    } catch (err) {
      console.debug('Failed to fetch backend chat history, falling back to local storage:', err);
    }
    const stored = listSessions();
    setConsultations(stored || []);
    toast.success('Itihas taaza ho gaya! 🔄');
    setIsRefreshing(false);
  }, []);

  const handleDeleteConsultation = async (conversationId, e) => {
    e?.stopPropagation();
    e?.preventDefault();
    if (!window.confirm(l('क्या आप इस परामर्श रिकॉर्ड को हटाना चाहते हैं?', 'Are you sure you want to delete this consultation record?'))) {
      return;
    }
    try {
      await deleteSession(conversationId, user?.id);
      setConsultations((prev) => prev.filter((c) => c.conversationId !== conversationId));
      toast.success(l('परामर्श इतिहास हटा दिया गया 🗑️', 'Consultation deleted 🗑️'));
    } catch (err) {
      console.warn('Failed to delete consultation:', err);
      toast.error(l('परामर्श हटाने में विफल', 'Failed to delete consultation'));
    }
  };

  const handleClearAllConsultations = async () => {
    if (!window.confirm(l('क्या आप सभी परामर्श इतिहास हटाना चाहते हैं? यह वापस नहीं लाया जा सकता।', 'Are you sure you want to delete all consultation history? This cannot be undone.'))) {
      return;
    }
    try {
      await clearSessionHistory(user?.id);
      setConsultations([]);
      toast.success(l('संपूर्ण परामर्श इतिहास साफ कर दिया गया 🗑️', 'All consultation history cleared 🗑️'));
    } catch (err) {
      console.warn('Failed to clear consultations:', err);
      toast.error(l('इतिहास साफ करने में विफल', 'Failed to clear history'));
    }
  };

  const handleDownloadParcha = async (item, e) => {
    e?.stopPropagation();
    e?.preventDefault();
    setDownloadingId(item.conversationId);
    try {
      await downloadConsultationReport({
        conversationId: item.conversationId,
        tier: item.tier || 'Green',
        consultationSummary: item.summary || 'Consultation Summary',
        format: 'pdf',
      });
      toast.success('Parcha (PDF) download ho gaya! 📄');
    } catch (err) {
      console.warn('Backend PDF download error, attempting browser printable parcha fallback:', err);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Sanjeevani Parcha - ${item.conversationId}</title>
            <style>
              body { font-family: system-ui, sans-serif; padding: 24px; color: #1e2a43; }
              .header { border-bottom: 2px solid #4a6845; padding-bottom: 12px; margin-bottom: 18px; }
              .title { font-size: 20px; font-weight: bold; color: #4a6845; }
              .tier { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-weight: bold; color: white; background: ${item.tier === 'Red' ? '#b85042' : item.tier === 'Yellow' ? '#d4a359' : '#4a6845'}; }
              .meta { font-size: 12px; color: #666; margin: 8px 0; }
              .summary { background: #f4f6f0; padding: 16px; border-radius: 8px; margin-top: 14px; font-size: 14px; line-height: 1.6; }
              .footer { margin-top: 30px; font-size: 11px; color: #888; border-top: 1px solid #ddd; padding-top: 10px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">🌿 ${isHindi ? 'संजीवनी स्वास्थ्य परामर्श पर्चा' : 'Sanjeevani Health Summary'}</div>
              <div class="meta">Uttarakhand Telehealth & Rural Clinical Advisory • Gopeshwar & Chamoli</div>
            </div>
            <p><strong>${isHindi ? 'सत्र पहचान:' : 'Session ID:'}</strong> ${item.conversationId}</p>
            <p><strong>${isHindi ? 'दिनांक:' : 'Date:'}</strong> ${item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : (isHindi ? 'सक्रिय परामर्श' : 'Active Session')}</p>
            <p><strong>${isHindi ? 'ट्राइएज स्तर:' : 'Triage Tier:'}</strong> <span class="tier">${item.tier || 'Green'}</span></p>
            <div class="summary">
              <strong>${isHindi ? 'परामर्श सारांश:' : 'Consultation Summary:'}</strong><br/>
              ${item.summary || (isHindi ? 'डॉ. संजीवनी AI के साथ सामान्य परामर्श एवं स्वास्थ्य सलाह।' : 'General wellness consultation and advice with Dr. Sanjeevani AI.')}
            </div>
            <div class="footer">
              ${isHindi ? '⚠️ यह पर्चा Dr. Sanjeevani AI द्वारा उत्पन्न किया गया है। आपातकाल में तुरंत 108 डायल करें।' : '⚠️ This summary was generated by Dr. Sanjeevani AI. In medical emergencies, dial 108 immediately.'}
            </div>
            <script>window.onload = function() { window.print(); };</script>
          </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        toast.error('PDF download nahi ho saka. Kripya dobara koshish karein.');
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleShareParcha = (item, e) => {
    e?.stopPropagation();
    e?.preventDefault();
    const parchaDate = item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '';
    const shareText = `*🌿 Sanjeevani Swasthya Parcha*\n*Tarikh:* ${parchaDate}\n*Triage:* ${item.tier || 'Green'}\n*Salah:* ${item.summary || 'Swasthya Paramarsh'}\n\nAapaatkaal mein 108 par call karein.`;
    if (navigator.share) {
      navigator.share({
        title: 'Sanjeevani Consultation Parcha',
        text: shareText,
        url: window.location.origin + '/mitra/chat',
      }).catch(() => {});
    } else {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(waUrl, '_blank');
    }
  };

  useEffect(() => {
    let active = true;

    async function loadConsultations() {
      setLoadingConsultations(true);
      try {
        const historyData = await getChatHistory();
        if (active && Array.isArray(historyData) && historyData.length > 0) {
          setConsultations(historyData.map((item) => ({
            conversationId: item.conversation_id,
            summary: item.summary,
            tier: item.tier,
            updatedAt: item.updated_at || item.created_at,
          })));
          setLoadingConsultations(false);
          return;
        }
      } catch (err) {
        console.debug('Failed to fetch backend chat history, falling back to local storage:', err);
      }

      if (active) {
        const stored = listSessions();
        if (stored.length > 0) {
          setConsultations(stored);
        } else {
          setConsultations([]);
        }
        setLoadingConsultations(false);
      }
    }

    loadConsultations();

    const storedAdvisory = localStorage.getItem(ADVISORY_STORAGE_KEY);
    if (storedAdvisory) {
      setAdvisory(storedAdvisory);
    }

    return () => { active = false; };
  }, []);

  const handleToggleRemedy = (id) => {
    setRemedies((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r));
      localStorage.setItem(REMEDIES_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    toast.success('Dose tracker updated! 🌿');
  };

  const handleAddRemedy = (e) => {
    e.preventDefault();
    if (!newRemedyName.trim()) return;
    const item = {
      id: `rem-${Date.now()}`,
      name: newRemedyName.trim(),
      timing: newRemedyTiming,
      note: 'Added from prescription / consultation advice',
      completed: false,
    };
    const updated = [...remedies, item];
    setRemedies(updated);
    localStorage.setItem(REMEDIES_STORAGE_KEY, JSON.stringify(updated));
    setNewRemedyName('');
    setShowAddRemedy(false);
    toast.success('Naya gharelu nuskha schedule mein jud gaya');
  };

  const [tabNarrationEnabled, setTabNarrationEnabled] = useState(() => {
    return localStorage.getItem('sanjeevani_tab_narration') === 'true';
  });
  const [isSpeaking, setIsSpeaking] = useState(false);

  const toggleTabNarration = () => {
    if (tabNarrationEnabled) {
      stopCue();
      setIsSpeaking(false);
      setTabNarrationEnabled(false);
      localStorage.setItem('sanjeevani_tab_narration', 'false');
      toast(l('आवाज़ी वाचन बंद किया गया 🔇', 'Audio Narration Off 🔇'), { icon: '🔇' });
    } else {
      setTabNarrationEnabled(true);
      localStorage.setItem('sanjeevani_tab_narration', 'true');
      toast.success(l('आवाज़ी वाचन चालू किया गया 🔊', 'Audio Narration On 🔊'));
      speakCue(
        l('आवाज़ी मार्गदर्शन चालू है। टैब बदलने पर आवाज़ सुनाई देगी।', 'Audio guidance enabled. You will hear cues when switching tabs.'),
        isHindi ? 'hi-IN' : 'en-IN',
        {
          onStart: () => setIsSpeaking(true),
          onEnd: () => setIsSpeaking(false),
        }
      );
    }
  };

  const handleAudioGuide = (text, force = false) => {
    if (!force && !tabNarrationEnabled) return;
    if (isSpeaking) {
      stopCue();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    speakCue(text, 'hi-IN', {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
  };

  const firstAidGuides = [
    {
      title: l('उंचाई पर चक्कर या ठंड लगना (हाइपोथर्मिया)', 'High-Altitude Sickness & Hypothermia'),
      content: l(
        'चढ़ाई तुरंत रोकें। रोगी को ऊनी कंबल से गर्म और सूखा रखें। अदरक या गुड़ का गुनगुना पेय दें। यदि सांस लेने में कठिनाई हो या होंठ नीले पड़ने लगें (SpO2 < 90%), तो तुरंत 108 पर कॉल करें।',
        'Immediately halt ascent. Keep the patient warm and dry with woolen blankets. Sip warm liquids with ginger or jaggery. If breathing is labored or lips turn pale/blue (SpO2 < 90%), dial 108 for descent support immediately.'
      ),
      audio: 'Uunchai par chhatpatana ya thand lagne par chadhai turant rokein, garam kambal odhein aur 108 ko call karein.',
    },
    {
      title: l('दस्त और उल्टी में ओआरएस (ORS)', 'ORS Rehydration for Diarrhea & Vomiting'),
      content: l(
        '1 लीटर साफ या उबले पानी में 6 चम्मच चीनी और 1/2 चम्मच नमक मिलाएं। दिनभर छोटे-छोटे घूंट पिलाते रहें। शिशुओं को मां का दूध जारी रखें।',
        'Mix 1 liter of clean/boiled water with 6 level teaspoons of sugar and 1/2 level teaspoon of salt. Give small frequent sips throughout the day. Continue breast milk for infants.'
      ),
      audio: 'Dast ya ulti hone par ek liter uble paani me chhah chammach cheeni aur aadha chammach namak milakar piyen.',
    },
    {
      title: l('पहाड़ी रास्तों पर चोट और रक्तस्राव', 'Bleeding & Cuts on Mountain Terrain'),
      content: l(
        'साफ कपड़े से 5 मिनट तक बिना हटाए सीधा दबाव बनाएं। अंग को दिल के स्तर से ऊपर उठाएं। खून रुकने पर उबले पानी से धीरे-धीरे धोएं।',
        'Apply firm direct pressure with clean cloth for 5 full minutes without lifting. Elevate limb above heart level. Wash gently with boiled water once bleeding slows.'
      ),
      audio: 'Chot lagne par saaf kapde se paanch minute tak dabaav banaye rakhein.',
    },
  ];

  const completedRemediesCount = remedies.filter(r => r.completed).length;

  const tabs = [
    { id: 'hub', label: l('मुख्य सेवा', 'Main Services'), sub: l('डैशबोर्ड', 'Dashboard'), icon: Home },
    { id: 'remedies', label: l('दवा व काढ़ा', 'Remedies'), sub: l('दिनचर्या', 'Routine'), icon: Leaf, badge: `${completedRemediesCount}/${remedies.length}` },
    { id: 'history', label: l('पुराना पर्चा', 'Records'), sub: l('परामर्श इतिहास', 'History'), icon: FileText, badge: `${consultations.length}` },
    { id: 'facilities', label: l('अस्पताल', 'Hospitals'), sub: l('निकटतम केंद्र', 'Nearby Care'), icon: Hospital },
    { id: 'firstaid', label: l('प्राथमिक उपचार', 'First-Aid'), sub: l('आपातकालीन गाइड', 'Emergency'), icon: Bandage },
  ];

  return (
    <div className="min-h-screen bg-mist text-primary transition-colors duration-300 relative overflow-hidden pb-20 safe-bottom-nav">
      
      {/* Live Voice Room Modal */}
      {showLiveRoom && <LiveVoiceRoom onClose={() => setShowLiveRoom(false)} />}

      {/* Mountain Contour Background */}
      <div className="absolute top-6 left-0 right-0 pointer-events-none opacity-20 dark:opacity-10 z-0">
        <MountainRidge tone="pine" className="w-full h-44 object-cover" />
      </div>

      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6 relative z-10">

        {/* ── TOP ICONIC NAVIGATION BAR (PAGE-INSIDE-PAGE TABS) ─────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="bg-white/95 dark:bg-card backdrop-blur-md rounded-2xl sm:rounded-3xl p-1.5 sm:p-2 border border-sage/20 dark:border-gray-800 shadow-xs flex items-center justify-between gap-1 overflow-x-auto no-scrollbar flex-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tabNarrationEnabled) {
                      handleAudioGuide(`${tab.label} khula`);
                    }
                  }}
                  className={`touch-target flex-1 min-w-[58px] sm:min-w-[85px] py-1.5 sm:py-2 px-1 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                    isActive
                      ? 'bg-sage text-white shadow-sm scale-102'
                      : 'text-muted dark:text-muted hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="relative">
                    <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5 mb-0.5" />
                    {tab.badge && (
                      <span className={`absolute -top-1.5 -right-2 text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-white text-sage' : 'bg-sage/20 text-sage dark:text-booti-glow'
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold leading-tight truncate">{tab.label}</span>
                  <span className={`text-[10px] hidden sm:block leading-none mt-0.5 ${isActive ? 'text-white/80' : 'opacity-70'}`}>
                    {tab.sub}
                  </span>
                </button>
              );
            })}
          </div>

          {/* User Control: Toggle Tab Narration On/Off or Stop Audio */}
          {/* <div className="flex items-center justify-end gap-1.5 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={toggleTabNarration}
              className={`touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                tabNarrationEnabled
                  ? 'bg-sage/15 text-sage dark:text-booti-glow border-sage/40 hover:bg-sage/25'
                  : 'bg-white/80 dark:bg-card/80 text-muted border-gray-200 dark:border-gray-700 hover:text-primary'
              }`}
              title={tabNarrationEnabled ? l('आवाज़ी वाचन चालू - बंद करने हेतु दबाएं', 'Audio narration on - click to disable') : l('आवाज़ी वाचन बंद - चालू करने हेतु दबाएं', 'Audio narration off - click to enable')}
              aria-label={l('आवाज़ी वाचन बदलें', 'Toggle Section Audio Narration')}
            >
              {tabNarrationEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-sage dark:text-booti-glow animate-pulse" />
                  <span className="text-[11px] sm:text-xs">{l('आवाज़ चालू', 'Voice On')}</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span className="text-[11px] sm:text-xs">{l('आवाज़ बंद', 'Voice Off')}</span>
                </>
              )}
            </button>

            {isSpeaking && (
              <button
                type="button"
                onClick={() => {
                  stopCue();
                  setIsSpeaking(false);
                }}
                className="touch-target inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-soft text-white text-xs font-bold cursor-pointer hover:bg-rose-soft/90 animate-pulse shadow-xs"
                title="बोलना तुरंत रोकें / Stop Audio Now"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>रोकें</span>
              </button>
            )}
          </div> */}
        </div>

        {/* ── TAB 1: MAIN HUB (ICONIC & AUDIO-FIRST CENTERPIECE) ───── */}
        {activeTab === 'hub' && (
          <div className="space-y-4 sm:space-y-6 animate-fadeIn">

            {/* ── Family Profile Switcher ── */}
            <FamilyProfileSelector onProfileChange={(member) => setActiveFamilyMember(member)} />

            {/* ── Page Voice Guide Banner ── */}
            <PageVoiceGuide pageKey="mitra" />
            
            {/* Welcoming Centerpiece Banner */}
            <div className="relative overflow-hidden bg-white/95 dark:bg-card backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-sage/20 dark:border-gray-800 shadow-sm text-center">
              <div className="flex flex-col items-center justify-center">
                
                {/* Living Orb */}
                <div className="inline-block mb-2 sm:mb-3 animate-slow-float">
                  <div className="hidden sm:block"><SanjeevaniOrb state="idle" size={62} /></div>
                  <div className="sm:hidden"><SanjeevaniOrb state="idle" size={42} /></div>
                </div>

                <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-sage/10 dark:bg-sage/25 text-sage dark:text-booti-glow px-3 sm:px-4 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold mb-1.5 sm:mb-2">
                  <Leaf className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold-warm" />
                  <span>{l('संजीवनी मित्र', 'Sanjeevani Mitra')}</span>
                </div>

                <h1 className="font-serif text-xl sm:text-4xl font-bold text-primary">
                  {l('नमस्ते', 'Namaste')}, {activeFamilyMember?.name ? activeFamilyMember.name : (user?.name || l('आदरणीय मित्र', 'Friend'))} 🙏
                </h1>

                <p className="text-[11px] sm:text-sm text-muted dark:text-muted mt-1 flex items-center justify-center gap-1 sm:gap-1.5">
                  <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gold-warm" />
                  <span>{user?.village || l('चमोली, उत्तराखंड', 'Chamoli, Uttarakhand')} • {l('डिजिटल स्वास्थ्य केंद्र', 'Digital Health Center')}</span>
                </p>

                {/* Primary Voice Consultation Trigger */}
                <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setShowLiveRoom(true)}
                    className="touch-target group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 sm:gap-3 px-5 sm:px-8 py-3 sm:py-4.5 rounded-full bg-gradient-to-r from-sage to-[#4a6346] hover:from-[#4a6346] hover:to-[#3b5038] text-white font-extrabold text-sm sm:text-lg shadow-md sm:shadow-lg shadow-sage/30 hover:scale-102 active:scale-98 transition-all cursor-pointer"
                  >
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
                      <Mic className="w-4 h-4 sm:w-5 sm:h-5 animate-bounce" />
                    </div>
                    <span>{l('🎙 बोलकर बताएं', '🎙 Speak Now')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAudioGuide(l('नमस्ते! बोलकर बताएं बटन दबाकर आप आवाज में डॉक्टर से सलाह ले सकते हैं।', 'Namaste! Click speak now to start voice consultation with Dr. Sanjeevani.'), true)}
                    className="touch-target inline-flex items-center justify-center gap-1.5 bg-mist dark:bg-card text-sage dark:text-booti-glow border border-sage/30 px-3.5 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold hover:bg-sage/10 transition-all cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>{l('निर्देश सुनें', 'Voice Guide')}</span>
                  </button>
                </div>
              </div>

              {/* District CMO Advisory Notice */}
              {advisory && (
                <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-sage/15 dark:border-gray-800 flex items-start gap-2.5 sm:gap-3 text-xs bg-gold-warm/10 dark:bg-gold-warm/15 border border-gold-warm/25 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 text-left">
                  <AlertCircle className="w-4 h-4 text-gold-warm dark:text-gold-warm shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="block font-bold text-gold-warm dark:text-gold-warm uppercase tracking-wider text-xs">
                      {l('मुख्य चिकित्सा अधिकारी (CMO) स्वास्थ्य परामर्श:', 'District CMO Health Advisory:')}
                    </strong>
                    <span className="text-xs text-primary leading-relaxed font-medium">
                      {advisory}
                    </span>
                  </div>
                  <button
                    onClick={() => handleAudioGuide(advisory, true)}
                    className="touch-target p-1 text-gold-warm dark:text-gold-warm hover:scale-110"
                    title={l('परामर्श सुनें', 'Listen to Advisory')}
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* 4 Core Pillar Tiles — 2x2 Icon-Dominant Grid on Mobile, 4-col on Desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              
              {/* 1. Sehat (AI Doctor) */}
              <Link
                to="/mitra/chat"
                className="touch-target group flex flex-col justify-between p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-warm-indigo border border-sage/25 hover:border-sage transition-all shadow-xs tactile-card"
              >
                <div>
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-sage/15 dark:bg-sage/25 text-sage dark:text-booti-glow flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-108 transition-transform">
                    <Stethoscope className="w-5 h-5 sm:w-7 sm:h-7" />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-sage dark:text-booti-glow block truncate">
                    {l('चिकित्सक सहयोग', 'Doctor Consultation')}
                  </span>
                  <h3 className="font-serif font-bold text-sm sm:text-lg text-primary mt-0.5 leading-snug">
                    {l('स्वास्थ्य', 'Doctor Clinic')}
                  </h3>
                  <p className="text-xs text-muted dark:text-muted mt-1 hidden sm:block">
                    {l('लक्षण जांच, प्राथमिक निदान एवं डॉक्टर से परामर्श लें।', 'Symptom triage, primary diagnosis and clinical advice.')}
                  </p>
                </div>
                <div className="mt-2.5 sm:mt-4 flex items-center justify-between text-xs font-bold text-sage dark:text-booti-glow pt-2 sm:pt-3 border-t border-gray-100 dark:border-gray-800">
                  <span>{l('परामर्श लें', 'Consult Now')}</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* 2. Arogyashala (Unified Wellness Studio) */}
              <Link
                to="/mitra/wellness"
                className="touch-target group flex flex-col justify-between p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-warm-indigo border border-gold-warm/30 hover:border-gold-warm transition-all shadow-xs tactile-card"
              >
                <div>
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gold-warm/15 dark:bg-gold-warm/25 text-gold-warm dark:text-gold-warm flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-108 transition-transform">
                    <Sparkles className="w-5 h-5 sm:w-7 sm:h-7" />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-gold-warm dark:text-gold-warm block truncate">
                    {l('योग • ध्यान • नाद', 'Yoga • Dhyan • Naad')}
                  </span>
                  <h3 className="font-serif font-bold text-sm sm:text-lg text-primary mt-0.5 leading-snug">
                    {l('आरोग्यशाला', 'Wellness Studio')}
                  </h3>
                  <p className="text-xs text-muted dark:text-muted mt-1 hidden sm:block">
                    {l('मुद्रा एआई, 5 वैदिक प्राणायाम, ध्यान कथा और सुखद ध्वनियां।', 'Pose AI, 5 Vedic Pranayamas, guided meditation and soundscapes.')}
                  </p>
                </div>
                <div className="mt-2.5 sm:mt-4 flex items-center justify-between text-xs font-bold text-gold-warm dark:text-gold-warm pt-2 sm:pt-3 border-t border-gray-100 dark:border-gray-800">
                  <span>{l('स्टूडियो खोलें', 'Open Studio')}</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* 3. Saathi (Companion) */}
              <Link
                to="/mitra/saathi"
                className="touch-target group flex flex-col justify-between p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-warm-indigo border border-rose-soft/25 hover:border-rose-soft transition-all shadow-xs tactile-card"
              >
                <div>
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-rose-soft/15 dark:bg-rose-soft/25 text-rose-soft dark:text-rose-soft flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-108 transition-transform">
                    <HeartHandshake className="w-5 h-5 sm:w-7 sm:h-7" />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-rose-soft dark:text-rose-soft block truncate">
                    {l('सदा आपके साथ', 'Elder Companion')}
                  </span>
                  <h3 className="font-serif font-bold text-sm sm:text-lg text-primary mt-0.5 leading-snug">
                    {l('साथी', 'Saathi Companion')}
                  </h3>
                  <p className="text-xs text-muted dark:text-muted mt-1 hidden sm:block">
                    {l('अकेलेपन में आत्मीय बातचीत, पुराने किस्से और स्नेहपूर्ण सम्बल।', 'Warm comforting conversations, storytelling, and emotional support.')}
                  </p>
                </div>
                <div className="mt-2.5 sm:mt-4 flex items-center justify-between text-xs font-bold text-rose-soft dark:text-rose-soft pt-2 sm:pt-3 border-t border-gray-100 dark:border-gray-800">
                  <span>{l('बातचीत करें', 'Talk to Saathi')}</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* 4. Aankhon Ki Jaanch (Eye Screening) */}
              <Link
                to="/mitra/screen"
                className="touch-target group flex flex-col justify-between p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-warm-indigo border border-warm-indigo/25 hover:border-warm-indigo transition-all shadow-xs tactile-card"
              >
                <div>
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-warm-indigo/15 dark:bg-warm-indigo/25 text-primary dark:text-muted flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-108 transition-transform">
                    <Eye className="w-5 h-5 sm:w-7 sm:h-7" />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-primary dark:text-muted block truncate">
                    {l('नेत्र जांच', 'Eye Screening')}
                  </span>
                  <h3 className="font-serif font-bold text-sm sm:text-lg text-primary mt-0.5 leading-snug">
                    {l('स्क्रीनिंग', 'Eye Health Scan')}
                  </h3>
                  <p className="text-xs text-muted dark:text-muted mt-1 hidden sm:block">
                    {l('कैमरे से पलक की तस्वीर लेकर एनीमिया व पीलिया के संकेत जांचें।', 'Scan eyelid image to detect signs of anemia and jaundice.')}
                  </p>
                </div>
                <div className="mt-2.5 sm:mt-4 flex items-center justify-between text-[11px] sm:text-xs font-bold text-primary dark:text-muted pt-2 sm:pt-3 border-t border-gray-100 dark:border-gray-800">
                  <span>{l('जांच शुरू करें', 'Start Screening')}</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

            </div>

            {/* Daily Himalayan Wellness Journey Callout */}
            <div className="bg-gradient-to-r from-sage/10 via-[#D4A359]/15 to-sage/10 dark:from-sage/20 dark:via-[#D4A359]/10 dark:to-[#1E2A43] rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-sage/30 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 tactile-card">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-sage text-white flex items-center justify-center shrink-0 shadow-md shadow-sage/25">
                  <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 animate-pulse text-mist" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-xs bg-sage text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      {l('दैनिक साधना', 'Daily Sadhana')}
                    </span>
                    <span className="text-[11px] text-gold-warm dark:text-gold-warm font-bold">{l('15 मिनट • हिमालयी स्फूर्ति', '15 Mins • Himalayan Vitality')}</span>
                  </div>
                  <h3 className="font-serif font-bold text-base sm:text-xl text-primary mt-1">
                    {l('सुबह की ऊर्जा साधना', 'Himalayan Morning Flow')}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted dark:text-muted mt-0.5">
                    {l('अनुलोम विलोम प्राणायाम + ताड़ासन व वृक्षासन मुद्रा जांच + गायन पात्र नाद।', 'Anulom Vilom breathwork + Tadasana & Vrikshasana posture check + Singing bowls.')}
                  </p>
                </div>
              </div>
              <Link
                to="/mitra/wellness?tab=flow"
                className="touch-target w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-extrabold text-white bg-sage hover:bg-sage/90 px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl transition-all shadow-sm hover:scale-102 cursor-pointer"
              >
                <span>{l('आरंभ करें', 'Start Flow')}</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </Link>
            </div>

            {/* 24/7 Emergency 108 Call Strip */}
            <div className="bg-rose-soft/10 dark:bg-rose-soft/20 border border-rose-soft/30 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2.5 sm:gap-3 text-center sm:text-left">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-rose-soft text-white flex items-center justify-center shadow-xs shrink-0">
                  <PhoneCall className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-xs sm:text-base text-primary">
                    {l('आपातकालीन हेल्पलाइन', 'Emergency Hotline')}
                  </h4>
                  <p className="text-[10px] sm:text-xs text-muted dark:text-muted">
                    {l('गंभीर स्थिति में तुरंत 108 पर संपर्क करें', 'In critical condition, call 108 immediately')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                <a
                  href="tel:108"
                  className="touch-target flex-1 sm:flex-initial justify-center bg-rose-soft hover:bg-rose-soft/90 text-white text-xs sm:text-sm font-bold px-3.5 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl transition-all shadow-xs flex items-center gap-1.5"
                >
                  <PhoneCall className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{l('108 एम्बुलेंस', '108 Ambulance')}</span>
                </a>
                <a
                  href="tel:104"
                  className="touch-target bg-warm-indigo hover:bg-warm-indigo text-white text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl transition-all shadow-xs"
                >
                  <span>{l('104 स्वास्थ्य सलाह', '104 Health Advice')}</span>
                </a>
              </div>
            </div>

          </div>
        )}

        {/* ── TAB 2: REMEDIES SCHEDULE (दवा व काढ़ा) ──────────────── */}
        {activeTab === 'remedies' && (
          <div className="bg-white dark:bg-warm-indigo rounded-3xl p-6 sm:p-8 border border-sage/20 dark:border-gray-800 shadow-sm space-y-5 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-sage/10 text-sage dark:text-booti-glow text-[10px] font-bold px-3 py-0.5 rounded-full mb-1">
                  <Leaf className="w-3.5 h-3.5" /> {l('आयुष दिनचर्या ट्रैकर', 'AYUSH Routine Tracker')}
                </div>
                <h2 className="font-serif font-bold text-xl text-primary flex items-center gap-2">
                  <span>{l('दवा व काढ़ा समय सारणी', 'Remedy & Care Routine')}</span>
                  <button
                    onClick={() => handleAudioGuide(l('यह आपकी दैनिक घरेलू औषधि और दवाइयों की समय सारणी है।', 'This is your daily home remedy and medicine schedule.'), true)}
                    className="touch-target p-1 text-sage"
                    title={l('ऑडियो सुनें', 'Listen to Audio')}
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </h2>
                <p className="text-xs text-muted dark:text-muted">
                  {l('सुबह, दोपहर और रात के समय घरेलू नुस्खे व दवाइयां लेना न भूलें', 'Remember to take your prescribed remedies and medicines on time')}
                </p>
              </div>

              <button
                onClick={() => setShowAddRemedy(!showAddRemedy)}
                className="touch-target inline-flex items-center gap-1.5 text-xs font-bold text-white bg-sage hover:bg-sage/90 px-4 py-2.5 rounded-2xl transition-all shadow-xs cursor-pointer self-start sm:self-center"
              >
                <Plus className="w-4 h-4" />
                <span>{l('नया नुस्खा जोड़ें', 'Add Remedy')}</span>
              </button>
            </div>

            {/* Add Remedy Form Drawer */}
            {showAddRemedy && (
              <form onSubmit={handleAddRemedy} className="p-4 sm:p-5 bg-mist/80 dark:bg-card rounded-2xl border border-sage/20 dark:border-gray-700 space-y-3.5 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-primary mb-1 block">{l('औषधि का नाम *', 'Remedy / Medicine Name *')}</label>
                    <input
                      type="text"
                      value={newRemedyName}
                      onChange={(e) => setNewRemedyName(e.target.value)}
                      placeholder={l('जैसे: तुलसी अदरक काढ़ा या गिलोय', 'e.g. Tulsi Ginger Kadha or Giloy')}
                      className="w-full bg-white dark:bg-warm-indigo border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-primary focus:outline-none focus:ring-2 focus:ring-sage"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-primary mb-1 block">{l('लेने का समय *', 'Timing *')}</label>
                    <select
                      value={newRemedyTiming}
                      onChange={(e) => setNewRemedyTiming(e.target.value)}
                      className="w-full bg-white dark:bg-warm-indigo border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-primary focus:outline-none focus:ring-2 focus:ring-sage"
                    >
                      <option value="Subah">{l('सुबह', 'Morning')}</option>
                      <option value="Dophar">{l('दोपहर', 'Afternoon')}</option>
                      <option value="Raat">{l('रात', 'Night')}</option>
                      <option value="As Needed">{l('जरूरत पड़ने पर', 'As Needed')}</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="touch-target bg-sage hover:bg-sage/90 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    {l('शेड्यूल में जोड़ें', 'Add to Schedule')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddRemedy(false)}
                    className="touch-target text-xs text-muted dark:text-muted hover:text-primary px-3 py-2 cursor-pointer"
                  >
                    {l('रद्द करें', 'Cancel')}
                  </button>
                </div>
              </form>
            )}

            {/* Remedies Checklist */}
            <div className="space-y-3">
              {remedies.length === 0 ? (
                <div className="py-12 px-4 text-center flex flex-col items-center justify-center bg-mist/40 dark:bg-card/40 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                  <div className="w-12 h-12 rounded-2xl bg-sage/10 text-sage flex items-center justify-center mb-3">
                    <Leaf className="w-6 h-6" />
                  </div>
                  <h4 className="font-serif font-bold text-sm text-primary mb-1">
                    {l('कोई दवा या काढ़ा शेड्यूल नहीं है', 'No Active Remedy Schedule')}
                  </h4>
                  <p className="text-xs text-muted max-w-sm mb-4 leading-relaxed">
                    {l('दैनिक स्वास्थ्य दिनचर्या के लिए नया नुस्खा जोड़ें या परीक्षण हेतु नमूना शेड्यूल लोड करें।', 'Add a new remedy for your daily health routine or load sample schedule for testing.')}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      onClick={() => setShowAddRemedy(true)}
                      className="touch-target bg-sage hover:bg-sage/90 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> {l('नुस्खा जोड़ें', 'Add Remedy')}
                    </button>
                    <button
                      onClick={handleLoadSampleRemedies}
                      className="touch-target bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-primary font-bold text-xs px-3.5 py-2 rounded-xl transition-all border border-gray-200 dark:border-gray-700 cursor-pointer"
                    >
                      {l('नमूना शेड्यूल लोड करें', 'Load Sample Remedies')}
                    </button>
                  </div>
                </div>
              ) : (
                remedies.map((remedy) => (
                  <div
                    key={remedy.id}
                    onClick={() => handleToggleRemedy(remedy.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      remedy.completed
                        ? 'bg-sage/10 dark:bg-sage/15 border-sage/30'
                        : 'bg-mist/60 dark:bg-card border-gray-200 dark:border-gray-700 hover:border-sage/40'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                        remedy.completed ? 'bg-sage text-white' : 'border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-warm-indigo'
                      }`}>
                        {remedy.completed && <CheckCircle2 className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${remedy.completed ? 'line-through text-muted dark:text-muted' : 'text-primary'}`}>
                          {remedy.name}
                        </p>
                        <p className="text-xs text-muted dark:text-muted mt-0.5">{remedy.timing} • {remedy.note}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayRemedyReminder(remedy);
                        }}
                        className="touch-target p-2 rounded-xl text-sage hover:bg-sage/15 dark:text-booti-glow transition-all cursor-pointer"
                        title={l('आवाज़ में रिमाइंडर सुनें', 'Play Voice Reminder')}
                        aria-label={`Voice reminder for ${remedy.name}`}
                      >
                        <Bell className="w-4 h-4" />
                      </button>
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                        remedy.completed ? 'bg-sage text-white' : 'bg-gray-200 dark:bg-gray-700 text-muted dark:text-gray-300'
                      }`}>
                        {remedy.completed ? l('पूरा हुआ ✓', 'Completed ✓') : l('लेना बाकी है', 'Pending')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: CONSULTATION HISTORY (पुराना पर्चा व स्वास्थ्य समयरेखा) ──────────── */}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-warm-indigo rounded-3xl p-6 sm:p-8 border border-sage/20 dark:border-gray-800 shadow-sm space-y-5 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-sage/10 text-sage dark:text-booti-glow text-[10px] font-bold px-3 py-0.5 rounded-full mb-1">
                  <FileText className="w-3.5 h-3.5" /> {l('पर्चा व रिपोर्ट', 'Consultation Records')}
                </div>
                <h2 className="font-serif font-bold text-xl text-primary flex items-center gap-2">
                  <span>{l('परामर्श इतिहास', 'Consultation History')}</span>
                  <button
                    onClick={() => handleAudioGuide(l('आपकी पिछली डॉक्टर बातचीत और पर्चे यहां दर्ज हैं। आप पर्चा डाउनलोड भी कर सकते हैं।', 'All your past doctor consultations and prescriptions are stored here. You can also download PDF records.'), true)}
                    className="touch-target p-1 text-sage"
                    title={l('ऑडियो सुनें', 'Listen to Audio')}
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </h2>
                <p className="text-xs text-muted dark:text-muted">
                  {l('डॉ. संजीवनी एआई द्वारा जारी पर्चा, ट्राइएज स्थिति एवं विवरण', 'Clinical prescriptions, triage status, and referral details issued by Dr. Sanjeevani AI')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={refreshConsultations}
                  disabled={isRefreshing}
                  className="touch-target inline-flex items-center gap-1.5 text-xs font-bold text-primary dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 px-3.5 py-2.5 rounded-2xl transition-all border border-gray-200 dark:border-gray-700 cursor-pointer"
                  title={l('ताज़ा करें', 'Refresh')}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sage' : ''}`} />
                  <span>{isRefreshing ? l('ताज़ा हो रहा है...', 'Refreshing...') : l('ताज़ा करें', 'Refresh')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowHistoryDrawer(true)}
                  className="touch-target inline-flex items-center gap-1.5 text-xs font-bold text-sage dark:text-booti-glow bg-sage/10 hover:bg-sage/20 px-3.5 py-2.5 rounded-2xl transition-all"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{l('त्वरित सूची', 'Quick Drawer')}</span>
                </button>
                {consultations.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllConsultations}
                    className="touch-target inline-flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 px-3.5 py-2.5 rounded-2xl transition-all border border-rose-200 dark:border-rose-900/50 cursor-pointer"
                    title={l('इतिहास साफ करें', 'Clear History')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{l('इतिहास साफ करें', 'Clear History')}</span>
                  </button>
                )}
                <Link
                  to="/mitra/chat"
                  className="touch-target inline-flex items-center gap-1.5 text-xs font-bold text-white bg-sage hover:bg-sage/90 px-4 py-2.5 rounded-2xl transition-all shadow-xs"
                >
                  <span>{l('नया परामर्श', 'New Consultation')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              {loadingConsultations ? (
                <SkeletonLoader variant="card" count={3} />
              ) : consultations.length === 0 ? (
                <div className="py-12 px-6 text-center flex flex-col items-center justify-center bg-mist/40 dark:bg-card/40 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                  <div className="w-14 h-14 rounded-3xl bg-sage/10 text-sage flex items-center justify-center mb-3">
                    <FileText className="w-7 h-7" />
                  </div>
                  <h4 className="font-serif font-bold text-base text-primary mb-1">
                    {l('कोई पुराना पर्चा नहीं है', 'No Consultation History')}
                  </h4>
                  <p className="text-xs text-muted max-w-sm mb-5 leading-relaxed">
                    {l('एआई डॉक्टर से अपने लक्षणों पर सलाह लें, या इंटरफेस देखने के लिए नमूना परामर्श लोड करें।', 'Consult the AI doctor about your symptoms, or load sample records to test the interface.')}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Link
                      to="/mitra/chat"
                      className="touch-target bg-sage hover:bg-sage/90 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                    >
                      <span>{l('नया परामर्श शुरू करें', 'Start Consultation')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={handleLoadSampleConsultations}
                      className="touch-target bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-primary font-bold text-xs px-4 py-2.5 rounded-xl transition-all border border-gray-200 dark:border-gray-700 cursor-pointer"
                    >
                      {l('नमूना परामर्श लोड करें', 'Load Sample Consultations')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-sage/20 dark:before:bg-gray-700">
                  {consultations.map((item, idx) => {
                    const isRed = item.tier === 'Red';
                    const isYellow = item.tier === 'Yellow';
                    const tierLabel = isRed 
                      ? l('तत्काल अस्पताल', 'Urgent Hospital Referral')
                      : isYellow 
                        ? l('आशा परामर्श', 'ASHA Consultation')
                        : l('घरेलू देखभाल', 'Self-Care Guidance');
                    const isDownloadingThis = downloadingId === item.conversationId;

                    return (
                      <div
                        key={item.conversationId || idx}
                        className="relative p-4 sm:p-5 rounded-2xl bg-mist/60 dark:bg-card border border-gray-200/80 dark:border-gray-800 hover:border-sage/40 transition-all shadow-xs"
                      >
                        {/* Timeline Node Badge - English numbers always */}
                        <div className={`absolute -left-6 sm:-left-8 top-5 w-6 h-6 rounded-full border-2 border-white dark:border-[#1A2433] flex items-center justify-center text-[10px] font-bold text-white shadow-xs ${
                          isRed ? 'bg-rose-soft ring-2 ring-rose-soft/30' :
                          isYellow ? 'bg-gold-warm ring-2 ring-gold-warm/30 text-primary' :
                          'bg-sage ring-2 ring-sage/30'
                        }`}>
                          {idx + 1}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                isRed ? 'bg-rose-soft/15 text-rose-soft dark:bg-rose-soft/25 dark:text-rose-soft' :
                                isYellow ? 'bg-gold-warm/20 text-yellow-800 dark:bg-gold-warm/30 dark:text-gold-warm' :
                                'bg-sage/15 text-sage dark:bg-sage/25 dark:text-booti-glow'
                              }`}>
                                {tierLabel}
                              </span>

                              {String(item.conversationId).startsWith('demo-') && (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300">
                                  {l('नमूना डेटा', 'Sample Demo')}
                                </span>
                              )}

                              <span className="text-[11px] text-muted dark:text-muted">
                                {item.updatedAt ? formatDate(item.updatedAt, lang) : l('हाल ही में', 'Recently')}
                              </span>
                            </div>

                            <h3 className="font-serif font-bold text-sm sm:text-base text-primary leading-snug">
                              {item.summary || l('डॉ. संजीवनी स्वास्थ्य परामर्श', 'Dr. Sanjeevani Health Consultation')}
                            </h3>

                            <p className="text-[11px] text-muted dark:text-muted flex items-center gap-2">
                              <span>{l('सत्र आईडी', 'Session ID')}: <code className="font-mono text-[10px] bg-black/5 dark:bg-white/5 px-1 py-0.5 rounded">{String(item.conversationId).slice(0, 16)}</code></span>
                            </p>
                          </div>

                          {/* Quick Action Toolbar */}
                          <div className="flex flex-wrap items-center gap-1.5 sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200/50 dark:border-gray-800">
                            {/* Download Parcha PDF */}
                            <button
                              type="button"
                              onClick={(e) => handleDownloadParcha(item, e)}
                              disabled={isDownloadingThis}
                              className="touch-target inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-white dark:bg-warm-indigo border border-gray-200 dark:border-gray-700 text-primary dark:text-gray-200 hover:border-sage hover:text-sage transition-all shadow-2xs cursor-pointer"
                              title={l('पर्चा (PDF) डाउनलोड करें', 'Download Prescription PDF')}
                            >
                              {isDownloadingThis ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-sage" />
                                  <span>{l('तैयार हो रहा है...', 'Generating...')}</span>
                                </>
                              ) : (
                                <>
                                  <FileDown className="w-3.5 h-3.5 text-rose-soft" />
                                  <span>{l('पर्चा (PDF)', 'Prescription')}</span>
                                </>
                              )}
                            </button>

                            {/* Share via WhatsApp */}
                            <button
                              type="button"
                              onClick={(e) => handleShareParcha(item, e)}
                              className="touch-target inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-2 rounded-xl bg-white dark:bg-warm-indigo border border-gray-200 dark:border-gray-700 text-primary dark:text-gray-200 hover:border-sage transition-all shadow-2xs cursor-pointer"
                              title={l('व्हाट्सएप पर भेजें', 'Share via WhatsApp')}
                            >
                              <Share2 className="w-3.5 h-3.5 text-sage" />
                              <span className="hidden sm:inline">{l('भेजें', 'Share')}</span>
                            </button>

                            {/* PHC Doctor Referral Pass QR */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setSelectedReferral(item);
                              }}
                              className="touch-target inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-2 rounded-xl bg-white dark:bg-warm-indigo border border-gray-200 dark:border-gray-700 text-primary dark:text-gray-200 hover:border-gold-warm hover:text-gold-warm transition-all shadow-2xs cursor-pointer"
                              title={l('रेफरल पास (QR कोड)', 'Referral Pass (QR Code)')}
                            >
                              <QrCode className="w-3.5 h-3.5 text-gold-warm" />
                              <span>{l('क्यूआर पास', 'QR Pass')}</span>
                            </button>

                            {/* Reopen Consultation in Chat */}
                            <Link
                              to="/mitra/chat"
                              className="touch-target inline-flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-xl bg-sage text-white hover:bg-sage/90 transition-all shadow-2xs"
                              title={l('चैट में खोलें', 'Open in Chat')}
                            >
                              <span>{l('खोलें', 'Open')}</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>

                            {/* Delete Consultation */}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteConsultation(item.conversationId, e)}
                              className="touch-target inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-2 rounded-xl bg-white dark:bg-warm-indigo border border-gray-200 dark:border-gray-700 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 dark:hover:border-rose-800 transition-all shadow-2xs cursor-pointer"
                              title={l('परामर्श हटाएं', 'Delete Consultation')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">{l('हटाएं', 'Delete')}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 4: NEARBY FACILITIES (अस्पताल खोजें) ────────────── */}
        {activeTab === 'facilities' && (
          <div className="space-y-4 animate-fadeIn">
            <NearbyFacilityFinder onClose={() => setActiveTab('hub')} />
          </div>
        )}

        {/* ── TAB 5: MOUNTAIN FIRST AID (प्राथमिक उपचार) ──────────── */}
        {activeTab === 'firstaid' && (
          <div className="bg-white dark:bg-warm-indigo rounded-3xl p-6 sm:p-8 border border-sage/20 dark:border-gray-800 shadow-sm space-y-4 animate-fadeIn">
            <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
              <div className="inline-flex items-center gap-1.5 bg-sage/10 text-sage dark:text-booti-glow text-[10px] font-bold px-3 py-0.5 rounded-full mb-1">
                <ShieldCheck className="w-3.5 h-3.5" /> {l('जीवन रक्षक नियम', 'Life-Saving Rules')}
              </div>
              <h2 className="font-serif font-bold text-xl text-primary flex items-center gap-2">
                <span>{l('पहाड़ी प्राथमिक उपचार', 'Mountain Emergency First-Aid')}</span>
                <button
                  onClick={() => handleAudioGuide(l('पहाड़ में आपात स्थिति होने पर इन प्राथमिक उपचार नियमों को सुनें और अपनाएं।', 'Listen to and follow these emergency first-aid guidelines in mountain terrain.'), true)}
                  className="touch-target p-1 text-sage"
                  title={l('ऑडियो सुनें', 'Listen to Audio')}
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </h2>
              <p className="text-xs text-muted dark:text-muted">
                {l('अस्पताल पहुंचने तक जरूरी प्राथमिक सहायता', 'Critical first-aid support until medical help arrives')}
              </p>
            </div>

            <div className="space-y-3">
              {firstAidGuides.map((guide, idx) => {
                const isOpen = openFirstAidIndex === idx;
                return (
                  <div
                    key={idx}
                    className="border border-gray-200/80 dark:border-gray-700/80 rounded-2xl overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => setOpenFirstAidIndex(isOpen ? null : idx)}
                      className="touch-target w-full text-left p-4 flex items-center justify-between gap-3 bg-mist/40 dark:bg-card/50 hover:bg-sage/10 text-xs sm:text-sm font-bold text-primary cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Bandage className="w-4 h-4 text-sage shrink-0" />
                        <span>{guide.title}</span>
                      </span>
                      {isOpen ? <ChevronUp className="w-4 h-4 shrink-0 text-sage" /> : <ChevronDown className="w-4 h-4 shrink-0 text-gray-400" />}
                    </button>
                    {isOpen && (
                      <div className="p-4 bg-white dark:bg-warm-indigo text-xs sm:text-sm text-muted dark:text-muted leading-relaxed border-t border-gray-100 dark:border-gray-800 animate-fadeIn space-y-3">
                        <p>{guide.content}</p>
                        <button
                          onClick={() => handleAudioGuide(guide.audio || guide.content, true)}
                          className="touch-target inline-flex items-center gap-1.5 text-xs font-bold text-sage dark:text-booti-glow bg-sage/10 px-3 py-1.5 rounded-xl hover:bg-sage/20 cursor-pointer"
                        >
                          <Volume2 className="w-4 h-4" />
                          <span>{l('नियम सुनें (ऑडियो)', 'Listen to Guide (Audio)')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
      <SessionHistoryDrawer open={showHistoryDrawer} onClose={() => setShowHistoryDrawer(false)} />

      {/* PHC Doctor Referral QR Modal */}
      {selectedReferral && (
        <ReferralQRModal
          isOpen={!!selectedReferral}
          onClose={() => setSelectedReferral(null)}
          consultation={selectedReferral}
          patientName={activeFamilyMember?.name || user?.name}
        />
      )}
    </div>
  );
}
