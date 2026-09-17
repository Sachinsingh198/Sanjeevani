import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resetPassword } from '../api/authClient';
import { HeartPulse, Leaf, Eye, EyeOff, Shield, Users, User, KeyRound, ArrowRight, Volume2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import SanjeevaniOrb from '../components/SanjeevaniOrb';
import MountainRidge from '../components/MountainRidge';
import { speakCue } from '../lib/audioSynthesizer';

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
      toast.success(`Namaste, ${user.name}! 🙏`);

      if (user.role === 'admin') navigate('/admin', { replace: true });
      else if (user.role === 'asha') navigate('/asha', { replace: true });
      else navigate('/mitra', { replace: true });
    } catch (err) {
      const msg = !err?.response
        ? 'Cannot connect to backend server. Please ensure the backend is running on port 8000.'
        : err?.response?.data?.detail || 'Login failed. Please verify your phone/username and password.';
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
      toast.success('Filled Sanjeevani Mitra demo credentials');
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

  const handleExplainField = (fieldName) => {
    if (fieldName === 'phone') {
      speakCue('Apna registered mobile number ya username yahan likhein.', 'hi-IN');
    } else if (fieldName === 'password') {
      speakCue('Apna surakshit password yahan darz karein.', 'hi-IN');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F0] dark:bg-[#151D28] text-[#1E2A43] dark:text-[#EAEFEA] flex items-center justify-center px-4 py-12 relative overflow-hidden transition-colors duration-300">
      
      {/* Mountain Contour Background */}
      <div className="absolute top-10 left-0 right-0 pointer-events-none opacity-25 dark:opacity-15 z-0">
        <MountainRidge tone="pine" className="w-full h-44 object-cover" />
      </div>

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-[#5A7855]/15 via-[#D4A359]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 space-y-6">
        
        {/* Back Link */}
        <div className="text-left">
          <Link
            to="/"
            className="touch-target inline-flex items-center gap-1.5 text-xs font-semibold text-[#556376] dark:text-[#A8B4C2] hover:text-[#1E2A43] dark:hover:text-[#F4F6F0] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home Par Wapas</span>
          </Link>
        </div>

        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-block mb-3 animate-slow-float">
            <SanjeevaniOrb state="idle" size={54} />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2E4057] dark:text-[#F4F6F0]">
            Sanjeevani Login
          </h1>
          <p className="text-xs sm:text-sm text-[#556376] dark:text-[#A8B4C2] mt-1 flex items-center justify-center gap-1.5">
            <Leaf className="w-3.5 h-3.5 text-[#D4A359]" />
            Apne khate mein pravesh karein
          </p>
        </div>

        {/* 1-Click Role Quick Fill Bar */}
        <div className="bg-white/95 dark:bg-[#1E2A43]/95 backdrop-blur-sm rounded-3xl p-4 border border-gray-200/80 dark:border-gray-800 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-[#556376] dark:text-[#A8B4C2] tracking-wider text-center mb-2.5">
            1-Click Demo Quick Login
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('patient')}
              className="touch-target flex flex-col items-center justify-center py-2 px-1 rounded-2xl bg-[#5A7855]/15 hover:bg-[#5A7855] hover:text-white text-[#2B4A30] dark:text-[#8ED14C] transition-all text-center cursor-pointer"
            >
              <User className="w-4 h-4 mb-1" />
              <span className="text-[11px] font-bold">Mitra (नागरिक)</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('asha')}
              className="touch-target flex flex-col items-center justify-center py-2 px-1 rounded-2xl bg-[#D4A359]/20 hover:bg-[#D4A359] hover:text-[#1E2A43] text-[#8C5E24] dark:text-[#D4A359] transition-all text-center cursor-pointer"
            >
              <Users className="w-4 h-4 mb-1" />
              <span className="text-[11px] font-bold">ASHA</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('admin')}
              className="touch-target flex flex-col items-center justify-center py-2 px-1 rounded-2xl bg-[#1E2A43]/10 dark:bg-white/10 hover:bg-[#1E2A43] dark:hover:bg-white hover:text-white dark:hover:text-[#1E2A43] text-[#1E2A43] dark:text-[#F4F6F0] transition-all text-center cursor-pointer"
            >
              <Shield className="w-4 h-4 mb-1" />
              <span className="text-[11px] font-bold">Admin</span>
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-white/95 dark:bg-[#1E2A43]/95 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-gray-200/80 dark:border-gray-800 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#1E2A43] dark:text-[#F4F6F0]">
                Phone Number ya Username
              </label>
              <button
                type="button"
                onClick={() => handleExplainField('phone')}
                className="inline-flex items-center gap-1 text-[11px] text-[#5A7855] dark:text-[#8ED14C] hover:underline"
                title="Aawaz mein sunein"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>सुनें</span>
              </button>
            </div>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 8191980879 or admin / asha / patient"
              className="w-full bg-gray-50 dark:bg-[#151D28] text-[#1E2A43] dark:text-[#F4F6F0] border border-gray-300 dark:border-gray-700 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7855] transition-all"
              autoFocus
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <label className="block text-xs font-semibold text-[#1E2A43] dark:text-[#F4F6F0]">Password</label>
                <button
                  type="button"
                  onClick={() => handleExplainField('password')}
                  className="inline-flex items-center gap-1 text-[11px] text-[#5A7855] dark:text-[#8ED14C] hover:underline"
                  title="Aawaz mein sunein"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>सुनें</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="text-[11px] text-[#2B4A30] dark:text-[#8ED14C] font-medium hover:underline"
              >
                Password bhool gaye?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password darz karein"
                className="w-full bg-gray-50 dark:bg-[#151D28] text-[#1E2A43] dark:text-[#F4F6F0] border border-gray-300 dark:border-gray-700 rounded-2xl px-4 py-3.5 text-sm pr-11 focus:outline-none focus:ring-2 focus:ring-[#5A7855] transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="touch-target absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !phone.trim() || !password.trim()}
            className="touch-target w-full bg-[#5A7855] hover:bg-[#4a6346] text-white font-bold py-3.5 rounded-2xl shadow-sm transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? 'Sign in ho raha hai...' : <><span>Sign In</span> <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <p className="text-center text-sm text-[#556376] dark:text-[#A8B4C2]">
          Sanjeevani par naye hain?{' '}
          <Link to="/register" className="text-[#2B4A30] dark:text-[#8ED14C] font-semibold hover:underline">
            Naya khata banayein (Register)
          </Link>
        </p>

        {/* Password Reset Modal */}
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-[#1E2A43] w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-gray-800 space-y-4">
              <div className="flex items-center gap-2 text-[#1E2A43] dark:text-[#F4F6F0]">
                <KeyRound className="w-5 h-5 text-[#D4A359]" />
                <h3 className="font-serif font-bold text-lg">Reset Account Password</h3>
              </div>
              <p className="text-xs text-[#556376] dark:text-[#A8B4C2] leading-relaxed">
                Apna registered phone number ya username darz karke naya password banayein.
              </p>
              <form onSubmit={handleResetSubmit} className="space-y-3">
                <input
                  type="text"
                  value={resetPhone}
                  onChange={(e) => setResetPhone(e.target.value)}
                  placeholder="Registered phone or username"
                  required
                  className="w-full bg-gray-50 dark:bg-[#151D28] border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-[#1E2A43] dark:text-[#F4F6F0] focus:outline-none focus:ring-2 focus:ring-[#5A7855]"
                />
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Naya password (kam se kam 4 akshar)"
                  required
                  minLength={4}
                  className="w-full bg-gray-50 dark:bg-[#151D28] border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-[#1E2A43] dark:text-[#F4F6F0] focus:outline-none focus:ring-2 focus:ring-[#5A7855]"
                />
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={resetting || !resetPhone.trim() || !newPass.trim()}
                    className="touch-target flex-1 bg-[#5A7855] hover:bg-[#4a6346] text-white text-xs font-bold py-2.5 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {resetting ? 'Updating...' : 'Naya Password Set Karein'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="touch-target px-3.5 py-2.5 text-xs text-[#556376] dark:text-[#A8B4C2] hover:text-[#1E2A43] cursor-pointer"
                  >
                    Radd (Cancel)
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
