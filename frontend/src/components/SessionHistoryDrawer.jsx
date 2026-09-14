import React from 'react';
import { X, Clock, Trash2 } from 'lucide-react';
import { listSessions, clearSessionHistory } from '../lib/sessionStore';

/**
 * SessionHistoryDrawer — new feature.
 * Lets a patient revisit past consultations (title, tier, date) without
 * losing the calm single-column chat layout — it's an overlay, not a
 * permanent sidebar, so the chat itself stays uncluttered by default.
 */
export default function SessionHistoryDrawer({ open, onClose }) {
  const [sessions, setSessions] = React.useState([]);

  React.useEffect(() => {
    if (open) setSessions(listSessions());
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xs h-full bg-mist text-primary shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <h3 className="font-serif font-bold text-lg flex items-center gap-2">
            <Clock className="w-4 h-4 text-gold-warm" /> Pichle Sessions
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/5 text-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {sessions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">
              Abhi tak koi consultation record nahi hai.
            </p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.conversationId}
                className="bg-card rounded-2xl p-3.5 border border-border-subtle"
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${
                      s.tier === 'Red' ? 'bg-rose-soft' : s.tier === 'Yellow' ? 'bg-gold-warm' : 'bg-sage'
                    }`}
                  >
                    {s.tier}
                  </span>
                  <span className="text-[10px] text-muted">
                    {new Date(s.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-primary leading-snug">{s.summary}</p>
              </div>
            ))
          )}
        </div>

        {sessions.length > 0 && (
          <div className="p-4 border-t border-border-subtle">
            <button
              onClick={() => { clearSessionHistory(); setSessions([]); }}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-soft hover:bg-rose-soft/10 py-2.5 rounded-xl transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear History
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
