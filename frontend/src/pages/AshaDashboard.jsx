import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import FollowUpPanel from '../components/FollowUpPanel';
import SkeletonLoader from '../components/SkeletonLoader';
import {
  Users, WifiOff, RefreshCw, Plus, CheckCircle, Clock, MapPin,
  UserPlus, Leaf, PhoneCall, AlertTriangle, Search, Filter,
  Activity, Thermometer, Heart, ShieldAlert, Copy, Check, ChevronDown, CheckCircle2,
  User, Bell
} from 'lucide-react';
import toast from 'react-hot-toast';
import { checkBackendHealth, syncAshaBatch } from '../api/client';
import PageVoiceGuide from '../components/PageVoiceGuide';
import BackButton from '../components/BackButton';

const QUEUE_STORAGE_KEY = 'sanjeevani_asha_queue_v2';
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL)) || 'http://localhost:8000';

const DEFAULT_PATIENTS = [
  { id: 'REC-101', name: 'Sunita Devi', village: 'Mandal, Chamoli', tier: 'Green', symptom: 'Dry Cough (Hill Cold)', vitals: { spo2: '97', temp: '98.6', pulse: '74' }, synced: true, followedUp: true },
  { id: 'REC-102', name: 'Birendra Rawat', village: 'Gopeshwar Ward 3', tier: 'Yellow', symptom: 'Fever 4 days with mild dehydration', vitals: { spo2: '94', temp: '101.4', pulse: '88' }, synced: true, followedUp: false },
  { id: 'REC-103', name: 'Manorama Negi', village: 'Joshimath Outskirts', tier: 'Red', symptom: 'Acute chest tightness & hypoxia (108 SOS Sent)', vitals: { spo2: '88', temp: '99.0', pulse: '110' }, synced: true, followedUp: false },
  { id: 'REC-104', name: 'Deepak Joshi', village: 'Pipalkoti', tier: 'Yellow', symptom: 'Severe abdominal pain & persistent vomiting', vitals: { spo2: '96', temp: '100.2', pulse: '92' }, synced: true, followedUp: false },
];

export default function AshaDashboard() {
  const { user } = useAuth();
  const { l, isHindi, toEnglishDigits } = useLanguage();

  const [offlineQueue, setOfflineQueue] = useState(() => {
    try {
      const saved = localStorage.getItem(QUEUE_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [alerts, setAlerts] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSosCard, setShowSosCard] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [copiedSos, setCopiedSos] = useState(false);

  // New encounter form state
  const [newPatient, setNewPatient] = useState({
    name: '',
    village: '',
    symptom: '',
    tier: 'Green',
    spo2: '',
    temp: '',
    pulse: '',
  });

  useEffect(() => {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(offlineQueue));
    } catch (e) {
      console.warn('Failed to save ASHA offline queue', e);
    }
  }, [offlineQueue]);

  const handleSyncAllRef = useRef(null);

  // Auto-replay queued encounters when connection is restored
  useEffect(() => {
    const handleOnlineAutoSync = () => {
      const pending = offlineQueue.filter((p) => !p.synced);
      if (pending.length > 0) {
        toast('Network wapas aa gaya. Records sync ho rahe hain...', { icon: '🌐' });
        handleSyncAllRef.current?.();
      }
    };
    window.addEventListener('online', handleOnlineAutoSync);
    return () => window.removeEventListener('online', handleOnlineAutoSync);
  }, [offlineQueue]);

  const fetchAlerts = useCallback(async () => {
    try {
      const token = localStorage.getItem('sanjeevani_token') || localStorage.getItem('sanjeevani_access_token');
      if (!token) return;
      const res = await axios.get(`${API_BASE}/asha/alerts`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      setAlerts(res.data || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleAcknowledgeAlert = async (alertId) => {
    const prev = [...alerts];
    setAlerts(cur => cur.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
    try {
      const token = localStorage.getItem('sanjeevani_token') || localStorage.getItem('sanjeevani_access_token');
      await axios.post(`${API_BASE}/asha/alerts/${alertId}/acknowledge`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Emergency alert marked as handled. 108 dispatch noted. 🚑');
    } catch (err) {
      setAlerts(prev);
      toast.error('Could not acknowledge alert. State restored.');
    }
  };

  const handleLoadSamplePatients = () => {
    setOfflineQueue(DEFAULT_PATIENTS);
    toast.success('Sample patient records loaded for demonstration.');
  };

  const handleSyncAll = async () => {
    if (!navigator.onLine) {
      toast.error('Internet ya server uplabdh nahi hai. Record surakshit hain, network aane par sync karein');
      return;
    }

    setIsSyncing(true);
    try {
      const isOnline = await checkBackendHealth();
      if (!isOnline) {
        toast.error('Internet ya server uplabdh nahi hai. Record surakshit hain, network aane par sync karein');
        return;
      }

      const pending = offlineQueue.filter((p) => !p.synced);
      if (pending.length === 0) {
        toast.success('Koi pending record nahi hai.');
        return;
      }

      const res = await syncAshaBatch(pending);
      const syncedIds = new Set(res.ids || []);
      setOfflineQueue((prev) =>
        prev.map((p) => (syncedIds.has(p.id) ? { ...p, synced: true } : p))
      );
      toast.success(`${res.synced_count || pending.length} records PHC server par safalta-poorvak sync ho gaye! ✨`);
    } catch (err) {
      console.error('[ASHA Sync Error]:', err);
      toast.error('Sync asafal raha. Kripya dobara prayas karein.');
    } finally {
      setIsSyncing(false);
    }
  };
  handleSyncAllRef.current = handleSyncAll;

  const handleMarkFollowedUp = (patientId) => {
    setOfflineQueue((prev) =>
      prev.map((p) => (p.id === patientId ? { ...p, followedUp: true } : p))
    );
    toast.success('Patient check-in recorded as complete! ✨');
  };

  const updateVitalsAndAutoTier = (field, value) => {
    const updated = { ...newPatient, [field]: value };
    const spo2Num = parseFloat(updated.spo2);
    const tempNum = parseFloat(updated.temp);

    let suggestedTier = 'Green';
    if ((spo2Num && spo2Num < 90) || (tempNum && tempNum >= 103)) {
      suggestedTier = 'Red';
    } else if ((spo2Num && spo2Num < 95) || (tempNum && tempNum >= 100)) {
      suggestedTier = 'Yellow';
    }
    updated.tier = suggestedTier;
    setNewPatient(updated);
  };

  const handleAddPatient = (e) => {
    e.preventDefault();
    if (!newPatient.name || !newPatient.symptom) return;
    const newRecord = {
      id: `REC-${100 + offlineQueue.length + 1}`,
      name: newPatient.name.trim(),
      village: newPatient.village.trim() || user?.village || 'Local Ward',
      tier: newPatient.tier || 'Green',
      symptom: newPatient.symptom.trim(),
      vitals: {
        spo2: newPatient.spo2 || '--',
        temp: newPatient.temp || '--',
        pulse: newPatient.pulse || '--',
      },
      synced: false,
      followedUp: false,
    };

    setOfflineQueue((prev) => [newRecord, ...prev]);
    toast.success(`${newPatient.name} ka record darz hua (Tier ${newRecord.tier})`);
    setNewPatient({ name: '', village: '', symptom: '', tier: 'Green', spo2: '', temp: '', pulse: '' });
    setShowAddForm(false);
  };

  const pendingCount = offlineQueue.filter((p) => !p.synced).length;

  const filteredPatients = useMemo(() => {
    return offlineQueue.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.village.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.symptom.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTier =
        tierFilter === 'all' ||
        (tierFilter === 'needsFollowUp' ? (p.tier === 'Red' || p.tier === 'Yellow') && !p.followedUp : p.tier === tierFilter);

      return matchesSearch && matchesTier;
    });
  }, [offlineQueue, searchQuery, tierFilter]);

  const handleCopySosDetails = () => {
    const urgentList = offlineQueue.filter(p => p.tier === 'Red' && !p.followedUp);
    const text = `🚨 EMERGENCY DISPATCH (ASHA Field Uplink)\nWorker: ${user?.name || 'ASHA Field'}\nLocation: ${user?.village || 'Chamoli District'}\nUrgent Cases: ${urgentList.length > 0 ? urgentList.map(p => `${p.name} (${p.village}) - ${p.symptom}`).join('; ') : 'Routine SOS standby'}`;
    navigator.clipboard.writeText(text);
    setCopiedSos(true);
    setTimeout(() => setCopiedSos(false), 2000);
    toast.success('Emergency dispatch notes copied to clipboard');
  };

  return (
    <div className="min-h-screen bg-mist dark:bg-card text-primary transition-colors duration-300 pb-20 safe-bottom-nav">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* ── Universal Back Button for Mobile & Desktop ─────────────────── */}
        <div className="flex items-center justify-between pb-1">
          <BackButton fallback="/mitra" label={l('वापस जाएं', 'Back')} />
          <span className="text-xs text-muted font-medium hidden sm:inline">{l('आशा कार्यकर्ता फील्ड डेस्क', 'ASHA Field Desk')}</span>
        </div>

        {/* ── Mode B Header Banner ────────────────────────────────────────── */}
        <div className="bg-warm-indigo dark:bg-warm-indigo text-white p-6 sm:p-8 rounded-3xl shadow-md border border-gray-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-gold-warm text-primary text-[10px] font-extrabold px-3.5 py-1 rounded-full uppercase tracking-wider mb-2.5 shadow-xs">
                <Users className="w-3.5 h-3.5" /> {l('आशा सहायिका फील्ड पोर्टल', 'ASHA Field Portal')}
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold leading-tight">
                {l('नमस्ते', 'Welcome')}, {user?.name || (isHindi ? 'आशा कार्यकर्ता' : 'ASHA Worker')} 🌿
              </h1>
              <p className="text-xs text-white/80 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gold-warm" />
                <span>{user?.village || (isHindi ? 'चमोली जिला' : 'Chamoli District')} • {l('शून्य-कनेक्टिविटी ऑफ़लाइन ट्राइएज सक्रिय', 'Zero-Connectivity Offline Triage Enabled')}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <button
                onClick={() => setShowSosCard(!showSosCard)}
                className={`touch-target flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs shadow-sm transition-all cursor-pointer ${
                  showSosCard ? 'bg-white text-rose-soft' : 'bg-rose-soft hover:bg-rose-soft/90 text-white'
                }`}
              >
                <PhoneCall className="w-4 h-4" />
                <span>{l('108 आपातकालीन सहायता', '108 SOS Dispatch')}</span>
              </button>
              
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className={`touch-target flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs shadow-sm transition-all cursor-pointer ${
                  showAddForm ? 'bg-white text-primary' : 'bg-gold-warm hover:bg-gold-warm/90 text-primary'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>{l('नया मरीज जोड़ें', 'Add New Patient')}</span>
              </button>
              
              <button
                onClick={handleSyncAll}
                disabled={isSyncing || pendingCount === 0}
                className="touch-target flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-2xl font-bold text-xs transition-all disabled:opacity-40 border border-white/10 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? l('सिंक हो रहा है...', 'Syncing...') : l(`सिंक (${toEnglishDigits(pendingCount)})`, `Sync (${toEnglishDigits(pendingCount)})`)}</span>
              </button>

              <Link
                to="/profile"
                className="touch-target flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-2xl font-bold text-xs transition-all border border-white/10"
                title={l('आशा प्रोफ़ाइल व फील्ड गतिविधियां', 'ASHA Profile & Field Activities')}
              >
                <User className="w-4 h-4 text-gold-warm" />
                <span>{l('फील्ड प्रोफ़ाइल व रिकॉर्ड', 'Field Profile & Logs')}</span>
              </Link>
            </div>
          </div>

          {/* Sync Status Pill */}
          <div className="mt-5 flex items-center gap-3 pt-3 border-t border-white/15">
            <div className={`flex items-center gap-2 text-xs font-semibold ${pendingCount > 0 ? 'text-gold-warm' : 'text-booti-glow'}`}>
              {pendingCount > 0 ? <WifiOff className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>
                {pendingCount > 0
                  ? l(`${toEnglishDigits(pendingCount)} रिकॉर्ड्स ऑफ़लाइन सुरक्षित हैं (सिंक प्रतीक्षित)`, `${toEnglishDigits(pendingCount)} encounters queued for PHC sync`)
                  : l('सभी रिकॉर्ड्स PHC सर्वर पर सिंक हो चुके हैं', 'All records synchronized with PHC server')}
              </span>
            </div>
          </div>
        </div>

        {/* ── Page Voice Guide Banner ────────────────────────────────────────── */}
        <PageVoiceGuide pageKey="asha" />

        {/* ── Real-Time Red-Tier Emergency Alerts (Live Field Dispatch) ── */}
        {alerts.filter(a => !a.acknowledged).length > 0 && (
          <div className="bg-rose-500/10 border-2 border-rose-500/50 rounded-3xl p-5 sm:p-6 shadow-sm animate-pulse-gentle">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-bold text-sm shadow-md animate-bounce">
                  🚨
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-bold text-base text-rose-600 dark:text-rose-400">
                      {l('आपातकालीन अलर्ट', 'Emergency Alert')} • {l('सक्रिय लाल श्रेणी आपातकाल', 'Active Red-Tier Emergency')} ({toEnglishDigits(alerts.filter(a => !a.acknowledged).length)})
                    </h3>
                    <span className="text-[10px] bg-rose-500 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                      {l('कार्रवाई आवश्यक', 'Action Required')}
                    </span>
                  </div>
                  <p className="text-xs text-rose-700/80 dark:text-rose-300/80 mt-0.5">
                    {l('आपके क्षेत्र में गंभीर हाइपोक्सिया या लक्षण मिले हैं। 108 एम्बुलेंस से समन्वय करें।', 'Critical hypoxia or severe symptoms reported in your sector. Coordinate 108 ambulance dispatch.')}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {alerts.filter(a => !a.acknowledged).slice(0, 4).map((alert) => (
                <div key={alert.id} className="bg-white dark:bg-warm-indigo p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-primary">{alert.patient_name || (isHindi ? 'नागरिक मरीज़' : 'Citizen Patient')}</span>
                      <span className="text-xs text-muted dark:text-muted">• {alert.village || user?.village || (isHindi ? 'स्थानीय क्षेत्र' : 'Local Sector')}</span>
                      {alert.phone && <span className="text-xs font-mono text-muted dark:text-muted">• 📞 {toEnglishDigits(alert.phone)}</span>}
                    </div>
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                      {l('लक्षण:', 'Symptoms:')} {alert.symptoms}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAcknowledgeAlert(alert.id)}
                    className="touch-target bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-xs self-start sm:self-auto cursor-pointer"
                  >
                    {l('108 भेजा / संभाल लिया ✓', '108 Dispatched / Handled ✓')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Emergency SOS Dispatcher Card (Collapsible) ──────────── */}
        {showSosCard && (
          <div className="bg-rose-soft/10 dark:bg-rose-soft/20 border-2 border-rose-soft rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 animate-fadeIn">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5 text-rose-soft dark:text-rose-soft">
                <ShieldAlert className="w-6 h-6 shrink-0" />
                <h3 className="font-serif font-bold text-base sm:text-lg text-primary">
                  {l('उत्तराखंड 108 आपातकालीन एम्बुलेंस डिस्पैचर', 'Uttarakhand Emergency 108 Ambulance Dispatcher')}
                </h3>
              </div>
              <span className="text-[10px] bg-rose-soft text-white px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                {l('आपातकालीन हेल्पलाइन', 'Emergency Hotline')}
              </span>
            </div>
            <p className="text-xs text-muted dark:text-muted leading-relaxed">
              {l('लाल श्रेणी के गंभीर मरीजों को तुरंत 108 एम्बुलेंस से भेजने के लिए हेल्पलाइन या डिस्पैच नोट्स का उपयोग करें।', 'Use hotline or dispatch notes to immediately dispatch 108 ambulance for red-tier critical patients.')}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="tel:108"
                className="touch-target inline-flex items-center gap-2 bg-rose-soft hover:bg-rose-soft/90 text-white px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-sm"
              >
                <PhoneCall className="w-4 h-4" />
                <span>{l('108 एम्बुलेंस कॉल करें', 'Call 108 Ambulance')}</span>
              </a>
              <a
                href="tel:104"
                className="touch-target inline-flex items-center gap-2 bg-warm-indigo hover:bg-warm-indigo text-white px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-sm"
              >
                <PhoneCall className="w-4 h-4" />
                <span>{l('104 स्वास्थ्य सलाह', 'Call 104 Health Advice')}</span>
              </a>
              <button
                onClick={handleCopySosDetails}
                className="touch-target inline-flex items-center gap-2 bg-white dark:bg-warm-indigo border border-gray-300 dark:border-gray-700 text-primary px-5 py-3 rounded-2xl text-xs font-bold hover:bg-gray-100 transition-all shadow-xs cursor-pointer"
              >
                {copiedSos ? <Check className="w-4 h-4 text-sage" /> : <Copy className="w-4 h-4 text-muted" />}
                <span>{copiedSos ? l('कॉपी हो गया!', 'Copied!') : l('डिस्पैच नोट्स कॉपी करें', 'Copy Dispatch Notes')}</span>
              </button>
            </div>
          </div>
        )}

        {/* ── 2-COLUMN ASHA WORKSPACE: FIELD LOG & FOLLOW-UP ────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT COLUMN: Patient Encounter Form & Offline Field Log (7 cols) */}
          <div className="lg:col-span-7 space-y-6">

            {/* Add Patient Form (collapsible) with Vitals & Auto-Tier */}
            {showAddForm && (
              <form onSubmit={handleAddPatient} className="bg-white dark:bg-warm-indigo rounded-3xl p-5 sm:p-7 border border-gold-warm/50 shadow-sm space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                  <h3 className="font-serif font-bold text-base text-primary flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-gold-warm" /> {l('नया फील्ड मरीज रिकॉर्ड', 'New Field Patient Encounter')}
                  </h3>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full text-white ${
                    newPatient.tier === 'Red' ? 'bg-rose-soft' : newPatient.tier === 'Yellow' ? 'bg-gold-warm text-primary' : 'bg-sage'
                  }`}>
                    {l('ऑटो ट्राइएज:', 'Auto Triage:')} Tier {newPatient.tier}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-primary mb-1.5 block">{l('मरीज का नाम *', 'Patient Name *')}</label>
                    <input
                      type="text"
                      value={newPatient.name}
                      onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                      placeholder={l('जैसे: कमला रावत', 'e.g. Kamala Rawat')}
                      required
                      className="w-full bg-gray-50 dark:bg-card text-primary border border-gray-300 dark:border-gray-700 rounded-2xl px-4 py-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sage"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-primary mb-1.5 block">{l('गाँव / वार्ड', 'Village / Ward')}</label>
                    <input
                      type="text"
                      value={newPatient.village}
                      onChange={(e) => setNewPatient({ ...newPatient, village: e.target.value })}
                      placeholder={user?.village || (isHindi ? 'मंडल / वार्ड 3' : 'Mandal / Ward 3')}
                      className="w-full bg-gray-50 dark:bg-card text-primary border border-gray-300 dark:border-gray-700 rounded-2xl px-4 py-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sage"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-primary mb-1.5 block">{l('ट्राइएज श्रेणी', 'Triage Tier')}</label>
                    <select
                      value={newPatient.tier}
                      onChange={(e) => setNewPatient({ ...newPatient, tier: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-card text-primary border border-gray-300 dark:border-gray-700 rounded-2xl px-4 py-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sage"
                    >
                      <option value="Green">{l('हरा — सामान्य / घरेलू उपचार', 'Green — Mild / Home Remedies')}</option>
                      <option value="Yellow">{l('पीला — PHC डॉक्टर परामर्श', 'Yellow — PHC Doctor Review')}</option>
                      <option value="Red">{l('लाल — तत्काल अस्पताल रेफरल', 'Red — Urgent / Hospital Referral')}</option>
                    </select>
                  </div>
                </div>

                {/* Vitals Assistant */}
                <div className="bg-mist dark:bg-card p-4 rounded-2xl border border-sage/20 dark:border-gray-800">
                  <span className="text-[11px] font-bold uppercase text-muted dark:text-muted tracking-wider block mb-2.5">
                    {l('फील्ड वाइटल्स सहायक (SpO2 व तापमान से स्वतः जोखिम गणना)', 'Field Vitals Assistant (SpO2 & Temp Auto-Calculates Risk)')}
                  </span>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <span className="text-xs text-muted dark:text-muted flex items-center gap-1 mb-1 font-medium">
                        <Activity className="w-3.5 h-3.5 text-rose-soft" /> SpO2 (%)
                      </span>
                      <input
                        type="number"
                        value={newPatient.spo2}
                        onChange={(e) => updateVitalsAndAutoTier('spo2', e.target.value)}
                        placeholder="e.g. 96"
                        className="w-full bg-white dark:bg-warm-indigo border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-primary"
                      />
                    </div>
                    <div>
                      <span className="text-xs text-muted dark:text-muted flex items-center gap-1 mb-1 font-medium">
                        <Thermometer className="w-3.5 h-3.5 text-gold-warm" /> Temp (°F)
                      </span>
                      <input
                        type="number"
                        step="0.1"
                        value={newPatient.temp}
                        onChange={(e) => updateVitalsAndAutoTier('temp', e.target.value)}
                        placeholder="e.g. 99.2"
                        className="w-full bg-white dark:bg-warm-indigo border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-primary"
                      />
                    </div>
                    <div>
                      <span className="text-xs text-muted dark:text-muted flex items-center gap-1 mb-1 font-medium">
                        <Heart className="w-3.5 h-3.5 text-sage" /> Pulse (bpm)
                      </span>
                      <input
                        type="number"
                        value={newPatient.pulse}
                        onChange={(e) => setNewPatient({ ...newPatient, pulse: e.target.value })}
                        placeholder="e.g. 78"
                        className="w-full bg-white dark:bg-warm-indigo border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-primary"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-primary mb-1.5 block">{l('तकलीफ या मुख्य लक्षण *', 'Chief Complaint & Symptoms *')}</label>
                  <textarea
                    value={newPatient.symptom}
                    onChange={(e) => setNewPatient({ ...newPatient, symptom: e.target.value })}
                    placeholder={l('जैसे: 3 दिन से तेज बुखार है, शरीर दर्द और ठंड लगना', 'e.g. High fever for 3 days, body ache and chills')}
                    rows={2}
                    required
                    className="w-full bg-gray-50 dark:bg-card text-primary border border-gray-300 dark:border-gray-700 rounded-2xl px-4 py-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sage"
                  />
                </div>

                {/* Quick symptom presets */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { en: 'Cold & Dry Cough', hi: 'सर्दी व सूखी खांसी' },
                    { en: 'Fever > 3 Days', hi: '3 दिन से तेज बुखार' },
                    { en: 'Acute Hypoxia / Breathlessness', hi: 'सांस फूलना / हाइपोक्सिया' },
                    { en: 'Diarrhea & Dehydration', hi: 'दस्त व निर्जलीकरण' },
                    { en: 'Joint Pain / Arthritis', hi: 'जोड़ों का दर्द / गठिया' },
                  ].map((s) => {
                    const label = isHindi ? s.hi : s.en;
                    return (
                      <button
                        type="button"
                        key={s.en}
                        onClick={() => setNewPatient((prev) => ({ ...prev, symptom: prev.symptom ? `${prev.symptom}, ${label}` : label }))}
                        className="touch-target text-xs bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-sage/15 text-primary px-3.5 py-1.5 rounded-full transition-colors cursor-pointer"
                      >
                        + {label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={!newPatient.name || !newPatient.symptom}
                    className="touch-target bg-sage hover:bg-sage/90 text-white text-xs sm:text-sm font-bold px-7 py-3.5 rounded-2xl disabled:opacity-40 transition-all shadow-sm cursor-pointer"
                  >
                    {l('ऑफ़लाइन रिकॉर्ड दर्ज करें', 'Save Field Record (Offline)')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="touch-target text-xs font-semibold text-muted dark:text-muted hover:text-primary px-4 py-3 cursor-pointer"
                  >
                    {l('रद्द करें', 'Cancel')}
                  </button>
                </div>
              </form>
            )}

            {/* Patient Queue & Search/Filter Controls */}
            <div className="bg-white dark:bg-warm-indigo rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-800 overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 bg-gray-50/60 dark:bg-card">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-bold text-base sm:text-lg text-primary">
                      {l(`ऑफ़लाइन फील्ड लॉग (${toEnglishDigits(filteredPatients.length)} / ${toEnglishDigits(offlineQueue.length)})`, `Offline Field Log (${toEnglishDigits(filteredPatients.length)} of ${toEnglishDigits(offlineQueue.length)})`)}
                    </h3>
                    {offlineQueue === DEFAULT_PATIENTS && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300">
                        {l('नमूना डेटा — वास्तविक संख्या के लिए बैकएंड से जुड़ें', 'Sample data — connect backend for live numbers')}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted dark:text-muted">{l('ब्राउज़र स्टोरेज में स्थानीय रूप से सुरक्षित', 'Auto-persisted to local browser storage')}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={l('नाम या गाँव...', 'Name or village...')}
                      className="bg-white dark:bg-warm-indigo border border-gray-300 dark:border-gray-700 rounded-2xl pl-9 pr-3.5 py-2 text-xs text-primary focus:outline-none focus:ring-2 focus:ring-sage w-36 sm:w-48"
                    />
                  </div>

                  <select
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value)}
                    className="bg-white dark:bg-warm-indigo border border-gray-300 dark:border-gray-700 text-primary rounded-2xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sage"
                  >
                    <option value="all">{l('सभी श्रेणियां', 'All Tiers')}</option>
                    <option value="needsFollowUp">{l('फॉलो-अप आवश्यक', 'Follow-Up Required')}</option>
                    <option value="Red">{l('लाल श्रेणी (आपातकाल)', 'Red Tier (Emergency)')}</option>
                    <option value="Yellow">{l('पीली श्रेणी (मध्यम)', 'Yellow Tier (Moderate)')}</option>
                    <option value="Green">{l('हरी श्रेणी (सामान्य)', 'Green Tier (Mild)')}</option>
                  </select>
                </div>
              </div>

              {/* Patient List */}
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {offlineQueue.length === 0 ? (
                  <div className="py-12 px-6 text-center flex flex-col items-center justify-center">
                    <div className="w-14 h-14 rounded-3xl bg-sage/10 text-sage flex items-center justify-center mb-3">
                      <Users className="w-7 h-7" />
                    </div>
                    <h4 className="font-serif font-bold text-base text-primary mb-1">
                      {l('कोई मरीज़ रिकॉर्ड नहीं है', 'No Patient Records Yet')}
                    </h4>
                    <p className="text-xs text-muted max-w-sm mb-5 leading-relaxed">
                      {l('गाँव के भ्रमण के दौरान नए मरीज़ का विवरण दर्ज करें, या परीक्षण के लिए नमूना डेटा लोड करें।', 'Record new patient details during field visits, or load sample data for testing.')}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        onClick={() => setShowAddForm(true)}
                        className="touch-target bg-sage hover:bg-sage/90 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> {l('नया मरीज़ जोड़ें', 'Add New Patient')}
                      </button>
                      <button
                        onClick={handleLoadSamplePatients}
                        className="touch-target bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-primary font-bold text-xs px-4 py-2.5 rounded-xl transition-all border border-gray-200 dark:border-gray-700 cursor-pointer"
                      >
                        {l('नमूना डेटा लोड करें', 'Load Sample Data')}
                      </button>
                    </div>
                  </div>
                ) : filteredPatients.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-400">{l('फ़िल्टर के अनुसार कोई रिकॉर्ड नहीं मिला।', 'No matching records found.')}</div>
                ) : (
                  filteredPatients.map((patient) => (
                    <div key={patient.id} className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white text-sm font-bold shadow-xs ${
                          patient.tier === 'Red' ? 'bg-rose-soft' :
                          patient.tier === 'Yellow' ? 'bg-gold-warm text-primary' :
                          'bg-sage'
                        }`}>
                          {patient.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-primary text-sm sm:text-base flex items-center gap-2">
                            {patient.name}
                            <span className="text-xs font-normal text-muted dark:text-muted">• {patient.village}</span>
                            {patient.followedUp && (
                              <span className="text-[10px] bg-sage/15 text-sage dark:text-booti-glow px-2 py-0.5 rounded-full font-bold">
                                {l('फॉलो-अप पूर्ण ✓', 'Followed Up ✓')}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted dark:text-muted mt-0.5">
                            {l('लक्षण:', 'Symptoms:')} <span className="font-medium text-primary">{patient.symptom}</span>
                          </div>
                          {patient.vitals && (
                            <div className="flex items-center gap-3 text-[11px] text-muted dark:text-muted mt-1 font-mono">
                              {patient.vitals.spo2 !== '--' && <span>SpO2: <b className="text-primary">{toEnglishDigits(patient.vitals.spo2)}%</b></span>}
                              {patient.vitals.temp !== '--' && <span>Temp: <b className="text-primary">{toEnglishDigits(patient.vitals.temp)}°F</b></span>}
                              {patient.vitals.pulse !== '--' && <span>Pulse: <b className="text-primary">{toEnglishDigits(patient.vitals.pulse)} bpm</b></span>}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                          patient.tier === 'Red' ? 'bg-rose-soft text-white' :
                          patient.tier === 'Yellow' ? 'bg-gold-warm text-primary' :
                          'bg-sage text-white'
                        }`}>
                          Tier {patient.tier}
                        </span>

                        <span className={`inline-flex items-center gap-1 text-xs font-bold ${patient.synced ? 'text-sage dark:text-booti-glow' : 'text-gold-warm'}`}>
                          {patient.synced ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          <span>{patient.synced ? l('सिंक पूर्ण', 'Synced') : l('प्रतीक्षित', 'Pending')}</span>
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Follow-Up Action Center & Operational Guidance (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* INTEGRATED FollowUpPanel */}
            <FollowUpPanel
              patients={offlineQueue}
              onMarkFollowedUp={handleMarkFollowedUp}
            />

            {/* ASHA Field Guidance & Connectivity Card */}
            <div className="bg-white dark:bg-warm-indigo rounded-3xl p-6 border border-gray-200/80 dark:border-gray-800 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <Leaf className="w-4 h-4 text-sage" />
                <h4 className="font-serif font-bold text-sm text-primary">
                  {l('ऑफ़लाइन फील्ड ट्राइएज प्रोटोकॉल', 'Offline Field Triage Protocol')}
                </h4>
              </div>
              <p className="text-xs text-muted dark:text-muted leading-relaxed">
                {l('आशा कार्यकर्ता टैबलेट या मोबाइल पर दर्ज रिकॉर्ड बिना इंटरनेट के ब्राउज़र में सुरक्षित रहते हैं।', 'Encounters recorded by ASHA workers on tablets or mobiles remain securely stored offline in browser local storage.')}
              </p>
              <div className="bg-mist dark:bg-card p-3.5 rounded-2xl border border-sage/15 text-xs text-muted dark:text-muted space-y-1">
                <p>• <strong>{l('लाल श्रेणी:', 'Red Tier:')}</strong> {l('तुरंत 108 एम्बुलेंस बुलाएं या नजदीकी उप-केंद्र ले जाएं।', 'Immediately dispatch 108 SOS or transfer to nearest health sub-centre.')}</p>
                <p>• <strong>{l('पीली श्रेणी:', 'Yellow Tier:')}</strong> {l('24 घंटे के भीतर PHC डॉक्टर या CHC से परामर्श कराएं।', 'Consult PHC doctor or CHC within 24 hours.')}</p>
                <p>• <strong>{l('हरी श्रेणी:', 'Green Tier:')}</strong> {l('संजीवनी घरेलू उपचार व दिनचर्या का पालन करें।', 'Follow Sanjeevani home remedies and wellness routine.')}</p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}