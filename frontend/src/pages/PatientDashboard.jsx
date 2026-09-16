import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Mic, MessageSquare, Eye, Heart, Leaf, MapPin, Clock, ShieldCheck,
  PhoneCall, AlertCircle, Plus, CheckCircle2, ChevronRight,
  ShieldAlert, BookOpen, ChevronDown, ChevronUp, Sparkles, Navigation
} from 'lucide-react';
import LiveVoiceRoom from '../components/LiveVoiceRoom';
import NearbyFacilityFinder from '../components/NearbyFacilityFinder';
import { listSessions } from '../lib/sessionStore';
import toast from 'react-hot-toast';

const REMEDIES_STORAGE_KEY = 'sanjeevani_patient_remedies_v1';
const ADVISORY_STORAGE_KEY = 'sanjeevani_district_advisory';

const DEFAULT_REMEDIES = [
  { id: 'rem-1', name: 'Tulsi & Adrak Kadha', timing: 'Subah (Morning)', note: 'Drink warm after light breakfast for dry throat', completed: true },
  { id: 'rem-2', name: 'Steam Inhalation with Nilgiri / Pudina', timing: 'Dophar (Afternoon)', note: '5-7 mins deep breathing for airway congestion', completed: false },
  { id: 'rem-3', name: 'Haldi Doodh (Golden Milk) with Kali Mirch', timing: 'Raat (Night)', note: '1 cup warm milk with 1/2 tsp turmeric before sleep', completed: false },
];

export default function PatientDashboard() {
  const { user } = useAuth();
  const [showLiveRoom, setShowLiveRoom] = useState(false);
  const [showFacilityFinder, setShowFacilityFinder] = useState(false);
  const [openFirstAidIndex, setOpenFirstAidIndex] = useState(null);

  // Dynamic Consultation History
  const [consultations, setConsultations] = useState([]);

  // District Health Advisory
  const [advisory, setAdvisory] = useState('');

  // Daily Herbal & Medicine Schedule
  const [remedies, setRemedies] = useState(() => {
    try {
      const saved = localStorage.getItem(REMEDIES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_REMEDIES;
    } catch {
      return DEFAULT_REMEDIES;
    }
  });

  const [newRemedyName, setNewRemedyName] = useState('');
  const [newRemedyTiming, setNewRemedyTiming] = useState('Subah (Morning)');
  const [showAddRemedy, setShowAddRemedy] = useState(false);

  useEffect(() => {
    // Load recorded consultation history from local session store
    const stored = listSessions();
    if (stored.length > 0) {
      setConsultations(stored);
    } else {
      // Fallback baseline for clean demonstration
      setConsultations([
        { conversationId: 'demo-1', updatedAt: '2026-09-15T09:30:00.000Z', summary: 'Gale me kharash aur sookhi khasi (Dry Cough)', tier: 'Green' },
        { conversationId: 'demo-2', updatedAt: '2026-09-12T14:15:00.000Z', summary: 'Do din se bukhar aur thakan (Mild Fever)', tier: 'Yellow' },
      ]);
    }

    // Load active district health advisory
    const storedAdvisory = localStorage.getItem(ADVISORY_STORAGE_KEY);
    if (storedAdvisory) {
      setAdvisory(storedAdvisory);
    }
  }, []);

  const handleToggleRemedy = (id) => {
    setRemedies((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r));
      localStorage.setItem(REMEDIES_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    toast.success('Dose tracker updated! 🌿');
  };

  const handleAddRemedy = (e) => {
    e.preventDefault();
    if (!newRemedyName.trim()) return;
    const item = {
      id: `rem-${Date.now()}`,
      name: newRemedyName.trim(),
      timing: newRemedyTiming,
      note: 'Added from prescription / consultation advice',
      completed: false,
    };
    const updated = [...remedies, item];
    setRemedies(updated);
    localStorage.setItem(REMEDIES_STORAGE_KEY, JSON.stringify(updated));
    setNewRemedyName('');
    setShowAddRemedy(false);
    toast.success('New remedy schedule added');
  };

  const firstAidGuides = [
    {
      title: 'High-Altitude Sickness & Hypothermia (उंचाई पर चक्कर / ठंड लगना)',
      content: 'Immediately halt ascent. Keep the patient warm and dry with woolen blankets. Sip warm liquids with ginger or jaggery. If breathing is labored or lips turn pale/blue (SpO2 < 90%), dial 108 for descent support immediately.',
    },
    {
      title: 'ORS Rehydration for Diarrhea & Vomiting (दस्त और पानी की कमी)',
      content: 'Mix 1 liter of clean/boiled water with 6 level teaspoons of sugar and 1/2 level teaspoon of salt. Give small frequent sips throughout the day. Continue breast milk for infants.',
    },
    {
      title: 'Bleeding & Cuts on Mountain Terrain (चोट और घाव)',
      content: 'Apply firm direct pressure with clean cloth for 5 full minutes without lifting. Elevate limb above heart level. Wash gently with boiled water once bleeding slows.',
    },
  ];

  return (
    <div className="min-h-screen bg-mist text-primary">
      {showLiveRoom && <LiveVoiceRoom onClose={() => setShowLiveRoom(false)} />}

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-7">

        {/* ── Welcome Banner ────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-[#5A7855]/10 via-white to-[#D4A359]/10 rounded-3xl p-6 md:p-8 border border-sage/15 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-sage flex items-center justify-center text-white shadow-md shrink-0 animate-slow-float">
                <Heart className="w-7 h-7" />
              </div>
              <div>
                <h1 className="font-serif text-2xl md:text-3xl font-bold text-primary">
                  Namaste, {user?.name || 'Friend'} 🙏
                </h1>
                <p className="text-sm text-muted mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gold-warm" />
                  {user?.village || 'Chamoli, Uttarakhand'} • Your round-the-clock Himalayan health companion
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowFacilityFinder(!showFacilityFinder)}
              className="flex items-center gap-2 bg-sage hover:bg-[#4a6346] text-white px-4 py-2.5 rounded-2xl font-bold text-xs shadow transition-all"
            >
              <Navigation className="w-4 h-4" />
              {showFacilityFinder ? 'Hide Health Centers' : 'Find Health Centers'}
            </button>
          </div>
        </div>

        {/* ── District Health Advisory Notice ──────────────────────── */}
        {advisory && (
          <div className="bg-gold-warm/10 border border-gold-warm/30 rounded-2xl p-4 flex items-start gap-3 shadow-xs animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-gold-warm shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-[10px] uppercase font-bold text-gold-warm tracking-wider block">
                District CMO Health Advisory
              </span>
              <p className="text-xs text-primary mt-0.5 leading-relaxed">{advisory}</p>
            </div>
          </div>
        )}

        {/* ── Emergency SOS Quick Dial Bar ─────────────────────────── */}
        <div className="bg-rose-soft/10 border border-rose-soft/20 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-soft text-white flex items-center justify-center">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-primary">Need Immediate Emergency Medical Help?</p>
              <p className="text-[11px] text-muted">Direct toll-free helplines in Uttarakhand</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="tel:108"
              className="bg-rose-soft hover:bg-[#a34437] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs"
            >
              🚑 108 Ambulance
            </a>
            <a
              href="tel:104"
              className="bg-warm-indigo text-white text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-[#253655] transition-all"
            >
              🩺 104 Health Advice
            </a>
            <a
              href="tel:112"
              className="bg-card border border-border-subtle text-primary text-xs font-bold px-3 py-2 rounded-xl hover:bg-mist transition-all"
            >
              112 Police/Rescue
            </a>
          </div>
        </div>

        {/* ── INTEGRATED NearbyFacilityFinder Component ────────────── */}
        {showFacilityFinder ? (
          <div className="animate-fadeIn">
            <NearbyFacilityFinder onClose={() => setShowFacilityFinder(false)} />
          </div>
        ) : (
          <div className="bg-card rounded-3xl p-5 border border-border-subtle shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-sage/10 text-sage flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-primary">Need Medical Facilities Nearby?</h3>
                <p className="text-xs text-muted">
                  Instantly locate the nearest Primary Health Centre (PHC), CHC, or District Hospital using GPS.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowFacilityFinder(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-sage bg-sage-light hover:bg-sage hover:text-white px-4 py-2.5 rounded-xl transition-all"
            >
              <Navigation className="w-3.5 h-3.5" /> Locate Now
            </button>
          </div>
        )}

        {/* ── Quick Consultation Actions ───────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => setShowLiveRoom(true)}
            className="group bg-card rounded-3xl p-6 border border-sage/15 shadow-sm hover:shadow-md transition-all text-left hover:border-sage/30"
          >
            <div className="w-12 h-12 rounded-2xl bg-sage/10 flex items-center justify-center text-sage mb-4 group-hover:bg-sage group-hover:text-white transition-colors">
              <Mic className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-lg text-primary">Talk Live (आवाज से परामर्श)</h3>
            <p className="text-xs text-muted mt-1">Speak your symptoms naturally in Hindi or Garhwali</p>
            <span className="inline-block mt-3 text-[10px] bg-sage/10 text-sage px-2.5 py-0.5 rounded-full font-bold uppercase">Hands-Free</span>
          </button>

          <Link
            to="/patient/chat"
            className="group bg-card rounded-3xl p-6 border border-gold-warm/20 shadow-sm hover:shadow-md transition-all hover:border-gold-warm/40"
          >
            <div className="w-12 h-12 rounded-2xl bg-gold-warm/15 flex items-center justify-center text-gold-warm mb-4 group-hover:bg-gold-warm group-hover:text-white transition-colors">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-lg text-primary">Chat Room (चैट परामर्श)</h3>
            <p className="text-xs text-muted mt-1">Type your symptoms for detailed safe home remedies</p>
          </Link>

          <Link
            to="/patient/screen"
            className="group bg-card rounded-3xl p-6 border border-border-subtle shadow-sm hover:shadow-md transition-all hover:border-sage/20"
          >
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-muted mb-4 group-hover:bg-warm-indigo group-hover:text-white transition-colors">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-lg text-primary">Eye Screening (आँखों की जांच)</h3>
            <p className="text-xs text-muted mt-1">Non-invasive Anemia & Jaundice conjunctiva check</p>
          </Link>
        </div>

        {/* ── Daily Herbal Remedy & Medicine Tracker ─────────────────── */}
        <div className="bg-card rounded-3xl p-6 border border-border-subtle shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-lg text-primary flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-gold-warm" />
                Ghar Ka Upchar & Remedy Routine (दवा व काढ़ा समय)
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Track your active natural remedies and dosage schedule for faster recovery.
              </p>
            </div>
            <button
              onClick={() => setShowAddRemedy(!showAddRemedy)}
              className="flex items-center gap-1 text-xs font-semibold text-sage hover:bg-sage-light px-3 py-1.5 rounded-xl transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Remedy
            </button>
          </div>

          {showAddRemedy && (
            <form onSubmit={handleAddRemedy} className="p-4 bg-mist rounded-2xl border border-border-subtle space-y-3 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newRemedyName}
                  onChange={(e) => setNewRemedyName(e.target.value)}
                  placeholder="Remedy name (e.g. Mulethi decoction)"
                  className="bg-card border border-border-subtle rounded-xl px-3 py-2 text-xs text-primary focus:outline-none focus:ring-2 focus:ring-sage/40"
                  required
                />
                <select
                  value={newRemedyTiming}
                  onChange={(e) => setNewRemedyTiming(e.target.value)}
                  className="bg-card border border-border-subtle rounded-xl px-3 py-2 text-xs text-primary focus:outline-none focus:ring-2 focus:ring-sage/40"
                >
                  <option value="Subah (Morning)">Subah (Morning)</option>
                  <option value="Dophar (Afternoon)">Dophar (Afternoon)</option>
                  <option value="Raat (Night)">Raat (Night)</option>
                  <option value="As Needed (Jarurat padne par)">As Needed (Jarurat padne par)</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="bg-sage hover:bg-[#4a6346] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
                >
                  Save to Schedule
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddRemedy(false)}
                  className="text-xs text-muted px-3 py-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2.5">
            {remedies.map((rem) => (
              <div
                key={rem.id}
                onClick={() => handleToggleRemedy(rem.id)}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  rem.completed
                    ? 'bg-sage/5 border-sage/30 text-muted'
                    : 'bg-mist border-border-subtle text-primary hover:border-gold-warm/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                    rem.completed ? 'bg-sage border-sage text-white' : 'border-gray-300 bg-card'
                  }`}>
                    {rem.completed && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${rem.completed ? 'line-through text-muted' : 'text-primary'}`}>
                      {rem.name}
                    </p>
                    <p className="text-[11px] text-muted">{rem.timing} • {rem.note}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  rem.completed ? 'bg-sage/15 text-sage' : 'bg-gold-warm/15 text-gold-warm'
                }`}>
                  {rem.completed ? 'Taken' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Recent Consultations (Dynamic from sessionStore) ──────── */}
        <div className="bg-card rounded-3xl p-6 border border-border-subtle shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif font-bold text-lg text-primary flex items-center gap-2">
              <Clock className="w-5 h-5 text-gold-warm" />
              Recent Consultations ({consultations.length})
            </h3>
            <Link to="/patient/chat" className="text-xs font-semibold text-sage hover:underline flex items-center gap-1">
              New Session <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {consultations.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No consultations yet. Start your first session above.</p>
          ) : (
            <div className="space-y-3">
              {consultations.slice(0, 4).map((c, i) => (
                <div key={c.conversationId || i} className="flex items-center justify-between p-3.5 rounded-2xl bg-mist text-primary border border-border-subtle">
                  <div>
                    <p className="text-sm font-medium text-primary">{c.summary}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {new Date(c.updatedAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
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

        {/* ── Offline Mountain First-Aid Guide ─────────────────────── */}
        <div className="bg-card rounded-3xl p-6 border border-border-subtle shadow-sm space-y-3">
          <h3 className="font-serif font-bold text-lg text-primary flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-sage" />
            Offline Mountain Health & First-Aid Guide (पहाड़ी प्राथमिक उपचार)
          </h3>
          <p className="text-xs text-muted">
            Emergency guidance for high-altitude illness and accidents that works without internet.
          </p>

          <div className="space-y-2 pt-1">
            {firstAidGuides.map((guide, idx) => (
              <div key={idx} className="border border-border-subtle rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenFirstAidIndex(openFirstAidIndex === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-3.5 bg-mist text-left text-xs font-bold text-primary hover:bg-gray-100 transition-colors"
                >
                  <span>{guide.title}</span>
                  {openFirstAidIndex === idx ? (
                    <ChevronUp className="w-4 h-4 text-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted" />
                  )}
                </button>
                {openFirstAidIndex === idx && (
                  <div className="p-4 bg-card text-xs text-muted leading-relaxed border-t border-border-subtle animate-fadeIn">
                    {guide.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Calming Footer ───────────────────────────────────────── */}
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

