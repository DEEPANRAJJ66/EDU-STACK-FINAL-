import React, { useEffect, useState } from 'react';
import { ImprovementComparisonData } from '../types';
import { api } from '../services/api';
import { MathRenderer } from '../utils/mathRenderer';
import confetti from 'canvas-confetti';
import {
  TrendingUp,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  FileText,
  AlertTriangle,
  Zap,
  Target,
  Sparkles,
  Layers,
} from 'lucide-react';

interface ImprovementComparisonProps {
  originalAttemptId: string;
  errorTestAttemptId?: string;
  onBackToAnalytics: () => void;
  onBackToDashboard: () => void;
  onPracticeRemaining: (remainingQuestionIds: string[]) => void;
  onOpenPDF?: () => void;
}

export const ImprovementComparison: React.FC<ImprovementComparisonProps> = ({
  originalAttemptId,
  errorTestAttemptId,
  onBackToAnalytics,
  onBackToDashboard,
  onPracticeRemaining,
  onOpenPDF,
}) => {
  const [data, setData] = useState<ImprovementComparisonData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchComparison() {
      try {
        setLoading(true);
        const res = await api.errorNotes.getImprovementComparison(
          originalAttemptId,
          errorTestAttemptId
        );
        if (res?.comparison) {
          setData(res.comparison);

          if (res.comparison.correctionPercentage >= 60) {
            try {
              confetti({
                particleCount: 90,
                spread: 70,
                origin: { y: 0.6 },
              });
            } catch (e) {
              // ignore
            }
          }
        }
      } catch (err: any) {
        console.error('Failed to load improvement comparison', err);
        setError(err?.message || 'Failed to calculate improvement data.');
      } finally {
        setLoading(false);
      }
    }

    fetchComparison();
  }, [originalAttemptId, errorTestAttemptId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-sm font-bold text-slate-700">Computing Improvement Analytics...</div>
          <div className="text-xs text-slate-400">Comparing original attempt with Error Correct Test</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-lg border border-slate-200">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-lg font-black text-slate-900">Improvement Analytics</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {error || 'No submitted Error Correct Test found for this session yet.'}
          </p>
          <button
            onClick={onBackToAnalytics}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
          >
            Back to Test Analysis
          </button>
        </div>
      </div>
    );
  }

  const isImproving = data.status === 'IMPROVING';
  const isNeedsPractice = data.status === 'NEEDS_PRACTICE';

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation Top Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToAnalytics}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-2xs transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Test Analysis</span>
          </button>

          <button
            onClick={onBackToDashboard}
            className="px-3.5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold shadow-xs transition"
          >
            Student Dashboard
          </button>
        </div>

        {/* Hero Improvement Status Banner */}
        <div
          className={`rounded-3xl p-6 sm:p-8 text-white shadow-xl border relative overflow-hidden ${
            isImproving
              ? 'bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 border-emerald-700/50'
              : isNeedsPractice
              ? 'bg-gradient-to-r from-amber-950 via-amber-900 to-slate-950 border-amber-700/50'
              : 'bg-gradient-to-r from-rose-950 via-rose-900 to-slate-950 border-rose-700/50'
          }`}
        >
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    isImproving
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : isNeedsPractice
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                  }`}
                >
                  {isImproving
                    ? '🟢 High Mastery — Improving'
                    : isNeedsPractice
                    ? '🟠 Moderate Mastery — Needs More Practice'
                    : '🔴 Low Mastery — Not Improving Yet'}
                </span>
                <span className="text-xs text-slate-300">• Error Correct Analysis</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {isImproving
                  ? 'Outstanding Progress! Most Mistakes Rectified.'
                  : isNeedsPractice
                  ? 'Good Progress! A Few Concepts Need Reinforcement.'
                  : 'Requires Further Conceptual Revision.'}
              </h1>

              <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed">
                Remedial comparison for <strong>{data.originalTestTitle}</strong>. You converted{' '}
                <strong className="text-emerald-300">{data.correctedCount}</strong> out of{' '}
                <strong>{data.originalErrorsCount}</strong> previous mistakes into correct solutions!
              </p>
            </div>

            {/* Big Accuracy Percentage Circular Ring / Badge */}
            <div className="flex flex-col items-center justify-center p-5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shrink-0 min-w-44 text-center">
              <div className="text-3xl sm:text-4xl font-black text-white">
                {data.correctionPercentage}%
              </div>
              <div className="text-xs font-bold text-slate-200 uppercase tracking-wider mt-1">
                Correction Rate
              </div>
              <div className="text-[11px] text-emerald-300 font-semibold mt-1">
                {data.correctedCount} / {data.originalErrorsCount} Corrected
              </div>
            </div>
          </div>
        </div>

        {/* 4 Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Original Errors
            </div>
            <div className="text-2xl font-black text-slate-900">{data.originalErrorsCount}</div>
            <div className="text-[10px] text-slate-500 font-medium">Questions reviewed</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs space-y-1 bg-emerald-50/30">
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              Corrected Now
            </div>
            <div className="text-2xl font-black text-emerald-900">+{data.correctedCount}</div>
            <div className="text-[10px] text-emerald-700 font-bold">Successfully solved</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs space-y-1 bg-rose-50/30">
            <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
              Remaining Errors
            </div>
            <div className="text-2xl font-black text-rose-900">{data.remainingCount}</div>
            <div className="text-[10px] text-rose-700 font-bold">Still need practice</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-xs space-y-1 bg-indigo-50/30">
            <div className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">
              Speed Impact
            </div>
            <div className="text-2xl font-black text-indigo-900">
              {data.timeImprovementSeconds > 0
                ? `-${data.timeImprovementSeconds}s`
                : `+${Math.abs(data.timeImprovementSeconds)}s`}
            </div>
            <div className="text-[10px] text-indigo-700 font-bold">
              {data.timeImprovementSeconds > 0 ? 'Faster per question' : 'Time per question'}
            </div>
          </div>
        </div>

        {/* Breakdown by Individual Error Classification Type */}
        {data.typeBreakdown && data.typeBreakdown.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Improvement by Error Classification
                </h3>
                <p className="text-xs text-slate-500">
                  Observe which error categories saw the highest correction rate.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {data.typeBreakdown.map(item => {
                return (
                  <div key={item.errorType} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{item.label}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-right">
                        <strong className="text-slate-900">{item.correctedCount}</strong> /{' '}
                        {item.originalCount} corrected{' '}
                        <span className="text-indigo-600 font-bold">({item.correctionRate}%)</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.correctionRate >= 70
                            ? 'bg-emerald-500'
                            : item.correctionRate >= 40
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${item.correctionRate}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detailed Question by Question Comparison List */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900">Question-by-Question Comparison</h3>
            <span className="text-xs text-slate-500 font-semibold">
              {data.questionsComparison?.length} Total Questions
            </span>
          </div>

          <div className="space-y-3">
            {data.questionsComparison?.map((q, idx) => {
              const wasFixed = q.wasCorrectInErrorTest;
              return (
                <div
                  key={q.questionId || idx}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    wasFixed
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-rose-50/40 border-rose-200'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-bold text-[10px]">
                        Q{idx + 1}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold text-[10px]">
                        {q.subject || 'GENERAL'}
                      </span>
                      {q.errorTypes?.map(t => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 text-[10px] font-bold shadow-2xs"
                        >
                          {t.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>

                    <div className="text-slate-800 line-clamp-2">
                      <MathRenderer content={q.questionText} />
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500">Original:</span>
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                        Wrong
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] text-slate-500">Error Test:</span>
                      <span
                        className={`px-1.5 py-0.5 rounded font-black text-[10px] ${
                          wasFixed
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-rose-600 text-white'
                        }`}
                      >
                        {wasFixed ? '✓ Correct' : '✗ Wrong'}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>
                        Time: {q.originalTimeSpent}s →{' '}
                        <strong className="text-slate-800">{q.errorTestTimeSpent}s</strong>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Continuous Learning Loop Action Bar */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-base font-black text-white flex items-center justify-center sm:justify-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              Continuous Learning Loop
            </h3>
            <p className="text-xs text-slate-300">
              {data.remainingCount > 0
                ? `You still have ${data.remainingCount} questions to conquer. Take another practice session!`
                : '100% of your targeted errors have been mastered! Fantastic achievement.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-center">
            {data.remainingCount > 0 && (
              <button
                onClick={() => onPracticeRemaining(data.remainingQuestionIds)}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Practice Remaining Errors ({data.remainingCount})</span>
              </button>
            )}

            {onOpenPDF && (
              <button
                onClick={onOpenPDF}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-300" />
                <span>View Error Notes PDF</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
