import React, { useState, useEffect, useRef } from 'react';
import { User, Test, TestFolder, TestAttempt, TeacherStats, SubjectType, SubjectStat, StudentAnswer, AttemptErrorNotes } from './types';
import { api } from './services/api';
import { authService } from './services/authService';
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { AdminLoginPage } from './components/AdminLoginPage';
import { AccessStatusScreen } from './components/AccessStatusScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { TestBuilder } from './components/TestBuilder';
import { CreateTestModal } from './components/CreateTestModal';
import { TeacherResultsTable } from './components/TeacherResultsTable';
import { StudentDashboard } from './components/StudentDashboard';
import { CBTInterface } from './components/CBTInterface';
import { ResultAnalytics } from './components/ResultAnalytics';
import { ErrorNotesWorkspace } from './components/ErrorNotesWorkspace';
import { ImprovementComparison } from './components/ImprovementComparison';
import { ErrorNotesPDFModal } from './components/ErrorNotesPDFModal';
import { WhiteboardWorkspace } from './components/whiteboard/WhiteboardWorkspace';

// Separate, non-public Admin route. It is never linked from the normal Student/Teacher
// login page, and has no signup form (see FINAL REQUIREMENTS: Admin Login Must Be Separate).
const IS_ADMIN_ROUTE = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin-login');

type ViewMode =
  | 'TEACHER_DASHBOARD'
  | 'TEST_BUILDER'
  | 'TEACHER_RESULTS'
  | 'CBT_PREVIEW'
  | 'STUDENT_DASHBOARD'
  | 'CBT_ACTIVE'
  | 'STUDENT_RESULT'
  | 'ERROR_NOTES_WORKSPACE'
  | 'IMPROVEMENT_COMPARISON'
  | 'WHITEBOARD';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // True while we're checking Firebase's auth state / fetching the EduStack profile on
  // load. Distinct from `loading`, which is used for in-app data fetches further down.
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>('TEACHER_DASHBOARD');
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [studentActiveSection, setStudentActiveSection] = useState<'AVAILABLE_TESTS' | 'MOCK_ANALYSIS' | 'TODO_PLANNER'>('AVAILABLE_TESTS');

  // Data states
  const [tests, setTests] = useState<Test[]>([]);
  const [folders, setFolders] = useState<TestFolder[]>([]);
  const [teacherStats, setTeacherStats] = useState<TeacherStats>({
    totalTests: 0,
    publishedTests: 0,
    draftTests: 0,
    totalStudents: 0,
    totalAttempts: 0,
  });
  const [studentAttempts, setStudentAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  // Which folder "Create Test" should place the new test into (set from the Teacher
  // Dashboard's current folder before opening the modal, consumed in handleCreateTest).
  const [pendingFolderId, setPendingFolderId] = useState<string | null>(null);

  // Active CBT state
  const [activeCBTData, setActiveCBTData] = useState<{
    test: Test;
    attempt: TestAttempt;
    remainingSeconds: number;
    parentAttemptId?: string;
  } | null>(null);

  // Active Result State
  const [activeResultData, setActiveResultData] = useState<{
    attempt: TestAttempt;
    test: Test;
    questions: any[];
  } | null>(null);

  // Error notes & Improvement comparison states
  const [errorNotesQuestionId, setErrorNotesQuestionId] = useState<string | undefined>(undefined);
  const [comparisonIds, setComparisonIds] = useState<{
    originalAttemptId: string;
    errorTestAttemptId?: string;
  } | null>(null);
  const [pdfModalData, setPdfModalData] = useState<{
    attempt: TestAttempt;
    test: Test;
    questions: any[];
    errorNotes: AttemptErrorNotes;
  } | null>(null);

  // Fetch the EduStack profile (role + status) for the currently signed-in Firebase user.
  // This is always derived from the backend's verification of the live Firebase ID token -
  // never trusted from anything cached client-side.
  const refreshProfile = async () => {
    try {
      const res = await api.auth.me();
      setCurrentUser(res.user);
      if (res.user.role === 'TEACHER') {
        setViewMode('TEACHER_DASHBOARD');
      } else if (res.user.role === 'STUDENT') {
        setViewMode('STUDENT_DASHBOARD');
      }
    } catch (e) {
      console.error('Failed to load user profile', e);
      setCurrentUser(null);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (currentUser?.role === 'TEACHER') {
        const [testsRes, statsRes, foldersRes] = await Promise.all([
          api.tests.getAll(),
          api.tests.getTeacherStats(),
          api.folders.getAll(),
        ]);
        setTests(testsRes.tests || []);
        if (statsRes) setTeacherStats(statsRes);
        setFolders(foldersRes.folders || []);
      } else if (currentUser?.role === 'STUDENT') {
        const [testsRes, attemptsRes] = await Promise.all([
          api.tests.getAll(),
          api.attempts.getStudentAttempts(),
        ]);
        setTests(testsRes.tests || []);
        setStudentAttempts(attemptsRes?.attempts || []);
      }
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  // Listen for Firebase Authentication state changes. This is the single source of truth
  // for "is anyone signed in" - there is no local role switching or demo-account bypass.
  //
  // hasCheckedOnce guards against flipping authChecking (and therefore unmounting whatever
  // page is currently showing, e.g. LoginPage/AdminLoginPage mid-submit) on every
  // subsequent auth-state ping - only the very first check should show the full-page
  // "Loading EduStack..." state. Without this, a fresh sign-up/sign-in briefly wipes the
  // login form's local state (and any success/error message it was about to show) the
  // instant Firebase broadcasts the new session, before the page's own submit handler has
  // even finished.
  const hasCheckedOnce = useRef(false);
  useEffect(() => {
    const unsubscribe = authService.onAuthChange(async firebaseUser => {
      if (!hasCheckedOnce.current) {
        setAuthChecking(true);
      }
      if (firebaseUser) {
        await refreshProfile();
      } else {
        setCurrentUser(null);
      }
      hasCheckedOnce.current = true;
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser && (currentUser.role === 'TEACHER' || currentUser.role === 'STUDENT')) {
      loadData();
    }
  }, [currentUser?.role, currentUser?.id, currentUser?.status]);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      setCurrentUser(null);
    }
  };

  // Test Actions (Teacher)
  const handleCreateTest = async (testData: any) => {
    try {
      const res = await api.tests.create({ ...testData, folderId: pendingFolderId });
      await loadData();
      setActiveTestId(res.test.id);
      setViewMode('TEST_BUILDER');
      setPendingFolderId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to create test');
    }
  };

  // Test Folder Actions (Teacher)
  const handleCreateFolder = async (name: string, parentId: string | null) => {
    try {
      await api.folders.create(name, parentId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create folder');
    }
  };

  const handleRenameFolder = async (folderId: string, name: string) => {
    try {
      await api.folders.rename(folderId, name);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to rename folder');
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await api.folders.delete(folderId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete folder');
    }
  };

  const handleMoveFolder = async (folderId: string, parentId: string | null) => {
    try {
      await api.folders.move(folderId, parentId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to move folder');
    }
  };

  const handleMoveTest = async (testId: string, folderId: string | null) => {
    try {
      await api.tests.update(testId, { folderId } as any);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to move test');
    }
  };

  const handleEditTest = (testId: string) => {
    setActiveTestId(testId);
    setViewMode('TEST_BUILDER');
  };

  const handleDuplicateTest = async (testId: string) => {
    try {
      const res = await api.tests.duplicate(testId);
      await loadData();
      alert(`Test duplicated successfully as "${res.test.title}"`);
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate test');
    }
  };

  const handleTogglePublish = async (testId: string, currentStatus: string) => {
    try {
      const willPublish = currentStatus !== 'PUBLISHED';
      const res = await api.tests.publish(testId, willPublish);
      await loadData();
      alert(willPublish ? 'Test published successfully!' : 'Test moved to draft.');
    } catch (err: any) {
      alert(err.message || 'Validation failed. Ensure test has questions and correct answers.');
    }
  };

  const handleDeleteTest = async (testId: string) => {
    try {
      await api.tests.delete(testId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete test');
    }
  };

  // Teacher Preview CBT
  const handleTeacherPreview = async (testId: string) => {
    try {
      setLoading(true);
      const testRes = await api.tests.getById(testId);
      const questionsList = testRes.test.questions || testRes.questions || [];
      const createSubStat = (sub: SubjectType): SubjectStat => ({
        subject: sub,
        totalQuestions: 0,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        score: 0,
        maxScore: 0,
        accuracy: 0,
      });

      const fakeAttempt: TestAttempt = {
        id: 'preview_attempt_' + Date.now(),
        testId: testRes.test.id,
        studentId: currentUser?.id || 'preview_user',
        studentName: currentUser?.name || 'Faculty Previewer',
        status: 'IN_PROGRESS',
        startTime: new Date().toISOString(),
        timeTakenSeconds: 0,
        totalScore: 0,
        maxScore: (testRes.test.totalQuestions || questionsList.length || 75) * (testRes.test.marksPerQuestion || 4),
        totalCorrect: 0,
        totalIncorrect: 0,
        totalUnanswered: questionsList.length,
        accuracy: 0,
        answers: {},
        subjectStats: {
          PHYSICS: createSubStat('PHYSICS'),
          CHEMISTRY: createSubStat('CHEMISTRY'),
          MATHEMATICS: createSubStat('MATHEMATICS'),
          GENERAL: createSubStat('GENERAL'),
        },
      };

      setActiveCBTData({
        test: { ...testRes.test, questions: questionsList },
        attempt: fakeAttempt,
        remainingSeconds: (testRes.test.durationMinutes || 180) * 60,
      });
      setViewMode('CBT_PREVIEW');
    } catch (e: any) {
      alert(e.message || 'Failed to load test preview');
    } finally {
      setLoading(false);
    }
  };

  // Student Actions
  const handleStartStudentTest = async (testId: string) => {
    try {
      setLoading(true);
      const res = await api.attempts.start(testId);
      setActiveAttemptId(res.attempt.id);
      setActiveCBTData({
        test: res.test,
        attempt: res.attempt,
        remainingSeconds: res.remainingSeconds,
      });
      setViewMode('CBT_ACTIVE');
    } catch (e: any) {
      alert(e.message || 'Failed to start test');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeStudentTest = async (attemptId: string) => {
    try {
      setLoading(true);
      const res = await api.attempts.resume(attemptId);
      setActiveAttemptId(res.attempt.id);
      setActiveCBTData({
        test: res.test,
        attempt: res.attempt,
        remainingSeconds: res.remainingSeconds,
      });
      setViewMode('CBT_ACTIVE');
    } catch (e: any) {
      alert(e.message || 'Failed to resume test');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStudentAnswer = async (
    questionId: string,
    answerData: Partial<StudentAnswer>
  ) => {
    if (!activeAttemptId || viewMode === 'CBT_PREVIEW') return;
    try {
      await api.attempts.saveAnswer(activeAttemptId, {
        questionId,
        selectedOptionId: answerData.selectedOptionId ?? null,
        numericalResponse: answerData.numericalResponse ?? null,
        status: answerData.status,
        timeSpentSeconds: answerData.timeSpentSeconds || 0,
      });
    } catch (e) {
      console.error('Failed to sync answer state in background', e);
    }
  };

  const handleSubmitStudentTest = async (
    finalAnswers?: Record<string, StudentAnswer>,
    timeTakenSeconds?: number
  ) => {
    if (viewMode === 'CBT_PREVIEW') {
      if (activeTestId) setViewMode('TEST_BUILDER');
      else setViewMode('TEACHER_DASHBOARD');
      return;
    }

    if (!activeAttemptId) {
      alert('No active test attempt found.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.attempts.submit(activeAttemptId, finalAnswers, timeTakenSeconds);
      
      const parentAttemptId = activeCBTData?.parentAttemptId;
      if (parentAttemptId) {
        setComparisonIds({
          originalAttemptId: parentAttemptId,
          errorTestAttemptId: res.attempt.id,
        });
      }

      // After completing the Error Correct Test, it has the same full Analysis system as a normal test!
      setActiveResultData({
        attempt: res.attempt,
        test: res.test,
        questions: res.questions || [],
      });
      setViewMode('STUDENT_RESULT');
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to submit test');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPastResult = async (attemptId: string) => {
    try {
      setLoading(true);
      const res = await api.attempts.getResult(attemptId);
      setActiveResultData({
        attempt: res.attempt,
        test: res.test,
        questions: res.questions || [],
      });
      setViewMode('STUDENT_RESULT');
    } catch (e: any) {
      alert(e.message || 'Failed to load past result.');
    } finally {
      setLoading(false);
    }
  };

  // Open Error Notes Workspace
  const handleOpenErrorNotes = (questionId?: string) => {
    if (!activeResultData) return;
    setErrorNotesQuestionId(questionId);
    setViewMode('ERROR_NOTES_WORKSPACE');
  };

  // Launch created Error Correct Test from classified errors in Error Notes
  const handleLaunchErrorCorrectTest = async (customQuestionIds?: string[]) => {
    if (!activeResultData?.attempt) {
      alert('No active test attempt found.');
      return;
    }
    try {
      setLoading(true);
      const res = await api.errorNotes.createErrorCorrectTest(
        activeResultData.attempt.id,
        customQuestionIds
      );
      if (res.success && res.test && res.attempt) {
        setActiveAttemptId(res.attempt.id);
        setActiveCBTData({
          test: res.test,
          attempt: res.attempt,
          remainingSeconds: res.remainingSeconds,
          parentAttemptId: activeResultData.attempt.id,
        });
        setViewMode('CBT_ACTIVE');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to launch Error Correct Test');
    } finally {
      setLoading(false);
    }
  };

  // Open Improvement Comparison
  const handleOpenImprovementComparison = (originalAttemptId: string, errorTestAttemptId?: string) => {
    setComparisonIds({
      originalAttemptId,
      errorTestAttemptId,
    });
    setViewMode('IMPROVEMENT_COMPARISON');
  };

  // Practice Remaining Errors
  const handlePracticeRemaining = async (remainingQuestionIds: string[]) => {
    if (!comparisonIds?.originalAttemptId) return;
    try {
      setLoading(true);
      const res = await api.errorNotes.createErrorCorrectTest(
        comparisonIds.originalAttemptId,
        remainingQuestionIds
      );
      if (res?.test && res?.attempt) {
        setActiveAttemptId(res.attempt.id);
        setActiveCBTData({
          test: res.test,
          attempt: res.attempt,
          remainingSeconds: res.remainingSeconds,
          parentAttemptId: comparisonIds.originalAttemptId,
        });
        setViewMode('CBT_ACTIVE');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to start remedial practice');
    } finally {
      setLoading(false);
    }
  };

  // --- Auth gating -------------------------------------------------------------------
  // Nothing below this point renders until we know who (if anyone) is signed in.
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Loading EduStack...
      </div>
    );
  }

  if (!currentUser) {
    return IS_ADMIN_ROUTE ? (
      <AdminLoginPage onAuthenticated={refreshProfile} />
    ) : (
      <LoginPage onAuthenticated={refreshProfile} />
    );
  }

  // The /admin-login route only ever signs an Admin in; anyone else is bounced back.
  if (IS_ADMIN_ROUTE && currentUser.role !== 'ADMIN') {
    return <AdminLoginPage onAuthenticated={refreshProfile} />;
  }

  // Server-authorized status gating - a suspended/pending/rejected account never reaches
  // any dashboard, regardless of what the frontend thinks.
  const isAccessBlocked =
    (currentUser.role === 'TEACHER' && currentUser.status !== 'APPROVED') ||
    (currentUser.role === 'STUDENT' && currentUser.status !== 'ACTIVE') ||
    (currentUser.role === 'ADMIN' && currentUser.status !== 'ACTIVE');

  if (isAccessBlocked) {
    return <AccessStatusScreen user={currentUser} onLogout={handleLogout} />;
  }

  if (currentUser.role === 'ADMIN') {
    return <AdminDashboard currentUser={currentUser} onLogout={handleLogout} />;
  }
  // --- End auth gating -----------------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      {/* Hide global navbar inside active examination mode for strict focus */}
      {viewMode !== 'CBT_ACTIVE' && viewMode !== 'CBT_PREVIEW' && (
        <Navbar
          currentUser={currentUser}
          currentRole={currentUser?.role || 'STUDENT'}
          onLogout={handleLogout}
          activeTab={
            viewMode === 'TEACHER_DASHBOARD' || viewMode === 'TEST_BUILDER'
              ? 'tests'
              : viewMode === 'TEACHER_RESULTS'
              ? 'results'
              : viewMode === 'WHITEBOARD'
              ? 'whiteboard'
              : viewMode === 'STUDENT_DASHBOARD' && studentActiveSection === 'TODO_PLANNER'
              ? 'todo_planner'
              : viewMode === 'STUDENT_DASHBOARD' && studentActiveSection === 'MOCK_ANALYSIS'
              ? 'mock_analysis'
              : 'tests'
          }
          onTabChange={(tab) => {
            if (tab === 'whiteboard') {
              setViewMode('WHITEBOARD');
              return;
            }
            if (currentUser?.role === 'TEACHER') {
              if (tab === 'tests') setViewMode('TEACHER_DASHBOARD');
              else if (tab === 'results') setViewMode('TEACHER_RESULTS');
            } else {
              if (tab === 'todo_planner') {
                setStudentActiveSection('TODO_PLANNER');
                setViewMode('STUDENT_DASHBOARD');
              } else if (tab === 'mock_analysis') {
                setStudentActiveSection('MOCK_ANALYSIS');
                setViewMode('STUDENT_DASHBOARD');
              } else {
                setStudentActiveSection('AVAILABLE_TESTS');
                setViewMode('STUDENT_DASHBOARD');
              }
            }
          }}
        />
      )}

      {/* Primary Routing Render */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* SMART TEACHER / STUDENT WHITEBOARD (Kept mounted to preserve in-memory canvas state, layers, zoom, and active drawings) */}
        <div className={viewMode === 'WHITEBOARD' ? 'flex-1 flex flex-col min-h-0' : 'hidden'}>
          <WhiteboardWorkspace
            userRole={currentUser?.role || 'TEACHER'}
            userName={currentUser?.name}
            onBackToTestSeries={() => {
              if (currentUser?.role === 'TEACHER') setViewMode('TEACHER_DASHBOARD');
              else setViewMode('STUDENT_DASHBOARD');
            }}
          />
        </div>
        {/* TEACHER DASHBOARD */}
        {viewMode === 'TEACHER_DASHBOARD' && (
          <TeacherDashboard
            tests={tests}
            folders={folders}
            stats={teacherStats}
            onCreateTest={(folderId) => {
              setPendingFolderId(folderId ?? null);
              setIsCreateModalOpen(true);
            }}
            onEditTest={handleEditTest}
            onDuplicateTest={handleDuplicateTest}
            onPreviewTest={handleTeacherPreview}
            onViewResults={(testId) => {
              setViewMode('TEACHER_RESULTS');
            }}
            onTogglePublish={handleTogglePublish}
            onDeleteTest={handleDeleteTest}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            onMoveFolder={handleMoveFolder}
            onMoveTest={handleMoveTest}
            loading={loading}
          />
        )}

        {/* TEACHER QUESTION BUILDER */}
        {viewMode === 'TEST_BUILDER' && activeTestId && (
          <TestBuilder
            testId={activeTestId}
            onBack={() => {
              loadData();
              setViewMode('TEACHER_DASHBOARD');
            }}
            onPreviewCBT={handleTeacherPreview}
          />
        )}

        {/* TEACHER RESULTS TABLE */}
        {viewMode === 'TEACHER_RESULTS' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <TeacherResultsTable tests={tests} />
          </div>
        )}

        {/* STUDENT DASHBOARD */}
        {viewMode === 'STUDENT_DASHBOARD' && (
          <StudentDashboard
            tests={(tests || []).filter(t => t.status === 'PUBLISHED')}
            attempts={studentAttempts}
            onStartTest={handleStartStudentTest}
            onResumeTest={handleResumeStudentTest}
            onViewResult={handleViewPastResult}
            studentName={currentUser?.name || 'JEE Aspirant'}
            currentUser={currentUser || undefined}
            loading={loading}
            activeSection={studentActiveSection}
            onSectionChange={setStudentActiveSection}
          />
        )}

        {/* ACTIVE CBT TEST INTERFACE (Student Exam or Teacher Preview) */}
        {(viewMode === 'CBT_ACTIVE' || viewMode === 'CBT_PREVIEW') && activeCBTData && (
          <CBTInterface
            test={activeCBTData.test}
            attempt={activeCBTData.attempt}
            initialRemainingSeconds={activeCBTData.remainingSeconds}
            onSaveAnswer={handleSaveStudentAnswer}
            onSubmitTest={handleSubmitStudentTest}
            studentName={currentUser?.name || 'JEE Candidate'}
            isPreviewMode={viewMode === 'CBT_PREVIEW'}
            onClosePreview={() => {
              if (activeTestId) setViewMode('TEST_BUILDER');
              else setViewMode('TEACHER_DASHBOARD');
            }}
          />
        )}

        {/* STUDENT & TEACHER DETAILED RESULT ANALYSIS */}
        {viewMode === 'STUDENT_RESULT' && activeResultData && (
          <ResultAnalytics
            attempt={activeResultData.attempt}
            test={activeResultData.test}
            questions={activeResultData.questions || []}
            onBackToDashboard={() => {
              if (currentUser?.role === 'TEACHER') {
                setViewMode('TEACHER_DASHBOARD');
              } else {
                setViewMode('STUDENT_DASHBOARD');
              }
            }}
            onMakeErrorNotes={handleOpenErrorNotes}
            onViewImprovementComparison={() =>
              handleOpenImprovementComparison(activeResultData.attempt.id)
            }
            isStudent={currentUser?.role === 'STUDENT'}
          />
        )}

        {/* ERROR NOTES WORKSPACE */}
        {viewMode === 'ERROR_NOTES_WORKSPACE' && activeResultData && (
          <ErrorNotesWorkspace
            attempt={activeResultData.attempt}
            test={activeResultData.test}
            questions={activeResultData.questions || []}
            initialQuestionId={errorNotesQuestionId}
            onBack={() => setViewMode('STUDENT_RESULT')}
            onLaunchErrorCorrectTest={handleLaunchErrorCorrectTest}
            onOpenPDF={(notes) => {
              setPdfModalData({
                attempt: activeResultData.attempt,
                test: activeResultData.test,
                questions: activeResultData.questions || [],
                errorNotes: notes,
              });
            }}
          />
        )}

        {/* IMPROVEMENT COMPARISON */}
        {viewMode === 'IMPROVEMENT_COMPARISON' && comparisonIds && (
          <ImprovementComparison
            originalAttemptId={comparisonIds.originalAttemptId}
            errorTestAttemptId={comparisonIds.errorTestAttemptId}
            onBackToAnalytics={() => {
              if (activeResultData) {
                setViewMode('STUDENT_RESULT');
              } else {
                handleViewPastResult(comparisonIds.originalAttemptId);
              }
            }}
            onBackToDashboard={() => setViewMode('STUDENT_DASHBOARD')}
            onPracticeRemaining={handlePracticeRemaining}
            onOpenPDF={() => {
              if (activeResultData) {
                handleOpenErrorNotes();
              }
            }}
          />
        )}
      </div>

      {/* Error Notes Printable PDF Modal */}
      {pdfModalData && (
        <ErrorNotesPDFModal
          attempt={pdfModalData.attempt}
          test={pdfModalData.test}
          questions={pdfModalData.questions}
          errorNotes={pdfModalData.errorNotes}
          onClose={() => setPdfModalData(null)}
        />
      )}

      {/* Create Test Modal */}
      <CreateTestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTest}
      />
    </div>
  );
}
