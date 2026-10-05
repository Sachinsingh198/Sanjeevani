import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Check, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already running as installed standalone PWA
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // Check if dismissed recently (24hr snooze)
    try {
      const dismissedAt = localStorage.getItem('sanjeevani_pwa_dismissed');
      if (dismissedAt) {
        const timePassed = Date.now() - parseInt(dismissedAt, 10);
        if (timePassed < 24 * 60 * 60 * 1000) {
          setDismissed(true);
        }
      }
    } catch {}

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      toast.success('संजीवनी ऐप आपके फ़ोन में सेव हो गई है! 🙏 (Installed)', {
        icon: '📱',
        duration: 5000,
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      toast.success('ऐप इंस्टॉल हो रही है...');
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('sanjeevani_pwa_dismissed', Date.now().toString());
    } catch {}
  };

  // Do not render if standalone, dismissed, or no prompt available
  if (isStandalone || dismissed || !deferredPrompt) {
    return null;
  }

  return (
    <aside
      aria-label="App Installation"
      className="fixed bottom-20 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 z-50 max-w-sm bg-white dark:bg-[#131E2B] border border-sage/30 dark:border-gray-700/80 rounded-2xl shadow-2xl p-3 sm:p-4 backdrop-blur-md animate-slideUp flex items-center justify-between gap-3"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-sage text-white flex items-center justify-center shrink-0 shadow-sm">
          <Smartphone className="w-5 h-5 animate-pulse" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-primary truncate flex items-center gap-1">
            <span>Sanjeevani App Install Karein</span>
            <Sparkles className="w-3 h-3 text-gold-warm shrink-0" />
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
            फ़ोन पर ऑफलाइन इस्तेमाल के लिए जोड़ें
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleInstallClick}
          className="touch-target px-3 py-1.5 rounded-xl bg-sage hover:bg-sage/90 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="touch-target p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}
