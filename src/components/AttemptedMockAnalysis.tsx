import React, { useState } from 'react';
import { Test, TestAttempt } from '../types';
import {
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  TrendingUp,
  Target,
  Search,
  Filter,
  Eye,
  RotateCcw,
  Sparkles,
  BookOpen,
  ArrowRight,
  ChevronRight,
  Calendar,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';

interface AttemptedMockAnalysisProps {
  tests: Test[];
  attempts: TestAttempt[];
  onViewResult: (attemptId: string) => void;
  onOpenErrorNotes?: (attemptId: string) => void;
  onRetakeTest: (testId: string) => void;
  onGoToAvailableTests: () => void;
  studentName: string;
}

export const AttemptedMockAnalysis: React.FC<AttemptedMockAnalysisProps> = ({
  tests = [],
  attempts = [],
  onViewResult,
  onOpenErrorNotes,
  onRetakeTest,
  onGoToAvailableTests,
  studentName,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'RECENT' | 'SCORE_HIGH' | 'SCORE_LOW' | 'ACCURACY'>('RECENT');

  // Filter only submitted attempts
  const completedAttempts = (attempts || []).filter(a => a.status === 'SUBMITTED');

  // Map tests for quick lookup
  const testMap = new Map<string, Test>();
  (tests || []).forEach(t => testMap.set(t.id, t));

  // Compute Aggregate Analytics
  const totalAttempts = completedAttempts.length;
  const avgAccuracy =
    totalAttempts > 0
      ? Math.round(completedAttempts.reduce((sum, a) => sum + (a.accuracy || 0), 0) / totalAttempts)
      : 0;
  const highestScore =
    totalAttempts > 0
      ? Math.max(...completedAttempts.map(a => a.totalScore || 0))
      : 0;
  const totalTimeSpentSeconds = completedAttempts.reduce((sum, a) => sum + (a.timeTakenSeconds || 0), 0);
  const totalHoursSpent = (totalTimeSpentSeconds / 3600).toFixed(1);

  // Subject aggregate stats
  const subjectAggregates: Record<string, { totalScore: number; maxScore: number; attempts: number }> = {
    PHYSICS: { totalScore: 0, maxScore: 0, attempts: 0 },
    CHEMISTRY: { totalScore: 0, maxScore: 0, attempts: 0 },
    MATHEMATICS: { totalScore: 0, maxScore: 0, attempts: 0 },
  };

  completedAttempts.forEach(att => {
    if (att.subjectStats) {
      Object.entries(att.subjectStats).forEach(([subKey, stat]: [string, any]) => {
        if (subjectAggregates[subKey] && stat && (stat.maxScore || 0) > 0) {
          subjectAggregates[subKey].totalScore += stat.score || 0;
          subjectAggregates[subKey].maxScore += stat.maxScore || 0;
          subjectAggregates[subKey].attempts += 1;
        }
      });
    }
  });

  // Filter and Sort Attempts
  const filteredAttempts = completedAttempts.filter(att => {
    const test = testMap.get(att.testId);
    const title = test?.title || att.testId;
    if (searchTerm && !title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (selectedSubjectFilter !== 'ALL') {
      if (test?.testType !== selectedSubjectFilter) {
        return false;
      }
    }
    return true;
  });

  filteredAttempts.sort((a, b) => {
    if (sortBy === 'SCORE_HIGH') return (b.totalScore || 0) - (a.totalScore || 0);
    if (sortBy === 'SCORE_LOW') return (a.totalScore || 0) - (b.totalScore || 0);
    if (sortBy === 'ACCURACY') return (b.accuracy || 0) - (a.accuracy || 0);
    // RECENT default
    const dateA = new Date(a.submittedAt || a.startTime || 0).getTime();
    const dateB = new Date(b.submittedAt || b.startTime || 0).getTime();
    return dateB - dateA;
  });

  const formatSeconds = (sec: number) => {
    const s = sec || 0;
    const m = Math.floor(s / 60);
    const remainingS = s % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      return `${h}h ${m % 60}m`;
    }
    return `${m}m ${remainingS}s`;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-200">
      {/* Section Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              Mock Test Analysis Section
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Attempted Tests & Performance Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Review detailed question-by-question solutions, examine time-per-question telemetry, track accuracy metrics, and revisit your error notes for all completed mock tests.
          </p>
        </div>

        {/* Aggregate KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10 shrink-0">
          <div className="text-center p-2">
            <div className="text-xl sm:text-2xl font-black text-white">{totalAttempts}</div>
            <div className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase">Tests Attempted</div>
          </div>
          <div className="text-center p-2 border-l border-white/10">
            <div className="text-xl sm:text-2xl font-black text-emerald-400">{avgAccuracy}%</div>
            <div className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase">Avg Accuracy</div>
          </div>
          <div className="text-center p-2 border-t sm:border-t-0 sm:border-l border-white/10">
            <div className="text-xl sm:text-2xl font-black text-amber-400">{highestScore}</div>
            <div className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase">Top Score</div>
          </div>
          <div className="text-center p-2 border-t sm:border-t-0 sm:border-l border-white/10">
            <div className="text-xl sm:text-2xl font-black text-indigo-300">{totalHoursSpent}h</div>
            <div className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase">Time Practiced</div>
          </div>
        </div>
      </div>

      {/* Subject-Wise Mastery Bars */}
      {totalAttempts > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Cumulative Subject Performance</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">Across all completed mock attempts</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { key: 'PHYSICS', label: 'Physics', color: 'bg-indigo-600', text: 'text-indigo-700', bg: 'bg-indigo-50' },
              { key: 'CHEMISTRY', label: 'Chemistry', color: 'bg-emerald-600', text: 'text-emerald-700', bg: 'bg-emerald-50' },
              { key: 'MATHEMATICS', label: 'Mathematics', color: 'bg-violet-600', text: 'text-violet-700', bg: 'bg-violet-50' },
            ].map(sub => {
              const data = subjectAggregates[sub.key];
              const percentage = data && data.maxScore > 0 ? Math.round((data.totalScore / data.maxScore) * 100) : 0;
              return (
                <div key={sub.key} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{sub.label}</span>
                    <span className={`font-black ${sub.text}`}>
                      {data ? data.totalScore : 0} / {data ? data.maxScore : 0} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${sub.color} transition-all duration-500 rounded-full`}
                      style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Attempted Tests Listing & Search / Filter Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              <span>Attempted Mock Test Scorecards ({filteredAttempts.length})</span>
            </h2>
            <p className="text-xs text-slate-500">
              Select any completed mock test below to inspect its detailed analytics, question solutions, and mistake logs.
            </p>
          </div>

          {/* Search and Sort controls */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search attempted tests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:border-indigo-500"
            >
              <option value="RECENT">Most Recent</option>
              <option value="SCORE_HIGH">Highest Score</option>
              <option value="SCORE_LOW">Lowest Score</option>
              <option value="ACCURACY">Highest Accuracy</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'ALL', label: 'All Attempted Tests' },
            { id: 'JEE_MAIN_FULL', label: 'Full Syllabus (PCM)' },
            { id: 'PHYSICS', label: 'Physics Tests' },
            { id: 'CHEMISTRY', label: 'Chemistry Tests' },
            { id: 'MATHEMATICS', label: 'Mathematics Tests' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedSubjectFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                selectedSubjectFilter === f.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Attempted Tests Cards Grid */}
        {completedAttempts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <BarChart3 className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-bold text-slate-800">No Mock Tests Attempted Yet</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                You haven't completed any mock tests yet. Take your first test from the Available Tests section to unlock in-depth analytics, speed analysis, and error revision notes.
              </p>
            </div>
            <button
              onClick={onGoToAvailableTests}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition"
            >
              <BookOpen className="w-4 h-4" />
              <span>Browse Available Mock Tests</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : filteredAttempts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2">
            <h3 className="text-sm font-bold text-slate-800">No matching attempted tests</h3>
            <p className="text-xs text-slate-500">
              No attempted tests matched your search and filter criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredAttempts.map((attempt) => {
              const test = testMap.get(attempt.testId);
              const testTitle = test?.title || `Mock Test (#${attempt.testId})`;
              const testType = test?.testType || 'JEE_MAIN_FULL';
              const durationMin = test?.durationMinutes || 180;
              const dateStr = attempt.submittedAt
                ? new Date(attempt.submittedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Completed';

              const score = attempt.totalScore || 0;
              const maxScore = attempt.maxScore || 300;
              const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
              const accuracy = attempt.accuracy || 0;

              return (
                <div
                  key={attempt.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    {/* Header line: Test type & Attempt Date */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200 uppercase tracking-wider text-[10px]">
                        {testType.replace(/_/g, ' ')}
                      </span>

                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        {dateStr}
                      </span>
                    </div>

                    {/* Test Title */}
                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition leading-snug">
                        {testTitle}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                        {test?.description || 'NTA JEE Main pattern test with full answer keys & solutions.'}
                      </p>
                    </div>

                    {/* Main Score & Accuracy Banner */}
                    <div className="grid grid-cols-3 gap-2 bg-gradient-to-br from-slate-50 to-indigo-50/40 p-3 rounded-xl border border-slate-200/80">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-500">Score</div>
                        <div className="text-lg font-black text-slate-900">
                          {score} <span className="text-xs font-semibold text-slate-500">/ {maxScore}</span>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-600">{percentage}%</span>
                      </div>

                      <div className="border-x border-slate-200 px-2">
                        <div className="text-[10px] uppercase font-bold text-slate-500">Accuracy</div>
                        <div className={`text-lg font-black ${
                          accuracy >= 70 ? 'text-emerald-600' : accuracy >= 40 ? 'text-amber-600' : 'text-rose-600'
                        }`}>
                          {accuracy}%
                        </div>
                        <span className="text-[10px] font-medium text-slate-500">Net Precision</span>
                      </div>

                      <div className="pl-1">
                        <div className="text-[10px] uppercase font-bold text-slate-500">Time Taken</div>
                        <div className="text-sm font-bold text-slate-800 mt-1">
                          {formatSeconds(attempt.timeTakenSeconds || 0)}
                        </div>
                        <span className="text-[10px] font-medium text-slate-500">of {durationMin}m</span>
                      </div>
                    </div>

                    {/* Question Outcome Breakdown Pills */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-900 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{attempt.totalCorrect || 0} Correct</span>
                      </div>

                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-50 border border-rose-100 text-rose-900 font-bold">
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{attempt.totalIncorrect || 0} Incorrect</span>
                      </div>

                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-bold">
                        <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>{attempt.totalUnanswered || 0} Left</span>
                      </div>
                    </div>

                    {/* Subject Breakdown Mini Pills */}
                    {attempt.subjectStats && (
                      <div className="pt-1 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                        {Object.entries(attempt.subjectStats).map(([subKey, stat]: [string, any]) => {
                          if (!stat || ((stat.maxScore || 0) <= 0 && (stat.totalQuestions || 0) <= 0)) return null;
                          return (
                            <span
                              key={subKey}
                              className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200 whitespace-nowrap"
                            >
                              <strong className="text-slate-900">{subKey.slice(0, 4)}:</strong> {stat.score || 0}/{stat.maxScore || 0} ({stat.accuracy || 0}%)
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => onViewResult(attempt.id)}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Mock Analysis</span>
                    </button>

                    {test && (
                      <button
                        onClick={() => onRetakeTest(test.id)}
                        className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition flex items-center gap-1"
                        title="Retake this mock test"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Retake</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
