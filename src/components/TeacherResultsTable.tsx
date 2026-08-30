import React, { useState, useEffect } from 'react';
import { TestAttempt, Test } from '../types';
import { api } from '../services/api';
import { ResultAnalytics } from './ResultAnalytics';
import {
  Search,
  Filter,
  ArrowUpDown,
  Trophy,
  Users,
  Eye,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react';

interface TeacherResultsTableProps {
  tests: Test[];
  onSelectTest?: (testId: string) => void;
}

export const TeacherResultsTable: React.FC<TeacherResultsTableProps> = ({ tests = [] }) => {
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTestFilter, setSelectedTestFilter] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'score_desc' | 'score_asc'>('date');
  const [activeAttemptForReview, setActiveAttemptForReview] = useState<{
    attempt: TestAttempt;
    test: Test;
    questions: any[];
  } | null>(null);

  const fetchAttempts = async () => {
    setLoading(true);
    try {
      const res = await api.attempts.getTeacherResults({
        testId: selectedTestFilter || undefined,
        search: searchTerm || undefined,
        sortBy,
      });
      setAttempts(res.attempts || []);
    } catch (err) {
      console.error('Failed to fetch teacher attempts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttempts();
  }, [selectedTestFilter, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAttempts();
  };

  const handleViewAttempt = async (attemptId: string) => {
    try {
      const res = await api.attempts.getResult(attemptId);
      setActiveAttemptForReview(res);
    } catch (err) {
      alert('Could not load attempt details.');
    }
  };

  if (activeAttemptForReview) {
    return (
      <ResultAnalytics
        attempt={activeAttemptForReview.attempt}
        test={activeAttemptForReview.test}
        questions={activeAttemptForReview.questions}
        onBackToDashboard={() => setActiveAttemptForReview(null)}
        isStudent={false}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Student Attempts & Evaluation</h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time performance logs, marks calculation, and individual attempt breakdowns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
            Total Submissions: {attempts.length}
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by student name, email, or test title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
          >
            Search
          </button>
        </form>

        {/* Filter by Test */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedTestFilter}
            onChange={(e) => setSelectedTestFilter(e.target.value)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700"
          >
            <option value="">All Tests</option>
            {(tests || []).map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>

        {/* Sort by Score / Date */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700"
          >
            <option value="date">Sort: Recent Attempts</option>
            <option value="score_desc">Sort: Highest Score</option>
            <option value="score_asc">Sort: Lowest Score</option>
          </select>
        </div>
      </div>

      {/* Attempts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading student attempts...</div>
        ) : attempts.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">No attempts found</h4>
            <p className="text-xs text-slate-500">No students have submitted attempts matching your filters yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Test Series</th>
                  <th className="px-4 py-3">Score / Max</th>
                  <th className="px-4 py-3">Accuracy</th>
                  <th className="px-4 py-3">Correct / Wrong</th>
                  <th className="px-4 py-3">Time Taken</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {attempts.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">{att.studentName || 'Student'}</div>
                      <div className="text-[11px] text-slate-400">{att.studentEmail}</div>
                    </td>
                    <td className="px-4 py-3.5 max-w-xs truncate font-semibold text-slate-800">
                      {att.testTitle || 'JEE Mock Test'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-indigo-700 text-sm">{att.totalScore}</span>
                      <span className="text-slate-400 text-xs"> / {att.maxScore}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`font-bold px-2 py-0.5 rounded ${
                          att.accuracy >= 75
                            ? 'bg-emerald-50 text-emerald-700'
                            : att.accuracy >= 50
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {att.accuracy}%
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-emerald-600 font-bold">+{att.totalCorrect}</span>
                      <span className="text-slate-300 mx-1">/</span>
                      <span className="text-rose-600 font-bold">-{att.totalIncorrect}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {Math.floor(att.timeTakenSeconds / 60)}m {att.timeTakenSeconds % 60}s
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                      {new Date(att.submittedAt || att.startTime).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => handleViewAttempt(att.id)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Breakdown</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
