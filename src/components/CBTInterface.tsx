import React, { useState, useEffect, useRef } from 'react';
import { Test, Question, TestAttempt, StudentAnswer, QuestionAttemptStatus, SubjectType } from '../types';
import { MathRenderer } from '../utils/mathRenderer';
import { SafeSvgRenderer } from './SafeSvgRenderer';
import { QuestionImage } from './QuestionImage';
import { SubmitConfirmModal } from './SubmitConfirmModal';
import {
  Clock,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  RotateCcw,
  CheckCircle2,
  X,
  User as UserIcon,
  Maximize2,
  AlertTriangle,
} from 'lucide-react';

interface CBTInterfaceProps {
  test: Test;
  attempt: TestAttempt;
  initialRemainingSeconds: number;
  onSaveAnswer: (questionId: string, answer: Partial<StudentAnswer>) => void;
  onSubmitTest: (finalAnswers: Record<string, StudentAnswer>, timeTakenSeconds: number) => Promise<void>;
  studentName: string;
  isPreviewMode?: boolean;
  onClosePreview?: () => void;
}

export const CBTInterface: React.FC<CBTInterfaceProps> = ({
  test,
  attempt,
  initialRemainingSeconds,
  onSaveAnswer,
  onSubmitTest,
  studentName,
  isPreviewMode = false,
  onClosePreview,
}) => {
  const questions = test.questions || [];
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, StudentAnswer>>(attempt.answers || {});
  const [remainingSeconds, setRemainingSeconds] = useState<number>(initialRemainingSeconds);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeSubject, setActiveSubject] = useState<SubjectType | 'ALL'>('ALL');

  const questionStartTimeRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<any>(null);

  const currentQ = questions[currentIndex] || questions[0];

  // Subjects in test
  const uniqueSubjects = Array.from(new Set(questions.map(q => q.subject))) as SubjectType[];

  // Synchronize active subject when current question changes
  useEffect(() => {
    if (currentQ && activeSubject !== 'ALL' && currentQ.subject !== activeSubject) {
      setActiveSubject(currentQ.subject);
    }
  }, [currentIndex]);

  // Track time spent per question and active countdown timer
  useEffect(() => {
    timerIntervalRef.current = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Format timer HH:MM:SS
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Keyboard navigation & option selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSubmitModal || showInstructionsModal) return;

      if (e.key === '1' || e.key === 'a' || e.key === 'A') {
        selectOptionByIndex(0);
      } else if (e.key === '2' || e.key === 'b' || e.key === 'B') {
        selectOptionByIndex(1);
      } else if (e.key === '3' || e.key === 'c' || e.key === 'C') {
        selectOptionByIndex(2);
      } else if (e.key === '4' || e.key === 'd' || e.key === 'D') {
        selectOptionByIndex(3);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, currentQ, answers, showSubmitModal, showInstructionsModal]);

  // Initialize first question on mount
  useEffect(() => {
    if (questions.length > 0) {
      const firstQ = questions[0];
      const firstAns = answers[firstQ.id];
      if (!firstAns || firstAns.status === 'NOT_VISITED') {
        const initialAns: StudentAnswer = {
          questionId: firstQ.id,
          selectedOptionId: undefined,
          status: 'NOT_ANSWERED',
          timeSpentSeconds: 0,
        };
        setAnswers(prev => ({ ...prev, [firstQ.id]: initialAns }));
        onSaveAnswer(firstQ.id, initialAns);
      }
    }
  }, [test.id]);

  const selectOptionByIndex = (optIdx: number) => {
    if (!currentQ || !currentQ.options || !currentQ.options[optIdx]) return;
    handleSelectOption(currentQ.options[optIdx].id);
  };

  const handleSelectOption = (optionId: string) => {
    if (!currentQ) return;
    setAnswers(prev => {
      const currentAns = prev[currentQ.id] || {
        questionId: currentQ.id,
        status: 'NOT_ANSWERED',
        timeSpentSeconds: 0,
      };

      const updated: StudentAnswer = {
        ...currentAns,
        selectedOptionId: optionId,
      };

      return {
        ...prev,
        [currentQ.id]: updated,
      };
    });
  };

  const handleNumericalChange = (val: string) => {
    if (!currentQ) return;
    setAnswers(prev => {
      const currentAns = prev[currentQ.id] || {
        questionId: currentQ.id,
        status: 'NOT_ANSWERED',
        timeSpentSeconds: 0,
      };

      const updated: StudentAnswer = {
        ...currentAns,
        numericalResponse: val !== '' ? Number(val) : undefined,
      };

      return {
        ...prev,
        [currentQ.id]: updated,
      };
    });
  };

  const handleClearResponse = () => {
    if (!currentQ) return;
    const currentAns = answers[currentQ.id] || {
      questionId: currentQ.id,
      status: 'NOT_ANSWERED',
      timeSpentSeconds: 0,
    };

    const updatedAns: StudentAnswer = {
      ...currentAns,
      selectedOptionId: undefined,
      numericalResponse: undefined,
      status: 'NOT_ANSWERED',
    };

    setAnswers(prev => ({ ...prev, [currentQ.id]: updatedAns }));
    onSaveAnswer(currentQ.id, updatedAns);
  };

  const handleSaveAndNext = () => {
    if (!currentQ) return;
    const currentAns = answers[currentQ.id];
    const hasAnswer = currentQ.type === 'NUMERICAL' 
      ? currentAns?.numericalResponse !== undefined
      : Boolean(currentAns?.selectedOptionId);
    const newStatus: QuestionAttemptStatus = hasAnswer ? 'ANSWERED' : 'NOT_ANSWERED';
    const elapsed = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);

    const updatedAns: StudentAnswer = {
      questionId: currentQ.id,
      selectedOptionId: currentAns?.selectedOptionId,
      numericalResponse: currentAns?.numericalResponse,
      status: newStatus,
      timeSpentSeconds: (currentAns?.timeSpentSeconds || 0) + elapsed,
    };

    // Save current question
    onSaveAnswer(currentQ.id, updatedAns);

    if (currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      const targetQ = questions[nextIdx];
      const targetAns = answers[targetQ.id];
      const targetNeedsInit = !targetAns || targetAns.status === 'NOT_VISITED';

      const initialTargetAns: StudentAnswer = targetNeedsInit
        ? {
            questionId: targetQ.id,
            selectedOptionId: undefined,
            status: 'NOT_ANSWERED',
            timeSpentSeconds: 0,
          }
        : targetAns!;

      setAnswers(prev => ({
        ...prev,
        [currentQ.id]: updatedAns,
        ...(targetNeedsInit ? { [targetQ.id]: initialTargetAns } : {}),
      }));

      if (targetNeedsInit) {
        onSaveAnswer(targetQ.id, initialTargetAns);
      }

      questionStartTimeRef.current = Date.now();
      setCurrentIndex(nextIdx);
    } else {
      setAnswers(prev => ({ ...prev, [currentQ.id]: updatedAns }));
    }
  };

  const handleMarkForReviewAndNext = () => {
    if (!currentQ) return;
    const currentAns = answers[currentQ.id];
    const hasAnswer = currentQ.type === 'NUMERICAL' 
      ? currentAns?.numericalResponse !== undefined
      : Boolean(currentAns?.selectedOptionId);
    const newStatus: QuestionAttemptStatus = hasAnswer ? 'ANSWERED_AND_MARKED' : 'MARKED_FOR_REVIEW';
    const elapsed = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);

    const updatedAns: StudentAnswer = {
      questionId: currentQ.id,
      selectedOptionId: currentAns?.selectedOptionId,
      numericalResponse: currentAns?.numericalResponse,
      status: newStatus,
      timeSpentSeconds: (currentAns?.timeSpentSeconds || 0) + elapsed,
    };

    onSaveAnswer(currentQ.id, updatedAns);

    if (currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      const targetQ = questions[nextIdx];
      const targetAns = answers[targetQ.id];
      const targetNeedsInit = !targetAns || targetAns.status === 'NOT_VISITED';

      const initialTargetAns: StudentAnswer = targetNeedsInit
        ? {
            questionId: targetQ.id,
            selectedOptionId: undefined,
            status: 'NOT_ANSWERED',
            timeSpentSeconds: 0,
          }
        : targetAns!;

      setAnswers(prev => ({
        ...prev,
        [currentQ.id]: updatedAns,
        ...(targetNeedsInit ? { [targetQ.id]: initialTargetAns } : {}),
      }));

      if (targetNeedsInit) {
        onSaveAnswer(targetQ.id, initialTargetAns);
      }

      questionStartTimeRef.current = Date.now();
      setCurrentIndex(nextIdx);
    } else {
      setAnswers(prev => ({ ...prev, [currentQ.id]: updatedAns }));
    }
  };

  const navigateToQuestion = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= questions.length || targetIndex === currentIndex) return;

    if (currentQ) {
      const currentAns = answers[currentQ.id];
      const elapsed = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
      const existingStatus = currentAns?.status;
      const resolvedStatus =
        !existingStatus || existingStatus === 'NOT_VISITED'
          ? currentAns?.selectedOptionId
            ? 'ANSWERED'
            : 'NOT_ANSWERED'
          : existingStatus;

      const departureAns: StudentAnswer = {
        questionId: currentQ.id,
        selectedOptionId: currentAns?.selectedOptionId,
        status: resolvedStatus,
        timeSpentSeconds: (currentAns?.timeSpentSeconds || 0) + elapsed,
      };

      const targetQ = questions[targetIndex];
      const targetAns = answers[targetQ.id];
      const targetNeedsInit = !targetAns || targetAns.status === 'NOT_VISITED';
      const initialTargetAns: StudentAnswer | null = targetNeedsInit
        ? {
            questionId: targetQ.id,
            selectedOptionId: undefined,
            status: 'NOT_ANSWERED',
            timeSpentSeconds: 0,
          }
        : null;

      setAnswers(prev => {
        const next = { ...prev, [currentQ.id]: departureAns };
        if (initialTargetAns) {
          next[targetQ.id] = initialTargetAns;
        }
        return next;
      });

      onSaveAnswer(currentQ.id, departureAns);
      if (initialTargetAns) {
        onSaveAnswer(targetQ.id, initialTargetAns);
      }
    }

    questionStartTimeRef.current = Date.now();
    setCurrentIndex(targetIndex);
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    const totalElapsed = test.durationMinutes * 60 - remainingSeconds;
    try {
      await onSubmitTest(answers, totalElapsed);
    } finally {
      setIsSubmitting(false);
      setShowSubmitModal(false);
    }
  };

  // Status counts for palette
  let answeredCount = 0;
  let notAnsweredCount = 0;
  let notVisitedCount = 0;
  let markedCount = 0;
  let answeredAndMarkedCount = 0;

  questions.forEach(q => {
    const ans = answers[q.id];
    const status = ans?.status || 'NOT_VISITED';
    if (status === 'ANSWERED') answeredCount++;
    else if (status === 'NOT_ANSWERED') notAnsweredCount++;
    else if (status === 'MARKED_FOR_REVIEW') markedCount++;
    else if (status === 'ANSWERED_AND_MARKED') answeredAndMarkedCount++;
    else notVisitedCount++;
  });

  const getStatusColorClass = (qId: string) => {
    const ans = answers[qId];
    const status = ans?.status || 'NOT_VISITED';

    switch (status) {
      case 'ANSWERED':
        return 'bg-emerald-600 text-white border-emerald-600';
      case 'NOT_ANSWERED':
        return 'bg-rose-500 text-white border-rose-500';
      case 'MARKED_FOR_REVIEW':
        return 'bg-purple-600 text-white border-purple-600';
      case 'ANSWERED_AND_MARKED':
        return 'bg-purple-600 text-white border-purple-600 ring-2 ring-emerald-400';
      case 'NOT_VISITED':
      default:
        return 'bg-slate-200 text-slate-700 border-slate-300';
    }
  };

  const isLowTime = remainingSeconds < 600; // < 10 mins
  const isCriticalTime = remainingSeconds < 120; // < 2 mins

  const currentAnswer = answers[currentQ?.id];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col select-none">
      {/* Top CBT Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-sm">
            ES
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight truncate max-w-xs sm:max-w-md md:max-w-xl">
              {test.title}
            </h1>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>Candidate: <strong className="text-slate-200">{studentName}</strong></span>
              {isPreviewMode && (
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  TEACHER PREVIEW MODE
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Timer Box & Instructions Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowInstructionsModal(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            <span>Instructions</span>
          </button>

          {/* Real-time Server Synced Countdown */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono font-bold text-sm sm:text-base shadow-inner ${
              isCriticalTime
                ? 'bg-rose-950/80 text-rose-300 border-rose-600 animate-pulse'
                : isLowTime
                ? 'bg-amber-950/80 text-amber-300 border-amber-600'
                : 'bg-slate-800 text-emerald-400 border-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formatTime(remainingSeconds)}</span>
          </div>

          {isPreviewMode && onClosePreview && (
            <button
              onClick={onClosePreview}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition"
            >
              Exit Preview
            </button>
          )}
        </div>
      </header>

      {/* Main Examination Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left/Center Question Section */}
        <main className="flex-1 flex flex-col bg-white border-r border-slate-200 overflow-y-auto">
          {/* Subject Navigation Tabs Bar */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1 hidden sm:inline">
                Sections:
              </span>
              {uniqueSubjects.map(sub => {
                const subQuestions = questions.filter(q => q.subject === sub);
                const isCurrentSub = currentQ?.subject === sub;
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => {
                      const firstQ = questions.findIndex(q => q.subject === sub);
                      if (firstQ !== -1) navigateToQuestion(firstQ);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      isCurrentSub
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>{sub}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isCurrentSub ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-600'}`}>
                      {subQuestions.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Marking Scheme indicator */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                +{currentQ?.marks || 4}
              </span>
              <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                -{currentQ?.negativeMarks || 1}
              </span>
            </div>
          </div>

          {/* Question Display Area */}
          <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
            {currentQ ? (
              <>
                {/* Question Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900">
                      Question {currentQ.orderIndex}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {currentQ.subject}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 font-medium">
                    Single Correct Choice (Type: MCQ)
                  </div>
                </div>

                {/* Question Statement & Math */}
                <div className="text-slate-900 text-base sm:text-lg font-normal leading-relaxed font-sans">
                  <MathRenderer content={currentQ.questionText} />
                </div>

                {/* Question Diagram / Image */}
                {currentQ.questionImageUrl && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl inline-block max-w-xl">
                    <QuestionImage
                      src={currentQ.questionImageUrl}
                      alt={`Figure for Question ${currentQ.orderIndex}`}
                      className="max-h-72 object-contain shadow-2xs"
                    />
                  </div>
                )}

                {/* Question specific Answer Mode */}
                {(!currentQ.type || currentQ.type === 'MCQ') ? (
                  <div className="space-y-3 pt-2">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Select Your Answer:
                    </div>
                    <div className="space-y-2.5">
                      {currentQ.options.map((option) => {
                        const isSelected = currentAnswer?.selectedOptionId === option.id;
                        return (
                          <label
                            key={option.id}
                            onClick={() => handleSelectOption(option.id)}
                            className={`flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-200 shadow-xs'
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                            }`}
                          >
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition ${
                                isSelected
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-100 text-slate-600 border border-slate-300'
                              }`}
                            >
                              {option.optionLabel}
                            </div>
                            <div className="flex-1 flex flex-col gap-3">
                              <div className="text-sm sm:text-base font-normal text-slate-800 leading-relaxed">
                                <MathRenderer content={option.optionText} />
                              </div>
                              {option.optionImageUrl && (
                                <div className="bg-white border border-slate-200 p-2 rounded-lg max-w-sm">
                                  <img src={option.optionImageUrl} alt={`Option ${option.optionLabel}`} className="rounded object-contain" />
                                </div>
                              )}
                              {option.optionSvgContent && (
                                <div className="bg-white border border-slate-200 p-2 rounded-lg max-w-sm">
                                  <SafeSvgRenderer svgContent={option.optionSvgContent} className="rounded object-contain" />
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Enter Numerical Answer:
                    </div>
                    <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl max-w-sm">
                      <input
                        type="number"
                        step="any"
                        value={currentAnswer?.numericalResponse !== undefined ? currentAnswer.numericalResponse : ''}
                        onChange={(e) => handleNumericalChange(e.target.value)}
                        placeholder="e.g. 42 or -3.14"
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-lg font-mono font-bold text-slate-900 transition"
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-12 text-center text-slate-400">No question selected</div>
            )}
          </div>

          {/* Bottom Action Buttons Bar */}
          <div className="bg-slate-50 border-t border-slate-200 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleMarkForReviewAndNext}
                className="px-3.5 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Mark for Review & Next</span>
              </button>

              <button
                type="button"
                onClick={handleClearResponse}
                disabled={!currentAnswer?.selectedOptionId}
                className="px-3 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 text-xs font-semibold transition disabled:opacity-40 shadow-2xs"
              >
                Clear Response
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigateToQuestion(currentIndex - 1)}
                disabled={currentIndex <= 0}
                className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold transition disabled:opacity-40 flex items-center gap-1 shadow-2xs"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAndNext}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
              >
                <span>Save & Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>

        {/* Right Sidebar: CBT Question Palette & Candidate Card */}
        <aside className="w-full lg:w-80 xl:w-96 bg-white flex flex-col border-t lg:border-t-0 border-slate-200">
          {/* Palette Legend */}
          <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              Question Palette Status
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px]">
                  {answeredCount}
                </div>
                <span className="text-[11px] text-slate-600">Answered</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-rose-500 text-white flex items-center justify-center font-bold text-[11px]">
                  {notAnsweredCount}
                </div>
                <span className="text-[11px] text-slate-600">Not Answered</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[11px]">
                  {notVisitedCount}
                </div>
                <span className="text-[11px] text-slate-600">Not Visited</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-purple-600 text-white flex items-center justify-center font-bold text-[11px]">
                  {markedCount}
                </div>
                <span className="text-[11px] text-slate-600">Marked for Review</span>
              </div>

              <div className="col-span-2 flex items-center gap-2 pt-1 border-t border-slate-200/60">
                <div className="w-6 h-6 rounded-md bg-purple-600 text-white flex items-center justify-center font-bold text-[11px] ring-2 ring-emerald-400">
                  {answeredAndMarkedCount}
                </div>
                <span className="text-[11px] text-slate-600">
                  Answered & Marked for Review (will be evaluated)
                </span>
              </div>
            </div>
          </div>

          {/* Numbered Questions Grid */}
          <div className="flex-1 p-4 overflow-y-auto max-h-72 lg:max-h-none">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Choose a Question:
              </span>
              <span className="text-[11px] text-slate-400">
                Total: {questions.length}
              </span>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const statusClass = getStatusColorClass(q.id);
                const hasAnswerAndMarked = answers[q.id]?.status === 'ANSWERED_AND_MARKED';

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => navigateToQuestion(idx)}
                    className={`h-9 rounded-lg font-bold text-xs flex items-center justify-center relative transition shadow-2xs ${statusClass} ${
                      isCurrent ? 'ring-2 ring-indigo-500 ring-offset-2 scale-105' : 'hover:opacity-90'
                    }`}
                  >
                    <span>{q.orderIndex}</span>
                    {hasAnswerAndMarked && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-white" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Test Button */}
          <div className="p-4 bg-slate-50 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Submit Examination</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Submission Confirmation Summary Modal */}
      <SubmitConfirmModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onConfirm={handleFinalSubmit}
        totalQuestions={questions.length}
        answeredCount={answeredCount}
        unansweredCount={notAnsweredCount}
        markedCount={markedCount}
        answeredAndMarkedCount={answeredAndMarkedCount}
        notVisitedCount={notVisitedCount}
        timeRemainingText={formatTime(remainingSeconds)}
        isSubmitting={isSubmitting}
      />

      {/* Instructions Popup Modal */}
      {showInstructionsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">General Instructions</h3>
              <button
                onClick={() => setShowInstructionsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 max-h-[60vh] overflow-y-auto leading-relaxed pr-2">
              <p><strong>1. Examination Structure:</strong> This test consists of Multiple Choice Questions. Each question has four options out of which only one is correct.</p>
              <p><strong>2. Marking Scheme:</strong> +4 marks are awarded for each correct response, -1 mark is deducted for each incorrect response, and 0 marks for unattempted questions.</p>
              <p><strong>3. Palette Symbols:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li><span className="font-bold text-slate-700">Grey:</span> You have not visited the question yet.</li>
                <li><span className="font-bold text-rose-600">Red:</span> You have not answered the question.</li>
                <li><span className="font-bold text-emerald-600">Green:</span> You have answered the question.</li>
                <li><span className="font-bold text-purple-600">Purple:</span> You have marked the question for review.</li>
                <li><span className="font-bold text-purple-600">Purple with Green:</span> The question is answered and marked for review (it will be evaluated for scoring).</li>
              </ul>
              <p><strong>4. Autosave:</strong> Your responses are automatically synchronized with the server. If the timer reaches 00:00:00, your test will be submitted automatically.</p>
            </div>

            <div className="pt-2 text-right border-t border-slate-100">
              <button
                onClick={() => setShowInstructionsModal(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 transition"
              >
                Back to Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};