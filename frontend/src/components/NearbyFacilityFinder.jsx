import React, { useState } from 'react';
import { MapPin, Navigation, Loader2, AlertCircle } from 'lucide-react';

/**
 * NearbyFacilityFinder — one-tap "find help near me" for patients.
 * Uses browser geolocation, then opens Google Maps search centered on the
 * patient's location for PHCs/hospitals — no backend or API key needed.
 */
export default function NearbyFacilityFinder({ onClose }) {
  const [status, setStatus] = useState('idle'); // idle | locating | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleFind = () => {
    if (!navigator.geolocation) {
      setStatus('error');
      setErrorMsg('Location services not supported in this browser.');
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const url = `https://www.google.com/maps/search/hospital+OR+PHC+OR+clinic/@${latitude},${longitude},14z`;
        window.open(url, '_blank', 'noopener,noreferrer');
        setStatus('idle');
        onClose?.();
      },
      (err) => {
        setStatus('error');
        setErrorMsg(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Please allow location access to find nearby centers.'
            : 'Could not determine your location. Please try again.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="bg-white dark:bg-[#1E2A43] rounded-3xl p-6 border border-[#5A7855]/20 dark:border-gray-800 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#5A7855]/15 dark:bg-[#5A7855]/25 flex items-center justify-center text-[#5A7855] dark:text-[#8ED14C] shrink-0">
          <MapPin className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-lg text-[#2E4057] dark:text-[#F4F6F0]">निकटतम स्वास्थ्य केंद्र / Find Nearby Centers</h3>
            {onClose && (
              <button 
                onClick={onClose}
                className="text-[#556376] dark:text-[#A8B4C2] hover:text-[#2E4057] dark:hover:text-[#F4F6F0] text-xs font-semibold px-2.5 py-1 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                aria-label="Close modal"
              >
                ✕
              </button>
            )}
          </div>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            आपके वर्तमान स्थान के आधार पर सबसे नज़दीकी प्राथमिक स्वास्थ्य केंद्र (PHC), सामुदायिक केंद्र (CHC) या जिला अस्पताल की दिशा खोजें।
          </p>

          {status === 'error' && (
            <div className="flex items-start gap-2 mt-3 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-3 py-2.5 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            onClick={handleFind}
            disabled={status === 'locating'}
            className="mt-4 touch-target inline-flex items-center gap-2 bg-[#5A7855] hover:bg-[#476043] text-white text-sm font-bold px-5 py-3 rounded-2xl shadow-sm transition-all disabled:opacity-60 cursor-pointer"
          >
            {status === 'locating' ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> स्थान का पता लगा रहे हैं (Locating)…</>
            ) : (
              <><Navigation className="w-4 h-4" /> नज़दीकी केंद्र खोजें (Find Centers Near Me)</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}