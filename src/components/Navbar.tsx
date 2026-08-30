import React from 'react';
import { User, UserRole } from '../types';
import {
  GraduationCap,
  LogOut,
  User as UserIcon,
  BookOpen,
  LayoutDashboard,
  BarChart3,
  Presentation,
  Clock,
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  currentRole?: UserRole;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onLogout?: () => void;
  isTakingTest?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentRole,
  activeTab = 'tests',
  onTabChange,
  onLogout,
  isTakingTest = false,
}) => {
  // A user's role/access is always determined by the authenticated backend session -
  // there is no client-side role switching anywhere in this app.
  const effectiveRole = currentRole || currentUser?.role || 'STUDENT';

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => {
              if (!isTakingTest && onTabChange) {
                onTabChange('tests');
              }
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center shadow-inner shadow-white/20">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">EduStack</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                  Test Series
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium hidden sm:block">
                JEE Main CBT Examination Engine
              </span>
            </div>
          </div>

          {/* Navigation Links for Authenticated Users (when not taking test) */}
          {!isTakingTest && currentUser && onTabChange && (
            <nav className="hidden md:flex items-center gap-1.5">
              {effectiveRole === 'TEACHER' ? (
                <>
                  <button
                    onClick={() => onTabChange('tests')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'tests'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Manage Tests</span>
                  </button>
                  <button
                    onClick={() => onTabChange('results')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'results'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Student Results</span>
                  </button>
                  <button
                    onClick={() => onTabChange('whiteboard')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'whiteboard'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Presentation className="w-4 h-4 text-amber-400" />
                    <span>Whiteboard</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onTabChange('tests')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'tests'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Available Mock Tests</span>
                  </button>
                  <button
                    onClick={() => onTabChange('mock_analysis')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'mock_analysis'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                    <span>Mock Test Analysis</span>
                  </button>
                  <button
                    onClick={() => onTabChange('todo_planner')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'todo_planner'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Todo & Time Planner</span>
                  </button>
                  <button
                    onClick={() => onTabChange('whiteboard')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'whiteboard'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Presentation className="w-4 h-4 text-cyan-400" />
                    <span>Whiteboard</span>
                  </button>
                </>
              )}
            </nav>
          )}

          {/* User Controls */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-white leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {currentUser.role === 'TEACHER' ? 'Faculty' : currentUser.role === 'ADMIN' ? 'Admin' : 'JEE Aspirant'}
                  </span>
                </div>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    currentUser.role === 'TEACHER'
                      ? 'bg-purple-600 text-white'
                      : currentUser.role === 'ADMIN'
                      ? 'bg-amber-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                {!isTakingTest && onLogout && (
                  <button
                    onClick={onLogout}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};
