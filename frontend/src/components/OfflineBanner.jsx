import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, ShieldCheck, Database, X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getPendingSyncCounts, syncAllPendingData, clearAllOfflineQueues } from '../lib/offlineSyncManager';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [pendingCounts, setPendingCounts] = useState(getPendingSyncCounts());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setIsDismissed(false);
      triggerSync();
    };

    const handleOffline = () => {
      setIsOffline(true);
      setIsDismissed(false);
      setPendingCounts(getPendingSyncCounts());
    };

    const handleQueueChanged = (e) => {
      setPendingCounts(e.detail || getPendingSyncCounts());
    };

    const handleSyncCompleted = (e) => {
      setIsSyncing(false);
      const updated = getPendingSyncCounts();
      setPendingCounts(updated);
      const count = e.detail?.totalSynced || 0;
      if (count > 0) {
        toast.success(`🌐 डेटाबेस सिंक सफल: ${count} रिकॉर्ड्स सुरक्षित रूप से सेव हो गए!`, {
          icon: '✅',
          duration: 4000,
        });
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sanjeevani-queue-changed', handleQueueChanged);
    window.addEventListener('sanjeevani-sync-completed', handleSyncCompleted);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sanjeevani-queue-changed', handleQueueChanged);
      window.removeEventListener('sanjeevani-sync-completed', handleSyncCompleted);
    };
  }, []);

  const triggerSync = async () => {
    setIsSyncing(true);
    try {
      await syncAllPendingData();
    } finally {
      setIsSyncing(false);
      const updated = getPendingSyncCounts();
      setPendingCounts(updated);
      if (updated.total === 0) {
        setIsDismissed(true);
      }
    }
  };

  const handleClearQueues = (e) => {
    e.stopPropagation();
    clearAllOfflineQueues();
    setPendingCounts({ chat: 0, screening: 0, asha: 0, total: 0 });
    setIsDismissed(true);
    toast.success('ऑफ़लाइन कतार खाली कर दी गई। (Queue cleared)', { icon: '🧹' });
  };

  // If user dismissed it or online and no pending records, keep UI clean
  if (isDismissed || (!isOffline && pendingCounts.total === 0 && !isSyncing)) {
    return null;
  }

  // State A: OFFLINE MODE ACTIVE
  if (isOffline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 text-white px-3 sm:px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md transition-all duration-300 z-50 sticky top-0"
      >
        <div className="flex items-center gap-2 max-w-[85%] sm:max-w-none">
          <WifiOff className="w-4 h-4 shrink-0 animate-pulse text-amber-200" />
          <span className="leading-tight">
            <strong>ऑफ़लाइन मोड सक्रिय (Offline Mode Active):</strong> On-Device Clinical Triage, AYUSH Remedies & Eye Screening Enabled
            {pendingCounts.total > 0 && (
              <span className="ml-2 bg-black/20 px-2 py-0.5 rounded-full text-[11px] font-mono">
                {pendingCounts.total} queued for auto-sync
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] bg-white/10 px-2 py-1 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span>Local Safe Engine</span>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 hover:bg-white/20 rounded-md text-amber-200 hover:text-white transition-colors"
            title="Dismiss banner"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // State B: ONLINE WITH PENDING ITEMS TO SYNC
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-700 text-white px-3 sm:px-4 py-1.5 text-xs font-semibold flex items-center justify-between shadow-md transition-all duration-300 z-50 sticky top-0 animate-fadeIn"
    >
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 shrink-0 text-emerald-200" />
        <span>
          <strong>इंटरनेट पुनः कनेक्ट हुआ (Connected):</strong> {pendingCounts.total} ऑफ़लाइन रिकॉर्ड्स डेटाबेस में सिंक होने के लिए तैयार हैं
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={triggerSync}
          disabled={isSyncing}
          className="touch-target inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
        </button>
        <button
          onClick={handleClearQueues}
          className="p-1 hover:bg-white/20 rounded-md text-emerald-100 hover:text-white transition-colors"
          title="Clear queue records"
          aria-label="Clear queue"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 hover:bg-white/20 rounded-md text-emerald-100 hover:text-white transition-colors"
          title="Dismiss banner"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
