import React from 'react';
import { Link } from 'react-router-dom';
import { Award, Users, Shield, Cpu, Activity, Heart, Globe, BookOpen, Leaf, MapPin, ArrowLeft, Sparkles, Stethoscope, Compass } from 'lucide-react';
import SanjeevaniOrb from '../components/SanjeevaniOrb';
import MountainRidge from '../components/MountainRidge';

export default function About() {
  const teamMembers = [
    { name: 'Sachin Singh', role: 'LangGraph State & Triage Engine', badge: 'Lead System Architect' },
    { name: 'Piyush Panwar', role: 'Qdrant Hybrid RAG & Knowledge Graph', badge: 'Vector Search & AI' },
    { name: 'Anurag Jhinkwan', role: 'Edge CV Screening & Bhashini Voice', badge: 'Vision & Neural Speech' },
    { name: 'Lakshya Raturi', role: 'Offline PWA Frontend & ABDM / FHIR', badge: 'Health Informatics' },
  ];

  const pillars = [
    {
      icon: Heart,
      title: 'Mission & Rural Himalayan Challenge',
      desc: 'High-altitude Himalayan communities in Chamoli and surrounding valleys face geographic isolation, harsh winter passes, and long transit times to tertiary care. Sanjeevani provides immediate, calm, and voice-guided health reassurance in local dialects.',
      tag: 'Healthcare Equity',
      color: 'bg-[#5A7855]/10 text-[#5A7855] dark:text-[#8ED14C]',
    },
    {
      icon: Cpu,
      title: 'State-of-the-Art Clinical AI & Triage',
      desc: 'Powered by LangGraph multi-turn clinical state machines, Qdrant hybrid retrieval-augmented generation (RAG), and deterministic emergency escalation rules to safeguard patient health with Ministry of AYUSH certified home remedies.',
      tag: 'LangGraph + Qdrant',
      color: 'bg-[#D4A359]/15 text-[#8C5E24] dark:text-[#D4A359]',
    },
    {
      icon: Activity,
      title: 'Holistic Wellness & Posture Vision',
      desc: 'Beyond acute triage, Sanjeevani incorporates Vedic Pranayama breathwork, pure Web Audio harmonic soundscapes, real-time Mediapipe computer vision posture tracking, and compassionate conversational companionship for elderly residents living alone.',
      tag: 'Vedic Wellness + CV',
      color: 'bg-[#2E4057]/15 text-[#2E4057] dark:text-[#A8B4C2]',
    },
    {
      icon: Globe,
      title: 'Offline-First & ABDM Interoperability',
      desc: 'Designed for zero-connectivity mountain corridors. ASHA workers can log patient encounters offline with automatic background sync, and generate ABDM FHIR DiagnosticReport referral bundles and printable physician summaries.',
      tag: 'ABDM / FHIR Ready',
      color: 'bg-[#B85042]/15 text-[#B85042] dark:text-[#F08080]',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6F0] dark:bg-[#151D28] text-[#1E2A43] dark:text-[#EAEFEA] py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-300 relative overflow-hidden">
      
      {/* Background Mountain Motif */}
      <div className="absolute top-12 left-0 right-0 pointer-events-none opacity-30 dark:opacity-15 z-0">
        <MountainRidge tone="pine" className="w-full h-40 object-cover" />
      </div>

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        
        {/* Back Link */}
        <div>
          <Link
            to="/"
            className="touch-target inline-flex items-center gap-2 text-xs font-semibold text-[#556376] dark:text-[#A8B4C2] hover:text-[#1E2A43] dark:hover:text-[#F4F6F0] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Home Page Par Wapas</span>
          </Link>
        </div>

        {/* ── Hero Banner ────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#1E2A43] rounded-3xl p-6 sm:p-8 shadow-xs border border-gray-200/80 dark:border-gray-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#5A7855]/10 via-[#D4A359]/10 to-transparent rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-3 mb-4">
            <SanjeevaniOrb state="idle" size={38} />
            <div className="inline-flex items-center gap-2 bg-[#5A7855]/10 dark:bg-[#5A7855]/20 text-[#2B4A30] dark:text-[#8ED14C] text-xs font-bold px-3.5 py-1 rounded-full">
              <Award className="w-4 h-4 text-[#D4A359]" />
              <span>Academic Capstone Project (B.Tech Computer Science & Engineering)</span>
            </div>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1E2A43] dark:text-[#F4F6F0] mb-3">
            Project Sanjeevani (संजीवनी 2.0)
          </h1>
          <p className="text-sm sm:text-base text-[#556376] dark:text-[#A8B4C2] leading-relaxed mb-6">
            Developed at the <strong>Institute of Technology, Gopeshwar, Chamoli</strong> (<em>Veer Madho Singh Bhandari Uttarakhand Technical University</em>), under the academic supervision and mentorship of <strong>Mr. Rajendra Kumar</strong> (Assistant Professor, Department of Computer Science & Engineering).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 dark:border-gray-800 pt-6">
            <div className="bg-[#F7F2E8]/60 dark:bg-[#182332] p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
              <h4 className="font-bold text-[11px] uppercase tracking-wider text-[#8C5E24] dark:text-[#D4A359] mb-1">
                Project Supervision
              </h4>
              <p className="font-serif font-bold text-base text-[#1E2A43] dark:text-[#F4F6F0]">Mr. Rajendra Kumar</p>
              <p className="text-xs text-[#556376] dark:text-[#A8B4C2]">Assistant Professor, Dept. of CSE</p>
              <p className="text-xs text-[#556376] dark:text-[#A8B4C2] flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-[#5A7855]" /> IT Gopeshwar, Chamoli
              </p>
            </div>
            
            <div className="bg-[#F7F2E8]/60 dark:bg-[#182332] p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
              <h4 className="font-bold text-[11px] uppercase tracking-wider text-[#8C5E24] dark:text-[#D4A359] mb-1">
                Academic Affiliation
              </h4>
              <p className="font-serif font-bold text-base text-[#1E2A43] dark:text-[#F4F6F0]">IT Gopeshwar, Chamoli</p>
              <p className="text-xs text-[#556376] dark:text-[#A8B4C2]">Veer Madho Singh Bhandari Uttarakhand Technical University</p>
              <p className="text-xs text-[#556376] dark:text-[#A8B4C2] mt-0.5">State Government University, Uttarakhand</p>
            </div>
          </div>
        </div>

        {/* ── 4 Architecture & Mission Pillars ────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-[#5A7855]" />
            <h2 className="font-serif font-bold text-xl text-[#1E2A43] dark:text-[#F4F6F0]">
              The Sanjeevani Ecosystem & Philosophy
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pillars.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#1E2A43] p-5 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-xs space-y-2.5 tactile-card"
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-2xl ${item.color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-800 text-[#556376] dark:text-[#A8B4C2] px-2.5 py-0.5 rounded-full">
                      {item.tag}
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-base text-[#1E2A43] dark:text-[#F4F6F0]">{item.title}</h3>
                  <p className="text-xs text-[#556376] dark:text-[#A8B4C2] leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Student Development Team ───────────────────────────────── */}
        <div className="space-y-4">
          <h3 className="font-serif text-xl font-bold text-[#1E2A43] dark:text-[#F4F6F0] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#5A7855]" />
            <span>Capstone Engineering Team</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {teamMembers.map((member, idx) => (
              <div key={idx} className="bg-white dark:bg-[#1E2A43] p-5 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-xs flex items-center justify-between gap-3.5 tactile-card">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#D4A359]/20 text-[#8C5E24] dark:text-[#D4A359] flex items-center justify-center font-bold text-sm shrink-0">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-sm sm:text-base text-[#2E4057] dark:text-[#F4F6F0]">{member.name}</h4>
                    <p className="text-xs text-[#556376] dark:text-[#A8B4C2] mt-0.5">{member.role}</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold uppercase bg-[#5A7855]/15 text-[#5A7855] dark:text-[#8ED14C] px-2.5 py-1 rounded-lg shrink-0">
                  {member.badge}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
