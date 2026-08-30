export type UserRole = 'TEACHER' | 'STUDENT' | 'ADMIN';

// Unified status model:
// STUDENT -> ACTIVE | SUSPENDED
// TEACHER -> PENDING | APPROVED | REJECTED | SUSPENDED
// ADMIN   -> ACTIVE
export type UserStatus = 'ACTIVE' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface User {
  id: string; // Firebase Auth UID
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt?: string;
}

export type TestType = 'JEE_MAIN_FULL' | 'PHYSICS' | 'CHEMISTRY' | 'MATHEMATICS' | 'CUSTOM';
export type TestStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';
export type SubjectType = 'PHYSICS' | 'CHEMISTRY' | 'MATHEMATICS' | 'GENERAL';

export interface QuestionOption {
  id: string;
  questionId: string;
  optionLabel: 'A' | 'B' | 'C' | 'D';
  optionText: string;
  optionImageUrl?: string | null;
  optionSvgContent?: string | null;
  orderIndex: number;
}

export type QuestionType = "MCQ" | "NUMERICAL";
export interface Question {
  type?: QuestionType;
  numericalAnswer?: number | null;
  id: string;
  testId: string;
  subject: SubjectType;
  orderIndex: number;
  questionText: string;
  questionImageUrl?: string | null;
  marks: number;
  negativeMarks: number;
  correctOptionId?: string; // Hidden from students during active tests
  solutionText?: string;
  solutionImageUrl?: string | null;
  options: QuestionOption[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Test {
  id: string;
  teacherId: string;
  teacherName?: string;
  title: string;
  description: string;
  testType: TestType;
  durationMinutes: number;
  totalQuestions: number;
  marksPerQuestion: number;
  negativeMarks: number;
  instructions: string;
  status: TestStatus;
  createdAt: string;
  updatedAt: string;
  questionCount?: number;
  attemptCount?: number;
  questions?: Question[];
  // Folder this test lives in, for the Teacher Dashboard's file-manager style
  // organization. Absent/null means the test sits at the root ("My Tests") level.
  folderId?: string | null;
}

// A folder/section a teacher can use to organize their tests, similar to a
// Google Drive / file-explorer folder. Folders can be nested via parentId.
export interface TestFolder {
  id: string;
  teacherId: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type QuestionAttemptStatus =
  | 'NOT_VISITED'
  | 'NOT_ANSWERED'
  | 'ANSWERED'
  | 'MARKED_FOR_REVIEW'
  | 'ANSWERED_AND_MARKED';

export interface StudentAnswer {
  questionId: string;
  selectedOptionId?: string;
  numericalResponse?: number;
  status: QuestionAttemptStatus;
  timeSpentSeconds: number;
  isCorrect?: boolean;
  marksAwarded?: number;
}

export interface TestAttempt {
  id: string;
  testId: string;
  testTitle?: string;
  testType?: TestType;
  durationMinutes?: number;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  startTime: string;
  endTime?: string;
  submittedAt?: string;
  timeTakenSeconds: number;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
  totalScore: number;
  maxScore: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalUnanswered: number;
  accuracy: number;
  answers: Record<string, StudentAnswer>;
  subjectStats?: Record<SubjectType, SubjectStat>;
  // Set whenever a teacher edits the answer key AFTER this attempt was submitted and the
  // score is recalculated to reflect the corrected key.
  lastRegradedAt?: string;
}

export interface SubjectStat {
  subject: SubjectType;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  score: number;
  maxScore: number;
  accuracy: number;
}

export interface TestValidationIssue {
  questionId?: string;
  questionNumber?: number;
  subject?: SubjectType;
  type: 'NO_CORRECT_ANSWER' | 'MISSING_OPTIONS' | 'EMPTY_TEXT' | 'INVALID_MARKS' | 'GENERAL';
  message: string;
}

export interface TestValidationResult {
  isValid: boolean;
  issues: TestValidationIssue[];
}

export interface TeacherStats {
  totalTests: number;
  publishedTests: number;
  draftTests: number;
  totalStudents: number;
  totalAttempts: number;
}

// --- SMART ERROR NOTES & ERROR CORRECT TEST TYPES ---

export type ErrorCategory = 'KNOWLEDGE' | 'EXECUTION' | 'EXAM_STRATEGY' | 'SPECIAL';

export type ErrorType =
  // Knowledge
  | 'CONCEPT_ERROR'
  | 'DONT_KNOW_TOPIC'
  | 'FORMULA_ERROR'
  | 'FORGOT_CONCEPT'
  | 'INCOMPLETE_KNOWLEDGE'
  // Execution
  | 'SILLY_MISTAKE'
  | 'CALCULATION_ERROR'
  | 'WRONG_APPROACH'
  | 'QUESTION_MISUNDERSTOOD'
  | 'OVERTHINKING'
  // Exam Strategy
  | 'TIME_PRESSURE'
  | 'GUESS_RANDOM'
  // Special
  | 'THIS_IS_FINE';

export interface QuestionErrorNote {
  questionId: string;
  isCompleted?: boolean;
  selectedErrorTypes: ErrorType[];
  thisIsFine: boolean;
  whatIMessed: string;
  whatIMessedImages: string[];
  whatILearned: string;
  whatILearnedImages: string[];
  importantNote: string;
  importantNoteImages: string[];
  keyPoint: string;
  keyPointImages: string[];
  updatedAt: string;
}

export type ErrorNote = QuestionErrorNote;

export interface AttemptErrorNotes {
  id: string;
  attemptId: string;
  testId: string;
  studentId: string;
  currentQuestionIndex: number;
  notes: Record<string, QuestionErrorNote>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  isFullyCompleted?: boolean;
}

export interface ErrorTypeSummary {
  errorType: ErrorType;
  label: string;
  category: ErrorCategory;
  count: number;
}

export interface ImprovementTypeBreakdown {
  errorType: ErrorType;
  label: string;
  category: ErrorCategory;
  originalCount: number;
  correctedCount: number;
  correctionRate: number;
}

export interface ImprovementComparisonData {
  originalAttemptId: string;
  errorTestAttemptId: string;
  originalTestTitle: string;
  originalErrorsCount: number;
  correctedCount: number;
  remainingCount: number;
  correctionPercentage: number;
  originalAvgTimeSeconds: number;
  newAvgTimeSeconds: number;
  timeImprovementSeconds: number;
  status: 'IMPROVING' | 'NEEDS_PRACTICE' | 'NOT_IMPROVING';
  typeBreakdown: ImprovementTypeBreakdown[];
  remainingQuestionIds: string[];
  questionsComparison: {
    questionId: string;
    questionText: string;
    subject: SubjectType;
    errorTypes: ErrorType[];
    wasCorrectInOriginal: boolean;
    wasCorrectInErrorTest: boolean;
    originalTimeSpent: number;
    errorTestTimeSpent: number;
  }[];
}

// --- STUDENT DASHBOARD: TODO & TIME PLANNER TYPES ---

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' | 'NOT_COMPLETED' | 'CONTINUED';

export interface TaskReflection {
  distractions?: string;
  difficulties?: string;
  improvements?: string;
  notes?: string;
  distractionTags?: string[];
}

export interface PlannerTask {
  id: string;
  studentId: string;
  studentName?: string;
  title: string;
  date: string; // YYYY-MM-DD
  day: string; // e.g. "Wednesday"
  startTime: string; // "09:00" or "14:30"
  plannedDurationMinutes: number;
  actualDurationMinutes: number;
  priority: TaskPriority;
  status: TaskStatus;
  startedAt?: string;
  completedAt?: string;
  secondsElapsed?: number;
  lastStartedTimestamp?: number;
  isTimerRunning?: boolean;
  continuedCount?: number;
  reflection?: TaskReflection;
  createdAt: string;
  updatedAt: string;
}

export interface DayProgressSummary {
  date: string;
  day: string;
  totalTasks: number;
  completedTasks: number;
  notCompletedTasks: number;
  continuedTasks: number;
  completionPercentage: number;
  plannedStudyMinutes: number;
  actualStudyMinutes: number;
  completedOnTimeCount: number;
  lateOrContinuedCount: number;
  reflections: {
    taskId: string;
    taskTitle: string;
    reflection: TaskReflection;
  }[];
  distractionsList: string[];
}

export interface PlannerAnalytics {
  today: DayProgressSummary;
  week: {
    startDate: string;
    endDate: string;
    totalTasks: number;
    completedTasks: number;
    missedTasks: number;
    continuedTasks: number;
    completionPercentage: number;
    totalPlannedMinutes: number;
    totalActualMinutes: number;
    onTimeCompletionCount: number;
    onTimeRate: number;
    consistencyScore: number;
    dailyStats: {
      date: string;
      day: string;
      shortDay: string;
      completed: number;
      total: number;
      plannedMinutes: number;
      actualMinutes: number;
    }[];
    commonDistractions: { tag: string; count: number }[];
    improvementNotes: string[];
  };
  month: {
    monthName: string;
    year: number;
    totalTasks: number;
    completedTasks: number;
    missedTasks: number;
    continuedTasks: number;
    completionPercentage: number;
    totalPlannedMinutes: number;
    totalActualMinutes: number;
    bestPerformingDays: { date: string; day: string; completionPercentage: number; actualMinutes: number }[];
    lowPerformingDays: { date: string; day: string; completionPercentage: number; missedCount: number }[];
    consistencyScore: number;
    weeklyTrend: { weekNumber: number; label: string; completionRate: number; studyHours: number }[];
    commonDistractions: { tag: string; count: number }[];
    reflectionsCount: number;
  };
}

export type WeeklyProgressSummary = PlannerAnalytics['week'];
export type MonthlyProgressSummary = PlannerAnalytics['month'];