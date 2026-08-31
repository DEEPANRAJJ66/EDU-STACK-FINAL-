import React, { useState } from 'react';
import { GraduationCap, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { authService } from '../services/authService';

interface CompleteProfilePageProps {
  email: string;
  onDone: () => void;
}

type RoleTab = 'STUDENT' | 'TEACHER';

// Shown when someone is validly signed in with Firebase (their email/password is correct),
// but there's no EduStack profile for them on this server yet - most commonly because their
// account predates a database change and their old profile no longer exists. Instead of
// silently bouncing them back to a login screen with no explanation (which looks like a
// broken login and previously led people to delete/recreate their Firebase account), this
// screen explains what's going on and lets them finish registering in one click, using the
// Firebase session they already have - no new account needed.
export const CompleteProfilePage: React.FC<CompleteProfilePageProps> = ({ email, onDone }) => {
  const [roleTab, setRoleTab] = useState<RoleTab>('STUDENT');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    setLoading(true);
    try {
      await api.auth.registerProfile(name, roleTab);
      onDone();
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseDifferentAccount = async () => {
    await authService.logout();
    onDone();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center shadow-lg mb-3">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Finish setting up your account</h1>
          <p className="text-slate-400 text-sm mt-1 text-center">
            You're signed in as <span className="text-slate-200">{email}</span>, but we don't have a
            profile for you yet. This can happen if your account is from before a recent update.
            Just fill this in once to continue.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          {error && (
            <div className="mb-4 flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex rounded-lg overflow-hidden border border-slate-700 mb-4">
            {(['STUDENT', 'TEACHER'] as RoleTab[]).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setRoleTab(tab)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  roleTab === tab ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {tab === 'STUDENT' ? 'Student' : 'Teacher'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Your name"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Continue as {roleTab === 'STUDENT' ? 'Student' : 'Teacher'}
            </button>
          </form>

          <button
            type="button"
            onClick={handleUseDifferentAccount}
            className="w-full text-center text-sm text-slate-500 hover:text-slate-300 mt-4"
          >
            Not you? Sign out and use a different account
          </button>
        </div>
      </div>
    </div>
  );
};