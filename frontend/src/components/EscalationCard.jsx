import React, { useState } from 'react';
import { PhoneCall, Navigation, AlertOctagon, HeartHandshake, X, MapPin, MessageSquare, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import NearbyFacilityFinder from './NearbyFacilityFinder';

export default function EscalationCard({ tier, flags = [] }) {
  const isRed = tier === 'Red';
  const [showMapModal, setShowMapModal] = useState(false);
  const [showFinderModal, setShowFinderModal] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const handleEmergencySmsAndGps = () => {
    setIsLocating(true);

    const dispatchPayload = (lat, lon) => {
      const flagSummary = flags.length > 0 ? ` Gambhir lakshan: ${flags.join(', ')}.` : '';
      const text = `🚨 आपातकालीन 108 एम्बुलेंस अनुरोध (EMERGENCY 108 AMBULANCE DISPATCH): Chamoli/Gopeshwar Uttarakhand. Triage Tier: ${tier}.${flagSummary} GPS: ${lat}° N, ${lon}° E. Kripya turant ambulance bhejein.`;

      // Copy triage packet to clipboard
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
        toast.success('आपातकालीन GPS व ट्राइएज संदेश कॉपी हो गया! 📋');
      }

      // Open pre-filled SMS intent
      window.location.href = `sms:108?body=${encodeURIComponent(text)}`;
      setIsLocating(false);
    };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(4);
          const lon = pos.coords.longitude.toFixed(4);
          dispatchPayload(lat, lon);
        },
        () => {
          // Gopeshwar / Chamoli headquarters fallback coordinates
          dispatchPayload('30.4079', '79.3176');
        },
        { timeout: 4000 }
      );
    } else {
      dispatchPayload('30.4079', '79.3176');
    }
  };

  return (
    <>
      <div className={`p-4 md:p-5 rounded-3xl border-2 my-3 shadow-sm transition-all ${
        isRed
          ? 'bg-rose-soft/10 border-rose-soft text-rose-soft'
          : 'bg-gold-warm/15 border-gold-warm text-gold-warm'
      }`}>
        <div className="flex items-start gap-3.5">
          <div className={`p-3 rounded-2xl text-white shrink-0 shadow-xs ${isRed ? 'bg-rose-soft' : 'bg-gold-warm'}`}>
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h4 className="font-serif font-bold text-lg text-primary">
              {isRed ? '🚨 Aapaatkaal Chetawani (Immediate Emergency Alert)' : '⚠️ Doctor Ki Salah Jaroori (Clinical Assessment Recommended)'}
            </h4>
            <p className="text-xs md:text-sm text-primary mt-1 font-medium leading-relaxed">
              {isRed
                ? 'Hamare clinical engine ne gambhir lakshan pehchane hain. Gharelu nuskho par nirbhar na rahein — turant aspataal jayein ya 108 ko call karein.'
                : 'Ye lakshan 24 ghante ke bheetar PHC doctor ko dikhane jaroori hain.'}
            </p>

            {flags.length > 0 && (
              <div className="mt-3 text-xs bg-card p-3 rounded-2xl border border-border-subtle text-primary">
                <span className="font-bold text-[11px] uppercase tracking-wider block mb-1 text-gold-warm">
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
                className="touch-target flex items-center gap-2 bg-rose-soft hover:bg-rose-soft/90 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all"
              >
                <PhoneCall className="w-4 h-4" />
                <span>108 Ambulance Call Karein</span>
              </a>

              {/* Emergency SMS / Copy GPS Payload */}
              <button
                type="button"
                onClick={handleEmergencySmsAndGps}
                disabled={isLocating}
                className="touch-target flex items-center gap-2 bg-rose-soft/15 hover:bg-rose-soft/25 text-rose-soft border border-rose-soft/30 px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                title="Send pre-filled emergency SMS with GPS coordinates to 108"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{isLocating ? 'GPS प्राप्त कर रहे हैं…' : 'Send Emergency SMS / Copy GPS Payload'}</span>
              </button>

              <a
                href="tel:104"
                className="touch-target flex items-center gap-2 bg-warm-indigo hover:bg-warm-indigo/90 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all"
              >
                <HeartHandshake className="w-4 h-4" />
                <span>104 Health Helpline</span>
              </a>
              <button
                type="button"
                onClick={() => setShowFinderModal(true)}
                className="touch-target flex items-center gap-2 bg-sage hover:bg-sage/90 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <MapPin className="w-4 h-4" />
                <span>Nazdeeki Kendra</span>
              </button>
              <button
                type="button"
                onClick={() => setShowMapModal(true)}
                className="touch-target flex items-center gap-2 bg-card border border-border-subtle text-primary px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs hover:bg-surface transition-colors cursor-pointer"
              >
                <Navigation className="w-4 h-4 text-gold-warm" />
                <span>Aspataal Route Map</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Facility Finder Modal */}
      {showFinderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg relative animate-fadeIn">
            <NearbyFacilityFinder onClose={() => setShowFinderModal(false)} />
            <button
              onClick={() => setShowFinderModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface text-muted hover:text-primary touch-target cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Hospital Route Map Modal */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-surface text-primary w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[80vh] border border-border-subtle">

            <div className="flex items-center justify-between px-6 py-4 bg-card border-b border-border-subtle">
              <div>
                <h3 className="font-serif font-bold text-xl text-primary flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-gold-warm" />
                  Pahadi Yatra Route (Mountain Transit Route)
                </h3>
                <p className="text-xs text-muted font-sans mt-0.5">
                  District Hospital Gopeshwar Route • Anumanit Samay: ~42 mins
                </p>
              </div>
              <button
                onClick={() => setShowMapModal(false)}
                className="touch-target p-2 text-muted hover:text-rose-soft hover:bg-surface rounded-full transition-all cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 w-full bg-surface">
              <iframe
                title="Hospital Route Map"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d13770.835105267154!2d79.317585!3d30.407945!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39a79cfc4f7be33f%3A0x6790a618e9508bc5!2sDistrict%20Hospital%20Gopeshwar!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
                className="w-full h-full border-0"
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className="px-6 py-4 bg-card border-t border-border-subtle">
              <p className="text-xs text-muted leading-relaxed font-sans">
                <strong className="text-primary">Dhyan Dein:</strong> Pahadi raasto par mausam ka asar ho sakta hai. Agar baarish ya landslide ki soochana ho to 108 driver se sampark banaye rakhein.
              </p>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
