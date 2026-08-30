import { Router } from 'express';
import { db } from '../db';
import { AuthRequest, requireTeacher, requireAuth } from '../auth';
import { Question, QuestionOption, SubjectType } from '../../src/types';
import { regradeSubmittedAttemptsForTest } from '../regrade';

export const questionRouter = Router();

// Helper to generate 4 default options
function generateDefaultOptions(questionId: string): QuestionOption[] {
  return [
    { id: 'opt_' + Date.now() + '_1_' + Math.random().toString(36).substring(2, 6), questionId, optionLabel: 'A', optionText: '', orderIndex: 1 },
    { id: 'opt_' + Date.now() + '_2_' + Math.random().toString(36).substring(2, 6), questionId, optionLabel: 'B', optionText: '', orderIndex: 2 },
    { id: 'opt_' + Date.now() + '_3_' + Math.random().toString(36).substring(2, 6), questionId, optionLabel: 'C', optionText: '', orderIndex: 3 },
    { id: 'opt_' + Date.now() + '_4_' + Math.random().toString(36).substring(2, 6), questionId, optionLabel: 'D', optionText: '', orderIndex: 4 },
  ];
}

// Add single question
questionRouter.post('/tests/:testId/questions', requireTeacher, (req: AuthRequest, res) => {
  const { testId } = req.params;
  const test = db.getTestById(testId);
  if (!test) {
    return res.status(404).json({ error: 'Test not found.' });
  }

  const {
    subject = 'PHYSICS',
    questionText = '',
    marks = test.marksPerQuestion || 4,
    negativeMarks = test.negativeMarks || 1,
    solutionText = '',
    questionImageUrl = '',
  } = req.body;

  const currentQuestions = db.getQuestionsByTestId(testId);
  const qId = 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const options = generateDefaultOptions(qId);

  const newQuestion: Question = {
    id: qId,
    testId,
    subject: (subject as SubjectType) || 'PHYSICS',
    orderIndex: currentQuestions.length + 1,
    questionText,
    questionImageUrl,
    marks: Number(marks) || 4,
    negativeMarks: Number(negativeMarks) || 1,
    solutionText,
    options,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.createQuestion(newQuestion);
  return res.status(201).json({ question: newQuestion });
});

// Bulk add questions (e.g. +5, +10, +25)
questionRouter.post('/tests/:testId/questions/bulk', requireTeacher, (req: AuthRequest, res) => {
  const { testId } = req.params;
  const test = db.getTestById(testId);
  if (!test) {
    return res.status(404).json({ error: 'Test not found.' });
  }

  const count = Math.min(Math.max(Number(req.body.count) || 1, 1), 50);
  const subject: SubjectType = req.body.subject || 'PHYSICS';
  const currentQuestions = db.getQuestionsByTestId(testId);
  let startIndex = currentQuestions.length;

  const createdQuestions: Question[] = [];

  for (let i = 0; i < count; i++) {
    startIndex++;
    const qId = 'q_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substring(2, 6);
    const options = generateDefaultOptions(qId);

    const newQ: Question = {
      id: qId,
      testId,
      subject,
      orderIndex: startIndex,
      questionText: '',
      marks: test.marksPerQuestion || 4,
      negativeMarks: test.negativeMarks || 1,
      solutionText: '',
      options,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.createQuestion(newQ);
    createdQuestions.push(newQ);
  }

  const allQuestions = db.getQuestionsByTestId(testId);
  return res.status(201).json({
    message: `Added ${count} questions successfully.`,
    created: createdQuestions,
    questions: allQuestions,
  });
});

// Update question (Autosave endpoint)
questionRouter.put('/questions/:id', requireTeacher, (req: AuthRequest, res) => {
  const { id } = req.params;
  const q = db.getQuestionById(id);
  if (!q) {
    return res.status(404).json({ error: 'Question not found.' });
  }

  const {
    type,
    numericalAnswer,
    subject,
    questionText,
    questionImageUrl,
    marks,
    negativeMarks,
    correctOptionId,
    solutionText,
    options,
  } = req.body;

  const updates: Partial<Question> = {};
  if (type !== undefined) updates.type = type;
  if (numericalAnswer !== undefined) updates.numericalAnswer = numericalAnswer === null ? undefined : Number(numericalAnswer);
  if (subject !== undefined) updates.subject = subject;
  if (questionText !== undefined) updates.questionText = questionText;
  if (questionImageUrl !== undefined) updates.questionImageUrl = questionImageUrl;
  if (marks !== undefined) updates.marks = Number(marks);
  if (negativeMarks !== undefined) updates.negativeMarks = Number(negativeMarks);
  if (correctOptionId !== undefined) updates.correctOptionId = correctOptionId;
  if (solutionText !== undefined) updates.solutionText = solutionText;
  if (options !== undefined && Array.isArray(options)) updates.options = options;

  // Snapshot the answer key BEFORE applying updates, so we know whether it actually changed
  const previousCorrectOptionId = q.correctOptionId;
  const previousNumericalAnswer = q.numericalAnswer;

  const updated = db.updateQuestion(id, updates);

  // If the correct answer changed AFTER students may have already taken the test, retroactively
  // re-score every already-submitted attempt against the corrected key.
  const answerKeyChanged =
    ('correctOptionId' in updates && updates.correctOptionId !== previousCorrectOptionId) ||
    ('numericalAnswer' in updates && updates.numericalAnswer !== previousNumericalAnswer);

  let regradedCount = 0;
  if (updated && answerKeyChanged) {
    regradedCount = regradeSubmittedAttemptsForTest(updated.testId).regradedCount;
  }

  return res.json({ question: updated, lastSaved: new Date().toISOString(), regradedAttempts: regradedCount });
});

// Delete question
questionRouter.delete('/questions/:id', requireTeacher, (req: AuthRequest, res) => {
  const { id } = req.params;
  const q = db.getQuestionById(id);
  if (!q) {
    return res.status(404).json({ error: 'Question not found.' });
  }

  const testId = q.testId;
  db.deleteQuestion(id);
  const remaining = db.getQuestionsByTestId(testId);
  return res.json({ success: true, questions: remaining, deletedQuestionId: id });
});

// Duplicate question
questionRouter.post('/questions/:id/duplicate', requireTeacher, (req: AuthRequest, res) => {
  const { id } = req.params;
  const duplicated = db.duplicateQuestion(id);
  if (!duplicated) {
    return res.status(404).json({ error: 'Question not found.' });
  }

  const allQuestions = db.getQuestionsByTestId(duplicated.testId);
  return res.status(201).json({ question: duplicated, questions: allQuestions });
});

// Reorder questions
questionRouter.post('/tests/:testId/questions/reorder', requireTeacher, (req: AuthRequest, res) => {
  const { testId } = req.params;
  const { orderedQuestionIds } = req.body;

  if (!Array.isArray(orderedQuestionIds)) {
    return res.status(400).json({ error: 'orderedQuestionIds array is required.' });
  }

  const reordered = db.reorderQuestions(testId, orderedQuestionIds);
  return res.json({ questions: reordered });
});

// Batch update Answer Key
questionRouter.post('/tests/:testId/answer-key', requireTeacher, (req: AuthRequest, res) => {
  const { testId } = req.params;
  const { answers } = req.body; // map of questionId -> correctOptionId

  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ error: 'answers object is required.' });
  }

  let anyChanged = false;
  for (const [questionId, correctOptionId] of Object.entries(answers)) {
    const existing = db.getQuestionById(questionId);
    const nextCorrectOptionId = (correctOptionId as string) || undefined;
    if (existing && existing.correctOptionId !== nextCorrectOptionId) {
      anyChanged = true;
    }
    db.updateQuestion(questionId, { correctOptionId: nextCorrectOptionId });
  }

  // Retroactively re-score already-submitted attempts against the corrected key, so
  // students don't need to retake the test for a teacher's answer-key fix to count.
  let regradedCount = 0;
  if (anyChanged) {
    regradedCount = regradeSubmittedAttemptsForTest(testId).regradedCount;
  }

  const updatedQuestions = db.getQuestionsByTestId(testId);
  return res.json({
    questions: updatedQuestions,
    message: 'Answer key updated successfully.',
    regradedAttempts: regradedCount,
  });
});

// Upload image endpoint (returns stored base64 or media path)
questionRouter.post('/upload-image', requireAuth, (req: AuthRequest, res) => {
  const { imageData, fileName } = req.body;
  if (!imageData) {
    return res.status(400).json({ error: 'Image data is required.' });
  }

  // Optimize / pass back safe data URL
  return res.json({
    imageUrl: imageData,
    fileName: fileName || 'question-diagram.png',
  });
});