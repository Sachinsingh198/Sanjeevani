import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  HeartPulse, MessageSquare, Eye, Users, Info, PhoneCall,
  LogOut, LogIn, Shield, Menu, X, User, Sun, Moon
} from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, isAsha, isPatient, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  // Build nav links based on role
  const getNavLinks = () => {
    if (!isAuthenticated) {
      return [
        { name: 'Home', path: '/' },
        { name: 'About', path: '/about', icon: Info },
      ];
    }

    if (isAdmin) {
      return [
        { name: 'Dashboard', path: '/admin', icon: Shield },
        { name: 'About', path: '/about', icon: Info },
      ];
    }

    if (isAsha) {
      return [
        { name: 'Field Portal', path: '/asha', icon: Users },
        { name: 'About', path: '/about', icon: Info },
      ];
    }

    // Patient
    return [
      { name: 'Dashboard', path: '/patient', icon: HeartPulse },
      { name: 'Chat Room', path: '/patient/chat', icon: MessageSquare },
      { name: 'Eye Scan', path: '/patient/screen', icon: Eye },
      { name: 'About', path: '/about', icon: Info },
    ];
  };

  const navLinks = getNavLinks();

  return (
    <header className="sticky top-0 z-40 bg-mist text-primary/90 backdrop-blur-md border-b border-border-subtle px-4 lg:px-8 py-3 transition-all">
      <div className="max-w-6xl mx-auto flex items-center justify-between">

        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-sage flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <div className="font-serif text-xl font-bold tracking-tight text-primary flex items-center gap-1.5">
              Sanjeevani <span className="text-[10px] bg-gold-warm/20 text-primary px-1.5 py-0.2 rounded font-sans uppercase font-bold">2.0</span>
            </div>
            <p className="text-[10px] text-muted font-sans">Rural Health & Triage • IT Gopeshwar</p>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-sage text-white shadow-sm'
                    : 'text-primary hover:bg-black/5'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Emergency SOS */}
          <a
            href="tel:108"
            className="flex items-center gap-1.5 bg-rose-soft hover:bg-[#a14336] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm"
          >
            <PhoneCall className="w-3 h-3" />
            <span className="hidden sm:inline">108 SOS</span>
          </a>

          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            className="p-1.5 text-muted hover:text-primary hover:bg-black/5 rounded-xl transition-all"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Auth Buttons */}
          {isAuthenticated ? (
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-sage-light px-3 py-1.5 rounded-xl text-xs font-medium text-primary">
                <User className="w-3.5 h-3.5 text-sage" />
                <span>{user.name}</span>
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                  isAdmin ? 'bg-warm-indigo text-white' :
                  isAsha ? 'bg-gold-warm text-white' :
                  'bg-sage text-white'
                }`}>{user.role}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-muted hover:text-rose-soft text-xs font-semibold px-2 py-1.5 rounded-xl hover:bg-black/5 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden md:flex items-center gap-1.5 bg-sage hover:bg-[#4a6346] text-white text-xs font-bold px-4 py-1.5 rounded-xl shadow-sm transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-primary hover:bg-black/5 p-1.5 rounded-xl"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-border-subtle space-y-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive ? 'bg-sage text-white' : 'text-primary hover:bg-black/5'
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {link.name}
              </Link>
            );
          })}

          {isAuthenticated ? (
            <button
              onClick={() => { handleLogout(); setMobileOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-soft hover:bg-rose-soft/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Logout ({user.name})
            </button>
          ) : (
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-sage hover:bg-sage/10 transition-all"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </Link>
          )}
        </div>
      )}
    </header>
  );
}