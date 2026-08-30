import React, { useState, useEffect, useRef } from 'react';
import { Test, Question, SubjectType, TestValidationResult } from '../types';
import { api } from '../services/api';
import { QuestionEditor } from './QuestionEditor';
import { AnswerKeyMatrix } from './AnswerKeyMatrix';
import { ValidationBanner } from './ValidationBanner';
import { CBTInterface } from './CBTInterface';
import { MathRenderer } from '../utils/mathRenderer';
import {
  ArrowLeft,
  Layers,
  FileText,
  Key,
  Eye,
  Send,
  Plus,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  GripVertical,
  ChevronRight,
  Settings2,
  Trash2,
  X,
  Loader2,
} from 'lucide-react';

interface TestBuilderProps {
  testId: string;
  onBack: () => void;
  onPreviewCBT: (testId: string) => void;
}

export const TestBuilder: React.FC<TestBuilderProps> = ({ testId, onBack, onPreviewCBT }) => {
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'questions' | 'answer-key' | 'publish'>('questions');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<'SAVED' | 'SAVING' | 'IDLE'>('SAVED');
  const [lastSavedTime, setLastSavedTime] = useState<Date>(new Date());
  const [validation, setValidation] = useState<TestValidationResult>({ isValid: true, issues: [] });
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [selectedBulkSubject, setSelectedBulkSubject] = useState<SubjectType>('PHYSICS');

  // Deletion modal state
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
  const [isDeletingQuestion, setIsDeletingQuestion] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Drag and drop state
  const [draggedQId, setDraggedQId] = useState<string | null>(null);

  // Auto clear toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Fetch initial test data
  const loadTest = async () => {
    try {
      setLoading(true);
      const res = await api.tests.getById(testId);
      setTest(res.test);
      const qs = res.test.questions || res.questions || [];
      setQuestions(qs);
      if (qs.length > 0 && !selectedQuestionId) {
        setSelectedQuestionId(qs[0].id);
      }
      runValidation(testId);
    } catch (err) {
      console.error('Failed to load test', err);
    } finally {
      setLoading(false);
    }
  };

  const runValidation = async (tId: string) => {
    try {
      const val = await api.tests.validate(tId);
      setValidation(val);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    loadTest();
  }, [testId]);

  // Autosave question handler
  const handleUpdateQuestion = async (updatedQ: Question) => {
    setSaveStatus('SAVING');
    try {
      // Update local state first for instantaneous UI responsiveness
      setQuestions(prev => prev.map(q => (q.id === updatedQ.id ? updatedQ : q)));

      await api.questions.update(updatedQ.id, updatedQ);
      setSaveStatus('SAVED');
      setLastSavedTime(new Date());
      runValidation(testId);
    } catch (err) {
      console.error('Autosave failed', err);
      setSaveStatus('IDLE');
    }
  };

  // Add single question
  const handleAddQuestion = async (subject: SubjectType = 'PHYSICS') => {
    if (!test) return;
    setSaveStatus('SAVING');
    try {
      const res = await api.questions.add(test.id, { subject });
      const newQ = res.question;
      setQuestions(prev => {
        const updated = [...prev, newQ];
        if (test) {
          setTest({
            ...test,
            totalQuestions: updated.length,
            questionCount: updated.length,
          });
        }
        return updated;
      });
      setSelectedQuestionId(newQ.id);
      setSaveStatus('SAVED');
      setLastSavedTime(new Date());
      runValidation(testId);
      setToastMessage(`Added new ${subject} question.`);
    } catch (err) {
      alert('Failed to add question');
    }
  };

  // Bulk add questions (+5, +10, +25)
  const handleBulkAddQuestions = async (count: number) => {
    if (!test) return;
    setSaveStatus('SAVING');
    try {
      const res = await api.questions.bulkAdd(test.id, count, selectedBulkSubject);
      setQuestions(res.questions);
      if (test) {
        setTest({
          ...test,
          totalQuestions: res.questions.length,
          questionCount: res.questions.length,
        });
      }
      if (res.created.length > 0) {
        setSelectedQuestionId(res.created[0].id);
      }
      setSaveStatus('SAVED');
      setLastSavedTime(new Date());
      runValidation(testId);
      setToastMessage(`Added ${count} questions to ${selectedBulkSubject}.`);
    } catch (err) {
      alert('Failed to bulk add questions');
    }
  };

  // Initiate question deletion request (opens confirmation dialog)
  const handleRequestDeleteQuestion = (qOrId: Question | string) => {
    const targetQ = typeof qOrId === 'string' ? questions.find(q => q.id === qOrId) : qOrId;
    if (!targetQ) return;
    setQuestionToDelete(targetQ);
  };

  // Confirm and execute question deletion
  const handleConfirmDeleteQuestion = async () => {
    if (!questionToDelete) return;
    const targetQ = questionToDelete;
    const qId = targetQ.id;
    setIsDeletingQuestion(true);

    const deletedOrderIndex = targetQ.orderIndex;
    const currentIndex = questions.findIndex(q => q.id === qId);

    try {
      let updatedQuestions: Question[] = [];

      // Check if it's an unsaved local draft question
      if (qId.startsWith('temp_') || qId.startsWith('local_')) {
        updatedQuestions = questions
          .filter(q => q.id !== qId)
          .map((q, idx) => ({ ...q, orderIndex: idx + 1 }));
      } else {
        // Saved question - call API to delete from DB and reindex
        try {
          const res = await api.questions.delete(qId);
          if (res && Array.isArray(res.questions)) {
            updatedQuestions = res.questions;
          } else {
            updatedQuestions = questions
              .filter(q => q.id !== qId)
              .map((q, idx) => ({ ...q, orderIndex: idx + 1 }));
          }
        } catch (apiErr: any) {
          console.warn('Backend delete returned error or 404, cleaning local state:', apiErr);
          updatedQuestions = questions
            .filter(q => q.id !== qId)
            .map((q, idx) => ({ ...q, orderIndex: idx + 1 }));
        }
      }

      // Update questions state
      setQuestions(updatedQuestions);

      // Update parent test counts
      if (test) {
        setTest({
          ...test,
          totalQuestions: updatedQuestions.length,
          questionCount: updatedQuestions.length,
        });
      }

      // Adjust selected question ID
      if (selectedQuestionId === qId) {
        if (updatedQuestions.length === 0) {
          setSelectedQuestionId(null);
        } else {
          // Select neighboring question (same index or last item)
          const nextIndex = Math.min(currentIndex, updatedQuestions.length - 1);
          setSelectedQuestionId(updatedQuestions[nextIndex]?.id || null);
        }
      }

      setSaveStatus('SAVED');
      setLastSavedTime(new Date());
      runValidation(testId);
      setToastMessage(`Question Q${deletedOrderIndex} deleted successfully.`);
      setQuestionToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete question', err);
      setToastMessage('Failed to delete question. Please try again.');
    } finally {
      setIsDeletingQuestion(false);
    }
  };

  // Duplicate question
  const handleDuplicateQuestion = async (questionId: string) => {
    try {
      const res = await api.questions.duplicate(questionId);
      setQuestions(res.questions);
      if (test) {
        setTest({
          ...test,
          totalQuestions: res.questions.length,
          questionCount: res.questions.length,
        });
      }
      setSelectedQuestionId(res.question.id);
      runValidation(testId);
      setToastMessage(`Duplicated question as Q${res.question.orderIndex}.`);
    } catch (err) {
      alert('Failed to duplicate question');
    }
  };

  // Move Up / Move Down
  const handleMoveQuestion = async (qId: string, direction: 'UP' | 'DOWN') => {
    const idx = questions.findIndex(q => q.id === qId);
    if (idx === -1) return;
    if (direction === 'UP' && idx === 0) return;
    if (direction === 'DOWN' && idx === questions.length - 1) return;

    const newIdx = direction === 'UP' ? idx - 1 : idx + 1;
    const reordered = [...questions];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(newIdx, 0, moved);

    const orderedIds = reordered.map(q => q.id);
    setQuestions(reordered.map((q, i) => ({ ...q, orderIndex: i + 1 })));

    try {
      const res = await api.questions.reorder(testId, orderedIds);
      setQuestions(res.questions);
    } catch (e) {
      // rollback
    }
  };

  // Drag and drop reordering
  const handleDragStart = (qId: string) => {
    setDraggedQId(qId);
  };

  const handleDragOver = (e: React.DragEvent, targetQId: string) => {
    e.preventDefault();
  };

  const handleDrop = async (targetQId: string) => {
    if (!draggedQId || draggedQId === targetQId) {
      setDraggedQId(null);
      return;
    }

    const fromIdx = questions.findIndex(q => q.id === draggedQId);
    const toIdx = questions.findIndex(q => q.id === targetQId);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...questions];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    setQuestions(reordered.map((q, i) => ({ ...q, orderIndex: i + 1 })));
    setDraggedQId(null);

    try {
      const res = await api.questions.reorder(testId, reordered.map(q => q.id));
      setQuestions(res.questions);
    } catch (e) {
      // ignore
    }
  };

  // Update Test metadata
  const handleUpdateTestInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!test) return;
    try {
      const res = await api.tests.update(test.id, test);
      setTest(res.test);
      alert('Test details updated successfully.');
      runValidation(testId);
    } catch (err: any) {
      alert(err.message || 'Failed to update test details');
    }
  };

  // Publish / Unpublish
  const handlePublish = async () => {
    if (!test) return;
    setIsPublishing(true);
    try {
      const res = await api.tests.publish(test.id, test.status !== 'PUBLISHED');
      setTest(res.test);
      runValidation(test.id);
      alert(test.status === 'PUBLISHED' ? 'Test unpublished.' : 'Test published successfully! Students can now attempt it.');
    } catch (err: any) {
      alert(err.message || 'Validation failed. Please resolve all issues before publishing.');
      if (err.data?.validation) {
        setValidation(err.data.validation);
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const selectedQuestion = questions.find(q => q.id === selectedQuestionId) || questions[0];

  // Helper for question completeness
  const getQuestionStatus = (q: Question) => {
    const hasText = q.questionText && q.questionText.trim().length > 0;

    if (q.type === 'NUMERICAL') {
      const hasAnswer = typeof q.numericalAnswer === 'number' && !Number.isNaN(q.numericalAnswer);
      if (!hasText && !hasAnswer) return 'EMPTY'; // Grey
      if (hasText && hasAnswer) return 'COMPLETE'; // Green
      return 'INCOMPLETE'; // Yellow
    }

    const hasOptions = q.options && q.options.length >= 4 && q.options.every(o => o.optionText.trim().length > 0);
    const hasAnswer = Boolean(q.correctOptionId);

    if (!hasText && !hasAnswer) return 'EMPTY'; // Grey
    if (hasText && hasOptions && hasAnswer) return 'COMPLETE'; // Green
    return 'INCOMPLETE'; // Yellow
  };

  // Group questions by subject
  const subjects: SubjectType[] = ['PHYSICS', 'CHEMISTRY', 'MATHEMATICS', 'GENERAL'];

  if (loading || !test) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm">
        Loading Question Paper Builder...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Test Header & Navigation Tabs */}
      <header className="sticky top-16 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 uppercase tracking-wider">
                  {test.testType.replace(/_/g, ' ')}
                </span>
                <h1 className="text-base font-bold text-slate-900 tracking-tight">{test.title}</h1>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                <span>{questions.length} Questions</span>
                <span>•</span>
                <span>{test.durationMinutes} mins</span>
                <span>•</span>
                <span className="font-semibold text-slate-600">Status: {test.status}</span>
              </div>
            </div>
          </div>

          {/* Builder Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('questions')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'questions' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Questions ({questions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('answer-key')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'answer-key' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Answer Key</span>
            </button>

            <button
              onClick={() => setActiveTab('info')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'info' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Test Settings</span>
            </button>

            <button
              onClick={() => onPreviewCBT(test.id)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-indigo-600 hover:bg-white/80 transition"
              title="Preview CBT Student Interface"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-500" />
              <span>Preview CBT</span>
            </button>

            <button
              onClick={() => setActiveTab('publish')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'publish'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : test.status === 'PUBLISHED'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{test.status === 'PUBLISHED' ? 'Published ✓' : 'Publish'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Tab Views */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {/* QUESTIONS TAB: Visual Question Paper Builder */}
        {activeTab === 'questions' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Sidebar: Subject & Question Navigation with Drag & Drop */}
            <aside className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Question List</h3>
                  <span className="text-[11px] text-slate-400">Click to edit • Drag to reorder</span>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Done
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Incomplete
                  </span>
                </div>
              </div>

              {/* Questions grouped by Subject */}
              <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
                {subjects.map(sub => {
                  const subQuestions = questions.filter(q => q.subject === sub);
                  if (subQuestions.length === 0 && sub !== 'PHYSICS' && sub !== 'CHEMISTRY' && sub !== 'MATHEMATICS') return null;

                  return (
                    <div key={sub} className="space-y-1.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                          {sub} ({subQuestions.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddQuestion(sub)}
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-0.5"
                        >
                          + Add Q
                        </button>
                      </div>

                      <div className="space-y-1">
                        {subQuestions.map(q => {
                          const isSelected = q.id === selectedQuestionId;
                          const status = getQuestionStatus(q);

                          return (
                            <div
                              key={q.id}
                              draggable
                              onDragStart={() => handleDragStart(q.id)}
                              onDragOver={(e) => handleDragOver(e, q.id)}
                              onDrop={() => handleDrop(q.id)}
                              onClick={() => setSelectedQuestionId(q.id)}
                              className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition border ${
                                isSelected
                                  ? 'bg-indigo-50/80 border-indigo-400 text-indigo-900 shadow-2xs font-bold'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate mr-2">
                                <GripVertical className="w-3.5 h-3.5 text-slate-300 cursor-grab shrink-0" />
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    status === 'COMPLETE'
                                      ? 'bg-emerald-500'
                                      : status === 'INCOMPLETE'
                                      ? 'bg-amber-500'
                                      : 'bg-slate-300'
                                  }`}
                                />
                                <span className="font-bold shrink-0">Q{q.orderIndex}</span>
                                <span className="truncate text-slate-500 font-normal">
                                  {q.questionText ? q.questionText.slice(0, 28) + '...' : '(Empty question)'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  id={`delete-q-${q.id}-btn`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRequestDeleteQuestion(q);
                                  }}
                                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition opacity-80 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                                  title={`Delete Question Q${q.orderIndex}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-600' : 'text-slate-300'}`} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bulk Creation Section (Rapid Question Paper Generation) */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Rapid Bulk Add:</span>
                  <select
                    value={selectedBulkSubject}
                    onChange={(e) => setSelectedBulkSubject(e.target.value as SubjectType)}
                    className="text-[11px] font-bold px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700"
                  >
                    <option value="PHYSICS">Physics</option>
                    <option value="CHEMISTRY">Chemistry</option>
                    <option value="MATHEMATICS">Mathematics</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddQuestion(selectedBulkSubject)}
                    className="py-1.5 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition"
                  >
                    + Add 1 Question
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBulkAddQuestions(5)}
                    className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 transition"
                  >
                    + Add 5 Questions
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBulkAddQuestions(10)}
                    className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 transition"
                  >
                    + Add 10 Questions
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBulkAddQuestions(25)}
                    className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 transition"
                  >
                    + Add 25 Questions
                  </button>
                </div>
              </div>
            </aside>

            {/* Main Area: Visual Question Editor */}
            <main className="lg:col-span-8 space-y-4">
              {selectedQuestion ? (
                <QuestionEditor
                  key={selectedQuestion.id}
                  question={selectedQuestion}
                  totalQuestions={questions.length}
                  onUpdate={handleUpdateQuestion}
                  onDelete={() => handleRequestDeleteQuestion(selectedQuestion)}
                  onDuplicate={handleDuplicateQuestion}
                  onMoveUp={() => handleMoveQuestion(selectedQuestion.id, 'UP')}
                  onMoveDown={() => handleMoveQuestion(selectedQuestion.id, 'DOWN')}
                  saveStatus={saveStatus}
                  lastSavedText={lastSavedTime ? 'Saved recently' : undefined}
                />
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                  <Layers className="w-8 h-8 text-slate-400 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-800">No questions in this test</h3>
                  <p className="text-xs text-slate-500">Click the buttons on the left to add your first question.</p>
                  <button
                    onClick={() => handleAddQuestion('PHYSICS')}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-xs"
                  >
                    + Add Question 1
                  </button>
                </div>
              )}
            </main>
          </div>
        )}

        {/* ANSWER KEY TAB */}
        {activeTab === 'answer-key' && (
          <AnswerKeyMatrix
            questions={questions}
            onSelectOption={async (qId, optId) => {
              const targetQ = questions.find(q => q.id === qId);
              if (targetQ) {
                const updated = { ...targetQ, correctOptionId: optId };
                handleUpdateQuestion(updated);
              }
            }}
            onSetNumericalAnswer={async (qId, value) => {
              const targetQ = questions.find(q => q.id === qId);
              if (targetQ) {
                const updated = { ...targetQ, numericalAnswer: value };
                handleUpdateQuestion(updated);
              }
            }}
            onSelectQuestion={(qId) => {
              setSelectedQuestionId(qId);
              setActiveTab('questions');
            }}
          />
        )}

        {/* TEST SETTINGS / INFO TAB */}
        {activeTab === 'info' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-3xl mx-auto space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900">Test Configuration & Information</h2>
              <p className="text-xs text-slate-500 mt-1">
                Customize examination title, duration, subject mode, and standard JEE marking parameters.
              </p>
            </div>

            <form onSubmit={handleUpdateTestInfo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Test Title *
                </label>
                <input
                  type="text"
                  required
                  value={test.title}
                  onChange={(e) => setTest({ ...test, title: e.target.value })}
                  placeholder="e.g. JEE Main 2026 Mock Test 01 Full Syllabus"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Description / Syllabus
                </label>
                <textarea
                  rows={3}
                  value={test.description}
                  onChange={(e) => setTest({ ...test, description: e.target.value })}
                  placeholder="Provide syllabus details and instructions for students..."
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Test Type
                  </label>
                  <select
                    value={test.testType}
                    onChange={(e) => setTest({ ...test, testType: e.target.value as any })}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white"
                  >
                    <option value="JEE_MAIN_FULL">Full JEE Main Mock (PCM)</option>
                    <option value="PHYSICS">Physics Only</option>
                    <option value="CHEMISTRY">Chemistry Only</option>
                    <option value="MATHEMATICS">Mathematics Only</option>
                    <option value="CUSTOM">Custom Series</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Duration (Minutes) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="600"
                    required
                    value={test.durationMinutes}
                    onChange={(e) => setTest({ ...test, durationMinutes: Number(e.target.value) || 180 })}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Default Marks per Correct Question (+M)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={test.marksPerQuestion}
                    onChange={(e) => setTest({ ...test, marksPerQuestion: Number(e.target.value) || 4 })}
                    className="w-full px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Default Negative Marks per Incorrect Question (-N)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={test.negativeMarks}
                    onChange={(e) => setTest({ ...test, negativeMarks: Number(e.target.value) || 0 })}
                    className="w-full px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Candidate Instructions
                </label>
                <textarea
                  rows={4}
                  value={test.instructions}
                  onChange={(e) => setTest({ ...test, instructions: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        )}

        {/* PUBLISH & PRE-FLIGHT DIAGNOSTICS TAB */}
        {activeTab === 'publish' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base font-bold text-slate-900">Pre-Flight Publication Diagnostics</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Our system verifies that every question has complete statements, 4 options, and a valid correct answer key before going live.
                </p>
              </div>

              {/* Validation Banner */}
              <ValidationBanner
                validation={validation}
                onSelectQuestion={(qId) => {
                  setSelectedQuestionId(qId);
                  setActiveTab('questions');
                }}
                onPublish={handlePublish}
                isPublishing={isPublishing}
                isPublished={test.status === 'PUBLISHED'}
              />

              {/* Status Control Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-slate-800">Current Status: {test.status}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {test.status === 'PUBLISHED'
                      ? 'Students are currently able to view and attempt this test.'
                      : 'This test is private and visible only to teachers.'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={!validation.isValid && test.status !== 'PUBLISHED'}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition disabled:opacity-40 flex items-center gap-2 ${
                    test.status === 'PUBLISHED'
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{test.status === 'PUBLISHED' ? 'Unpublish Test' : 'Publish Test Live'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* IN-APP DELETE QUESTION CONFIRMATION MODAL */}
      {questionToDelete && (
        <div
          id="delete-question-modal-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => {
            if (!isDeletingQuestion) setQuestionToDelete(null);
          }}
        >
          <div
            id="delete-question-modal-content"
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">
                    Delete Question Q{questionToDelete.orderIndex}?
                  </h3>
                  <button
                    type="button"
                    onClick={() => setQuestionToDelete(null)}
                    disabled={isDeletingQuestion}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                    {questionToDelete.subject}
                  </span>
                  <span className="text-xs text-slate-500">
                    {questionToDelete.marks} Marks • -{questionToDelete.negativeMarks} Negative
                  </span>
                </div>
              </div>
            </div>

            {/* Question excerpt preview */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1 max-h-32 overflow-y-auto">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Question Statement</div>
              <div className="line-clamp-3 font-medium">
                {questionToDelete.questionText ? (
                  <MathRenderer content={questionToDelete.questionText} />
                ) : (
                  <span className="italic text-slate-400">Empty question statement</span>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete this question? This action will remove the question, and all subsequent questions in the test will be automatically renumbered.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                id="cancel-delete-question-btn"
                onClick={() => setQuestionToDelete(null)}
                disabled={isDeletingQuestion}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                id="confirm-delete-question-btn"
                onClick={handleConfirmDeleteQuestion}
                disabled={isDeletingQuestion}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeletingQuestion ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Question</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div
          id="test-builder-toast"
          className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};