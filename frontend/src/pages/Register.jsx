import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HeartPulse, Leaf, Eye, EyeOff, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

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
      toast.success(`Swagat hai, ${user.name}! Aapka account ban gaya.`);
      navigate('/patient', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Registration failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mist text-primary flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Soft ambient gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-[#D4A359]/10 via-[#5A7855]/8 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gold-warm flex items-center justify-center text-white mx-auto mb-4 shadow-md">
            <HeartPulse className="w-7 h-7" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-primary">Join Sanjeevani</h1>
          <p className="text-sm text-muted mt-1 flex items-center justify-center gap-1.5">
            <Leaf className="w-3.5 h-3.5 text-sage" />
            Create your patient account
          </p>
        </div>

        {/* Register Card */}
        <form onSubmit={handleSubmit} className="bg-card/90 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-border-subtle space-y-4">
          
          <div>
            <label className="block text-xs font-semibold text-primary mb-1.5">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sunita Devi"
              className="w-full bg-mist text-primary border border-border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7855]/40 transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary mb-1.5">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-gold-warm" /> Village / Town</span>
            </label>
            <input
              type="text"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder="e.g. Mandal, Chamoli"
              className="w-full bg-mist text-primary border border-border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7855]/40 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary mb-1.5">Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full bg-mist text-primary border border-border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7855]/40 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a password"
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
            disabled={loading || !name.trim() || !phone.trim() || !password.trim()}
            className="w-full bg-sage hover:bg-[#4a6346] text-white font-bold py-3 rounded-xl shadow-sm transition-all disabled:opacity-50 text-sm"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {/* Login Link */}
        <p className="text-center text-sm text-muted mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-sage font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
