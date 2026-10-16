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

      {/* ── 1. Asymmetric 2-Column Hero Section ──────────────────────── */}
      <section className="relative overflow-hidden px-4 lg:px-8 pt-8 pb-14 md:py-16 z-10">
        {/* Ambient Mountain Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[900px] h-[480px] bg-gradient-to-b from-sage/15 via-[#D4A359]/12 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            
            {/* Left Column (7 cols) */}
            <div className="lg:col-span-7 text-center lg:text-left space-y-4">
              {/* Location & Institution Pill Badge */}
              <div className="inline-flex items-center gap-2 bg-card backdrop-blur-md border border-sage/25 shadow-xs px-3.5 py-1.5 rounded-full text-xs font-semibold text-sage">
                <span className="w-2 h-2 rounded-full bg-sage animate-pulse" />
                <Leaf className="w-3.5 h-3.5 text-gold-warm" />
                <span>{l('गोपेश्वर, उत्तराखंड • ग्रामीण एआई स्वास्थ्य साथी', 'Gopeshwar, Uttarakhand • Rural AI Health Companion')}</span>
              </div>

              {/* Display Heading */}
              <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-primary leading-[1.12]">
                {l('स्वास्थ्य और शांति,', 'Swasthya aur Shanti,')} <br />
                <span className="italic font-serif font-normal text-sage dark:text-booti-glow">
                  {l('आपकी अपनी आवाज़ में।', 'Aapki Apni Aawaz Mein.')}
                </span>
              </h1>

              {/* Calming Subtitle */}
              <p className="text-sm sm:text-base text-muted max-w-xl mx-auto lg:mx-0 font-sans leading-relaxed">
                {l(
                  'हिंदी और गढ़वाली में आवाज़-प्रथम लक्षण ट्रायज, आयुष सुरक्षा सत्यापन और अत्याधुनिक ओकुलर एनीमिया व पीलिया स्क्रीनिंग — बिना किसी झिझक के।',
                  'Voice-first Hindi & Garhwali symptom triage, AYUSH safety verification, and edge ocular anemia & jaundice screening for Himalayan rural communities.'
                )}
              </p>

              {/* Primary CTA Row */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-3 mt-7">
                {isAuthenticated ? (
                  <Link
                    to={dashboardPath}
                    className="touch-target inline-flex items-center gap-2 bg-sage hover:bg-sage/90 text-white font-bold px-6 py-3.5 rounded-2xl shadow-md transition-all active:scale-95"
                  >
                    <Compass className="w-4 h-4" />
                    <span>{l('डैशबोर्ड पर जाएं', 'Go to Dashboard')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className="touch-target inline-flex items-center gap-2 bg-sage hover:bg-sage/90 text-white font-bold px-6 py-3.5 rounded-2xl shadow-md transition-all active:scale-95"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{l('संजीवनी में लॉगिन करें', 'Sign In to Sanjeevani')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => setShowLiveRoom(true)}
                  className="touch-target inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-surface hover:bg-sage/15 border-2 border-sage/40 hover:border-sage text-primary font-bold text-sm shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4 text-sage animate-pulse" />
                  <span>{l('🎙️ लाइव बात करें (हिंदी / गढ़वाली)', '🎙️ Talk Live in Hindi / Garhwali')}</span>
                </button>

                {!isAuthenticated && (
                  <Link
                    to="/register"
                    className="touch-target inline-flex items-center gap-2 bg-surface hover:bg-gold-warm/15 border border-gold-warm/40 text-gold-warm font-bold px-5 py-3.5 rounded-2xl shadow-xs transition-all"
                  >
                    <Heart className="w-4 h-4" />
                    <span>{l('नया खाता बनाएं', 'Create Account')}</span>
                  </Link>
                )}
              </div>

              {/* Trust Micro-Metrics Strip */}
              <div className="grid grid-cols-3 gap-3 mt-8 pt-6 border-t border-border-subtle text-left">
                <div className="space-y-0.5">
                  <p className="font-serif font-bold text-base sm:text-lg text-primary">3-Tier MTS</p>
                  <p className="text-[11px] text-muted leading-tight">{l('निश्चयात्मक सुरक्षा', 'Deterministic Safety')}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="font-serif font-bold text-base sm:text-lg text-primary">16+ Formularies</p>
                  <p className="text-[11px] text-muted leading-tight">{l('आयुष कॉन्ट्रा-इंडिकेशन चेक', 'AYUSH Contraindication Checked')}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="font-serif font-bold text-base sm:text-lg text-primary">Edge CV</p>
                  <p className="text-[11px] text-muted leading-tight">{l('एनीमिया व पीलिया स्कैन', 'Anemia & Jaundice Scan')}</p>
                </div>
              </div>
            </div>

            {/* Right Column (5 cols) — Interactive Clinical Preview Card */}
            <div className="lg:col-span-5">
              <div className="bg-card rounded-3xl p-5 sm:p-6 border border-border-subtle shadow-lg space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                  <div className="flex items-center gap-2">
                    <SanjeevaniOrb state="idle" size={32} />
                    <div>
                      <h3 className="font-serif font-bold text-sm text-primary">Sanjeevani Live Triage</h3>
                      <p className="text-[10px] text-muted">Uttarakhand Regional Telemetry</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-sage/15 text-sage px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>

                {/* Dialect Normalization Pill */}
                <div className="p-3 rounded-2xl bg-surface border border-border-subtle text-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                    {l('बोली मानकीकरण (Dialect Normalization):', 'Dialect Normalization:')}
                  </span>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-gold-warm font-semibold">"Mund Peed aur Bukhar"</span>
                    <span className="text-muted">→</span>
                    <span className="text-primary font-bold">Standardized Clinical Triage</span>
                  </div>
                </div>

                {/* 3 Safety Tiers Status Rows */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-sage/10 border border-sage/20 text-sage">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-sage" />
                      <span className="font-bold">Green Tier</span>
                    </div>
                    <span className="text-[11px] font-medium">{l('सत्यापित आयुष देखभाल', 'Verified AYUSH Care')}</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-gold-warm/10 border border-gold-warm/20 text-gold-warm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-gold-warm" />
                      <span className="font-bold">Yellow Tier</span>
                    </div>
                    <span className="text-[11px] font-medium">{l('104 / पीएचसी निगरानी', '104 / PHC Monitoring')}</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-soft/10 border border-rose-soft/20 text-rose-soft">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-soft animate-ping" />
                      <span className="font-bold">Red Tier</span>
                    </div>
                    <span className="text-[11px] font-medium">{l('1-टैप 108 एसओएस डिस्पैच', '1-Tap 108 SOS Override')}</span>
                  </div>
                </div>

                {/* Bottom Quick-Action Strip */}
                <div className="pt-2 border-t border-border-subtle flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLiveRoom(true)}
                    className="flex-1 py-2 px-3 rounded-xl bg-sage hover:bg-sage/90 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Live Voice</span>
                  </button>
                  <Link
                    to={isAuthenticated ? "/mitra/chat" : "/login"}
                    className="flex-1 py-2 px-3 rounded-xl bg-surface hover:bg-sage/10 text-primary border border-border-subtle text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Triage Chat</span>
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 2. "How Sanjeevani Works" 4-Step Pipeline Strip ──────────── */}
      <section className="max-w-6xl mx-auto px-4 lg:px-8 py-10 relative z-10">
        <div className="text-center mb-6">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-primary">
            {l('संजीवनी कैसे काम करती है?', 'How Sanjeevani Works')}
          </h2>
          <p className="text-xs sm:text-sm text-muted mt-1">
            {l('4 चरणों में सुरक्षित, प्रमाणित एवं तुरंत चिकित्सीय निर्णय', '4-step deterministic triage pipeline for mountain health security')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card p-4 sm:p-5 rounded-2xl border border-border-subtle shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-sage/15 text-sage font-bold flex items-center justify-center text-sm">
              1
            </div>
            <h3 className="font-serif font-bold text-sm text-primary">
              {l('बोलें या लिखें', 'Speak or Type')}
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              {l('हिंदी, गढ़वाली, कुमाऊंनी या अंग्रेज़ी में बिना किसी झिझक के अपनी तकलीफ बताएं।', 'Voice or text intake in Hindi, Garhwali, Kumaoni, or English.')}
            </p>
          </div>

          <div className="bg-card p-4 sm:p-5 rounded-2xl border border-border-subtle shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-gold-warm/15 text-gold-warm font-bold flex items-center justify-center text-sm">
              2
            </div>
            <h3 className="font-serif font-bold text-sm text-primary">
              {l('नेगेशन-सचेत ट्रायज', 'Negation-Aware Triage')}
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              {l('मैनचेस्टर ट्रायज सिस्टम (MTS) क्लिनिकल नियमों द्वारा लक्षणों की गंभीरता की पहचान।', 'Clause-bounded negation parsing mapped to Manchester Triage System rules.')}
            </p>
          </div>

          <div className="bg-card p-4 sm:p-5 rounded-2xl border border-border-subtle shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-warm-indigo/15 text-primary font-bold flex items-center justify-center text-sm">
              3
            </div>
            <h3 className="font-serif font-bold text-sm text-primary">
              {l('सुरक्षा ग्राफ फ़िल्टर', 'Safety Graph Filter')}
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              {l('बीपी, अल्सर, गर्भावस्था व मधुमेह के आधार पर हानिकारक औषधियां स्वतः हटा दी जाती हैं।', 'Screens against BP, Ulcers, Pregnancy, and Diabetes via NetworkX contraindication graph.')}
            </p>
          </div>

          <div className="bg-card p-4 sm:p-5 rounded-2xl border border-border-subtle shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-rose-soft/15 text-rose-soft font-bold flex items-center justify-center text-sm">
              4
            </div>
            <h3 className="font-serif font-bold text-sm text-primary">
              {l('प्रमाणित उपचार या 108', 'Verified Care or 108 SOS')}
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              {l('CCRAS-अनुमोदित घरेलू नुस्खे, पीएचसी रेफरल पर्चा, या आपातकालीन 108 एम्बुलेंस समन्वय।', 'Verified CCRAS home remedies, ABDM referral slips, or 1-tap 108 emergency dispatch.')}
            </p>
          </div>
        </div>
      </section>

      {/* ── 3. Core Pillars Grid ─────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 lg:px-8 pb-16 relative z-10">
        <div className="text-center mb-8">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-primary">
            {l('संजीवनी के तीन मुख्य स्तंभ', 'Three Core Foundations')}
          </h2>
          <p className="text-xs sm:text-sm text-muted mt-2 max-w-xl mx-auto">
            {l('शारीरिक आरोग्य, आत्मिक शांति और ग्रामीण स्वास्थ्य सुरक्षा का समग्र संगम।', 'Clinical triage, Vedic mindfulness, and elderly companionship in the hills.')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Clinical Triage & AYUSH Care */}
          <Link
            to={isAuthenticated ? "/mitra/chat" : "/login"}
            className="group bg-card p-6 rounded-3xl border border-border-subtle shadow-xs hover:shadow-md hover:border-sage/50 transition-all h-full flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-sage/15 flex items-center justify-center text-sage mb-4 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="text-[11px] font-bold tracking-wider uppercase text-sage mb-1">
                {l('चिकित्सीय देखभाल', 'Clinical Care')}
              </div>
              <h3 className="font-serif font-bold text-lg text-primary">
                {l('स्वास्थ्य जांच व ट्रायज', 'Health Check & Triage')}
              </h3>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                {l('अपने लक्षण बताएं। आयुष प्रमाणित घरेलू उपचार, पीएचसी परामर्श और 108 आपातकालीन सहायता।', 'Report symptoms for AYUSH home remedies, nearest PHC guidance, and 108 emergency triage.')}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border-subtle flex items-center text-xs font-semibold text-sage group-hover:translate-x-1 transition-transform">
              <span>{l('जांच शुरू करें', 'Start Checkup')}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </div>
          </Link>

          {/* Card 2: Holistic Wellness & Pranayama */}
          <Link
            to={isAuthenticated ? "/mitra/wellness" : "/login"}
            className="group bg-card p-6 rounded-3xl border border-border-subtle shadow-xs hover:shadow-md hover:border-gold-warm/50 transition-all h-full flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-gold-warm/15 flex items-center justify-center text-gold-warm mb-4 group-hover:scale-110 transition-transform">
                <Wind className="w-6 h-6" />
              </div>
              <div className="text-[11px] font-bold tracking-wider uppercase text-gold-warm mb-1">
                {l('आरोग्यशाला व ध्यान', 'Wellness & Calm')}
              </div>
              <h3 className="font-serif font-bold text-lg text-primary">
                {l('प्राणायाम व योगशाला', 'Pranayama & Posture AI')}
              </h3>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                {l('अनुलोम-विलोम, भ्रामरी श्वास क्रिया, रियल-टाइम कैमरा योग पोस्चर और तिब्बती सिंगिंग बाउल ध्वनि।', 'Vedic breathwork, singing bowls, and real-time computer vision posture correction.')}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border-subtle flex items-center text-xs font-semibold text-gold-warm group-hover:translate-x-1 transition-transform">
              <span>{l('आरोग्यशाला खोलें', 'Open Studio')}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </div>
          </Link>

          {/* Card 3: Companion & Eye Screening */}
          <Link
            to={isAuthenticated ? "/mitra/saathi" : "/login"}
            className="group bg-card p-6 rounded-3xl border border-border-subtle shadow-xs hover:shadow-md hover:border-rose-soft/50 transition-all h-full flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-rose-soft/15 flex items-center justify-center text-rose-soft mb-4 group-hover:scale-110 transition-transform">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div className="text-[11px] font-bold tracking-wider uppercase text-rose-soft mb-1">
                {l('साथी व डायग्नोस्टिक्स', 'Care & Screening')}
              </div>
              <h3 className="font-serif font-bold text-lg text-primary">
                {l('बुजुर्ग साथी व नेत्र जांच', 'Companion & Eye Scan')}
              </h3>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                {l('अकेलेपन से राहत देने वाला स्नेही साथी, लोक-कथाएं, और बिना सुई के आंखों से एनीमिया व पीलिया जांच।', 'Empathetic conversation for elders and non-invasive ocular hemoglobin and scleral icterus screening.')}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border-subtle flex items-center text-xs font-semibold text-rose-soft group-hover:translate-x-1 transition-transform">
              <span>{l('सेवाएं देखें', 'Explore Services')}</span>
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