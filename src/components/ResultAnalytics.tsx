import React, { useState, useEffect, useMemo } from 'react';
import { TestAttempt, Test, Question, SubjectType, AttemptErrorNotes, ErrorNote } from '../types';
import { MathRenderer } from '../utils/mathRenderer';
import { SafeSvgRenderer } from './SafeSvgRenderer';
import { QuestionImage } from './QuestionImage';
import { api } from '../services/api';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Target,
  CheckCircle,
  XCircle,
  Clock,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Share2,
  Award,
  BarChart,
  Percent,
  Sparkles,
  RotateCcw,
  FileText,
  TrendingUp,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface ResultAnalyticsProps {
  attempt: TestAttempt;
  test: Test;
  questions: Question[];
  onBackToDashboard: () => void;
  onMakeErrorNotes?: (questionId?: string) => void;
  onViewImprovementComparison?: () => void;
  isStudent?: boolean;
}

export const ResultAnalytics: React.FC<ResultAnalyticsProps> = ({
  attempt,
  test,
  questions = [],
  onBackToDashboard,
  onMakeErrorNotes,
  onViewImprovementComparison,
  isStudent = true,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [expandedSolutions, setExpandedSolutions] = useState<Record<string, boolean>>({});
  const [errorNotes, setErrorNotes] = useState<AttemptErrorNotes | null>(null);
  const [loadingNotes, setLoadingNotes] = useState<boolean>(false);

  const safeQuestions = questions || [];

  // Fetch error notes for this attempt
  useEffect(() => {
    async function loadNotes() {
      try {
        setLoadingNotes(true);
        const res = await api.errorNotes.getByAttemptId(attempt.id);
        if (res?.errorNotes) {
          setErrorNotes(res.errorNotes);
        }
      } catch (err) {
        console.warn('Could not load error notes for attempt', err);
      } finally {
        setLoadingNotes(false);
      }
    }
    loadNotes();
  }, [attempt.id]);

  // Confetti celebration if score > 50%
  useEffect(() => {
    if (attempt?.totalScore > 0 && (attempt?.accuracy || 0) >= 60) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const formatSeconds = (sec: number) => {
    const sVal = sec || 0;
    const h = Math.floor(sVal / 3600);
    const m = Math.floor((sVal % 3600) / 60);
    const s = sVal % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const toggleSolution = (qId: string) => {
    setExpandedSolutions(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const toggleAllSolutions = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    safeQuestions.forEach(q => {
      next[q.id] = expand;
    });
    setExpandedSolutions(next);
  };

  // Mistake questions calculation
  const mistakeQuestions = useMemo(() => {
    return safeQuestions.filter(q => {
      const studentAns = attempt?.answers ? attempt.answers[q.id] : undefined;
      return !studentAns || !studentAns.isCorrect;
    });
  }, [safeQuestions, attempt]);

  const completedNotesCount = useMemo(() => {
    if (!errorNotes?.notes) return 0;
    return Object.values(errorNotes.notes).filter(
      (n: ErrorNote) =>
        n.thisIsFine ||
        (n.selectedErrorTypes && n.selectedErrorTypes.length > 0) ||
        Boolean(n.whatIMessed?.trim()) ||
        Boolean(n.whatILearned?.trim())
    ).length;
  }, [errorNotes]);

  // Overall time statistics
  const timeMetrics = useMemo(() => {
    let totalTime = 0;
    let correctTime = 0;
    let correctCount = 0;
    let incorrectTime = 0;
    let incorrectCount = 0;
    let overTimeCount = 0;

    safeQuestions.forEach(q => {
      const ans = attempt?.answers?.[q.id];
      const timeSpent = ans?.timeSpentSeconds || 0;
      totalTime += timeSpent;

      const recTime = q.subject === 'CHEMISTRY' ? 90 : q.subject === 'PHYSICS' ? 140 : 160;
      if (timeSpent > recTime + 30) {
        overTimeCount++;
      }

      if (ans?.isCorrect) {
        correctTime += timeSpent;
        correctCount++;
      } else if (ans && ans.selectedOptionId) {
        incorrectTime += timeSpent;
        incorrectCount++;
      }
    });

    const avgTimePerQuestion = safeQuestions.length > 0 ? Math.round(totalTime / safeQuestions.length) : 0;
    const avgCorrectTime = correctCount > 0 ? Math.round(correctTime / correctCount) : 0;
    const avgIncorrectTime = incorrectCount > 0 ? Math.round(incorrectTime / incorrectCount) : 0;

    return {
      avgTimePerQuestion,
      avgCorrectTime,
      avgIncorrectTime,
      overTimeCount,
    };
  }, [safeQuestions, attempt]);

  // Filter questions
  const filteredQuestions = safeQuestions.filter(q => {
    if (selectedSubject !== 'ALL' && q.subject !== selectedSubject) return false;

    const studentAns = attempt?.answers ? attempt.answers[q.id] : undefined;
    const isAnswered = studentAns && Boolean(studentAns.selectedOptionId);
    const isCorrect = studentAns?.isCorrect;

    if (statusFilter === 'CORRECT') return isCorrect;
    if (statusFilter === 'INCORRECT') return isAnswered && !isCorrect;
    if (statusFilter === 'UNANSWERED') return !isAnswered;

    return true;
  });

  const subjectStats = attempt.subjectStats;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Breadcrumb & Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={onBackToDashboard}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-2xs transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center gap-3">
          {onViewImprovementComparison && (
            <button
              onClick={onViewImprovementComparison}
              className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition flex items-center gap-1.5"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Improvement Analytics</span>
            </button>
          )}

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>Submitted on: {new Date(attempt.submittedAt || attempt.startTime).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* SMART ERROR NOTES & ERROR CORRECT TEST FEATURE BANNER */}
      {isStudent && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-indigo-700/50 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-black uppercase tracking-wider border border-amber-400/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                Continuous Learning Loop
              </span>
              <span className="text-xs text-indigo-200">
                {mistakeQuestions.length} Questions with Mistakes
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Smart Error Notes + Error Correct Test
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Transform every incorrect and unattempted question into a strength. Classify error types (Knowledge, Execution, Strategy), take personal revision notes, and take a personalized remedial CBT test.
            </p>

            {completedNotesCount > 0 && (
              <div className="flex items-center gap-2 pt-1 text-xs text-emerald-300 font-bold">
                <CheckCircle className="w-4 h-4" />
                <span>
                  Notes Draft Active: {completedNotesCount} of {mistakeQuestions.length} questions completed
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch md:items-center gap-3 shrink-0">
            {onMakeErrorNotes && (
              <button
                onClick={() => onMakeErrorNotes()}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs sm:text-sm shadow-lg hover:shadow-indigo-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>
                  {completedNotesCount > 0
                    ? `Continue Error Notes (${completedNotesCount}/${mistakeQuestions.length})`
                    : `Make Error Notes (${mistakeQuestions.length} Qs)`}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hero Scorecard Banner */}
      <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
              Examination Performance Scorecard
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              {test.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              Candidate: <strong>{attempt.studentName || 'JEE Aspirant'}</strong>
            </p>
          </div>

          {/* Main Score Pill */}
          <div className="flex items-center gap-4 bg-slate-50 px-6 py-4 rounded-2xl border border-slate-200 self-start md:self-auto shadow-2xs">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <Trophy className="w-7 h-7" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Score</div>
              <div className="text-3xl font-black text-slate-900">
                {attempt.totalScore}{' '}
                <span className="text-base font-normal text-slate-400">/ {attempt.maxScore}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Metric Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-slate-100">
          <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-200">
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold mb-1">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Correct Answers</span>
            </div>
            <div className="text-2xl font-black text-emerald-950">{attempt.totalCorrect}</div>
            <div className="text-[11px] text-emerald-700">+{attempt.totalCorrect * (test.marksPerQuestion || 4)} marks</div>
          </div>

          <div className="bg-rose-50/50 rounded-2xl p-4 border border-rose-200">
            <div className="flex items-center gap-2 text-rose-800 text-xs font-bold mb-1">
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Incorrect Answers</span>
            </div>
            <div className="text-2xl font-black text-rose-950">{attempt.totalIncorrect}</div>
            <div className="text-[11px] text-rose-700">-{attempt.totalIncorrect * (test.negativeMarks || 1)} negative marks</div>
          </div>

          <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-200">
            <div className="flex items-center gap-2 text-amber-800 text-xs font-bold mb-1">
              <Target className="w-4 h-4 text-amber-600" />
              <span>Accuracy</span>
            </div>
            <div className="text-2xl font-black text-amber-950">{attempt.accuracy}%</div>
            <div className="text-[11px] text-amber-700">{attempt.totalCorrect} of {attempt.totalCorrect + attempt.totalIncorrect} attempted</div>
          </div>

          <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-200">
            <div className="flex items-center gap-2 text-indigo-800 text-xs font-bold mb-1">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Time Taken</span>
            </div>
            <div className="text-2xl font-black text-indigo-950">{formatSeconds(attempt.timeTakenSeconds)}</div>
            <div className="text-[11px] text-indigo-700">of {test.durationMinutes} mins total</div>
          </div>
        </div>
      </div>

      {/* OVERALL TIME ANALYSIS STATISTICS PANEL */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm sm:text-base font-black text-slate-900">
              Exam Pace & Time Consumption Analysis
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            Recommended benchmark: ~120-150s per question
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Avg Time / Question
            </div>
            <div className="text-xl font-black text-slate-900">
              {formatSeconds(timeMetrics.avgTimePerQuestion)}
            </div>
            <div className="text-[10px] text-slate-500">across all questions</div>
          </div>

          <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-200 space-y-1">
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              Avg on Correct Qs
            </div>
            <div className="text-xl font-black text-emerald-950">
              {formatSeconds(timeMetrics.avgCorrectTime)}
            </div>
            <div className="text-[10px] text-emerald-700">smooth execution pace</div>
          </div>

          <div className="bg-rose-50/40 p-4 rounded-2xl border border-rose-200 space-y-1">
            <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
              Avg on Incorrect Qs
            </div>
            <div className="text-xl font-black text-rose-950">
              {formatSeconds(timeMetrics.avgIncorrectTime)}
            </div>
            <div className="text-[10px] text-rose-700">spent on mistakes</div>
          </div>

          <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-200 space-y-1">
            <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              Over-Time Questions
            </div>
            <div className="text-xl font-black text-amber-950">
              {timeMetrics.overTimeCount} Qs
            </div>
            <div className="text-[10px] text-amber-700">exceeded recommended limit</div>
          </div>
        </div>
      </div>

      {/* Subject-Wise Performance Breakdown */}
      {subjectStats && Object.keys(subjectStats).length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Subject-Wise Performance</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.entries(subjectStats) as [SubjectType, any][])
              .filter(([_, stat]) => stat.totalQuestions > 0)
              .map(([subject, stat]) => (
                <div key={subject} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-sm text-slate-900">{subject}</span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {stat.score} / {stat.maxScore}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                      <div className="text-emerald-700 font-bold">{stat.correct}</div>
                      <div className="text-[10px] text-slate-500">Correct</div>
                    </div>
                    <div className="bg-rose-50 p-2 rounded-xl border border-rose-100">
                      <div className="text-rose-700 font-bold">{stat.incorrect}</div>
                      <div className="text-[10px] text-slate-500">Wrong</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <div className="text-slate-700 font-bold">{stat.accuracy}%</div>
                      <div className="text-[10px] text-slate-500">Accuracy</div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Question-by-Question Detailed Review & Solutions */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Question-Wise Detailed Analysis</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review your responses against official answer keys and step-by-step solutions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleAllSolutions(true)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-xl transition"
            >
              Expand All Solutions
            </button>
            <button
              onClick={() => toggleAllSolutions(false)}
              className="text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 px-3 py-1.5 rounded-xl transition"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-xs font-bold text-slate-500 mr-1">Subject:</span>
            {['ALL', 'PHYSICS', 'CHEMISTRY', 'MATHEMATICS'].map(sub => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  selectedSubject === sub
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-1">Status:</span>
            {[
              { id: 'ALL', label: 'All' },
              { id: 'CORRECT', label: 'Correct' },
              { id: 'INCORRECT', label: 'Incorrect' },
              { id: 'UNANSWERED', label: 'Unanswered' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                  statusFilter === f.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-5">
          {filteredQuestions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">No questions matched the selected filters.</div>
          ) : (
            filteredQuestions.map(q => {
              const studentAns = attempt.answers[q.id];
              const isNumerical = q.type === 'NUMERICAL';
              const isAnswered = isNumerical 
                ? studentAns && studentAns.numericalResponse !== undefined
                : studentAns && Boolean(studentAns.selectedOptionId);
              const isCorrect = studentAns?.isCorrect;
              const selectedOption = !isNumerical ? q.options.find(o => o.id === studentAns?.selectedOptionId) : undefined;
              const correctOption = !isNumerical ? q.options.find(o => o.id === q.correctOptionId) : undefined;
              const marksAwarded = studentAns?.marksAwarded ?? 0;
              const isExpanded = Boolean(expandedSolutions[q.id]);
              const questionNote = errorNotes?.notes?.[q.id];

              return (
                <div
                  key={q.id}
                  className={`rounded-2xl border p-5 space-y-4 transition ${
                    isCorrect
                      ? 'bg-emerald-50/20 border-emerald-200'
                      : isAnswered
                      ? 'bg-rose-50/20 border-rose-200'
                      : 'bg-slate-50/40 border-slate-200'
                  }`}
                >
                  {/* Question Header & Status Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                        Q{q.orderIndex}
                      </span>
                      <span className="text-xs font-bold text-slate-700">{q.subject}</span>
                      <span className="text-xs text-slate-400">• Time: {studentAns?.timeSpentSeconds || 0}s</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isCorrect ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Correct (+{marksAwarded})
                        </span>
                      ) : isAnswered ? (
                        <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-xs flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          Incorrect ({marksAwarded})
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-bold text-xs">
                          Unanswered (0)
                        </span>
                      )}

                      {/* Error & Revision Note Tag / Quick Jump */}
                      {onMakeErrorNotes && (
                        <button
                          onClick={() => onMakeErrorNotes(q.id)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 border ${
                            isCorrect
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
                          }`}
                          title={isCorrect ? "Add revision formulas, key takeaways, or shortcut tricks" : "Add error classification and analysis"}
                        >
                          <Sparkles className={`w-3 h-3 ${isCorrect ? 'text-emerald-600' : 'text-amber-600'}`} />
                          <span>
                            {questionNote?.selectedErrorTypes?.length || questionNote?.whatIMessed || questionNote?.whatILearned || questionNote?.importantNote || questionNote?.keyPoint
                              ? 'Edit Note'
                              : isCorrect
                              ? 'Add Note'
                              : 'Add Error Note'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Question Statement */}
                  <div className="text-sm font-medium text-slate-900 leading-relaxed">
                    <MathRenderer content={q.questionText} />
                  </div>

                  {/* Question Image if exists */}
                  {q.questionImageUrl && (
                    <div className="p-2 bg-white rounded-lg border border-slate-200 max-w-sm">
                      <QuestionImage src={q.questionImageUrl} alt="Question figure" />
                    </div>
                  )}

                  {!isNumerical ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {(q.options || []).map(opt => {
                        const isStudentChoice = opt.id === studentAns?.selectedOptionId;
                        const isCorrectChoice = opt.id === q.correctOptionId;

                        let optClass = 'bg-white border-slate-200 text-slate-800';
                        if (isCorrectChoice) {
                          optClass = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold ring-1 ring-emerald-300';
                        } else if (isStudentChoice && !isCorrectChoice) {
                          optClass = 'bg-rose-50 border-rose-400 text-rose-950 font-semibold ring-1 ring-rose-300';
                        }

                        return (
                          <div key={opt.id} className={`p-3 rounded-xl border flex items-center gap-3 text-xs ${optClass}`}>
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold shrink-0 ${
                                isCorrectChoice
                                  ? 'bg-emerald-600 text-white'
                                  : isStudentChoice
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {opt.optionLabel}
                            </span>

                            <div className="flex-1 flex flex-col gap-2">
                              <MathRenderer content={opt.optionText} />
                              {opt.optionImageUrl && (
                                <div className="bg-white border border-slate-200 rounded p-1 max-w-[200px]">
                                  <img src={opt.optionImageUrl} alt={`Option ${opt.optionLabel} figure`} className="rounded object-contain" />
                                </div>
                              )}
                              {opt.optionSvgContent && (
                                <div className="bg-white border border-slate-200 rounded p-1 max-w-[200px]">
                                  <SafeSvgRenderer svgContent={opt.optionSvgContent} className="rounded object-contain" />
                                </div>
                              )}
                            </div>

                            {isCorrectChoice && (
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full shrink-0">
                                Correct Key
                              </span>
                            )}
                            {isStudentChoice && !isCorrectChoice && (
                              <span className="text-[11px] font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full shrink-0">
                                Your Answer
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-1">
                      <div className="flex-1 p-4 rounded-xl border bg-slate-50/60 border-slate-200">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Your Answer</span>
                        <div className={`text-sm font-mono font-bold ${isCorrect ? 'text-emerald-700' : isAnswered ? 'text-rose-600' : 'text-slate-600'}`}>
                          {studentAns?.numericalResponse !== undefined ? studentAns.numericalResponse : 'Unanswered'}
                        </div>
                      </div>
                      <div className="flex-1 p-4 rounded-xl border bg-emerald-50/40 border-emerald-200">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block mb-1">Correct Answer</span>
                        <div className="text-sm font-mono font-bold text-emerald-900">
                          {q.numericalAnswer !== undefined ? q.numericalAnswer : 'N/A'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Solution Expandable Accordion */}
                  {(q.solutionText || q.solutionImageUrl) && (
                    <div className="pt-2">
                      <button
                        onClick={() => toggleSolution(q.id)}
                        className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        <HelpCircle className="w-4 h-4" />
                        <span>{isExpanded ? 'Hide Step-by-Step Solution' : 'View Step-by-Step Solution'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2.5 p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 animate-in fade-in">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                            Detailed Explanation:
                          </div>
                          {q.solutionText && (
                            <div className="text-xs text-slate-800 leading-relaxed">
                              <MathRenderer content={q.solutionText} />
                            </div>
                          )}
                          {q.solutionImageUrl && (
                            <div className="bg-white border border-slate-200 rounded p-2 max-w-sm mt-2">
                              <img src={q.solutionImageUrl} alt="Solution figure" className="rounded object-contain" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};