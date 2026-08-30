import { PlannerTask } from '../types';
import { safeStorage } from './safeStorage';

export interface SavedTimerState {
  taskId: string;
  studentId: string;
  accumulatedSeconds: number;
  lastStartedTimestamp: number | null; // null when paused
  isPaused: boolean;
  status: 'IN_PROGRESS' | 'CONTINUED';
  plannedDurationMinutes: number;
  title: string;
  priority: string;
  startTime?: string;
  startedAt?: string;
  updatedAt: string;
}

const STORAGE_KEY_PREFIX = 'edustack_active_timer_';
const GLOBAL_TIMER_KEY = 'edustack_active_timer_state';

export const plannerTimerStorage = {
  getStorageKey: (studentId?: string): string => {
    return studentId ? `${STORAGE_KEY_PREFIX}${studentId}` : GLOBAL_TIMER_KEY;
  },

  getSavedTimerState: (studentId?: string): SavedTimerState | null => {
    try {
      const key = plannerTimerStorage.getStorageKey(studentId);
      let raw = safeStorage.getItem(key);
      if (!raw && studentId) {
        raw = safeStorage.getItem(GLOBAL_TIMER_KEY);
      }
      if (!raw) return null;
      const parsed: SavedTimerState = JSON.parse(raw);
      if (!parsed || !parsed.taskId) return null;
      return parsed;
    } catch {
      return null;
    }
  },

  saveTimerState: (state: SavedTimerState): void => {
    try {
      const dataStr = JSON.stringify(state);
      const key = plannerTimerStorage.getStorageKey(state.studentId);
      safeStorage.setItem(key, dataStr);
      safeStorage.setItem(GLOBAL_TIMER_KEY, dataStr);
    } catch (err) {
      console.warn('Failed to save timer state to storage:', err);
    }
  },

  clearSavedTimerState: (studentId?: string): void => {
    try {
      const key = plannerTimerStorage.getStorageKey(studentId);
      safeStorage.removeItem(key);
      safeStorage.removeItem(GLOBAL_TIMER_KEY);
    } catch (err) {
      console.warn('Failed to clear timer state from storage:', err);
    }
  },

  computeElapsedSeconds: (
    taskOrState: {
      secondsElapsed?: number;
      actualDurationMinutes?: number;
      accumulatedSeconds?: number;
      lastStartedTimestamp?: number | null;
      isTimerRunning?: boolean;
      isPaused?: boolean;
      status?: string;
    } | null | undefined
  ): number => {
    if (!taskOrState) return 0;

    const baseSeconds =
      taskOrState.accumulatedSeconds !== undefined
        ? taskOrState.accumulatedSeconds
        : taskOrState.secondsElapsed !== undefined
        ? taskOrState.secondsElapsed
        : taskOrState.actualDurationMinutes
        ? taskOrState.actualDurationMinutes * 60
        : 0;

    const isPaused =
      taskOrState.isPaused !== undefined
        ? taskOrState.isPaused
        : taskOrState.isTimerRunning === false;

    // If timer is paused or has no running timestamp, elapsed is just the base
    if (isPaused || !taskOrState.lastStartedTimestamp) {
      return Math.max(0, baseSeconds);
    }

    // Timer is running -> calculate live delta since last started timestamp
    const now = Date.now();
    const deltaSeconds = Math.max(0, Math.floor((now - taskOrState.lastStartedTimestamp) / 1000));
    return Math.max(0, baseSeconds + deltaSeconds);
  },

  syncTaskWithStorage: (task: PlannerTask, studentId?: string): PlannerTask => {
    const saved = plannerTimerStorage.getSavedTimerState(studentId || task.studentId);
    if (!saved || saved.taskId !== task.id) {
      return task;
    }

    // Merge in-flight timer state from storage
    const currentElapsed = plannerTimerStorage.computeElapsedSeconds(saved);
    return {
      ...task,
      secondsElapsed: currentElapsed,
      lastStartedTimestamp: saved.lastStartedTimestamp ?? undefined,
      isTimerRunning: !saved.isPaused,
      status: (saved.status || task.status) as any,
    };
  },
};
