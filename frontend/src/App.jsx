import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// Public pages
import Home from './pages/Home';
import About from './pages/About';
import Login from './pages/Login';
import Register from './pages/Register';

// Protected pages
import PatientDashboard from './pages/PatientDashboard';
import Chat from './pages/Chat';
import Screening from './pages/Screening';
import MeditationTeacher from './pages/MeditationTeacher';
import YogaTeacher from './pages/YogaTeacher';
import Companion from './pages/Companion';
import AshaDashboard from './pages/AshaDashboard';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-mist text-primary transition-colors duration-300">
          <Navbar />
          <main className="flex-1 animate-fadeIn">
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

              {/* Meditation Teacher (Dhyan Guru) */}
              <Route path="/mitra/meditation" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <MeditationTeacher />
                </ProtectedRoute>
              } />
              <Route path="/patient/meditation" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <MeditationTeacher />
                </ProtectedRoute>
              } />

              {/* Yoga Teacher & Posture Checker (Yogashala) */}
              <Route path="/mitra/yoga" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <YogaTeacher />
                </ProtectedRoute>
              } />
              <Route path="/patient/yoga" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <YogaTeacher />
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

              {/* ── Catch-all redirect ─────────────────────────────── */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <footer className="bg-warm-indigo text-white/70 text-xs py-6 px-4 text-center border-t border-white/10 mt-auto">
            <p>© 2026 Project Sanjeevani • Institute of Technology, Gopeshwar (Chamoli) • VMSB UTU</p>
          </footer>
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}