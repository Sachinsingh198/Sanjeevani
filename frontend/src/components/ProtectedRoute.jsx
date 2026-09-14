import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Home } from 'lucide-react';

/**
 * ProtectedRoute — wraps a route element with authentication and role checks.
 *
 * Props:
 *   - allowedRoles: string[] — which roles can access this route
 *   - children: React element to render if authorized
 *
 * FIX: the previous version rendered an "Access Restricted" card AND an
 * unconditional <Navigate to="/" replace /> inside the same branch. React
 * Router processes the Navigate immediately, so the card never had a chance
 * to be seen by the user — it was dead code. We now genuinely show the
 * message with a manual way back, instead of silently bouncing the user
 * with no explanation.
 */
export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { user, loading, isAuthenticated } = useAuth();

  // Still loading auth state — show gentle spinner
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse text-sage flex flex-col items-center gap-3">
          <ShieldCheck className="w-8 h-8" />
          <span className="text-sm font-medium text-muted">Verifying access...</span>
        </div>
      </div>
    );
  }

  // Not authenticated → redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but wrong role → genuinely show the access-denied message
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="bg-card rounded-3xl p-8 shadow-sm border border-border-subtle text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-rose-soft/10 flex items-center justify-center text-rose-soft mx-auto mb-4">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h3 className="font-serif text-xl font-bold text-primary mb-2">Access Restricted</h3>
          <p className="text-sm text-muted mb-5">
            This section is available to <strong>{allowedRoles.join(' / ')}</strong> accounts only.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-sage hover:bg-[#4a6346] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all"
          >
            <Home className="w-4 h-4" /> Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
