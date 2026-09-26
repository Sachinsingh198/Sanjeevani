import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import OfflineBanner from './components/OfflineBanner';
import SanjeevaniOrb from './components/SanjeevaniOrb';

// Public pages (lazy loaded)
const Home = React.lazy(() => import('./pages/Home'));
const About = React.lazy(() => import('./pages/About'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));

// Protected pages (lazy loaded)
const PatientDashboard = React.lazy(() => import('./pages/PatientDashboard'));
const Chat = React.lazy(() => import('./pages/Chat'));
const Screening = React.lazy(() => import('./pages/Screening'));
const WellnessStudio = React.lazy(() => import('./pages/WellnessStudio'));
const Companion = React.lazy(() => import('./pages/Companion'));
const AshaDashboard = React.lazy(() => import('./pages/AshaDashboard'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const Profile = React.lazy(() => import('./pages/Profile'));

function RouteLoadingFallback() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] gap-4 p-8">
      <SanjeevaniOrb state="thinking" size={60} />
      <p className="text-xs text-muted font-medium tracking-wide animate-pulse">Sanjeevani loading…</p>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const isChatPage = location.pathname.includes('/chat');

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
        <div className={`flex flex-col bg-mist text-primary transition-colors duration-300 ${
          isChatPage ? 'h-screen overflow-hidden' : 'min-h-screen'
        }`}>
          <OfflineBanner />
          <Navbar />
          <main className={isChatPage ? 'flex-1 overflow-hidden min-h-0' : 'flex-1 animate-fadeIn'}>
            <React.Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
              {/* ── Public Routes ──────────────────────────────────── */}
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* ── Sanjeevani Mitra / Citizen Wellness Routes ─────── */}
              {/* Mitra Hub (Dashboard) */}
              <Route path="/mitra" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <PatientDashboard />
                </ProtectedRoute>
              } />
              <Route path="/patient" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <PatientDashboard />
                </ProtectedRoute>
              } />

              {/* Unified Wellness Studio (आरोग्यशाला) */}
              <Route path="/mitra/wellness" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <WellnessStudio />
                </ProtectedRoute>
              } />
              <Route path="/patient/wellness" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <WellnessStudio />
                </ProtectedRoute>
              } />

              {/* Backward-Compatible Dhyan Guru & Yogashala Deep Links */}
              <Route path="/mitra/meditation" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <WellnessStudio defaultTab="dhyan" />
                </ProtectedRoute>
              } />
              <Route path="/patient/meditation" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <WellnessStudio defaultTab="dhyan" />
                </ProtectedRoute>
              } />
              <Route path="/mitra/yoga" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <WellnessStudio defaultTab="yoga" />
                </ProtectedRoute>
              } />
              <Route path="/patient/yoga" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <WellnessStudio defaultTab="yoga" />
                </ProtectedRoute>
              } />

              {/* Village Companion (Sanjeevani Saathi) */}
              <Route path="/mitra/saathi" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <Companion />
                </ProtectedRoute>
              } />
              <Route path="/patient/saathi" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <Companion />
                </ProtectedRoute>
              } />
              <Route path="/mitra/companion" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <Companion />
                </ProtectedRoute>
              } />
              <Route path="/patient/companion" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <Companion />
                </ProtectedRoute>
              } />

              {/* Clinical Triage Chat & Eye Screening */}
              <Route path="/patient/chat" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <Chat />
                </ProtectedRoute>
              } />
              <Route path="/mitra/chat" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <Chat />
                </ProtectedRoute>
              } />
              <Route path="/patient/screen" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <Screening />
                </ProtectedRoute>
              } />
              <Route path="/mitra/screen" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <Screening />
                </ProtectedRoute>
              } />

              {/* ── ASHA Worker Routes ─────────────────────────────── */}
              <Route path="/asha" element={
                <ProtectedRoute allowedRoles={['asha']}>
                  <AshaDashboard />
                </ProtectedRoute>
              } />

              {/* ── Admin Routes ───────────────────────────────────── */}
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />

              {/* ── Profile & Account Settings (Mitra, ASHA & Admin) ── */}
              <Route path="/profile" element={
                <ProtectedRoute allowedRoles={['patient', 'asha', 'admin']}>
                  <Profile />
                </ProtectedRoute>
              } />

              {/* ── Catch-all redirect ─────────────────────────────── */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </React.Suspense>
        </main>

          {!isChatPage && (
            <footer className="bg-warm-indigo text-white/70 text-xs py-6 px-4 text-center border-t border-white/10 mt-auto">
              <p>© 2026 Project Sanjeevani • Institute of Technology, Gopeshwar (Chamoli) • VMSB UTU</p>
            </footer>
          )}
        </div>
      </AuthProvider>
    </LanguageProvider>
  </ThemeProvider>
);
}