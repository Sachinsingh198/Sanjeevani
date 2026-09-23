import React, { useState, useEffect } from 'react';
import { WifiOff, AlertTriangle } from 'lucide-react';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-600 dark:bg-amber-700 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-md transition-all duration-300 z-50 sticky top-0"
    >
      <WifiOff className="w-4 h-4 shrink-0 animate-pulse text-amber-200" />
      <span className="text-center">
        <strong>ऑफ़लाइन मोड (Offline mode)</strong> — emergency triage rules cached, full AI consultation requires connection (आपातकालीन नियम कैश्ड हैं)
      </span>
    </div>
  );
}
