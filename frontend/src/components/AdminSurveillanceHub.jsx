import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchSurveillanceHeatmap,
  fetchOutbreakAlerts,
  fetchSurveillanceTrends,
  dispatchSurveillanceTeam,
  broadcastOutbreakAlert,
} from '../api/authClient';
import DistrictHeatmapMap from './DistrictHeatmapMap';
import SkeletonLoader from './SkeletonLoader';
import {
  Activity, AlertTriangle, ShieldAlert, BarChart3, TrendingUp,
  Download, Send, Megaphone, Users, MapPin, RefreshCw,
  Calendar, Filter, CheckCircle2, ChevronRight, Wind, HeartPulse, Flame
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminSurveillanceHub({ onSwitchToBroadcastTab }) {
  const [diseaseFilter, setDiseaseFilter] = useState('ALL');
  const [timeframeDays, setTimeframeDays] = useState(30);
  const [tierFilter, setTierFilter] = useState('all');

  const [heatmapData, setHeatmapData] = useState(null);
  const [outbreakAlerts, setOutbreakAlerts] = useState([]);
  const [trendsData, setTrendsData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dispatch Modal State
  const [dispatchModalSector, setDispatchModalSector] = useState(null);
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [dispatching, setDispatching] = useState(false);

  // Broadcast Alert Modal State
  const [broadcastModalSector, setBroadcastModalSector] = useState(null);
  const [broadcastActionText, setBroadcastActionText] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  const loadSurveillanceData = useCallback(async () => {
    setLoading(true);
    try {
      const [heatRes, alertsRes, trendsRes] = await Promise.all([
        fetchSurveillanceHeatmap({
          disease: diseaseFilter !== 'ALL' ? diseaseFilter : undefined,
          timeframe: timeframeDays,
          tier: tierFilter !== 'all' ? tierFilter : undefined,
        }),
        fetchOutbreakAlerts(timeframeDays),
        fetchSurveillanceTrends(timeframeDays),
      ]);
      setHeatmapData(heatRes);
      setOutbreakAlerts(alertsRes || []);
      setTrendsData(trendsRes);
    } catch (err) {
      console.error('Surveillance data load error', err);
      toast.error('Failed to load district epidemiological surveillance data');
    } finally {
      setLoading(false);
    }
  }, [diseaseFilter, timeframeDays, tierFilter]);

  useEffect(() => {
    loadSurveillanceData();
  }, [loadSurveillanceData]);

  const handleOpenDispatch = (sector) => {
    setDispatchModalSector(sector);
    setDispatchNotes(`Mobilize ASHA team and PHC medical officer for door-to-door triage and water/vector inspection in ${sector.name}.`);
  };

  const handleConfirmDispatch = async () => {
    if (!dispatchModalSector) return;
    setDispatching(true);
    try {
      const res = await dispatchSurveillanceTeam({
        village: dispatchModalSector.name,
        disease: dispatchModalSector.dominant_disease_name || 'Cluster Outbreak',
        notes: dispatchNotes,
      });
      toast.success(res.message || `Rapid Response Unit dispatched to ${dispatchModalSector.name}!`);
      setDispatchModalSector(null);
      loadSurveillanceData();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to dispatch response team');
    } finally {
      setDispatching(false);
    }
  };

  const handleOpenBroadcast = (sector) => {
    setBroadcastModalSector(sector);
    setBroadcastActionText(`Ensure drinking water chlorination/boiling and immediately report symptoms to your village ASHA worker.`);
  };

  const handleConfirmBroadcast = async () => {
    if (!broadcastModalSector) return;
    setBroadcasting(true);
    try {
      const res = await broadcastOutbreakAlert({
        village: broadcastModalSector.name,
        disease: broadcastModalSector.dominant_disease_name || 'Health Advisory',
        action_text: broadcastActionText,
      });
      toast.success(res.message || 'Outbreak alert broadcasted across district channels!');
      setBroadcastModalSector(null);
      if (onSwitchToBroadcastTab) onSwitchToBroadcastTab();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to publish broadcast');
    } finally {
      setBroadcasting(false);
    }
  };

  const handleExportCSV = () => {
    if (!heatmapData?.sectors?.length) {
      toast.error('No sector data available for export');
      return;
    }
    const headers = ['Sector', 'Block', 'Population', 'ActiveCases', 'Status', 'Trend7d', 'DominantDisease', 'NearestPHC', 'ASHACount'];
    const rows = heatmapData.sectors.map(s => [
      `"${s.name}"`,
      `"${s.block || ''}"`,
      s.population || 0,
      s.active_cases || 0,
      s.status || 'NORMAL',
      s.trend_label || '0%',
      `"${s.dominant_disease_name || ''}"`,
      `"${s.phc || ''}"`,
      s.asha_count || 0,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `chamoli_disease_surveillance_${timeframeDays}d_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Epidemiological bulletin exported to CSV');
  };

  return (
    <div className="space-y-6">
      {/* ── Surveillance Header & Filter Bar ────────────────────────────── */}
      <div className="bg-white dark:bg-warm-indigo rounded-3xl p-5 sm:p-6 border border-gray-200/80 dark:border-gray-800 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
              <Activity className="w-3.5 h-3.5" /> IDSP / NHM Real-Time Disease Surveillance
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-primary">
              District Disease Heatmap & Outbreak Early Warning System (EWS)
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Geospatial epidemiological monitoring across Chamoli mountain blocks, river basins, and pilgrim transit corridors.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="touch-target flex items-center gap-1.5 bg-sage hover:bg-sage/90 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Download District Epidemiological Bulletin CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Bulletin</span>
            </button>

            <button
              onClick={loadSurveillanceData}
              className="touch-target flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-card dark:hover:bg-card/80 text-primary px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border border-gray-200 dark:border-gray-800 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Grid</span>
            </button>
          </div>
        </div>

        {/* ── Interactive Filters ───────────────────────────────────────── */}
        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Disease Selector */}
          <div>
            <label className="text-[10px] font-bold text-muted uppercase block mb-1">Disease Classification</label>
            <select
              value={diseaseFilter}
              onChange={(e) => setDiseaseFilter(e.target.value)}
              className="w-full bg-gray-50 dark:bg-card border border-gray-300 dark:border-gray-700 text-primary rounded-2xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sage cursor-pointer"
            >
              <option value="ALL">All Diseases & Symptoms (समग्र)</option>
              <option value="ARI_PNEUMONIA">Acute Respiratory & Pneumonia (तीव्र श्वसन)</option>
              <option value="ADD_GASTROENTERITIS">Acute Diarrhea & Gastroenteritis (हैजा/दस्त)</option>
              <option value="SEASONAL_VIRAL_DENGUE">Seasonal Viral & Dengue (मौसमी बुखार)</option>
              <option value="TYPHOID_WATERBORNE">Typhoid & Waterborne (टाइफाइड)</option>
              <option value="HYPERTENSION_CARDIAC_AMS">High-Altitude Cardiac & AMS (पहाड़ी अस्वस्थता)</option>
              <option value="SKIN_FUNGAL_INFECTIONS">Skin & Fungal Infections (त्वचा संक्रमण)</option>
              <option value="MATERNAL_NEONATAL">Maternal & Antenatal (मातृ स्वास्थ्य)</option>
            </select>
          </div>

          {/* Timeframe Selector */}
          <div>
            <label className="text-[10px] font-bold text-muted uppercase block mb-1">Time Horizon</label>
            <div className="grid grid-cols-4 gap-1 bg-gray-50 dark:bg-card p-1 rounded-2xl border border-gray-300 dark:border-gray-700">
              {[7, 14, 30, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setTimeframeDays(days)}
                  className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    timeframeDays === days
                      ? 'bg-sage text-white shadow-xs'
                      : 'text-muted hover:text-primary'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>

          {/* Triage Tier Filter */}
          <div>
            <label className="text-[10px] font-bold text-muted uppercase block mb-1">Triage Severity Filter</label>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="w-full bg-gray-50 dark:bg-card border border-gray-300 dark:border-gray-700 text-primary rounded-2xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sage cursor-pointer"
            >
              <option value="all">All Tiers (Red, Yellow, Green)</option>
              <option value="red">Red Tier (Emergency & Outbreak Only)</option>
              <option value="yellow">Yellow Tier (Moderate / Under Observation)</option>
              <option value="green">Green Tier (Routine / Mild)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Top Surveillance KPIs ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-3xl p-5 border border-border-subtle shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs shrink-0 bg-sky-500/15 text-sky-600">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-primary">
                {heatmapData?.total_district_cases || 0}
              </p>
              <p className="text-xs text-muted font-bold uppercase tracking-wider mt-0.5">
                Total District Cases ({timeframeDays}d)
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-3xl p-5 border border-border-subtle shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs shrink-0 bg-rose-500/15 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400">
                {heatmapData?.total_red_cases || 0}
              </p>
              <p className="text-xs text-muted font-bold uppercase tracking-wider mt-0.5">
                Red-Tier Critical Cases
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-3xl p-5 border border-border-subtle shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs shrink-0 bg-orange-500/15 text-orange-600">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">
                {heatmapData?.active_hotspots_count || 0}
              </p>
              <p className="text-xs text-muted font-bold uppercase tracking-wider mt-0.5">
                Active Outbreak Hotspots
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-3xl p-5 border border-border-subtle shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs shrink-0 bg-emerald-500/15 text-emerald-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-primary">
                ~124,000
              </p>
              <p className="text-xs text-muted font-bold uppercase tracking-wider mt-0.5">
                Monitored Mountain Population
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Interactive Map & Heatmap Visualizer ──────────────────────── */}
      {loading ? (
        <div className="bg-slate-950 rounded-3xl h-[520px] flex flex-col items-center justify-center text-slate-400 gap-3 border border-slate-800">
          <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono">Calibrating Chamoli epidemiological terrain coordinates...</p>
        </div>
      ) : (
        <DistrictHeatmapMap
          sectors={heatmapData?.sectors || []}
          selectedDisease={diseaseFilter}
          onQuickDispatch={handleOpenDispatch}
          onQuickBroadcast={handleOpenBroadcast}
        />
      )}

      {/* ── Outbreak Early Warning System (EWS) Cluster Alerts ─────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            <h3 className="font-serif font-bold text-lg text-primary">
              Outbreak Early Warning System (EWS) Alerts ({outbreakAlerts.length})
            </h3>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 uppercase tracking-wider border border-rose-500/20">
            Algorithmic Cluster Detection
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {outbreakAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-3xl p-5 border shadow-xs flex flex-col justify-between transition-all ${
                alert.severity === 'CRITICAL'
                  ? 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-500/30'
                  : 'bg-orange-500/5 dark:bg-orange-950/20 border-orange-500/30'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                    alert.severity === 'CRITICAL' ? 'bg-rose-500 text-white' : 'bg-orange-500 text-white'
                  }`}>
                    {alert.severity} OUTBREAK
                  </span>
                  <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                    {alert.growth_rate_7d} Surge
                  </span>
                </div>

                <h4 className="font-serif font-bold text-base text-primary">
                  {alert.village} ({alert.block} Block)
                </h4>
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                  {alert.disease_name}
                </p>

                <p className="text-[11px] text-muted mt-2 leading-relaxed">
                  <strong>Suspected Vector:</strong> {alert.pathogen_vector}
                </p>

                <div className="mt-3 p-3 rounded-2xl bg-white/70 dark:bg-card/70 border border-gray-200/60 dark:border-gray-800 text-[11px] text-primary">
                  <strong className="text-muted block uppercase text-[10px] mb-1">Recommended CMO Action:</strong>
                  {alert.recommended_action}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-200/50 dark:border-gray-800/80">
                <button
                  onClick={() => handleOpenDispatch({ name: alert.village, dominant_disease_name: alert.disease_name })}
                  className="touch-target flex-1 flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Team</span>
                </button>
                <button
                  onClick={() => handleOpenBroadcast({ name: alert.village, dominant_disease_name: alert.disease_name })}
                  className="touch-target flex-1 flex items-center justify-center gap-1.5 bg-gold-warm text-slate-950 hover:bg-gold-warm/90 font-bold text-xs py-2 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>Issue Alert</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Epidemiological Charts & Trends Grid ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Disease Prevalence Distribution */}
        <div className="bg-white dark:bg-warm-indigo rounded-3xl p-6 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-base text-primary flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sage" /> Disease Prevalence Breakdown
            </h3>
            <span className="text-[10px] font-bold text-muted uppercase">Past {timeframeDays} Days</span>
          </div>

          <p className="text-xs text-muted">
            Proportional representation of clinical triage complaints across Himalayan Primary Health Centers.
          </p>

          <div className="space-y-3 pt-2">
            {trendsData?.disease_distribution?.map((item) => (
              <div key={item.code} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-primary">{item.name}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-primary">{item.count} cases ({item.percentage}%)</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                      item.trend.includes('⚠️') ? 'bg-rose-500/10 text-rose-600' : 'bg-gray-100 dark:bg-gray-800 text-muted'
                    }`}>
                      {item.trend}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Epidemic Curve Timeline */}
        <div className="bg-white dark:bg-warm-indigo rounded-3xl p-6 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-base text-primary flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-rose-500" /> Epidemic Curve & Daily Ingestion Trend
            </h3>
            <span className="text-[10px] font-bold text-muted uppercase">7-Day Rolling Trajectory</span>
          </div>

          <p className="text-xs text-muted">
            Temporal emergence curve showing acute gastroenteritis and seasonal viral spike patterns.
          </p>

          {/* Daily Timeline Mini Bars */}
          <div className="pt-4">
            <div className="h-44 flex items-end gap-1.5 justify-between px-2 pt-4 border-b border-gray-200 dark:border-gray-800">
              {trendsData?.daily_timeline?.slice(-18).map((day, idx) => {
                const maxVal = Math.max(...(trendsData?.daily_timeline?.map(d => d.total_cases) || [30]));
                const barHeight = Math.max(12, Math.round((day.total_cases / maxVal) * 130));

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg whitespace-nowrap z-20 pointer-events-none shadow-md">
                      {day.display_date}: {day.total_cases} cases ({day.red} Red)
                    </div>

                    <div
                      className="w-full rounded-t-lg transition-all duration-300 group-hover:brightness-125"
                      style={{
                        height: `${barHeight}px`,
                        backgroundColor: day.red > 2 ? '#EF4444' : (day.yellow > 5 ? '#F59E0B' : '#10B981'),
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between text-[10px] text-muted font-mono pt-2 px-2">
              <span>{trendsData?.daily_timeline?.slice(-18)[0]?.display_date || 'Start'}</span>
              <span>Daily Incident Load</span>
              <span>{trendsData?.daily_timeline?.slice(-1)[0]?.display_date || 'Today'}</span>
            </div>
          </div>

          {/* Demographic Cohort Vulnerability Cards */}
          <div className="grid grid-cols-3 gap-2.5 pt-2 text-xs">
            <div className="p-3 rounded-2xl bg-gray-50 dark:bg-card border border-gray-200/60 dark:border-gray-800">
              <span className="text-[10px] font-bold text-muted uppercase block">Pediatric (&lt;12)</span>
              <p className="font-bold text-sm text-primary mt-0.5">{trendsData?.demographics?.pediatric_under_12?.percentage}%</p>
              <p className="text-[10px] text-muted truncate mt-0.5">High Diarrheal Risk</p>
            </div>
            <div className="p-3 rounded-2xl bg-gray-50 dark:bg-card border border-gray-200/60 dark:border-gray-800">
              <span className="text-[10px] font-bold text-muted uppercase block">Adults (13-59)</span>
              <p className="font-bold text-sm text-primary mt-0.5">{trendsData?.demographics?.working_adults_13_59?.percentage}%</p>
              <p className="text-[10px] text-muted truncate mt-0.5">Viral & Typhoid</p>
            </div>
            <div className="p-3 rounded-2xl bg-gray-50 dark:bg-card border border-gray-200/60 dark:border-gray-800">
              <span className="text-[10px] font-bold text-muted uppercase block">Elderly (60+)</span>
              <p className="font-bold text-sm text-primary mt-0.5">{trendsData?.demographics?.geriatric_60_plus?.percentage}%</p>
              <p className="text-[10px] text-muted truncate mt-0.5">Hypoxia / Cardiac</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Village Vulnerability Matrix Ranking Table ────────────────── */}
      <div className="bg-white dark:bg-warm-indigo rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/60 dark:bg-card">
          <div>
            <h3 className="font-serif font-bold text-base text-primary flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gold-warm" /> Mountain Sector Vulnerability Matrix
            </h3>
            <p className="text-xs text-muted mt-0.5">Prioritized ranking of Chamoli villages by outbreak severity and frontline ASHA coverage.</p>
          </div>
          <span className="text-xs text-muted font-mono">{heatmapData?.sectors?.length || 0} Sectors Profiled</span>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[380px] overflow-y-auto">
          {heatmapData?.sectors?.map((s, idx) => (
            <div key={s.name} className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs hover:bg-gray-50/50 dark:hover:bg-card/40 transition-colors">
              <div className="flex items-center gap-3">
                <span className="w-6 text-center font-mono font-bold text-muted">{idx + 1}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-primary">{s.name}</p>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      s.status === 'CRITICAL' ? 'bg-rose-500 text-white' :
                      s.status === 'WARNING' ? 'bg-orange-500 text-white' :
                      s.status === 'ELEVATED' ? 'bg-amber-500 text-white' :
                      'bg-emerald-500 text-white'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    Primary Facility: {s.phc} • Block: {s.block} • Pop: ~{s.population?.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="font-bold text-sm text-primary">{s.active_cases} Cases</span>
                  <span className={`block text-[11px] font-bold ${s.trend_7d > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {s.trend_label} vs last week
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenDispatch(s)}
                    className="touch-target bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                    title="Dispatch Rapid Response Team"
                  >
                    Deploy
                  </button>
                  <button
                    onClick={() => handleOpenBroadcast(s)}
                    className="touch-target bg-gold-warm/20 hover:bg-gold-warm/30 text-amber-700 dark:text-gold-warm font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                    title="Issue Health Advisory"
                  >
                    Advisory
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Modal: Rapid Response ASHA Team Deployment ────────────────── */}
      {dispatchModalSector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-warm-indigo rounded-3xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <Send className="w-5 h-5 text-rose-500" />
                <h3 className="font-serif font-bold text-base">Deploy Field Rapid Response Unit</h3>
              </div>
              <button onClick={() => setDispatchModalSector(null)} className="text-muted hover:text-primary font-bold">✕</button>
            </div>

            <p className="text-xs text-muted">
              Dispatching rapid epidemiological intervention team to <strong className="text-primary">{dispatchModalSector.name}</strong> for active case finding, chlorine tablet distribution, and mobile triage.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-muted uppercase">Deployment Directives & Notes</label>
                <textarea
                  rows={3}
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-card border border-gray-300 dark:border-gray-700 text-primary rounded-xl p-3 text-xs mt-1 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDispatchModalSector(null)}
                className="touch-target text-xs text-muted hover:text-primary px-3 py-2 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={dispatching}
                onClick={handleConfirmDispatch}
                className="touch-target bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {dispatching ? 'Dispatching...' : 'Confirm Dispatch Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Issue Targeted Sector Advisory ────────────────────── */}
      {broadcastModalSector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-warm-indigo rounded-3xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <Megaphone className="w-5 h-5 text-gold-warm" />
                <h3 className="font-serif font-bold text-base">Issue Sector Health Advisory</h3>
              </div>
              <button onClick={() => setBroadcastModalSector(null)} className="text-muted hover:text-primary font-bold">✕</button>
            </div>

            <p className="text-xs text-muted">
              Broadcasting official CMO warning to all residents and ASHA tablets in <strong className="text-primary">{broadcastModalSector.name}</strong>.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-muted uppercase">Health Directive Message</label>
                <textarea
                  rows={3}
                  value={broadcastActionText}
                  onChange={(e) => setBroadcastActionText(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-card border border-gray-300 dark:border-gray-700 text-primary rounded-xl p-3 text-xs mt-1 focus:outline-none focus:ring-2 focus:ring-gold-warm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBroadcastModalSector(null)}
                className="touch-target text-xs text-muted hover:text-primary px-3 py-2 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={broadcasting}
                onClick={handleConfirmBroadcast}
                className="touch-target bg-gold-warm text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-gold-warm/90 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {broadcasting ? 'Publishing...' : 'Publish CMO Advisory'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
