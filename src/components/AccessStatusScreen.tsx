import React from 'react';
import { Clock, XCircle, Ban, LogOut } from 'lucide-react';
import { User } from '../types';

interface AccessStatusScreenProps {
  user: User;
  onLogout: () => void;
}

const CONFIG: Record<string, { icon: React.ReactNode; title: string; message: string; color: string }> = {
  PENDING: {
    icon: <Clock className="w-8 h-8 text-amber-400" />,
    title: 'Approval Pending',
    message:
      "Your teacher account is awaiting Admin approval. You'll get access to the Teacher Dashboard as soon as an Admin reviews and approves your request.",
    color: 'amber',
  },
  REJECTED: {
    icon: <XCircle className="w-8 h-8 text-rose-400" />,
    title: 'Registration Rejected',
    message: 'Your teacher registration was not approved. Please contact the EduStack Admin team for more information.',
    color: 'rose',
  },
  SUSPENDED: {
    icon: <Ban className="w-8 h-8 text-orange-400" />,
    title: 'Account Suspended',
    message: 'Your account access has been suspended by an Admin. Please contact the EduStack Admin team if you believe this is a mistake.',
    color: 'orange',
  },
};

export const AccessStatusScreen: React.FC<AccessStatusScreenProps> = ({ user, onLogout }) => {
  const cfg = CONFIG[user.status] || CONFIG.SUSPENDED;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-5">
          {cfg.icon}
        </div>
        <h1 className="text-xl font-bold text-white mb-2">{cfg.title}</h1>
        <p className="text-sm text-slate-400 leading-relaxed mb-6">{cfg.message}</p>
        <div className="text-xs text-slate-500 mb-6">
          Signed in as <span className="text-slate-300 font-medium">{user.email}</span>
        </div>
        <button
          onClick={onLogout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
};
