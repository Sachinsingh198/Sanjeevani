import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, WifiOff, RefreshCw, Plus, CheckCircle, Clock, MapPin, UserPlus, Leaf } from 'lucide-react';

export default function AshaDashboard() {
  const { user } = useAuth();

  const [offlineQueue, setOfflineQueue] = useState([
    { id: 'REC-101', name: 'Sunita Devi', village: 'Mandal, Chamoli', tier: 'Green', symptom: 'Dry Cough (Hill Cold)', synced: true },
    { id: 'REC-102', name: 'Birendra Rawat', village: 'Gopeshwar Ward 3', tier: 'Yellow', symptom: 'Fever 4 days', synced: false },
    { id: 'REC-103', name: 'Manorama Negi', village: 'Joshimath Outskirts', tier: 'Red', symptom: 'Acute chest tightness (108 SOS Sent)', synced: false },
  ]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', village: '', symptom: '' });

  const handleSyncAll = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setOfflineQueue((prev) => prev.map((p) => ({ ...p, synced: true })));
      setIsSyncing(false);
    }, 1500);
  };

  const pendingCount = offlineQueue.filter((p) => !p.synced).length;

  const handleAddPatient = (e) => {
    e.preventDefault();
    if (!newPatient.name || !newPatient.symptom) return;
    const newRecord = {
      id: `REC-${100 + offlineQueue.length + 1}`,
      name: newPatient.name,
      village: newPatient.village || user?.village || '',
      tier: 'Green',
      symptom: newPatient.symptom,
      synced: false,
    };
    setOfflineQueue((prev) => [newRecord, ...prev]);
    setNewPatient({ name: '', village: '', symptom: '' });
    setShowAddForm(false);
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
                {user?.village || 'Field Assignment'} • Door-to-door triage enabled
              </p>
            </div>

            <div className="flex items-center gap-3">
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

          {/* Sync Status */}
          <div className="mt-4 flex items-center gap-3">
            <div className={`flex items-center gap-1.5 text-xs ${pendingCount > 0 ? 'text-gold-warm' : 'text-emerald-400'}`}>
              {pendingCount > 0 ? <WifiOff className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
              {pendingCount > 0 ? `${pendingCount} records awaiting cellular uplink` : 'All records synced to PHC'}
            </div>
          </div>
        </div>

        {/* ── Add Patient Form (collapsible) ───────────────────────── */}
        {showAddForm && (
          <form onSubmit={handleAddPatient} className="bg-card rounded-3xl p-5 border border-gold-warm/20 shadow-sm space-y-3">
            <h3 className="font-serif font-bold text-base text-primary">New Patient Encounter</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input type="text" value={newPatient.name} onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })} placeholder="Patient name" className="bg-mist text-primary border border-border-subtle rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7855]/40" />
              <input type="text" value={newPatient.village} onChange={(e) => setNewPatient({ ...newPatient, village: e.target.value })} placeholder="Village" className="bg-mist text-primary border border-border-subtle rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7855]/40" />
              <input type="text" value={newPatient.symptom} onChange={(e) => setNewPatient({ ...newPatient, symptom: e.target.value })} placeholder="Chief complaint" className="bg-mist text-primary border border-border-subtle rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7855]/40" />
            </div>
            <button type="submit" disabled={!newPatient.name || !newPatient.symptom} className="bg-sage hover:bg-[#4a6346] text-white text-xs font-bold px-5 py-2.5 rounded-xl disabled:opacity-40 transition-all">
              Log Encounter
            </button>
          </form>
        )}

        {/* ── Patient Queue ────────────────────────────────────────── */}
        <div className="bg-card rounded-3xl shadow-sm border border-border-subtle overflow-hidden">
          <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-gray-50/50">
            <h3 className="font-serif font-bold text-base text-primary">Offline Patient Log ({offlineQueue.length} Encounters)</h3>
            <span className="text-[10px] text-muted">Auto-syncs upon detecting cellular uplink</span>
          </div>

          <div className="divide-y divide-black/5">
            {offlineQueue.map((patient) => (
              <div key={patient.id} className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold ${
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
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      Chief Complaint: <span className="font-medium text-gray-800">{patient.symptom}</span>
                    </div>
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
            ))}
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div className="text-center py-3">
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
            <Leaf className="w-3.5 h-3.5 text-gold-warm" />
            Data stored locally via IndexedDB for zero-network mountain zones
          </p>
        </div>

      </div>
    </div>
  );
}