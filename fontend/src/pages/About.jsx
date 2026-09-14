import React from 'react';
import { Award, Users, BookOpen, MapPin, HeartPulse } from 'lucide-react';

export default function About() {
  const teamMembers = [
    { name: 'Sachin Singh', role: 'LangGraph State & Triage Engine' },
    { name: 'Piyush Panwar', role: 'Qdrant Hybrid RAG & Knowledge Graph' },
    { name: 'Anurag Jhinkwan', role: 'Edge CV Screening & Bhashini Voice' },
    { name: 'Lakshya Raturi', role: 'Offline PWA Frontend & ABDM / FHIR' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="bg-card rounded-2xl p-6 md:p-8 shadow-sm border border-border-subtle mb-8">
        <div className="inline-flex items-center gap-2 bg-[#1C2B4A]/10 text-[#1C2B4A] text-xs font-bold px-3 py-1 rounded-full mb-4">
          <Award className="w-4 h-4 text-[#E8A33D]" /> Academic Capstone Project (B.Tech CSE)
        </div>

        <h1 className="font-serif text-3xl font-bold text-[#1C2B4A] mb-3">Project Sanjeevani</h1>
        <p className="text-sm text-primary leading-relaxed mb-6">
          Developed at the <strong>Institute of Technology, Gopeshwar, Chamoli</strong> (<em>Veer Madho Singh Bhandari Uttarakhand Technical University</em>), under the guidance of <strong>Mr. Rajendra Kumar</strong> (Assistant Professor, Department of Computer Science & Engineering).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-6">
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted mb-2">Project Supervision</h4>
            <p className="font-bold text-[#1C2B4A] text-base">Mr. Rajendra Kumar</p>
            <p className="text-xs text-muted">Assistant Professor, CSE Dept</p>
            <p className="text-xs text-muted">IT Gopeshwar, Chamoli</p>
          </div>
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted mb-2">Academic Affiliation</h4>
            <p className="font-bold text-[#1C2B4A] text-base">IT Gopeshwar, Chamoli</p>
            <p className="text-xs text-muted">VMSB Uttarakhand Technical University</p>
          </div>
        </div>
      </div>

      {/* Team Section */}
      <h3 className="font-serif text-xl font-bold text-[#1C2B4A] mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-[#5F7A52]" /> Development Team
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {teamMembers.map((member, idx) => (
          <div key={idx} className="bg-card p-4 rounded-xl border border-border-subtle shadow-sm">
            <h4 className="font-bold text-[#1C2B4A]">{member.name}</h4>
            <p className="text-xs text-muted mt-0.5">{member.role}</p>
          </div>
        ))}
      </div>
    </div>
  );
}