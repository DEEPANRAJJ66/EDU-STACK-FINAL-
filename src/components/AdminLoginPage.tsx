import React, { useState } from 'react';
import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { authService } from '../services/authService';
import { api } from '../services/api';

interface AdminLoginPageProps {
  onAuthenticated: () => void;
}

function friendlyFirebaseError(err: any): string {
  const code = err?.code || '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'Invalid admin email or password.';
  }
  if (code.includes('too-many-requests')) return 'Too many attempts. Please try again later.';
  return err?.message || 'Something went wrong. Please try again.';
}

// This route intentionally has NO registration/signup form and is never linked from the
// normal Student/Teacher login page. Admin accounts are created manually via the
// Firebase Console and granted the "admin" custom claim out-of-band (see
// backend/scripts/setAdminClaim.ts) - never through this UI.
export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onAuthenticated }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authService.login(email, password);
      // Server-side authorization (role === 'ADMIN' && status === 'ACTIVE') is verified
      // by the backend on every subsequent request - this page does not decide access.
      const { user } = await api.auth.me();
      if (user.role !== 'ADMIN') {
        await authService.logout();
        throw new Error('This account is not authorized for Admin access.');
      }
      onAuthenticated();
    } catch (err: any) {
      setError(friendlyFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg mb-3">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">EduStack Admin</h1>
          <p className="text-sm text-slate-400 mt-1">Restricted access</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-6 sm:p-8">
          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Admin Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="admin@edustack.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign In to Admin Console
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
