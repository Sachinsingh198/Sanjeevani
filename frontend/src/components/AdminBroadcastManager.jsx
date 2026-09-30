import React, { useState, useEffect } from 'react';
import {
  fetchCurrentBroadcast,
  fetchBroadcastHistory,
  publishBroadcast,
  deactivateBroadcast,
} from '../api/authClient';
import {
  Megaphone, Send, AlertTriangle, ShieldCheck, Clock,
  RefreshCw, CheckCircle2, Trash2, Eye, MapPin, Radio
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminBroadcastManager() {
  const [activeBroadcast, setActiveBroadcast] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('warning');
  const [targetVillage, setTargetVillage] = useState('all');
  const [diseaseTag, setDiseaseTag] = useState('');

  useEffect(() => {
    loadBroadcasts();
  }, []);

  const loadBroadcasts = async () => {
    setLoading(true);
    try {
      const [cur, hist] = await Promise.all([
        fetchCurrentBroadcast().catch(() => null),
        fetchBroadcastHistory().catch(() => []),
      ]);
      if (cur) setActiveBroadcast(cur);
      if (hist) setHistory(hist);
    } catch {
      toast.error('Could not load district broadcast notices');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error('Advisory message cannot be empty');
      return;
    }
    setPublishing(true);
    try {
      const res = await publishBroadcast({
        title: title.trim() || 'District Health Notice',
        message: message.trim(),
        severity,
        target_village: targetVillage.trim() || 'all',
        disease_tag: diseaseTag.trim() || undefined,
      });
      toast.success('District CMO Health Advisory broadcasted successfully!');
      setTitle('');
      setMessage('');
      setDiseaseTag('');
      loadBroadcasts();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to publish advisory');
    } finally {
      setPublishing(false);
    }
  };

  const handleDeactivate = async (broadcastId) => {
    if (!window.confirm('Deactivate this broadcast advisory?')) return;
    try {
      await deactivateBroadcast(broadcastId);
      toast.success('Advisory deactivated.');
      loadBroadcasts();
    } catch {
      toast.error('Failed to deactivate advisory');
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Broadcast Header ────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-warm-indigo rounded-3xl p-5 sm:p-6 border border-gray-200/80 dark:border-gray-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-gold-warm/20 text-amber-700 dark:text-gold-warm text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
            <Radio className="w-3.5 h-3.5" /> District CMO Public Health Channel
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-primary">
            District Health Advisory & Outbreak Broadcast
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Publishes persistent health advisories, water safety alerts, and epidemic notices across all citizen Mitra and ASHA devices.
          </p>
        </div>

        <button
          onClick={loadBroadcasts}
          className="touch-target flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-card dark:hover:bg-card/80 text-primary px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border border-gray-200 dark:border-gray-800 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Notices</span>
        </button>
      </div>

      {/* ── Active Broadcast Banner (Live on Platform) ───────────────────── */}
      {activeBroadcast && (
        <div className={`rounded-3xl p-5 sm:p-6 border shadow-sm ${
          activeBroadcast.severity === 'emergency'
            ? 'bg-rose-500/10 border-rose-500/30'
            : activeBroadcast.severity === 'warning'
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-sky-500/10 border-sky-500/30'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 text-white ${
                activeBroadcast.severity === 'emergency' ? 'bg-rose-500 animate-bounce' :
                activeBroadcast.severity === 'warning' ? 'bg-amber-500' : 'bg-sky-500'
              }`}>
                <Megaphone className="w-5 h-5" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-base text-primary">
                    {activeBroadcast.title}
                  </h3>
                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full text-white ${
                    activeBroadcast.severity === 'emergency' ? 'bg-rose-600' :
                    activeBroadcast.severity === 'warning' ? 'bg-amber-600' : 'bg-sky-600'
                  }`}>
                    {activeBroadcast.severity} NOTICE
                  </span>
                  <span className="text-[10px] bg-white/70 dark:bg-card text-muted px-2 py-0.5 rounded-full font-mono">
                    Target: {activeBroadcast.target_village || 'All Villages'}
                  </span>
                </div>
                <p className="text-xs text-primary mt-1.5 leading-relaxed font-medium">
                  {activeBroadcast.message}
                </p>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-muted font-mono">
                  <span>Issued by: {activeBroadcast.author || 'District CMO'}</span>
                  {activeBroadcast.disease_tag && <span>• Tag: {activeBroadcast.disease_tag}</span>}
                </div>
              </div>
            </div>

            <button
              onClick={() => handleDeactivate(activeBroadcast.id)}
              className="touch-target text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline bg-white/80 dark:bg-card px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer self-start sm:self-auto"
            >
              Deactivate Notice
            </button>
          </div>
        </div>
      )}

      {/* ── Form: Compose New District Broadcast ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handlePublish} className="bg-white dark:bg-warm-indigo rounded-3xl p-6 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
            <Send className="w-4 h-4 text-gold-warm" />
            <h3 className="font-serif font-bold text-base text-primary">Compose District CMO Advisory</h3>
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted uppercase block mb-1">Notice Headline</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Alaknanda Basin Water Safety Alert"
              className="w-full bg-gray-50 dark:bg-card border border-gray-300 dark:border-gray-700 text-primary rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-gold-warm"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-muted uppercase block mb-1">Severity Tier</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full bg-gray-50 dark:bg-card border border-gray-300 dark:border-gray-700 text-primary rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-gold-warm"
              >
                <option value="warning">Warning (Precautionary Alert)</option>
                <option value="emergency">Emergency (Active Outbreak / High Danger)</option>
                <option value="info">Information (Health Promotion / Campaign)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted uppercase block mb-1">Target Sector / Sector Filter</label>
              <select
                value={targetVillage}
                onChange={(e) => setTargetVillage(e.target.value)}
                className="w-full bg-gray-50 dark:bg-card border border-gray-300 dark:border-gray-700 text-primary rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-gold-warm"
              >
                <option value="all">All District Villages (समग्र जनपद)</option>
                <option value="Mandal Valley">Mandal Valley (मंडल घाटी)</option>
                <option value="Gopeshwar Central">Gopeshwar Central (गोपेश्वर नगर)</option>
                <option value="Joshimath Sector">Joshimath Sector (जोशीमठ)</option>
                <option value="Pipalkoti Basin">Pipalkoti Basin (पीपलकोटी)</option>
                <option value="Karnaprayag Confluence">Karnaprayag (कर्णप्रयाग)</option>
                <option value="Tharali Sector">Tharali Sector (थराली)</option>
                <option value="Badrinath Corridor">Badrinath Pilgrimage Route (बद्रीनाथ)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted uppercase block mb-1">Disease Classification Tag</label>
            <input
              type="text"
              value={diseaseTag}
              onChange={(e) => setDiseaseTag(e.target.value)}
              placeholder="e.g. Acute Gastroenteritis & Waterborne"
              className="w-full bg-gray-50 dark:bg-card border border-gray-300 dark:border-gray-700 text-primary rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-gold-warm"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted uppercase block mb-1">Advisory Directives & Instructions</label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Provide clear public health directives for citizens and ASHA workers (e.g. boil all drinking water, consume ORS, and report early fever to ASHA)..."
              className="w-full bg-gray-50 dark:bg-card border border-gray-300 dark:border-gray-700 text-primary rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-gold-warm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={publishing}
            className="touch-target w-full bg-gold-warm text-slate-950 font-bold text-xs py-3 rounded-2xl hover:bg-gold-warm/90 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {publishing ? 'Publishing Broadcast...' : 'Publish CMO District Broadcast'}
          </button>
        </form>

        {/* ── Live Mobile Preview of How Citizens/ASHAs Will See It ──────── */}
        <div className="bg-white dark:bg-warm-indigo rounded-3xl p-6 border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
              <Eye className="w-4 h-4 text-sky-500" />
              <h3 className="font-serif font-bold text-base text-primary">Live Citizen & ASHA Banner Preview</h3>
            </div>
            <p className="text-xs text-muted mt-2">
              Exact visual representation as rendered on citizen Mitra Hubs and ASHA field tablets in Uttarakhand:
            </p>

            <div className="mt-4 p-4 rounded-2xl bg-gray-50 dark:bg-card border-2 border-dashed border-gray-300 dark:border-gray-700 space-y-3">
              <div className={`p-4 rounded-2xl border ${
                severity === 'emergency' ? 'bg-rose-500/10 border-rose-500/30' :
                severity === 'warning' ? 'bg-amber-500/10 border-amber-500/30' :
                'bg-sky-500/10 border-sky-500/30'
              }`}>
                <div className="flex items-start gap-3">
                  <span className="text-lg">📢</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-primary">{title || 'District Health Notice'}</span>
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full text-white ${
                        severity === 'emergency' ? 'bg-rose-600' :
                        severity === 'warning' ? 'bg-amber-600' : 'bg-sky-600'
                      }`}>
                        {severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-primary mt-1 font-medium leading-relaxed">
                      {message || 'Ensure drinking water purification & ORS distribution in Alaknanda basin due to seasonal weather shifts.'}
                    </p>
                    <span className="text-[9px] text-muted block mt-1">
                      Sector: {targetVillage === 'all' ? 'All District Sectors' : targetVillage} • Verified by District CMO
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-gray-100 dark:border-gray-800 text-[11px] text-muted">
            <CheckCircle2 className="w-3.5 h-3.5 text-sage inline mr-1" />
            Advisories automatically persist to database and survive server restarts.
          </div>
        </div>
      </div>

      {/* ── Historical Broadcast Notices Log ────────────────────────────── */}
      <div className="bg-white dark:bg-warm-indigo rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/60 dark:bg-card">
          <h3 className="font-serif font-bold text-base text-primary flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted" /> Advisory Issuance History ({history.length})
          </h3>
          <span className="text-xs text-muted">Audited CMO Broadcast Records</span>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[300px] overflow-y-auto">
          {history.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">No historical broadcasts on record.</div>
          ) : (
            history.map((b) => (
              <div key={b.id} className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs hover:bg-gray-50/50 dark:hover:bg-card/40 transition-colors">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary">{b.title}</span>
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.2 rounded-full ${
                      b.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {b.is_active ? 'Active' : 'Archived'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted line-clamp-1">{b.message}</p>
                  <p className="text-[10px] text-muted font-mono">
                    Target: {b.target_village || 'all'} • {new Date(b.created_at).toLocaleString()}
                  </p>
                </div>

                {b.is_active && (
                  <button
                    onClick={() => handleDeactivate(b.id)}
                    className="touch-target text-rose-500 hover:text-rose-700 font-bold p-1.5 cursor-pointer"
                    title="Deactivate"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
