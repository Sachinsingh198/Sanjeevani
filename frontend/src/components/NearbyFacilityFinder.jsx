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
    <div className="bg-card rounded-3xl p-6 border border-border-subtle shadow-sm">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-sage/10 flex items-center justify-center text-sage shrink-0">
          <MapPin className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-serif font-bold text-lg text-primary">Find Nearby Health Center</h3>
          <p className="text-xs text-muted mt-1">
            Locate the closest PHC, CHC, or hospital using your current location.
          </p>

          {status === 'error' && (
            <div className="flex items-start gap-1.5 mt-3 text-xs text-rose-soft bg-rose-soft/10 px-3 py-2 rounded-xl">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            onClick={handleFind}
            disabled={status === 'locating'}
            className="mt-3 flex items-center gap-2 bg-sage hover:bg-[#4a6346] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all disabled:opacity-60"
          >
            {status === 'locating' ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Locating…</>
            ) : (
              <><Navigation className="w-4 h-4" /> Find Centers Near Me</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}