import React, { useState } from 'react';
import { Test, TestAttempt, User } from '../types';
import { AttemptedMockAnalysis } from './AttemptedMockAnalysis';
import { TodoPlannerWorkspace } from './planner/TodoPlannerWorkspace';
import {
  BookOpen,
  Clock,
  Layers,
  Award,
  CheckCircle2,
  Play,
  RotateCcw,
  Eye,
  TrendingUp,
  Target,
  Search,
  Filter,
  AlertCircle,
  HelpCircle,
  X,
  BarChart3,
  Sparkles,
  CalendarCheck,
} from 'lucide-react';

interface StudentDashboardProps {
  tests: Test[];
  attempts: TestAttempt[];
  onStartTest: (testId: string) => void;
  onResumeTest: (attemptId: string) => void;
  onViewResult: (attemptId: string) => void;
  studentName: string;
  currentUser?: User;
  loading?: boolean;
  activeSection?: 'AVAILABLE_TESTS' | 'MOCK_ANALYSIS' | 'TODO_PLANNER';
  onSectionChange?: (section: 'AVAILABLE_TESTS' | 'MOCK_ANALYSIS' | 'TODO_PLANNER') => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  tests = [],
  attempts = [],
  onStartTest,
  onResumeTest,
  onViewResult,
  studentName,
  currentUser,
  loading = false,
  activeSection: controlledSection,
  onSectionChange,
}) => {
  const [internalSection, setInternalSection] = useState<'AVAILABLE_TESTS' | 'MOCK_ANALYSIS' | 'TODO_PLANNER'>('AVAILABLE_TESTS');
  const currentSection = controlledSection || internalSection;

  const handleSetSection = (sec: 'AVAILABLE_TESTS' | 'MOCK_ANALYSIS' | 'TODO_PLANNER') => {
    if (onSectionChange) {
      onSectionChange(sec);
    } else {
      setInternalSection(sec);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('ALL');
  const [instructionsTest, setInstructionsTest] = useState<Test | null>(null);

  const safeAttempts = attempts || [];
  const safeTests = tests || [];

  // Group latest attempts by testId
  const attemptsByTestId: Record<string, TestAttempt> = {};
  safeAttempts.forEach(att => {
    if (!attemptsByTestId[att.testId] || (att.submittedAt && !attemptsByTestId[att.testId].submittedAt)) {
      attemptsByTestId[att.testId] = att;
    }
  });

  const completedAttempts = safeAttempts.filter(a => a.status === 'SUBMITTED');
  const completedTestIds = new Set(completedAttempts.map(a => a.testId));
  const totalCompleted = completedAttempts.length;

  // In the All Tests section, show ONLY unattempted tests (or in-progress)
  const unattemptedTests = safeTests.filter(t => !completedTestIds.has(t.id));

  const filteredTests = unattemptedTests.filter(t => {
    if (searchTerm && !t.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (selectedSubjectFilter !== 'ALL' && t.testType !== selectedSubjectFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Primary Section Switcher Tabs */}
      <div className="bg-slate-900 border-b border-slate-800 shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 py-3 overflow-x-auto">
            <button
              onClick={() => handleSetSection('AVAILABLE_TESTS')}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                currentSection === 'AVAILABLE_TESTS'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Available Tests (Not Attempted)</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                currentSection === 'AVAILABLE_TESTS' ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
              }`}>
                {unattemptedTests.length}
              </span>
            </button>

            <button
              onClick={() => handleSetSection('MOCK_ANALYSIS')}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                currentSection === 'MOCK_ANALYSIS'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>Mock Test Analysis & History</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                currentSection === 'MOCK_ANALYSIS' ? 'bg-white/20 text-white' : 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
              }`}>
                {totalCompleted}
              </span>
            </button>

            <button
              onClick={() => handleSetSection('TODO_PLANNER')}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                currentSection === 'TODO_PLANNER'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
              }`}
            >
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Todo & Time Planner</span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </button>
          </div>
        </div>
      </div>

      {/* 1. Dedicated Todo & Time Planner Section (Kept mounted to maintain active timer state across section switches) */}
      <div className={currentSection === 'TODO_PLANNER' ? 'block' : 'hidden'}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <TodoPlannerWorkspace
            currentUser={currentUser || {
              id: 'user_student_1',
              name: studentName || 'Student',
              email: 'student@edustack.com',
              role: 'STUDENT',
              createdAt: new Date().toISOString(),
            }}
          />
        </div>
      </div>

      {/* 2. Mock Analysis Section */}
      {currentSection === 'MOCK_ANALYSIS' && (
        <AttemptedMockAnalysis
          tests={safeTests}
          attempts={safeAttempts}
          onViewResult={onViewResult}
          onRetakeTest={(testId) => {
            const foundTest = safeTests.find(t => t.id === testId);
            if (foundTest) {
              setInstructionsTest(foundTest);
            } else {
              onStartTest(testId);
            }
          }}
          onGoToAvailableTests={() => handleSetSection('AVAILABLE_TESTS')}
          studentName={studentName}
        />
      )}

      {/* 3. Available Mock Tests Catalog Section (ONLY Unattempted Tests) */}
      {currentSection === 'AVAILABLE_TESTS' && (
        <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Welcome Banner for Tests Catalog */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-lg border border-indigo-700/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 bg-white/10 px-3 py-1 rounded-full">
                NTA JEE Main Pattern Mock Tests
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome, {studentName}
              </h1>
              <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
                Take timed Computer-Based Tests (CBT) under official NTA exam conditions with authentic question palettes and automatic evaluation.
              </p>
            </div>

            {/* Quick Test Counts Badge */}
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 text-center min-w-[160px]">
              <div className="text-2xl sm:text-3xl font-black text-white">{unattemptedTests.length}</div>
              <div className="text-[10px] sm:text-xs text-indigo-200 font-semibold uppercase tracking-wider">Unattempted Tests</div>
            </div>
          </div>

          {/* Tests Catalog Header & Search */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Unattempted Mock Tests</h2>
                <p className="text-xs text-slate-500">Select any test below to start your timed online examination.</p>
              </div>

              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search unattempted tests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Subject Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { id: 'ALL', label: 'All Unattempted' },
                { id: 'JEE_MAIN_FULL', label: 'Full Syllabus (PCM)' },
                { id: 'PHYSICS', label: 'Physics' },
                { id: 'CHEMISTRY', label: 'Chemistry' },
                { id: 'MATHEMATICS', label: 'Mathematics' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedSubjectFilter(f.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                    selectedSubjectFilter === f.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Tests Cards Grid */}
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-500">Loading mock tests...</div>
            ) : filteredTests.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                {unattemptedTests.length === 0 ? (
                  <>
                    <h3 className="text-sm font-bold text-slate-800">All Available Tests Attempted!</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      You have attempted all published mock tests. Head over to the Mock Test Analysis section to inspect your scorecards, question solutions, and mistake notes.
                    </p>
                    <button
                      onClick={() => handleSetSection('MOCK_ANALYSIS')}
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>View Mock Test Analysis ({totalCompleted})</span>
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-bold text-slate-800">No matching unattempted tests</h3>
                    <p className="text-xs text-slate-500">
                      No unattempted mock tests match your current search or subject filter.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredTests.map((test) => {
                  const latestAttempt = attemptsByTestId[test.id];
                  const isInProgress = latestAttempt?.status === 'IN_PROGRESS';
                  const qCount = test.questionCount || test.totalQuestions || test.questions?.length || 0;
                  const maxMarks = qCount * (test.marksPerQuestion || 4);

                  return (
                    <div
                      key={test.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200 uppercase tracking-wider">
                            {test.testType.replace(/_/g, ' ')}
                          </span>

                          {isInProgress ? (
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                              In Progress
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              Not Attempted
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-900 leading-snug">
                          {test.title}
                        </h3>

                        <p className="text-xs text-slate-500 line-clamp-2">
                          {test.description || 'Full JEE Main pattern mock examination with PCM sections.'}
                        </p>

                        {/* Metadata Badges */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                          <div className="text-center">
                            <div className="text-[10px] text-slate-400 font-semibold uppercase">Questions</div>
                            <div className="font-bold text-slate-800">{qCount} Qs</div>
                          </div>
                          <div className="text-center border-x border-slate-200">
                            <div className="text-[10px] text-slate-400 font-semibold uppercase">Time</div>
                            <div className="font-bold text-slate-800">{test.durationMinutes}m</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] text-slate-400 font-semibold uppercase">Max Marks</div>
                            <div className="font-bold text-slate-800">{maxMarks}</div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 flex items-center gap-2">
                        {isInProgress && latestAttempt ? (
                          <button
                            onClick={() => onResumeTest(latestAttempt.id)}
                            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Resume Test</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setInstructionsTest(test)}
                            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Start Test</span>
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
      )}

      {/* Pre-Test Instructions & Confirmation Modal */}
      {instructionsTest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{instructionsTest.title}</h3>
                  <span className="text-[11px] text-slate-500">Read instructions before starting</span>
                </div>
              </div>
              <button
                onClick={() => setInstructionsTest(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-60 overflow-y-auto font-sans">
              <p><strong>1. Duration:</strong> The total examination duration is <strong>{instructionsTest.durationMinutes} minutes</strong>.</p>
              <p><strong>2. Marking Scheme:</strong> +{instructionsTest.marksPerQuestion || 4} for correct answers, -{instructionsTest.negativeMarks || 1} for incorrect answers, and 0 for unattempted questions.</p>
              <p><strong>3. Palette Navigation:</strong> You can navigate to any question at any time using the Question Palette on the right.</p>
              <p><strong>4. Auto-Submission:</strong> Once the countdown timer ends, the test will be automatically submitted.</p>
              <p><strong>5. Result Analysis:</strong> Detailed solutions and answer keys will be made available immediately after submission.</p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInstructionsTest(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  const tId = instructionsTest.id;
                  setInstructionsTest(null);
                  onStartTest(tId);
                }}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>I am Ready to Begin</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
