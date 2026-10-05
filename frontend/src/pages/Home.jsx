import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Mic, Eye, Heart, ShieldCheck, PhoneCall, Feather, Leaf,
  LogIn, ArrowRight, Wind, Activity, HeartHandshake, Sparkles, MessageSquare, Compass,
  HelpCircle
} from 'lucide-react';
import LiveVoiceRoom from '../components/LiveVoiceRoom';
import SanjeevaniOrb from '../components/SanjeevaniOrb';
import MountainRidge from '../components/MountainRidge';
import PageVoiceGuide from '../components/PageVoiceGuide';
import OnboardingModal from '../components/OnboardingModal';

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const { l, isHindi } = useLanguage();
  const navigate = useNavigate();
  const [showLiveRoom, setShowLiveRoom] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return !localStorage.getItem('sanjeevani_onboarding_completed');
    } catch {
      return false;
    }
  });

  const handleVoiceAction = () => {
    setShowLiveRoom(true);
  };

  const dashboardPath = user?.role === 'admin' ? '/admin' : user?.role === 'asha' ? '/asha' : '/mitra';

  return (
    <div className="min-h-screen bg-mist text-primary transition-colors duration-300 selection:bg-sage/20 selection:text-primary relative overflow-hidden pb-12 safe-bottom-nav">
      
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

          {/* Alpine Trust Badge & Guide */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-6">
            <div className="inline-flex items-center gap-2 bg-card dark:bg-card backdrop-blur-md border border-sage/25 shadow-xs px-3.5 py-1.5 rounded-full text-xs font-medium text-sage dark:text-[#A7C5A0]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8ED14C] animate-pulse" />
              <Leaf className="w-3.5 h-3.5 text-gold-warm" /> 
              <span>{l('उत्तराखंड गोपेश्वर व चमोली • 108 से जुड़ा', 'Uttarakhand Gopeshwar & Chamoli • Linked with 108')}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowOnboarding(true)}
              className="inline-flex items-center gap-1.5 bg-white/90 dark:bg-warm-indigo/90 hover:bg-white dark:hover:bg-warm-indigo border border-sage/35 hover:border-sage shadow-xs px-3.5 py-1.5 rounded-full text-xs font-bold text-primary dark:text-[#C8D4E0] transition-all cursor-pointer touch-target active:scale-95"
              title={l('संजीवनी कैसे काम करता है', 'How Sanjeevani works')}
            >
              <HelpCircle className="w-3.5 h-3.5 text-sage dark:text-booti-glow" />
              <span>{l('यह कैसे काम करता है?', 'How It Works')}</span>
            </button>
          </div>

          {/* Headline */}
          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-primary leading-[1.14] mb-4">
            {l('स्वास्थ्य सेवा जो बोलती है,', 'Healthcare that speaks,')} <br />
            <span className="italic font-serif font-normal text-sage dark:text-booti-glow">
              {l('सुनती है और परवाह करती है।', 'listens and cares.')}
            </span>
          </h1>

          {/* Calming Subtitle */}
          <p className="mt-4 text-base sm:text-lg text-muted dark:text-muted max-w-2xl mx-auto font-sans leading-relaxed">
            {l(
              'हिमालय के दूरस्थ गांवों के लिए सुरक्षित चिकित्सीय सलाह, ध्यान और आत्मीयता। अपनी भाषा में आराम से बोलिए — बिना किसी झिझक के।',
              'Safe clinical guidance, mindfulness, and care for remote Himalayan villages. Speak comfortably in your language — without hesitation.'
            )}
          </p>

          {/* Voice Guide Audio Introduction */}
          <div className="max-w-xl mx-auto mt-5 text-left">
            <PageVoiceGuide pageKey="home" />
          </div>

          {/* Primary 64px Tactile Voice Action */}
          <div className="mt-6 flex flex-col items-center justify-center gap-4">
            
            <button
              onClick={handleVoiceAction}
              className="touch-target-lg group relative inline-flex items-center justify-center gap-3.5 px-8 py-5 rounded-full bg-gradient-to-r from-[#2B4A30] via-[#5A7855] to-[#2B4A30] text-white font-semibold text-lg sm:text-xl shadow-xl shadow-sage/30 hover:shadow-sage/45 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer"
              aria-label="Sanjeevani Voice consultation"
            >
              <span className="absolute -inset-1 rounded-full bg-[#8ED14C]/30 blur-md group-hover:blur-lg opacity-75 group-hover:opacity-100 transition-opacity animate-pulse pointer-events-none" />
              <div className="relative w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-mist">
                <Mic className="w-5 h-5 animate-bounce" />
              </div>
              <span className="relative tracking-wide">{l('🎙 बोलकर कहें', '🎙 Speak Now')}</span>
            </button>

            {/* Fallback Text Input Option */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted dark:text-muted">
              <span>{l('या फिर:', 'Or:')}</span>
              <Link
                to={isAuthenticated ? "/mitra/chat" : "/login"}
                className="inline-flex items-center gap-1.5 font-medium text-sage dark:text-booti-glow hover:underline underline-offset-4 touch-target"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{l('लिखकर बताएं', 'Type your symptoms')}</span>
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
                  <span>{l('अपने डैशबोर्ड पर जाएं', 'Go to Dashboard')} ({user?.role === 'admin' ? 'Admin' : user?.role === 'asha' ? 'ASHA' : 'Mitra'})</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/about"
                    className="inline-flex items-center gap-2 bg-white dark:bg-warm-indigo border border-gray-200 dark:border-gray-700 px-5 py-2.5 rounded-2xl text-sm font-medium text-primary dark:text-gray-200 hover:border-sage shadow-xs transition-all tactile-card"
                  >
                    <Compass className="w-4 h-4 text-sage" />
                    <span>{l('संजीवनी का परिचय', 'Explore Sanjeevani')}</span>
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 bg-white dark:bg-warm-indigo border border-gray-200 dark:border-gray-700 px-5 py-2.5 rounded-2xl text-sm font-medium text-primary dark:text-gray-200 hover:border-sage shadow-xs transition-all tactile-card"
                  >
                    <LogIn className="w-4 h-4 text-sage" />
                    <span>{l('लॉगिन करें', 'Login')}</span>
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 bg-sand dark:bg-sand border border-gold-warm/40 px-5 py-2.5 rounded-2xl text-sm font-medium text-gold-warm dark:text-gold-warm hover:border-gold-warm shadow-xs transition-all tactile-card"
                  >
                    <Heart className="w-4 h-4 text-gold-warm" />
                    <span>{l('पंजीकरण करें', 'Register')}</span>
                  </Link>
                </>
              )}
            </div>

          </div>

          <p className="text-xs text-muted dark:text-muted mt-6 flex items-center justify-center gap-1.5">
            <Feather className="w-3.5 h-3.5 text-gold-warm" /> 
            {l('गोपेश्वर, चमोली, रुद्रप्रयाग के पहाड़ी क्षेत्रों के लिए 24/7 उपलब्ध', 'Available 24/7 across Gopeshwar, Chamoli and Himalayan regions')}
          </p>
        </div>
      </section>

      {/* 4 Stambh Capability Cards (Sehat, Dhyan, Yogashala, Saathi) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16 relative z-10">
        <div className="text-center mb-8">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-primary">
            {l('चार स्तंभ: स्वास्थ्य, ध्यान, योग और अपनों का साथ', 'Four Pillars: Health, Mindfulness, Yoga and Care')}
          </h2>
          <p className="text-xs sm:text-sm text-muted dark:text-muted mt-2 max-w-xl mx-auto">
            {l('हिमालयी जीवन में शारीरिक आरोग्य, आत्मिक शांति और अकेलेपन से मुक्ति के चार आधार।', 'Four foundations for physical wellness, mental peace, and elder companionship in the hills.')}
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
                {l('चिकित्सीय सहयोग', 'Clinical Care')}
              </div>
              <h3 className="font-serif font-bold text-lg text-primary">
                {l('स्वास्थ्य जांच व सलाह', 'Health Check & Triage')}
              </h3>
              <p className="text-xs text-muted dark:text-muted mt-2 leading-relaxed">
                {l('अपने लक्षण बताएं। आयुष घरेलू उपचार, नजदीकी प्राथमिक स्वास्थ्य केंद्र की सलाह और 108 आपातकालीन सहायता।', 'Share your symptoms for AYUSH home remedies, nearest PHC advice, and 108 emergency triage.')}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center text-xs font-semibold text-sage dark:text-booti-glow group-hover:translate-x-1 transition-transform">
              <span>{l('जांच शुरू करें', 'Start Checkup')}</span>
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
                {l('आत्मिक शांति', 'Mental Calm')}
              </div>
              <h3 className="font-serif font-bold text-lg text-primary">
                {l('प्राणायाम व ध्यान', 'Pranayama & Meditation')}
              </h3>
              <p className="text-xs text-muted dark:text-muted mt-2 leading-relaxed">
                {l('अनुलोम-विलोम, भ्रामरी श्वास क्रिया और तिब्बती सिंगिंग बाउल्स की ध्वनि के साथ मन को शांत करें।', 'Calm your mind with Anulom-Vilom, Bhramari breathwork, and Tibetan singing bowl resonance.')}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center text-xs font-semibold text-gold-warm dark:text-gold-warm group-hover:translate-x-1 transition-transform">
              <span>{l('ध्यान लगाएं', 'Begin Meditation')}</span>
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
                {l('शरीर की मुद्रा', 'Body Posture')}
              </div>
              <h3 className="font-serif font-bold text-lg text-primary">
                {l('योगशाला एआई कोच', 'Yogashala AI Coach')}
              </h3>
              <p className="text-xs text-muted dark:text-muted mt-2 leading-relaxed">
                {l('कैमरे से आसन की जांच करें। रीढ़ की हड्डी का पोस्चर सुधारें और वाणी द्वारा मार्गदर्शन पाएं।', 'Real-time camera posture tracking. Correct spinal alignment with audio guidance.')}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center text-xs font-semibold text-primary dark:text-muted group-hover:translate-x-1 transition-transform">
              <span>{l('आसन शुरू करें', 'Start Yoga')}</span>
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
                {l('मन का हाल', 'Heart-to-Heart')}
              </div>
              <h3 className="font-serif font-bold text-lg text-primary">
                {l('संजीवनी साथी', 'Sanjeevani Companion')}
              </h3>
              <p className="text-xs text-muted dark:text-muted mt-2 leading-relaxed">
                {l('अकेलेपन से राहत। दिल की बात सुनने वाला साथी जो भावनाओं का आदर करे और कहानियां सुनाए।', 'A warm friend to talk to, hear folk stories, and overcome isolation.')}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center text-xs font-semibold text-rose-soft dark:text-rose-soft group-hover:translate-x-1 transition-transform">
              <span>{l('बात शुरू करें', 'Start Conversation')}</span>
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
              <span>{l('आपातकाल: 108 डायल करें', 'Emergency: Dial 108')}</span>
            </a>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <a 
              href="tel:104"
              className="hover:underline touch-target"
            >
              {l('स्वास्थ्य हेल्पलाइन: 104', 'Medical Helpline: 104')}
            </a>
          </div>
        </div>
      </footer>

      {/* First-Time User Onboarding Guide */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onStartChat={() => navigate(isAuthenticated ? '/mitra/chat' : '/login')}
      />

    </div>
  );
}