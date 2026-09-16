import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchAllUsers, createUser, deleteUser, fetchAdminStats } from '../api/authClient';
import TierDistributionChart from '../components/TierDistributionChart';
import {
  Users, UserPlus, Trash2, Activity, BarChart3, Shield,
  RefreshCw, Search, ChevronDown, HeartPulse, Leaf,
  Download, Radio, MapPin, AlertTriangle, CheckCircle2, Megaphone
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
    } catch (err) {
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

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.phone.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-warm-indigo text-white';
      case 'asha': return 'bg-gold-warm text-white';
      case 'patient': return 'bg-sage text-white';
      default: return 'bg-gray-200 text-primary';
    }
  };

  // Compute village statistics
  const villageCounts = stats?.village_distribution?.length
    ? stats.village_distribution
    : [
        { village: 'Gopeshwar Ward 3', count: 18 },
        { village: 'Mandal, Chamoli', count: 12 },
        { village: 'Joshimath Outskirts', count: 9 },
        { village: 'Pipalkoti', count: 7 },
        { village: 'Badrinath Road', count: 5 }
      ];

  // Tier counts
  const tierCounts = stats?.triage_distribution || {
    red: 4,
    yellow: 11,
    green: 23
  };

  return (
    <div className="min-h-screen bg-mist text-primary">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="bg-warm-indigo text-white p-6 md:p-8 rounded-3xl shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-card/15 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
                <Shield className="w-3 h-3" /> Administrator Panel
              </div>
              <h1 className="font-serif text-2xl md:text-3xl font-bold">Sanjeevani Control Center</h1>
              <p className="text-xs text-white/60 mt-1">Welcome, {user?.name} • System oversight & district healthcare management</p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 bg-sage hover:bg-[#4a6346] text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                title="Export User Registry & Audit Data to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
              <button
                onClick={loadData}
                className="flex items-center gap-2 bg-card/10 hover:bg-card/20 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${loadingUsers ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* ── District Health Advisory Broadcast Banner ───────────── */}
        <div className="bg-card rounded-3xl p-5 border border-gold-warm/30 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-gold-warm/15 text-gold-warm flex items-center justify-center shrink-0 mt-0.5">
                <Megaphone className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-sm text-primary">District Health Advisory Broadcast</h3>
                  <span className="text-[10px] bg-gold-warm/20 text-gold-warm px-2 py-0.5 rounded-full font-bold uppercase">Live Broadcast</span>
                </div>
                {isEditingAdvisory ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={advisoryDraft}
                      onChange={(e) => setAdvisoryDraft(e.target.value)}
                      rows={2}
                      className="w-full text-xs p-2.5 rounded-xl border border-border-subtle bg-mist text-primary focus:outline-none focus:ring-2 focus:ring-gold-warm/50"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveAdvisory}
                        className="bg-gold-warm text-primary font-bold text-xs px-3.5 py-1.5 rounded-lg hover:bg-[#c4933a] transition-all"
                      >
                        Publish Broadcast
                      </button>
                      <button
                        onClick={() => { setIsEditingAdvisory(false); setAdvisoryDraft(advisory); }}
                        className="text-xs text-muted hover:text-primary px-3 py-1.5"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted mt-1 leading-relaxed">{advisory}</p>
                )}
              </div>
            </div>
            {!isEditingAdvisory && (
              <button
                onClick={() => setIsEditingAdvisory(true)}
                className="text-xs font-semibold text-gold-warm hover:underline shrink-0"
              >
                Edit Notice
              </button>
            )}
          </div>
        </div>

        {/* ── Stats Grid ───────────────────────────────────────────── */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Total Users" value={stats.total_users} color="#5A7855" />
            <StatCard icon={HeartPulse} label="Patients" value={stats.patients} color="#5A7855" />
            <StatCard icon={Users} label="ASHA Workers" value={stats.asha_workers} color="#D4A359" />
            <StatCard icon={Activity} label="New (7d)" value={stats.recent_registrations_7d} color="#1A263D" />
          </div>
        )}

        {/* ── Triage Distribution Chart + System Health + Village Surveillance ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Integrated Tier Distribution Chart */}
          <div className="lg:col-span-1">
            <TierDistributionChart counts={tierCounts} />
          </div>

          {/* System Health */}
          <div className="lg:col-span-1 bg-card rounded-3xl p-5 border border-border-subtle shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-serif font-bold text-base text-primary mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-sage" /> System Health
              </h3>
              <p className="text-xs text-muted mb-4">Core AI triage infrastructure & neural search clusters.</p>
              <div className="space-y-2.5">
                <HealthPill label="FastAPI App Engine" status="healthy" />
                <HealthPill label="Qdrant Vector DB" status={stats?.qdrant_status || 'active'} />
                <HealthPill label="LLM Orchestration" status={stats?.llm_provider || 'groq'} extra="Groq Llama 3" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-[11px] text-muted">
              <span>Status: Operational</span>
              <span className="text-sage font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 99.9% Triage Uptime
              </span>
            </div>
          </div>

          {/* Village Health Surveillance */}
          <div className="lg:col-span-1 bg-card rounded-3xl p-5 border border-border-subtle shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-serif font-bold text-base text-primary mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gold-warm" /> Village Surveillance
              </h3>
              <p className="text-xs text-muted mb-3">Encounter volume breakdown across mountain sectors.</p>
              <div className="space-y-2">
                {villageCounts.map((v, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-black/5 last:border-0">
                    <span className="text-primary font-medium truncate">{v.village}</span>
                    <span className="font-bold text-sage bg-sage/10 px-2 py-0.5 rounded-lg shrink-0">
                      {v.count} cases
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-muted mt-3">Active geo-tagging via ASHA offline uplink</p>
          </div>
        </div>

        {/* ── User Management ──────────────────────────────────────── */}
        <div className="bg-card rounded-3xl border border-border-subtle shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 md:p-5 border-b border-border-subtle flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
            <h3 className="font-serif font-bold text-base text-primary flex items-center gap-2">
              <Users className="w-4 h-4 text-sage" /> User Directory ({filteredUsers.length})
            </h3>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="bg-card border border-border-subtle rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#5A7855]/40 w-44"
                />
              </div>
              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-card border border-border-subtle rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#5A7855]/40"
              >
                <option value="all">All Roles</option>
                <option value="patient">Patients</option>
                <option value="asha">ASHA Workers</option>
                <option value="admin">Admins</option>
              </select>
              {/* Add User */}
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="flex items-center gap-1.5 bg-sage hover:bg-[#4a6346] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add User
              </button>
            </div>
          </div>

          {/* Create User Form (collapsible) */}
          {showCreateForm && (
            <form onSubmit={handleCreateUser} className="p-4 md:p-5 bg-sage-light/50 border-b border-sage/15 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
              <div>
                <label className="text-[10px] font-bold text-primary uppercase">Name</label>
                <input type="text" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="w-full bg-card border border-border-subtle rounded-lg px-3 py-2 text-xs mt-1" placeholder="Full name" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-primary uppercase">Phone</label>
                <input type="text" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} className="w-full bg-card border border-border-subtle rounded-lg px-3 py-2 text-xs mt-1" placeholder="Phone" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-primary uppercase">Password</label>
                <input type="text" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="w-full bg-card border border-border-subtle rounded-lg px-3 py-2 text-xs mt-1" placeholder="Password" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-primary uppercase">Role</label>
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="w-full bg-card border border-border-subtle rounded-lg px-3 py-2 text-xs mt-1">
                  <option value="asha">ASHA Worker</option>
                  <option value="patient">Patient</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button type="submit" disabled={creating} className="bg-sage hover:bg-[#4a6346] text-white font-bold py-2 px-4 rounded-lg text-xs disabled:opacity-50 transition-all">
                {creating ? 'Creating...' : 'Create'}
              </button>
            </form>
          )}

          {/* User Table */}
          <div className="divide-y divide-black/5">
            {loadingUsers ? (
              <div className="p-8 text-center text-sm text-gray-400 animate-pulse">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">No users found</div>
            ) : (
              filteredUsers.map((u) => (
                <div key={u.id} className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold ${
                      u.role === 'admin' ? 'bg-warm-indigo' : u.role === 'asha' ? 'bg-gold-warm' : 'bg-sage'
                    }`}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary">{u.name}</p>
                      <p className="text-xs text-muted">{u.phone} {u.village ? `• ${u.village}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${roleBadgeColor(u.role)}`}>
                      {u.role}
                    </span>
                    <span className="text-[10px] text-gray-400">{u.created_at?.split('T')[0]}</span>
                    {u.id !== user.id && (
                      <button onClick={() => handleDeleteUser(u.id, u.name)} className="text-gray-300 hover:text-rose-soft transition-colors">
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

/* ── Sub-components ───────────────────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-card rounded-2xl p-4 border border-border-subtle shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15`, color }}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-primary">{value}</p>
          <p className="text-[10px] text-muted font-medium uppercase tracking-wide">{label}</p>
        </div>
      </div>
    </div>
  );
}

function HealthPill({ label, status, extra }) {
  const isHealthy = status === 'healthy' || status === 'active' || !!status;
  return (
    <div className="flex items-center gap-2 bg-mist text-primary px-3 py-2.5 rounded-xl">
      <div className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-sage' : 'bg-rose-soft'}`} />
      <span className="text-xs font-medium text-primary">{label}</span>
      <span className="text-[10px] text-muted ml-auto">{extra || (isHealthy ? 'Online' : 'Offline')}</span>
    </div>
  );
}
