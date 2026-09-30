import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  fetchAllUsers,
  createUser,
  deleteUser,
  fetchAdminStats,
  resetPassword,
  fetchAnalyticsSummary,
  fetchAdminActivity,
  updateUserRole,
  updateUserDetails,
} from '../api/authClient';
import TierDistributionChart from '../components/TierDistributionChart';
import SkeletonLoader from '../components/SkeletonLoader';
import AdminSurveillanceHub from '../components/AdminSurveillanceHub';
import AdminSystemConfigPanel from '../components/AdminSystemConfigPanel';
import AdminBroadcastManager from '../components/AdminBroadcastManager';
import {
  Users, UserPlus, Trash2, Activity, BarChart3, Shield,
  RefreshCw, Search, ChevronDown, HeartPulse, Leaf,
  Download, Radio, MapPin, AlertTriangle, CheckCircle2, Megaphone,
  KeyRound, Server, Eye, Bell, Sliders, Edit3, Flame, ExternalLink,
  Menu, X, ChevronRight, Sparkles, ShieldAlert, Cpu
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageVoiceGuide from '../components/PageVoiceGuide';
import BackButton from '../components/BackButton';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const VALID_TABS = ['surveillance', 'system-config', 'broadcast', 'users', 'audit'];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab = VALID_TABS.includes(rawTab) ? rawTab : 'surveillance';

  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [analyticsSummary, setAnalyticsSummary] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [alerts, setAlerts] = useState([]);

  // Create user form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', phone: '', password: '', role: 'asha', village: '' });
  const [creating, setCreating] = useState(false);

  // Secure Password Reset Modal
  const [resetModalUser, setResetModalUser] = useState(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [confirmPasswordValue, setConfirmPasswordValue] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // Edit User Profile Modal
  const [editModalUser, setEditModalUser] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', phone: '', village: '', assigned_phc: '', district: 'Chamoli' });
  const [savingEdit, setSavingEdit] = useState(false);

  // System Audit Trail State
  const [auditActivities, setAuditActivities] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditRoleFilter, setAuditRoleFilter] = useState('all');
  const [auditSearch, setAuditSearch] = useState('');
  const [loadingAudit, setLoadingAudit] = useState(false);

  const loadAuditTrail = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const params = { limit: 50 };
      if (auditActionFilter !== 'all') params.action = auditActionFilter;
      if (auditRoleFilter !== 'all') params.role = auditRoleFilter;
      if (auditSearch.trim()) params.search = auditSearch.trim();
      const res = await fetchAdminActivity(params);
      setAuditActivities(res.activities || []);
      setAuditTotal(res.total || 0);
    } catch {
      console.warn('Could not load audit trail');
    } finally {
      setLoadingAudit(false);
    }
  }, [auditActionFilter, auditRoleFilter, auditSearch]);

  const fetchAlerts = useCallback(async () => {
    try {
      const token = localStorage.getItem('sanjeevani_token') || localStorage.getItem('sanjeevani_access_token');
      const res = await axios.get(`${API_BASE}/admin/alerts`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 5000,
      });
      setAlerts(res.data || []);
    } catch {}
  }, []);

  const handleAcknowledgeAlert = async (alertId) => {
    const prev = [...alerts];
    setAlerts(cur => cur.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
    try {
      const token = localStorage.getItem('sanjeevani_token') || localStorage.getItem('sanjeevani_access_token');
      await axios.post(`${API_BASE}/admin/alerts/${alertId}/acknowledge`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      toast.success('Emergency alert marked as handled. 🚑');
    } catch {
      setAlerts(prev);
      toast.error('Could not update alert status. Please check connection.');
    }
  };

  useEffect(() => {
    loadData();
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  useEffect(() => {
    loadAuditTrail();
  }, [loadAuditTrail]);

  const loadData = async () => {
    setLoadingUsers(true);
    try {
      const [usersData, statsData, analyticsData, healthRes] = await Promise.all([
        fetchAllUsers(),
        fetchAdminStats(),
        fetchAnalyticsSummary(30).catch(() => null),
        axios.get(`${API_BASE}/health`, { timeout: 4000 }).catch(() => null),
      ]);
      setUsers(usersData);
      setStats(statsData);
      if (analyticsData) setAnalyticsSummary(analyticsData);
      if (healthRes?.data) setHealthData(healthRes.data);
    } catch {
      toast.error('Failed to load admin data');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredUsers.length === 0) {
      toast.error('No records available to export');
      return;
    }
    const headers = ['ID', 'Name', 'Phone', 'Role', 'Village', 'RegisteredDate'];
    const rows = filteredUsers.map(u => [
      u.id,
      `"${(u.name || '').replace(/"/g, '""')}"`,
      u.phone,
      u.role,
      `"${(u.village || 'Not specified').replace(/"/g, '""')}"`,
      u.created_at || ''
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sanjeevani_user_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredUsers.length} user records to CSV`);
  };

  const handleTabSelect = (tabKey) => {
    setActiveTab(tabKey);
    setMobileSidebarOpen(false);
  };

  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged);

  const navItems = [
    {
      group: 'SURVEILLANCE & GIS',
      items: [
        {
          id: 'surveillance',
          label: 'Disease Heatmap & GIS',
          sub: 'Chamoli Topo & Outbreaks',
          icon: Flame,
          badge: unacknowledgedAlerts.length > 0 ? `${unacknowledgedAlerts.length} Alert` : 'Live GIS',
          badgeColor: unacknowledgedAlerts.length > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
        },
        {
          id: 'broadcast',
          label: 'District CMO Broadcast',
          sub: 'Public Health Advisories',
          icon: Megaphone,
          badge: 'IVR / SMS',
          badgeColor: 'bg-gold-warm/20 text-gold-warm',
        },
      ]
    },
    {
      group: 'AI & CORE ENGINE',
      items: [
        {
          id: 'system-config',
          label: 'System & AI Controls',
          sub: 'Models, Prompts & Speech',
          icon: Sliders,
          badge: 'Zero-Downtime',
          badgeColor: 'bg-sage/20 text-sage dark:text-booti-glow',
        },
      ]
    },
    {
      group: 'GOVERNANCE & DIRECTORY',
      items: [
        {
          id: 'users',
          label: 'User Directory & Roles',
          sub: 'ASHA & Staff Governance',
          icon: Users,
          badge: `${users.length}`,
          badgeColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
        },
        {
          id: 'audit',
          label: 'Telemetry & Audit Logs',
          sub: 'Security Trail & Health',
          icon: Activity,
          badge: auditTotal ? `${auditTotal}` : 'Live',
          badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
        },
      ]
    }
  ];

  const getPageTitle = () => {
    switch (activeTab) {
      case 'surveillance': return { title: 'District Disease Surveillance & Heatmap', sub: 'Interactive Himalayan sector epidemiological GIS, early warning clusters & rapid response' };
      case 'system-config': return { title: 'Zero-Downtime AI Engine & System Controls', sub: 'Dynamic runtime LLM provider switching, speech synthesizers, CDSS prompts & cache controls' };
      case 'broadcast': return { title: 'District CMO Public Health Broadcasts', sub: 'Issue persistent multi-channel alerts and advisories to citizens and ASHA workers' };
      case 'users': return { title: 'User Governance & Role Management', sub: 'One-click role promotions, ASHA field worker reassignments, and credential management' };
      case 'audit': return { title: 'System Telemetry & Security Audit Trail', sub: 'Live infrastructure health status, triage analytics, and immutable action logging' };
      default: return { title: 'Admin Command Center', sub: 'District Health Governance' };
    }
  };

  const pageInfo = getPageTitle();

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.phone || !newUser.password) return;
    setCreating(true);
    try {
      await createUser(newUser);
      toast.success(`${newUser.role.toUpperCase()} account created for ${newUser.name}`);
      setNewUser({ name: '', phone: '', password: '', role: 'asha', village: '' });
      setShowCreateForm(false);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Delete user "${userName}"? This action cannot be undone.`)) return;
    try {
      await deleteUser(userId);
      toast.success(`User "${userName}" removed`);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole);
      toast.success(`User role updated to ${newRole.toUpperCase()}!`);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to update user role');
    }
  };

  const openEditUserModal = (userObj) => {
    setEditModalUser(userObj);
    setEditFormData({
      name: userObj.name || '',
      phone: userObj.phone || '',
      village: userObj.village || '',
      assigned_phc: userObj.assigned_phc || '',
      district: userObj.district || 'Chamoli',
    });
  };

  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    if (!editModalUser) return;
    setSavingEdit(true);
    try {
      await updateUserDetails(editModalUser.id, editFormData);
      toast.success(`Profile updated for ${editFormData.name}!`);
      setEditModalUser(null);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to update user details');
    } finally {
      setSavingEdit(false);
    }
  };

  const openResetPasswordModal = (userObj) => {
    setResetModalUser(userObj);
    setNewPasswordValue('');
    setConfirmPasswordValue('');
  };

  const handleAdminResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetModalUser) return;
    if (newPasswordValue.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPasswordValue !== confirmPasswordValue) {
      toast.error('Passwords do not match');
      return;
    }
    setResettingPassword(true);
    try {
      await resetPassword(resetModalUser.phone, newPasswordValue.trim());
      toast.success(`Password updated for ${resetModalUser.name}!`);
      setResetModalUser(null);
      setNewPasswordValue('');
      setConfirmPasswordValue('');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to update password');
    } finally {
      setResettingPassword(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (u.phone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (u.village || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-warm-indigo text-white';
      case 'asha': return 'bg-gold-warm text-primary font-bold';
      case 'patient': return 'bg-sage text-white';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  const isVillageSample = !stats?.village_distribution || stats.village_distribution.length === 0;
  const villageCounts = stats?.village_distribution?.length
    ? stats.village_distribution
    : [
        { village: 'Gopeshwar Ward 3', count: 18 },
        { village: 'Mandal, Chamoli', count: 12 },
        { village: 'Joshimath Outskirts', count: 9 },
        { village: 'Pipalkoti', count: 7 },
        { village: 'Badrinath Road', count: 5 }
      ];

  const isTierSample = !stats?.triage_distribution;
  const tierCounts = stats?.triage_distribution || {
    red: 4,
    yellow: 11,
    green: 23
  };

  return (
    <div className="min-h-screen bg-mist dark:bg-[#0b1120] text-primary transition-colors duration-300 flex flex-col lg:flex-row pb-16 lg:pb-0">
      {/* ── Desktop Left-Hand Vertical Sidebar ────────────────────────── */}
      <aside className="hidden lg:flex w-72 xl:w-80 shrink-0 flex-col justify-between border-r border-gray-200/80 dark:border-gray-800/80 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md sticky top-0 h-screen z-30 overflow-y-auto">
        {/* Top Header */}
        <div className="p-5 pb-4 border-b border-gray-100 dark:border-gray-800/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-warm-indigo to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Shield className="w-5 h-5 text-gold-warm" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-sage bg-sage/10 px-2 py-0.5 rounded-full border border-sage/20">
                  Command HQ
                </span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <h2 className="font-serif font-bold text-base text-primary tracking-tight">Sanjeevani Admin</h2>
              <p className="text-[11px] text-muted font-medium">Chamoli District Health Governance</p>
            </div>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <div className="p-4 space-y-6 flex-1 overflow-y-auto">
          {navItems.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1.5">
              <p className="px-3 text-[10px] font-extrabold tracking-wider uppercase text-muted/70">
                {group.group}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabSelect(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-left transition-all group cursor-pointer ${
                        isActive
                          ? 'bg-warm-indigo text-white shadow-md shadow-indigo-900/20 font-bold'
                          : 'text-muted hover:text-primary hover:bg-gray-100/80 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-xl transition-all ${
                          isActive
                            ? 'bg-white/15 text-gold-warm'
                            : 'bg-gray-100 dark:bg-gray-800 text-muted group-hover:text-primary'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-primary'}`}>
                            {item.label}
                          </p>
                          <p className={`text-[10px] truncate ${isActive ? 'text-white/70' : 'text-muted'}`}>
                            {item.sub}
                          </p>
                        </div>
                      </div>

                      {item.badge && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isActive ? 'bg-white/20 text-white' : item.badgeColor
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800/70 space-y-3">
          <div className="bg-gray-50/80 dark:bg-gray-800/40 p-3 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-warm-indigo text-white font-bold text-xs flex items-center justify-center">
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-primary truncate">{user?.name || 'Administrator'}</p>
                <p className="text-[10px] text-muted">CMO / District Staff</p>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-500/20">
              HQ
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <BackButton fallback="/mitra" label="Exit Portal" />
            <button
              onClick={loadData}
              title="Refresh Data"
              className="text-xs text-muted hover:text-primary p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
              <span className="text-[11px] font-semibold">Sync</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Top Sticky Bar (Shown only on small screens) ───────── */}
      <div className="lg:hidden sticky top-0 z-40 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-primary hover:bg-gray-200 dark:hover:bg-gray-700 transition-all cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif font-bold text-sm text-primary">Sanjeevani Admin</span>
              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-sage/15 text-sage">CMO</span>
            </div>
            <p className="text-[10px] text-muted truncate">{pageInfo.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unacknowledgedAlerts.length > 0 && (
            <button
              onClick={() => handleTabSelect('surveillance')}
              className="flex items-center gap-1 bg-rose-500 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-full animate-bounce cursor-pointer shadow-xs"
            >
              🚨 {unacknowledgedAlerts.length}
            </button>
          )}
          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-muted hover:text-primary transition-all cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loadingUsers ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Mobile Navigation Drawer ─────────────────────────────────── */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-80 max-w-[85vw] bg-white dark:bg-[#0f172a] h-full shadow-2xl flex flex-col justify-between p-5 z-10 animate-slideIn">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-warm-indigo text-white flex items-center justify-center font-bold">
                    <Shield className="w-4 h-4 text-gold-warm" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-sm text-primary">Admin Console</h3>
                    <p className="text-[10px] text-muted">Chamoli Healthcare Operations</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-2 rounded-xl text-muted hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-5 overflow-y-auto max-h-[calc(100vh-200px)]">
                {navItems.map((group, gIdx) => (
                  <div key={gIdx} className="space-y-1.5">
                    <p className="text-[10px] font-extrabold tracking-wider uppercase text-muted/70 px-2">
                      {group.group}
                    </p>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleTabSelect(item.id)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                              isActive
                                ? 'bg-warm-indigo text-white font-bold shadow-md'
                                : 'text-muted hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800/60'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon className="w-4 h-4" />
                              <span className="text-xs">{item.label}</span>
                            </div>
                            {item.badge && (
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                isActive ? 'bg-white/20 text-white' : item.badgeColor
                              }`}>
                                {item.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
              <BackButton fallback="/mitra" label="वापस जाएं (Back)" />
            </div>
          </div>
        </div>
      )}

      {/* ── Main Viewport Container ──────────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col min-h-screen overflow-y-auto">
        {/* Top Header Bar inside Main Viewport */}
        <header className="bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800/80 px-4 sm:px-8 py-4 sm:py-5 sticky top-0 z-20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted font-medium mb-1">
                <span>प्रशासन केंद्र (Admin)</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted/60" />
                <span className="font-bold text-primary">{pageInfo.title}</span>
              </div>
              <h1 className="font-serif text-xl sm:text-2xl font-bold text-primary tracking-tight">
                {pageInfo.title}
              </h1>
              <p className="text-xs text-muted mt-0.5">
                {pageInfo.sub}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {unacknowledgedAlerts.length > 0 && (
                <button
                  onClick={() => handleTabSelect('surveillance')}
                  className="touch-target flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm animate-pulse cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{unacknowledgedAlerts.length} Red Alerts</span>
                </button>
              )}

              <button
                onClick={handleExportCSV}
                className="touch-target flex items-center gap-1.5 bg-sage hover:bg-sage/90 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Export User Registry & Audit Data to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={loadData}
                className="touch-target flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-primary px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Refresh Live Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </header>

        {/* Inner Content Area */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1">
          {/* Page Voice Guide */}
          <PageVoiceGuide pageKey="admin" />

          {/* Active Red-Tier Emergency Alerts (Shown across tabs if active) */}
          {unacknowledgedAlerts.length > 0 && (
            <div className="bg-rose-500/10 border-2 border-rose-500/40 rounded-3xl p-5 shadow-sm animate-fadeIn">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-bold text-sm shadow-md animate-bounce shrink-0">
                    🚨
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif font-bold text-sm sm:text-base text-rose-600 dark:text-rose-400">
                        Urgent Red-Tier Clinical Dispatches ({unacknowledgedAlerts.length})
                      </h3>
                      <span className="text-[9px] bg-rose-500 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Action Required
                      </span>
                    </div>
                    <p className="text-xs text-rose-700/80 dark:text-rose-300/80">
                      Emergency clinical distress reported. 108 EMS coordination & PHC notification initiated.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                {unacknowledgedAlerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="bg-white/90 dark:bg-card/90 p-3.5 rounded-2xl border border-rose-200 dark:border-rose-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-primary">{alert.patient_name || 'Citizen Patient'}</span>
                        <span className="text-xs text-muted">• {alert.village || 'Chamoli Ward'}</span>
                        {alert.phone && <span className="text-xs font-mono text-muted">• 📞 {alert.phone}</span>}
                      </div>
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                        Symptoms: {alert.symptoms}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                      className="touch-target bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-xs self-start sm:self-auto cursor-pointer"
                    >
                      Acknowledge ✓
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* TAB 1: DISTRICT DISEASE SURVEILLANCE & HEATMAP               */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'surveillance' && (
            <div className="animate-fadeIn">
              <AdminSurveillanceHub onSwitchToBroadcastTab={() => handleTabSelect('broadcast')} />
            </div>
          )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: DYNAMIC SYSTEM CONFIG & AI MODEL CONTROLS                 */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'system-config' && (
          <div className="animate-fadeIn">
            <AdminSystemConfigPanel />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: DISTRICT CMO ADVISORY BROADCASTS                          */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'broadcast' && (
          <div className="animate-fadeIn">
            <AdminBroadcastManager />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: USER & ROLE GOVERNANCE DIRECTORY                          */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-fadeIn">
            {/* User Directory Container */}
            <div className="bg-white dark:bg-warm-indigo rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 bg-gray-50/60 dark:bg-card">
                <div>
                  <h3 className="font-serif font-bold text-base text-primary flex items-center gap-2">
                    <Users className="w-4 h-4 text-sage" /> User & Role Management ({filteredUsers.length})
                  </h3>
                  <p className="text-xs text-muted mt-0.5">Directly promote/demote roles, reassign ASHA field workers, and reset credentials.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search users or village..."
                      className="bg-white dark:bg-warm-indigo border border-gray-300 dark:border-gray-700 text-primary rounded-2xl pl-9 pr-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-sage w-52"
                    />
                  </div>

                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="bg-white dark:bg-warm-indigo border border-gray-300 dark:border-gray-700 text-primary rounded-2xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sage cursor-pointer"
                  >
                    <option value="all">All Roles</option>
                    <option value="patient">Patients (Mitra)</option>
                    <option value="asha">ASHA Workers</option>
                    <option value="admin">Admins</option>
                  </select>

                  <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="touch-target flex items-center gap-1.5 bg-sage hover:bg-sage/90 text-white text-xs font-bold px-4 py-2.5 rounded-2xl transition-all shadow-xs cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add User</span>
                  </button>
                </div>
              </div>

              {showCreateForm && (
                <form onSubmit={handleCreateUser} className="p-5 bg-mist/80 dark:bg-card border-b border-gray-200 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end animate-fadeIn">
                  <div>
                    <label className="text-[10px] font-bold text-primary uppercase">Name</label>
                    <input type="text" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="w-full bg-white dark:bg-warm-indigo border border-gray-300 dark:border-gray-700 text-primary rounded-xl px-3 py-2 text-xs mt-1" placeholder="Full name" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-primary uppercase">Phone</label>
                    <input type="text" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} className="w-full bg-white dark:bg-warm-indigo border border-gray-300 dark:border-gray-700 text-primary rounded-xl px-3 py-2 text-xs mt-1" placeholder="Phone" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-primary uppercase">Password</label>
                    <input type="text" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="w-full bg-white dark:bg-warm-indigo border border-gray-300 dark:border-gray-700 text-primary rounded-xl px-3 py-2 text-xs mt-1" placeholder="Password" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-primary uppercase">Role</label>
                    <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="w-full bg-white dark:bg-warm-indigo border border-gray-300 dark:border-gray-700 text-primary rounded-xl px-3 py-2 text-xs mt-1 font-medium cursor-pointer">
                      <option value="asha">ASHA Worker</option>
                      <option value="patient">Patient (Mitra)</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <button type="submit" disabled={creating} className="touch-target bg-sage hover:bg-sage/90 text-white font-bold py-2.5 px-4 rounded-xl text-xs disabled:opacity-50 transition-all shadow-xs cursor-pointer">
                    {creating ? 'Creating...' : 'Create Account'}
                  </button>
                </form>
              )}

              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {loadingUsers ? (
                  <SkeletonLoader variant="table-row" count={5} />
                ) : filteredUsers.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-400">No users found matching query</div>
                ) : (
                  filteredUsers.map((u) => (
                    <div key={u.id} className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white text-xs font-bold shadow-xs ${
                          u.role === 'admin' ? 'bg-warm-indigo' : u.role === 'asha' ? 'bg-gold-warm text-primary' : 'bg-sage'
                        }`}>
                          {u.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-primary">{u.name}</p>
                          <p className="text-xs text-muted">
                            {u.phone} {u.village ? `• ${u.village}` : ''} {u.assigned_phc ? `• PHC: ${u.assigned_phc}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* 1-Click Role Switcher Dropdown */}
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase border-0 cursor-pointer shadow-xs ${roleBadgeColor(u.role)}`}
                        >
                          <option value="patient">PATIENT</option>
                          <option value="asha">ASHA WORKER</option>
                          <option value="admin">ADMIN</option>
                        </select>

                        <button
                          onClick={() => openEditUserModal(u)}
                          className="touch-target text-gray-400 hover:text-sage transition-colors p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                          title="Edit user details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => openResetPasswordModal(u)}
                          className="touch-target text-gray-400 hover:text-gold-warm transition-colors p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                          title="Reset user password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>

                        {u.id !== user?.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="touch-target text-gray-400 hover:text-rose-soft transition-colors p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 5: TELEMETRY, HEALTH METRICS & SYSTEM AUDIT TRAIL             */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'audit' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Stats Grid */}
            {stats ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Total Registered Users" value={stats.total_users} colorClass="bg-sage/15 text-sage" />
                <StatCard icon={HeartPulse} label="Patients / Mitra" value={stats.patients} colorClass="bg-sage/15 text-sage" />
                <StatCard icon={Users} label="ASHA Workers" value={stats.asha_workers} colorClass="bg-gold-warm/15 text-gold-warm" />
                <StatCard icon={Activity} label="New Ingest (7 Days)" value={stats.recent_registrations_7d} colorClass="bg-warm-indigo/15 text-warm-indigo" />
              </div>
            ) : (
              <SkeletonLoader variant="card" count={4} />
            )}

            {/* 30-Day Aggregate Triage Analytics Card */}
            {analyticsSummary && (
              <div className="bg-white dark:bg-warm-indigo rounded-3xl p-5 sm:p-6 border border-gray-200/80 dark:border-gray-800 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs shrink-0 bg-sage/15 text-sage">
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xl sm:text-2xl font-bold text-primary">
                          {analyticsSummary.total_events}
                        </p>
                        <span className="text-[10px] bg-sage/20 text-sage dark:text-booti-glow px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          30-Day Activity
                        </span>
                      </div>
                      <p className="text-[11px] text-muted font-bold uppercase tracking-wider mt-0.5">
                        Anonymous Aggregate Triage Encounters (Zero PII)
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full md:w-auto">
                    <div className="bg-gray-50 dark:bg-card/10 px-3.5 py-2 rounded-2xl border border-gray-200/60 dark:border-gray-800 text-center">
                      <span className="text-xs text-muted uppercase font-extrabold block">Consultations</span>
                      <span className="font-bold text-sm text-primary">{analyticsSummary.consultations_started}</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-card/10 px-3.5 py-2 rounded-2xl border border-gray-200/60 dark:border-gray-800 text-center">
                      <span className="text-xs text-muted uppercase font-extrabold block">Concluded</span>
                      <span className="font-bold text-sm text-sage">{analyticsSummary.consultations_concluded}</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-card/10 px-3.5 py-2 rounded-2xl border border-gray-200/60 dark:border-gray-800 text-center">
                      <span className="text-xs text-muted uppercase font-extrabold block">Escalations</span>
                      <span className="font-bold text-rose-soft text-sm">{analyticsSummary.emergency_escalations}</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-card/10 px-3.5 py-2 rounded-2xl border border-gray-200/60 dark:border-gray-800 text-center">
                      <span className="text-xs text-muted uppercase font-extrabold block">Remedies</span>
                      <span className="font-bold text-gold-warm text-sm">{analyticsSummary.remedies_delivered}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Triage Distribution Chart + System Health */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 relative">
                {isTierSample && (
                  <div className="mb-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300">
                    <AlertTriangle className="w-3 h-3" /> Sample data — connect backend for live numbers
                  </div>
                )}
                <TierDistributionChart counts={tierCounts} />
              </div>

              <div className="lg:col-span-2 bg-white dark:bg-warm-indigo rounded-3xl p-6 border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-serif font-bold text-base text-primary mb-3 flex items-center gap-2">
                    <Server className="w-4 h-4 text-sage" /> Production Cluster Health & Observability
                  </h3>
                  <p className="text-xs text-muted mb-4">Live telemetry across core services, vector neural stores, and speech inference pipes.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <HealthPill label="FastAPI App Engine" status={healthData?.status === 'unhealthy' ? 'unhealthy' : (healthData?.database === 'ok' ? 'healthy' : 'active')} />
                    <HealthPill label="Qdrant Vector DB" status={healthData?.qdrant || stats?.qdrant_status || 'unreachable'} />
                    <HealthPill label="Relational Persistence" status={healthData?.database === 'ok' ? 'healthy' : 'active'} extra="PostgreSQL Cloud" />
                    <HealthPill label="LLM Orchestration" status={healthData?.llm_provider || stats?.llm_provider || 'groq'} extra={healthData?.llm_provider ? `Provider: ${healthData.llm_provider.toUpperCase()}` : 'Groq LPU Engine'} />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-muted">
                  <span>Cluster Status: {healthData?.status ? healthData.status.toUpperCase() : 'Checking...'}</span>
                  <span className="font-semibold text-sage flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> High Availability Mode
                  </span>
                </div>
              </div>
            </div>

            {/* System Audit Feed */}
            <div className="bg-white dark:bg-warm-indigo rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 bg-gray-50/60 dark:bg-card">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-bold text-base text-primary flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-500" /> Security Audit & Event Feed ({auditTotal})
                    </h3>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Live
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">Real-time log of authentications, field syncs, security role updates, and triage logs.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') loadAuditTrail(); }}
                    placeholder="Search user, action, IP..."
                    className="bg-white dark:bg-warm-indigo border border-gray-300 dark:border-gray-700 text-primary rounded-2xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sage w-44"
                  />

                  <select
                    value={auditRoleFilter}
                    onChange={(e) => setAuditRoleFilter(e.target.value)}
                    className="bg-white dark:bg-warm-indigo border border-gray-300 dark:border-gray-700 text-primary rounded-2xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sage cursor-pointer"
                  >
                    <option value="all">All Roles</option>
                    <option value="patient">Mitra / Patient</option>
                    <option value="asha">ASHA Worker</option>
                    <option value="admin">Administrator</option>
                  </select>

                  <button
                    onClick={loadAuditTrail}
                    disabled={loadingAudit}
                    className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-muted hover:text-primary transition-all cursor-pointer"
                    title="Refresh Audit Logs"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingAudit ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[420px] overflow-y-auto">
                {loadingAudit ? (
                  <SkeletonLoader variant="table-row" count={4} />
                ) : auditActivities.length === 0 ? (
                  <div className="py-12 text-center text-muted text-xs">
                    <Activity className="w-6 h-6 mx-auto mb-1 text-muted/40" />
                    No activity logs found matching the selected filters.
                  </div>
                ) : (
                  auditActivities.map((act) => (
                    <div key={act.id} className="p-3.5 sm:px-5 flex items-start justify-between gap-3 text-xs hover:bg-gray-50/50 dark:hover:bg-card/40 transition-colors">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 border ${
                          act.action === 'LOGIN' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                          act.action === 'LOGOUT' ? 'bg-slate-500/10 text-slate-600 border-slate-500/20' :
                          act.action === 'EMERGENCY_SOS' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                          act.action === 'CONSULTATION' ? 'bg-sky-500/10 text-sky-600 border-sky-500/20' :
                          act.action === 'ASHA_SYNC' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                          'bg-purple-500/10 text-purple-600 border-purple-500/20'
                        }`}>
                          {act.action}
                        </span>

                        <div className="min-w-0">
                          <p className="font-semibold text-primary truncate">
                            {act.description || act.action}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-muted font-mono">
                            <span className="font-sans font-medium text-primary">
                              {act.user_name || 'System User'} ({act.user_role || 'user'})
                            </span>
                            {act.village && <span>• {act.village}</span>}
                            {act.ip_address && <span>• IP: {act.ip_address}</span>}
                          </div>
                        </div>
                      </div>

                      <span className="text-[11px] text-muted font-mono shrink-0">
                        {new Date(act.created_at).toLocaleString('hi-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </main>

      {/* ── Modal: Edit User Profile ──────────────────────────────────── */}
      {editModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
            <div className="bg-white dark:bg-warm-indigo rounded-3xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <Edit3 className="w-5 h-5 text-sage" />
                  <h3 className="font-serif font-bold text-base">Edit User Profile</h3>
                </div>
                <button type="button" onClick={() => setEditModalUser(null)} className="text-muted hover:text-primary font-bold">✕</button>
              </div>

              <form onSubmit={handleSaveEditUser} className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted">Full Name</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-card border border-gray-300 dark:border-gray-700 text-primary rounded-xl px-3 py-2 text-xs mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted">Phone Number</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-card border border-gray-300 dark:border-gray-700 text-primary rounded-xl px-3 py-2 text-xs mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted">Village / Sector</label>
                  <input
                    type="text"
                    value={editFormData.village}
                    onChange={(e) => setEditFormData({ ...editFormData, village: e.target.value })}
                    placeholder="e.g. Mandal Valley, Gopeshwar Ward 2"
                    className="w-full bg-gray-50 dark:bg-card border border-gray-300 dark:border-gray-700 text-primary rounded-xl px-3 py-2 text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted">Assigned Health Center (PHC/CHC)</label>
                  <input
                    type="text"
                    value={editFormData.assigned_phc}
                    onChange={(e) => setEditFormData({ ...editFormData, assigned_phc: e.target.value })}
                    placeholder="e.g. PHC Mandal / CHC Joshimath"
                    className="w-full bg-gray-50 dark:bg-card border border-gray-300 dark:border-gray-700 text-primary rounded-xl px-3 py-2 text-xs mt-1"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditModalUser(null)}
                    className="touch-target text-xs text-muted hover:text-primary px-3 py-2 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="touch-target bg-sage hover:bg-sage/90 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {savingEdit ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Modal: Reset User Password ────────────────────────────────── */}
        {resetModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
            <div className="bg-white dark:bg-warm-indigo rounded-3xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <KeyRound className="w-5 h-5 text-gold-warm" />
                  <h3 className="font-serif font-bold text-base">Reset User Password</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-muted">
                Updating credentials for <strong className="text-primary">{resetModalUser.name}</strong> ({resetModalUser.phone})
              </p>

              <form onSubmit={handleAdminResetPasswordSubmit} className="space-y-3 pt-1">
                <div>
                  <label className="text-[10px] font-bold uppercase text-primary">New Password (Min 6 chars)</label>
                  <input
                    type="password"
                    value={newPasswordValue}
                    onChange={(e) => setNewPasswordValue(e.target.value)}
                    placeholder="Enter new password"
                    minLength={6}
                    required
                    className="w-full bg-gray-50 dark:bg-card border border-gray-300 dark:border-gray-700 text-primary rounded-xl px-3.5 py-2.5 text-xs mt-1 focus:outline-none focus:ring-2 focus:ring-gold-warm"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-primary">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPasswordValue}
                    onChange={(e) => setConfirmPasswordValue(e.target.value)}
                    placeholder="Confirm new password"
                    minLength={6}
                    required
                    className="w-full bg-gray-50 dark:bg-card border border-gray-300 dark:border-gray-700 text-primary rounded-xl px-3.5 py-2.5 text-xs mt-1 focus:outline-none focus:ring-2 focus:ring-gold-warm"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetModalUser(null)}
                    className="touch-target text-xs text-muted hover:text-primary px-3 py-2 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resettingPassword}
                    className="touch-target bg-gold-warm text-primary font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-gold-warm/90 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {resettingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, colorClass = "bg-sage/15 text-sage" }) {
  return (
    <div className="bg-card rounded-3xl p-5 border border-border-subtle shadow-xs">
      <div className="flex items-center gap-3.5">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs shrink-0 ${colorClass}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-2xl sm:text-3xl font-bold text-primary">{value}</p>
          <p className="text-xs text-primary dark:text-muted font-extrabold uppercase tracking-wider mt-0.5">{label}</p>
        </div>
      </div>
    </div>
  );
}

const HEALTHY_STATES = new Set(['healthy', 'active', 'ok', 'operational', 'groq', 'gemini', 'sarvam']);

function HealthPill({ label, status, extra }) {
  const isHealthy = HEALTHY_STATES.has(String(status).toLowerCase());
  return (
    <div className="flex items-center gap-2.5 bg-gray-50 dark:bg-warm-indigo text-primary px-4 py-3 rounded-2xl border border-gray-200/60 dark:border-gray-800">
      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isHealthy ? 'bg-sage' : 'bg-rose-soft'}`} />
      <span className="text-xs font-semibold">{label}</span>
      <span className="text-xs text-muted ml-auto font-mono font-medium">{extra || (isHealthy ? 'Online' : 'Offline')}</span>
    </div>
  );
}
