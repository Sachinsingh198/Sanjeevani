import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HeartPulse, Leaf, Eye, EyeOff, MapPin, ArrowRight, ArrowLeft, Volume2, User, Phone, Lock, Sparkles } from 'lucide-react';
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
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !password.trim()) return;

    setLoading(true);
    try {
      const user = await register(name.trim(), phone.trim(), password, village.trim());
      toast.success(`Swagat hai, ${user.name}! Aapka Sanjeevani Mitra account ban gaya.`);
      navigate('/mitra', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Registration failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleExplain = () => {
    speakCue('Sanjeevani Mitra mein apna naam, gaon, phone number aur password darz karke khata banayein.', 'hi-IN');
  };

  return (
    <div className="min-h-screen bg-[#F4F6F0] dark:bg-[#151D28] text-[#1E2A43] dark:text-[#EAEFEA] flex items-center justify-center px-4 py-12 relative overflow-hidden transition-colors duration-300">
      
      {/* Mountain Silhouette Background */}
      <div className="absolute top-10 left-0 right-0 pointer-events-none opacity-25 dark:opacity-15 z-0">
        <MountainRidge tone="pine" className="w-full h-44 object-cover" />
      </div>

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-[#D4A359]/15 via-[#5A7855]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

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
        <div className="text-center mb-4">
          <div className="inline-block mb-3 animate-slow-float">
            <SanjeevaniOrb state="idle" size={54} />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2E4057] dark:text-[#F4F6F0]">
            Naya Khata Banayein
          </h1>
          <p className="text-xs sm:text-sm text-[#556376] dark:text-[#A8B4C2] mt-1 flex items-center justify-center gap-1.5">
            <Leaf className="w-3.5 h-3.5 text-[#5A7855]" />
            Sanjeevani Mitra Seva Se Judein
          </p>
        </div>

        {/* Register Card */}
        <form onSubmit={handleSubmit} className="bg-white/95 dark:bg-[#1E2A43]/95 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-gray-200/80 dark:border-gray-800 space-y-4">
          
          <div className="flex items-center justify-between pb-1 border-b border-gray-100 dark:border-gray-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C5E24] dark:text-[#D4A359] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Citizen Registration
            </span>
            <button
              type="button"
              onClick={handleExplain}
              className="inline-flex items-center gap-1 text-[11px] text-[#5A7855] dark:text-[#8ED14C] hover:underline"
              title="Aawaz mein sunein"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>सुनें</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E2A43] dark:text-[#F4F6F0] mb-1.5">
              Pura Naam (Full Name) *
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sunita Devi"
                className="w-full bg-gray-50 dark:bg-[#151D28] text-[#1E2A43] dark:text-[#F4F6F0] border border-gray-300 dark:border-gray-700 rounded-2xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7855] transition-all"
                autoFocus
                required
              />
              <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E2A43] dark:text-[#F4F6F0] mb-1.5">
              Gaon ya Kasba (Village / Town)
            </label>
            <div className="relative">
              <input
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="e.g. Mandal, Chamoli"
                className="w-full bg-gray-50 dark:bg-[#151D28] text-[#1E2A43] dark:text-[#F4F6F0] border border-gray-300 dark:border-gray-700 rounded-2xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7855] transition-all"
              />
              <MapPin className="w-4 h-4 text-[#D4A359] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E2A43] dark:text-[#F4F6F0] mb-1.5">
              Phone Number *
            </label>
            <div className="relative">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full bg-gray-50 dark:bg-[#151D28] text-[#1E2A43] dark:text-[#F4F6F0] border border-gray-300 dark:border-gray-700 rounded-2xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7855] transition-all"
                required
              />
              <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E2A43] dark:text-[#F4F6F0] mb-1.5">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password banayein"
                className="w-full bg-gray-50 dark:bg-[#151D28] text-[#1E2A43] dark:text-[#F4F6F0] border border-gray-300 dark:border-gray-700 rounded-2xl pl-10 pr-11 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7855] transition-all"
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

          <button
            type="submit"
            disabled={loading || !name.trim() || !phone.trim() || !password.trim()}
            className="touch-target w-full bg-[#5A7855] hover:bg-[#4a6346] text-white font-bold py-3.5 rounded-2xl shadow-sm transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? 'Khata ban raha hai...' : <><span>Khata Banayein</span> <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <p className="text-center text-sm text-[#556376] dark:text-[#A8B4C2] mt-4">
          Pahle se khata hai?{' '}
          <Link to="/login" className="text-[#2B4A30] dark:text-[#8ED14C] font-semibold hover:underline">
            Login Karein
          </Link>
        </p>
      </div>
    </div>
  );
}
