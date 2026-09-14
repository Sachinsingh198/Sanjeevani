import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mic, MessageSquare, Eye, Heart, Leaf, MapPin, Clock, ShieldCheck } from 'lucide-react';
import LiveVoiceRoom from '../components/LiveVoiceRoom';

export default function PatientDashboard() {
  const { user } = useAuth();
  const [showLiveRoom, setShowLiveRoom] = useState(false);

  // Mock consultation history (would come from backend in production)
  const recentConsultations = [
    { id: 1, date: '13 Sep 2026', symptom: 'Gale me kharash aur sookhi khasi', tier: 'Green', status: 'Remedy given' },
    { id: 2, date: '10 Sep 2026', symptom: 'Do din se bukhar', tier: 'Yellow', status: 'PHC referral' },
  ];

  return (
    <div className="min-h-screen bg-mist text-primary">
      {showLiveRoom && <LiveVoiceRoom onClose={() => setShowLiveRoom(false)} />}

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* ── Welcome Card ─────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-[#5A7855]/10 via-white to-[#D4A359]/5 rounded-3xl p-6 md:p-8 border border-sage/15 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-sage flex items-center justify-center text-white shadow-md shrink-0 animate-slow-float">
              <Heart className="w-7 h-7" />
            </div>
            <div>
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-primary">
                Namaste, {user?.name || 'Patient'} 🙏
              </h1>
              <p className="text-sm text-muted mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gold-warm" />
                {user?.village || 'Uttarakhand'} • Your health companion is here for you
              </p>
            </div>
          </div>
        </div>

        {/* ── Quick Actions ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <button
            onClick={() => setShowLiveRoom(true)}
            className="group bg-card rounded-3xl p-6 border border-sage/15 shadow-sm hover:shadow-md transition-all text-left hover:border-sage/30"
          >
            <div className="w-12 h-12 rounded-2xl bg-sage/10 flex items-center justify-center text-sage mb-4 group-hover:bg-sage group-hover:text-white transition-colors">
              <Mic className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-lg text-primary">Talk Live</h3>
            <p className="text-xs text-muted mt-1">Speak your symptoms naturally — hands-free voice triage</p>
            <span className="inline-block mt-3 text-[10px] bg-sage/10 text-sage px-2.5 py-0.5 rounded-full font-bold uppercase">Recommended</span>
          </button>

          <Link
            to="/patient/chat"
            className="group bg-card rounded-3xl p-6 border border-gold-warm/20 shadow-sm hover:shadow-md transition-all hover:border-gold-warm/40"
          >
            <div className="w-12 h-12 rounded-2xl bg-gold-warm/15 flex items-center justify-center text-gold-warm mb-4 group-hover:bg-gold-warm group-hover:text-white transition-colors">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-lg text-primary">Chat Room</h3>
            <p className="text-xs text-muted mt-1">Type your symptoms for detailed text-based consultation</p>
          </Link>

          <Link
            to="/patient/screen"
            className="group bg-card rounded-3xl p-6 border border-border-subtle shadow-sm hover:shadow-md transition-all hover:border-sage/20"
          >
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-muted mb-4 group-hover:bg-warm-indigo group-hover:text-white transition-colors">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-lg text-primary">Eye Screening</h3>
            <p className="text-xs text-muted mt-1">Non-invasive Anemia & Jaundice scan from eye photo</p>
          </Link>

        </div>

        {/* ── Health Tags ──────────────────────────────────────────── */}
        <div className="bg-card rounded-3xl p-6 border border-border-subtle shadow-sm">
          <h3 className="font-serif font-bold text-lg text-primary mb-3 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sage" /> My Health Profile
          </h3>
          <p className="text-xs text-muted mb-3">Active health conditions are checked against remedies for contraindications.</p>
          <div className="flex flex-wrap gap-2">
            {['None currently'].map((tag, i) => (
              <span key={i} className="text-xs bg-sage-light text-sage px-3 py-1.5 rounded-full font-medium">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* ── Recent Consultations ─────────────────────────────────── */}
        <div className="bg-card rounded-3xl p-6 border border-border-subtle shadow-sm">
          <h3 className="font-serif font-bold text-lg text-primary mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gold-warm" /> Recent Consultations
          </h3>

          {recentConsultations.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No consultations yet. Start your first session above.</p>
          ) : (
            <div className="space-y-3">
              {recentConsultations.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-mist text-primary border border-border-subtle">
                  <div>
                    <p className="text-sm font-medium text-primary">{c.symptom}</p>
                    <p className="text-xs text-muted mt-0.5">{c.date} • {c.status}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    c.tier === 'Red' ? 'bg-rose-soft text-white' :
                    c.tier === 'Yellow' ? 'bg-gold-warm text-white' :
                    'bg-sage text-white'
                  }`}>
                    {c.tier}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Calming Footer Message ───────────────────────────────── */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
            <Leaf className="w-3.5 h-3.5 text-gold-warm" />
            Sanjeevani is always here for you. Take care of your health with peace of mind.
          </p>
        </div>

      </div>
    </div>
  );
}
