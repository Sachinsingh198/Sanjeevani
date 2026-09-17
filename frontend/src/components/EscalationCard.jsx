import React, { useState } from 'react';
import { PhoneCall, Navigation, AlertOctagon, HeartHandshake, X, MapPin } from 'lucide-react';
import NearbyFacilityFinder from './NearbyFacilityFinder';

export default function EscalationCard({ tier, flags = [] }) {
  const isRed = tier === 'Red';
  const [showMapModal, setShowMapModal] = useState(false);
  const [showFinderModal, setShowFinderModal] = useState(false);

  return (
    <>
      <div className={`p-4 md:p-5 rounded-3xl border-2 my-3 shadow-sm transition-all ${
        isRed
          ? 'bg-[#A23B33]/10 dark:bg-[#A23B33]/20 border-[#A23B33] text-[#A23B33]'
          : 'bg-[#D4A359]/15 dark:bg-[#D4A359]/20 border-[#D4A359] text-[#8C5E24] dark:text-[#D4A359]'
      }`}>
        <div className="flex items-start gap-3.5">
          <div className={`p-3 rounded-2xl text-white shrink-0 shadow-xs ${isRed ? 'bg-[#A23B33]' : 'bg-[#D4A359]'}`}>
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h4 className="font-serif font-bold text-lg text-[#1E2A43] dark:text-[#F4F6F0]">
              {isRed ? '🚨 Aapaatkaal Chetawani (Immediate Emergency Alert)' : '⚠️ Doctor Ki Salah Jaroori (Clinical Assessment Recommended)'}
            </h4>
            <p className="text-xs md:text-sm text-[#1E2A43] dark:text-[#EAEFEA] mt-1 font-medium leading-relaxed">
              {isRed
                ? 'Hamare clinical engine ne gambhir lakshan pehchane hain. Gharelu nuskho par nirbhar na rahein — turant aspataal jayein ya 108 ko call karein.'
                : 'Ye lakshan 24 ghante ke bheetar PHC doctor ko dikhane jaroori hain.'}
            </p>

            {flags.length > 0 && (
              <div className="mt-3 text-xs bg-white/80 dark:bg-[#1E2A43]/80 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-[#1E2A43] dark:text-[#EAEFEA]">
                <span className="font-bold text-[11px] uppercase tracking-wider block mb-1 text-[#8C5E24] dark:text-[#D4A359]">
                  Clinical Flags / Gambhir Sanket:
                </span>
                <ul className="list-disc list-inside space-y-0.5">
                  {flags.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2.5 mt-4">
              <a
                href="tel:108"
                className="touch-target flex items-center gap-2 bg-[#A23B33] hover:bg-[#852E27] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow transition-all"
              >
                <PhoneCall className="w-4 h-4" />
                <span>108 Ambulance Call Karein</span>
              </a>
              <a
                href="tel:104"
                className="touch-target flex items-center gap-2 bg-[#2E4057] hover:bg-[#1E2A43] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow transition-all"
              >
                <HeartHandshake className="w-4 h-4" />
                <span>104 Health Helpline</span>
              </a>
              <button
                onClick={() => setShowFinderModal(true)}
                className="touch-target flex items-center gap-2 bg-[#5A7855] hover:bg-[#4a6346] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <MapPin className="w-4 h-4" />
                <span>Nazdeeki Kendra</span>
              </button>
              <button
                onClick={() => setShowMapModal(true)}
                className="touch-target flex items-center gap-2 bg-white dark:bg-[#253247] border border-gray-300 dark:border-gray-600 text-[#1E2A43] dark:text-[#F4F6F0] px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs hover:bg-gray-100 transition-colors"
              >
                <Navigation className="w-4 h-4 text-[#D4A359]" />
                <span>Aspataal Route Map</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Facility Finder Modal */}
      {showFinderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg relative animate-fadeIn">
            <NearbyFacilityFinder onClose={() => setShowFinderModal(false)} />
            <button
              onClick={() => setShowFinderModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 text-[#556376] hover:text-[#1E2A43] touch-target"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Hospital Route Map Modal */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#F4F6F0] dark:bg-[#151D28] text-[#1E2A43] dark:text-[#EAEFEA] w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[80vh]">

            <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-[#1E2A43] border-b border-gray-200 dark:border-gray-800">
              <div>
                <h3 className="font-serif font-bold text-xl text-[#1E2A43] dark:text-[#F4F6F0] flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-[#D4A359]" />
                  Pahadi Yatra Route (Mountain Transit Route)
                </h3>
                <p className="text-xs text-[#556376] dark:text-[#A8B4C2] font-sans mt-0.5">
                  District Hospital Gopeshwar Route • Anumanit Samay: ~42 mins
                </p>
              </div>
              <button
                onClick={() => setShowMapModal(false)}
                className="touch-target p-2 text-gray-400 hover:text-[#A23B33] hover:bg-black/5 rounded-full transition-all"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 w-full bg-gray-200">
              <iframe
                title="Hospital Route Map"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d13770.835105267154!2d79.317585!3d30.407945!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39a79cfc4f7be33f%3A0x6790a618e9508bc5!2sDistrict%20Hospital%20Gopeshwar!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
                className="w-full h-full border-0"
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className="px-6 py-4 bg-white dark:bg-[#1E2A43] border-t border-gray-200 dark:border-gray-800">
              <p className="text-xs text-[#556376] dark:text-[#A8B4C2] leading-relaxed font-sans">
                <strong className="text-[#1E2A43] dark:text-[#F4F6F0]">Dhyan Dein:</strong> Pahadi raasto par mausam ka asar ho sakta hai. Agar baarish ya landslide ki soochana ho to 108 driver se sampark banaye rakhein.
              </p>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
