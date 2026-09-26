import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checkUsernameAvailability, sendOtp, verifyOtp } from '../api/authClient';
import {
  HeartPulse, Leaf, Eye, EyeOff, MapPin, ArrowRight, ArrowLeft,
  Volume2, User, Phone, Lock, Sparkles, Mail, AtSign, CheckCircle2, AlertCircle, Loader2,
  ShieldCheck, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import SanjeevaniOrb from '../components/SanjeevaniOrb';
import MountainRidge from '../components/MountainRidge';
import { speakCue } from '../lib/audioSynthesizer';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [village, setVillage] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // OTP Verification state for registration
  const [showOtpBox, setShowOtpBox] = useState(false);
  const [otpTarget, setOtpTarget] = useState('');
  const [otpTargetType, setOtpTargetType] = useState('sms'); // 'sms' or 'email'
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState('');

  // Username validation & auto-suggestions state
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null); // null, true, false

  const [suggestions, setSuggestions] = useState([]);
  const debounceTimerRef = useRef(null);

  // Debounced username availability check
  useEffect(() => {
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || cleanUser.length < 3) {
      setUsernameAvailable(null);
      setSuggestions([]);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setUsernameChecking(true);
      try {
        const res = await checkUsernameAvailability(cleanUser, name.trim());
        setUsernameAvailable(res.available);
        setSuggestions(res.suggestions || []);
      } catch (err) {
        console.error('Failed to check username:', err);
      } finally {
        setUsernameChecking(false);
      }
    }, 350);

    return () => clearTimeout(debounceTimerRef.current);
  }, [username, name]);

  // Phone input sanitizer: accepts only digits up to 10 chars
  const handlePhoneChange = (e) => {
    const rawVal = e.target.value;
    // Strip non-digits
    const digitsOnly = rawVal.replace(/\D/g, '').slice(0, 10);
    setPhone(digitsOnly);
  };

  // Username input sanitizer: only lowercase alphanumeric and underscore
  const handleUsernameChange = (e) => {
    const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
    setUsername(sanitized);
  };

  // Select one of the auto-suggested usernames
  const handleSelectSuggestion = (sugg) => {
    setUsername(sugg);
    setUsernameAvailable(true);
    setSuggestions([]);
    toast.success(`Username '${sugg}' chuna gaya!`);
  };

  // Generate username suggestions from name if user clicks Auto-Suggest
  const handleAutoSuggestUsername = async () => {
    const baseName = name.trim() || 'mitra';
    setUsernameChecking(true);
    try {
      const res = await checkUsernameAvailability(baseName.replace(/\s+/g, '_').toLowerCase(), baseName);
      if (res.available) {
        setUsername(res.username);
        setUsernameAvailable(true);
      } else if (res.suggestions && res.suggestions.length > 0) {
        setUsername(res.suggestions[0]);
        setUsernameAvailable(true);
        setSuggestions(res.suggestions.slice(1));
      }
      toast.success('Username automatically suggest kiya gaya!');
    } catch (err) {
      toast.error('Suggestion prapt nahi ho saka.');
    } finally {
      setUsernameChecking(false);
    }
  };

  // Validation helpers
  const isPhoneValid = phone.length === 10 && /^[6-9]\d{9}$/.test(phone);
  const isEmailValid = !email.trim() || /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(email.trim());

  // OTP handlers
  const handleTriggerOtp = async (type = 'sms') => {
    const targetVal = type === 'sms' ? phone.trim() : email.trim();
    if (type === 'sms' && !isPhoneValid) {
      toast.error('Kripya pehle ek maanya 10-digit mobile number darz karein.');
      return;
    }
    if (type === 'email' && (!targetVal || !isEmailValid)) {
      toast.error('Kripya pehle ek maanya Gmail ya Email address darz karein.');
      return;
    }

    setSendingOtp(true);
    setOtpTarget(targetVal);
    setOtpTargetType(type);
    setDevOtpHint('');
    try {
      const res = await sendOtp(targetVal, 'register');
      toast.success(res.message || 'OTP bhej diya gaya hai!');
      if (res.dev_otp) {
        setDevOtpHint(res.dev_otp);
        setOtpCode(res.dev_otp);
      }
      setShowOtpBox(true);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'OTP bhejne me truti aayi.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      toast.error('Kripya 6-digit OTP code darz karein.');
      return;
    }
    setVerifyingOtp(true);
    try {
      const res = await verifyOtp(otpTarget, otpCode.trim(), 'register');
      toast.success(res.message || 'OTP safaltapoorvak verify ho gaya!');
      if (otpTargetType === 'sms') {
        setPhoneVerified(true);
      } else {
        setEmailVerified(true);
      }
      setShowOtpBox(false);
      setOtpCode('');
      setDevOtpHint('');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Galat ya expired OTP code.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Kripya apna pura naam darz karein.');
      return;
    }
    if (!isPhoneValid) {
      toast.error('Kripya ek maanya 10-digit mobile number darz karein (6-9 se shuru hone wala).');
      return;
    }
    if (username.trim() && usernameAvailable === false) {
      toast.error('Yeh username pehle se kisi aur ka hai. Kripya dusra chunein.');
      return;
    }
    if (!isEmailValid) {
      toast.error('Kripya ek sahi Email ya Gmail address darz karein.');
      return;
    }

    if (!password.trim() || password.length < 6) {
      toast.error('Password kam se kam 6 aksharon ka hona chahiye.');
      return;
    }

    setLoading(true);
    try {
      const user = await register({
        name: name.trim(),
        phone: phone.trim(),
        password,
        username: username.trim() || undefined,
        email: email.trim() || undefined,
        village: village.trim(),
      });
      toast.success(`Swagat hai, ${user.name}! Aapka Sanjeevani khata ban gaya. 🙏`);
      navigate('/mitra', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Registration failed. Please try again.';
      toast.error(typeof msg === 'string' ? msg : 'Registration me truti aayi.');
    } finally {
      setLoading(false);
    }
  };

  const handleExplain = () => {
    speakCue('Sanjeevani Mitra mein apna naam, 10 digit mobile number, username aur Gmail darz karke naya khata banayein.', 'hi-IN');
  };

  return (
    <div className="min-h-screen bg-mist text-primary flex items-center justify-center px-4 py-12 relative overflow-hidden transition-colors duration-300">
      
      {/* Mountain Silhouette Background */}
      <div className="absolute top-10 left-0 right-0 pointer-events-none opacity-25 dark:opacity-15 z-0">
        <MountainRidge tone="pine" className="w-full h-44 object-cover" />
      </div>

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-gold-warm/15 via-[#5A7855]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        
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
        <div className="text-center mb-2">
          <div className="inline-block mb-3 animate-slow-float">
            <SanjeevaniOrb state="idle" size={54} />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-primary">
            Naya Khata Banayein
          </h1>
          <p className="text-xs sm:text-sm text-muted dark:text-muted mt-1 flex items-center justify-center gap-1.5">
            <Leaf className="w-3.5 h-3.5 text-sage" />
            Sanjeevani Mitra Seva Se Judein
          </p>
        </div>

        {/* Register Card */}
        <form onSubmit={handleSubmit} className="bg-white/95 dark:bg-card backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-gray-200/80 dark:border-gray-800 space-y-4">
          
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gold-warm dark:text-gold-warm flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> User Registration
            </span>
            <button
              type="button"
              onClick={handleExplain}
              className="inline-flex items-center gap-1 text-[11px] text-sage dark:text-booti-glow hover:underline"
              title="Aawaz mein sunein"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>सुनें</span>
            </button>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-primary mb-1.5">
              Pura Naam (Full Name) *
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sachin Singh"
                className="w-full bg-white dark:bg-[#1E2A43] text-primary border border-gray-300 dark:border-gray-700 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sage transition-all"
                autoFocus
                required
              />
              <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Username Field with Auto-Suggestion */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-primary">
                Username (Login ke liye) *
              </label>
              <button
                type="button"
                onClick={handleAutoSuggestUsername}
                disabled={usernameChecking}
                className="inline-flex items-center gap-1 text-[11px] text-sage dark:text-booti-glow hover:underline font-medium cursor-pointer"
                title="Naam se username suggest karein"
              >
                <Sparkles className="w-3 h-3 text-gold-warm" />
                <span>Auto-Suggest</span>
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={handleUsernameChange}
                placeholder="e.g. sachin_singh"
                className={`w-full bg-white dark:bg-[#1E2A43] text-primary border rounded-2xl pl-10 pr-10 py-3 text-sm focus:outline-none transition-all ${
                  usernameAvailable === true
                    ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500'
                    : usernameAvailable === false
                    ? 'border-rose-500 focus:ring-2 focus:ring-rose-500'
                    : 'border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-sage'
                }`}
                required
              />
              <AtSign className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                {usernameChecking && <Loader2 className="w-4 h-4 text-sage animate-spin" />}
                {!usernameChecking && usernameAvailable === true && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" title="Username uplabdh hai" />
                )}
                {!usernameChecking && usernameAvailable === false && (
                  <AlertCircle className="w-4 h-4 text-rose-500" title="Username pehle se liya gaya hai" />
                )}
              </div>
            </div>

            {/* Live Username Status & Auto-Suggestions */}
            {usernameAvailable === true && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Username uplabdh hai!</span>
              </p>
            )}

            {usernameAvailable === false && (
              <div className="mt-1.5 space-y-1.5">
                <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>Yeh username pehle se liya gaya hai. Niche se chunein:</span>
                </p>
                {suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {suggestions.map((sugg) => (
                      <button
                        key={sugg}
                        type="button"
                        onClick={() => handleSelectSuggestion(sugg)}
                        className="text-[11px] font-medium bg-sage/10 dark:bg-sage/20 text-sage dark:text-booti-glow border border-sage/30 hover:bg-sage hover:text-white px-2.5 py-1 rounded-full transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span>@{sugg}</span>
                        <span className="text-[9px] opacity-70">+ use</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Number - Strictly numeric with +91 indicator and OTP verification */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-primary">
                Mobile Number (Sirf 10 Digits) *
              </label>
              <div className="flex items-center gap-2">
                {phoneVerified ? (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Verified ✓
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={!isPhoneValid || sendingOtp}
                    onClick={() => handleTriggerOtp('sms')}
                    className="text-[11px] font-semibold text-sage dark:text-booti-glow hover:underline disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>OTP Verify</span>
                  </button>
                )}
                <span className={`text-[10px] font-medium ${isPhoneValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                  {phone.length}/10
                </span>
              </div>
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 select-none">
                🇮🇳 +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="9876543210"
                className={`w-full bg-white dark:bg-[#1E2A43] text-primary border rounded-2xl pl-16 pr-10 py-3 text-sm focus:outline-none transition-all ${
                  isPhoneValid
                    ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500'
                    : phone.length > 0
                    ? 'border-amber-400 focus:ring-2 focus:ring-amber-400'
                    : 'border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-sage'
                }`}
                required
              />
              <div className="absolute right-3.5 flex items-center pointer-events-none">
                {phoneVerified ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : isPhoneValid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Phone className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </div>
            {phone.length > 0 && !isPhoneValid && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                {phone.length < 10
                  ? `Kripya pura 10-digit number darz karein (${10 - phone.length} baki hain)`
                  : 'Mobile number 6, 7, 8, ya 9 se shuru hona chahiye.'}
              </p>
            )}
          </div>

          {/* Email / Gmail Field with Optional OTP Verification */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-primary">
                Gmail ya Email Address
              </label>
              <div className="flex items-center gap-2">
                {emailVerified ? (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Verified ✓
                  </span>
                ) : email && isEmailValid ? (
                  <button
                    type="button"
                    disabled={sendingOtp}
                    onClick={() => handleTriggerOtp('email')}
                    className="text-[11px] font-semibold text-sage dark:text-booti-glow hover:underline disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>OTP Verify</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-gray-400">Optional / Login ke liye</span>
                )}
              </div>
            </div>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. sachin.singh@gmail.com"
                className={`w-full bg-white dark:bg-[#1E2A43] text-primary border rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none transition-all ${
                  email && !isEmailValid
                    ? 'border-rose-500 focus:ring-2 focus:ring-rose-500'
                    : 'border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-sage'
                }`}
              />
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {email && !isEmailValid && (
              <p className="text-[11px] text-rose-500 mt-1">
                Kripya sahi format me email darz karein (e.g. name@gmail.com).
              </p>
            )}
          </div>

          {/* Interactive OTP Verification Drawer */}
          {showOtpBox && (
            <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-3.5 space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  {otpTargetType === 'sms' ? 'Mobile (SMS)' : 'Gmail'} OTP Verification
                </span>
                <button
                  type="button"
                  onClick={() => setShowOtpBox(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <p className="text-[11px] text-emerald-800 dark:text-emerald-200">
                OTP <strong>{otpTarget}</strong> par bhej diya gaya hai (10 minute tak vaidh).
              </p>

              {devOtpHint && (
                <div className="flex items-center justify-between bg-amber-100/80 dark:bg-amber-900/40 rounded-xl px-2.5 py-1 text-[11px] text-amber-900 dark:text-amber-200">
                  <span>Dev Mode OTP: <strong className="font-mono tracking-widest">{devOtpHint}</strong></span>
                  <button
                    type="button"
                    onClick={() => setOtpCode(devOtpHint)}
                    className="text-[10px] font-bold text-amber-800 dark:text-amber-300 underline"
                  >
                    Auto-fill
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-Digit OTP"
                  className="flex-1 bg-white dark:bg-[#1E2A43] border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-center font-mono tracking-widest text-sm focus:outline-none focus:ring-2 focus:ring-sage"
                />
                <button
                  type="button"
                  disabled={verifyingOtp || otpCode.length !== 6}
                  onClick={handleVerifyOtp}
                  className="bg-sage hover:bg-sage/90 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  {verifyingOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Verify</span>
                </button>
                <button
                  type="button"
                  disabled={sendingOtp}
                  onClick={() => handleTriggerOtp(otpTargetType)}
                  className="text-[11px] text-sage dark:text-booti-glow hover:underline px-1 cursor-pointer flex items-center gap-0.5"
                  title="Dobara OTP Bhejein"
                >
                  <RefreshCw className={`w-3 h-3 ${sendingOtp ? 'animate-spin' : ''}`} />
                  <span>Resend</span>
                </button>
              </div>
            </div>
          )}


          {/* Village / Town */}
          <div>
            <label className="block text-xs font-semibold text-primary mb-1.5">
              Gaon ya Kasba (Village / Town)
            </label>
            <div className="relative">
              <input
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="e.g. Mandal, Chamoli"
                className="w-full bg-white dark:bg-[#1E2A43] text-primary border border-gray-300 dark:border-gray-700 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sage transition-all"
              />
              <MapPin className="w-4 h-4 text-gold-warm absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-primary mb-1.5">
              Password (Kam se kam 6 akshar) *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password banayein"
                className="w-full bg-white dark:bg-[#1E2A43] text-primary border border-gray-300 dark:border-gray-700 rounded-2xl pl-10 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sage transition-all"
                required
              />
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !name.trim() || !isPhoneValid || !password.trim() || usernameAvailable === false}
            className="touch-target w-full bg-sage hover:bg-sage/90 text-white font-bold py-3.5 rounded-2xl shadow-sm transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Khata ban raha hai...
              </span>
            ) : (
              <>
                <span>Khata Banayein</span> <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-muted dark:text-muted mt-4">
          Pahle se khata hai?{' '}
          <Link to="/login" className="text-sage dark:text-booti-glow font-semibold hover:underline">
            Login Karein
          </Link>
        </p>
      </div>
    </div>
  );
}

