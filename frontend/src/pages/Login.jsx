import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HeartPulse, Leaf, Eye, EyeOff, Info } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDemoCreds, setShowDemoCreds] = useState(false); // FIX: was always visible in plaintext

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
      const msg = err?.response?.data?.detail || 'Login failed. Please check your credentials.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mist text-primary flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-[#5A7855]/12 via-[#D4A359]/8 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-sage flex items-center justify-center text-white mx-auto mb-4 shadow-md">
            <HeartPulse className="w-7 h-7" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-primary">Welcome Back</h1>
          <p className="text-sm text-muted mt-1 flex items-center justify-center gap-1.5">
            <Leaf className="w-3.5 h-3.5 text-gold-warm" />
            Sign in to your Sanjeevani account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card/90 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-border-subtle space-y-5">

          <div>
            <label className="block text-xs font-semibold text-primary mb-1.5">Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full bg-mist text-primary border border-border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7855]/40 transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary mb-1.5">Password</label>
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
            className="w-full bg-sage hover:bg-[#4a6346] text-white font-bold py-3 rounded-xl shadow-sm transition-all disabled:opacity-50 text-sm"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-5">
          New patient?{' '}
          <Link to="/register" className="text-sage font-semibold hover:underline">
            Create an account
          </Link>
        </p>

        {/* FIX: demo credentials are now behind an explicit disclosure toggle
            instead of sitting in plaintext on every page load — reduces the
            chance of a screenshot or shoulder-surf leaking the admin login. */}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowDemoCreds((v) => !v)}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-muted hover:text-primary py-2"
          >
            <Info className="w-3.5 h-3.5" />
            {showDemoCreds ? 'Hide demo credentials' : 'Judges / reviewers: show demo credentials'}
          </button>
          {showDemoCreds && (
            <div className="bg-sage-light rounded-2xl p-4 border border-sage/15 text-xs text-muted space-y-1 animate-fadeIn">
              <p className="font-semibold text-primary text-xs">Demo Credentials (for evaluation only):</p>
              <p>Admin → phone: <code className="font-mono bg-card px-1.5 py-0.5 rounded">admin</code> / password: <code className="font-mono bg-card px-1.5 py-0.5 rounded">sanjeevani2026</code></p>
              <p className="text-[10px] text-gray-400 pt-1">Change this password before any real deployment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
