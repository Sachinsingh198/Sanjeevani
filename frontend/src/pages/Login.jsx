import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sendOtp, resetPasswordWithOtp } from '../api/authClient';
import {
  HeartPulse, Leaf, Eye, EyeOff, Shield, Users, User, KeyRound,
  ArrowRight, Volume2, ArrowLeft, Mail, Phone, RefreshCw, CheckCircle2,
  ShieldCheck, AlertCircle, Loader2
} from 'lucide-react';
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

  // Forgot / Reset password state (2-Step OTP flow)
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: target input, 2: OTP & new pass
  const [resetTarget, setResetTarget] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPass, setNewPass] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState('');
  const [otpTargetType, setOtpTargetType] = useState('contact');

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
      toast.success('Filled User (Mitra) demo credentials');
    }
  };

  const handleSendResetOtp = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!resetTarget.trim()) {
      toast.error('Kripya apna registered Mobile Number, Gmail, ya Username darz karein.');
      return;
    }
    setSendingOtp(true);
    setDevOtpHint('');
    try {
      const res = await sendOtp(resetTarget.trim(), 'reset_password');
      toast.success(res.message || 'OTP bhej diya gaya hai!');
      setOtpTargetType(res.target_type === 'email' ? 'Gmail' : 'Mobile (SMS)');
      if (res.dev_otp) {
        setDevOtpHint(res.dev_otp);
        setResetOtp(res.dev_otp);
      }
      setResetStep(2);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'OTP bhejne me truti aayi. Kripya details check karein.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetTarget.trim() || !resetOtp.trim() || !newPass.trim()) {
      toast.error('Kripya sabhi fields (OTP aur Naya Password) bharein.');
      return;
    }
    if (newPass.trim().length < 6) {
      toast.error('Naya password kam se kam 6 aksharon ka hona chahiye.');
      return;
    }
    setResetting(true);
    try {
      const res = await resetPasswordWithOtp(resetTarget.trim(), resetOtp.trim(), newPass.trim());
      toast.success(res.message || 'Password successfully reset! You can now log in.');
      setPhone(resetTarget.trim());
      setPassword(newPass.trim());
      setShowResetModal(false);
      setResetStep(1);
      setResetTarget('');
      setResetOtp('');
      setNewPass('');
      setDevOtpHint('');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Password reset nahi ho saka. Kripya OTP janch lein.');
    } finally {
      setResetting(false);
    }
  };


  const handleExplainField = (fieldName) => {
    if (fieldName === 'phone') {
      speakCue('Apna registered username, Gmail ya 10 digit mobile number yahan likhein.', 'hi-IN');
    } else if (fieldName === 'password') {
      speakCue('Apna surakshit password yahan darz karein.', 'hi-IN');
    }
  };

  return (
    <div className="min-h-screen bg-mist text-primary flex items-center justify-center px-4 py-12 relative overflow-hidden transition-colors duration-300">
      
      {/* Mountain Contour Background */}
      <div className="absolute top-10 left-0 right-0 pointer-events-none opacity-25 dark:opacity-15 z-0">
        <MountainRidge tone="pine" className="w-full h-44 object-cover" />
      </div>

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-sage/15 via-[#D4A359]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 space-y-6">
        
        {/* Back Link */}
        <div className="text-left">
          <Link
            to="/"
            className="touch-target inline-flex items-center gap-1.5 text-xs font-semibold text-muted dark:text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home Par Wapas</span>
          </Link>
        </div>

        {/* Brand Header */}
        <div className="text-center mb-4">
          <div className="inline-block mb-3 animate-slow-float">
            <SanjeevaniOrb state="idle" size={54} />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-primary">
            Sanjeevani Login
          </h1>
          <p className="text-xs sm:text-sm text-muted dark:text-muted mt-1 flex items-center justify-center gap-1.5">
            <Leaf className="w-3.5 h-3.5 text-sage" />
            Apne Khate Me Pravesh Karein
          </p>
        </div>

        {/* 1-Click Role Quick Fill Bar (DEV builds only) */}
        {import.meta.env.DEV && (
          <div className="bg-card dark:bg-card backdrop-blur-sm rounded-2xl p-3.5 border border-gray-200/80 dark:border-gray-800 shadow-xs">
            <p className="text-[11px] font-bold text-gold-warm dark:text-gold-warm uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              1-Click Demo Quick Login
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickFill('patient')}
                className="touch-target flex flex-col items-center py-2 px-1 rounded-xl bg-sage/10 dark:bg-sage/20 hover:bg-sage/20 dark:hover:bg-sage/30 border border-sage/30 text-primary transition-all cursor-pointer"
              >
                <User className="w-4 h-4 text-sage dark:text-booti-glow mb-0.5" />
                <span className="text-[11px] font-bold leading-tight">User</span>
                <span className="text-[9px] text-muted dark:text-muted">Mitra</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('asha')}
                className="touch-target flex flex-col items-center py-2 px-1 rounded-xl bg-gold-warm/15 dark:bg-gold-warm/20 hover:bg-gold-warm/25 border border-gold-warm/30 text-primary transition-all cursor-pointer"
              >
                <Users className="w-4 h-4 text-gold-warm dark:text-gold-warm mb-0.5" />
                <span className="text-[11px] font-bold leading-tight">ASHA</span>
                <span className="text-[9px] text-muted dark:text-muted">Worker</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('admin')}
                className="touch-target flex flex-col items-center py-2 px-1 rounded-xl bg-warm-indigo/10 dark:bg-white/10 hover:bg-warm-indigo/15 border border-warm-indigo/20 text-primary transition-all cursor-pointer"
              >
                <Shield className="w-4 h-4 text-primary dark:text-booti-glow mb-0.5" />
                <span className="text-[11px] font-bold leading-tight">Admin</span>
                <span className="text-[9px] text-muted dark:text-muted">PHC Desk</span>
              </button>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-white/95 dark:bg-card backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-gray-200/80 dark:border-gray-800 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-primary">
                Username, Gmail, ya Mobile Number
              </label>
              <button
                type="button"
                onClick={() => handleExplainField('phone')}
                className="inline-flex items-center gap-1 text-[11px] text-sage dark:text-booti-glow hover:underline"
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
              placeholder="e.g. sachin_singh, name@gmail.com, ya 9876543210"
              className="w-full bg-white dark:bg-[#1E2A43] text-primary border border-gray-300 dark:border-gray-700 rounded-2xl px-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-sage transition-all"
              autoFocus
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <label className="block text-xs font-semibold text-primary">Password</label>
                <button
                  type="button"
                  onClick={() => handleExplainField('password')}
                  className="inline-flex items-center gap-1 text-[11px] text-sage dark:text-booti-glow hover:underline"
                  title="Aawaz mein sunein"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>सुनें</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="text-[11px] text-sage dark:text-booti-glow font-medium hover:underline"
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
                className="w-full bg-white dark:bg-[#1E2A43] text-primary border border-gray-300 dark:border-gray-700 rounded-2xl px-4 py-4 text-base pr-11 focus:outline-none focus:ring-2 focus:ring-sage transition-all"
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
            className="touch-target w-full bg-sage hover:bg-sage/90 text-white font-bold py-4 rounded-2xl shadow-sm transition-all disabled:opacity-50 text-base flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? 'Sign in ho raha hai...' : <><span>Sign In</span> <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <p className="text-center text-sm text-muted dark:text-muted">
          Sanjeevani par naye hain?{' '}
          <Link to="/register" className="text-sage dark:text-booti-glow font-semibold hover:underline">
            Naya khata banayein (Register)
          </Link>
        </p>

        {/* Password Reset Modal (2-Step OTP Authentication) */}
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-warm-indigo w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-gray-800 space-y-4">
              
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2 text-primary">
                  <div className="p-2 rounded-xl bg-sage/10 dark:bg-sage/20 text-sage dark:text-booti-glow">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base sm:text-lg">Reset Password with OTP</h3>
                    <p className="text-[11px] text-muted dark:text-muted">Surakshit Password Punarsthapana</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-muted dark:text-muted">
                  Kadam {resetStep}/2
                </span>
              </div>

              {resetStep === 1 ? (
                /* Step 1: Enter Username / Gmail / Mobile */
                <form onSubmit={handleSendResetOtp} className="space-y-4">
                  <p className="text-xs text-muted dark:text-muted leading-relaxed">
                    Apna registered Username, Gmail ya 10-digit Mobile Number darz karein. Hum turant aapko ek surakshit 6-digit OTP code bhejenge.
                  </p>

                  <div className="relative">
                    <input
                      type="text"
                      value={resetTarget}
                      onChange={(e) => setResetTarget(e.target.value)}
                      placeholder="e.g. sachin.singh@gmail.com ya 9876543210"
                      required
                      autoFocus
                      className="w-full bg-white dark:bg-[#1E2A43] border border-gray-300 dark:border-gray-700 rounded-2xl pl-10 pr-3.5 py-3 text-xs sm:text-sm text-primary focus:outline-none focus:ring-2 focus:ring-sage"
                    />
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={sendingOtp || !resetTarget.trim()}
                      className="touch-target flex-1 bg-sage hover:bg-sage/90 text-white text-xs font-bold py-3 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      {sendingOtp ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>OTP Bheja Ja Raha Hai...</span>
                        </>
                      ) : (
                        <>
                          <span>OTP Bhejein</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowResetModal(false);
                        setResetTarget('');
                      }}
                      className="touch-target px-4 py-3 text-xs text-muted dark:text-muted hover:text-primary cursor-pointer"
                    >
                      Radd (Cancel)
                    </button>
                  </div>
                </form>
              ) : (
                /* Step 2: Enter OTP & New Password */
                <form onSubmit={handleResetSubmit} className="space-y-4">
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-3 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="space-y-1">
                      <p className="font-semibold">OTP safalta se bhej diya gaya hai!</p>
                      <p className="text-[11px] opacity-90">
                        {otpTargetType} ({resetTarget}) par bheja gaya 6-digit code darz karein (10 minute tak vaidh).
                      </p>
                    </div>
                  </div>

                  {devOtpHint && (
                    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-2.5 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between">
                      <span className="text-[11px] font-medium">Dev Mode OTP: <strong className="tracking-widest font-mono text-sm">{devOtpHint}</strong></span>
                      <button
                        type="button"
                        onClick={() => setResetOtp(devOtpHint)}
                        className="text-[10px] bg-amber-200 dark:bg-amber-800 px-2 py-0.5 rounded font-bold hover:opacity-80"
                      >
                        Auto-fill
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">
                      6-Digit OTP Code *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      required
                      autoFocus
                      className="w-full bg-white dark:bg-[#1E2A43] border border-gray-300 dark:border-gray-700 rounded-2xl px-4 py-3 text-base text-center font-mono tracking-widest text-primary focus:outline-none focus:ring-2 focus:ring-sage"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">
                      Naya Password (Kam se kam 6 akshar) *
                    </label>
                    <input
                      type="password"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="Naya surakshit password"
                      required
                      minLength={6}
                      className="w-full bg-white dark:bg-[#1E2A43] border border-gray-300 dark:border-gray-700 rounded-2xl px-4 py-3 text-xs sm:text-sm text-primary focus:outline-none focus:ring-2 focus:ring-sage"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted dark:text-muted pt-1">
                    <button
                      type="button"
                      onClick={() => setResetStep(1)}
                      className="hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" /> Contact Badlein
                    </button>
                    <button
                      type="button"
                      disabled={sendingOtp}
                      onClick={handleSendResetOtp}
                      className="hover:underline text-sage dark:text-booti-glow font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${sendingOtp ? 'animate-spin' : ''}`} />
                      OTP Dobara Bhejein
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={resetting || resetOtp.length !== 6 || newPass.length < 6}
                      className="touch-target flex-1 bg-sage hover:bg-sage/90 text-white text-xs font-bold py-3 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      {resetting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Password Badla Ja Raha Hai...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Naya Password Set Karein</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowResetModal(false);
                        setResetStep(1);
                        setResetTarget('');
                        setResetOtp('');
                        setNewPass('');
                      }}
                      className="touch-target px-3.5 py-3 text-xs text-muted dark:text-muted hover:text-primary cursor-pointer"
                    >
                      Radd
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
