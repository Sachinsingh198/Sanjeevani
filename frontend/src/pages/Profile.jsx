import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import {
  updateUserProfile,
  changeUserPassword,
  fetchMyActivity,
  fetchAshaActivity
} from '../api/authClient';
import toast from 'react-hot-toast';
import {
  User, Shield, Activity, KeyRound, Lock, Phone, Mail, MapPin,
  Heart, AlertTriangle, CheckCircle2, Clock, Globe, Volume2,
  Moon, Sun, Save, RefreshCw, Smartphone, Stethoscope, Sparkles,
  Building2, BadgeCheck, FileText, ChevronRight, Eye, ShieldAlert,
  LogOut, Calendar, Layers, ShieldCheck, HeartPulse
} from 'lucide-react';
import SanjeevaniOrb from '../components/SanjeevaniOrb';

const COMMON_CONDITIONS = [
  'Hypertension (हाई बीपी)',
  'Type 2 Diabetes (मधुमेह)',
  'Asthma / Respiratory (दमा / सांस की दिक्कत)',
  'Joint Pain / Arthritis (जोड़ों का दर्द)',
  'Thyroid (थायराइड)',
  'Acidity / GERD (गैस / पित्त)',
];

export default function Profile() {
  const { user, updateUser, isAdmin, isAsha, isPatient, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const [activeTab, setActiveTab] = useState('personal'); // personal, health_or_role, activity, settings

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    age: user?.age || '',
    gender: user?.gender || 'Not Specified',
    blood_group: user?.blood_group || '',
    village: user?.village || '',
    district: user?.district || 'Chamoli',
    state: user?.state || 'Uttarakhand',
    emergency_contact_name: user?.emergency_contact_name || '',
    emergency_contact_phone: user?.emergency_contact_phone || '',
    language_preference: user?.language_preference || 'hi',
    comorbidities: user?.comorbidities || '',
    allergies: user?.allergies || '',
    worker_id: user?.worker_id || '',
    assigned_phc: user?.assigned_phc || '',
    abha_id: user?.abha_id || '',
  });

  const [savingProfile, setSavingProfile] = useState(false);

  // App Settings State (stored in user.settings_json or local fallback)
  const rawSettingsJson = user?.settings_json;
  const parsedSettings = useMemo(() => {
    try {
      return rawSettingsJson ? JSON.parse(rawSettingsJson) : {};
    } catch {
      return {};
    }
  }, [rawSettingsJson]);

  const [ttsSpeed, setTtsSpeed] = useState(parsedSettings.tts_speed || '1.0');
  const [dialectAssistance, setDialectAssistance] = useState(parsedSettings.dialect_assistance ?? true);
  const [healthAlerts, setHealthAlerts] = useState(parsedSettings.health_alerts ?? true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Password Change State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Activity Log State
  const [activities, setActivities] = useState([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityFilter, setActivityFilter] = useState('ALL');
  const [ashaScope, setAshaScope] = useState('my'); // 'my' or 'village'

  // Update form state if user object updates from backend
  useEffect(() => {
    if (user) {
      setProfileForm((prev) => ({
        ...prev,
        name: user.name || '',
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || '',
        age: user.age || '',
        gender: user.gender || 'Not Specified',
        blood_group: user.blood_group || '',
        village: user.village || '',
        district: user.district || 'Chamoli',
        state: user.state || 'Uttarakhand',
        emergency_contact_name: user.emergency_contact_name || '',
        emergency_contact_phone: user.emergency_contact_phone || '',
        language_preference: user.language_preference || 'hi',
        comorbidities: user.comorbidities || '',
        allergies: user.allergies || '',
        worker_id: user.worker_id || '',
        assigned_phc: user.assigned_phc || '',
        abha_id: user.abha_id || '',
      }));
    }
  }, [user]);

  const loadActivities = useCallback(async () => {
    setLoadingActivity(true);
    try {
      const params = {};
      if (activityFilter !== 'ALL') {
        params.action = activityFilter;
      }
      let res;
      if (isAsha && ashaScope === 'village') {
        res = await fetchAshaActivity(params);
      } else {
        res = await fetchMyActivity(params);
      }
      setActivities(res.activities || []);
      setActivityTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to load user activity logs', err);
      toast.error('गतिविधि इतिहास लोड करने में समस्या आई।');
    } finally {
      setLoadingActivity(false);
    }
  }, [activityFilter, isAsha, ashaScope]);

  // Load activities when tab or filter changes
  useEffect(() => {
    if (activeTab === 'activity') {
      loadActivities();
    }
  }, [activeTab, loadActivities]);

  // Profile completion calculation
  const completionPercentage = useMemo(() => {
    const fields = [
      profileForm.name,
      profileForm.phone,
      profileForm.username,
      profileForm.village,
      profileForm.age,
      profileForm.gender && profileForm.gender !== 'Not Specified',
      profileForm.blood_group,
      isPatient ? (profileForm.abha_id || profileForm.emergency_contact_phone) : (profileForm.worker_id || profileForm.assigned_phc)
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }, [profileForm, isPatient]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const payload = {
        name: profileForm.name.trim(),
        username: profileForm.username.trim() || null,
        email: profileForm.email.trim() || null,
        village: profileForm.village.trim(),
        age: profileForm.age ? parseInt(profileForm.age, 10) : null,
        gender: profileForm.gender,
        district: profileForm.district.trim(),
        state: profileForm.state.trim(),
        blood_group: profileForm.blood_group.trim() || null,
        emergency_contact_name: profileForm.emergency_contact_name.trim() || null,
        emergency_contact_phone: profileForm.emergency_contact_phone.trim() || null,
        language_preference: profileForm.language_preference,
        comorbidities: profileForm.comorbidities.trim() || null,
        allergies: profileForm.allergies.trim() || null,
        worker_id: profileForm.worker_id.trim() || null,
        assigned_phc: profileForm.assigned_phc.trim() || null,
        abha_id: profileForm.abha_id.trim() || null,
      };

      const updated = await updateUserProfile(payload);
      updateUser(updated);
      toast.success('प्रोफाइल विवरण सफलतापूर्वक सुरक्षित कर लिया गया है!');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'प्रोफाइल अपडेट करने में त्रुटि हुई।';
      toast.error(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSettingsSave = async () => {
    setSavingSettings(true);
    try {
      const newSettings = {
        ...parsedSettings,
        tts_speed: ttsSpeed,
        dialect_assistance: dialectAssistance,
        health_alerts: healthAlerts,
      };
      const updated = await updateUserProfile({
        settings_json: JSON.stringify(newSettings),
        language_preference: profileForm.language_preference,
      });
      updateUser(updated);
      toast.success('प्राथमिकताएं (Settings) सुरक्षित कर ली गई हैं!');
    } catch (err) {
      toast.error('सेटिंग्स सुरक्षित करने में त्रुटि हुई।');
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!oldPassword) {
      toast.error('वर्तमान (पुराना) पासवर्ड दर्ज करें।');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('नया पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते।');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await changeUserPassword(oldPassword, newPassword);
      toast.success(res.message || 'पासवर्ड सफलतापूर्वक बदल दिया गया है!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'पासवर्ड बदलने में त्रुटि हुई।';
      toast.error(msg);
    } finally {
      setChangingPassword(false);
    }
  };

  const toggleCondition = (condition) => {
    const current = profileForm.comorbidities ? profileForm.comorbidities.split(',').map((s) => s.trim()) : [];
    let updated;
    if (current.includes(condition)) {
      updated = current.filter((c) => c !== condition);
    } else {
      updated = [...current, condition];
    }
    setProfileForm({ ...profileForm, comorbidities: updated.join(', ') });
  };

  const getActionBadgeColor = (action) => {
    switch (action) {
      case 'LOGIN':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'LOGOUT':
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
      case 'REGISTER':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'CONSULTATION':
        return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
      case 'SCREENING':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 'WELLNESS':
        return 'bg-emerald-500/10 text-sage dark:text-booti-glow border-sage/20';
      case 'EMERGENCY_SOS':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'ASHA_SYNC':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'PROFILE_UPDATE':
      case 'PASSWORD_CHANGE':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'LOGIN':
      case 'LOGOUT':
        return Smartphone;
      case 'CONSULTATION':
        return Stethoscope;
      case 'SCREENING':
        return Eye;
      case 'WELLNESS':
        return Sparkles;
      case 'EMERGENCY_SOS':
        return AlertTriangle;
      case 'ASHA_SYNC':
        return RefreshCw;
      case 'PROFILE_UPDATE':
        return User;
      case 'PASSWORD_CHANGE':
        return KeyRound;
      default:
        return Activity;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 animate-fadeIn">
      {/* ── 1. Hero Header & Identity Card ──────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-warm-indigo via-warm-indigo/95 to-primary p-6 sm:p-8 text-white shadow-xl border border-white/10">
        <div className="absolute -right-12 -top-12 opacity-15 pointer-events-none">
          <SanjeevaniOrb state="idle" size={240} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="relative">
              <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl sm:text-4xl shadow-inner font-serif font-bold text-gold-warm">
                {profileForm.name ? profileForm.name[0].toUpperCase() : 'U'}
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 bg-sage rounded-full text-white shadow-md" title="Verified Profile">
                <BadgeCheck className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif font-bold tracking-tight text-white">
                  {profileForm.name || 'Sanjeevani User'}
                </h1>
                <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  isAdmin
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : isAsha
                    ? 'bg-gold-warm/25 text-gold-warm border-gold-warm/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}>
                  {isAdmin ? '🛡️ Administrator' : isAsha ? '🩺 ASHA Field Worker' : '🌿 Sanjeevani Mitra'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs sm:text-sm text-white/80 font-sans">
                {profileForm.username && (
                  <span className="flex items-center gap-1 font-mono text-white/90">
                    @{profileForm.username}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gold-warm" />
                  {profileForm.village || 'Gopeshwar'}, {profileForm.district}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  {profileForm.phone}
                </span>
              </div>

              {/* Official Identifier Badge */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {isAsha && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 text-xs font-semibold text-gold-warm border border-white/10">
                    <Building2 className="w-3.5 h-3.5" />
                    ASHA ID: {profileForm.worker_id || 'ASHA-CHAM-042'} • PHC: {profileForm.assigned_phc || 'Gopeshwar'}
                  </span>
                )}
                {isPatient && profileForm.abha_id && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 text-xs font-semibold text-emerald-300 border border-white/10">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    ABHA: {profileForm.abha_id}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Profile Completion Meter */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 min-w-[200px]">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-white/80">Profile Health</span>
              <span className="text-gold-warm font-mono font-bold">{completionPercentage}%</span>
            </div>
            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gold-warm h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <p className="text-[11px] text-white/70 mt-2">
              {completionPercentage >= 80 ? '✨ Complete medical profile' : 'ℹ️ Fill health details for better care'}
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. Navigation Tabs ────────────────────────────────────────────── */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 p-1.5 bg-gray-100 dark:bg-warm-indigo/30 rounded-2xl border border-gray-200 dark:border-white/10">
        <button
          onClick={() => setActiveTab('personal')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'personal'
              ? 'bg-sage text-white shadow-xs'
              : 'text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <User className="w-4 h-4" />
          <span>व्यक्तिगत प्रोफाइल (Personal)</span>
        </button>

        <button
          onClick={() => setActiveTab('health_or_role')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'health_or_role'
              ? 'bg-sage text-white shadow-xs'
              : 'text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          {isAsha ? <Building2 className="w-4 h-4" /> : <HeartPulse className="w-4 h-4" />}
          <span>{isAsha ? 'ASHA कार्य क्षेत्र (Field Info)' : 'स्वास्थ्य विवरण (Health & ABHA)'}</span>
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'activity'
              ? 'bg-sage text-white shadow-xs'
              : 'text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>गतिविधि इतिहास (Activity Logs)</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-sage text-white shadow-xs'
              : 'text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>सुरक्षा व सेटिंग्स (Security & Preferences)</span>
        </button>
      </div>

      {/* ── 3. Tab Contents ──────────────────────────────────────────────── */}

      {/* ── TAB 1: Personal Details ── */}
      {activeTab === 'personal' && (
        <form onSubmit={handleProfileSave} className="bg-white dark:bg-warm-indigo/40 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-white/10 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-serif font-bold text-primary">व्यक्तिगत जानकारी (Personal Information)</h2>
              <p className="text-xs text-muted mt-0.5">Manage your contact, residential, and account identity details.</p>
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="flex items-center gap-1.5 bg-sage hover:bg-sage/90 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingProfile ? 'सुरक्षित हो रहा है...' : 'सुरक्षित करें (Save)'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1.5">पूरा नाम (Full Name) *</label>
              <input
                type="text"
                required
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/15 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-sage"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1.5">उपयोगकर्ता नाम (Username)</label>
              <input
                type="text"
                value={profileForm.username}
                onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/15 text-sm text-primary font-mono focus:outline-none focus:ring-2 focus:ring-sage"
              />
            </div>

            {/* Mobile Number (Read-only badge) */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1.5 flex items-center justify-between">
                <span>मोबाइल नंबर (Phone)</span>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" /> सत्यापित (Verified)
                </span>
              </label>
              <input
                type="text"
                disabled
                value={profileForm.phone}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-sm text-muted cursor-not-allowed font-mono"
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1.5">ईमेल / जीमेल (Email)</label>
              <input
                type="email"
                placeholder="name@example.com"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/15 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-sage"
              />
            </div>

            {/* Age */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1.5">आयु (Age in years)</label>
              <input
                type="number"
                min="1"
                max="120"
                placeholder="e.g. 35"
                value={profileForm.age}
                onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/15 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-sage"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1.5">लिंग (Gender)</label>
              <select
                value={profileForm.gender}
                onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/15 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-sage"
              >
                <option value="Not Specified">Not Specified (उल्लेख नहीं)</option>
                <option value="Female">Female (महिला)</option>
                <option value="Male">Male (पुरुष)</option>
                <option value="Other">Other (अन्य)</option>
              </select>
            </div>

            {/* Blood Group */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1.5">रक्त समूह (Blood Group)</label>
              <select
                value={profileForm.blood_group}
                onChange={(e) => setProfileForm({ ...profileForm, blood_group: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/15 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-sage"
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>

            {/* Village / Gram Panchayat */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1.5">गांव / कस्बा (Village / Town)</label>
              <input
                type="text"
                placeholder="e.g. Mandal, Gopeshwar Ward 3"
                value={profileForm.village}
                onChange={(e) => setProfileForm({ ...profileForm, village: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/15 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-sage"
              />
            </div>

            {/* District */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1.5">जनपद (District)</label>
              <input
                type="text"
                value={profileForm.district}
                onChange={(e) => setProfileForm({ ...profileForm, district: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/15 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-sage"
              />
            </div>
          </div>
        </form>
      )}

      {/* ── TAB 2: Health Details (Mitra) or Role Credentials (ASHA) ── */}
      {activeTab === 'health_or_role' && (
        <div className="space-y-6">
          {isPatient ? (
            /* PATIENT / CITIZEN HEALTH DETAILS */
            <form onSubmit={handleProfileSave} className="bg-white dark:bg-warm-indigo/40 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-white/10 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-4">
                <div>
                  <h2 className="text-lg font-serif font-bold text-primary">स्वास्थ्य व आपातकालीन विवरण (Health Profile)</h2>
                  <p className="text-xs text-muted mt-0.5">Helps Dr. Sanjeevani provide clinically tailored remedies and prevents drug interactions.</p>
                </div>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex items-center gap-1.5 bg-sage hover:bg-sage/90 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingProfile ? 'सुरक्षित हो रहा है...' : 'सुरक्षित करें'}</span>
                </button>
              </div>

              {/* Ayushman Bharat ABHA Card Widget */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-sage/10 to-teal-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-primary">आयुष्मान भारत ABHA Health Account</h3>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-600 px-1.5 py-0.2 rounded font-bold">National Digital Health</span>
                    </div>
                    <p className="text-xs text-muted mt-0.5">Integrate with ABDM (Ayushman Bharat Digital Mission) for digital OPD & records.</p>
                  </div>
                </div>

                <div className="w-full sm:w-72">
                  <input
                    type="text"
                    placeholder="e.g. 91-1234-5678-9012"
                    value={profileForm.abha_id}
                    onChange={(e) => setProfileForm({ ...profileForm, abha_id: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-white/10 border border-emerald-500/30 text-xs sm:text-sm font-mono text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-primary mb-1.5 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-soft" />
                    <span>आपातकालीन संपर्क का नाम (Emergency Contact Name)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Spouse, Parent, or Local Kin"
                    value={profileForm.emergency_contact_name}
                    onChange={(e) => setProfileForm({ ...profileForm, emergency_contact_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/15 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-sage"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-rose-soft" />
                    <span>आपातकालीन फोन (Emergency Contact Phone)</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={profileForm.emergency_contact_phone}
                    onChange={(e) => setProfileForm({ ...profileForm, emergency_contact_phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/15 text-sm text-primary font-mono focus:outline-none focus:ring-2 focus:ring-sage"
                  />
                </div>
              </div>

              {/* Comorbidities & Chronic Conditions */}
              <div>
                <label className="block text-xs font-bold text-primary mb-2">
                  पुरानी बीमारियां / शारीरिक स्थिति (Chronic Conditions / Comorbidities)
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {COMMON_CONDITIONS.map((cond) => {
                    const isSelected = profileForm.comorbidities && profileForm.comorbidities.includes(cond);
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => toggleCondition(cond)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sage text-white border-sage shadow-xs'
                            : 'bg-gray-50 dark:bg-white/5 text-muted hover:border-sage/40'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '} {cond}
                      </button>
                    );
                  })}
                </div>
                <textarea
                  rows="2"
                  placeholder="अन्य चिकित्सीय स्थिति यहां लिखें (e.g. Heart surgery 2023, Kidney stones)..."
                  value={profileForm.comorbidities}
                  onChange={(e) => setProfileForm({ ...profileForm, comorbidities: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/15 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-sage"
                />
              </div>

              {/* Known Drug Allergies */}
              <div>
                <label className="block text-xs font-bold text-primary mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>दवाओं से एलर्जी (Drug / Food Allergies)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Sulfa drugs, Peanuts, Pollen"
                  value={profileForm.allergies}
                  onChange={(e) => setProfileForm({ ...profileForm, allergies: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/15 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-sage"
                />
              </div>
            </form>
          ) : (
            /* ASHA FIELD WORKER ROLE PROFILE */
            <form onSubmit={handleProfileSave} className="bg-white dark:bg-warm-indigo/40 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-white/10 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-4">
                <div>
                  <h2 className="text-lg font-serif font-bold text-primary">ASHA कार्य क्षेत्र व प्रमाणन (Field Worker Credentials)</h2>
                  <p className="text-xs text-muted mt-0.5">Government accredited village health activist assignment details.</p>
                </div>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex items-center gap-1.5 bg-gold-warm text-primary font-bold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingProfile ? 'सुरक्षित हो रहा है...' : 'सुरक्षित करें'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-primary mb-1.5">ASHA पंजीकरण आईडी (Worker ID)</label>
                  <input
                    type="text"
                    placeholder="e.g. ASHA-UK-CHAM-042"
                    value={profileForm.worker_id}
                    onChange={(e) => setProfileForm({ ...profileForm, worker_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/15 text-sm text-primary font-mono focus:outline-none focus:ring-2 focus:ring-gold-warm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary mb-1.5">संबद्ध प्राथमिक स्वास्थ्य केंद्र (Assigned PHC / Sub-Centre)</label>
                  <input
                    type="text"
                    placeholder="e.g. PHC Mandal / CHC Gopeshwar"
                    value={profileForm.assigned_phc}
                    onChange={(e) => setProfileForm({ ...profileForm, assigned_phc: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/15 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-gold-warm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary mb-1.5">कवरेज ग्राम पंचायत (Assigned Gram Panchayat)</label>
                  <input
                    type="text"
                    value={profileForm.village}
                    onChange={(e) => setProfileForm({ ...profileForm, village: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/15 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-gold-warm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary mb-1.5">जिला चिकित्सालय (District Hospital Linkage)</label>
                  <input
                    type="text"
                    disabled
                    value="District Hospital Gopeshwar (Chamoli)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-sm text-muted cursor-not-allowed"
                  />
                </div>
              </div>

              {/* ASHA Field Card Notice */}
              <div className="p-4 rounded-2xl bg-gold-warm/15 border border-gold-warm/30 flex items-start gap-3">
                <BadgeCheck className="w-5 h-5 text-gold-warm shrink-0 mt-0.5" />
                <div className="text-xs text-primary space-y-1">
                  <p className="font-bold">Offline-First Field Sync Active</p>
                  <p className="text-muted">Encounters logged offline in remote Himalayan valleys are auto-stamped with your ASHA Worker ID and batch synced to the state NHM registry once cellular or WiFi signal is restored.</p>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── TAB 3: Activity & Audit Logs ── */}
      {activeTab === 'activity' && (
        <div className="bg-white dark:bg-warm-indigo/40 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-white/10 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-serif font-bold text-primary">गतिविधि इतिहास व ऑडिट ट्रेल (Activity Logs)</h2>
                <span className="text-xs font-mono font-bold bg-sage/15 text-sage dark:text-booti-glow px-2 py-0.5 rounded-full">
                  {activityTotal} Recorded
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">Chronological record of logins, consultations, eye screenings, and offline synchronizations.</p>
            </div>

            <div className="flex items-center gap-2">
              {/* For ASHA worker: Scope Toggle */}
              {isAsha && (
                <div className="flex bg-gray-100 dark:bg-white/10 p-1 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setAshaScope('my')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      ashaScope === 'my' ? 'bg-white dark:bg-warm-indigo text-primary shadow-xs' : 'text-muted'
                    }`}
                  >
                    My Activity
                  </button>
                  <button
                    onClick={() => setAshaScope('village')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      ashaScope === 'village' ? 'bg-gold-warm text-primary shadow-xs' : 'text-muted'
                    }`}
                  >
                    Village Operations
                  </button>
                </div>
              )}

              <button
                onClick={loadActivities}
                disabled={loadingActivity}
                className="p-2 rounded-xl bg-gray-100 dark:bg-white/10 text-muted hover:text-primary transition-all cursor-pointer"
                title="Refresh Activity"
              >
                <RefreshCw className={`w-4 h-4 ${loadingActivity ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1">
            {['ALL', 'LOGIN', 'LOGOUT', 'CONSULTATION', 'SCREENING', 'WELLNESS', 'EMERGENCY_SOS', 'ASHA_SYNC'].map((actionKey) => (
              <button
                key={actionKey}
                onClick={() => setActivityFilter(actionKey)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer whitespace-nowrap ${
                  activityFilter === actionKey
                    ? 'bg-sage text-white border-sage shadow-xs'
                    : 'bg-gray-50 dark:bg-white/5 text-muted hover:border-sage/40'
                }`}
              >
                {actionKey}
              </button>
            ))}
          </div>

          {/* Activity Timeline List */}
          {loadingActivity ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-sage" />
              <p className="text-xs text-muted">गतिविधि लोड हो रही है...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="py-12 text-center text-muted text-xs bg-gray-50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
              <Activity className="w-8 h-8 mx-auto mb-2 text-muted/50" />
              <p className="font-bold text-sm text-primary mb-1">कोई गतिविधि रिकॉर्ड नहीं मिली</p>
              <p>No activity logs match the selected filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((act) => {
                const Icon = getActionIcon(act.action);
                const colorClass = getActionBadgeColor(act.action);
                const formattedTime = new Date(act.created_at).toLocaleString('hi-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={act.id}
                    className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 flex items-start gap-3.5 hover:border-sage/40 transition-all"
                  >
                    <div className={`p-2.5 rounded-xl border shrink-0 ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${colorClass}`}>
                            {act.action}
                          </span>
                          {act.user_role && (
                            <span className="text-[10px] text-muted capitalize">
                              by {act.user_name || act.user_role}
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-muted font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formattedTime}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm font-semibold text-primary mt-1.5 leading-snug">
                        {act.description || `${act.action} event`}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-muted font-mono">
                        {act.village && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gold-warm" /> {act.village}
                          </span>
                        )}
                        {act.ip_address && (
                          <span className="flex items-center gap-1">
                            <Smartphone className="w-3 h-3" /> {act.ip_address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: Security & Preferences ── */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Change Password Card */}
          <form onSubmit={handlePasswordChange} className="bg-white dark:bg-warm-indigo/40 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-white/10 shadow-sm space-y-5">
            <div className="border-b border-gray-200 dark:border-white/10 pb-3">
              <h2 className="text-base font-serif font-bold text-primary flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-gold-warm" />
                <span>पासवर्ड बदलें (Change Password)</span>
              </h2>
              <p className="text-xs text-muted mt-0.5">Ensure your account uses a strong, unique Himalayan health credential.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-primary mb-1.5">वर्तमान पासवर्ड (Current Password) *</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/15 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-sage"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-primary mb-1.5">नया पासवर्ड (New Password) *</label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Kam se kam 6 akshar"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/15 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-sage"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-primary mb-1.5">नए पासवर्ड की पुष्टि (Confirm New Password) *</label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/15 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-sage"
              />
            </div>

            <button
              type="submit"
              disabled={changingPassword}
              className="w-full flex items-center justify-center gap-1.5 bg-sage hover:bg-sage/90 text-white text-xs sm:text-sm font-bold py-2.5 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{changingPassword ? 'पासवर्ड बदला जा रहा है...' : 'पासवर्ड अपडेट करें'}</span>
            </button>
          </form>

          {/* App Preferences & Dialect Card */}
          <div className="bg-white dark:bg-warm-indigo/40 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-white/10 shadow-sm space-y-5">
            <div className="border-b border-gray-200 dark:border-white/10 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-serif font-bold text-primary flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-500" />
                  <span>प्राथमिकताएं (App Preferences)</span>
                </h2>
                <p className="text-xs text-muted mt-0.5">Customize audio, language and notification behaviors.</p>
              </div>
              <button
                onClick={handleSettingsSave}
                disabled={savingSettings}
                className="text-xs bg-sage text-white font-bold px-3 py-1.5 rounded-xl shadow-xs cursor-pointer"
              >
                {savingSettings ? '...' : 'Save'}
              </button>
            </div>

            {/* Language Selection */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1.5">मुख्य भाषा (Default Language)</label>
              <select
                value={profileForm.language_preference}
                onChange={(e) => {
                  setProfileForm({ ...profileForm, language_preference: e.target.value });
                  setLanguage(e.target.value);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/15 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-sage"
              >
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="garh">गढ़वाली (Garhwali)</option>
                <option value="ku">कुमाऊँनी (Kumaoni)</option>
                <option value="en">English (English)</option>
              </select>
            </div>

            {/* Audio Speech Speed */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1.5 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-sage" />
                <span>डॉ. संजीवनी वाणी गति (Audio Voice Speed)</span>
              </label>
              <select
                value={ttsSpeed}
                onChange={(e) => setTtsSpeed(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/15 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-sage"
              >
                <option value="0.8">धीमी व स्पष्ट (0.8x - बुजुर्गों व पहाड़ी बोली के लिए उत्तम)</option>
                <option value="1.0">सामान्य (1.0x Normal Speed)</option>
                <option value="1.2">तीव्र (1.2x Fast Speed)</option>
              </select>
            </div>

            {/* Dialect Translation Assistant Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
              <div>
                <p className="text-xs font-bold text-primary">गढ़वाली / कुमाऊँनी अनुवादक (Dialect Assistant)</p>
                <p className="text-[11px] text-muted">Auto-translates local hill terms (e.g. 'घण्ड' for throat, 'खोसी' for cough)</p>
              </div>
              <input
                type="checkbox"
                checked={dialectAssistance}
                onChange={(e) => setDialectAssistance(e.target.checked)}
                className="w-4 h-4 accent-sage cursor-pointer"
              />
            </div>

            {/* Health SMS / Advisory Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
              <div>
                <p className="text-xs font-bold text-primary">स्वास्थ्य सलाह सूचनाएं (District Advisories)</p>
                <p className="text-[11px] text-muted">Receive alerts for seasonal waterborne shifts & vaccination drives</p>
              </div>
              <input
                type="checkbox"
                checked={healthAlerts}
                onChange={(e) => setHealthAlerts(e.target.checked)}
                className="w-4 h-4 accent-sage cursor-pointer"
              />
            </div>

            {/* Session Management */}
            <div className="pt-2 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-primary">Active Device Session</p>
                <p className="text-[11px] text-muted">Authenticated via Sanjeevani 2.0 Secure Token</p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
