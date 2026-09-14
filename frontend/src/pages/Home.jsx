import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Mic, Eye, Heart, ShieldCheck, PhoneCall, Feather, Leaf, LogIn, ArrowRight } from 'lucide-react';
import LiveVoiceRoom from '../components/LiveVoiceRoom';

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const [showLiveRoom, setShowLiveRoom] = useState(false);

  return (
    <div className="min-h-screen bg-mist text-primary text-[#2A2E35]">
      
      {/* Live Continuous Voice Modal */}
      {showLiveRoom && <LiveVoiceRoom onClose={() => setShowLiveRoom(false)} />}

      {/* Gentle Hero Section */}
      <section className="relative overflow-hidden px-4 lg:px-8 pt-16 pb-20 md:pt-24 md:pb-28">
        
        {/* Soft Background Himalayan Ambient Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-b from-[#5A7855]/15 via-[#D4A359]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          
          <div className="inline-flex items-center gap-2 bg-card border border-sage/20 shadow-sm px-4 py-1.5 rounded-full text-xs font-semibold text-sage mb-6 animate-slow-float">
            <Leaf className="w-3.5 h-3.5 text-gold-warm" /> 
            <span>Aapke Swasthya Ka Sahyogi • Gopeshwar, Uttarakhand</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-primary leading-tight">
            Swasthya aur Shanti, <br className="hidden sm:inline" />
            <span className="italic font-normal text-sage">Aapki Apni Aawaz Mein.</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-primary max-w-2xl mx-auto font-sans leading-relaxed">
            Sanjeevani is designed to bring reassurance and clear clinical guidance to your family. Talk freely in Hindi or Garhwali, get verified remedies, or screen your eye health without stress.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-wrap justify-center items-center gap-4">
            
            {isAuthenticated ? (
              // Logged-in: Go to dashboard
              <Link
                to={user?.role === 'admin' ? '/admin' : user?.role === 'asha' ? '/asha' : '/patient'}
                className="flex items-center gap-3 bg-sage hover:bg-[#4a6346] text-white px-7 py-4 rounded-2xl font-bold text-base shadow-lg shadow-[#5A7855]/25 hover:shadow-xl transition-all transform hover:-translate-y-0.5"
              >
                <ArrowRight className="w-5 h-5" />
                <span>Go to Dashboard</span>
              </Link>
            ) : (
              // Not logged in: Login + Register
              <>
                <Link
                  to="/login"
                  className="flex items-center gap-3 bg-sage hover:bg-[#4a6346] text-white px-7 py-4 rounded-2xl font-bold text-base shadow-lg shadow-[#5A7855]/25 hover:shadow-xl transition-all transform hover:-translate-y-0.5 group"
                >
                  <div className="w-7 h-7 rounded-full bg-card/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <LogIn className="w-4 h-4" />
                  </div>
                  <span>Sign In to Sanjeevani</span>
                </Link>

                <Link
                  to="/register"
                  className="flex items-center gap-2 bg-card hover:bg-gray-50 border border-border-subtle text-primary px-6 py-4 rounded-2xl font-bold text-base shadow-sm transition-all"
                >
                  <Heart className="w-5 h-5 text-sage" />
                  <span>Create Account</span>
                </Link>
              </>
            )}

          </div>

          <p className="text-xs text-muted mt-4 flex items-center justify-center gap-1.5">
            <Feather className="w-3.5 h-3.5 text-gold-warm" /> 
            No typing needed — just speak naturally as you would to a caring doctor.
          </p>
        </div>
      </section>

      {/* 3 Reassuring Pillars (Peace of Mind) */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-card backdrop-blur-sm p-6 rounded-3xl border border-sage/15 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-sage/10 flex items-center justify-center text-sage mb-4">
              <Leaf className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-lg text-primary">Verified Ayurvedic Care</h3>
            <p className="text-xs text-muted mt-2 leading-relaxed">
              Safe, authentic home remedies from the Ministry of AYUSH that honor traditional Himalayan wellness.
            </p>
          </div>

          <div className="bg-card backdrop-blur-sm p-6 rounded-3xl border border-gold-warm/20 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-gold-warm/15 flex items-center justify-center text-gold-warm mb-4">
              <Heart className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-lg text-primary">Gentle Clinical Safety</h3>
            <p className="text-xs text-muted mt-2 leading-relaxed">
              Careful symptom monitoring with zero guesswork, ensuring you always know when it is time to visit a clinic.
            </p>
          </div>

          <div className="bg-card backdrop-blur-sm p-6 rounded-3xl border border-[#B85042]/15 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-rose-soft/10 flex items-center justify-center text-rose-soft mb-4">
              <PhoneCall className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-lg text-primary">1-Tap Emergency Care</h3>
            <p className="text-xs text-muted mt-2 leading-relaxed">
              Instant 108 emergency SOS with mountain route navigation when life-saving care is urgent.
            </p>
          </div>

        </div>
      </section>

    </div>
  );
}