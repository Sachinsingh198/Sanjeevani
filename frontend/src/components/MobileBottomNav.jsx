import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Home, Stethoscope, Sparkles, HeartHandshake, User, Users, Eye, Shield
} from 'lucide-react';

export default function MobileBottomNav() {
  const location = useLocation();
  const { isAuthenticated, isPatient, isAsha, isAdmin } = useAuth();

  // Do not show on login, register, or if user is unauthenticated
  if (!isAuthenticated) return null;

  // If in chat, keep chat full-height without bottom nav crowding
  const isChat = location.pathname.includes('/chat');
  if (isChat) return null;

  let navItems = [];

  if (isPatient) {
    navItems = [
      { name: 'Home', path: '/mitra', icon: Home },
      { name: 'Sehat', path: '/mitra/chat', icon: Stethoscope },
      { name: 'Wellness', path: '/mitra/wellness', icon: Sparkles, highlight: true },
      { name: 'Saathi', path: '/mitra/saathi', icon: HeartHandshake },
      { name: 'Profile', path: '/profile', icon: User },
    ];
  } else if (isAsha) {
    navItems = [
      { name: 'Field', path: '/asha', icon: Users },
      { name: 'Screening', path: '/mitra/screen', icon: Eye },
      { name: 'Chat AI', path: '/mitra/chat', icon: Stethoscope },
      { name: 'Profile', path: '/profile', icon: User },
    ];
  } else if (isAdmin) {
    navItems = [
      { name: 'Control', path: '/admin', icon: Shield },
      { name: 'Screening', path: '/mitra/screen', icon: Eye },
      { name: 'Profile', path: '/profile', icon: User },
    ];
  }

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#111A27]/95 backdrop-blur-lg border-t border-gray-200/80 dark:border-gray-800 shadow-lg px-2 py-1.5 transition-all select-none"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path ||
            (item.path === '/mitra/wellness' && (location.pathname.includes('/wellness') || location.pathname.includes('/yoga') || location.pathname.includes('/meditation')));

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all touch-target ${
                isActive
                  ? 'text-sage dark:text-booti-glow font-bold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {item.highlight && !isActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-gold-warm animate-pulse" />
                )}
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-sage dark:bg-booti-glow" />
                )}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight ${isActive ? 'font-extrabold' : 'font-medium'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
