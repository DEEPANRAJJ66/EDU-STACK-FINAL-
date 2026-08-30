import { Question, StudentAnswer, SubjectType, SubjectStat } from '../src/types';

export interface ScoreBreakdown {
  totalScore: number;
  maxScore: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalUnanswered: number;
  accuracy: number;
  answers: Record<string, StudentAnswer>;
  subjectStats: Record<SubjectType, SubjectStat>;
}

/**
 * Pure scoring core, shared by:
 *  - the student's initial /submit flow (attemptRoutes.ts)
 *  - regrading already-SUBMITTED attempts after a teacher corrects the answer key (regrade.ts)
 *
 * Always grades against whatever the CURRENT `questions` say the correct answer is
 * (q.correctOptionId / q.numericalAnswer), so calling this again after an answer-key
 * edit naturally re-scores every attempt with the corrected key.
 */
export function computeScoreBreakdown(
  existingAnswers: Record<string, StudentAnswer>,
  questions: Question[]
): ScoreBreakdown {
  let totalScore = 0;
  let totalCorrect = 0;
  let totalIncorrect = 0;
  let totalUnanswered = 0;
  let maxScore = 0;

  const subjectMap: Record<SubjectType, SubjectStat> = {
    PHYSICS: { subject: 'PHYSICS', totalQuestions: 0, attempted: 0, correct: 0, incorrect: 0, score: 0, maxScore: 0, accuracy: 0 },
    CHEMISTRY: { subject: 'CHEMISTRY', totalQuestions: 0, attempted: 0, correct: 0, incorrect: 0, score: 0, maxScore: 0, accuracy: 0 },
    MATHEMATICS: { subject: 'MATHEMATICS', totalQuestions: 0, attempted: 0, correct: 0, incorrect: 0, score: 0, maxScore: 0, accuracy: 0 },
    GENERAL: { subject: 'GENERAL', totalQuestions: 0, attempted: 0, correct: 0, incorrect: 0, score: 0, maxScore: 0, accuracy: 0 },
  };

  const scoredAnswers: Record<string, StudentAnswer> = {};

  for (const q of questions) {
    maxScore += q.marks;
    const subj = (q.subject as SubjectType) || 'GENERAL';
    if (!subjectMap[subj]) {
      subjectMap[subj] = { subject: subj, totalQuestions: 0, attempted: 0, correct: 0, incorrect: 0, score: 0, maxScore: 0, accuracy: 0 };
    }
    subjectMap[subj].totalQuestions += 1;
    subjectMap[subj].maxScore += q.marks;

    const studentAns = existingAnswers[q.id];
    let isAnswered = false;
    let isCorrect = false;

    if (q.type === 'NUMERICAL') {
      isAnswered = Boolean(studentAns) && studentAns.numericalResponse !== undefined;
      if (isAnswered && typeof studentAns.numericalResponse === 'number' && typeof q.numericalAnswer === 'number') {
        isCorrect = Math.abs(studentAns.numericalResponse - q.numericalAnswer) < 0.000001;
      }
    } else {
      isAnswered = Boolean(studentAns) && Boolean(studentAns.selectedOptionId);
      isCorrect = studentAns?.selectedOptionId === q.correctOptionId;
    }

    if (!isAnswered) {
      totalUnanswered += 1;
      scoredAnswers[q.id] = {
        questionId: q.id,
        selectedOptionId: undefined,
        numericalResponse: undefined,
        status: studentAns?.status || 'NOT_ANSWERED',
        timeSpentSeconds: studentAns?.timeSpentSeconds || 0,
        isCorrect: false,
        marksAwarded: 0,
      };
    } else {
      subjectMap[subj].attempted += 1;

      if (isCorrect) {
        totalCorrect += 1;
        totalScore += q.marks;
        subjectMap[subj].correct += 1;
        subjectMap[subj].score += q.marks;

        scoredAnswers[q.id] = {
          ...studentAns,
          isCorrect: true,
          marksAwarded: q.marks,
        };
      } else {
        totalIncorrect += 1;
        totalScore -= q.negativeMarks;
        subjectMap[subj].incorrect += 1;
        subjectMap[subj].score -= q.negativeMarks;

        scoredAnswers[q.id] = {
          ...studentAns,
          isCorrect: false,
          marksAwarded: -q.negativeMarks,
        };
      }
    }
  }

  const attemptedCount = totalCorrect + totalIncorrect;
  const accuracy = attemptedCount > 0 ? Number(((totalCorrect / attemptedCount) * 100).toFixed(1)) : 0;

  for (const key of Object.keys(subjectMap) as SubjectType[]) {
    const s = subjectMap[key];
    const sAttempted = s.correct + s.incorrect;
    s.accuracy = sAttempted > 0 ? Number(((s.correct / sAttempted) * 100).toFixed(1)) : 0;
  }

  return {
    totalScore,
    maxScore,
    totalCorrect,
    totalIncorrect,
    totalUnanswered,
    accuracy,
    answers: scoredAnswers,
    subjectStats: subjectMap,
  };
}