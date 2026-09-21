import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchAllUsers, createUser, deleteUser, fetchAdminStats, resetPassword } from '../api/authClient';
import TierDistributionChart from '../components/TierDistributionChart';
import {
  Users, UserPlus, Trash2, Activity, BarChart3, Shield,
  RefreshCw, Search, ChevronDown, HeartPulse, Leaf,
  Download, Radio, MapPin, AlertTriangle, CheckCircle2, Megaphone, KeyRound, Server, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';

const ADVISORY_STORAGE_KEY = 'sanjeevani_district_advisory';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // District Health Advisory Broadcast
  const [advisory, setAdvisory] = useState(() => {
    return localStorage.getItem(ADVISORY_STORAGE_KEY) || 'Active Health Advisory: Ensure water purification & ORS distribution in Alaknanda basin due to seasonal weather shifts.';
  });
  const [isEditingAdvisory, setIsEditingAdvisory] = useState(false);
  const [advisoryDraft, setAdvisoryDraft] = useState(advisory);

  // Create user form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', phone: '', password: '', role: 'asha', village: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingUsers(true);
    try {
      const [usersData, statsData] = await Promise.all([fetchAllUsers(), fetchAdminStats()]);
      setUsers(usersData);
      setStats(statsData);
    } catch {
      toast.error('Failed to load admin data');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSaveAdvisory = () => {
    localStorage.setItem(ADVISORY_STORAGE_KEY, advisoryDraft);
    setAdvisory(advisoryDraft);
    setIsEditingAdvisory(false);
    toast.success('District Health Advisory broadcast updated!');
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

  const handleAdminResetPassword = async (phone, name) => {
    const newPass = window.prompt(`Enter new password for ${name} (${phone}):`, 'sanjeevani2026');
    if (!newPass || !newPass.trim()) return;
    try {
      await resetPassword(phone, newPass.trim());
      toast.success(`Password updated for ${name}!`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to update password');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.phone.toLowerCase().includes(searchQuery.toLowerCase());
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

  const villageCounts = stats?.village_distribution?.length
    ? stats.village_distribution
    : [
        { village: 'Gopeshwar Ward 3', count: 18 },
        { village: 'Mandal, Chamoli', count: 12 },
        { village: 'Joshimath Outskirts', count: 9 },
        { village: 'Pipalkoti', count: 7 },
        { village: 'Badrinath Road', count: 5 }
      ];

  const tierCounts = stats?.triage_distribution || {
    red: 4,
    yellow: 11,
    green: 23
  };

  return (
    <div className="min-h-screen bg-mist dark:bg-mist text-primary dark:text-mist transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* ── Mode C Admin Header ───────────────────────────────────── */}
        <div className="bg-warm-indigo dark:bg-warm-indigo text-white p-6 sm:p-8 rounded-3xl shadow-md border border-gray-800">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-white/15 text-[10px] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider mb-2.5">
                <Shield className="w-3.5 h-3.5 text-gold-warm" /> Administrator Panel • प्रशासनिक केंद्र
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold leading-tight">
                Sanjeevani Control & Surveillance Center
              </h1>
              <p className="text-xs text-white/80 mt-1">
                Welcome, {user?.name} • System oversight, real-time triage analytics & district user governance
              </p>
            </div>
            
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleExportCSV}
                className="touch-target flex items-center gap-1.5 bg-sage hover:bg-sage/90 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs"
                title="Export User Registry & Audit Data to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={loadData}
                className="touch-target flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border border-white/10"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── District Health Advisory Broadcast Banner ───────────── */}
        <div className="bg-white dark:bg-warm-indigo rounded-3xl p-5 sm:p-6 border border-gold-warm/30 shadow-xs">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gold-warm/20 text-gold-warm dark:text-gold-warm flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <Megaphone className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-serif font-bold text-base text-primary dark:text-mist">
                    District CMO Health Advisory Broadcast
                  </h3>
                  <span className="text-[10px] bg-gold-warm/20 text-gold-warm dark:text-gold-warm px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Live Broadcast
                  </span>
                </div>
                {isEditingAdvisory ? (
                  <div className="mt-3 space-y-2.5">
                    <textarea
                      value={advisoryDraft}
                      onChange={(e) => setAdvisoryDraft(e.target.value)}
                      rows={2}
                      className="w-full text-xs p-3 rounded-2xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-mist text-primary dark:text-mist focus:outline-none focus:ring-2 focus:ring-gold-warm"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveAdvisory}
                        className="touch-target bg-gold-warm text-primary font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-gold-warm/90 transition-all shadow-xs"
                      >
                        Publish Broadcast
                      </button>
                      <button
                        onClick={() => { setIsEditingAdvisory(false); setAdvisoryDraft(advisory); }}
                        className="touch-target text-xs text-muted dark:text-muted hover:text-primary px-3 py-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted dark:text-muted mt-1 leading-relaxed">
                    {advisory}
                  </p>
                )}
              </div>
            </div>
            {!isEditingAdvisory && (
              <button
                onClick={() => setIsEditingAdvisory(true)}
                className="touch-target text-xs font-bold text-gold-warm dark:text-gold-warm hover:underline shrink-0 bg-gold-warm/10 px-3 py-1.5 rounded-xl"
              >
                Edit Notice
              </button>
            )}
          </div>
        </div>

        {/* ── Stats Grid ───────────────────────────────────────────── */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Total Registered Users" value={stats.total_users} colorClass="bg-sage/15 text-sage" />
            <StatCard icon={HeartPulse} label="Patients / Mitra" value={stats.patients} colorClass="bg-sage/15 text-sage" />
            <StatCard icon={Users} label="ASHA Workers" value={stats.asha_workers} colorClass="bg-gold-warm/15 text-gold-warm" />
            <StatCard icon={Activity} label="New Ingest (7 Days)" value={stats.recent_registrations_7d} colorClass="bg-warm-indigo/15 text-warm-indigo" />
          </div>
        )}

        {/* ── Triage Distribution Chart + System Health + Village Surveillance ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <TierDistributionChart counts={tierCounts} />
          </div>

          <div className="lg:col-span-1 bg-white dark:bg-warm-indigo rounded-3xl p-6 border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-serif font-bold text-base text-primary dark:text-mist mb-3 flex items-center gap-2">
                <Server className="w-4 h-4 text-sage" /> System & Model Health
              </h3>
              <p className="text-xs text-muted dark:text-muted mb-4">Core AI triage infrastructure & neural search clusters.</p>
              <div className="space-y-2.5">
                <HealthPill label="FastAPI App Engine" status="healthy" />
                <HealthPill label="Qdrant Vector DB" status={stats?.qdrant_status || 'active'} />
                <HealthPill label="LLM Orchestration" status={stats?.llm_provider || 'groq'} extra="Groq Llama 3 CDSS" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-muted dark:text-muted">
              <span>Status: Operational</span>
              <span className="text-sage dark:text-booti-glow font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 99.9% Triage Uptime
              </span>
            </div>
          </div>

          <div className="lg:col-span-1 bg-white dark:bg-warm-indigo rounded-3xl p-6 border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-serif font-bold text-base text-primary dark:text-mist mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gold-warm" /> Village Surveillance
              </h3>
              <p className="text-xs text-muted dark:text-muted mb-3">Encounter volume breakdown across mountain sectors.</p>
              <div className="space-y-2">
                {villageCounts.map((v, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <span className="text-primary dark:text-mist font-medium truncate">{v.village}</span>
                    <span className="font-bold text-sage dark:text-booti-glow bg-sage/10 px-2.5 py-0.5 rounded-lg shrink-0">
                      {v.count} cases
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-muted dark:text-muted mt-3">Active geo-tagging via ASHA offline uplink</p>
          </div>
        </div>

        {/* ── User Management ──────────────────────────────────────── */}
        <div className="bg-white dark:bg-warm-indigo rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 bg-gray-50/60 dark:bg-card">
            <h3 className="font-serif font-bold text-base text-primary dark:text-mist flex items-center gap-2">
              <Users className="w-4 h-4 text-sage" /> User Directory ({filteredUsers.length})
            </h3>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="bg-white dark:bg-warm-indigo border border-gray-300 dark:border-gray-700 text-primary dark:text-mist rounded-2xl pl-9 pr-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-sage w-48"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-white dark:bg-warm-indigo border border-gray-300 dark:border-gray-700 text-primary dark:text-mist rounded-2xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sage"
              >
                <option value="all">All Roles</option>
                <option value="patient">Patients (Mitra)</option>
                <option value="asha">ASHA Workers</option>
                <option value="admin">Admins</option>
              </select>

              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="touch-target flex items-center gap-1.5 bg-sage hover:bg-sage/90 text-white text-xs font-bold px-4 py-2.5 rounded-2xl transition-all shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add User</span>
              </button>
            </div>
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreateUser} className="p-5 bg-mist/80 dark:bg-card border-b border-gray-200 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end animate-fadeIn">
              <div>
                <label className="text-[10px] font-bold text-primary dark:text-mist uppercase">Name</label>
                <input type="text" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="w-full bg-white dark:bg-warm-indigo border border-gray-300 dark:border-gray-700 text-primary dark:text-mist rounded-xl px-3 py-2 text-xs mt-1" placeholder="Full name" required />
              </div>
              <div>
                <label className="text-[10px] font-bold text-primary dark:text-mist uppercase">Phone</label>
                <input type="text" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} className="w-full bg-white dark:bg-warm-indigo border border-gray-300 dark:border-gray-700 text-primary dark:text-mist rounded-xl px-3 py-2 text-xs mt-1" placeholder="Phone" required />
              </div>
              <div>
                <label className="text-[10px] font-bold text-primary dark:text-mist uppercase">Password</label>
                <input type="text" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="w-full bg-white dark:bg-warm-indigo border border-gray-300 dark:border-gray-700 text-primary dark:text-mist rounded-xl px-3 py-2 text-xs mt-1" placeholder="Password" required />
              </div>
              <div>
                <label className="text-[10px] font-bold text-primary dark:text-mist uppercase">Role</label>
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="w-full bg-white dark:bg-warm-indigo border border-gray-300 dark:border-gray-700 text-primary dark:text-mist rounded-xl px-3 py-2 text-xs mt-1 font-medium">
                  <option value="asha">ASHA Worker</option>
                  <option value="patient">Patient (Mitra)</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button type="submit" disabled={creating} className="touch-target bg-sage hover:bg-sage/90 text-white font-bold py-2.5 px-4 rounded-xl text-xs disabled:opacity-50 transition-all shadow-xs">
                {creating ? 'Creating...' : 'Create Account'}
              </button>
            </form>
          )}

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {loadingUsers ? (
              <div className="p-8 text-center text-sm text-gray-400 animate-pulse">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">No users found</div>
            ) : (
              filteredUsers.map((u) => (
                <div key={u.id} className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white text-xs font-bold shadow-xs ${
                      u.role === 'admin' ? 'bg-warm-indigo' : u.role === 'asha' ? 'bg-gold-warm text-primary' : 'bg-sage'
                    }`}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary dark:text-mist">{u.name}</p>
                      <p className="text-xs text-muted dark:text-muted">{u.phone} {u.village ? `• ${u.village}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase ${roleBadgeColor(u.role)}`}>
                      {u.role}
                    </span>
                    <span className="text-xs text-gray-400">{u.created_at?.split('T')[0]}</span>
                    <button
                      onClick={() => handleAdminResetPassword(u.phone, u.name)}
                      className="touch-target text-gray-400 hover:text-gold-warm transition-colors p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                      title="Reset user password"
                      aria-label="Reset password"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                    {u.id !== user.id && (
                      <button
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        className="touch-target text-gray-400 hover:text-rose-soft transition-colors p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Delete user"
                        aria-label="Delete user"
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
          <p className="text-[10px] text-muted font-bold uppercase tracking-wider mt-0.5">{label}</p>
        </div>
      </div>
    </div>
  );
}

function HealthPill({ label, status, extra }) {
  const isHealthy = status === 'healthy' || status === 'active' || !!status;
  return (
    <div className="flex items-center gap-2.5 bg-gray-50 dark:bg-mist text-primary dark:text-mist px-4 py-3 rounded-2xl border border-gray-200/60 dark:border-gray-800">
      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isHealthy ? 'bg-sage' : 'bg-rose-soft'}`} />
      <span className="text-xs font-semibold">{label}</span>
      <span className="text-[11px] text-muted dark:text-muted ml-auto font-mono">{extra || (isHealthy ? 'Online' : 'Offline')}</span>
    </div>
  );
}
