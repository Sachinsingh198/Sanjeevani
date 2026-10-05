import React from 'react';
import { X, Clock, Trash2 } from 'lucide-react';
import SkeletonLoader from './SkeletonLoader';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { listSessions, fetchServerSessions, clearSessionHistory, deleteSession } from '../lib/sessionStore';

/**
 * SessionHistoryDrawer — accessible consultation history drawer.
 * Lets a patient revisit and manage past consultations (title, tier, date)
 * without losing the calm single-column chat layout.
 */
export default function SessionHistoryDrawer({ open, onClose }) {
  const { user } = useAuth();
  const { l, toEnglishDigits, lang } = useLanguage();
  const [sessions, setSessions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setLoading(true);
      // Immediately render local cached sessions scoped to user
      const local = listSessions(user?.id);
      setSessions(local);
      if (local && local.length > 0) setLoading(false);
      // Reconcile with server-side history asynchronously
      fetchServerSessions(user?.id).then((remoteSessions) => {
        if (remoteSessions && remoteSessions.length > 0) {
          setSessions(remoteSessions);
        }
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [open, user?.id]);

  const handleDeleteItem = async (conversationId, e) => {
    e?.stopPropagation();
    if (!window.confirm(l('क्या आप इस परामर्श को हटाना चाहते हैं?', 'Are you sure you want to delete this consultation?'))) {
      return;
    }
    await deleteSession(conversationId, user?.id);
    setSessions((prev) => prev.filter((item) => item.conversationId !== conversationId));
  };

  const handleClearAll = async () => {
    if (!window.confirm(l('क्या आप सभी परामर्श इतिहास हटाना चाहते हैं? यह वापस नहीं लाया जा सकता।', 'Are you sure you want to delete all consultation history? This cannot be undone.'))) {
      return;
    }
    await clearSessionHistory(user?.id);
    setSessions([]);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xs h-full bg-mist dark:bg-card text-primary shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <h3 className="font-serif font-bold text-lg flex items-center gap-2">
            <Clock className="w-4 h-4 text-gold-warm" /> {l('पिछला परामर्श इतिहास', 'Previous Consultations')}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-muted cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading && sessions.length === 0 ? (
            <SkeletonLoader variant="list-item" count={3} />
          ) : sessions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">
              {l('अभी तक कोई परामर्श रिकॉर्ड नहीं है।', 'No consultation records found yet.')}
            </p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.conversationId}
                className="bg-card dark:bg-card/80 rounded-2xl p-3.5 border border-border-subtle group hover:border-sage/40 transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${
                      s.tier === 'Red' ? 'bg-rose-soft' : s.tier === 'Yellow' ? 'bg-gold-warm text-primary' : 'bg-sage'
                    }`}
                  >
                    {s.tier}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted">
                      {s.updatedAt ? toEnglishDigits(new Date(s.updatedAt).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short' })) : ''}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteItem(s.conversationId, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                      title={l('हटाएं', 'Delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-primary dark:text-gray-200 leading-snug">{s.summary}</p>
              </div>
            ))
          )}
        </div>

        {sessions.length > 0 && (
          <div className="p-4 border-t border-border-subtle">
            <button
              onClick={handleClearAll}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> {l('इतिहास साफ करें', 'Clear History')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
