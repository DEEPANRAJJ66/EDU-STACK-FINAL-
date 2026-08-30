import { db } from './db';
import { computeScoreBreakdown } from './scoring';

/**
 * Re-scores every already-SUBMITTED attempt for a test against the CURRENT answer key.
 *
 * Call this after any change to a question's correctOptionId / numericalAnswer, so a
 * teacher fixing a wrong answer key retroactively updates the marks of students who
 * already attempted the test — without requiring them to retake it.
 *
 * IN_PROGRESS attempts are left alone: they'll naturally be graded with the corrected
 * key the moment they submit.
 */
export function regradeSubmittedAttemptsForTest(testId: string): { regradedCount: number } {
  const questions = db.getQuestionsByTestId(testId);
  const attempts = db.getAllAttempts().filter(a => a.testId === testId && a.status === 'SUBMITTED');

  const regradedAt = new Date().toISOString();
  let regradedCount = 0;

  for (const attempt of attempts) {
    const breakdown = computeScoreBreakdown(attempt.answers, questions);
    db.updateAttempt(attempt.id, {
      ...breakdown,
      lastRegradedAt: regradedAt,
    });
    regradedCount += 1;
  }

  return { regradedCount };
}