import { Router } from 'express';
import { db } from '../db';
import { AuthRequest, requireAuth, requireTeacher, requireStudent } from '../auth';
import { TestAttempt, StudentAnswer, SubjectType, SubjectStat, QuestionAttemptStatus } from '../../src/types';
import { computeScoreBreakdown } from '../scoring';

export const attemptRouter = Router();

// Student starts or resumes a test
attemptRouter.post('/start', requireStudent, (req: AuthRequest, res) => {
  const { testId } = req.body;
  if (!testId) {
    return res.status(400).json({ error: 'testId is required.' });
  }

  const test = db.getTestById(testId);
  if (!test) {
    return res.status(404).json({ error: 'Test not found.' });
  }

  if (test.status !== 'PUBLISHED') {
    return res.status(400).json({ error: 'This test is currently not available for attempts.' });
  }

  const studentId = req.user!.id;
  let attempt = db.getActiveAttempt(studentId, testId);

  // Check if test was already submitted and re-attempts not started
  if (!attempt) {
    const attemptId = 'attempt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const questions = db.getQuestionsByTestId(testId);

    const initialAnswers: Record<string, StudentAnswer> = {};
    questions.forEach((q, idx) => {
      initialAnswers[q.id] = {
        questionId: q.id,
        selectedOptionId: undefined,
        status: idx === 0 ? 'NOT_ANSWERED' : 'NOT_VISITED',
        timeSpentSeconds: 0,
      };
    });

    attempt = {
      id: attemptId,
      testId,
      testTitle: test.title,
      testType: test.testType,
      durationMinutes: test.durationMinutes,
      studentId,
      studentName: req.user!.name,
      studentEmail: req.user!.email,
      startTime: new Date().toISOString(),
      timeTakenSeconds: 0,
      status: 'IN_PROGRESS',
      totalScore: 0,
      maxScore: questions.reduce((acc, q) => acc + q.marks, 0),
      totalCorrect: 0,
      totalIncorrect: 0,
      totalUnanswered: questions.length,
      accuracy: 0,
      answers: initialAnswers,
    };

    db.createAttempt(attempt);
  }

  // Calculate remaining time
  const startTimeMs = new Date(attempt.startTime).getTime();
  const maxDurationMs = test.durationMinutes * 60 * 1000;
  const elapsedMs = Date.now() - startTimeMs;
  const remainingSeconds = Math.max(0, Math.floor((maxDurationMs - elapsedMs) / 1000));

  // If time already expired, automatically submit
  if (remainingSeconds <= 0 && attempt.status === 'IN_PROGRESS') {
    return autoSubmitAttempt(attempt.id, res);
  }

  // Return test and attempt WITHOUT leaking correct answers or solutions
  const questions = db.getQuestionsByTestId(testId).map(q => ({
    ...q,
    correctOptionId: undefined,
    solutionText: undefined,
  }));

  return res.json({
    attempt,
    test: {
      ...test,
      questions,
    },
    remainingSeconds,
  });
});

// Resume specific attempt
attemptRouter.get('/:id/resume', requireStudent, (req: AuthRequest, res) => {
  const { id } = req.params;
  const attempt = db.getAttemptById(id);
  if (!attempt) {
    return res.status(404).json({ error: 'Attempt not found.' });
  }

  if (attempt.studentId !== req.user!.id) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  const test = db.getTestById(attempt.testId);
  if (!test) {
    return res.status(404).json({ error: 'Test not found.' });
  }

  const startTimeMs = new Date(attempt.startTime).getTime();
  const maxDurationMs = test.durationMinutes * 60 * 1000;
  const elapsedMs = Date.now() - startTimeMs;
  const remainingSeconds = Math.max(0, Math.floor((maxDurationMs - elapsedMs) / 1000));

  if (remainingSeconds <= 0 && attempt.status === 'IN_PROGRESS') {
    return autoSubmitAttempt(attempt.id, res);
  }

  const questions = db.getQuestionsByTestId(test.id).map(q => ({
    ...q,
    correctOptionId: undefined,
    solutionText: undefined,
  }));

  return res.json({
    attempt,
    test: {
      ...test,
      questions,
    },
    remainingSeconds,
  });
});

// Helper for auto-submitting expired attempts
function autoSubmitAttempt(attemptId: string, res: any) {
  const attempt = db.getAttemptById(attemptId);
  if (!attempt) return res.status(404).json({ error: 'Attempt not found.' });

  const test = db.getTestById(attempt.testId);
  if (!test) return res.status(404).json({ error: 'Test not found.' });

  const questions = db.getQuestionsByTestId(attempt.testId);
  const result = scoreAttempt(attempt, questions, test.durationMinutes * 60);
  db.updateAttempt(attemptId, result);

  return res.json({
    attempt: result,
    autoSubmitted: true,
    message: 'Time expired. Test was automatically submitted.',
  });
}

// Save answer heartbeat / status
attemptRouter.post('/:id/answer', requireStudent, (req: AuthRequest, res) => {
  const { id } = req.params;
  const attempt = db.getAttemptById(id);
  if (!attempt) {
    return res.status(404).json({ error: 'Attempt not found.' });
  }

  if (attempt.studentId !== req.user!.id) {
    return res.status(403).json({ error: 'Unauthorized attempt access.' });
  }

  if (attempt.status !== 'IN_PROGRESS') {
    return res.status(400).json({ error: 'Test has already been submitted.' });
  }

  const { questionId, selectedOptionId, numericalResponse, status, timeSpentSeconds } = req.body;
  if (!questionId) {
    return res.status(400).json({ error: 'questionId is required.' });
  }

  const currentAnswers = { ...attempt.answers };
  const hasNumerical = numericalResponse !== undefined && numericalResponse !== null;
  const hasAnswer = Boolean(selectedOptionId) || hasNumerical;
  
  currentAnswers[questionId] = {
    questionId,
    selectedOptionId: selectedOptionId || undefined,
    numericalResponse: hasNumerical ? Number(numericalResponse) : undefined,
    status: (status as QuestionAttemptStatus) || (hasAnswer ? 'ANSWERED' : 'NOT_ANSWERED'),
    timeSpentSeconds: Number(timeSpentSeconds) || 0,
  };

  const updated = db.updateAttempt(id, { answers: currentAnswers });
  return res.json({ success: true, answers: updated?.answers });
});

// Score computation algorithm
function scoreAttempt(attempt: TestAttempt, questions: any[], totalElapsedSeconds: number): TestAttempt {
  const breakdown = computeScoreBreakdown(attempt.answers, questions);

  return {
    ...attempt,
    submittedAt: new Date().toISOString(),
    timeTakenSeconds: totalElapsedSeconds,
    status: 'SUBMITTED',
    totalScore: breakdown.totalScore,
    maxScore: breakdown.maxScore,
    totalCorrect: breakdown.totalCorrect,
    totalIncorrect: breakdown.totalIncorrect,
    totalUnanswered: breakdown.totalUnanswered,
    accuracy: breakdown.accuracy,
    answers: breakdown.answers,
    subjectStats: breakdown.subjectStats,
  };
}

// Submit test attempt
attemptRouter.post('/:id/submit', requireStudent, (req: AuthRequest, res) => {
  const { id } = req.params;
  const attempt = db.getAttemptById(id);
  if (!attempt) {
    return res.status(404).json({ error: 'Attempt not found.' });
  }

  if (attempt.studentId !== req.user!.id) {
    return res.status(403).json({ error: 'Unauthorized attempt access.' });
  }

  if (attempt.status === 'SUBMITTED') {
    return res.json({ attempt, message: 'Test already submitted.' });
  }

  const { finalAnswers, timeTakenSeconds } = req.body;
  if (finalAnswers && typeof finalAnswers === 'object') {
    attempt.answers = { ...attempt.answers, ...finalAnswers };
  }

  const questions = db.getQuestionsByTestId(attempt.testId);
  const startTimeMs = new Date(attempt.startTime).getTime();
  const actualElapsedSec = Math.floor((Date.now() - startTimeMs) / 1000);
  const elapsed = timeTakenSeconds ? Number(timeTakenSeconds) : actualElapsedSec;

  const scored = scoreAttempt(attempt, questions, elapsed);
  db.updateAttempt(id, scored);

  const test = db.getTestById(attempt.testId);
  return res.json({ attempt: scored, test, questions, success: true });
});

// Get detailed result page with analysis and solutions
attemptRouter.get('/:id/result', requireAuth, (req: AuthRequest, res) => {
  const { id } = req.params;
  const attempt = db.getAttemptById(id);
  if (!attempt) {
    return res.status(404).json({ error: 'Attempt not found.' });
  }

  // Check authorization: must be the student or a teacher
  if (req.user!.role === 'STUDENT' && attempt.studentId !== req.user!.id) {
    return res.status(403).json({ error: 'Unauthorized access to this test result.' });
  }

  const test = db.getTestById(attempt.testId);
  const questions = db.getQuestionsByTestId(attempt.testId);

  return res.json({
    attempt,
    test,
    questions, // Full question info with correct answers & solutions
  });
});

// Get student's history of attempts
attemptRouter.get('/my-history', requireStudent, (req: AuthRequest, res) => {
  const attempts = db.getStudentAttempts(req.user!.id).filter(a => a.status === 'SUBMITTED');
  return res.json({ attempts });
});

// Teacher view of all results
attemptRouter.get('/teacher/all-results', requireTeacher, (req: AuthRequest, res) => {
  const { testId, search, sortBy } = req.query;
  let attempts = db.getAllAttempts().filter(a => a.status === 'SUBMITTED');

  if (testId) {
    attempts = attempts.filter(a => a.testId === testId);
  }

  if (search) {
    const q = (search as string).toLowerCase();
    attempts = attempts.filter(a =>
      (a.studentName && a.studentName.toLowerCase().includes(q)) ||
      (a.studentEmail && a.studentEmail.toLowerCase().includes(q)) ||
      (a.testTitle && a.testTitle.toLowerCase().includes(q))
    );
  }

  if (sortBy === 'score_desc') {
    attempts.sort((a, b) => b.totalScore - a.totalScore);
  } else if (sortBy === 'score_asc') {
    attempts.sort((a, b) => a.totalScore - b.totalScore);
  } else {
    // default date desc
    attempts.sort((a, b) => new Date(b.submittedAt || b.startTime).getTime() - new Date(a.submittedAt || a.startTime).getTime());
  }

  return res.json({ attempts });
});

// Teacher stats
attemptRouter.get('/teacher/stats', requireTeacher, (req: AuthRequest, res) => {
  const stats = db.getTeacherStats(req.user!.id);
  return res.json({ stats });
});

// --- ERROR NOTES ENDPOINTS ---

// Get error notes for an attempt
attemptRouter.get('/:id/error-notes', requireAuth, (req: AuthRequest, res) => {
  const { id } = req.params;
  const attempt = db.getAttemptById(id);
  if (!attempt) {
    return res.status(404).json({ error: 'Attempt not found.' });
  }

  // Authorization check
  if (req.user!.role === 'STUDENT' && attempt.studentId !== req.user!.id) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  const errorNotes = db.getErrorNotesByAttemptId(id);
  return res.json({ errorNotes: errorNotes || null });
});

// Auto-save error notes for an attempt
attemptRouter.put('/:id/error-notes', requireStudent, (req: AuthRequest, res) => {
  const { id } = req.params;
  const attempt = db.getAttemptById(id);
  if (!attempt) {
    return res.status(404).json({ error: 'Attempt not found.' });
  }

  if (attempt.studentId !== req.user!.id) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  const { notes, currentQuestionIndex, isFullyCompleted } = req.body;
  if (!notes || typeof notes !== 'object') {
    return res.status(400).json({ error: 'Invalid notes payload.' });
  }

  const saved = db.saveErrorNotes({
    attemptId: id,
    testId: attempt.testId,
    studentId: req.user!.id,
    currentQuestionIndex: Number(currentQuestionIndex) || 0,
    notes,
    isFullyCompleted: Boolean(isFullyCompleted),
  });

  return res.json({ success: true, errorNotes: saved });
});

// Create and start Error Correct Test
attemptRouter.post('/:id/create-error-correct-test', requireStudent, (req: AuthRequest, res) => {
  const { id } = req.params;
  const originalAttempt = db.getAttemptById(id);
  if (!originalAttempt) {
    return res.status(404).json({ error: 'Original attempt not found.' });
  }

  if (originalAttempt.studentId !== req.user!.id) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  const originalTest = db.getTestById(originalAttempt.testId);
  if (!originalTest) {
    return res.status(404).json({ error: 'Original test not found.' });
  }

  const errorNotes = db.getErrorNotesByAttemptId(id);
  const originalQuestions = db.getQuestionsByTestId(originalAttempt.testId);

  // Determine eligible questions
  // Questions that are in original attempt, but exclude those marked "THIS_IS_FINE"
  const { customQuestionIds } = req.body || {};

  let targetQuestions: any[] = [];

  if (Array.isArray(customQuestionIds) && customQuestionIds.length > 0) {
    targetQuestions = originalQuestions.filter(q => {
      if (!customQuestionIds.includes(q.id)) return false;
      const note = errorNotes?.notes?.[q.id];
      if (note?.thisIsFine) return false;
      return true;
    });
  } else if (errorNotes && Object.keys(errorNotes.notes || {}).length > 0) {
    // Pick questions with error notes where thisIsFine is false and has relevant error classifications
    const eligibleQIds = Object.entries(errorNotes.notes)
      .filter(([_, note]) => !note.thisIsFine && note.selectedErrorTypes && note.selectedErrorTypes.some((t: string) => t !== 'THIS_IS_FINE'))
      .map(([qId]) => qId);

    targetQuestions = originalQuestions.filter(q => eligibleQIds.includes(q.id));
  }

  if (targetQuestions.length === 0) {
    return res.status(400).json({
      error: 'No classified error questions found. Please classify questions with error checkboxes in Error Notes before generating the Error Correct Test (Questions marked "This is Fine" are excluded).',
    });
  }

  // Determine loop iteration title
  let remedialTitle = '';
  const originalTitle = originalTest.title || 'JEE Mock Test';
  const iterMatch = originalTitle.match(/\[Error Correct #?(\d*)\]/i);
  if (iterMatch) {
    const currentIter = parseInt(iterMatch[1] || '1', 10);
    const baseTitle = originalTitle.replace(/\[Error Correct\s*#?\d*\]\s*/i, '').trim();
    remedialTitle = `[Error Correct #${currentIter + 1}] ${baseTitle}`;
  } else {
    remedialTitle = `[Error Correct] ${originalTitle}`;
  }

  // Create a customized remedial test in database
  const newTestId = 'test_error_correct_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const durationMins = Math.max(5, Math.ceil(targetQuestions.length * 2.5));

  const errorCorrectTest = {
    id: newTestId,
    teacherId: originalTest.teacherId,
    teacherName: originalTest.teacherName || 'EduStack Adaptive System',
    title: remedialTitle,
    description: `Targeted practice test focusing on ${targetQuestions.length} mistakened questions from ${originalTest.title}.`,
    testType: originalTest.testType,
    durationMinutes: durationMins,
    totalQuestions: targetQuestions.length,
    marksPerQuestion: originalTest.marksPerQuestion || 4,
    negativeMarks: originalTest.negativeMarks || 1,
    instructions: 'This is an Error Correct Remedial Test. Re-solve your previous mistakes with full focus.',
    status: 'PUBLISHED' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.createTest(errorCorrectTest);

  // Clone questions with fresh IDs but link to the new test
  const newQuestions = targetQuestions.map((origQ, idx) => {
    const newQId = 'q_ec_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substring(2, 6);
    const newOptions = (origQ.options || []).map((opt: any) => ({
      ...opt,
      id: 'opt_ec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      questionId: newQId,
    }));

    let newCorrectId: string | undefined = undefined;
    if (origQ.correctOptionId) {
      const oldIdx = origQ.options.findIndex((o: any) => o.id === origQ.correctOptionId);
      if (oldIdx !== -1 && newOptions[oldIdx]) {
        newCorrectId = newOptions[oldIdx].id;
      }
    }

    const createdQ = {
      ...origQ,
      id: newQId,
      testId: newTestId,
      orderIndex: idx + 1,
      options: newOptions,
      correctOptionId: newCorrectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.createQuestion(createdQ);
    return createdQ;
  });

  // Create an active attempt for the student on this error test
  const attemptId = 'attempt_ec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const initialAnswers: Record<string, any> = {};
  newQuestions.forEach((q, idx) => {
    initialAnswers[q.id] = {
      questionId: q.id,
      selectedOptionId: undefined,
      status: idx === 0 ? 'NOT_ANSWERED' : 'NOT_VISITED',
      timeSpentSeconds: 0,
    };
  });

  const errorAttempt = {
    id: attemptId,
    testId: newTestId,
    testTitle: errorCorrectTest.title,
    testType: errorCorrectTest.testType,
    durationMinutes: errorCorrectTest.durationMinutes,
    studentId: req.user!.id,
    studentName: req.user!.name,
    studentEmail: req.user!.email,
    startTime: new Date().toISOString(),
    timeTakenSeconds: 0,
    status: 'IN_PROGRESS' as const,
    totalScore: 0,
    maxScore: newQuestions.reduce((acc, q) => acc + q.marks, 0),
    totalCorrect: 0,
    totalIncorrect: 0,
    totalUnanswered: newQuestions.length,
    accuracy: 0,
    answers: initialAnswers,
  };

  db.createAttempt(errorAttempt);

  // Return the active test & attempt for immediate CBT launch
  const sanitizedQuestions = newQuestions.map(q => ({
    ...q,
    correctOptionId: undefined,
    solutionText: undefined,
  }));

  return res.json({
    success: true,
    test: {
      ...errorCorrectTest,
      questions: sanitizedQuestions,
    },
    attempt: errorAttempt,
    remainingSeconds: durationMins * 60,
    originalAttemptId: id,
    targetQuestionCount: targetQuestions.length,
  });
});

// Get Improvement Comparison after Error Correct Test
attemptRouter.get('/:id/improvement-comparison', requireAuth, (req: AuthRequest, res) => {
  const { id } = req.params; // original attempt ID
  const { errorTestAttemptId } = req.query;

  const originalAttempt = db.getAttemptById(id);
  if (!originalAttempt) {
    return res.status(404).json({ error: 'Original attempt not found.' });
  }

  if (req.user!.role === 'STUDENT' && originalAttempt.studentId !== req.user!.id) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  const originalTest = db.getTestById(originalAttempt.testId);
  const originalQuestions = db.getQuestionsByTestId(originalAttempt.testId);
  const errorNotes = db.getErrorNotesByAttemptId(id);

  let errorAttempt: any = null;
  if (errorTestAttemptId) {
    errorAttempt = db.getAttemptById(errorTestAttemptId as string);
  } else {
    // Find latest submitted error correct attempt for this student
    const studentAttempts = db.getStudentAttempts(originalAttempt.studentId);
    errorAttempt = studentAttempts.find(
      a => a.status === 'SUBMITTED' && a.testTitle?.includes('[Error Correct]')
    );
  }

  if (!errorAttempt) {
    return res.status(404).json({ error: 'Error Correct Test attempt not found or not yet submitted.' });
  }

  const errorTestQuestions = db.getQuestionsByTestId(errorAttempt.testId);

  // Match questions between original and error test by comparing questionText
  const comparisonItems: any[] = [];
  let correctedCount = 0;
  let remainingCount = 0;
  const remainingQuestionIds: string[] = [];

  const errorTypeStats: Record<string, { original: number; corrected: number }> = {};

  for (const errorQ of errorTestQuestions) {
    // Find corresponding original question
    const origQ = originalQuestions.find(
      oq => oq.questionText.trim() === errorQ.questionText.trim()
    );

    const origAns = origQ ? originalAttempt.answers[origQ.id] : undefined;
    const errorAns = errorAttempt.answers[errorQ.id];

    const wasCorrectInOriginal = Boolean(origAns?.isCorrect);
    const wasCorrectInErrorTest = Boolean(errorAns?.isCorrect);

    if (wasCorrectInErrorTest) {
      correctedCount++;
    } else {
      remainingCount++;
      if (origQ) remainingQuestionIds.push(origQ.id);
    }

    const note = origQ && errorNotes?.notes[origQ.id];
    const tags = note?.selectedErrorTypes || [];

    // Track per-error-type improvements
    tags.forEach(t => {
      if (!errorTypeStats[t]) {
        errorTypeStats[t] = { original: 0, corrected: 0 };
      }
      errorTypeStats[t].original += 1;
      if (wasCorrectInErrorTest) {
        errorTypeStats[t].corrected += 1;
      }
    });

    comparisonItems.push({
      questionId: origQ?.id || errorQ.id,
      questionText: errorQ.questionText,
      subject: errorQ.subject,
      errorTypes: tags,
      wasCorrectInOriginal,
      wasCorrectInErrorTest,
      originalTimeSpent: origAns?.timeSpentSeconds || 0,
      errorTestTimeSpent: errorAns?.timeSpentSeconds || 0,
    });
  }

  const totalErrorsInSet = errorTestQuestions.length;
  const correctionPercentage =
    totalErrorsInSet > 0 ? Math.round((correctedCount / totalErrorsInSet) * 100) : 0;

  const originalTotalTime = comparisonItems.reduce((acc, c) => acc + c.originalTimeSpent, 0);
  const newTotalTime = comparisonItems.reduce((acc, c) => acc + c.errorTestTimeSpent, 0);
  const originalAvgTime = totalErrorsInSet > 0 ? Math.round(originalTotalTime / totalErrorsInSet) : 0;
  const newAvgTime = totalErrorsInSet > 0 ? Math.round(newTotalTime / totalErrorsInSet) : 0;
  const timeImprovementSeconds = originalAvgTime - newAvgTime;

  let status: 'IMPROVING' | 'NEEDS_PRACTICE' | 'NOT_IMPROVING' = 'NOT_IMPROVING';
  if (correctionPercentage >= 70) {
    status = 'IMPROVING';
  } else if (correctionPercentage >= 40) {
    status = 'NEEDS_PRACTICE';
  }

  const ERROR_LABELS: Record<string, { label: string; category: any }> = {
    CONCEPT_ERROR: { label: 'Concept Error', category: 'KNOWLEDGE' },
    DONT_KNOW_TOPIC: { label: "Don't Know Topic", category: 'KNOWLEDGE' },
    FORMULA_ERROR: { label: 'Formula Error', category: 'KNOWLEDGE' },
    FORGOT_CONCEPT: { label: 'Forgot Concept', category: 'KNOWLEDGE' },
    INCOMPLETE_KNOWLEDGE: { label: 'Incomplete Knowledge', category: 'KNOWLEDGE' },
    SILLY_MISTAKE: { label: 'Silly Mistake', category: 'EXECUTION' },
    CALCULATION_ERROR: { label: 'Calculation Error', category: 'EXECUTION' },
    WRONG_APPROACH: { label: 'Wrong Approach', category: 'EXECUTION' },
    QUESTION_MISUNDERSTOOD: { label: 'Question Misunderstood', category: 'EXECUTION' },
    OVERTHINKING: { label: 'Overthinking', category: 'EXECUTION' },
    TIME_PRESSURE: { label: 'Time Pressure', category: 'EXAM_STRATEGY' },
    GUESS_RANDOM: { label: 'Guess / Random Attempt', category: 'EXAM_STRATEGY' },
    THIS_IS_FINE: { label: 'This is Fine', category: 'SPECIAL' },
  };

  const typeBreakdown = Object.entries(errorTypeStats).map(([typeKey, stats]) => {
    const meta = ERROR_LABELS[typeKey] || { label: typeKey, category: 'KNOWLEDGE' };
    const rate = stats.original > 0 ? Math.round((stats.corrected / stats.original) * 100) : 0;
    return {
      errorType: typeKey as any,
      label: meta.label,
      category: meta.category,
      originalCount: stats.original,
      correctedCount: stats.corrected,
      correctionRate: rate,
    };
  });

  return res.json({
    comparison: {
      originalAttemptId: id,
      errorTestAttemptId: errorAttempt.id,
      originalTestTitle: originalTest?.title || 'JEE Mock Test',
      originalErrorsCount: totalErrorsInSet,
      correctedCount,
      remainingCount,
      correctionPercentage,
      originalAvgTimeSeconds: originalAvgTime,
      newAvgTimeSeconds: newAvgTime,
      timeImprovementSeconds,
      status,
      typeBreakdown,
      remainingQuestionIds,
      questionsComparison: comparisonItems,
    },
  });
});