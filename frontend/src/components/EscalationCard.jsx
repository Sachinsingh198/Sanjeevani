import React, { useState } from 'react';
import { PhoneCall, Navigation, AlertOctagon, HeartHandshake, X, MapPin } from 'lucide-react';
import NearbyFacilityFinder from './NearbyFacilityFinder';

export default function EscalationCard({ tier, flags = [] }) {
  const isRed = tier === 'Red';
  const [showMapModal, setShowMapModal] = useState(false);
  const [showFinderModal, setShowFinderModal] = useState(false);

  return (
    <>
      <div className={`p-4 md:p-5 rounded-2xl border-2 my-3 shadow-md transition-all ${
        isRed ? 'bg-rose-soft/10 border-rose-soft text-rose-soft' : 'bg-gold-warm/10 border-gold-warm text-gold-warm'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl text-white ${isRed ? 'bg-rose-soft' : 'bg-gold-warm'}`}>
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h4 className="font-serif font-bold text-lg text-warm-indigo">
              {isRed ? 'Critical Emergency Alert Dispatched' : 'Clinical Consultation Recommended'}
            </h4>
            <p className="text-xs md:text-sm text-primary mt-1 font-medium">
              {isRed
                ? 'Our deterministic triage engine has detected high-acuity life threats. Do not rely on home remedies.'
                : 'Symptoms require clinical assessment within 24 hours to rule out complications.'}
            </p>

            {flags.length > 0 && (
              <div className="mt-2 text-xs bg-card/70 p-2 rounded-lg border border-border-subtle text-primary">
                <span className="font-semibold text-xs uppercase tracking-wider block mb-0.5">Clinical Flags:</span>
                <ul className="list-disc list-inside">
                  {flags.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2.5 mt-3.5">
              <a
                href="tel:108"
                className="flex items-center gap-1.5 bg-rose-soft text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow hover:opacity-90 transition-opacity"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                Call 108 Ambulance
              </a>
              <a
                href="tel:104"
                className="flex items-center gap-1.5 bg-warm-indigo text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow hover:opacity-90 transition-opacity"
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                104 Health Helpline
              </a>
              <button
                onClick={() => setShowFinderModal(true)}
                className="flex items-center gap-1.5 bg-sage text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-[#4a6346] transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                Find Centers Near Me
              </button>
              <button
                onClick={() => setShowMapModal(true)}
                className="flex items-center gap-1.5 bg-card border border-warm-indigo/20 text-warm-indigo px-3.5 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-mist transition-colors"
              >
                <Navigation className="w-3.5 h-3.5 text-gold-warm" />
                Hospital Route Map
              </button>
            </div>
          </div>
        </div>
      </div>

      {showFinderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg relative animate-fadeIn">
            <NearbyFacilityFinder onClose={() => setShowFinderModal(false)} />
            <button
              onClick={() => setShowFinderModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-black/5 text-muted hover:text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}


      {showMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-mist text-primary w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[80vh]">

            <div className="flex items-center justify-between px-6 py-4 bg-card border-b border-border-subtle">
              <div>
                <h3 className="font-serif font-bold text-xl text-primary flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-gold-warm" />
                  Mountain Transit Route
                </h3>
                <p className="text-xs text-muted font-sans mt-0.5">
                  Route to District Hospital, Gopeshwar • Estimated Transit: 42 mins
                </p>
              </div>
              <button
                onClick={() => setShowMapModal(false)}
                className="p-2 text-gray-400 hover:text-rose-soft hover:bg-black/5 rounded-full transition-all"
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
              ></iframe>
            </div>

            <div className="px-6 py-4 bg-card border-t border-border-subtle">
              <p className="text-xs text-muted leading-relaxed font-sans">
                <strong className="text-primary">Important:</strong> Mountain roads may be affected by weather. Please confirm the route with local 108 drivers if heavy rain or landslides are reported. Have your Sanjeevani Patient ID ready upon arrival at the ER.
              </p>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
