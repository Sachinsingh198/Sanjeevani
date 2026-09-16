import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resetPassword } from '../api/authClient';
import { HeartPulse, Leaf, Eye, EyeOff, Shield, Users, User, KeyRound, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot / Reset password state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPhone, setResetPhone] = useState('');
  const [newPass, setNewPass] = useState('');
  const [resetting, setResetting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone.trim() || !password.trim()) return;

    setLoading(true);
    try {
      const user = await login(phone.trim(), password);
      toast.success(`Namaste, ${user.name}!`);

      if (user.role === 'admin') navigate('/admin', { replace: true });
      else if (user.role === 'asha') navigate('/asha', { replace: true });
      else navigate('/patient', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Login failed. Please verify your phone/username and password.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (role) => {
    if (role === 'admin') {
      setPhone('admin');
      setPassword('sanjeevani2026');
      toast.success('Filled Admin demo credentials');
    } else if (role === 'asha') {
      setPhone('asha');
      setPassword('sanjeevani2026');
      toast.success('Filled ASHA Worker demo credentials');
    } else if (role === 'patient') {
      setPhone('patient');
      setPassword('sanjeevani2026');
      toast.success('Filled Patient demo credentials');
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetPhone.trim() || !newPass.trim()) return;
    setResetting(true);
    try {
      const res = await resetPassword(resetPhone.trim(), newPass.trim());
      toast.success(res.message || 'Password successfully reset! You can now log in.');
      setPhone(resetPhone.trim());
      setPassword(newPass.trim());
      setShowResetModal(false);
      setResetPhone('');
      setNewPass('');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to reset password. Please check the phone number.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-mist text-primary flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-[#5A7855]/12 via-[#D4A359]/8 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-sage flex items-center justify-center text-white mx-auto mb-4 shadow-md animate-slow-float">
            <HeartPulse className="w-7 h-7" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-primary">Welcome Back</h1>
          <p className="text-sm text-muted mt-1 flex items-center justify-center gap-1.5">
            <Leaf className="w-3.5 h-3.5 text-gold-warm" />
            Sign in to your Sanjeevani account
          </p>
        </div>

        {/* 1-Click Role Quick Fill Bar */}
        <div className="bg-card/90 backdrop-blur-sm rounded-2xl p-3 border border-border-subtle shadow-xs">
          <p className="text-[10px] font-bold uppercase text-muted tracking-wider text-center mb-2">
            Quick 1-Click Demo Login
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickFill('admin')}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-warm-indigo/10 hover:bg-warm-indigo hover:text-white text-primary transition-all text-center"
            >
              <Shield className="w-4 h-4 mb-1 text-warm-indigo group-hover:text-white" />
              <span className="text-[11px] font-bold">Admin</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('asha')}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-gold-warm/15 hover:bg-gold-warm hover:text-white text-primary transition-all text-center"
            >
              <Users className="w-4 h-4 mb-1 text-gold-warm group-hover:text-white" />
              <span className="text-[11px] font-bold">ASHA</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('patient')}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-sage/15 hover:bg-sage hover:text-white text-primary transition-all text-center"
            >
              <User className="w-4 h-4 mb-1 text-sage group-hover:text-white" />
              <span className="text-[11px] font-bold">Patient</span>
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-card/90 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-border-subtle space-y-4">
          <div>
            <label className="block text-xs font-semibold text-primary mb-1.5">
              Phone Number or Username
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 8191980879 or admin / asha / patient"
              className="w-full bg-mist text-primary border border-border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7855]/40 transition-all"
              autoFocus
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-primary">Password</label>
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="text-[11px] text-sage font-medium hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-mist text-primary border border-border-subtle rounded-xl px-4 py-3 text-sm pr-11 focus:outline-none focus:ring-2 focus:ring-[#5A7855]/40 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-muted"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !phone.trim() || !password.trim()}
            className="w-full bg-sage hover:bg-[#4a6346] text-white font-bold py-3 rounded-xl shadow-sm transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2"
          >
            {loading ? 'Signing in...' : <><span>Sign In</span> <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <p className="text-center text-sm text-muted">
          New patient?{' '}
          <Link to="/register" className="text-sage font-semibold hover:underline">
            Create an account
          </Link>
        </p>

        {/* Password Reset Modal */}
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-card w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-border-subtle space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <KeyRound className="w-5 h-5 text-gold-warm" />
                <h3 className="font-serif font-bold text-lg">Reset Account Password</h3>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Enter your registered phone number or username and set a new password.
              </p>
              <form onSubmit={handleResetSubmit} className="space-y-3">
                <input
                  type="text"
                  value={resetPhone}
                  onChange={(e) => setResetPhone(e.target.value)}
                  placeholder="Registered phone or username"
                  required
                  className="w-full bg-mist border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs text-primary focus:outline-none focus:ring-2 focus:ring-sage/40"
                />
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="New password (min 4 characters)"
                  required
                  minLength={4}
                  className="w-full bg-mist border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs text-primary focus:outline-none focus:ring-2 focus:ring-sage/40"
                />
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={resetting || !resetPhone.trim() || !newPass.trim()}
                    className="flex-1 bg-sage hover:bg-[#4a6346] text-white text-xs font-bold py-2.5 rounded-xl transition-all disabled:opacity-50"
                  >
                    {resetting ? 'Updating...' : 'Update Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="px-3.5 py-2.5 text-xs text-muted hover:text-primary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

