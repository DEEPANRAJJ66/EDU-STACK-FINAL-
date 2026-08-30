import React, { useEffect, useState, useCallback } from 'react';
import {
  Crown,
  LayoutDashboard,
  GraduationCap,
  Users as UsersIcon,
  FileText,
  LogOut,
  Loader2,
  CheckCircle2,
  XCircle,
  Ban,
  RotateCcw,
  Search,
} from 'lucide-react';
import { User, Test } from '../types';
import { api } from '../services/api';

interface AdminDashboardProps {
  currentUser: User;
  onLogout: () => void;
}

type AdminTab = 'DASHBOARD' | 'TEACHERS' | 'STUDENTS' | 'TESTS';

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-900/50 text-amber-300 border border-amber-700/40',
  APPROVED: 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/40',
  ACTIVE: 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/40',
  REJECTED: 'bg-rose-900/50 text-rose-300 border border-rose-700/40',
  SUSPENDED: 'bg-orange-900/50 text-orange-300 border border-orange-700/40',
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wide ${STATUS_BADGE[status] || 'bg-slate-800 text-slate-300'}`}>
    {status}
  </span>
);

function ConfirmButton({
  label,
  icon,
  className,
  confirmMessage,
  onConfirm,
}: {
  label: string;
  icon: React.ReactNode;
  className: string;
  confirmMessage: string;
  onConfirm: () => void;
}) {
  return (
    <button
      onClick={() => {
        if (window.confirm(confirmMessage)) onConfirm();
      }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${className}`}
    >
      {icon}
      {label}
    </button>
  );
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onLogout }) => {
  const [tab, setTab] = useState<AdminTab>('DASHBOARD');
  const [overview, setOverview] = useState<Record<string, number> | null>(null);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [teacherFilter, setTeacherFilter] = useState<string>('ALL');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, t, s, ts] = await Promise.all([
        api.admin.getOverview(),
        api.admin.getTeachers(),
        api.admin.getStudents(),
        api.admin.getTests(),
      ]);
      setOverview(ov);
      setTeachers(t.teachers);
      setStudents(s.students);
      setTests(ts.tests);
    } catch (e) {
      console.error('Failed to load admin data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const pendingCount = teachers.filter(t => t.status === 'PENDING').length;

  const filteredTeachers = teachers
    .filter(t => teacherFilter === 'ALL' || t.status === teacherFilter)
    .filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase()));

  const filteredStudents = students.filter(
    s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())
  );

  const runTeacherAction = async (action: 'approve' | 'reject' | 'suspend' | 'reactivate', id: string) => {
    const fn =
      action === 'approve' ? api.admin.approveTeacher :
      action === 'reject' ? api.admin.rejectTeacher :
      action === 'suspend' ? api.admin.suspendTeacher :
      api.admin.reactivateTeacher;
    const res = await fn(id);
    setTeachers(prev => prev.map(t => (t.id === id ? res.user : t)));
    setOverview(await api.admin.getOverview());
  };

  const runStudentAction = async (action: 'suspend' | 'reactivate', id: string) => {
    const fn = action === 'suspend' ? api.admin.suspendStudent : api.admin.reactivateStudent;
    const res = await fn(id);
    setStudents(prev => prev.map(s => (s.id === id ? res.user : s)));
    setOverview(await api.admin.getOverview());
  };

  const runTestAction = async (action: 'publish' | 'unpublish' | 'delete', id: string) => {
    if (action === 'delete') {
      await api.admin.deleteTest(id);
      setTests(prev => prev.filter(t => t.id !== id));
      return;
    }
    const fn = action === 'publish' ? api.admin.publishTest : api.admin.unpublishTest;
    const res = await fn(id);
    setTests(prev => prev.map(t => (t.id === id ? res.test : t)));
  };

  const navItems: { key: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'DASHBOARD', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'TEACHERS', label: 'Teachers', icon: <GraduationCap className="w-4 h-4" />, badge: pendingCount },
    { key: 'STUDENTS', label: 'Students', icon: <UsersIcon className="w-4 h-4" /> },
    { key: 'TESTS', label: 'Tests', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white text-sm tracking-tight">EduStack Admin</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
                tab === item.key ? 'bg-amber-600/90 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center gap-2.5">
                {item.icon}
                {item.label}
              </span>
              {!!item.badge && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <div className="px-3 py-2 mb-1">
            <div className="text-xs font-semibold text-white truncate">{currentUser.name}</div>
            <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading admin data...
            </div>
          ) : (
            <>
              {tab === 'DASHBOARD' && overview && (
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1">Dashboard Overview</h1>
                  <p className="text-sm text-slate-500 mb-6">Platform-level snapshot of EduStack.</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                      { label: 'Total Students', value: overview.totalStudents },
                      { label: 'Active Students', value: overview.activeStudents },
                      { label: 'Total Teachers', value: overview.totalTeachers },
                      { label: 'Active Teachers', value: overview.activeTeachers },
                      { label: 'Pending Approvals', value: overview.pendingTeachers, highlight: true },
                      { label: 'Suspended Teachers', value: overview.suspendedTeachers },
                      { label: 'Suspended Students', value: overview.suspendedStudents },
                      { label: 'Total Tests', value: overview.totalTests },
                    ].map(card => (
                      <div
                        key={card.label}
                        className={`rounded-2xl border p-4 ${
                          card.highlight ? 'border-amber-600/50 bg-amber-500/10' : 'border-slate-800 bg-slate-900'
                        }`}
                      >
                        <div className="text-2xl font-bold text-white">{card.value}</div>
                        <div className="text-xs text-slate-400 mt-1">{card.label}</div>
                      </div>
                    ))}
                  </div>

                  {pendingCount > 0 && (
                    <div className="rounded-2xl border border-amber-600/40 bg-amber-500/10 p-5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-amber-300">
                          {pendingCount} Teacher Approval Request{pendingCount > 1 ? 's' : ''}
                        </div>
                        <div className="text-xs text-amber-400/80 mt-0.5">Review pending teacher registrations.</div>
                      </div>
                      <button
                        onClick={() => {
                          setTab('TEACHERS');
                          setTeacherFilter('PENDING');
                        }}
                        className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition cursor-pointer"
                      >
                        Review Requests
                      </button>
                    </div>
                  )}
                </div>
              )}

              {tab === 'TEACHERS' && (
                <div>
                  <h1 className="text-2xl font-bold text-white mb-4">Teacher Management</h1>
                  <div className="flex flex-wrap items-center gap-2 mb-5">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search teachers..."
                        className="pl-8 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].map(s => (
                      <button
                        key={s}
                        onClick={() => setTeacherFilter(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          teacherFilter === s ? 'bg-amber-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-slate-800 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold">Name</th>
                          <th className="text-left px-4 py-3 font-semibold">Email</th>
                          <th className="text-left px-4 py-3 font-semibold">Status</th>
                          <th className="text-right px-4 py-3 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {filteredTeachers.map(t => (
                          <tr key={t.id} className="bg-slate-950 hover:bg-slate-900/60 transition">
                            <td className="px-4 py-3 text-white font-medium">{t.name}</td>
                            <td className="px-4 py-3 text-slate-400">{t.email}</td>
                            <td className="px-4 py-3">
                              <StatusBadge status={t.status} />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {t.status === 'PENDING' && (
                                  <>
                                    <ConfirmButton
                                      label="Approve"
                                      icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                                      className="bg-emerald-600/90 hover:bg-emerald-500 text-white"
                                      confirmMessage={`Approve ${t.name} as a teacher?`}
                                      onConfirm={() => runTeacherAction('approve', t.id)}
                                    />
                                    <ConfirmButton
                                      label="Reject"
                                      icon={<XCircle className="w-3.5 h-3.5" />}
                                      className="bg-rose-600/90 hover:bg-rose-500 text-white"
                                      confirmMessage={`Reject ${t.name}'s teacher registration?`}
                                      onConfirm={() => runTeacherAction('reject', t.id)}
                                    />
                                  </>
                                )}
                                {t.status === 'APPROVED' && (
                                  <ConfirmButton
                                    label="Suspend"
                                    icon={<Ban className="w-3.5 h-3.5" />}
                                    className="bg-orange-600/90 hover:bg-orange-500 text-white"
                                    confirmMessage={`Suspend ${t.name}'s teacher access?`}
                                    onConfirm={() => runTeacherAction('suspend', t.id)}
                                  />
                                )}
                                {(t.status === 'SUSPENDED' || t.status === 'REJECTED') && (
                                  <ConfirmButton
                                    label="Reactivate"
                                    icon={<RotateCcw className="w-3.5 h-3.5" />}
                                    className="bg-indigo-600/90 hover:bg-indigo-500 text-white"
                                    confirmMessage={`Reactivate ${t.name} as an approved teacher?`}
                                    onConfirm={() => runTeacherAction('reactivate', t.id)}
                                  />
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredTeachers.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-slate-500 text-sm">
                              No teachers found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === 'STUDENTS' && (
                <div>
                  <h1 className="text-2xl font-bold text-white mb-4">Student Management</h1>
                  <div className="relative mb-5 w-64">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search students..."
                      className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-800 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold">Name</th>
                          <th className="text-left px-4 py-3 font-semibold">Email</th>
                          <th className="text-left px-4 py-3 font-semibold">Status</th>
                          <th className="text-right px-4 py-3 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {filteredStudents.map(s => (
                          <tr key={s.id} className="bg-slate-950 hover:bg-slate-900/60 transition">
                            <td className="px-4 py-3 text-white font-medium">{s.name}</td>
                            <td className="px-4 py-3 text-slate-400">{s.email}</td>
                            <td className="px-4 py-3">
                              <StatusBadge status={s.status} />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1.5">
                                {s.status === 'ACTIVE' ? (
                                  <ConfirmButton
                                    label="Suspend"
                                    icon={<Ban className="w-3.5 h-3.5" />}
                                    className="bg-orange-600/90 hover:bg-orange-500 text-white"
                                    confirmMessage={`Suspend ${s.name}'s student access?`}
                                    onConfirm={() => runStudentAction('suspend', s.id)}
                                  />
                                ) : (
                                  <ConfirmButton
                                    label="Reactivate"
                                    icon={<RotateCcw className="w-3.5 h-3.5" />}
                                    className="bg-indigo-600/90 hover:bg-indigo-500 text-white"
                                    confirmMessage={`Reactivate ${s.name}'s student access?`}
                                    onConfirm={() => runStudentAction('reactivate', s.id)}
                                  />
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredStudents.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-slate-500 text-sm">
                              No students found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === 'TESTS' && (
                <div>
                  <h1 className="text-2xl font-bold text-white mb-4">Test Management</h1>
                  <div className="rounded-2xl border border-slate-800 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold">Title</th>
                          <th className="text-left px-4 py-3 font-semibold">Teacher</th>
                          <th className="text-left px-4 py-3 font-semibold">Status</th>
                          <th className="text-right px-4 py-3 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {tests.map(t => (
                          <tr key={t.id} className="bg-slate-950 hover:bg-slate-900/60 transition">
                            <td className="px-4 py-3 text-white font-medium">{t.title}</td>
                            <td className="px-4 py-3 text-slate-400">{t.teacherName}</td>
                            <td className="px-4 py-3">
                              <StatusBadge status={t.status} />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1.5">
                                {t.status !== 'PUBLISHED' ? (
                                  <ConfirmButton
                                    label="Publish"
                                    icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                                    className="bg-emerald-600/90 hover:bg-emerald-500 text-white"
                                    confirmMessage={`Publish "${t.title}"?`}
                                    onConfirm={() => runTestAction('publish', t.id)}
                                  />
                                ) : (
                                  <ConfirmButton
                                    label="Unpublish"
                                    icon={<Ban className="w-3.5 h-3.5" />}
                                    className="bg-orange-600/90 hover:bg-orange-500 text-white"
                                    confirmMessage={`Unpublish "${t.title}"?`}
                                    onConfirm={() => runTestAction('unpublish', t.id)}
                                  />
                                )}
                                <ConfirmButton
                                  label="Remove"
                                  icon={<XCircle className="w-3.5 h-3.5" />}
                                  className="bg-rose-600/90 hover:bg-rose-500 text-white"
                                  confirmMessage={`Permanently remove "${t.title}"? This cannot be undone.`}
                                  onConfirm={() => runTestAction('delete', t.id)}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                        {tests.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-slate-500 text-sm">
                              No tests found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};
