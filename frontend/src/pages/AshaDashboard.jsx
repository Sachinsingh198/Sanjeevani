import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import FollowUpPanel from '../components/FollowUpPanel';
import {
  Users, WifiOff, RefreshCw, Plus, CheckCircle, Clock, MapPin,
  UserPlus, Leaf, PhoneCall, AlertTriangle, Search, Filter,
  Activity, Thermometer, Heart, ShieldAlert, Copy, Check, ChevronDown, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { checkBackendHealth, syncAshaBatch } from '../api/client';

const QUEUE_STORAGE_KEY = 'sanjeevani_asha_queue_v2';

const DEFAULT_PATIENTS = [
  { id: 'REC-101', name: 'Sunita Devi', village: 'Mandal, Chamoli', tier: 'Green', symptom: 'Dry Cough (Hill Cold)', vitals: { spo2: '97', temp: '98.6', pulse: '74' }, synced: true, followedUp: true },
  { id: 'REC-102', name: 'Birendra Rawat', village: 'Gopeshwar Ward 3', tier: 'Yellow', symptom: 'Fever 4 days with mild dehydration', vitals: { spo2: '94', temp: '101.4', pulse: '88' }, synced: false, followedUp: false },
  { id: 'REC-103', name: 'Manorama Negi', village: 'Joshimath Outskirts', tier: 'Red', symptom: 'Acute chest tightness & hypoxia (108 SOS Sent)', vitals: { spo2: '88', temp: '99.0', pulse: '110' }, synced: false, followedUp: false },
  { id: 'REC-104', name: 'Deepak Joshi', village: 'Pipalkoti', tier: 'Yellow', symptom: 'Severe abdominal pain & persistent vomiting', vitals: { spo2: '96', temp: '100.2', pulse: '92' }, synced: true, followedUp: false },
];

export default function AshaDashboard() {
  const { user } = useAuth();

  const [offlineQueue, setOfflineQueue] = useState(() => {
    try {
      const saved = localStorage.getItem(QUEUE_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_PATIENTS;
    } catch {
      return DEFAULT_PATIENTS;
    }
  });

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

  // Auto-replay queued encounters when connection is restored
  useEffect(() => {
    const handleOnlineAutoSync = () => {
      const pending = offlineQueue.filter((p) => !p.synced);
      if (pending.length > 0) {
        toast('Network wapas aa gaya. Records sync ho rahe hain...', { icon: '🌐' });
        handleSyncAll();
      }
    };
    window.addEventListener('online', handleOnlineAutoSync);
    return () => window.removeEventListener('online', handleOnlineAutoSync);
  }, [offlineQueue]);

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
    <div className="min-h-screen bg-mist dark:bg-mist text-primary dark:text-mist transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* ── Mode B Header Banner ────────────────────────────────────────── */}
        <div className="bg-warm-indigo dark:bg-warm-indigo text-white p-6 sm:p-8 rounded-3xl shadow-md border border-gray-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-gold-warm text-primary text-[10px] font-extrabold px-3.5 py-1 rounded-full uppercase tracking-wider mb-2.5 shadow-xs">
                <Users className="w-3.5 h-3.5" /> ASHA Field Portal • आशा सहायिका
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold leading-tight">
                Namaste, {user?.name || 'ASHA Karyakarti'} 🌿
              </h1>
              <p className="text-xs text-white/80 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gold-warm" />
                <span>{user?.village || 'Chamoli District'} • Zero-Connectivity Offline Triage Enabled</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <button
                onClick={() => setShowSosCard(!showSosCard)}
                className={`touch-target flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs shadow-sm transition-all ${
                  showSosCard ? 'bg-white text-rose-soft' : 'bg-rose-soft hover:bg-rose-soft/90 text-white'
                }`}
              >
                <PhoneCall className="w-4 h-4" />
                <span>108 SOS Dispatch</span>
              </button>
              
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className={`touch-target flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs shadow-sm transition-all ${
                  showAddForm ? 'bg-white text-primary' : 'bg-gold-warm hover:bg-gold-warm/90 text-primary'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Naya Marij (New)</span>
              </button>
              
              <button
                onClick={handleSyncAll}
                disabled={isSyncing || pendingCount === 0}
                className="touch-target flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-2xl font-bold text-xs transition-all disabled:opacity-40 border border-white/10"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : `Sync (${pendingCount})`}</span>
              </button>
            </div>
          </div>

          {/* Sync Status Pill */}
          <div className="mt-5 flex items-center gap-3 pt-3 border-t border-white/15">
            <div className={`flex items-center gap-2 text-xs font-semibold ${pendingCount > 0 ? 'text-gold-warm' : 'text-booti-glow'}`}>
              {pendingCount > 0 ? <WifiOff className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>
                {pendingCount > 0
                  ? `${pendingCount} encounters queued for sync (${pendingCount} records offline me surakshit hain)`
                  : 'Sabhi records PHC server par sync ho chuke hain (0 encounters queued for sync)'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Emergency SOS Dispatcher Card (Collapsible) ──────────── */}
        {showSosCard && (
          <div className="bg-rose-soft/10 dark:bg-rose-soft/20 border-2 border-rose-soft rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 animate-fadeIn">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5 text-rose-soft dark:text-rose-soft">
                <ShieldAlert className="w-6 h-6 shrink-0" />
                <h3 className="font-serif font-bold text-base sm:text-lg text-primary dark:text-mist">
                  Uttarakhand Emergency 108 Ambulance Dispatcher
                </h3>
              </div>
              <span className="text-[10px] bg-rose-soft text-white px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                Emergency Hotline
              </span>
            </div>
            <p className="text-xs text-muted dark:text-muted leading-relaxed">
              Red-tier gambhir marijon ko turant 108 ambulance dispatch karne ke liye helpline ya dispatch copy ka upyog karein.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="tel:108"
                className="touch-target inline-flex items-center gap-2 bg-rose-soft hover:bg-rose-soft/90 text-white px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-sm"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call 108 Ambulance</span>
              </a>
              <a
                href="tel:104"
                className="touch-target inline-flex items-center gap-2 bg-warm-indigo hover:bg-warm-indigo text-white px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-sm"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call 104 Health Advice</span>
              </a>
              <button
                onClick={handleCopySosDetails}
                className="touch-target inline-flex items-center gap-2 bg-white dark:bg-warm-indigo border border-gray-300 dark:border-gray-700 text-primary dark:text-mist px-5 py-3 rounded-2xl text-xs font-bold hover:bg-gray-100 transition-all shadow-xs"
              >
                {copiedSos ? <Check className="w-4 h-4 text-sage" /> : <Copy className="w-4 h-4 text-muted" />}
                <span>{copiedSos ? 'Copied!' : 'Copy Dispatch Notes'}</span>
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
                  <h3 className="font-serif font-bold text-base text-primary dark:text-mist flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-gold-warm" /> Naya Field Record (New Patient Encounter)
                  </h3>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full text-white ${
                    newPatient.tier === 'Red' ? 'bg-rose-soft' : newPatient.tier === 'Yellow' ? 'bg-gold-warm text-primary' : 'bg-sage'
                  }`}>
                    Auto Triage: Tier {newPatient.tier}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-primary dark:text-mist mb-1.5 block">Marij Ka Naam *</label>
                    <input
                      type="text"
                      value={newPatient.name}
                      onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                      placeholder="Jaise: Kamala Rawat"
                      required
                      className="w-full bg-gray-50 dark:bg-mist text-primary dark:text-mist border border-gray-300 dark:border-gray-700 rounded-2xl px-4 py-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sage"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-primary dark:text-mist mb-1.5 block">Gaon / Ward</label>
                    <input
                      type="text"
                      value={newPatient.village}
                      onChange={(e) => setNewPatient({ ...newPatient, village: e.target.value })}
                      placeholder={user?.village || "Mandal / Ward 3"}
                      className="w-full bg-gray-50 dark:bg-mist text-primary dark:text-mist border border-gray-300 dark:border-gray-700 rounded-2xl px-4 py-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sage"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-primary dark:text-mist mb-1.5 block">Triage Tier</label>
                    <select
                      value={newPatient.tier}
                      onChange={(e) => setNewPatient({ ...newPatient, tier: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-mist text-primary dark:text-mist border border-gray-300 dark:border-gray-700 rounded-2xl px-4 py-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sage"
                    >
                      <option value="Green">Green (Gharelu Upchar / Samanya)</option>
                      <option value="Yellow">Yellow (PHC Doctor Review)</option>
                      <option value="Red">Red (Urgent / Hospital Referral)</option>
                    </select>
                  </div>
                </div>

                {/* Vitals Assistant */}
                <div className="bg-mist dark:bg-card p-4 rounded-2xl border border-sage/20 dark:border-gray-800">
                  <span className="text-[11px] font-bold uppercase text-muted dark:text-muted tracking-wider block mb-2.5">
                    Field Vitals Assistant (SpO2 & Temp Auto-Calculates Risk)
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
                        className="w-full bg-white dark:bg-warm-indigo border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-primary dark:text-mist"
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
                        className="w-full bg-white dark:bg-warm-indigo border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-primary dark:text-mist"
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
                        className="w-full bg-white dark:bg-warm-indigo border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-primary dark:text-mist"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-primary dark:text-mist mb-1.5 block">Takleef / Lakshan (Chief Complaint) *</label>
                  <textarea
                    value={newPatient.symptom}
                    onChange={(e) => setNewPatient({ ...newPatient, symptom: e.target.value })}
                    placeholder="Jaise: 3 din se tez bukhar hai, sharir dard aur thand lagna"
                    rows={2}
                    required
                    className="w-full bg-gray-50 dark:bg-mist text-primary dark:text-mist border border-gray-300 dark:border-gray-700 rounded-2xl px-4 py-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sage"
                  />
                </div>

                {/* Quick symptom presets */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    'Cold & Dry Cough',
                    'Fever > 3 Days',
                    'Acute Hypoxia / Breathlessness',
                    'Diarrhea & Dehydration',
                    'Joint Pain / Arthritis',
                  ].map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setNewPatient((prev) => ({ ...prev, symptom: prev.symptom ? `${prev.symptom}, ${s}` : s }))}
                      className="touch-target text-xs bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-sage/15 text-primary dark:text-mist px-3.5 py-1.5 rounded-full transition-colors"
                    >
                      + {s}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={!newPatient.name || !newPatient.symptom}
                    className="touch-target bg-sage hover:bg-sage/90 text-white text-xs sm:text-sm font-bold px-7 py-3.5 rounded-2xl disabled:opacity-40 transition-all shadow-sm"
                  >
                    Offline Record Darz Karein
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="touch-target text-xs font-semibold text-muted dark:text-muted hover:text-primary px-4 py-3"
                  >
                    Radd Karein (Cancel)
                  </button>
                </div>
              </form>
            )}

            {/* Patient Queue & Search/Filter Controls */}
            <div className="bg-white dark:bg-warm-indigo rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-800 overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 bg-gray-50/60 dark:bg-card">
                <div>
                  <h3 className="font-serif font-bold text-base sm:text-lg text-primary dark:text-mist">
                    Offline Field Log ({filteredPatients.length} of {offlineQueue.length})
                  </h3>
                  <span className="text-[11px] text-muted dark:text-muted">Auto-persisted to local browser storage</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Naam ya gaon..."
                      className="bg-white dark:bg-warm-indigo border border-gray-300 dark:border-gray-700 rounded-2xl pl-9 pr-3.5 py-2 text-xs text-primary dark:text-mist focus:outline-none focus:ring-2 focus:ring-sage w-36 sm:w-48"
                    />
                  </div>

                  <select
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value)}
                    className="bg-white dark:bg-warm-indigo border border-gray-300 dark:border-gray-700 text-primary dark:text-mist rounded-2xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sage"
                  >
                    <option value="all">Sabhi Tiers</option>
                    <option value="needsFollowUp">Follow-Up Chahiye</option>
                    <option value="Red">Red Only (Aapaat)</option>
                    <option value="Yellow">Yellow Only (Madhyam)</option>
                    <option value="Green">Green Only (Samanya)</option>
                  </select>
                </div>
              </div>

              {/* Patient List */}
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredPatients.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-400">Koi record nahi mila.</div>
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
                          <div className="font-bold text-primary dark:text-mist text-sm sm:text-base flex items-center gap-2">
                            {patient.name}
                            <span className="text-xs font-normal text-muted dark:text-muted">• {patient.village}</span>
                            {patient.followedUp && (
                              <span className="text-[10px] bg-sage/15 text-sage dark:text-booti-glow px-2 py-0.5 rounded-full font-bold">
                                Followed Up ✓
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted dark:text-muted mt-0.5">
                            Lakshan: <span className="font-medium text-primary dark:text-mist">{patient.symptom}</span>
                          </div>
                          {patient.vitals && (
                            <div className="flex items-center gap-3 text-[11px] text-muted dark:text-muted mt-1 font-mono">
                              {patient.vitals.spo2 !== '--' && <span>SpO2: <b className="text-primary dark:text-mist">{patient.vitals.spo2}%</b></span>}
                              {patient.vitals.temp !== '--' && <span>Temp: <b className="text-primary dark:text-mist">{patient.vitals.temp}°F</b></span>}
                              {patient.vitals.pulse !== '--' && <span>Pulse: <b className="text-primary dark:text-mist">{patient.vitals.pulse} bpm</b></span>}
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
                          <span>{patient.synced ? 'Synced' : 'Pending'}</span>
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
                <h4 className="font-serif font-bold text-sm text-primary dark:text-mist">
                  Offline Field Triage Protocol
                </h4>
              </div>
              <p className="text-xs text-muted dark:text-muted leading-relaxed">
                ASHA Karyakarti tablet ya mobile par darz kiye gaye encounters bina internet ke browser local storage mein surakshit rehte hain.
              </p>
              <div className="bg-mist dark:bg-card p-3.5 rounded-2xl border border-sage/15 text-xs text-muted dark:text-muted space-y-1">
                <p>• <strong>Red Tier:</strong> Turant 108 SOS dispatch karein ya nazdeeki Sub-Centre le jayein.</p>
                <p>• <strong>Yellow Tier:</strong> 24 ghante ke bheetar PHC doctor ya CHC se paramarsh karein.</p>
                <p>• <strong>Green Tier:</strong> Sanjeevani gharelu upchar v dhyan routine follow karein.</p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}