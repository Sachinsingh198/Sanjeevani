import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import AccessibilityBar from './AccessibilityBar';
import {
  HeartPulse, MessageSquare, Eye, Users, Info, PhoneCall,
  LogOut, LogIn, Shield, Menu, X, User, Sun, Moon,
  Wind, Activity, HeartHandshake, ChevronDown, Sparkles, Navigation,
  Stethoscope, BarChart3, AlertTriangle, ShieldCheck
} from 'lucide-react';
import SanjeevaniOrb from './SanjeevaniOrb';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, isAsha, isPatient, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
    setMoreDropdownOpen(false);
  }, [location.pathname]);

  const morePatientLinks = [
    { name: 'नेत्र जांच (Eye Screening)', path: '/mitra/screen', icon: Eye, desc: 'Non-invasive anemia & jaundice screening' },
    { name: 'संजीवनी के बारे में (About)', path: '/about', icon: Info, desc: 'Project mission, team & ethical AI' },
  ];

  const brandHomePath = !isAuthenticated
    ? '/'
    : isAdmin
    ? '/admin'
    : isAsha
    ? '/asha'
    : '/mitra';

  return (
    <header className="sticky top-0 z-40 bg-mist/95 dark:bg-mist/95 backdrop-blur-md border-b border-warm-indigo/10 dark:border-white/10 px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 transition-all select-none">
      <div className="max-w-6xl mx-auto flex items-center justify-between">

        {/* Brand */}
        <Link to={brandHomePath} className="flex items-center gap-2 sm:gap-3 group focus:outline-none focus:ring-2 focus:ring-sage rounded-xl p-0.5 sm:p-1">
          <div className="hidden sm:block"><SanjeevaniOrb state="idle" size={38} /></div>
          <div className="sm:hidden"><SanjeevaniOrb state="idle" size={30} /></div>
          <div>
            <div className="font-serif text-lg sm:text-xl font-bold tracking-tight text-primary flex items-center gap-1 sm:gap-1.5">
              <span>Sanjeevani</span>
              <span className="text-[9px] sm:text-[10px] bg-gold-warm/20 text-gold-warm dark:text-gold-warm px-1 sm:px-1.5 py-0.2 rounded font-sans uppercase font-bold tracking-wider">
                2.0
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-muted dark:text-muted font-sans font-medium">Himalayan Health & Triage</p>
          </div>
        </Link>

        {/* Desktop Navigation Hierarchy */}
        <nav className="hidden md:flex items-center gap-1">
          {!isAuthenticated ? (
            /* PUBLIC NAVBAR */
            <>
              <Link
                to="/"
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  location.pathname === '/' ? 'bg-sage text-white shadow-xs' : 'text-primary hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {t('nav_home')}
              </Link>
              <Link
                to="/about"
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  location.pathname === '/about' ? 'bg-sage text-white shadow-xs' : 'text-primary hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {t('nav_about')}
              </Link>
              <Link
                to="/login"
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  location.pathname === '/login' ? 'bg-sage text-white shadow-xs' : 'text-primary hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {t('login')}
              </Link>
              <Link
                to="/register"
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  location.pathname === '/register' ? 'bg-gold-warm text-primary shadow-xs' : 'text-gold-warm dark:text-gold-warm hover:bg-gold-warm/10'
                }`}
              >
                {t('register')}
              </Link>
            </>
          ) : isAdmin ? (
            /* ADMIN NAVBAR */
            <>
              <Link
                to="/admin"
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  location.pathname === '/admin' ? 'bg-warm-indigo text-white shadow-xs' : 'text-primary hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                Control Center
              </Link>
              <Link
                to="/about"
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  location.pathname === '/about' ? 'bg-warm-indigo text-white shadow-xs' : 'text-primary hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                About
              </Link>
            </>
          ) : isAsha ? (
            /* ASHA NAVBAR */
            <>
              <Link
                to="/asha"
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  location.pathname === '/asha' ? 'bg-gold-warm text-primary shadow-xs' : 'text-primary hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                Field Portal
              </Link>
              <Link
                to="/mitra/screen"
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  location.pathname === '/mitra/screen' || location.pathname === '/patient/screen'
                    ? 'bg-sage text-white shadow-xs'
                    : 'text-primary hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                Screenings
              </Link>
              <Link
                to="/about"
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  location.pathname === '/about' ? 'bg-sage text-white shadow-xs' : 'text-primary hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                About
              </Link>
            </>
          ) : (
            /* MITRA / PATIENT NAVBAR: Home | Sehat | Dhyan | Yoga | Saathi | More */
            <>
              <Link
                to="/mitra"
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  location.pathname === '/mitra' || location.pathname === '/patient'
                    ? 'bg-sage text-white shadow-xs'
                    : 'text-primary hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                Home
              </Link>

              <Link
                to="/mitra/chat"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  location.pathname === '/mitra/chat' || location.pathname === '/patient/chat'
                    ? 'bg-sage text-white shadow-xs'
                    : 'text-primary hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5 text-gold-warm" />
                <span>Sehat</span>
              </Link>

              <Link
                to="/mitra/wellness"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  location.pathname.includes('/wellness') || location.pathname.includes('/yoga') || location.pathname.includes('/meditation')
                    ? 'bg-sage text-white shadow-xs'
                    : 'text-primary hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-gold-warm" />
                <span>Wellness (आरोग्य)</span>
              </Link>

              <Link
                to="/mitra/saathi"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  location.pathname === '/mitra/saathi' || location.pathname === '/patient/saathi' || location.pathname === '/patient/companion'
                    ? 'bg-sage text-white shadow-xs'
                    : 'text-primary hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5 text-rose-soft" />
                <span>Saathi</span>
              </Link>

              {/* More Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    moreDropdownOpen ? 'bg-gold-warm/20 text-primary' : 'text-primary hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  aria-expanded={moreDropdownOpen}
                  aria-haspopup="true"
                >
                  <span>More</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {moreDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-3xl bg-white dark:bg-warm-indigo border border-gray-200/80 dark:border-gray-800 shadow-xl p-2 z-50 animate-fadeIn space-y-1">
                    {morePatientLinks.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-start gap-2.5 p-3 rounded-2xl transition-all ${
                            isActive ? 'bg-sage/15 text-sage dark:text-booti-glow font-bold' : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-primary'
                          }`}
                        >
                          <Icon className="w-4 h-4 mt-0.5 text-gold-warm shrink-0" />
                          <div>
                            <p className="text-xs font-bold leading-tight">{item.name}</p>
                            <p className="text-[11px] text-muted dark:text-muted leading-tight mt-0.5">{item.desc}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Accessibility scaling & language */}
          <div className="hidden sm:block">
            <AccessibilityBar />
          </div>

          {/* Emergency 108 SOS Pill */}
          <a
            href="tel:108"
            className="flex items-center gap-1 sm:gap-1.5 bg-rose-soft hover:bg-rose-soft/90 text-white text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-xs transition-transform active:scale-95 touch-target sm:min-h-0 sm:min-w-0"
            title="Call 108 Emergency Ambulance"
          >
            <PhoneCall className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-pulse" />
            <span className="font-sans">108 SOS</span>
          </a>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 text-muted dark:text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold-warm" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />}
          </button>

          {/* User Profile & Logout */}
          {isAuthenticated ? (
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-sage/15 dark:bg-sage/25 px-3 py-1.5 rounded-xl text-xs font-semibold text-primary">
                <User className="w-3.5 h-3.5 text-sage dark:text-booti-glow" />
                <span className="max-w-[110px] truncate">{user.name}</span>
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-full ${
                  isAdmin ? 'bg-warm-indigo text-white' :
                  isAsha ? 'bg-gold-warm text-primary' :
                  'bg-sage text-white'
                }`}>
                  {isAdmin ? 'Admin' : isAsha ? 'ASHA' : 'Mitra'}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 text-muted dark:text-muted hover:text-rose-soft dark:hover:text-[#FF7878] hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden md:flex items-center gap-1.5 bg-sage hover:bg-sage/90 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-primary hover:bg-black/5 dark:hover:bg-white/5 p-1.5 sm:p-2 rounded-xl"
            aria-label="Open mobile navigation menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 space-y-2 animate-fadeIn">
          {!isAuthenticated ? (
            <>
              <Link to="/" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-primary hover:bg-black/5">
                Home
              </Link>
              <Link to="/about" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-primary hover:bg-black/5">
                About
              </Link>
              <Link to="/login" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold bg-sage text-white shadow-xs">
                <LogIn className="w-4 h-4" /> Sign In
              </Link>
              <Link to="/register" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold bg-gold-warm text-primary shadow-xs">
                <Sparkles className="w-4 h-4" /> Sign Up (Naya Khata)
              </Link>
            </>
          ) : (
            <>
              {isPatient && (
                <>
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted dark:text-muted">Sanjeevani Mitra Seva</div>
                  <Link to="/mitra" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-bold text-primary hover:bg-black/5">
                    <SanjeevaniOrb state="idle" size={24} /> Home (Mitra Hub)
                  </Link>
                  <Link to="/mitra/chat" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-bold text-primary hover:bg-black/5">
                    <Stethoscope className="w-4 h-4 text-gold-warm" /> Sehat (Clinical Triage)
                  </Link>
                  <Link to="/mitra/wellness" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-bold text-primary hover:bg-black/5">
                    <Sparkles className="w-4 h-4 text-gold-warm" /> Wellness Studio (आरोग्यशाला)
                  </Link>
                  <Link to="/mitra/saathi" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-bold text-primary hover:bg-black/5">
                    <HeartHandshake className="w-4 h-4 text-rose-soft" /> Sanjeevani Saathi (Companionship)
                  </Link>
                  <Link to="/mitra/screen" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-bold text-primary hover:bg-black/5">
                    <Eye className="w-4 h-4 text-sage" /> Aankhon Ki Jaanch (Eye Screening)
                  </Link>
                  <Link to="/about" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-bold text-primary hover:bg-black/5">
                    <Info className="w-4 h-4 text-gold-warm" /> About Sanjeevani
                  </Link>
                </>
              )}

              {isAsha && (
                <>
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted dark:text-muted">ASHA Field Portal</div>
                  <Link to="/asha" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold bg-gold-warm text-primary">
                    <Users className="w-4 h-4" /> Field Dashboard
                  </Link>
                  <Link to="/mitra/screen" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-primary hover:bg-black/5">
                    <Eye className="w-4 h-4 text-sage" /> Screenings
                  </Link>
                  <Link to="/about" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-primary hover:bg-black/5">
                    <Info className="w-4 h-4 text-gold-warm" /> About
                  </Link>
                </>
              )}

              {isAdmin && (
                <>
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted dark:text-muted">Admin Control Center</div>
                  <Link to="/admin" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold bg-warm-indigo text-white">
                    <Shield className="w-4 h-4" /> Control Center
                  </Link>
                  <Link to="/about" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-primary hover:bg-black/5">
                    <Info className="w-4 h-4 text-gold-warm" /> About
                  </Link>
                </>
              )}

              <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-bold text-rose-soft dark:text-rose-soft hover:bg-rose-soft/10"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out ({user.name})
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}