import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Mic, MessageSquare, Eye, Heart, Leaf, MapPin, Clock, ShieldCheck,
  PhoneCall, AlertCircle, Plus, CheckCircle2, ChevronRight,
  ShieldAlert, BookOpen, ChevronDown, ChevronUp, Sparkles, Navigation,
  Wind, Activity, HeartHandshake, ArrowRight, Stethoscope, Hospital,
  Volume2, VolumeX, Square, Home, FileText, Bandage, ArrowLeft, FileDown, Share2, RefreshCw, Printer,
  Bell, QrCode, Trash2, Pill
} from 'lucide-react';
import LiveVoiceRoom from '../components/LiveVoiceRoom';
import NearbyFacilityFinder from '../components/NearbyFacilityFinder';
import JanAushadhiCard from '../components/JanAushadhiCard';
import SanjeevaniOrb from '../components/SanjeevaniOrb';
import MountainRidge from '../components/MountainRidge';
import SessionHistoryDrawer from '../components/SessionHistoryDrawer';
import SkeletonLoader from '../components/SkeletonLoader';
import ReferralQRModal from '../components/ReferralQRModal';
import ConfirmModal from '../components/ConfirmModal';
import FamilyProfileSelector from '../components/FamilyProfileSelector';
import { listSessions, deleteSession, clearSessionHistory } from '../lib/sessionStore';
import { getChatHistory, setStoredConversationId } from '../api/client';
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
  const { lang, l, isHindi, isEnglish, toEnglishDigits, formatDate } = useLanguage();
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
  const [deleteModalConfig, setDeleteModalConfig] = useState({
    isOpen: false,
    type: 'single',
    targetId: null,
    title: '',
    message: '',
  });

  // Persistent Known Conditions synced with Chat
  const [knownConditions, setKnownConditions] = useState(() => {
    try {
      const saved = localStorage.getItem('sanjeevani_conditions');
      if (saved) return JSON.parse(saved);
      const kSaved = localStorage.getItem('sanjeevani_known_conditions');
      if (kSaved) return JSON.parse(kSaved);
    } catch {}
    return ['BP / Hypertension'];
  });

  const toggleCondition = (condition) => {
    setKnownConditions((prev) => {
      const next = prev.includes(condition)
        ? prev.filter((c) => c !== condition)
        : [...prev, condition];
      localStorage.setItem('sanjeevani_conditions', JSON.stringify(next));
      localStorage.setItem('sanjeevani_known_conditions', JSON.stringify(next));
      return next;
    });
    toast.success(l('स्वास्थ्य स्थिति अपडेट हुई! 🌿', 'Health condition updated! 🌿', 'Svasthya sthiti update hui! 🌿'));
  };

  // Persistent Recent Consultations & Screenings
  const [recentConsultations] = useState(() => {
    try {
      const saved = localStorage.getItem('sanjeevani_consultations');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      { id: 1, date: '14 Oct 2026', symptom: 'Bukhar aur Gale me Kharash (Fever & Sore Throat)', tier: 'Green', status: 'Tulsi Adrak Kadha' },
      { id: 2, date: '11 Oct 2026', symptom: 'Kamar Dard aur Thakan (Joint & Back Pain)', tier: 'Green', status: 'Nirgundi Tel Malish' },
    ];
  });

  const [recentScreenings] = useState(() => {
    try {
      const saved = localStorage.getItem('sanjeevani_screenings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const handlePlayRemedyReminder = (remedy) => {
    const text = isEnglish
      ? `It is time to take your remedy: ${remedy.name}. Please take with warm water or as directed.`
      : isHindi
      ? `${remedy.name} लेने का समय हो गया है! कृपया गुनगुने पानी या निर्देशित मात्रा के साथ लें।`
      : `${remedy.name} lene ka samay ho gaya hai! Kripya gungune paani ya nirdeshit matra ke sath lein.`;
    speakCue(text, isEnglish ? 'en-IN' : 'hi-IN');
    toast.success(
      l(
        `दवा / नुस्खा स्मरण: ${remedy.name} 🔔`,
        `Remedy Reminder: ${remedy.name} 🔔`,
        `Dawa / Kadha Reminder: ${remedy.name} 🔔`
      ),
      { icon: '🌿' }
    );
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
        toast.success(l('पर्चा इतिहास ताज़ा हो गया! 🔄', 'Prescription history refreshed! 🔄', 'Parcha itihas taaza ho gaya! 🔄'));
        setIsRefreshing(false);
        return;
      }
    } catch (err) {
      console.debug('Failed to fetch backend chat history, falling back to local storage:', err);
    }
    const stored = listSessions();
    setConsultations(stored || []);
    toast.success(l('इतिहास ताज़ा हो गया! 🔄', 'History refreshed! 🔄', 'Itihas taaza ho gaya! 🔄'));
    setIsRefreshing(false);
  }, [l]);

  const handleDeleteConsultation = (conversationId, e) => {
    e?.stopPropagation();
    e?.preventDefault();
    setDeleteModalConfig({
      isOpen: true,
      type: 'single',
      targetId: conversationId,
      title: l('परामर्श हटाएं', 'Delete Consultation', 'Paramarsh hatayein'),
      message: l('क्या आप इस परामर्श रिकॉर्ड को हटाना चाहते हैं?', 'Are you sure you want to delete this consultation record?', 'Kya aap is paramarsh record ko hatana chahte hain?'),
    });
  };

  const handleClearAllConsultations = () => {
    setDeleteModalConfig({
      isOpen: true,
      type: 'all',
      targetId: null,
      title: l('संपूर्ण इतिहास साफ करें', 'Clear All Consultation History', 'Itihas saaf karein'),
      message: l('क्या आप सभी परामर्श इतिहास हटाना चाहते हैं? यह वापस नहीं लाया जा सकता।', 'Are you sure you want to delete all consultation history? This cannot be undone.', 'Kya aap sabhi paramarsh itihas hatana chahte hain?'),
    });
  };

  const handleConfirmDeleteConsultation = async () => {
    if (deleteModalConfig.type === 'single') {
      const conversationId = deleteModalConfig.targetId;
      if (!conversationId) return;
      try {
        await deleteSession(conversationId, user?.id);
        setConsultations((prev) => prev.filter((c) => c.conversationId !== conversationId));
        toast.success(l('परामर्श इतिहास हटा दिया गया 🗑️', 'Consultation deleted 🗑️', 'Paramarsh itihas hata diya gaya 🗑️'));
      } catch (err) {
        console.warn('Failed to delete consultation:', err);
        toast.error(l('परामर्श हटाने में विफल', 'Failed to delete consultation', 'Paramarsh hatane mein vifal'));
      }
    } else if (deleteModalConfig.type === 'all') {
      try {
        await clearSessionHistory(user?.id);
        setConsultations([]);
        toast.success(l('संपूर्ण परामर्श इतिहास साफ कर दिया गया 🗑️', 'All consultation history cleared 🗑️', 'Sampoorn paramarsh itihas saaf kar diya gaya 🗑️'));
      } catch (err) {
        console.warn('Failed to clear consultations:', err);
        toast.error(l('इतिहास साफ करने में विफल', 'Failed to clear history', 'Itihas saaf karne mein vifal'));
      }
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
      toast.success(l('पर्चा (PDF) डाउनलोड हो गया! 📄', 'Prescription (PDF) downloaded! 📄', 'Parcha (PDF) download ho gaya! 📄'));
    } catch (err) {
      console.warn('Backend PDF download error, attempting browser printable parcha fallback:', err);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${isEnglish ? 'Sanjeevani Prescription' : 'Sanjeevani Parcha'} - ${item.conversationId}</title>
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
              <div class="title">🌿 ${isEnglish ? 'Sanjeevani Health Summary & Prescription' : isHindi ? 'संजीवनी स्वास्थ्य परामर्श पर्चा' : 'Sanjeevani Swasthya Parcha'}</div>
              <div class="meta">Uttarakhand Telehealth & Rural Clinical Advisory • Gopeshwar & Chamoli</div>
            </div>
            <p><strong>${isEnglish ? 'Session ID:' : isHindi ? 'सत्र पहचान:' : 'Session ID:'}</strong> ${item.conversationId}</p>
            <p><strong>${isEnglish ? 'Date:' : isHindi ? 'दिनांक:' : 'Tarikh:'}</strong> ${item.updatedAt ? formatDate(item.updatedAt) : (isEnglish ? 'Active Session' : 'सक्रिय परामर्श')}</p>
            <p><strong>${isEnglish ? 'Triage Tier:' : isHindi ? 'ट्राइएज स्तर:' : 'Triage Tier:'}</strong> <span class="tier">${item.tier || 'Green'}</span></p>
            <div class="summary">
              <strong>${isEnglish ? 'Consultation Summary:' : isHindi ? 'परामर्श सारांश:' : 'Paramarsh Summary:'}</strong><br/>
              ${item.summary || (isEnglish ? 'General wellness consultation and advice with Dr. Sanjeevani AI.' : isHindi ? 'डॉ. संजीवनी AI के साथ सामान्य परामर्श एवं स्वास्थ्य सलाह।' : 'Dr. Sanjeevani AI ke sath paramarsh aur swasthya salah.')}
            </div>
            <div class="footer">
              ${isEnglish ? '⚠️ This prescription was generated by Dr. Sanjeevani AI. In medical emergencies, dial 108 immediately.' : isHindi ? '⚠️ यह पर्चा Dr. Sanjeevani AI द्वारा उत्पन्न किया गया है। आपातकाल में तुरंत 108 डायल करें।' : '⚠️ Yeh parcha Dr. Sanjeevani AI dwara taiyar kiya gaya hai. Aapaatkaal me turant 108 dial karein.'}
            </div>
            <script>window.onload = function() { window.print(); };</script>
          </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        toast.error(l('PDF डाउनलोड नहीं हो सका। कृपया पुनः प्रयास करें।', 'Could not download PDF. Please try again.', 'PDF download nahi ho saka. Kripya dobara koshish karein.'));
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleShareParcha = (item, e) => {
    e?.stopPropagation();
    e?.preventDefault();
    const parchaDate = item.updatedAt ? formatDate(item.updatedAt) : '';
    const shareText = isEnglish
      ? `*🌿 Sanjeevani Health Summary*\n*Date:* ${parchaDate}\n*Triage:* ${item.tier || 'Green'}\n*Advice:* ${item.summary || 'Health Consultation'}\n\nIn emergency, call 108 immediately.`
      : isHindi
      ? `*🌿 संजीवनी स्वास्थ्य पर्चा*\n*तारीख:* ${parchaDate}\n*ट्राइएज:* ${item.tier || 'Green'}\n*सलाह:* ${item.summary || 'स्वास्थ्य परामर्श'}\n\nआपातकाल में तुरंत 108 पर कॉल करें।`
      : `*🌿 Sanjeevani Swasthya Parcha*\n*Tarikh:* ${parchaDate}\n*Triage:* ${item.tier || 'Green'}\n*Salah:* ${item.summary || 'Swasthya Paramarsh'}\n\nAapaatkaal mein 108 par call karein.`;
    if (navigator.share) {
      navigator.share({
        title: isEnglish ? 'Sanjeevani Consultation Summary' : 'Sanjeevani Consultation Parcha',
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
    toast.success(l('खुराक ट्रैकर अपडेट हुआ! 🌿', 'Dose tracker updated! 🌿', 'Dose tracker update ho gaya! 🌿'));
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
    toast.success(l('नया नुस्खा दिनचर्या में जुड़ गया 🌿', 'New remedy added to schedule 🌿', 'Naya nuskha schedule mein jud gaya 🌿'));
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
      toast(l('आवाज़ी वाचन बंद किया गया 🔇', 'Audio Narration Off 🔇', 'Audio narration band kiya gaya 🔇'), { icon: '🔇' });
    } else {
      setTabNarrationEnabled(true);
      localStorage.setItem('sanjeevani_tab_narration', 'true');
      toast.success(l('आवाज़ी वाचन चालू किया गया 🔊', 'Audio Narration On 🔊', 'Audio narration chalu kiya gaya 🔊'));
      speakCue(
        l('आवाज़ी मार्गदर्शन चालू है। टैब बदलने पर आवाज़ सुनाई देगी।', 'Audio guidance enabled. You will hear cues when switching tabs.', 'Audio margdarshan chalu hai. Tab badalne par aawaz sunai degi.'),
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
    speakCue(text, isHindi ? 'hi-IN' : 'en-IN', {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
  };

  const firstAidGuides = [
    {
      title: l('उंचाई पर चक्कर या ठंड लगना (हाइपोथर्मिया)', 'High-Altitude Sickness & Hypothermia', 'Uunchai par chakkar ya thand lagna'),
      content: l(
        'चढ़ाई तुरंत रोकें। रोगी को ऊनी कंबल से गर्म और सूखा रखें। अदरक या गुड़ का गुनगुना पेय दें। यदि सांस लेने में कठिनाई हो या होंठ नीले पड़ने लगें (SpO2 < 90%), तो तुरंत 108 पर कॉल करें।',
        'Immediately halt ascent. Keep the patient warm and dry with woolen blankets. Sip warm liquids with ginger or jaggery. If breathing is labored or lips turn pale/blue (SpO2 < 90%), dial 108 for descent support immediately.',
        'Chadhai turant rokein. Mareez ko garam kambal odhayein. Adrak ya gud ka gunguna paani dein. Agar saans lene me takleef ho, toh turant 108 par call karein.'
      ),
      audio: 'Uunchai par chhatpatana ya thand lagne par chadhai turant rokein, garam kambal odhein aur 108 ko call karein.',
    },
    {
      title: l('दस्त और उल्टी में ओआरएस (ORS)', 'ORS Rehydration for Diarrhea & Vomiting', 'Dast aur ulti me ORS ghol'),
      content: l(
        '1 लीटर साफ या उबले पानी में 6 चम्मच चीनी और 1/2 चम्मच नमक मिलाएं। दिनभर छोटे-छोटे घूंट पिलाते रहें। शिशुओं को मां का दूध जारी रखें।',
        'Mix 1 liter of clean/boiled water with 6 level teaspoons of sugar and 1/2 level teaspoon of salt. Give small frequent sips throughout the day. Continue breast milk for infants.',
        '1 liter saaf uble paani me 6 chammach cheeni aur 1/2 chammach namak milayein. Din bhar thoda thoda pilate rahein.'
      ),
      audio: 'Dast ya ulti hone par ek liter uble paani me chhah chammach cheeni aur aadha chammach namak milakar piyen.',
    },
    {
      title: l('पहाड़ी रास्तों पर चोट और रक्तस्राव', 'Bleeding & Cuts on Mountain Terrain', 'Chot lagna aur khoon behna'),
      content: l(
        'साफ कपड़े से 5 मिनट तक बिना हटाए सीधा दबाव बनाएं। अंग को दिल के स्तर से ऊपर उठाएं। खून रुकने पर उबले पानी से धीरे-धीरे धोएं।',
        'Apply firm direct pressure with clean cloth for 5 full minutes without lifting. Elevate limb above heart level. Wash gently with boiled water once bleeding slows.',
        'Saaf kapde se 5 minute tak seedha dabaav banayein. Khoon rukne par gungune paani se saaf karein.'
      ),
      audio: 'Chot lagne par saaf kapde se paanch minute tak dabaav banaye rakhein.',
    },
  ];

  const completedRemediesCount = remedies.filter(r => r.completed).length;

  const tabs = [
    { id: 'hub', label: l('मुख्य सेवा', 'Main Services', 'Mukhya Seva'), sub: l('डैशबोर्ड', 'Dashboard', 'Dashboard'), icon: Home },
    { id: 'remedies', label: l('दवा व काढ़ा', 'Remedies', 'Dawa Aur Kadha'), sub: l('दिनचर्या', 'Routine', 'Dincharya'), icon: Leaf, badge: `${toEnglishDigits(completedRemediesCount)}/${toEnglishDigits(remedies.length)}` },
    { id: 'history', label: l('पुराना पर्चा', 'Records', 'Purana Parcha'), sub: l('परामर्श इतिहास', 'History', 'Paramarsh Itihas'), icon: FileText, badge: `${toEnglishDigits(consultations.length)}` },
    { id: 'facilities', label: l('अस्पताल', 'Hospitals', 'Aspataal'), sub: l('निकटतम केंद्र', 'Nearby Care', 'Paas Ke Kendra'), icon: Hospital },
    { id: 'firstaid', label: l('प्राथमिक उपचार', 'First-Aid', 'Prathmik Upchar'), sub: l('आपातकालीन गाइड', 'Emergency Guide', 'Aapaatkaal Guide'), icon: Bandage },
  ];

  return (
    <div className="min-h-screen bg-mist text-primary transition-colors duration-300 relative overflow-hidden pb-20 safe-bottom-nav">
      
      {/* Live Voice Room Modal */}
      {showLiveRoom && <LiveVoiceRoom onClose={() => setShowLiveRoom(false)} />}

      {/* Mountain Contour Background */}
      <div className="absolute top-6 left-0 right-0 pointer-events-none opacity-20 dark:opacity-10 z-0">
        <MountainRidge tone="pine" className="w-full h-44 object-cover" />
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-6 relative z-10">

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
                        isActive ? 'bg-white text-sage' : 'bg-sage/20 text-sage'
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold tracking-tight text-center leading-none mt-0.5">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── TAB 1: MAIN HUB (BENTO GRID ARRANGEMENT) ───── */}
        {activeTab === 'hub' && (
          <div className="space-y-6 animate-fadeIn">

            {/* Family Profile Switcher */}
            <FamilyProfileSelector onProfileChange={setActiveFamilyMember} />

            {/* Page Voice Guide Banner */}
            <PageVoiceGuide pageKey="mitra" />

            {/* ── ROW 1: COMPACT WELCOME & INLINE HEALTH PROFILE BANNER ── */}
            <div className="bg-card rounded-3xl p-5 sm:p-6 border border-border-subtle shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-sage/15 dark:bg-sage/25 text-sage dark:text-booti-glow flex items-center justify-center shrink-0 border border-sage/20">
                  <SanjeevaniOrb state="idle" size={38} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sage dark:text-booti-glow flex items-center gap-1">
                      <Leaf className="w-3.5 h-3.5 text-gold-warm" />
                      {l('संजीवनी मित्र • नागरिक स्वास्थ्य', 'Sanjeevani Mitra • Rural Health')}
                    </span>
                  </div>
                  <h1 className="font-serif text-xl sm:text-2xl font-bold text-primary mt-0.5">
                    {l('नमस्ते', 'Namaste')}, {activeFamilyMember?.name ? activeFamilyMember.name : (user?.name || l('आदरणीय मित्र', 'Friend'))} 🙏
                  </h1>
                  <p className="text-xs text-muted mt-0.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gold-warm shrink-0" />
                    <span>{user?.village || l('चमोली, उत्तराखंड', 'Chamoli, Uttarakhand')} • {l('डिजिटल स्वास्थ्य केंद्र', 'Digital Health Center')}</span>
                  </p>
                </div>
              </div>

              {/* Inline Health Profile (Comorbidity Safeguards) */}
              <div className="flex flex-col sm:items-end gap-2 border-t lg:border-t-0 pt-3 lg:pt-0 border-border-subtle">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sage dark:text-booti-glow">
                  <ShieldCheck className="w-4 h-4 text-sage" />
                  <span>{l('स्वास्थ्य सुरक्षा प्रोफ़ाइल (Comorbidities)', 'My Health Profile (Comorbidities)')}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'BP / Hypertension', label: 'BP / Hypertension' },
                    { id: 'Gastric Ulcer', label: l('पेट में छाला (Ulcer)', 'Gastric Ulcer') },
                    { id: 'Pregnancy', label: l('गर्भावस्था', 'Pregnancy') },
                    { id: 'Diabetes', label: l('मधुमेह (Diabetes)', 'Diabetes') },
                  ].map((cond) => {
                    const isChecked = knownConditions.includes(cond.id);
                    return (
                      <button
                        key={cond.id}
                        type="button"
                        onClick={() => toggleCondition(cond.id)}
                        className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                          isChecked
                            ? 'bg-sage text-white border-sage shadow-xs'
                            : 'bg-surface hover:bg-sage/10 text-muted border-border-subtle'
                        }`}
                      >
                        <span>{cond.label}</span>
                        <CheckCircle2 className={`w-3.5 h-3.5 ${isChecked ? 'opacity-100 text-white' : 'opacity-30'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── ROW 2: PRIMARY ACTION TRIO ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Talk Live (Voice Room) */}
              <div className="bg-card rounded-3xl p-5 border-2 border-sage/40 shadow-sm relative overflow-hidden flex flex-col justify-between group hover:border-sage transition-all">
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-sage text-white px-2.5 py-0.5 rounded-full shadow-xs">
                    {l('अनुशंसित • Recommended', 'Recommended')}
                  </span>
                </div>
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-sage/15 text-sage flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <Mic className="w-6 h-6 animate-pulse" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sage">
                    {l('आवाज़ से बातचीत', 'Voice-First AI')}
                  </span>
                  <h3 className="font-serif font-bold text-lg text-primary mt-0.5">
                    {l('बोलकर सलाह लें (Live Room)', 'Talk Live (Voice Room)')}
                  </h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    {l('हिंदी व गढ़वाली में बोलकर लक्षण बताएं और लाइव डॉक्टर परामर्श पाएं।', 'Speak naturally in Hindi or Garhwali for instant voice triage with Dr. Sanjeevani.')}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={() => setShowLiveRoom(true)}
                    className="w-full min-h-[44px] rounded-xl bg-sage hover:bg-sage/90 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <Mic className="w-4 h-4" />
                    <span>{l('🎙️ लाइव बातचीत शुरू करें', '🎙️ Talk Live Now')}</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Symptom Triage Chat */}
              <div className="bg-card rounded-3xl p-5 border border-border-subtle shadow-sm flex flex-col justify-between group hover:border-sage/60 transition-all">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-sage/10 text-sage flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sage">
                    {l('क्लीनिकल चैट', 'MTS Assessment')}
                  </span>
                  <h3 className="font-serif font-bold text-lg text-primary mt-0.5">
                    {l('लक्षण जांच चैट (Triage Chat)', 'Symptom Triage Chat')}
                  </h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    {l('मैनचेस्टर ट्राइएज और 16+ आयुष फॉर्मूलरी से सत्यापित उपचार पर्चा बनाएं।', 'Negation-aware clinical assessment with contraindication checks and CCRAS remedies.')}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border-subtle">
                  <Link
                    to="/patient/chat"
                    className="w-full min-h-[44px] rounded-xl bg-surface hover:bg-sage/15 text-primary hover:text-sage border border-border-subtle text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>{l('परामर्श शुरू / जारी रखें', 'Start or Resume Consultation')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Card 3: Ocular Biomarker Scan */}
              <div className="bg-card rounded-3xl p-5 border border-border-subtle shadow-sm flex flex-col justify-between group hover:border-gold-warm/60 transition-all">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-gold-warm/15 text-gold-warm flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <Eye className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gold-warm">
                    {l('एज कंप्यूटर विज़न', 'Edge Computer Vision')}
                  </span>
                  <h3 className="font-serif font-bold text-lg text-primary mt-0.5">
                    {l('नेत्र बायोमार्कर स्कैन (Eye Scan)', 'Ocular Biomarker Scan')}
                  </h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    {l('पलक व आंख की सफेदी से एनीमिया व पीलिया की गैर-आक्रामक मोबाइल जांच।', 'Anemia & Jaundice Camera Check using CIELAB and HSV colorimetry in natural daylight.')}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border-subtle">
                  <Link
                    to="/patient/screen"
                    className="w-full min-h-[44px] rounded-xl bg-surface hover:bg-gold-warm/15 text-primary hover:text-gold-warm border border-border-subtle text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>{l('नेत्र जांच शुरू करें', 'Run Biomarker Scan')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>

            {/* ── ROW 3: 2-COLUMN ACTIVITY & INSIGHTS SPLIT ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left (lg:col-span-7) — Recent Consultations Card */}
              <div className="lg:col-span-7 bg-card rounded-3xl p-5 sm:p-6 border border-border-subtle shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-border-subtle mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-sage/15 text-sage flex items-center justify-center">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-serif font-bold text-base text-primary">
                          {l('हाल के परामर्श (Recent Consultations)', 'Recent Consultations')}
                        </h3>
                        <p className="text-[11px] text-muted">
                          {recentConsultations.length} {l('परामर्श रिकॉर्ड सहेजे गए', 'sessions saved')}
                        </p>
                      </div>
                    </div>
                    <Link
                      to="/patient/chat"
                      className="text-xs font-bold text-sage hover:underline flex items-center gap-1"
                    >
                      <span>{l('नया चैट', 'New Chat')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="space-y-2.5">
                    {recentConsultations.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted border border-dashed border-border-subtle rounded-2xl">
                        {l('कोई पूर्व परामर्श नहीं मिला। नया चैट शुरू करें।', 'No prior consultations found. Start a new session.')}
                      </div>
                    ) : (
                      recentConsultations.slice(0, 3).map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="p-3.5 rounded-2xl bg-surface/70 border border-border-subtle flex items-center justify-between gap-3 text-xs hover:border-sage/40 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.tier === 'Red'
                                    ? 'bg-red-500/15 text-red-600'
                                    : item.tier === 'Yellow'
                                    ? 'bg-gold-warm/20 text-yellow-700'
                                    : 'bg-sage/15 text-sage'
                                }`}
                              >
                                {item.tier || 'Green'} Tier
                              </span>
                              <span className="text-[11px] text-muted">{item.date}</span>
                            </div>
                            <p className="font-semibold text-primary truncate">{item.symptom || 'General Consultation'}</p>
                            <p className="text-[11px] text-muted truncate mt-0.5">{item.status}</p>
                          </div>
                          <Link
                            to="/patient/chat"
                            className="min-h-[38px] px-3 rounded-xl bg-sage/10 text-sage hover:bg-sage/20 font-bold flex items-center gap-1 text-xs shrink-0 transition-colors"
                          >
                            <span>{l('खोलें', 'Open')}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right (lg:col-span-5) — Recent Ocular Screenings & Hill Wellness Card */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                {/* Screenings Card */}
                <div className="bg-card rounded-3xl p-5 border border-border-subtle shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-border-subtle mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-gold-warm/15 text-gold-warm flex items-center justify-center">
                        <Eye className="w-4 h-4" />
                      </div>
                      <h3 className="font-serif font-bold text-sm sm:text-base text-primary">
                        {l('बायोमार्कर स्कैन (Ocular Scans)', 'Recent Vision Screenings')}
                      </h3>
                    </div>
                    <Link
                      to="/patient/screen"
                      className="text-xs font-bold text-gold-warm hover:underline flex items-center gap-1"
                    >
                      <span>{l('नई जांच', 'New Scan')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="space-y-2">
                    {recentScreenings.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted border border-dashed border-border-subtle rounded-xl">
                        {l('कोई पूर्व बायोमार्कर स्कैन दर्ज नहीं है।', 'No prior scans recorded yet.')}
                      </div>
                    ) : (
                      recentScreenings.slice(0, 2).map((scan, sIdx) => (
                        <div
                          key={scan.id || sIdx}
                          className="p-3 rounded-xl bg-surface/70 border border-border-subtle flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sage/15 text-sage">
                                {scan.risk || 'NORMAL'}
                              </span>
                              <span className="text-[10px] text-muted">{scan.date}</span>
                            </div>
                            <p className="font-semibold text-primary truncate mt-0.5">{scan.type}</p>
                            <p className="text-[10px] text-muted">
                              Index: {typeof scan.calculated_index === 'number' ? scan.calculated_index.toFixed(3) : scan.calculated_index}
                            </p>
                          </div>
                          <Link
                            to="/patient/screen"
                            className="p-2 rounded-xl bg-gold-warm/15 text-gold-warm hover:bg-gold-warm/25 transition-colors shrink-0"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Compact Hill Wellness Advisory Card */}
                <div className="bg-gradient-to-br from-gold-warm/15 via-card to-sage/10 rounded-3xl p-5 border border-gold-warm/30 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Wind className="w-4 h-4 text-gold-warm" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gold-warm">
                      {l('उत्तराखंड पहाड़ी स्वास्थ्य परामर्श', 'Uttarakhand Hill Wellness')}
                    </span>
                  </div>
                  <h4 className="font-serif font-bold text-sm text-primary">
                    {l('शीत ऋतु व उच्च पर्वतीय स्वास्थ्य देखरेख', 'Seasonal High-Altitude Wellness')}
                  </h4>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    {advisory || l('चमोली व गोपेश्वर क्षेत्र में सुबह गर्म पानी, अदरक-तुलसी काढ़ा लें। सांस फूलने या होंठ नीले पड़ने पर तुरंत 108 या निकटतम पीएचसी पर संपर्क करें।', 'In Chamoli & Gopeshwar, hydrate with warm herbal tea and keep warm. In severe shortness of breath or hypothermia, call 108.')}
                  </p>
                </div>
              </div>
            </div>

            {/* Arogyashala & PMBJP Generic Medicines Quick Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                to="/mitra/wellness"
                className="p-4 rounded-3xl bg-surface/70 border border-sage/20 hover:border-sage transition-all flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-sage/15 text-sage flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-sm text-primary group-hover:text-sage transition-colors">
                      {l('आरोग्यशाला स्टूडियो', 'Arogyashala Wellness Studio')}
                    </h4>
                    <p className="text-[11px] text-muted">
                      {l('योग, प्राणायाम और ध्यान साधना', 'Yoga, Pranayama & Himalayan sound')}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted group-hover:text-sage group-hover:translate-x-1 transition-all" />
              </Link>

              <button
                type="button"
                onClick={() => setActiveTab('facilities')}
                className="p-4 rounded-3xl bg-surface/70 border border-emerald-600/20 hover:border-emerald-600 transition-all flex items-center justify-between gap-3 group text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-700/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-sm text-primary group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                      {l('जन औषधि केंद्र (PMBJP)', 'Jan Aushadhi Generic Savings')}
                    </h4>
                    <p className="text-[11px] text-muted">
                      {l('50%-90% सस्ती दवाएं व केंद्र खोजें', 'Save 50%-90% on generic medicines')}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted group-hover:text-emerald-700 dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
              </button>
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
                  className="min-h-[44px] flex-1 sm:flex-initial justify-center bg-rose-soft hover:bg-rose-soft/90 text-white text-xs sm:text-sm font-bold px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl transition-all shadow-xs flex items-center gap-2"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>{l('108 एम्बुलेंस', '108 Ambulance')}</span>
                </a>
                <a
                  href="tel:104"
                  className="min-h-[44px] bg-warm-indigo hover:bg-warm-indigo text-white text-xs sm:text-sm font-bold px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl transition-all shadow-xs flex items-center justify-center"
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
                              to={`/mitra/chat?conv=${encodeURIComponent(item.conversationId)}`}
                              onClick={() => setStoredConversationId(item.conversationId)}
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

        {/* ── TAB 4: NEARBY FACILITIES & JAN AUSHADHI (अस्पताल व जन औषधि केंद्र) ────────────── */}
        {activeTab === 'facilities' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Hospital & Health Center Locator */}
            <NearbyFacilityFinder onClose={() => setActiveTab('hub')} />

            {/* PMBJP Jan Aushadhi Generic Medicine Cost Estimator & Kendra Directory */}
            <JanAushadhiCard />
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

      {/* In-app Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalConfig.isOpen}
        onClose={() => setDeleteModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmDeleteConsultation}
        title={deleteModalConfig.title}
        message={deleteModalConfig.message}
        confirmText={l('हटाएं', 'Delete')}
        cancelText={l('रद्द करें', 'Cancel')}
        isDestructive={true}
      />
    </div>
  );
}
