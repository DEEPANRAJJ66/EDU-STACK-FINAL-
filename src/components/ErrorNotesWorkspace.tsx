import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  TestAttempt,
  Test,
  Question,
  QuestionErrorNote,
  ErrorNote,
  AttemptErrorNotes,
  ErrorType,
  ErrorCategory,
  SubjectType,
} from '../types';
import { MathRenderer } from '../utils/mathRenderer';
import { SafeSvgRenderer } from './SafeSvgRenderer';
import { QuestionImage } from './QuestionImage';
import { api } from '../services/api';
import { safeStorage } from '../utils/safeStorage';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Save,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  FileText,
  RotateCcw,
  Upload,
  Trash2,
  Image as ImageIcon,
  ShieldCheck,
  Zap,
  HelpCircle,
  Layers,
  BookOpen,
  Info,
  ExternalLink,
  Filter,
} from 'lucide-react';

interface ErrorNotesWorkspaceProps {
  attempt: TestAttempt;
  test: Test;
  questions: Question[];
  initialQuestionId?: string;
  onBack: () => void;
  onLaunchErrorCorrectTest: (targetQuestionIds?: string[]) => void;
  onOpenPDF: (errorNotes: AttemptErrorNotes) => void;
}

export const ERROR_CATEGORIES_CONFIG: {
  category: ErrorCategory;
  title: string;
  badgeColor: string;
  items: { type: ErrorType; label: string; desc: string }[];
}[] = [
  {
    category: 'KNOWLEDGE',
    title: 'Knowledge & Concepts',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    items: [
      { type: 'CONCEPT_ERROR', label: 'Concept Error', desc: 'Misunderstood fundamental physics/math theory or chemistry rule' },
      { type: 'DONT_KNOW_TOPIC', label: "Don't Know Topic", desc: 'Topic never studied or unrevised chapter' },
      { type: 'FORMULA_ERROR', label: 'Formula Error', desc: 'Applied wrong formula, incorrect constant or trigonometric identity' },
      { type: 'FORGOT_CONCEPT', label: 'Forgot Concept', desc: 'Studied before but failed to recall during the test' },
      { type: 'INCOMPLETE_KNOWLEDGE', label: 'Incomplete Knowledge', desc: 'Knew partial formula or missed necessary boundary conditions' },
    ],
  },
  {
    category: 'EXECUTION',
    title: 'Execution & Calculation',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    items: [
      { type: 'SILLY_MISTAKE', label: 'Silly Mistake', desc: 'Misread question, wrong unit conversion, or clicked wrong option' },
      { type: 'CALCULATION_ERROR', label: 'Calculation Error', desc: 'Algebraic slip, arithmetic mistake or sign inversion' },
      { type: 'WRONG_APPROACH', label: 'Wrong Approach', desc: 'Chosen method was invalid or overly complicated' },
      { type: 'QUESTION_MISUNDERSTOOD', label: 'Question Misunderstood', desc: 'Misinterpreted the given values or what was asked' },
      { type: 'OVERTHINKING', label: 'Overthinking', desc: 'Over-analyzed a straightforward question and second-guessed' },
    ],
  },
  {
    category: 'EXAM_STRATEGY',
    title: 'Exam Strategy & Time',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    items: [
      { type: 'TIME_PRESSURE', label: 'Time Pressure', desc: 'Rushed answering under the timer without verifying' },
      { type: 'GUESS_RANDOM', label: 'Guess / Lucky Guess', desc: 'Intuitive guess or wild shot under negative marking risk' },
    ],
  },
  {
    category: 'SPECIAL',
    title: 'Special / Exclusions',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    items: [
      {
        type: 'THIS_IS_FINE',
        label: 'This is Fine',
        desc: 'Concept is completely understood now — do NOT include in Error Correct Test',
      },
    ],
  },
];

export const ErrorNotesWorkspace: React.FC<ErrorNotesWorkspaceProps> = ({
  attempt,
  test,
  questions,
  initialQuestionId,
  onBack,
  onLaunchErrorCorrectTest,
  onOpenPDF,
}) => {
  // Filter tab: 'ALL' | 'MISTAKES' | 'CLASSIFIED_ERRORS' | 'THIS_IS_FINE' | 'CORRECT'
  const [filterTab, setFilterTab] = useState<'ALL' | 'MISTAKES' | 'CLASSIFIED_ERRORS' | 'THIS_IS_FINE' | 'CORRECT'>('ALL');

  // Breakdown of questions by attempt status
  const mistakeQuestions = useMemo(() => {
    return questions.filter(q => {
      const ans = attempt.answers?.[q.id];
      return !ans || !ans.isCorrect;
    });
  }, [questions, attempt]);

  const correctQuestions = useMemo(() => {
    return questions.filter(q => {
      const ans = attempt.answers?.[q.id];
      return Boolean(ans?.isCorrect);
    });
  }, [questions, attempt]);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [errorNotesMap, setErrorNotesMap] = useState<Record<string, QuestionErrorNote>>({});
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED' | 'ERROR'>('SAVED');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [showCounterDropdown, setShowCounterDropdown] = useState<boolean>(false);
  const [uploadingSection, setUploadingSection] = useState<string | null>(null);

  // Use ReturnType<typeof setTimeout> instead of NodeJS.Timeout — this is a browser/Vite
  // project without @types/node, so the NodeJS namespace doesn't exist here and previously
  // caused a "Cannot find namespace 'NodeJS'" type error on both refs below.
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef<boolean>(false);
  const pendingSavePayloadRef = useRef<{
    notes: Record<string, QuestionErrorNote>;
    index?: number;
  } | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Eligible questions for Error Correct Test:
  // Must have at least one relevant error classification checkbox checked, and must NOT be marked "This is Fine"
  const eligibleErrorTestQuestions = useMemo(() => {
    return questions.filter(q => {
      const n = errorNotesMap[q.id];
      if (n?.thisIsFine) return false;
      const types = (n?.selectedErrorTypes || []).filter(t => t !== 'THIS_IS_FINE');
      return types.length > 0;
    });
  }, [questions, errorNotesMap]);

  // Questions marked This is Fine
  const fineQuestions = useMemo(() => {
    return questions.filter(q => Boolean(errorNotesMap[q.id]?.thisIsFine));
  }, [questions, errorNotesMap]);

  // Unclassified mistake questions (mistake questions that have neither an error type nor thisIsFine)
  const unclassifiedMistakes = useMemo(() => {
    return mistakeQuestions.filter(q => {
      const n = errorNotesMap[q.id];
      if (n?.thisIsFine) return false;
      const types = (n?.selectedErrorTypes || []).filter(t => t !== 'THIS_IS_FINE');
      return types.length === 0;
    });
  }, [mistakeQuestions, errorNotesMap]);

  // Questions displayed in current filter tab
  const targetQuestions = useMemo(() => {
    if (filterTab === 'MISTAKES') {
      return mistakeQuestions.length > 0 ? mistakeQuestions : questions;
    }
    if (filterTab === 'CLASSIFIED_ERRORS') {
      return eligibleErrorTestQuestions.length > 0 ? eligibleErrorTestQuestions : questions;
    }
    if (filterTab === 'THIS_IS_FINE') {
      return fineQuestions.length > 0 ? fineQuestions : questions;
    }
    if (filterTab === 'CORRECT') {
      return correctQuestions.length > 0 ? correctQuestions : questions;
    }
    return questions;
  }, [filterTab, questions, mistakeQuestions, eligibleErrorTestQuestions, fineQuestions, correctQuestions]);

  const currentQ = targetQuestions[currentIndex] || targetQuestions[0] || questions[0];

  const storageKey = `edustack_err_notes_${attempt.id}`;

  // Initial load from backend (with localStorage fallback)
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      // 1. Try safe storage first for instant render
      try {
        const cached = safeStorage.getItem(storageKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.notes && isMounted) {
            setErrorNotesMap(parsed.notes);
            if (typeof parsed.currentQuestionIndex === 'number' && !initialQuestionId) {
              const boundedIdx = Math.min(
                Math.max(0, parsed.currentQuestionIndex),
                targetQuestions.length - 1
              );
              setCurrentIndex(boundedIdx);
            }
          }
        }
      } catch (e) {
        console.warn('Error reading safeStorage cache', e);
      }

      // 2. Fetch authoritative state from backend
      try {
        const res = await api.errorNotes.getByAttemptId(attempt.id);
        if (res?.errorNotes && isMounted) {
          const backendNotes = res.errorNotes.notes || {};
          setErrorNotesMap(prev => ({ ...prev, ...backendNotes }));
          if (typeof res.errorNotes.currentQuestionIndex === 'number' && !initialQuestionId) {
            const bounded = Math.min(
              Math.max(0, res.errorNotes.currentQuestionIndex),
              targetQuestions.length - 1
            );
            setCurrentIndex(bounded);
          }
          setSaveStatus('SAVED');
          setLastSavedTime(new Date(res.errorNotes.updatedAt || Date.now()).toLocaleTimeString());
        }
      } catch (err) {
        console.error('Failed to load error notes from backend', err);
      }
    }

    loadData();
    return () => {
      isMounted = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [attempt.id, storageKey]);

  // Jump to initialQuestionId if provided
  useEffect(() => {
    if (initialQuestionId) {
      const idx = targetQuestions.findIndex(q => q.id === initialQuestionId);
      if (idx !== -1) {
        setCurrentIndex(idx);
      } else {
        // If not in current filter tab, switch to ALL tab
        const allIdx = questions.findIndex(q => q.id === initialQuestionId);
        if (allIdx !== -1) {
          setFilterTab('ALL');
          setCurrentIndex(allIdx);
        }
      }
    }
  }, [initialQuestionId, targetQuestions, questions]);

  // Current Question Note state
  const currentNote: QuestionErrorNote = useMemo(() => {
    if (!currentQ) {
      return {
        questionId: '',
        selectedErrorTypes: [],
        thisIsFine: false,
        whatIMessed: '',
        whatIMessedImages: [],
        whatILearned: '',
        whatILearnedImages: [],
        importantNote: '',
        importantNoteImages: [],
        keyPoint: '',
        keyPointImages: [],
        updatedAt: new Date().toISOString(),
      };
    }
    return (
      errorNotesMap[currentQ.id] || {
        questionId: currentQ.id,
        selectedErrorTypes: [],
        thisIsFine: false,
        whatIMessed: '',
        whatIMessedImages: [],
        whatILearned: '',
        whatILearnedImages: [],
        importantNote: '',
        importantNoteImages: [],
        keyPoint: '',
        keyPointImages: [],
        updatedAt: new Date().toISOString(),
      }
    );
  }, [errorNotesMap, currentQ]);

  // Auto-Save sync function with serialized queue and retry backoff
  const triggerSave = (
    updatedMap: Record<string, QuestionErrorNote>,
    newIndex?: number,
    immediate = false
  ) => {
    const qIndex = newIndex !== undefined ? newIndex : currentIndex;

    // 1. Instantly write to local backup (synchronous, never fails)
    try {
      safeStorage.setItem(
        storageKey,
        JSON.stringify({
          notes: updatedMap,
          currentQuestionIndex: qIndex,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (e) {
      console.warn('safeStorage backup error', e);
    }

    // Set pending payload for server synchronization
    pendingSavePayloadRef.current = {
      notes: updatedMap,
      index: qIndex,
    };

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const executeSave = async () => {
      if (isSavingRef.current) {
        // A network request is already in-flight.
        // The active request's finally block will automatically pick up pendingSavePayloadRef.
        return;
      }

      if (!pendingSavePayloadRef.current) {
        return;
      }

      const payload = pendingSavePayloadRef.current;
      pendingSavePayloadRef.current = null;

      isSavingRef.current = true;
      setSaveStatus('SAVING');

      try {
        const res = await api.errorNotes.save(attempt.id, {
          notes: payload.notes,
          currentQuestionIndex: payload.index,
        });

        if (res?.success) {
          setSaveStatus('SAVED');
          setLastSavedTime(new Date().toLocaleTimeString());
        }
      } catch (err: any) {
        // If save failed or was rate limited, keep the pending payload so it can be synced on next pass
        if (!pendingSavePayloadRef.current) {
          pendingSavePayloadRef.current = payload;
        }

        console.warn('Auto-save network sync notice (local copy intact):', err?.message || err);

        // Schedule a gentle background retry after 2.5s
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          executeSave();
        }, 2500);

        // Local state is already securely saved
        setSaveStatus('SAVED');
      } finally {
        isSavingRef.current = false;
        // If newer updates were queued while saving was in flight, process them next
        if (pendingSavePayloadRef.current) {
          setTimeout(executeSave, 150);
        }
      }
    };

    if (immediate) {
      executeSave();
    } else {
      debounceTimerRef.current = setTimeout(executeSave, 750);
    }
  };

  // Mutator helper for updating current question's note
  const updateCurrentNote = (updates: Partial<QuestionErrorNote>, immediate = false) => {
    if (!currentQ) return;
    const updatedNote: QuestionErrorNote = {
      ...currentNote,
      ...updates,
      questionId: currentQ.id,
      updatedAt: new Date().toISOString(),
    };

    const newMap = {
      ...errorNotesMap,
      [currentQ.id]: updatedNote,
    };

    setErrorNotesMap(newMap);
    triggerSave(newMap, currentIndex, immediate);
  };

  // Immediate save & PDF trigger
  const handleTriggerPDF = (isComplete = false) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    triggerSave(errorNotesMap, currentIndex, true);
    onOpenPDF({
      id: 'en_' + attempt.id,
      attemptId: attempt.id,
      testId: test.id,
      studentId: attempt.studentId,
      currentQuestionIndex: currentIndex,
      notes: errorNotesMap,
      createdAt: attempt.startTime,
      updatedAt: new Date().toISOString(),
      isFullyCompleted: isComplete,
    });
  };

  // Toggle Error Type Checkbox
  const handleToggleErrorType = (type: ErrorType) => {
    if (type === 'THIS_IS_FINE') {
      const nextVal = !currentNote.thisIsFine;
      updateCurrentNote(
        {
          thisIsFine: nextVal,
          selectedErrorTypes: nextVal
            ? currentNote.selectedErrorTypes.filter(t => t !== 'THIS_IS_FINE')
            : currentNote.selectedErrorTypes,
        },
        false
      );
      return;
    }

    const currentTypes = currentNote.selectedErrorTypes || [];
    const exists = currentTypes.includes(type);
    let nextTypes: ErrorType[];

    if (exists) {
      nextTypes = currentTypes.filter(t => t !== type);
    } else {
      nextTypes = [...currentTypes, type];
    }

    updateCurrentNote({ selectedErrorTypes: nextTypes }, false);
  };

  // Handle Image Upload for a section
  const handleImageUpload = (
    field: 'whatIMessedImages' | 'whatILearnedImages' | 'importantNoteImages' | 'keyPointImages',
    file: File
  ) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    setUploadingSection(field);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        // Upload to server or store data URL
        const res = await api.questions.uploadImage(base64, file.name);
        const imageUrl = res.imageUrl || base64;
        const currentList = currentNote[field] || [];
        updateCurrentNote({ [field]: [...currentList, imageUrl] }, true);
      } catch (err) {
        // Fallback to direct base64
        const currentList = currentNote[field] || [];
        updateCurrentNote({ [field]: [...currentList, base64] }, true);
      } finally {
        setUploadingSection(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (
    field: 'whatIMessedImages' | 'whatILearnedImages' | 'importantNoteImages' | 'keyPointImages',
    index: number
  ) => {
    const list = [...(currentNote[field] || [])];
    list.splice(index, 1);
    updateCurrentNote({ [field]: list }, true);
  };

  // Compute Live Error Counts across all questions
  const liveErrorCounts = useMemo(() => {
    const counts: Record<ErrorType, number> = {
      CONCEPT_ERROR: 0,
      DONT_KNOW_TOPIC: 0,
      FORMULA_ERROR: 0,
      FORGOT_CONCEPT: 0,
      INCOMPLETE_KNOWLEDGE: 0,
      SILLY_MISTAKE: 0,
      CALCULATION_ERROR: 0,
      WRONG_APPROACH: 0,
      QUESTION_MISUNDERSTOOD: 0,
      OVERTHINKING: 0,
      TIME_PRESSURE: 0,
      GUESS_RANDOM: 0,
      THIS_IS_FINE: 0,
    };

    let totalCategorized = 0;

    Object.values(errorNotesMap).forEach((n: ErrorNote) => {
      if (n.thisIsFine) {
        counts.THIS_IS_FINE++;
      }
      // `t` must stay typed as ErrorType (not widened to plain string), since `counts` is
      // keyed by the ErrorType union — a bare `string` can't index it and was the source
      // of the two type errors on the lines below.
      (n.selectedErrorTypes || []).forEach((t: ErrorType) => {
        if (counts[t] !== undefined) {
          counts[t]++;
          totalCategorized++;
        }
      });
    });

    return { counts, totalCategorized };
  }, [errorNotesMap]);

  // Overall notes progress (how many questions in the entire test have notes or classifications)
  const completedQuestionsCount = useMemo(() => {
    return questions.filter(q => {
      const n = errorNotesMap[q.id];
      if (!n) return false;
      return (
        n.thisIsFine ||
        (n.selectedErrorTypes && n.selectedErrorTypes.length > 0) ||
        Boolean(n.whatIMessed?.trim()) ||
        Boolean(n.whatILearned?.trim()) ||
        Boolean(n.importantNote?.trim()) ||
        Boolean(n.keyPoint?.trim()) ||
        (n.whatIMessedImages && n.whatIMessedImages.length > 0) ||
        (n.whatILearnedImages && n.whatILearnedImages.length > 0) ||
        (n.importantNoteImages && n.importantNoteImages.length > 0) ||
        (n.keyPointImages && n.keyPointImages.length > 0)
      );
    }).length;
  }, [questions, errorNotesMap]);

  // Navigation handlers
  const handleNext = () => {
    if (currentIndex < targetQuestions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      triggerSave(errorNotesMap, nextIdx, true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      triggerSave(errorNotesMap, prevIdx, true);
    }
  };

  const handleJumpToQuestion = (idx: number) => {
    setCurrentIndex(idx);
    triggerSave(errorNotesMap, idx, true);
  };

  // Recommended time calculation per question (Physics/Math 150s, Chemistry 90s, General 120s)
  const getRecommendedTime = (subject?: SubjectType) => {
    switch (subject) {
      case 'CHEMISTRY':
        return 90;
      case 'PHYSICS':
        return 140;
      case 'MATHEMATICS':
        return 160;
      default:
        return 120;
    }
  };

  const studentAns = currentQ ? attempt.answers?.[currentQ.id] : undefined;
  const isCorrectStudent = Boolean(studentAns?.isCorrect);
  const isAnsweredStudent = Boolean(
    studentAns &&
      (studentAns.selectedOptionId ||
        (studentAns.numericalResponse !== undefined && studentAns.numericalResponse !== null))
  );
  const actualTimeSeconds = studentAns?.timeSpentSeconds || 0;
  const recommendedTimeSeconds = getRecommendedTime(currentQ?.subject);
  const timeDifferenceSeconds = actualTimeSeconds - recommendedTimeSeconds;

  const isOverTime = timeDifferenceSeconds > 30;
  const isRushed = actualTimeSeconds < recommendedTimeSeconds * 0.4 && !isCorrectStudent;

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  // Find original 1-based index in test.questions for currentQ
  const originalQuestionNumber = useMemo(() => {
    if (!currentQ) return currentIndex + 1;
    const foundIdx = questions.findIndex(q => q.id === currentQ.id);
    return foundIdx !== -1 ? foundIdx + 1 : currentIndex + 1;
  }, [questions, currentQ, currentIndex]);

  const isErrorCorrectTest = test.title.includes('[Error Correct]');

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Continuous Loop Progression Header Bar */}
      <div className="bg-slate-900 text-white px-4 sm:px-6 py-2 border-b border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-black text-[10px] uppercase tracking-wider border border-amber-400/30">
              Continuous Loop
            </span>
            <span className="text-slate-300 font-semibold hidden sm:inline">
              {isErrorCorrectTest ? 'Remedial Iteration Loop' : 'Mock Test Error Mastery Loop'}
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 text-[11px] font-bold text-slate-400">
            <span className="text-emerald-400 flex items-center gap-1">
              <span>1. CBT Test</span>
              <span>✓</span>
            </span>
            <span>→</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span>2. Analysis</span>
              <span>✓</span>
            </span>
            <span>→</span>
            <span className="text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-400/40 font-black flex items-center gap-1">
              <span>3. Error Notes</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            </span>
            <span>→</span>
            <span className={eligibleErrorTestQuestions.length > 0 ? 'text-indigo-300 font-bold' : 'text-slate-500'}>
              4. Error Correct Test ({eligibleErrorTestQuestions.length} Qs)
            </span>
            <span>→</span>
            <span className="text-slate-500">5. Repeat</span>
          </div>
        </div>
      </div>

      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Left: Back & Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition flex items-center gap-1.5 text-xs font-bold"
              title="Return to Test Analysis"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Result</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-extrabold uppercase tracking-wide border border-indigo-200">
                  Smart Error & Revision Notes
                </span>
                <h1 className="text-sm sm:text-base font-black text-slate-900 line-clamp-1">
                  {test.title}
                </h1>
              </div>
              <p className="text-[11px] text-slate-500">
                Classify errors using the 13 checkboxes. Questions with error checkboxes will populate your next Error Correct Test (questions marked &ldquo;This is Fine&rdquo; are excluded).
              </p>
            </div>
          </div>

          {/* Center: Progress & Auto-Save Indicator */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end text-right">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">
                  Notes Written: {completedQuestionsCount} / {questions.length} Qs
                </span>
                <span className="text-[10px] text-indigo-600 font-semibold">
                  ({Math.round((completedQuestionsCount / (questions.length || 1)) * 100)}%)
                </span>
              </div>
              <div className="w-36 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200 mt-1">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round((completedQuestionsCount / (questions.length || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Auto-Save Badge */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                saveStatus === 'SAVING'
                  ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                  : saveStatus === 'ERROR'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {saveStatus === 'SAVING' ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span>Saving...</span>
                </>
              ) : saveStatus === 'ERROR' ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Save Error</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span>Auto-Saved {lastSavedTime && `(${lastSavedTime})`}</span>
                </>
              )}
            </div>

            {/* Right: Live Error Counter Dropdown Button */}
            <div className="relative">
              <button
                onClick={() => setShowCounterDropdown(!showCounterDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Live Tag Matrix</span>
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-white text-[10px] font-black">
                  {liveErrorCounts.totalCategorized}
                </span>
              </button>

              {/* Counter Dropdown Modal */}
              {showCounterDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Live Error & Tag Breakdown
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowCounterDropdown(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                    >
                      Close
                    </button>
                  </div>

                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {ERROR_CATEGORIES_CONFIG.map(cat => (
                      <div key={cat.category} className="space-y-1.5">
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {cat.title}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {cat.items.map(item => {
                            const count = liveErrorCounts.counts[item.type] || 0;
                            return (
                              <div
                                key={item.type}
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs ${
                                  count > 0
                                    ? `${cat.badgeColor} font-bold shadow-2xs`
                                    : 'bg-slate-50 text-slate-400 border-slate-100'
                                }`}
                              >
                                <span className="truncate pr-1 text-[11px]">{item.label}</span>
                                <span className="font-black px-1.5 py-0.5 rounded-md bg-white/80 text-[10px]">
                                  {count}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>This is Fine: <strong>{liveErrorCounts.counts.THIS_IS_FINE}</strong></span>
                    <span>Total Tags: <strong>{liveErrorCounts.totalCategorized}</strong></span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 flex flex-col lg:flex-row gap-6">
        {/* Left Side: Question Palette & Navigation */}
        <aside className="w-full lg:w-72 shrink-0 space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Question Palette</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                {currentIndex + 1} of {targetQuestions.length}
              </span>
            </div>

            {/* Filter Tabs: All, Mistakes, For Error Test, This is Fine, Correct */}
            <div className="flex flex-wrap rounded-xl bg-slate-100 p-1 gap-1 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => {
                  setFilterTab('ALL');
                  setCurrentIndex(0);
                }}
                className={`py-1 px-2 rounded-lg font-bold text-[10.5px] transition ${
                  filterTab === 'ALL'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All ({questions.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterTab('MISTAKES');
                  setCurrentIndex(0);
                }}
                className={`py-1 px-2 rounded-lg font-bold text-[10.5px] transition ${
                  filterTab === 'MISTAKES'
                    ? 'bg-white text-rose-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Mistakes ({mistakeQuestions.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterTab('CLASSIFIED_ERRORS');
                  setCurrentIndex(0);
                }}
                className={`py-1 px-2 rounded-lg font-bold text-[10.5px] transition ${
                  filterTab === 'CLASSIFIED_ERRORS'
                    ? 'bg-amber-500 text-slate-950 shadow-2xs'
                    : 'text-amber-800 hover:text-amber-950 font-semibold'
                }`}
                title="Questions with error classification checkboxes checked"
              >
                For Error Test ({eligibleErrorTestQuestions.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterTab('THIS_IS_FINE');
                  setCurrentIndex(0);
                }}
                className={`py-1 px-2 rounded-lg font-bold text-[10.5px] transition ${
                  filterTab === 'THIS_IS_FINE'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-teal-700 hover:text-teal-900 font-semibold'
                }`}
                title="Questions marked 'This is Fine' (excluded from Error Test)"
              >
                Fine ({fineQuestions.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterTab('CORRECT');
                  setCurrentIndex(0);
                }}
                className={`py-1 px-2 rounded-lg font-bold text-[10.5px] transition ${
                  filterTab === 'CORRECT'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Correct ({correctQuestions.length})
              </button>
            </div>

            {/* Quick Status Legend */}
            <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-600 pt-1 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex items-center justify-center text-[7px] text-white font-bold">✓</span>
                <span>Correct</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 flex items-center justify-center text-[7px] text-white font-bold">✗</span>
                <span>Incorrect</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Error Tagged (In Test)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                <span>This is Fine (Excluded)</span>
              </div>
            </div>

            {/* Question Buttons Grid */}
            <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-4 gap-2 max-h-72 overflow-y-auto p-1">
              {targetQuestions.map((q, idx) => {
                const note = errorNotesMap[q.id];
                const isSelected = idx === currentIndex;
                const ans = attempt.answers?.[q.id];
                const isQCorrect = Boolean(ans?.isCorrect);
                const isQAnswered = Boolean(
                  ans && (ans.selectedOptionId || (ans.numericalResponse !== undefined && ans.numericalResponse !== null))
                );
                const hasTags = (note?.selectedErrorTypes || []).filter(t => t !== 'THIS_IS_FINE').length > 0;
                const isFine = note?.thisIsFine;
                const hasNotes =
                  Boolean(note?.whatIMessed?.trim()) ||
                  Boolean(note?.whatILearned?.trim()) ||
                  Boolean(note?.importantNote?.trim()) ||
                  Boolean(note?.keyPoint?.trim()) ||
                  (note?.whatIMessedImages && note.whatIMessedImages.length > 0) ||
                  (note?.whatILearnedImages && note.whatILearnedImages.length > 0) ||
                  (note?.importantNoteImages && note.importantNoteImages.length > 0) ||
                  (note?.keyPointImages && note.keyPointImages.length > 0);

                // Find original question number across test
                const qNum = questions.findIndex(item => item.id === q.id) + 1 || idx + 1;

                let btnClass = 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
                if (isSelected) {
                  btnClass = 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-300 font-black';
                } else if (isFine) {
                  btnClass = 'bg-teal-50 text-teal-800 border-teal-300 font-bold';
                } else if (hasTags) {
                  btnClass = 'bg-amber-50 text-amber-900 border-amber-300 font-bold';
                } else if (hasNotes) {
                  btnClass = 'bg-indigo-50 text-indigo-800 border-indigo-200 font-bold';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => handleJumpToQuestion(idx)}
                    className={`h-11 rounded-xl border text-xs flex flex-col items-center justify-center relative transition ${btnClass}`}
                  >
                    <div className="flex items-center gap-0.5">
                      <span className="font-bold">{qNum}</span>
                      {/* Status indicator dot */}
                      {isQCorrect ? (
                        <span className={`text-[8px] font-black ${isSelected ? 'text-emerald-300' : 'text-emerald-600'}`}>✓</span>
                      ) : isQAnswered ? (
                        <span className={`text-[8px] font-black ${isSelected ? 'text-rose-300' : 'text-rose-600'}`}>✗</span>
                      ) : (
                        <span className={`text-[8px] font-black ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>–</span>
                      )}
                    </div>
                    <span className="text-[9px] uppercase tracking-tighter opacity-80">
                      {q.subject?.[0] || 'Q'}
                    </span>
                    {hasTags && !isFine && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-1 ring-white" title="Classified for Error Test" />
                    )}
                    {isFine && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-teal-500 rounded-full ring-1 ring-white" title="Marked This is Fine" />
                    )}
                    {hasNotes && (
                      <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-indigo-500 rounded-full ring-1 ring-white" title="Has written notes" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Remedial Action Box */}
          <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-2xl p-4 border border-indigo-700/50 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-200">
                  Continuous Loop Actions
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold">
                {eligibleErrorTestQuestions.length} in Test
              </span>
            </div>

            {/* Loop Status Metrics */}
            <div className="space-y-1.5 bg-white/5 p-2.5 rounded-xl border border-white/10 text-[11px]">
              <div className="flex items-center justify-between text-amber-300 font-bold">
                <span>Classified Error Qs:</span>
                <span>{eligibleErrorTestQuestions.length}</span>
              </div>
              <div className="flex items-center justify-between text-teal-300 font-medium">
                <span>Marked &ldquo;This is Fine&rdquo;:</span>
                <span>{fineQuestions.length} (Excluded)</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Unclassified Mistakes:</span>
                <span>{unclassifiedMistakes.length}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {eligibleErrorTestQuestions.length > 0 ? (
                <button
                  onClick={() => onLaunchErrorCorrectTest(eligibleErrorTestQuestions.map(q => q.id))}
                  className="w-full py-3 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Start Error Correct Test ({eligibleErrorTestQuestions.length} Qs)</span>
                </button>
              ) : unclassifiedMistakes.length === 0 && mistakeQuestions.length > 0 ? (
                <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-center space-y-1 text-emerald-200 text-xs">
                  <div className="font-bold flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Mastery Loop Complete!</span>
                  </div>
                  <p className="text-[10px] text-emerald-300/80">
                    All mistakes are marked &ldquo;This is Fine&rdquo;. No remedial test needed!
                  </p>
                </div>
              ) : (
                <div className="p-2.5 bg-amber-950/50 border border-amber-500/30 rounded-xl text-center text-amber-200/90 text-[11px]">
                  <span>Check error classification boxes on mistakes to generate your Error Correct Test.</span>
                </div>
              )}

              <button
                onClick={() => handleTriggerPDF(false)}
                className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-300" />
                <span>Generate Revision PDF</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Right Side: Main Question & Error Classification Studio */}
        <main className="flex-1 space-y-6">
          {currentQ && (
            <>
              {/* Question Header & Time Analysis Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                {/* Top Row: Q Number, Subject, Result Badge & Time Stats */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-3 py-1 rounded-xl bg-slate-900 text-white text-xs font-black">
                      Question {originalQuestionNumber}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                      {currentQ.subject || 'GENERAL'}
                    </span>
                    
                    {/* Status Badge */}
                    {isCorrectStudent ? (
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Correct (+{currentQ.marks || 4})
                      </span>
                    ) : isAnsweredStudent ? (
                      <span className="px-2.5 py-0.5 rounded-lg bg-rose-100 text-rose-800 text-xs font-extrabold border border-rose-300 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        Incorrect ({currentQ.negativeMarks ? '-' + currentQ.negativeMarks : 0})
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                        Unattempted (0)
                      </span>
                    )}
                  </div>

                  {/* Time Analysis Component */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-slate-500">Your Time:</span>
                      <strong className="text-slate-900">{formatSeconds(actualTimeSeconds)}</strong>
                      <span className="text-slate-400">|</span>
                      <span className="text-slate-500">Recommended:</span>
                      <strong className="text-slate-700">{formatSeconds(recommendedTimeSeconds)}</strong>
                    </div>

                    {isOverTime ? (
                      <span className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 text-[11px] font-black border border-rose-200 flex items-center gap-1">
                        ⚠️ +{timeDifferenceSeconds}s Over
                      </span>
                    ) : isRushed ? (
                      <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 text-[11px] font-black border border-amber-200 flex items-center gap-1">
                        ⚡ Rushed
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                        ⏱️ Optimal Pace
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Statement & Math */}
                <div className="space-y-4">
                  <div className="text-slate-900 text-sm sm:text-base leading-relaxed">
                    <MathRenderer content={currentQ.questionText} />
                  </div>

                  {/* Question Diagram / Image */}
                  {currentQ.questionImageUrl && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 inline-block">
                      <QuestionImage
                        src={currentQ.questionImageUrl}
                        alt="Question diagram"
                        className="max-h-64 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  {/* Numerical Question Handling */}
                  {currentQ.type === 'NUMERICAL' ? (
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Numerical Answer Details:
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="p-2.5 px-3 rounded-lg bg-white border border-slate-200 flex items-center gap-2">
                          <span className="text-slate-500 font-semibold">Your Entered Answer:</span>
                          <span className={`font-black ${isCorrectStudent ? 'text-emerald-700' : isAnsweredStudent ? 'text-rose-700' : 'text-slate-500'}`}>
                            {studentAns?.numericalResponse !== undefined && studentAns?.numericalResponse !== null
                              ? studentAns.numericalResponse
                              : 'Unattempted'}
                          </span>
                        </div>
                        <div className="p-2.5 px-3 rounded-lg bg-emerald-50 border border-emerald-300 flex items-center gap-2">
                          <span className="text-emerald-800 font-semibold">Official Answer Key:</span>
                          <span className="text-emerald-950 font-black">
                            {currentQ.numericalAnswer !== undefined && currentQ.numericalAnswer !== null
                              ? currentQ.numericalAnswer
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Options Comparison (Student vs Teacher Correct Key) */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                      {currentQ.options?.map((opt, oIdx) => {
                        const isStudentSelected = studentAns?.selectedOptionId === opt.id;
                        const isCorrectAnswer = currentQ.correctOptionId === opt.id;

                        let optStyle = 'bg-slate-50 border-slate-200 text-slate-700';
                        if (isCorrectAnswer) {
                          optStyle = 'bg-emerald-50/90 border-emerald-400 text-emerald-950 font-bold ring-1 ring-emerald-300';
                        } else if (isStudentSelected && !isCorrectAnswer) {
                          optStyle = 'bg-rose-50/90 border-rose-400 text-rose-950 font-bold line-through ring-1 ring-rose-300';
                        }

                        return (
                          <div
                            key={opt.id}
                            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition ${optStyle}`}
                          >
                            <span className="w-5 h-5 rounded-md bg-white border border-inherit shrink-0 flex items-center justify-center font-bold text-[11px]">
                              {opt.optionLabel || String.fromCharCode(65 + oIdx)}
                            </span>
                            <div className="flex-1">
                              <MathRenderer content={opt.optionText} />
                              {opt.optionImageUrl && (
                                <img
                                  src={opt.optionImageUrl}
                                  alt="Option visual"
                                  className="max-h-20 mt-1 rounded object-contain"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              {opt.optionSvgContent && (
                                <SafeSvgRenderer 
                                  svgContent={opt.optionSvgContent} 
                                  className="max-h-20 mt-1 rounded object-contain" 
                                />
                              )}
                            </div>
                            {isCorrectAnswer && (
                              <span className="px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black shrink-0">
                                {isStudentSelected ? '✓ Your Correct Key' : '✓ Correct Key'}
                              </span>
                            )}
                            {isStudentSelected && !isCorrectAnswer && (
                              <span className="px-1.5 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black shrink-0">
                                ✗ Your Choice
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Teacher Step-by-Step Solution Card */}
                {(currentQ.solutionText || currentQ.solutionImageUrl) && (
                  <div className="mt-4 p-4 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-emerald-300">
                        Official Solution & Method
                      </h4>
                    </div>
                    {currentQ.solutionText && (
                      <div className="text-xs sm:text-sm text-slate-200 leading-relaxed pt-1">
                        <MathRenderer content={currentQ.solutionText} />
                      </div>
                    )}
                    {currentQ.solutionImageUrl && (
                      <div className="mt-2 p-2 bg-slate-800 rounded-lg inline-block">
                        <img
                          src={currentQ.solutionImageUrl}
                          alt="Solution diagram"
                          className="max-h-56 rounded object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Error & Conceptual Tagging Matrix */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      {isCorrectStudent ? 'Question Nuances & Conceptual Tags' : 'Error Classification Matrix'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {isCorrectStudent
                        ? 'Tag any conceptual nuances, formula factors, or exam strategies (e.g. Lucky Guess, Time Pressure) for this question.'
                        : 'Select all error factors that contributed to getting this question wrong or unattempted.'}
                    </p>
                  </div>

                  {currentNote.thisIsFine && (
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Excluded from Error Test
                    </span>
                  )}
                </div>

                {/* Categories Grid */}
                <div className="space-y-4">
                  {ERROR_CATEGORIES_CONFIG.map(cat => (
                    <div key={cat.category} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-600">
                          {cat.title}
                        </span>
                        <div className="h-px flex-1 bg-slate-100" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {cat.items.map(item => {
                          const isChecked =
                            item.type === 'THIS_IS_FINE'
                              ? currentNote.thisIsFine
                              : (currentNote.selectedErrorTypes || []).includes(item.type);

                          return (
                            <label
                              key={item.type}
                              className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition ${
                                isChecked
                                  ? `${cat.badgeColor} ring-1 ring-offset-1 font-bold shadow-2xs`
                                  : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleErrorType(item.type)}
                                className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                              />
                              <div className="space-y-0.5">
                                <div className="text-xs font-bold">{item.label}</div>
                                <div className="text-[10px] opacity-80 leading-tight">
                                  {item.desc}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4 Student Learning & Revision Note Sections */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-6">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-black text-slate-900">
                    Student Revision & Error Learning Notes
                  </h3>
                  <p className="text-xs text-slate-500">
                    Write personal notes, capture key formulas, shortcut tricks, and upload diagrams. All notes will be compiled in your revision PDF.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* 1. What I Messed / Key Observation */}
                  <div className="space-y-2 p-3.5 bg-rose-50/40 rounded-xl border border-rose-200/70">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        {isCorrectStudent ? '1. Watchout / Tricky Observation' : '1. What I Messed'}
                      </label>
                      <label className="cursor-pointer px-2 py-1 bg-white hover:bg-rose-100/80 rounded-lg border border-rose-300 text-[11px] font-bold text-rose-700 flex items-center gap-1 shadow-2xs">
                        <Upload className="w-3 h-3" />
                        <span>Attach Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            if (e.target.files?.[0]) {
                              handleImageUpload('whatIMessedImages', e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                    </div>

                    <textarea
                      rows={3}
                      value={currentNote.whatIMessed || ''}
                      onChange={e => updateCurrentNote({ whatIMessed: e.target.value })}
                      placeholder={
                        isCorrectStudent
                          ? "e.g. Solved using shortcut formula; keep in mind the edge case when theta = 90 deg."
                          : "e.g. Substituted initial velocity as 0 instead of 10 m/s; missed reading the 'NOT' in question."
                      }
                      className="w-full p-2.5 text-xs text-slate-800 bg-white rounded-lg border border-rose-200 focus:ring-1 focus:ring-rose-400 focus:border-rose-400 outline-none leading-relaxed"
                    />

                    {/* Image Previews */}
                    {currentNote.whatIMessedImages?.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {currentNote.whatIMessedImages.map((imgUrl, iIdx) => (
                          <div key={iIdx} className="relative group">
                            <img
                              src={imgUrl}
                              alt="Observation visual"
                              className="w-16 h-16 object-cover rounded-lg border border-rose-300 shadow-2xs"
                            />
                            <button
                              onClick={() => handleRemoveImage('whatIMessedImages', iIdx)}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-xs"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 2. What I Learned / Alternative Method */}
                  <div className="space-y-2 p-3.5 bg-emerald-50/40 rounded-xl border border-emerald-200/70">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        2. What I Learned / Alternative Method
                      </label>
                      <label className="cursor-pointer px-2 py-1 bg-white hover:bg-emerald-100/80 rounded-lg border border-emerald-300 text-[11px] font-bold text-emerald-700 flex items-center gap-1 shadow-2xs">
                        <Upload className="w-3 h-3" />
                        <span>Attach Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            if (e.target.files?.[0]) {
                              handleImageUpload('whatILearnedImages', e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                    </div>

                    <textarea
                      rows={3}
                      value={currentNote.whatILearned || ''}
                      onChange={e => updateCurrentNote({ whatILearned: e.target.value })}
                      placeholder="e.g. Always draw the free-body diagram first before resolving normal reactions along the incline."
                      className="w-full p-2.5 text-xs text-slate-800 bg-white rounded-lg border border-emerald-200 focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 outline-none leading-relaxed"
                    />

                    {/* Image Previews */}
                    {currentNote.whatILearnedImages?.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {currentNote.whatILearnedImages.map((imgUrl, iIdx) => (
                          <div key={iIdx} className="relative group">
                            <img
                              src={imgUrl}
                              alt="What I learned visual"
                              className="w-16 h-16 object-cover rounded-lg border border-emerald-300 shadow-2xs"
                            />
                            <button
                              onClick={() => handleRemoveImage('whatILearnedImages', iIdx)}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-xs"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 3. Important Formula & Theory */}
                  <div className="space-y-2 p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-200/70">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        3. Key Formula & Theory
                      </label>
                      <label className="cursor-pointer px-2 py-1 bg-white hover:bg-indigo-100/80 rounded-lg border border-indigo-300 text-[11px] font-bold text-indigo-700 flex items-center gap-1 shadow-2xs">
                        <Upload className="w-3 h-3" />
                        <span>Attach Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            if (e.target.files?.[0]) {
                              handleImageUpload('importantNoteImages', e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                    </div>

                    <textarea
                      rows={3}
                      value={currentNote.importantNote || ''}
                      onChange={e => updateCurrentNote({ importantNote: e.target.value })}
                      placeholder="e.g. Standard formula: Work done W = -P_ext * (V2 - V1) for irreversible isothermal process."
                      className="w-full p-2.5 text-xs text-slate-800 bg-white rounded-lg border border-indigo-200 focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 outline-none leading-relaxed"
                    />

                    {/* Image Previews */}
                    {currentNote.importantNoteImages?.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {currentNote.importantNoteImages.map((imgUrl, iIdx) => (
                          <div key={iIdx} className="relative group">
                            <img
                              src={imgUrl}
                              alt="Important formula visual"
                              className="w-16 h-16 object-cover rounded-lg border border-indigo-300 shadow-2xs"
                            />
                            <button
                              onClick={() => handleRemoveImage('importantNoteImages', iIdx)}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-xs"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 4. Key Point / Shortcut Trick */}
                  <div className="space-y-2 p-3.5 bg-amber-50/40 rounded-xl border border-amber-200/70">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        4. Key Point / Shortcut Trick
                      </label>
                      <label className="cursor-pointer px-2 py-1 bg-white hover:bg-amber-100/80 rounded-lg border border-amber-300 text-[11px] font-bold text-amber-700 flex items-center gap-1 shadow-2xs">
                        <Upload className="w-3 h-3" />
                        <span>Attach Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            if (e.target.files?.[0]) {
                              handleImageUpload('keyPointImages', e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                    </div>

                    <textarea
                      rows={3}
                      value={currentNote.keyPoint || ''}
                      onChange={e => updateCurrentNote({ keyPoint: e.target.value })}
                      placeholder="e.g. Check dimension of the numerator before calculating. If units mismatch, rule out options A and C directly."
                      className="w-full p-2.5 text-xs text-slate-800 bg-white rounded-lg border border-amber-200 focus:ring-1 focus:ring-amber-400 focus:border-amber-400 outline-none leading-relaxed"
                    />

                    {/* Image Previews */}
                    {currentNote.keyPointImages?.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {currentNote.keyPointImages.map((imgUrl, iIdx) => (
                          <div key={iIdx} className="relative group">
                            <img
                              src={imgUrl}
                              alt="Key point visual"
                              className="w-16 h-16 object-cover rounded-lg border border-amber-300 shadow-2xs"
                            />
                            <button
                              onClick={() => handleRemoveImage('keyPointImages', iIdx)}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-xs"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Navigation & Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-white text-slate-700 font-bold text-xs shadow-2xs transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous Question</span>
                </button>

                <div className="flex flex-wrap items-center gap-3">
                  {eligibleErrorTestQuestions.length > 0 && (
                    <button
                      onClick={() => onLaunchErrorCorrectTest(eligibleErrorTestQuestions.map(q => q.id))}
                      className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Start Error Correct Test ({eligibleErrorTestQuestions.length} Qs)</span>
                    </button>
                  )}

                  {currentIndex < targetQuestions.length - 1 ? (
                    <button
                      onClick={handleNext}
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Save & Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleTriggerPDF(true)}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Review Complete (Generate PDF)</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};