import {
  User,
  Test,
  TestFolder,
  Question,
  TestAttempt,
  TeacherStats,
  TestValidationResult,
  SubjectType,
  AttemptErrorNotes,
  QuestionErrorNote,
  ImprovementComparisonData,
  PlannerTask,
  PlannerAnalytics,
} from '../types';
import { authService } from './authService';

const API_BASE = '/api';

async function getAuthHeader(): Promise<Record<string, string>> {
  // Always pull a fresh Firebase ID token rather than a cached/local one, so status
  // changes made by an Admin (suspend, approve, etc.) are reflected on the very next call.
  const token = await authService.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retries = 3,
  backoffMs = 500
): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(await getAuthHeader()),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle 429 (Too Many Requests) or transient 503 errors with exponential backoff
    if ((response.status === 429 || response.status === 503) && retries > 0) {
      const waitTime = backoffMs + Math.floor(Math.random() * 200);
      await delay(waitTime);
      return request<T>(endpoint, options, retries - 1, backoffMs * 2);
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
      const err: any = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err: any) {
    if (err?.status === 429 && retries > 0) {
      const waitTime = backoffMs + Math.floor(Math.random() * 200);
      await delay(waitTime);
      return request<T>(endpoint, options, retries - 1, backoffMs * 2);
    }
    throw err;
  }
}

export const api = {
  auth: {
    // Registers the EduStack profile (role + status) for the Firebase Authentication
    // account that was just created client-side via authService. Role must be STUDENT
    // or TEACHER - Admin profiles are never created through this endpoint.
    registerProfile: (name: string, role: 'TEACHER' | 'STUDENT') =>
      request<{ user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, role }),
      }),

    me: () => request<{ user: User }>('/auth/me'),
  },

  admin: {
    getOverview: () =>
      request<{
        totalStudents: number;
        activeStudents: number;
        suspendedStudents: number;
        totalTeachers: number;
        activeTeachers: number;
        pendingTeachers: number;
        rejectedTeachers: number;
        suspendedTeachers: number;
        totalTests: number;
      }>('/admin/overview'),

    getTeachers: (status?: string) =>
      request<{ teachers: User[] }>(`/admin/teachers${status ? `?status=${status}` : ''}`),

    approveTeacher: (id: string) => request<{ user: User }>(`/admin/teachers/${id}/approve`, { method: 'POST' }),
    rejectTeacher: (id: string) => request<{ user: User }>(`/admin/teachers/${id}/reject`, { method: 'POST' }),
    suspendTeacher: (id: string) => request<{ user: User }>(`/admin/teachers/${id}/suspend`, { method: 'POST' }),
    reactivateTeacher: (id: string) => request<{ user: User }>(`/admin/teachers/${id}/reactivate`, { method: 'POST' }),

    getStudents: (status?: string) =>
      request<{ students: User[] }>(`/admin/students${status ? `?status=${status}` : ''}`),

    suspendStudent: (id: string) => request<{ user: User }>(`/admin/students/${id}/suspend`, { method: 'POST' }),
    reactivateStudent: (id: string) => request<{ user: User }>(`/admin/students/${id}/reactivate`, { method: 'POST' }),

    getTests: () => request<{ tests: Test[] }>('/admin/tests'),
    publishTest: (id: string) => request<{ test: Test }>(`/admin/tests/${id}/publish`, { method: 'POST' }),
    unpublishTest: (id: string) => request<{ test: Test }>(`/admin/tests/${id}/unpublish`, { method: 'POST' }),
    deleteTest: (id: string) => request<{ success: boolean }>(`/admin/tests/${id}`, { method: 'DELETE' }),
  },

  tests: {
    getAll: () => request<{ tests: Test[] }>('/tests'),

    getById: (id: string) => request<{ test: Test; questions: Question[] }>(`/tests/${id}`),

    create: (testData: Partial<Test>) =>
      request<{ test: Test }>('/tests', {
        method: 'POST',
        body: JSON.stringify(testData),
      }),

    update: (id: string, updates: Partial<Test>) =>
      request<{ test: Test }>(`/tests/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),

    delete: (id: string) =>
      request<{ success: boolean }>(`/tests/${id}`, {
        method: 'DELETE',
      }),

    duplicate: (id: string) =>
      request<{ test: Test }>(`/tests/${id}/duplicate`, {
        method: 'POST',
      }),

    publish: (id: string, publish: boolean) =>
      request<{ test: Test; success: boolean }>(`/tests/${id}/publish`, {
        method: 'POST',
        body: JSON.stringify({ publish }),
      }),

    validate: (id: string) => request<TestValidationResult>(`/tests/${id}/validate`),

    getTeacherStats: async (): Promise<TeacherStats> => {
      const res = await request<{ stats: TeacherStats }>('/attempts/teacher/stats');
      return res.stats;
    },
  },

  folders: {
    getAll: () => request<{ folders: TestFolder[] }>('/folders'),

    create: (name: string, parentId: string | null = null) =>
      request<{ folder: TestFolder }>('/folders', {
        method: 'POST',
        body: JSON.stringify({ name, parentId }),
      }),

    rename: (id: string, name: string) =>
      request<{ folder: TestFolder }>(`/folders/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name }),
      }),

    move: (id: string, parentId: string | null) =>
      request<{ folder: TestFolder }>(`/folders/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ parentId }),
      }),

    delete: (id: string) =>
      request<{ success: boolean }>(`/folders/${id}`, {
        method: 'DELETE',
      }),
  },

  questions: {
    add: (testId: string, data: Partial<Question>) =>
      request<{ question: Question }>(`/tests/${testId}/questions`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    bulkAdd: (testId: string, count: number, subject: SubjectType) =>
      request<{ message: string; created: Question[]; questions: Question[] }>(
        `/tests/${testId}/questions/bulk`,
        {
          method: 'POST',
          body: JSON.stringify({ count, subject }),
        }
      ),

    update: (id: string, updates: Partial<Question>) =>
      request<{ question: Question; lastSaved: string }>(`/questions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),

    delete: (id: string) =>
      request<{ success: boolean; questions: Question[] }>(`/questions/${id}`, {
        method: 'DELETE',
      }),

    duplicate: (id: string) =>
      request<{ question: Question; questions: Question[] }>(`/questions/${id}/duplicate`, {
        method: 'POST',
      }),

    reorder: (testId: string, orderedQuestionIds: string[]) =>
      request<{ questions: Question[] }>(`/tests/${testId}/questions/reorder`, {
        method: 'POST',
        body: JSON.stringify({ orderedQuestionIds }),
      }),

    updateAnswerKey: (testId: string, answers: Record<string, string>) =>
      request<{ questions: Question[]; message: string }>(`/tests/${testId}/answer-key`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      }),

    uploadImage: (imageData: string, fileName?: string) =>
      request<{ imageUrl: string; fileName: string }>('/upload-image', {
        method: 'POST',
        body: JSON.stringify({ imageData, fileName }),
      }),
  },

  attempts: {
    start: (testId: string) =>
      request<{ attempt: TestAttempt; test: Test; remainingSeconds: number }>('/attempts/start', {
        method: 'POST',
        body: JSON.stringify({ testId }),
      }),

    resume: (attemptId: string) =>
      request<{ attempt: TestAttempt; test: Test; remainingSeconds: number }>(
        `/attempts/${attemptId}/resume`
      ),

    saveAnswer: (attemptId: string, questionIdOrData: string | any, answerData?: any) => {
      const payload =
        typeof questionIdOrData === 'string'
          ? { questionId: questionIdOrData, ...answerData }
          : questionIdOrData;
      return request<{ success: boolean; answers: any }>(`/attempts/${attemptId}/answer`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    submit: (attemptId: string, finalAnswers?: any, timeTakenSeconds?: number) =>
      request<{ attempt: TestAttempt; test: Test; questions: Question[]; success: boolean }>(
        `/attempts/${attemptId}/submit`,
        {
          method: 'POST',
          body: JSON.stringify({ finalAnswers, timeTakenSeconds }),
        }
      ),

    getResult: (attemptId: string) =>
      request<{ attempt: TestAttempt; test: Test; questions: Question[] }>(
        `/attempts/${attemptId}/result`
      ),

    getStudentAttempts: () => request<{ attempts: TestAttempt[] }>('/attempts/my-history'),

    getMyHistory: () => request<{ attempts: TestAttempt[] }>('/attempts/my-history'),

    getTeacherResults: (params?: { testId?: string; search?: string; sortBy?: string }) => {
      const q = new URLSearchParams();
      if (params?.testId) q.append('testId', params.testId);
      if (params?.search) q.append('search', params.search);
      if (params?.sortBy) q.append('sortBy', params.sortBy);
      return request<{ attempts: TestAttempt[] }>(`/attempts/teacher/all-results?${q.toString()}`);
    },

    getTeacherStats: () => request<{ stats: TeacherStats }>('/attempts/teacher/stats'),
  },

  errorNotes: {
    getByAttemptId: (attemptId: string) =>
      request<{ errorNotes: AttemptErrorNotes | null }>(`/attempts/${attemptId}/error-notes`),

    save: (
      attemptId: string,
      data: {
        notes: Record<string, QuestionErrorNote>;
        currentQuestionIndex?: number;
        isFullyCompleted?: boolean;
      }
    ) =>
      request<{ success: boolean; errorNotes: AttemptErrorNotes }>(
        `/attempts/${attemptId}/error-notes`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        }
      ),

    createErrorCorrectTest: (attemptId: string, customQuestionIds?: string[]) =>
      request<{
        success: boolean;
        test: Test & { questions: Question[] };
        attempt: TestAttempt;
        remainingSeconds: number;
        originalAttemptId: string;
        targetQuestionCount: number;
      }>(`/attempts/${attemptId}/create-error-correct-test`, {
        method: 'POST',
        body: JSON.stringify({ customQuestionIds }),
      }),

    getImprovementComparison: (attemptId: string, errorTestAttemptId?: string) => {
      const q = errorTestAttemptId ? `?errorTestAttemptId=${errorTestAttemptId}` : '';
      return request<{ comparison: ImprovementComparisonData }>(
        `/attempts/${attemptId}/improvement-comparison${q}`
      );
    },
  },

  planner: {
    getTasks: (params?: { date?: string; startDate?: string; endDate?: string; studentId?: string }) => {
      const q = new URLSearchParams();
      if (params?.date) q.append('date', params.date);
      if (params?.startDate) q.append('startDate', params.startDate);
      if (params?.endDate) q.append('endDate', params.endDate);
      if (params?.studentId) q.append('studentId', params.studentId);
      const queryString = q.toString();
      return request<{ tasks: PlannerTask[] }>(`/planner/tasks${queryString ? `?${queryString}` : ''}`);
    },

    getTaskById: (id: string) => request<{ task: PlannerTask }>(`/planner/tasks/${id}`),

    createTask: (data: {
      title: string;
      date?: string;
      day?: string;
      startTime: string;
      plannedDurationMinutes: number;
      priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      studentId?: string;
      studentName?: string;
    }) =>
      request<{ task: PlannerTask; message: string }>('/planner/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateTask: (id: string, updates: Partial<PlannerTask>) =>
      request<{ task: PlannerTask; message: string }>(`/planner/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),

    deleteTask: (id: string, studentId?: string) => {
      const q = studentId ? `?studentId=${studentId}` : '';
      return request<{ success: boolean; message: string }>(`/planner/tasks/${id}${q}`, {
        method: 'DELETE',
      });
    },

    getAnalytics: (params?: { clientDate?: string; studentId?: string }) => {
      const q = new URLSearchParams();
      if (params?.clientDate) q.append('clientDate', params.clientDate);
      if (params?.studentId) q.append('studentId', params.studentId);
      const queryString = q.toString();
      return request<{ analytics: PlannerAnalytics }>(`/planner/analytics${queryString ? `?${queryString}` : ''}`);
    },
  },
};
