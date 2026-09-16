import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import FollowUpPanel from '../components/FollowUpPanel';
import {
  Users, WifiOff, RefreshCw, Plus, CheckCircle, Clock, MapPin,
  UserPlus, Leaf, PhoneCall, AlertTriangle, Search, Filter,
  Activity, Thermometer, Heart, ShieldAlert, Copy, Check
} from 'lucide-react';
import toast from 'react-hot-toast';

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

  // Save to local storage on change
  useEffect(() => {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(offlineQueue));
    } catch (e) {
      console.warn('Failed to save ASHA offline queue', e);
    }
  }, [offlineQueue]);

  const handleSyncAll = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setOfflineQueue((prev) => prev.map((p) => ({ ...p, synced: true })));
      setIsSyncing(false);
      toast.success('All pending encounters successfully synced to PHC server');
    }, 1200);
  };

  const handleMarkFollowedUp = (patientId) => {
    setOfflineQueue((prev) =>
      prev.map((p) => (p.id === patientId ? { ...p, followedUp: true } : p))
    );
    toast.success('Patient check-in recorded as complete! ✨');
  };

  // Auto-calculate suggested tier based on vitals
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
    toast.success(`Encounter logged for ${newPatient.name} (Tier ${newRecord.tier})`);
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
    const text = `🚨 EMERGENCY DISPATCH (ASHA Field Uplink)\nWorker: ${user?.name || 'ASHA Field'}\nLocation: ${user?.village || 'Chamoli District'}\nUrgent Cases: ${offlineQueue.filter(p => p.tier === 'Red' && !p.followedUp).map(p => `${p.name} (${p.village}) - ${p.symptom}`).join('; ')}`;
    navigator.clipboard.writeText(text);
    setCopiedSos(true);
    setTimeout(() => setCopiedSos(false), 2000);
    toast.success('Emergency dispatch details copied to clipboard');
  };

  return (
    <div className="min-h-screen bg-mist text-primary">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* ── Header Banner ────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-[#1A263D] to-[#2a3a5a] text-white p-6 md:p-8 rounded-3xl shadow-md">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-gold-warm text-primary text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
                <Users className="w-3 h-3" /> ASHA Field Portal
              </div>
              <h1 className="font-serif text-2xl md:text-3xl font-bold">
                Namaste, {user?.name || 'ASHA Worker'} 🌿
              </h1>
              <p className="text-xs text-white/60 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3 h-3" />
                {user?.village || 'Chamoli District'} • Offline door-to-door triage enabled
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setShowSosCard(!showSosCard)}
                className="flex items-center gap-1.5 bg-rose-soft hover:bg-[#a34437] text-white px-3.5 py-2.5 rounded-xl font-bold text-xs shadow transition-all"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                108 SOS Dispatch
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 bg-gold-warm hover:bg-[#c4933a] text-primary px-4 py-2.5 rounded-xl font-bold text-xs shadow transition-all"
              >
                <UserPlus className="w-4 h-4" />
                New Encounter
              </button>
              <button
                onClick={handleSyncAll}
                disabled={isSyncing || pendingCount === 0}
                className="flex items-center gap-2 bg-card/10 hover:bg-card/20 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all disabled:opacity-40"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : `Sync ${pendingCount} Pending`}
              </button>
            </div>
          </div>

          {/* Sync Status Pill */}
          <div className="mt-4 flex items-center gap-3">
            <div className={`flex items-center gap-1.5 text-xs ${pendingCount > 0 ? 'text-gold-warm' : 'text-emerald-400'}`}>
              {pendingCount > 0 ? <WifiOff className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
              {pendingCount > 0 ? `${pendingCount} records cached offline (ready to sync)` : 'All records synced to PHC server'}
            </div>
          </div>
        </div>

        {/* ── Emergency SOS Dispatcher Card (Collapsible) ──────────── */}
        {showSosCard && (
          <div className="bg-rose-soft/10 border-2 border-rose-soft/30 rounded-3xl p-5 shadow-sm space-y-4 animate-fadeIn">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5 text-rose-soft">
                <ShieldAlert className="w-6 h-6" />
                <h3 className="font-serif font-bold text-base text-primary">
                  Uttarakhand Emergency 108 Ambulance Dispatcher
                </h3>
              </div>
              <span className="text-[10px] bg-rose-soft text-white px-2.5 py-0.5 rounded-full font-bold uppercase">Emergency</span>
            </div>
            <p className="text-xs text-muted">
              Direct emergency dispatch for Red-tier patient transfers, altitude sickness, or acute trauma.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="tel:108"
                className="inline-flex items-center gap-2 bg-rose-soft hover:bg-[#a34437] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <PhoneCall className="w-4 h-4" /> Call 108 Ambulance
              </a>
              <a
                href="tel:104"
                className="inline-flex items-center gap-2 bg-warm-indigo text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#253655] transition-all"
              >
                <PhoneCall className="w-4 h-4" /> Call 104 Health Helpline
              </a>
              <button
                onClick={handleCopySosDetails}
                className="inline-flex items-center gap-1.5 bg-card border border-border-subtle text-primary px-3.5 py-2 rounded-xl text-xs font-medium hover:bg-mist transition-all"
              >
                {copiedSos ? <Check className="w-4 h-4 text-sage" /> : <Copy className="w-4 h-4 text-muted" />}
                {copiedSos ? 'Copied' : 'Copy Case Dispatch Notes'}
              </button>
            </div>
          </div>
        )}

        {/* ── INTEGRATED FollowUpPanel ─────────────────────────────── */}
        <FollowUpPanel
          patients={offlineQueue}
          onMarkFollowedUp={handleMarkFollowedUp}
        />

        {/* ── Add Patient Form (collapsible) with Vitals & Auto-Tier ── */}
        {showAddForm && (
          <form onSubmit={handleAddPatient} className="bg-card rounded-3xl p-5 md:p-6 border border-gold-warm/30 shadow-sm space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h3 className="font-serif font-bold text-base text-primary flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-gold-warm" /> New Patient Field Encounter
              </h3>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full text-white ${
                newPatient.tier === 'Red' ? 'bg-rose-soft' : newPatient.tier === 'Yellow' ? 'bg-gold-warm' : 'bg-sage'
              }`}>
                Auto Triage: Tier {newPatient.tier}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-primary mb-1 block">Patient Name *</label>
                <input
                  type="text"
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  placeholder="e.g. Kamala Rawat"
                  required
                  className="w-full bg-mist text-primary border border-border-subtle rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#5A7855]/40"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-primary mb-1 block">Village / Hamlet</label>
                <input
                  type="text"
                  value={newPatient.village}
                  onChange={(e) => setNewPatient({ ...newPatient, village: e.target.value })}
                  placeholder={user?.village || "Mandal / Ward 3"}
                  className="w-full bg-mist text-primary border border-border-subtle rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#5A7855]/40"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-primary mb-1 block">Triage Tier Override</label>
                <select
                  value={newPatient.tier}
                  onChange={(e) => setNewPatient({ ...newPatient, tier: e.target.value })}
                  className="w-full bg-mist text-primary border border-border-subtle rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#5A7855]/40"
                >
                  <option value="Green">Green (Minor / Home Care)</option>
                  <option value="Yellow">Yellow (Moderate / PHC Review)</option>
                  <option value="Red">Red (Urgent / Hospital Referral)</option>
                </select>
              </div>
            </div>

            {/* Vitals Assistant */}
            <div className="bg-mist p-3.5 rounded-2xl border border-border-subtle">
              <span className="text-[10px] font-bold uppercase text-muted tracking-wider block mb-2">
                Field Vitals Assistant (Optional - Auto-suggests Tier)
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <span className="text-[10px] text-muted flex items-center gap-1 mb-1">
                    <Activity className="w-3 h-3 text-rose-soft" /> SpO2 (%)
                  </span>
                  <input
                    type="number"
                    value={newPatient.spo2}
                    onChange={(e) => updateVitalsAndAutoTier('spo2', e.target.value)}
                    placeholder="e.g. 96"
                    className="w-full bg-card border border-border-subtle rounded-lg px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-muted flex items-center gap-1 mb-1">
                    <Thermometer className="w-3 h-3 text-gold-warm" /> Temp (°F)
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    value={newPatient.temp}
                    onChange={(e) => updateVitalsAndAutoTier('temp', e.target.value)}
                    placeholder="e.g. 99.2"
                    className="w-full bg-card border border-border-subtle rounded-lg px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-muted flex items-center gap-1 mb-1">
                    <Heart className="w-3 h-3 text-sage" /> Pulse (bpm)
                  </span>
                  <input
                    type="number"
                    value={newPatient.pulse}
                    onChange={(e) => setNewPatient({ ...newPatient, pulse: e.target.value })}
                    placeholder="e.g. 78"
                    className="w-full bg-card border border-border-subtle rounded-lg px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-primary mb-1 block">Chief Complaint / Symptoms *</label>
              <textarea
                value={newPatient.symptom}
                onChange={(e) => setNewPatient({ ...newPatient, symptom: e.target.value })}
                placeholder="e.g. High fever for 3 days, body aches, shivering, loss of appetite"
                rows={2}
                required
                className="w-full bg-mist text-primary border border-border-subtle rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#5A7855]/40"
              />
            </div>

            {/* Quick symptom presets */}
            <div className="flex flex-wrap gap-1.5">
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
                  className="text-[10px] bg-card border border-border-subtle hover:bg-sage-light text-primary px-2.5 py-1 rounded-full transition-colors"
                >
                  + {s}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={!newPatient.name || !newPatient.symptom}
                className="bg-sage hover:bg-[#4a6346] text-white text-xs font-bold px-6 py-2.5 rounded-xl disabled:opacity-40 transition-all shadow-sm"
              >
                Log Encounter & Save Locally
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs text-muted hover:text-primary px-3 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* ── Patient Queue & Search/Filter Controls ───────────────── */}
        <div className="bg-card rounded-3xl shadow-sm border border-border-subtle overflow-hidden">
          {/* Queue Header & Filters */}
          <div className="p-4 border-b border-border-subtle flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
            <div>
              <h3 className="font-serif font-bold text-base text-primary">
                Offline Field Log ({filteredPatients.length} of {offlineQueue.length})
              </h3>
              <span className="text-[10px] text-muted">Auto-persisted to local browser storage</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, village..."
                  className="bg-card border border-border-subtle rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#5A7855]/40 w-40 sm:w-48"
                />
              </div>

              {/* Filter */}
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="bg-card border border-border-subtle rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#5A7855]/40"
              >
                <option value="all">All Tiers</option>
                <option value="needsFollowUp">Needs Follow-Up</option>
                <option value="Red">Red Only</option>
                <option value="Yellow">Yellow Only</option>
                <option value="Green">Green Only</option>
              </select>
            </div>
          </div>

          {/* List */}
          <div className="divide-y divide-black/5">
            {filteredPatients.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted">No encounters match your search or filter criteria.</div>
            ) : (
              filteredPatients.map((patient) => (
                <div key={patient.id} className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm ${
                      patient.tier === 'Red' ? 'bg-rose-soft' :
                      patient.tier === 'Yellow' ? 'bg-gold-warm' :
                      'bg-sage'
                    }`}>
                      {patient.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-primary text-sm flex items-center gap-2">
                        {patient.name}
                        <span className="text-xs font-normal text-muted">• {patient.village}</span>
                        {patient.followedUp && (
                          <span className="text-[10px] bg-sage-light text-sage px-2 py-0.2 rounded-full font-bold">
                            Followed Up
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        Chief Complaint: <span className="font-medium text-gray-800">{patient.symptom}</span>
                      </div>
                      {patient.vitals && (
                        <div className="flex items-center gap-2.5 text-[10px] text-muted mt-1">
                          {patient.vitals.spo2 !== '--' && <span>SpO2: <b className="text-primary">{patient.vitals.spo2}%</b></span>}
                          {patient.vitals.temp !== '--' && <span>Temp: <b className="text-primary">{patient.vitals.temp}°F</b></span>}
                          {patient.vitals.pulse !== '--' && <span>Pulse: <b className="text-primary">{patient.vitals.pulse} bpm</b></span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      patient.tier === 'Red' ? 'bg-rose-soft text-white' :
                      patient.tier === 'Yellow' ? 'bg-gold-warm text-white' :
                      'bg-sage text-white'
                    }`}>
                      Tier {patient.tier}
                    </span>

                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${patient.synced ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {patient.synced ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      {patient.synced ? 'Synced' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div className="text-center py-3">
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
            <Leaf className="w-3.5 h-3.5 text-gold-warm" />
            Field encounters are secured offline via browser storage for zero-connectivity Himalayan zones
          </p>
        </div>

      </div>
    </div>
  );
}