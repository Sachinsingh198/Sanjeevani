import React, { useState, useEffect } from 'react';
import {
  fetchSystemConfig,
  updateSystemConfig,
  resetSystemConfig,
  testLlmLatency,
  purgeSystemCache,
  reindexKnowledgeStore,
} from '../api/authClient';
import {
  Sliders, Cpu, Mic, ShieldAlert, Sparkles, RefreshCw,
  Zap, Save, RotateCcw, CheckCircle2, AlertTriangle, Trash2,
  Database, Gauge, Shield, Server, Volume2, Globe, Plus, X
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminSystemConfigPanel() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Latency & Diagnostic Tests
  const [latencyTest, setLatencyTest] = useState(null);
  const [testingLatency, setTestingLatency] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [purgingCache, setPurgingCache] = useState(false);

  // New Keyword input
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await fetchSystemConfig();
      if (res?.config) {
        setConfig(res.config);
      }
    } catch {
      toast.error('Could not load dynamic system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await updateSystemConfig(config);
      if (res?.config) {
        setConfig(res.config);
      }
      toast.success('System configuration saved and applied in real-time! ⚡');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to update system configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Reset all system settings, models, and triage thresholds to factory defaults?')) return;
    try {
      const res = await resetSystemConfig();
      if (res?.config) {
        setConfig(res.config);
      }
      toast.success('System settings restored to defaults.');
    } catch {
      toast.error('Failed to reset configuration');
    }
  };

  const handleTestLatency = async () => {
    setTestingLatency(true);
    setLatencyTest(null);
    try {
      const res = await testLlmLatency();
      setLatencyTest(res);
      if (res.success) {
        toast.success(`LLM Ping OK: ${res.latency_ms}ms`);
      } else {
        toast.error(res.message || 'LLM ping test failed');
      }
    } catch {
      toast.error('LLM ping check failed');
    } finally {
      setTestingLatency(false);
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      const res = await reindexKnowledgeStore();
      toast.success(res.message || 'AYUSH / CCRAS Knowledge Store verified & re-indexed!');
    } catch {
      toast.error('Failed to reindex knowledge store');
    } finally {
      setReindexing(false);
    }
  };

  const handlePurgeCache = async () => {
    setPurgingCache(true);
    try {
      const res = await purgeSystemCache();
      toast.success(res.message || 'System caches purged successfully!');
    } catch {
      toast.error('Failed to clear cache');
    } finally {
      setPurgingCache(false);
    }
  };

  const handleAddKeyword = () => {
    if (!newKeyword.trim()) return;
    const current = config?.emergency_keywords || [];
    if (!current.includes(newKeyword.trim().toLowerCase())) {
      setConfig({
        ...config,
        emergency_keywords: [...current, newKeyword.trim().toLowerCase()],
      });
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (kwToRemove) => {
    setConfig({
      ...config,
      emergency_keywords: (config?.emergency_keywords || []).filter(kw => kw !== kwToRemove),
    });
  };

  if (loading || !config) {
    return (
      <div className="bg-white dark:bg-warm-indigo rounded-3xl p-8 border border-gray-200/80 dark:border-gray-800 text-center">
        <RefreshCw className="w-8 h-8 mx-auto mb-2 text-sage animate-spin" />
        <p className="text-xs text-muted font-mono">Loading dynamic system parameters...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* ── Control Panel Header ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-warm-indigo rounded-3xl p-5 sm:p-6 border border-gray-200/80 dark:border-gray-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-warm-indigo/10 text-warm-indigo dark:text-booti-glow text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
            <Sliders className="w-3.5 h-3.5" /> Zero-Downtime Live Governance
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-primary">
            System Control & AI Model Orchestration
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Modify AI models, triage trigger keywords, voice engines, and operational thresholds instantly without editing code.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="touch-target flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-card dark:hover:bg-card/80 text-muted hover:text-primary px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all border border-gray-200 dark:border-gray-800 cursor-pointer"
            title="Reset to factory settings"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>

          <button
            type="submit"
            disabled={saving}
            className="touch-target flex items-center gap-1.5 bg-sage hover:bg-sage/90 text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Applying...' : 'Save & Apply Live'}</span>
          </button>
        </div>
      </div>

      {/* ── Section 1: AI & LLM Model Orchestration ─────────────────────── */}
      <div className="bg-white dark:bg-warm-indigo rounded-3xl p-6 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sage/15 text-sage flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-primary">Primary Clinical LLM Engine</h3>
              <p className="text-xs text-muted">Select active foundation model and fine-tune inference parameters.</p>
            </div>
          </div>

          {/* Test Latency Action Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestLatency}
              disabled={testingLatency}
              className="touch-target flex items-center gap-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Zap className={`w-3.5 h-3.5 ${testingLatency ? 'animate-bounce' : ''}`} />
              <span>{testingLatency ? 'Testing...' : 'Test LLM Latency'}</span>
            </button>

            {latencyTest && (
              <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-xl border ${
                latencyTest.success ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
              }`}>
                {latencyTest.success ? `⚡ ${latencyTest.latency_ms} ms` : '❌ Offline'}
              </span>
            )}
          </div>
        </div>

        {/* Provider Switcher Tabs */}
        <div>
          <label className="text-[10px] font-bold text-muted uppercase block mb-2">Active LLM Provider</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'groq', label: 'Groq Cloud Llama', desc: 'Ultra-fast LPU inference (Primary CDSS)', badge: 'Recommended' },
              { id: 'gemini', label: 'Google Gemini 1.5', desc: 'Deep multimodal & complex reasoning', badge: 'High Precision' },
              { id: 'sarvam', label: 'Sarvam Indic LLM', desc: 'Indigenous Indic bilingual specialization', badge: 'Bilingual' },
            ].map((p) => {
              const active = config.primary_llm_provider === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setConfig({ ...config, primary_llm_provider: p.id })}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    active
                      ? 'border-sage bg-sage/5 dark:bg-sage/10 shadow-xs'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-primary">{p.label}</span>
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      active ? 'bg-sage text-white' : 'bg-gray-100 dark:bg-gray-800 text-muted'
                    }`}>
                      {p.badge}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Model Identifier Dropdowns according to Provider */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {config.primary_llm_provider === 'groq' && (
            <div>
              <label className="text-[10px] font-bold text-muted uppercase block mb-1">Groq Model Identifier</label>
              <select
                value={config.groq_model || 'openai/gpt-oss-120b'}
                onChange={(e) => setConfig({ ...config, groq_model: e.target.value })}
                className="w-full bg-gray-50 dark:bg-card border border-gray-300 dark:border-gray-700 text-primary rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sage"
              >
                <option value="openai/gpt-oss-120b">openai/gpt-oss-120b (Production Default)</option>
                <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (State-of-the-Art)</option>
                <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Low Latency / Edge)</option>
                <option value="mixtral-8x7b-32768">mixtral-8x7b-32768 (MoE Clinical)</option>
              </select>
            </div>
          )}

          {config.primary_llm_provider === 'gemini' && (
            <div>
              <label className="text-[10px] font-bold text-muted uppercase block mb-1">Gemini Model Identifier</label>
              <select
                value={config.gemini_model || 'gemini-1.5-flash'}
                onChange={(e) => setConfig({ ...config, gemini_model: e.target.value })}
                className="w-full bg-gray-50 dark:bg-card border border-gray-300 dark:border-gray-700 text-primary rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sage"
              >
                <option value="gemini-1.5-flash">gemini-1.5-flash (Fast Clinical Response)</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro (Complex Diagnostic Synthesis)</option>
                <option value="gemini-2.0-flash">gemini-2.0-flash (Experimental)</option>
              </select>
            </div>
          )}

          {config.primary_llm_provider === 'sarvam' && (
            <div>
              <label className="text-[10px] font-bold text-muted uppercase block mb-1">Sarvam Model Identifier</label>
              <select
                value={config.sarvam_model || 'sarvam-30b'}
                onChange={(e) => setConfig({ ...config, sarvam_model: e.target.value })}
                className="w-full bg-gray-50 dark:bg-card border border-gray-300 dark:border-gray-700 text-primary rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sage"
              >
                <option value="sarvam-30b">sarvam-30b (Standard Indic LLM)</option>
              </select>
            </div>
          )}

          {/* Temperature & Token Controls */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-bold text-muted uppercase">Inference Temperature</label>
              <span className="text-xs font-mono font-bold text-sage">{config.temperature || 0.3}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={config.temperature || 0.3}
              onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
              className="w-full accent-sage cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-muted font-mono mt-0.5">
              <span>0.0 (Strict / Deterministic)</span>
              <span>1.0 (Creative)</span>
            </div>
          </div>
        </div>

        {/* Custom Clinical System Prompt Override */}
        <div>
          <label className="text-[10px] font-bold text-muted uppercase block mb-1">
            Clinical CDSS System Prompt Guidance (Optional Override)
          </label>
          <textarea
            rows={3}
            value={config.custom_system_prompt || ''}
            onChange={(e) => setConfig({ ...config, custom_system_prompt: e.target.value })}
            placeholder="Add specific triage instructions or guidelines (e.g. Prioritize hydration and AYUSH remedies for elderly patients during monsoon season)..."
            className="w-full bg-gray-50 dark:bg-card border border-gray-300 dark:border-gray-700 text-primary rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-sage"
          />
        </div>
      </div>

      {/* ── Section 2: Voice & Speech Engine Controls ───────────────────── */}
      <div className="bg-white dark:bg-warm-indigo rounded-3xl p-6 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="w-9 h-9 rounded-xl bg-gold-warm/20 text-gold-warm flex items-center justify-center">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-primary">Voice & Speech Synthesis (TTS / STT)</h3>
            <p className="text-xs text-muted">Configure Indic neural voice models, speed rates, and dialect assistance.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-bold text-muted uppercase block mb-1">Primary Voice Engine</label>
            <select
              value={config.primary_voice_provider || 'bhashini'}
              onChange={(e) => setConfig({ ...config, primary_voice_provider: e.target.value })}
              className="w-full bg-gray-50 dark:bg-card border border-gray-300 dark:border-gray-700 text-primary rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sage"
            >
              <option value="bhashini">Bhashini (MeitY AI4Bharat) • Primary</option>
              <option value="sarvam">Sarvam AI (Bulbul:v3) • Neural Indic</option>
              <option value="indic_parler">Indic-Parler TTS • Local On-Device</option>
              <option value="edge_tts">Microsoft Edge Neural (hi-IN) • Fallback</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-bold text-muted uppercase">Audio Speech Rate</label>
              <span className="text-xs font-mono font-bold text-gold-warm">{config.tts_speed || 1.0}x</span>
            </div>
            <input
              type="range"
              min="0.75"
              max="1.5"
              step="0.05"
              value={config.tts_speed || 1.0}
              onChange={(e) => setConfig({ ...config, tts_speed: parseFloat(e.target.value) })}
              className="w-full accent-gold-warm cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-muted font-mono mt-0.5">
              <span>0.75x (Elderly Patient Friendly)</span>
              <span>1.5x (Fast)</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted uppercase block mb-1">Preferred Speaker Voice</label>
            <select
              value={config.preferred_speaker_gender || 'female'}
              onChange={(e) => setConfig({ ...config, preferred_speaker_gender: e.target.value })}
              className="w-full bg-gray-50 dark:bg-card border border-gray-300 dark:border-gray-700 text-primary rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sage"
            >
              <option value="female">Female Voice (Divya / Shreya / Swara)</option>
              <option value="male">Male Voice (Rohit / Rahul / Madhur)</option>
            </select>
          </div>
        </div>

        {/* Dialect Assistance Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-card border border-gray-200/60 dark:border-gray-800">
          <div>
            <span className="font-bold text-xs text-primary block">Himalayan Dialect Assistance (Garhwali / Kumaoni)</span>
            <span className="text-[11px] text-muted">Auto-adapts clinical questions into conversational mountain phrasing.</span>
          </div>
          <input
            type="checkbox"
            checked={!!config.dialect_assistance}
            onChange={(e) => setConfig({ ...config, dialect_assistance: e.target.checked })}
            className="w-4 h-4 accent-sage cursor-pointer"
          />
        </div>
      </div>

      {/* ── Section 3: Clinical Safety & Triage Thresholds ──────────────── */}
      <div className="bg-white dark:bg-warm-indigo rounded-3xl p-6 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-primary">Emergency Triage & Safety Thresholds</h3>
            <p className="text-xs text-muted">Manage Red-tier escalation triggers and forced early conclusion limits.</p>
          </div>
        </div>

        {/* Red Tier Trigger Keywords Manager */}
        <div>
          <label className="text-[10px] font-bold text-muted uppercase block mb-1">
            Red-Tier Emergency Escalation Keywords ({config.emergency_keywords?.length || 0})
          </label>
          <p className="text-[11px] text-muted mb-2">When user message matches any of these, triage escalates immediately to Red Tier.</p>

          <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-gray-50 dark:bg-card border border-gray-300 dark:border-gray-700 min-h-[60px]">
            {config.emergency_keywords?.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1.5 bg-rose-500/15 text-rose-700 dark:text-rose-300 text-xs font-semibold px-2.5 py-1 rounded-xl border border-rose-500/20"
              >
                <span>{kw}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveKeyword(kw)}
                  className="hover:text-rose-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddKeyword(); } }}
              placeholder="Add new emergency trigger phrase (e.g. chhati me tej dard)..."
              className="bg-white dark:bg-card border border-gray-300 dark:border-gray-700 text-primary rounded-xl px-3 py-2 text-xs flex-1 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <button
              type="button"
              onClick={handleAddKeyword}
              className="touch-target bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              Add Keyword
            </button>
          </div>
        </div>

        {/* Max Turns & Auto-Dispatch Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="text-[10px] font-bold text-muted uppercase block mb-1">Max Triage Turns Before Summary</label>
            <select
              value={config.max_triage_turns || 5}
              onChange={(e) => setConfig({ ...config, max_triage_turns: parseInt(e.target.value) })}
              className="w-full bg-gray-50 dark:bg-card border border-gray-300 dark:border-gray-700 text-primary rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sage"
            >
              <option value="3">3 Turns (Rapid / High Emergency)</option>
              <option value="4">4 Turns (Balanced)</option>
              <option value="5">5 Turns (Standard Clinical CDSS)</option>
              <option value="8">8 Turns (Thorough / Elder Exploration)</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-card border border-gray-200/60 dark:border-gray-800">
            <div>
              <span className="font-bold text-xs text-primary block">Auto-Dispatch 108 EMS Alert</span>
              <span className="text-[11px] text-muted">Automatically creates Red-tier alert on critical symptom.</span>
            </div>
            <input
              type="checkbox"
              checked={!!config.auto_dispatch_sos}
              onChange={(e) => setConfig({ ...config, auto_dispatch_sos: e.target.checked })}
              className="w-4 h-4 accent-rose-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Safety Disclaimer Editor */}
        <div>
          <label className="text-[10px] font-bold text-muted uppercase block mb-1">Safety Disclaimer Notice</label>
          <input
            type="text"
            value={config.safety_disclaimer_text || ''}
            onChange={(e) => setConfig({ ...config, safety_disclaimer_text: e.target.value })}
            className="w-full bg-gray-50 dark:bg-card border border-gray-300 dark:border-gray-700 text-primary rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-sage"
          />
        </div>
      </div>

      {/* ── Section 4: Operational System Actions ───────────────────────── */}
      <div className="bg-white dark:bg-warm-indigo rounded-3xl p-6 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 flex items-center justify-center">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-primary">System Operations & Knowledge Store</h3>
            <p className="text-xs text-muted">Trigger cluster vector re-indexing, cache purges, and maintenance controls.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-card border border-gray-200/60 dark:border-gray-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-primary block">AYUSH & CCRAS Vector Knowledge Store</span>
              <span className="text-[11px] text-muted">Reloads Qdrant remedy embeddings in memory.</span>
            </div>
            <button
              type="button"
              onClick={handleReindex}
              disabled={reindexing}
              className="touch-target bg-sage hover:bg-sage/90 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {reindexing ? 'Syncing...' : 'Re-Index'}
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-card border border-gray-200/60 dark:border-gray-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-primary block">Purge TTS & Audio Cache</span>
              <span className="text-[11px] text-muted">Clears cached audio files from disk.</span>
            </div>
            <button
              type="button"
              onClick={handlePurgeCache}
              disabled={purgingCache}
              className="touch-target bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {purgingCache ? 'Purging...' : 'Purge Cache'}
            </button>
          </div>
        </div>

        {/* Feature Flags Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-card border border-gray-200/60 dark:border-gray-800 cursor-pointer">
            <span className="text-xs font-semibold text-primary">Rate Limiting</span>
            <input
              type="checkbox"
              checked={!!config.enable_rate_limiting}
              onChange={(e) => setConfig({ ...config, enable_rate_limiting: e.target.checked })}
              className="w-4 h-4 accent-sage"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-card border border-gray-200/60 dark:border-gray-800 cursor-pointer">
            <span className="text-xs font-semibold text-primary">Dev OTP Hint / Bypass</span>
            <input
              type="checkbox"
              checked={!!config.enable_dev_otp_hint}
              onChange={(e) => setConfig({ ...config, enable_dev_otp_hint: e.target.checked })}
              className="w-4 h-4 accent-gold-warm"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-card border border-gray-200/60 dark:border-gray-800 cursor-pointer">
            <span className="text-xs font-semibold text-primary">Offline ASHA Sync</span>
            <input
              type="checkbox"
              checked={!!config.offline_sync_mode}
              onChange={(e) => setConfig({ ...config, offline_sync_mode: e.target.checked })}
              className="w-4 h-4 accent-sky-600"
            />
          </label>
        </div>
      </div>
    </form>
  );
}
