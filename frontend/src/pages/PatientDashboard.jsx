import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Mic, MessageSquare, Eye, Heart, Leaf, MapPin, Clock, ShieldCheck,
  PhoneCall, AlertCircle, Plus, CheckCircle2, ChevronRight,
  ShieldAlert, BookOpen, ChevronDown, ChevronUp, Sparkles, Navigation,
  Wind, Activity, HeartHandshake, ArrowRight, Stethoscope, Hospital,
  Volume2, Home, FileText, Bandage, ArrowLeft
} from 'lucide-react';
import LiveVoiceRoom from '../components/LiveVoiceRoom';
import NearbyFacilityFinder from '../components/NearbyFacilityFinder';
import SanjeevaniOrb from '../components/SanjeevaniOrb';
import MountainRidge from '../components/MountainRidge';
import { listSessions } from '../lib/sessionStore';
import { speakCue } from '../lib/audioSynthesizer';
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
  const [activeTab, setActiveTab] = useState('hub'); // 'hub' | 'remedies' | 'history' | 'facilities' | 'firstaid'
  const [showLiveRoom, setShowLiveRoom] = useState(false);
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
    const stored = listSessions();
    if (stored.length > 0) {
      setConsultations(stored);
    } else {
      setConsultations([
        { conversationId: 'demo-1', updatedAt: '2026-09-15T09:30:00.000Z', summary: 'Gale me kharash aur sookhi khasi (Dry Cough)', tier: 'Green' },
        { conversationId: 'demo-2', updatedAt: '2026-09-12T14:15:00.000Z', summary: 'Do din se bukhar aur thakan (Mild Fever)', tier: 'Yellow' },
      ]);
    }

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
    toast.success('Naya gharelu nuskha schedule mein jud gaya');
  };

  const handleAudioGuide = (text) => {
    speakCue(text, 'hi-IN');
  };

  const firstAidGuides = [
    {
      title: 'High-Altitude Sickness & Hypothermia (उंचाई पर चक्कर / ठंड लगना)',
      content: 'Immediately halt ascent. Keep the patient warm and dry with woolen blankets. Sip warm liquids with ginger or jaggery. If breathing is labored or lips turn pale/blue (SpO2 < 90%), dial 108 for descent support immediately.',
      audio: 'Uunchai par chhatpatana ya thand lagne par chadhai turant rokein, garam kambal odhein aur 108 ko call karein.',
    },
    {
      title: 'ORS Rehydration for Diarrhea & Vomiting (दस्त और पानी की कमी)',
      content: 'Mix 1 liter of clean/boiled water with 6 level teaspoons of sugar and 1/2 level teaspoon of salt. Give small frequent sips throughout the day. Continue breast milk for infants.',
      audio: 'Dast ya ulti hone par ek liter uble paani me chhah chammach cheeni aur aadha chammach namak milakar piyen.',
    },
    {
      title: 'Bleeding & Cuts on Mountain Terrain (चोट और घाव)',
      content: 'Apply firm direct pressure with clean cloth for 5 full minutes without lifting. Elevate limb above heart level. Wash gently with boiled water once bleeding slows.',
      audio: 'Chot lagne par saaf kapde se paanch minute tak dabaav banaye rakhein.',
    },
  ];

  const completedRemediesCount = remedies.filter(r => r.completed).length;

  const tabs = [
    { id: 'hub', label: 'मुख्य सेवा', sub: 'Main Hub', icon: Home },
    { id: 'remedies', label: 'दवा व काढ़ा', sub: 'Remedies', icon: Leaf, badge: `${completedRemediesCount}/${remedies.length}` },
    { id: 'history', label: 'पुराना पर्चा', sub: 'Records', icon: FileText, badge: `${consultations.length}` },
    { id: 'facilities', label: 'अस्पताल', sub: 'Hospitals', icon: Hospital },
    { id: 'firstaid', label: 'प्राथमिक उपचार', sub: 'First-Aid', icon: Bandage },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6F0] dark:bg-[#151D28] text-[#2E4057] dark:text-[#F4F6F0] transition-colors duration-300 relative overflow-hidden pb-20">
      
      {/* Live Voice Room Modal */}
      {showLiveRoom && <LiveVoiceRoom onClose={() => setShowLiveRoom(false)} />}

      {/* Mountain Contour Background */}
      <div className="absolute top-6 left-0 right-0 pointer-events-none opacity-20 dark:opacity-10 z-0">
        <MountainRidge tone="pine" className="w-full h-44 object-cover" />
      </div>

      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6 relative z-10">

        {/* ── TOP ICONIC NAVIGATION BAR (PAGE-INSIDE-PAGE TABS) ─────── */}
        <div className="bg-white/95 dark:bg-[#1E2A43]/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-1.5 sm:p-2.5 border border-[#5A7855]/20 dark:border-gray-800 shadow-xs flex items-center justify-between gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  handleAudioGuide(`${tab.label} khula`);
                }}
                className={`touch-target flex-1 min-w-[62px] sm:min-w-[90px] py-1.5 sm:py-2.5 px-1 sm:px-2 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#5A7855] text-white shadow-sm scale-102'
                    : 'text-[#556376] dark:text-[#A8B4C2] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <div className="relative">
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5 sm:mb-1" />
                  {tab.badge && (
                    <span className={`absolute -top-1.5 -right-2 text-[8px] sm:text-[9px] font-bold px-1 sm:px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-white text-[#5A7855]' : 'bg-[#5A7855]/20 text-[#5A7855] dark:text-[#8ED14C]'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] sm:text-xs font-bold leading-tight truncate">{tab.label}</span>
                <span className={`text-[9px] sm:text-[10px] hidden sm:block leading-none mt-0.5 ${isActive ? 'text-white/80' : 'opacity-70'}`}>
                  {tab.sub}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: MAIN HUB (ICONIC & AUDIO-FIRST CENTERPIECE) ───── */}
        {activeTab === 'hub' && (
          <div className="space-y-4 sm:space-y-6 animate-fadeIn">
            
            {/* Welcoming Centerpiece Banner */}
            <div className="relative overflow-hidden bg-white/95 dark:bg-[#1E2A43]/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-[#5A7855]/20 dark:border-gray-800 shadow-sm text-center">
              <div className="flex flex-col items-center justify-center">
                
                {/* Living Orb */}
                <div className="inline-block mb-2 sm:mb-3 animate-slow-float">
                  <div className="hidden sm:block"><SanjeevaniOrb state="idle" size={62} /></div>
                  <div className="sm:hidden"><SanjeevaniOrb state="idle" size={42} /></div>
                </div>

                <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-[#5A7855]/10 dark:bg-[#5A7855]/25 text-[#5A7855] dark:text-[#8ED14C] px-3 sm:px-4 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold mb-1.5 sm:mb-2">
                  <Leaf className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D4A359]" />
                  <span>Sanjeevani Mitra • संजीवनी मित्र</span>
                </div>

                <h1 className="font-serif text-xl sm:text-4xl font-bold text-[#2E4057] dark:text-[#F4F6F0]">
                  Namaste, {user?.name || 'Aadarniya Mitra'} 🙏
                </h1>

                <p className="text-[11px] sm:text-sm text-[#556376] dark:text-[#A8B4C2] mt-1 flex items-center justify-center gap-1 sm:gap-1.5">
                  <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#D4A359]" />
                  <span>{user?.village || 'Chamoli, Uttarakhand'} • Digital Swasthya Kendra</span>
                </p>

                {/* Primary Voice Consultation Trigger */}
                <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setShowLiveRoom(true)}
                    className="touch-target group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 sm:gap-3 px-5 sm:px-8 py-3 sm:py-4.5 rounded-full bg-gradient-to-r from-[#5A7855] to-[#4a6346] hover:from-[#4a6346] hover:to-[#3b5038] text-white font-extrabold text-sm sm:text-lg shadow-md sm:shadow-lg shadow-[#5A7855]/30 hover:scale-102 active:scale-98 transition-all cursor-pointer"
                  >
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
                      <Mic className="w-4 h-4 sm:w-5 sm:h-5 animate-bounce" />
                    </div>
                    <span>🎙 बोलकर बताएं (Speak Now)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAudioGuide('Namaste! Bolkar batayein button dabakar aap aawaz mein doctor se salah le sakte hain.')}
                    className="touch-target inline-flex items-center justify-center gap-1.5 bg-[#F4F6F0] dark:bg-[#182332] text-[#5A7855] dark:text-[#8ED14C] border border-[#5A7855]/30 px-3.5 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold hover:bg-[#5A7855]/10 transition-all cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>निर्देश सुनें</span>
                  </button>
                </div>
              </div>

              {/* District CMO Advisory Notice */}
              {advisory && (
                <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-[#5A7855]/15 dark:border-gray-800 flex items-start gap-2.5 sm:gap-3 text-xs bg-[#D4A359]/10 dark:bg-[#D4A359]/15 border border-[#D4A359]/25 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 text-left">
                  <AlertCircle className="w-4 h-4 text-[#8C5E24] dark:text-[#D4A359] shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="block font-bold text-[#8C5E24] dark:text-[#D4A359] uppercase tracking-wider text-[9px] sm:text-[10px]">
                      District CMO Health Advisory:
                    </strong>
                    <span className="text-[11px] sm:text-xs text-[#2E4057] dark:text-[#F4F6F0] leading-relaxed">
                      {advisory}
                    </span>
                  </div>
                  <button
                    onClick={() => handleAudioGuide(advisory)}
                    className="touch-target p-1 text-[#8C5E24] dark:text-[#D4A359] hover:scale-110"
                    title="Advisory suniye"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* 4 Core Pillar Tiles — 2x2 Icon-Dominant Grid on Mobile, 4-col on Desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              
              {/* 1. Sehat (AI Doctor) */}
              <Link
                to="/mitra/chat"
                className="touch-target group flex flex-col justify-between p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1E2A43] border border-[#5A7855]/25 hover:border-[#5A7855] transition-all shadow-xs tactile-card"
              >
                <div>
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-[#5A7855]/15 dark:bg-[#5A7855]/25 text-[#5A7855] dark:text-[#8ED14C] flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-108 transition-transform">
                    <Stethoscope className="w-5 h-5 sm:w-7 sm:h-7" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-[#5A7855] dark:text-[#8ED14C] block truncate">
                    Doctor Sahyog
                  </span>
                  <h3 className="font-serif font-bold text-sm sm:text-lg text-[#2E4057] dark:text-[#F4F6F0] mt-0.5 leading-snug">
                    Sehat (स्वास्थ्य)
                  </h3>
                  <p className="text-xs text-[#556376] dark:text-[#A8B4C2] mt-1 hidden sm:block">
                    Dr. Sanjeevani se lakshan jaanch aur clinical triage advice.
                  </p>
                </div>
                <div className="mt-2.5 sm:mt-4 flex items-center justify-between text-[11px] sm:text-xs font-bold text-[#5A7855] dark:text-[#8ED14C] pt-2 sm:pt-3 border-t border-gray-100 dark:border-gray-800">
                  <span>Paramarsh</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* 2. Arogyashala (Unified Wellness Studio) */}
              <Link
                to="/mitra/wellness"
                className="touch-target group flex flex-col justify-between p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1E2A43] border border-[#D4A359]/30 hover:border-[#D4A359] transition-all shadow-xs tactile-card"
              >
                <div>
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-[#D4A359]/15 dark:bg-[#D4A359]/25 text-[#8C5E24] dark:text-[#D4A359] flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-108 transition-transform">
                    <Sparkles className="w-5 h-5 sm:w-7 sm:h-7" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-[#8C5E24] dark:text-[#D4A359] block truncate">
                    Yoga • Dhyan • Naad
                  </span>
                  <h3 className="font-serif font-bold text-sm sm:text-lg text-[#2E4057] dark:text-[#F4F6F0] mt-0.5 leading-snug">
                    Arogya (आरोग्यशाला)
                  </h3>
                  <p className="text-xs text-[#556376] dark:text-[#A8B4C2] mt-1 hidden sm:block">
                    Pose AI, 5 Vedic Pranayama, audio dhyan katha aur soundscapes.
                  </p>
                </div>
                <div className="mt-2.5 sm:mt-4 flex items-center justify-between text-[11px] sm:text-xs font-bold text-[#8C5E24] dark:text-[#D4A359] pt-2 sm:pt-3 border-t border-gray-100 dark:border-gray-800">
                  <span>Studio</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* 3. Saathi (Companion) */}
              <Link
                to="/mitra/saathi"
                className="touch-target group flex flex-col justify-between p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1E2A43] border border-[#B85042]/25 hover:border-[#B85042] transition-all shadow-xs tactile-card"
              >
                <div>
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-[#B85042]/15 dark:bg-[#B85042]/25 text-[#B85042] dark:text-[#FF7878] flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-108 transition-transform">
                    <HeartHandshake className="w-5 h-5 sm:w-7 sm:h-7" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-[#B85042] dark:text-[#FF7878] block truncate">
                    Apno Jaisa Sathi
                  </span>
                  <h3 className="font-serif font-bold text-sm sm:text-lg text-[#2E4057] dark:text-[#F4F6F0] mt-0.5 leading-snug">
                    Saathi (साथी)
                  </h3>
                  <p className="text-xs text-[#556376] dark:text-[#A8B4C2] mt-1 hidden sm:block">
                    Akelepan me dukh-sukh ki baatein, purane kisse aur snehi saath.
                  </p>
                </div>
                <div className="mt-2.5 sm:mt-4 flex items-center justify-between text-[11px] sm:text-xs font-bold text-[#B85042] dark:text-[#FF7878] pt-2 sm:pt-3 border-t border-gray-100 dark:border-gray-800">
                  <span>Baat Karein</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* 4. Aankhon Ki Jaanch (Eye Screening) */}
              <Link
                to="/mitra/screen"
                className="touch-target group flex flex-col justify-between p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1E2A43] border border-[#2E4057]/25 hover:border-[#2E4057] transition-all shadow-xs tactile-card"
              >
                <div>
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-[#2E4057]/15 dark:bg-[#2E4057]/25 text-[#2E4057] dark:text-[#A8B4C2] flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-108 transition-transform">
                    <Eye className="w-5 h-5 sm:w-7 sm:h-7" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-[#2E4057] dark:text-[#A8B4C2] block truncate">
                    Netra Jaanch
                  </span>
                  <h3 className="font-serif font-bold text-sm sm:text-lg text-[#2E4057] dark:text-[#F4F6F0] mt-0.5 leading-snug">
                    Screening (नेत्र जांच)
                  </h3>
                  <p className="text-xs text-[#556376] dark:text-[#A8B4C2] mt-1 hidden sm:block">
                    Camera se palak ki tasveer lekar Anemia v Peeliya sanket dekhein.
                  </p>
                </div>
                <div className="mt-2.5 sm:mt-4 flex items-center justify-between text-[11px] sm:text-xs font-bold text-[#2E4057] dark:text-[#A8B4C2] pt-2 sm:pt-3 border-t border-gray-100 dark:border-gray-800">
                  <span>Jaanch Karein</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

            </div>

            {/* Daily Himalayan Wellness Journey Callout */}
            <div className="bg-gradient-to-r from-[#5A7855]/10 via-[#D4A359]/15 to-[#5A7855]/10 dark:from-[#5A7855]/20 dark:via-[#D4A359]/10 dark:to-[#1E2A43] rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-[#5A7855]/30 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 tactile-card">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-[#5A7855] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#5A7855]/25">
                  <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 animate-pulse text-[#F4F6F0]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-xs bg-[#5A7855] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Daily Sadhana
                    </span>
                    <span className="text-[11px] text-[#8C5E24] dark:text-[#D4A359] font-bold">15 Mins • Himalayan Vitality</span>
                  </div>
                  <h3 className="font-serif font-bold text-base sm:text-xl text-[#2E4057] dark:text-[#F4F6F0] mt-1">
                    Himalayan Morning Flow (सुबह की ऊर्जा साधना)
                  </h3>
                  <p className="text-xs sm:text-sm text-[#556376] dark:text-[#A8B4C2] mt-0.5">
                    Anulom Vilom breathwork + Tadasana & Vrikshasana posture check + Singing bowls.
                  </p>
                </div>
              </div>
              <Link
                to="/mitra/wellness?tab=flow"
                className="touch-target w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-extrabold text-white bg-[#5A7855] hover:bg-[#4a6346] px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl transition-all shadow-sm hover:scale-102 cursor-pointer"
              >
                <span>आरंभ करें (Start Flow)</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </Link>
            </div>

            {/* 24/7 Emergency 108 Call Strip */}
            <div className="bg-[#B85042]/10 dark:bg-[#B85042]/20 border border-[#B85042]/30 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2.5 sm:gap-3 text-center sm:text-left">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-[#B85042] text-white flex items-center justify-center shadow-xs shrink-0">
                  <PhoneCall className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-xs sm:text-base text-[#2E4057] dark:text-[#F4F6F0]">
                    Aapaatkaal (Emergency Hotline)
                  </h4>
                  <p className="text-[10px] sm:text-xs text-[#556376] dark:text-[#A8B4C2]">
                    Gambhir sthiti mein turant 108 par call karein
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                <a
                  href="tel:108"
                  className="touch-target flex-1 sm:flex-initial justify-center bg-[#B85042] hover:bg-[#a14336] text-white text-xs sm:text-sm font-bold px-3.5 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl transition-all shadow-xs flex items-center gap-1.5"
                >
                  <PhoneCall className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>108 Ambulance</span>
                </a>
                <a
                  href="tel:104"
                  className="touch-target bg-[#2E4057] hover:bg-[#1E2A43] text-white text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl transition-all shadow-xs"
                >
                  <span>104 Salah</span>
                </a>
              </div>
            </div>

          </div>
        )}

        {/* ── TAB 2: REMEDIES SCHEDULE (दवा व काढ़ा) ──────────────── */}
        {activeTab === 'remedies' && (
          <div className="bg-white dark:bg-[#1E2A43] rounded-3xl p-6 sm:p-8 border border-[#5A7855]/20 dark:border-gray-800 shadow-sm space-y-5 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-[#5A7855]/10 text-[#5A7855] dark:text-[#8ED14C] text-[10px] font-bold px-3 py-0.5 rounded-full mb-1">
                  <Leaf className="w-3.5 h-3.5" /> AYUSH Routine Tracker
                </div>
                <h2 className="font-serif font-bold text-xl text-[#2E4057] dark:text-[#F4F6F0] flex items-center gap-2">
                  <span>Ghar Ka Upchar & Remedy Routine (दवा व काढ़ा समय)</span>
                  <button
                    onClick={() => handleAudioGuide('Yeh aapki rojana ki gharelu aushadhi aur dawaiyon ka time table hai.')}
                    className="touch-target p-1 text-[#5A7855]"
                    title="Audio sunein"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </h2>
                <p className="text-xs text-[#556376] dark:text-[#A8B4C2]">
                  Subah, dophar aur raat ke samay gharelu nuskhe aur dawaiyan lena na bhoolein
                </p>
              </div>

              <button
                onClick={() => setShowAddRemedy(!showAddRemedy)}
                className="touch-target inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#5A7855] hover:bg-[#4a6346] px-4 py-2.5 rounded-2xl transition-all shadow-xs cursor-pointer self-start sm:self-center"
              >
                <Plus className="w-4 h-4" />
                <span>Nuskha Jodein (Add Remedy)</span>
              </button>
            </div>

            {/* Add Remedy Form Drawer */}
            {showAddRemedy && (
              <form onSubmit={handleAddRemedy} className="p-4 sm:p-5 bg-[#F4F6F0]/80 dark:bg-[#182332] rounded-2xl border border-[#5A7855]/20 dark:border-gray-700 space-y-3.5 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-[#2E4057] dark:text-[#F4F6F0] mb-1 block">Aushadhi Ka Naam *</label>
                    <input
                      type="text"
                      value={newRemedyName}
                      onChange={(e) => setNewRemedyName(e.target.value)}
                      placeholder="e.g. Tulsi Adrak kadha ya Giloy"
                      className="w-full bg-white dark:bg-[#1E2A43] border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-[#2E4057] dark:text-[#F4F6F0] focus:outline-none focus:ring-2 focus:ring-[#5A7855]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-[#2E4057] dark:text-[#F4F6F0] mb-1 block">Lene Ka Samay *</label>
                    <select
                      value={newRemedyTiming}
                      onChange={(e) => setNewRemedyTiming(e.target.value)}
                      className="w-full bg-white dark:bg-[#1E2A43] border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-[#2E4057] dark:text-[#F4F6F0] focus:outline-none focus:ring-2 focus:ring-[#5A7855]"
                    >
                      <option value="Subah (Morning)">Subah (Morning)</option>
                      <option value="Dophar (Afternoon)">Dophar (Afternoon)</option>
                      <option value="Raat (Night)">Raat (Night)</option>
                      <option value="As Needed">Jarurat padne par (As Needed)</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="touch-target bg-[#5A7855] hover:bg-[#4a6346] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    Schedule Mein Jodein
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddRemedy(false)}
                    className="touch-target text-xs text-[#556376] dark:text-[#A8B4C2] hover:text-[#2E4057] px-3 py-2"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Remedies Checklist */}
            <div className="space-y-3">
              {remedies.map((remedy) => (
                <div
                  key={remedy.id}
                  onClick={() => handleToggleRemedy(remedy.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    remedy.completed
                      ? 'bg-[#5A7855]/10 dark:bg-[#5A7855]/15 border-[#5A7855]/30'
                      : 'bg-[#F4F6F0]/60 dark:bg-[#182332] border-gray-200 dark:border-gray-700 hover:border-[#5A7855]/40'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                      remedy.completed ? 'bg-[#5A7855] text-white' : 'border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1E2A43]'
                    }`}>
                      {remedy.completed && <CheckCircle2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${remedy.completed ? 'line-through text-[#556376] dark:text-[#A8B4C2]' : 'text-[#2E4057] dark:text-[#F4F6F0]'}`}>
                        {remedy.name}
                      </p>
                      <p className="text-xs text-[#556376] dark:text-[#A8B4C2] mt-0.5">{remedy.timing} • {remedy.note}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                    remedy.completed ? 'bg-[#5A7855] text-white' : 'bg-gray-200 dark:bg-gray-700 text-[#556376] dark:text-gray-300'
                  }`}>
                    {remedy.completed ? 'Poora Hua ✓' : 'Lena Baqi Hai'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 3: CONSULTATION HISTORY (पुराना पर्चा) ──────────── */}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-[#1E2A43] rounded-3xl p-6 sm:p-8 border border-[#5A7855]/20 dark:border-gray-800 shadow-sm space-y-5 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-[#5A7855]/10 text-[#5A7855] dark:text-[#8ED14C] text-[10px] font-bold px-3 py-0.5 rounded-full mb-1">
                  <FileText className="w-3.5 h-3.5" /> Parcha History
                </div>
                <h2 className="font-serif font-bold text-xl text-[#2E4057] dark:text-[#F4F6F0] flex items-center gap-2">
                  <span>Purana Parcha & Consultation Records (पुरानी जांच)</span>
                  <button
                    onClick={() => handleAudioGuide('Aapki pichhli saari doctor baatcheet aur parcha yahan darz hai.')}
                    className="touch-target p-1 text-[#5A7855]"
                    title="Audio sunein"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </h2>
                <p className="text-xs text-[#556376] dark:text-[#A8B4C2]">
                  Dr. Sanjeevani AI ke sath ki gayi paramarsh baatcheet ki suchi
                </p>
              </div>

              <Link
                to="/mitra/chat"
                className="touch-target inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#5A7855] hover:bg-[#4a6346] px-4 py-2.5 rounded-2xl transition-all shadow-xs"
              >
                <span>Nayi Jaanch Shuru Karein</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {consultations.map((item, idx) => (
                <Link
                  key={idx}
                  to="/mitra/chat"
                  className="p-4 rounded-2xl bg-[#F4F6F0]/60 dark:bg-[#182332] border border-gray-200/80 dark:border-gray-800 hover:border-[#5A7855]/40 transition-all flex items-center justify-between gap-3 block"
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white text-xs font-bold shadow-xs ${
                      item.tier === 'Red' ? 'bg-[#B85042]' :
                      item.tier === 'Yellow' ? 'bg-[#D4A359] text-[#2E4057]' :
                      'bg-[#5A7855]'
                    }`}>
                      {item.tier ? item.tier[0] : 'G'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#2E4057] dark:text-[#F4F6F0] line-clamp-1">
                        {item.summary || 'Doctor Paramarsh'}
                      </p>
                      <p className="text-xs text-[#556376] dark:text-[#A8B4C2] mt-0.5">
                        {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'Haal hi mein'} • Session ID: {item.conversationId?.slice(0, 10)}...
                      </p>
                    </div>
                  </div>

                  <span className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 ${
                    item.tier === 'Red' ? 'bg-[#B85042] text-white' :
                    item.tier === 'Yellow' ? 'bg-[#D4A359] text-[#2E4057]' :
                    'bg-[#5A7855] text-white'
                  }`}>
                    Tier {item.tier || 'Green'}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 4: NEARBY FACILITIES (अस्पताल खोजें) ────────────── */}
        {activeTab === 'facilities' && (
          <div className="space-y-4 animate-fadeIn">
            <NearbyFacilityFinder onClose={() => setActiveTab('hub')} />
          </div>
        )}

        {/* ── TAB 5: MOUNTAIN FIRST AID (प्राथमिक उपचार) ──────────── */}
        {activeTab === 'firstaid' && (
          <div className="bg-white dark:bg-[#1E2A43] rounded-3xl p-6 sm:p-8 border border-[#5A7855]/20 dark:border-gray-800 shadow-sm space-y-4 animate-fadeIn">
            <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
              <div className="inline-flex items-center gap-1.5 bg-[#5A7855]/10 text-[#5A7855] dark:text-[#8ED14C] text-[10px] font-bold px-3 py-0.5 rounded-full mb-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Jeevan-Rakshak Niyam
              </div>
              <h2 className="font-serif font-bold text-xl text-[#2E4057] dark:text-[#F4F6F0] flex items-center gap-2">
                <span>Pahadi Prathmik Upchar (Emergency First-Aid)</span>
                <button
                  onClick={() => handleAudioGuide('Pahad me aapaat sthiti hone par in prathmik upchar niyam ko sunein aur apnayein.')}
                  className="touch-target p-1 text-[#5A7855]"
                  title="Audio sunein"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </h2>
              <p className="text-xs text-[#556376] dark:text-[#A8B4C2]">
                Hospital pahunchne tak zaroori gharelu prathmik sahayata
              </p>
            </div>

            <div className="space-y-3">
              {firstAidGuides.map((guide, idx) => {
                const isOpen = openFirstAidIndex === idx;
                return (
                  <div
                    key={idx}
                    className="border border-gray-200/80 dark:border-gray-700/80 rounded-2xl overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => setOpenFirstAidIndex(isOpen ? null : idx)}
                      className="touch-target w-full text-left p-4 flex items-center justify-between gap-3 bg-[#F4F6F0]/40 dark:bg-[#182332]/50 hover:bg-[#5A7855]/10 text-xs sm:text-sm font-bold text-[#2E4057] dark:text-[#F4F6F0]"
                    >
                      <span className="flex items-center gap-2">
                        <Bandage className="w-4 h-4 text-[#5A7855] shrink-0" />
                        <span>{guide.title}</span>
                      </span>
                      {isOpen ? <ChevronUp className="w-4 h-4 shrink-0 text-[#5A7855]" /> : <ChevronDown className="w-4 h-4 shrink-0 text-gray-400" />}
                    </button>
                    {isOpen && (
                      <div className="p-4 bg-white dark:bg-[#1E2A43] text-xs sm:text-sm text-[#556376] dark:text-[#A8B4C2] leading-relaxed border-t border-gray-100 dark:border-gray-800 animate-fadeIn space-y-3">
                        <p>{guide.content}</p>
                        <button
                          onClick={() => handleAudioGuide(guide.audio || guide.content)}
                          className="touch-target inline-flex items-center gap-1.5 text-xs font-bold text-[#5A7855] dark:text-[#8ED14C] bg-[#5A7855]/10 px-3 py-1.5 rounded-xl hover:bg-[#5A7855]/20"
                        >
                          <Volume2 className="w-4 h-4" />
                          <span>Yeh Niyam Suniye (Audio)</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
