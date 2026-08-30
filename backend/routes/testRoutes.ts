import { Router } from 'express';
import { db } from '../db';
import { AuthRequest, requireAuth, requireTeacher } from '../auth';
import { Test, TestValidationResult, TestValidationIssue } from '../../src/types';

export const testRouter = Router();

// Validate a test for publication
export function validateTestForPublishing(test: Test): TestValidationResult {
  const issues: TestValidationIssue[] = [];

  if (!test.title || test.title.trim().length === 0) {
    issues.push({
      type: 'GENERAL',
      message: 'Test title is required.',
    });
  }

  if (!test.durationMinutes || test.durationMinutes <= 0) {
    issues.push({
      type: 'GENERAL',
      message: 'Test duration must be greater than 0 minutes.',
    });
  }

  const questions = test.questions || db.getQuestionsByTestId(test.id);

  if (questions.length === 0) {
    issues.push({
      type: 'GENERAL',
      message: 'Test must contain at least 1 question before it can be published.',
    });
    return { isValid: false, issues };
  }

  questions.forEach((q, idx) => {
    const qNum = idx + 1;

    if (!q.questionText || q.questionText.trim().length === 0) {
      issues.push({
        questionId: q.id,
        questionNumber: qNum,
        subject: q.subject,
        type: 'EMPTY_TEXT',
        message: `${q.subject} Q${qNum} has empty question text.`,
      });
    }

    const isNumerical = q.type === 'NUMERICAL';

    if (isNumerical) {
      if (typeof q.numericalAnswer !== 'number' || Number.isNaN(q.numericalAnswer)) {
        issues.push({
          questionId: q.id,
          questionNumber: qNum,
          subject: q.subject,
          type: 'NO_CORRECT_ANSWER',
          message: `${q.subject} Q${qNum} (Numerical) has no correct numeric answer entered.`,
        });
      }
    } else {
      if (!q.options || q.options.length < 4) {
        issues.push({
          questionId: q.id,
          questionNumber: qNum,
          subject: q.subject,
          type: 'MISSING_OPTIONS',
          message: `${q.subject} Q${qNum} must have all 4 options (A, B, C, D).`,
        });
      } else {
        const emptyOption = q.options.find(o => !o.optionText || o.optionText.trim().length === 0);
        if (emptyOption) {
          issues.push({
            questionId: q.id,
            questionNumber: qNum,
            subject: q.subject,
            type: 'MISSING_OPTIONS',
            message: `${q.subject} Q${qNum} is missing text for Option ${emptyOption.optionLabel}.`,
          });
        }
      }

      if (!q.correctOptionId) {
        issues.push({
          questionId: q.id,
          questionNumber: qNum,
          subject: q.subject,
          type: 'NO_CORRECT_ANSWER',
          message: `${q.subject} Q${qNum} has no correct answer selected.`,
        });
      }
    }

    if (q.marks <= 0) {
      issues.push({
        questionId: q.id,
        questionNumber: qNum,
        subject: q.subject,
        type: 'INVALID_MARKS',
        message: `${q.subject} Q${qNum} marks must be greater than 0.`,
      });
    }
  });

  return {
    isValid: issues.length === 0,
    issues,
  };
}

// Get all tests (Filtered by role: teachers see all, students see only published)
testRouter.get('/', requireAuth, (req: AuthRequest, res) => {
  if (req.user?.role === 'TEACHER') {
    const tests = db.getAllTests();
    return res.json({ tests });
  } else {
    const tests = db.getPublishedTests();
    return res.json({ tests });
  }
});

// Get a single test
testRouter.get('/:id', requireAuth, (req: AuthRequest, res) => {
  const test = db.getTestById(req.params.id);
  if (!test) {
    return res.status(404).json({ error: 'Test not found.' });
  }

  // If student and test is draft, block
  if (req.user?.role === 'STUDENT' && test.status !== 'PUBLISHED') {
    return res.status(403).json({ error: 'This test is currently not published.' });
  }

  // If user is a student requesting questions, NEVER leak the correctOptionId or solutionText!
  if (req.user?.role === 'STUDENT' && test.questions) {
    const sanitizedQuestions = test.questions.map(q => ({
      ...q,
      correctOptionId: undefined,
      solutionText: undefined,
    }));
    const sanitizedTest = { ...test, questions: sanitizedQuestions };
    return res.json({ test: sanitizedTest, questions: sanitizedQuestions });
  }

  return res.json({ test, questions: test.questions || [] });
});

// Validate test endpoint
testRouter.get('/:id/validate', requireTeacher, (req: AuthRequest, res) => {
  const test = db.getTestById(req.params.id);
  if (!test) {
    return res.status(404).json({ error: 'Test not found.' });
  }

  const validation = validateTestForPublishing(test);
  return res.json(validation);
});

// Create test
testRouter.post('/', requireTeacher, (req: AuthRequest, res) => {
  const {
    title,
    description = '',
    testType = 'JEE_MAIN_FULL',
    durationMinutes = 180,
    marksPerQuestion = 4,
    negativeMarks = 1,
    instructions = '',
    status = 'DRAFT',
    folderId = null,
  } = req.body;

  if (!title || title.trim().length === 0) {
    return res.status(400).json({ error: 'Test title is required.' });
  }

  // Only place the new test in a folder that actually exists and belongs to this teacher;
  // otherwise it falls back to the root ("My Tests") level.
  let resolvedFolderId: string | null = null;
  if (folderId) {
    const folder = db.getFolderById(folderId);
    if (folder && folder.teacherId === req.user!.id) {
      resolvedFolderId = folderId;
    }
  }

  const testId = 'test_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const newTest: Test = {
    id: testId,
    teacherId: req.user!.id,
    teacherName: req.user!.name,
    title: title.trim(),
    description: description.trim(),
    testType,
    durationMinutes: Number(durationMinutes) || 180,
    totalQuestions: 0,
    marksPerQuestion: Number(marksPerQuestion) || 4,
    negativeMarks: Number(negativeMarks) || 1,
    instructions: instructions.trim() || 'Attempt all questions. Clock starts as soon as you proceed.',
    status: status === 'PUBLISHED' ? 'DRAFT' : status, // always start as draft or validate before publish
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    folderId: resolvedFolderId,
  };

  db.createTest(newTest);
  return res.status(201).json({ test: newTest });
});

// Update test metadata
testRouter.put('/:id', requireTeacher, (req: AuthRequest, res) => {
  const test = db.getTestById(req.params.id);
  if (!test) {
    return res.status(404).json({ error: 'Test not found.' });
  }

  const allowedUpdates = [
    'title',
    'description',
    'testType',
    'durationMinutes',
    'marksPerQuestion',
    'negativeMarks',
    'instructions',
    'status',
  ];

  const updates: any = {};
  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }

  // Moving a test into a folder (or back to root with null) is validated separately so an
  // invalid/foreign folder id can never silently attach to someone else's test.
  if (req.body.folderId !== undefined) {
    if (req.body.folderId === null) {
      updates.folderId = null;
    } else {
      const folder = db.getFolderById(req.body.folderId);
      if (!folder || folder.teacherId !== req.user!.id) {
        return res.status(404).json({ error: 'Destination folder not found.' });
      }
      updates.folderId = req.body.folderId;
    }
  }

  const updated = db.updateTest(req.params.id, updates);
  return res.json({ test: updated });
});

// Publish/Unpublish with validation
testRouter.post('/:id/publish', requireTeacher, (req: AuthRequest, res) => {
  const test = db.getTestById(req.params.id);
  if (!test) {
    return res.status(404).json({ error: 'Test not found.' });
  }

  const { publish } = req.body;
  if (publish) {
    const validation = validateTestForPublishing(test);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Test cannot be published yet.',
        validation,
      });
    }
    const updated = db.updateTest(test.id, { status: 'PUBLISHED' });
    return res.json({ test: updated, success: true });
  } else {
    const updated = db.updateTest(test.id, { status: 'UNPUBLISHED' });
    return res.json({ test: updated, success: true });
  }
});

// Duplicate test
testRouter.post('/:id/duplicate', requireTeacher, (req: AuthRequest, res) => {
  const duplicated = db.duplicateTest(req.params.id, req.user!.id);
  if (!duplicated) {
    return res.status(404).json({ error: 'Original test not found.' });
  }
  return res.status(201).json({ test: duplicated });
});

// Delete test
testRouter.delete('/:id', requireTeacher, (req: AuthRequest, res) => {
  const deleted = db.deleteTest(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Test not found.' });
  }
  return res.json({ success: true, message: 'Test deleted successfully.' });
});