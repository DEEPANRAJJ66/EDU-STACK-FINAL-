import React, { useState } from 'react';
import { GraduationCap, Loader2, AlertCircle } from 'lucide-react';
import { authService } from '../services/authService';
import { api } from '../services/api';

interface LoginPageProps {
  onAuthenticated: () => void;
}

type Mode = 'LOGIN' | 'REGISTER';
type RoleTab = 'STUDENT' | 'TEACHER';

function friendlyFirebaseError(err: any): string {
  const code = err?.code || '';
  if (code.includes('email-already-in-use')) return 'An account with this email already exists.';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'Invalid email or password.';
  }
  if (code.includes('weak-password')) return 'Password should be at least 6 characters.';
  if (code.includes('invalid-email')) return 'Please enter a valid email address.';
  if (code.includes('too-many-requests')) return 'Too many attempts. Please try again later.';
  return err?.message || 'Something went wrong. Please try again.';
}

export const LoginPage: React.FC<LoginPageProps> = ({ onAuthenticated }) => {
  const [roleTab, setRoleTab] = useState<RoleTab>('STUDENT');
  const [mode, setMode] = useState<Mode>('LOGIN');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teacherPendingNotice, setTeacherPendingNotice] = useState(false);

  const resetFeedback = () => {
    setError(null);
    setTeacherPendingNotice(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();
    setLoading(true);
    try {
      if (mode === 'LOGIN') {
        await authService.login(email, password);
      } else {
        if (!name.trim()) {
          throw new Error('Please enter your full name.');
        }
        await authService.registerStudentOrTeacher(name, email, password);
        await api.auth.registerProfile(name, roleTab);
        if (roleTab === 'TEACHER') {
          setTeacherPendingNotice(true);
        }
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
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center shadow-lg mb-3">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">EduStack</h1>
          <p className="text-sm text-slate-400 mt-1">JEE Main CBT Examination Engine</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="flex items-center justify-center gap-6 mb-6 text-sm font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                resetFeedback();
              }}
              className={`pb-1.5 border-b-2 transition cursor-pointer ${
                mode === 'LOGIN' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('REGISTER');
                resetFeedback();
              }}
              className={`pb-1.5 border-b-2 transition cursor-pointer ${
                mode === 'REGISTER' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              Register
            </button>
          </div>

          {/* Role tabs only apply to Registration - your role is fixed at sign-up and
              can't be switched, so Login doesn't need (or show) this choice at all. */}
          {mode === 'REGISTER' && (
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-800/70 rounded-xl mb-6">
              {(['STUDENT', 'TEACHER'] as RoleTab[]).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setRoleTab(tab);
                    resetFeedback();
                  }}
                  className={`py-2 rounded-lg text-sm font-bold transition cursor-pointer ${
                    roleTab === tab
                      ? tab === 'STUDENT'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab === 'STUDENT' ? 'Student' : 'Teacher'}
                </button>
              ))}
            </div>
          )}

          {teacherPendingNotice && (
            <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              Your teacher account was created and is now <strong>pending Admin approval</strong>. You'll be able to
              access the Teacher Dashboard once an Admin approves your request.
            </div>
          )}

          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'REGISTER' && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Your full name"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 rounded-lg text-sm font-bold text-white shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 ${
                mode === 'REGISTER' && roleTab === 'TEACHER' ? 'bg-purple-600 hover:bg-purple-500' : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'LOGIN' ? 'Log In' : `Register as ${roleTab === 'STUDENT' ? 'Student' : 'Teacher'}`}
            </button>
          </form>

          {mode === 'REGISTER' && roleTab === 'TEACHER' && (
            <p className="mt-4 text-[11px] text-slate-500 text-center leading-relaxed">
              New teacher accounts require Admin approval before the Teacher Dashboard becomes accessible.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
