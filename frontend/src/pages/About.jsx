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
      color: 'bg-sage/10 text-sage dark:text-booti-glow',
    },
    {
      icon: Cpu,
      title: 'State-of-the-Art Clinical AI & Triage',
      desc: 'Powered by LangGraph multi-turn clinical state machines, Qdrant hybrid retrieval-augmented generation (RAG), and deterministic emergency escalation rules to safeguard patient health with Ministry of AYUSH certified home remedies.',
      tag: 'LangGraph + Qdrant',
      color: 'bg-gold-warm/15 text-gold-warm dark:text-gold-warm',
    },
    {
      icon: Activity,
      title: 'Holistic Wellness & Posture Vision',
      desc: 'Beyond acute triage, Sanjeevani incorporates Vedic Pranayama breathwork, pure Web Audio harmonic soundscapes, real-time Mediapipe computer vision posture tracking, and compassionate conversational companionship for elderly residents living alone.',
      tag: 'Vedic Wellness + CV',
      color: 'bg-warm-indigo/15 text-primary dark:text-muted',
    },
    {
      icon: Globe,
      title: 'Offline-First & ABDM Interoperability',
      desc: 'Designed for zero-connectivity mountain corridors. ASHA workers can log patient encounters offline with automatic background sync, and generate ABDM FHIR DiagnosticReport referral bundles and printable physician summaries.',
      tag: 'ABDM / FHIR Ready',
      color: 'bg-rose-soft/15 text-rose-soft dark:text-rose-soft',
    },
  ];

  return (
    <div className="min-h-[calc(100dvh-4.5rem)] bg-mist text-primary pb-20 md:pb-12 transition-colors duration-300 relative overflow-hidden">
      
      {/* Background Mountain Motif */}
      <div className="absolute top-12 left-0 right-0 pointer-events-none opacity-30 dark:opacity-15 z-0">
        <MountainRidge tone="pine" className="w-full h-40 object-cover" />
      </div>

      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8 space-y-8 relative z-10">
        
        {/* Back Link */}
        <div>
          <Link
            to="/"
            className="min-h-[44px] inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Home Page Par Wapas</span>
          </Link>
        </div>

        {/* ── Hero Banner ────────────────────────────────────────────── */}
        <div className="bg-card rounded-3xl p-6 sm:p-8 shadow-xs border border-border-subtle relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-sage/10 via-[#D4A359]/10 to-transparent rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <SanjeevaniOrb state="idle" size={38} />
            <div className="inline-flex items-center gap-2 bg-sage/10 text-sage text-xs font-bold px-3.5 py-1 rounded-full">
              <Award className="w-4 h-4 text-gold-warm" />
              <span>Academic Capstone Project (B.Tech Computer Science & Engineering)</span>
            </div>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-primary mb-3">
            Project Sanjeevani (संजीवनी 2.0)
          </h1>
          <p className="text-sm sm:text-base text-muted leading-relaxed mb-6 max-w-3xl">
            Developed at the <strong>Institute of Technology, Gopeshwar, Chamoli</strong> (<em>Veer Madho Singh Bhandari Uttarakhand Technical University</em>), under the academic supervision and mentorship of <strong>Mr. Rajendra Kumar</strong> (Assistant Professor, Department of Computer Science & Engineering).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border-subtle pt-6">
            <div className="bg-surface/80 p-4 rounded-2xl border border-border-subtle">
              <h4 className="font-bold text-[11px] uppercase tracking-wider text-gold-warm mb-1">
                Project Supervision
              </h4>
              <p className="font-serif font-bold text-base text-primary">Mr. Rajendra Kumar</p>
              <p className="text-xs text-muted">Assistant Professor, Dept. of CSE</p>
              <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-sage" /> IT Gopeshwar, Chamoli
              </p>
            </div>
            
            <div className="bg-surface/80 p-4 rounded-2xl border border-border-subtle">
              <h4 className="font-bold text-[11px] uppercase tracking-wider text-gold-warm mb-1">
                Academic Affiliation
              </h4>
              <p className="font-serif font-bold text-base text-primary">IT Gopeshwar, Chamoli</p>
              <p className="text-xs text-muted">Veer Madho Singh Bhandari Uttarakhand Technical University</p>
              <p className="text-xs text-muted mt-0.5">State Government University, Uttarakhand</p>
            </div>
          </div>
        </div>

        {/* ── 4 Architecture & Mission Pillars ────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-sage" />
            <h2 className="font-serif font-bold text-xl text-primary">
              The Sanjeevani Ecosystem & Philosophy
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pillars.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="bg-card p-5 rounded-3xl border border-border-subtle shadow-xs flex flex-col justify-between space-y-3 hover:shadow-md transition-shadow"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`w-10 h-10 rounded-2xl ${item.color} flex items-center justify-center`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-surface text-muted px-2 py-0.5 rounded-full border border-border-subtle">
                        {item.tag}
                      </span>
                    </div>
                    <h3 className="font-serif font-bold text-base text-primary leading-snug">{item.title}</h3>
                    <p className="text-xs text-muted leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Student Development Team ───────────────────────────────── */}
        <div className="space-y-4">
          <h3 className="font-serif text-xl font-bold text-primary flex items-center gap-2">
            <Users className="w-5 h-5 text-sage" />
            <span>Capstone Engineering Team</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {teamMembers.map((member, idx) => (
              <div
                key={idx}
                className="bg-card p-5 rounded-3xl border border-border-subtle shadow-xs flex flex-col justify-between gap-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gold-warm/20 text-gold-warm flex items-center justify-center font-bold text-sm shrink-0">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-serif font-bold text-sm sm:text-base text-primary truncate">{member.name}</h4>
                    <p className="text-xs text-muted mt-0.5 leading-snug">{member.role}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-border-subtle">
                  <span className="inline-block text-[9px] font-bold uppercase bg-sage/15 text-sage px-2 py-0.5 rounded-md">
                    {member.badge}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
