import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Mic, Eye, Heart, ShieldCheck, PhoneCall, Feather, Leaf,
  LogIn, ArrowRight, Wind, Activity, HeartHandshake, Sparkles, MessageSquare, Compass
} from 'lucide-react';
import LiveVoiceRoom from '../components/LiveVoiceRoom';
import SanjeevaniOrb from '../components/SanjeevaniOrb';
import MountainRidge from '../components/MountainRidge';

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [showLiveRoom, setShowLiveRoom] = useState(false);

  const handleVoiceAction = () => {
    setShowLiveRoom(true);
  };

  const dashboardPath = user?.role === 'admin' ? '/admin' : user?.role === 'asha' ? '/asha' : '/mitra';

  return (
    <div className="min-h-screen bg-mist text-primary transition-colors duration-300 selection:bg-sage/20 selection:text-primary relative overflow-hidden">
      
      {/* Live Continuous Voice Modal */}
      {showLiveRoom && <LiveVoiceRoom onClose={() => setShowLiveRoom(false)} />}

      {/* Gentle Mountain Contour Background Silhouette */}
      <div className="absolute top-28 left-0 right-0 pointer-events-none opacity-40 dark:opacity-20 z-0">
        <MountainRidge tone="pine" className="w-full h-44 object-cover" />
      </div>

      {/* Himalayan Alpenglow Hero Section */}
      <section className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-10 pb-16 md:pt-16 md:pb-24 z-10">
        
        {/* Ambient Mountain Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[900px] h-[480px] bg-gradient-to-b from-sage/15 via-[#D4A359]/12 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-24 right-10 w-72 h-72 bg-[#8ED14C]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          
          {/* Brand Emblem & Living Orb */}
          <div className="inline-flex flex-col items-center justify-center mb-5 animate-slow-float">
            <SanjeevaniOrb state="idle" size={68} />
          </div>

          {/* Alpine Trust Badge */}
          <div className="inline-flex items-center gap-2.5 bg-card dark:bg-card backdrop-blur-md border border-sage/25 shadow-xs px-4 py-2 rounded-full text-xs sm:text-sm font-medium text-sage dark:text-[#A7C5A0] mb-6">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8ED14C] animate-pulse" />
            <Leaf className="w-3.5 h-3.5 text-gold-warm" /> 
            <span>Uttarakhand Swasthya Sahyogi • Gopeshwar & Chamoli • 108 Se Juda</span>
          </div>

          {/* Headline */}
          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-primary leading-[1.14] mb-4">
            Healthcare that speaks, <br />
            <span className="italic font-serif font-normal text-sage dark:text-booti-glow">
              listens and cares.
            </span>
          </h1>

          {/* Calming Subtitle in Hindi & English */}
          <p className="mt-4 text-base sm:text-lg text-muted dark:text-muted max-w-2xl mx-auto font-sans leading-relaxed">
            Himalaya ke door-daraaz gaon ke liye surakshit clinical salah, dhyan, aur apnapan. 
            Hindi ya Garhwali mein aaram se boliye — bina kisi jhijhak ke.
          </p>

          {/* Primary 64px Tactile Voice Action */}
          <div className="mt-8 flex flex-col items-center justify-center gap-4">
            
            <button
              onClick={handleVoiceAction}
              className="touch-target-lg group relative inline-flex items-center justify-center gap-3.5 px-8 py-5 rounded-full bg-gradient-to-r from-[#2B4A30] via-[#5A7855] to-[#2B4A30] text-white font-semibold text-lg sm:text-xl shadow-xl shadow-sage/30 hover:shadow-sage/45 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer"
              aria-label="Sanjeevani se baat karein - Voice consultation shuru karein"
            >
              <span className="absolute -inset-1 rounded-full bg-[#8ED14C]/30 blur-md group-hover:blur-lg opacity-75 group-hover:opacity-100 transition-opacity animate-pulse pointer-events-none" />
              <div className="relative w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-mist">
                <Mic className="w-5 h-5 animate-bounce" />
              </div>
              <span className="relative tracking-wide">🎙 Bolkar Kahen (Speak Now)</span>
            </button>

            {/* Fallback Text Input Option */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted dark:text-muted">
              <span>Ya fir:</span>
              <Link
                to={isAuthenticated ? "/mitra/chat" : "/login"}
                className="inline-flex items-center gap-1.5 font-medium text-sage dark:text-booti-glow hover:underline underline-offset-4 touch-target"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Likh kar batayein (Type your symptoms)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Auth / Explore Navigation Pills */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {isAuthenticated ? (
                <Link
                  to={dashboardPath}
                  className="inline-flex items-center gap-2 bg-white dark:bg-warm-indigo border border-sage/30 px-5 py-2.5 rounded-2xl font-medium text-sm text-primary shadow-xs hover:border-sage transition-all tactile-card"
                >
                  <Compass className="w-4 h-4 text-sage" />
                  <span>Apne Dashboard Par Jayein ({user?.role === 'admin' ? 'Admin' : user?.role === 'asha' ? 'ASHA' : 'Mitra'})</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/about"
                    className="inline-flex items-center gap-2 bg-white dark:bg-warm-indigo border border-gray-200 dark:border-gray-700 px-5 py-2.5 rounded-2xl text-sm font-medium text-primary dark:text-gray-200 hover:border-sage shadow-xs transition-all tactile-card"
                  >
                    <Compass className="w-4 h-4 text-sage" />
                    <span>Explore Sanjeevani</span>
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 bg-white dark:bg-warm-indigo border border-gray-200 dark:border-gray-700 px-5 py-2.5 rounded-2xl text-sm font-medium text-primary dark:text-gray-200 hover:border-sage shadow-xs transition-all tactile-card"
                  >
                    <LogIn className="w-4 h-4 text-sage" />
                    <span>Login</span>
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 bg-sand dark:bg-sand border border-gold-warm/40 px-5 py-2.5 rounded-2xl text-sm font-medium text-gold-warm dark:text-gold-warm hover:border-gold-warm shadow-xs transition-all tactile-card"
                  >
                    <Heart className="w-4 h-4 text-gold-warm" />
                    <span>Register</span>
                  </Link>
                </>
              )}
            </div>

          </div>

          <p className="text-xs text-muted dark:text-muted mt-6 flex items-center justify-center gap-1.5">
            <Feather className="w-3.5 h-3.5 text-gold-warm" /> 
            Gopeshwar, Chamoli, Rudraprayag ke pahadi ilaqo ke liye 24/7 uplabdh
          </p>
        </div>
      </section>

      {/* 4 Stambh Capability Cards (Sehat, Dhyan, Yogashala, Saathi) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16 relative z-10">
        <div className="text-center mb-8">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-primary">
            Char Stambh: Swasthya, Dhyan, Yoga aur Apno Ka Saath
          </h2>
          <p className="text-xs sm:text-sm text-muted dark:text-muted mt-2 max-w-xl mx-auto">
            Himalayi jeevan mein shaaririk arogya, aatmik shanti aur akelepan se mukti ke chaar aadhar.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* 1. Health Check & Triage */}
          <Link
            to={isAuthenticated ? "/mitra/chat" : "/login"}
            className="group bg-white dark:bg-warm-indigo p-6 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-xs hover:shadow-md hover:border-sage/50 transition-all flex flex-col justify-between tactile-card"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-sage/15 dark:bg-sage/25 flex items-center justify-center text-sage dark:text-booti-glow mb-4 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="text-[11px] font-bold tracking-wider uppercase text-sage dark:text-booti-glow mb-1">
                Clinical Sahyog
              </div>
              <h3 className="font-serif font-bold text-lg text-primary">
                Sehat (Swasthya Jaanch)
              </h3>
              <p className="text-xs text-muted dark:text-muted mt-2 leading-relaxed">
                Apne lakshan batayein. AYUSH gharelu nuskhe, nazdeeki PHC salah aur 108 emergency madad.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center text-xs font-semibold text-sage dark:text-booti-glow group-hover:translate-x-1 transition-transform">
              <span>Jaanch Shuru Karein</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </div>
          </Link>

          {/* 2. Dhyan & Pranayama */}
          <Link
            to={isAuthenticated ? "/mitra/meditation" : "/login"}
            className="group bg-white dark:bg-warm-indigo p-6 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-xs hover:shadow-md hover:border-gold-warm/50 transition-all flex flex-col justify-between tactile-card"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-gold-warm/15 dark:bg-gold-warm/25 flex items-center justify-center text-gold-warm dark:text-gold-warm mb-4 group-hover:scale-110 transition-transform">
                <Wind className="w-6 h-6" />
              </div>
              <div className="text-[11px] font-bold tracking-wider uppercase text-gold-warm dark:text-gold-warm mb-1">
                Aatmik Shanti
              </div>
              <h3 className="font-serif font-bold text-lg text-primary">
                Dhyan Guru (Pranayama)
              </h3>
              <p className="text-xs text-muted dark:text-muted mt-2 leading-relaxed">
                Anulom-Vilom, Bhramari saans kriya aur Tibetan singing bowls ki aawaz ke saath mann shant karein.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center text-xs font-semibold text-gold-warm dark:text-gold-warm group-hover:translate-x-1 transition-transform">
              <span>Dhyan Lagayein</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </div>
          </Link>

          {/* 3. AI Yoga & Posture Guru */}
          <Link
            to={isAuthenticated ? "/mitra/yoga" : "/login"}
            className="group bg-white dark:bg-warm-indigo p-6 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-xs hover:shadow-md hover:border-warm-indigo/50 transition-all flex flex-col justify-between tactile-card"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-warm-indigo/15 dark:bg-warm-indigo/30 flex items-center justify-center text-primary dark:text-muted mb-4 group-hover:scale-110 transition-transform">
                <Activity className="w-6 h-6" />
              </div>
              <div className="text-[11px] font-bold tracking-wider uppercase text-primary dark:text-muted mb-1">
                Sharir Ki Mudra
              </div>
              <h3 className="font-serif font-bold text-lg text-primary">
                Yogashala (AI Coach)
              </h3>
              <p className="text-xs text-muted dark:text-muted mt-2 leading-relaxed">
                Camera se aasan ki jaanch. Reerh ki haddi ka posture sudharein aur aawaz dwara margdarshan payein.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center text-xs font-semibold text-primary dark:text-muted group-hover:translate-x-1 transition-transform">
              <span>Aasan Shuru Karein</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </div>
          </Link>

          {/* 4. Sanjeevani Saathi (Elderly / lonely companion) */}
          <Link
            to={isAuthenticated ? "/mitra/saathi" : "/login"}
            className="group bg-white dark:bg-warm-indigo p-6 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-xs hover:shadow-md hover:border-rose-soft/50 transition-all flex flex-col justify-between tactile-card"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-rose-soft/15 dark:bg-rose-soft/25 flex items-center justify-center text-rose-soft dark:text-rose-soft mb-4 group-hover:scale-110 transition-transform">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div className="text-[11px] font-bold tracking-wider uppercase text-rose-soft dark:text-rose-soft mb-1">
                Mann Ka Haal
              </div>
              <h3 className="font-serif font-bold text-lg text-primary">
                Sanjeevani Saathi
              </h3>
              <p className="text-xs text-muted dark:text-muted mt-2 leading-relaxed">
                Akelepan se doori. Dil ki baat sunne wala sathi jo bhavnaon ka aadar kare aur kisse-kahaniyan sunaye.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center text-xs font-semibold text-rose-soft dark:text-rose-soft group-hover:translate-x-1 transition-transform">
              <span>Baat Shuru Karein</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </div>
          </Link>

        </div>
      </section>

      {/* Emergency Strip at Footer */}
      <footer className="border-t border-gray-200/70 dark:border-gray-800/80 bg-card dark:bg-warm-indigo/80 backdrop-blur-md py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted dark:text-muted">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sage" />
            <span>Sanjeevani 2.0 • Ayush & Health Informatics Initiative • IT Gopeshwar</span>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href="tel:108"
              className="inline-flex items-center gap-1.5 font-bold text-rose-soft dark:text-rose-soft hover:underline touch-target"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Aapaatkaal: Dial 108</span>
            </a>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <a 
              href="tel:104"
              className="hover:underline touch-target"
            >
              Medical Helpline: 104
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}