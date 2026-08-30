import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  PlannerTask,
  PlannerAnalytics,
  TaskReflection,
  TaskStatus,
  TaskPriority,
  User,
} from '../../types';
import { getISTDateStr, getISTDayName } from '../../utils/istTime';
import { plannerTimerStorage } from '../../utils/plannerTimerStorage';
import { LiveScheduleView } from './LiveScheduleView';
import { LiveTimerWidget } from './LiveTimerWidget';
import { PostTaskReflectionModal } from './PostTaskReflectionModal';
import { WeeklyAnalysisView } from './WeeklyAnalysisView';
import { MonthlyAnalysisView } from './MonthlyAnalysisView';
import { HistoryLogView } from './HistoryLogView';
import {
  Calendar,
  Clock,
  BarChart3,
  TrendingUp,
  History,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Plus,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react';

interface TodoPlannerWorkspaceProps {
  currentUser: User;
  isTakingTest?: boolean;
}

type PlannerTab = 'TODAY' | 'WEEKLY' | 'MONTHLY' | 'HISTORY';

export const TodoPlannerWorkspace: React.FC<TodoPlannerWorkspaceProps> = ({
  currentUser,
  isTakingTest = false,
}) => {
  const [activeTab, setActiveTab] = useState<PlannerTab>('TODAY');
  const [allTasks, setAllTasks] = useState<PlannerTask[]>([]);
  const [todayTasks, setTodayTasks] = useState<PlannerTask[]>([]);
  const [analytics, setAnalytics] = useState<PlannerAnalytics | null>(null);
  const [activeTask, setActiveTask] = useState<PlannerTask | null>(null);
  const [reflectionTask, setReflectionTask] = useState<PlannerTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<PlannerTask | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Auto client date in Indian Standard Time (YYYY-MM-DD)
  const todayDateStr = getISTDateStr();

  const loadPlannerData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      // 1. Fetch all tasks for student
      const tasksRes = await api.planner.getTasks({ studentId: currentUser.id });
      const tasks = tasksRes.tasks || [];
      setAllTasks(tasks);

      // Filter today's tasks
      const todays = tasks
        .filter(t => t.date === todayDateStr)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      setTodayTasks(todays);

      // Find any in-progress or continued task (and sync with persistent timer storage)
      const running = todays.find(t => t.status === 'IN_PROGRESS' || t.status === 'CONTINUED');
      if (running) {
        const synced = plannerTimerStorage.syncTaskWithStorage(running, currentUser.id);
        setActiveTask(synced);
      } else {
        const saved = plannerTimerStorage.getSavedTimerState(currentUser.id);
        if (saved && (saved.status === 'IN_PROGRESS' || saved.status === 'CONTINUED')) {
          const matching = todays.find(t => t.id === saved.taskId) || tasks.find(t => t.id === saved.taskId);
          if (matching) {
            const synced = plannerTimerStorage.syncTaskWithStorage(matching, currentUser.id);
            setActiveTask(synced);
          }
        }
      }

      // 2. Fetch full day, week, month analytics
      const analyticsRes = await api.planner.getAnalytics({
        studentId: currentUser.id,
        clientDate: todayDateStr,
      });
      setAnalytics(analyticsRes.analytics || null);
    } catch (err: any) {
      console.error('Error loading planner data:', err);
      setError(err.message || 'Failed to load planner data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPlannerData();
  }, [currentUser.id]);

  // Create new task
  const handleCreateTask = async (data: {
    title: string;
    startTime: string;
    plannedDurationMinutes: number;
    priority: TaskPriority;
  }) => {
    try {
      const autoDayName = getISTDayName();

      const res = await api.planner.createTask({
        title: data.title,
        date: todayDateStr,
        day: autoDayName,
        startTime: data.startTime,
        plannedDurationMinutes: data.plannedDurationMinutes,
        priority: data.priority,
        studentId: currentUser.id,
        studentName: currentUser.name,
      });

      if (res.task) {
        await loadPlannerData(true);
      }
    } catch (err: any) {
      console.error('Failed to create task:', err);
      alert(err.message || 'Could not schedule task');
    }
  };

  // Start a task
  const handleStartTask = async (task: PlannerTask) => {
    try {
      const now = Date.now();
      const startedAt = task.startedAt || new Date().toISOString();
      const currentAccumulated = task.secondsElapsed || 0;

      // Save immediately to persistent storage
      plannerTimerStorage.saveTimerState({
        taskId: task.id,
        studentId: currentUser.id,
        accumulatedSeconds: currentAccumulated,
        lastStartedTimestamp: now,
        isPaused: false,
        status: 'IN_PROGRESS',
        plannedDurationMinutes: task.plannedDurationMinutes || 30,
        title: task.title,
        priority: task.priority,
        startTime: task.startTime,
        startedAt: startedAt,
        updatedAt: new Date().toISOString(),
      });

      const updated = await api.planner.updateTask(task.id, {
        status: 'IN_PROGRESS',
        startedAt,
        lastStartedTimestamp: now,
        isTimerRunning: true,
        secondsElapsed: currentAccumulated,
        studentId: currentUser.id,
      });

      if (updated.task) {
        setActiveTask({
          ...updated.task,
          lastStartedTimestamp: now,
          isTimerRunning: true,
          secondsElapsed: currentAccumulated,
        });
        await loadPlannerData(true);
      }
    } catch (err) {
      console.error('Failed to start task:', err);
    }
  };

  // Pause task
  const handlePauseTask = async (taskId: string, currentElapsedSeconds: number) => {
    try {
      const actualMinutes = Math.max(1, Math.round(currentElapsedSeconds / 60));
      const target = allTasks.find(t => t.id === taskId) || activeTask;

      if (target) {
        plannerTimerStorage.saveTimerState({
          taskId,
          studentId: currentUser.id,
          accumulatedSeconds: currentElapsedSeconds,
          lastStartedTimestamp: null,
          isPaused: true,
          status: target.status === 'CONTINUED' ? 'CONTINUED' : 'IN_PROGRESS',
          plannedDurationMinutes: target.plannedDurationMinutes || 30,
          title: target.title,
          priority: target.priority,
          startTime: target.startTime,
          startedAt: target.startedAt,
          updatedAt: new Date().toISOString(),
        });
      }

      await api.planner.updateTask(taskId, {
        secondsElapsed: currentElapsedSeconds,
        lastStartedTimestamp: undefined,
        isTimerRunning: false,
        actualDurationMinutes: actualMinutes,
        studentId: currentUser.id,
      });
      await loadPlannerData(true);
    } catch (err) {
      console.error('Failed to pause task:', err);
    }
  };

  // Resume task
  const handleResumeTask = async (taskId: string) => {
    try {
      const now = Date.now();
      const saved = plannerTimerStorage.getSavedTimerState(currentUser.id);
      const accumulated = saved?.accumulatedSeconds ?? activeTask?.secondsElapsed ?? 0;
      const target = allTasks.find(t => t.id === taskId) || activeTask;

      if (target) {
        plannerTimerStorage.saveTimerState({
          taskId,
          studentId: currentUser.id,
          accumulatedSeconds: accumulated,
          lastStartedTimestamp: now,
          isPaused: false,
          status: target.status === 'CONTINUED' ? 'CONTINUED' : 'IN_PROGRESS',
          plannedDurationMinutes: target.plannedDurationMinutes || 30,
          title: target.title,
          priority: target.priority,
          startTime: target.startTime,
          startedAt: target.startedAt,
          updatedAt: new Date().toISOString(),
        });
      }

      await api.planner.updateTask(taskId, {
        status: target?.status === 'CONTINUED' ? 'CONTINUED' : 'IN_PROGRESS',
        lastStartedTimestamp: now,
        isTimerRunning: true,
        secondsElapsed: accumulated,
        studentId: currentUser.id,
      });
      await loadPlannerData(true);
    } catch (err) {
      console.error('Failed to resume task:', err);
    }
  };

  // Complete task -> opens reflection modal
  const handleCompleteTask = async (task: PlannerTask, finalActualMinutes: number) => {
    try {
      plannerTimerStorage.clearSavedTimerState(currentUser.id);

      const updated = await api.planner.updateTask(task.id, {
        status: 'COMPLETED',
        actualDurationMinutes: finalActualMinutes,
        secondsElapsed: finalActualMinutes * 60,
        lastStartedTimestamp: undefined,
        isTimerRunning: false,
        completedAt: new Date().toISOString(),
        studentId: currentUser.id,
      });

      if (updated.task) {
        setActiveTask(null);
        setReflectionTask(updated.task);
        await loadPlannerData(true);
      }
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  // Continue task (overtime continuation)
  const handleContinueTask = async (taskId: string, currentElapsedSeconds: number) => {
    try {
      const now = Date.now();
      const target = allTasks.find(t => t.id === taskId) || activeTask;

      if (target) {
        plannerTimerStorage.saveTimerState({
          taskId,
          studentId: currentUser.id,
          accumulatedSeconds: currentElapsedSeconds,
          lastStartedTimestamp: now,
          isPaused: false,
          status: 'CONTINUED',
          plannedDurationMinutes: target.plannedDurationMinutes || 30,
          title: target.title,
          priority: target.priority,
          startTime: target.startTime,
          startedAt: target.startedAt,
          updatedAt: new Date().toISOString(),
        });
      }

      const updated = await api.planner.updateTask(taskId, {
        status: 'CONTINUED',
        secondsElapsed: currentElapsedSeconds,
        lastStartedTimestamp: now,
        isTimerRunning: true,
        studentId: currentUser.id,
      });

      if (updated.task) {
        setActiveTask({
          ...updated.task,
          secondsElapsed: currentElapsedSeconds,
          lastStartedTimestamp: now,
          isTimerRunning: true,
          status: 'CONTINUED',
        });
        await loadPlannerData(true);
      }
    } catch (err) {
      console.error('Failed to continue task:', err);
    }
  };

  // Update status directly
  const handleUpdateStatus = async (taskId: string, status: TaskStatus) => {
    try {
      if (status === 'COMPLETED' || status === 'NOT_COMPLETED') {
        if (activeTask?.id === taskId) {
          plannerTimerStorage.clearSavedTimerState(currentUser.id);
          setActiveTask(null);
        }
      }
      await api.planner.updateTask(taskId, { status, studentId: currentUser.id });
      await loadPlannerData(true);
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  // Save reflection
  const handleSaveReflection = async (taskId: string, reflection: TaskReflection) => {
    try {
      await api.planner.updateTask(taskId, {
        reflection,
        status: 'COMPLETED',
        studentId: currentUser.id,
      });
      await loadPlannerData(true);
    } catch (err) {
      console.error('Failed to save reflection:', err);
    }
  };

  // Delete task triggers in-app confirmation modal
  const handleDeleteTask = async (taskId: string) => {
    const task = allTasks.find(t => t.id === taskId) || todayTasks.find(t => t.id === taskId);
    if (task) {
      setTaskToDelete(task);
    } else {
      // Direct optimistic delete fallback
      await handleConfirmDelete(taskId);
    }
  };

  const handleConfirmDelete = async (taskId: string) => {
    // 1. Optimistic removal so schedule updates immediately
    setTodayTasks(prev => prev.filter(t => t.id !== taskId));
    setAllTasks(prev => prev.filter(t => t.id !== taskId));
    if (activeTask?.id === taskId) {
      plannerTimerStorage.clearSavedTimerState(currentUser.id);
      setActiveTask(null);
    }
    if (reflectionTask?.id === taskId) {
      setReflectionTask(null);
    }
    setTaskToDelete(null);

    // 2. Call API
    try {
      await api.planner.deleteTask(taskId, currentUser.id);
      await loadPlannerData(true);
    } catch (err) {
      console.error('Failed to delete task:', err);
      // Refresh to restore if needed
      await loadPlannerData(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-400">Loading Todo & Time Planner...</p>
      </div>
    );
  }

  // Fallback defaults for today summary if analytics is loading
  const todaySummary = analytics?.today || {
    date: todayDateStr,
    day: 'Today',
    totalTasks: todayTasks.length,
    completedTasks: todayTasks.filter(t => t.status === 'COMPLETED').length,
    notCompletedTasks: todayTasks.filter(t => t.status === 'NOT_COMPLETED').length,
    continuedTasks: todayTasks.filter(t => t.status === 'CONTINUED').length,
    completionPercentage: todayTasks.length > 0 ? Math.round((todayTasks.filter(t => t.status === 'COMPLETED').length / todayTasks.length) * 100) : 0,
    plannedStudyMinutes: todayTasks.reduce((acc, t) => acc + (t.plannedDurationMinutes || 0), 0),
    actualStudyMinutes: todayTasks.reduce((acc, t) => acc + (t.actualDurationMinutes || 0), 0),
    completedOnTimeCount: todayTasks.filter(t => t.status === 'COMPLETED' && (t.actualDurationMinutes || 0) <= (t.plannedDurationMinutes || 0)).length,
    lateOrContinuedCount: todayTasks.filter(t => t.status === 'CONTINUED' || (t.status === 'COMPLETED' && (t.actualDurationMinutes || 0) > (t.plannedDurationMinutes || 0))).length,
    reflections: [],
    distractionsList: [],
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* Top Planner Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('TODAY')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'TODAY'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Today's Schedule (Live)</span>
            {todayTasks.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300 font-mono">
                {todayTasks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('WEEKLY')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'WEEKLY'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Weekly Analysis</span>
          </button>

          <button
            onClick={() => setActiveTab('MONTHLY')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'MONTHLY'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Monthly Analysis</span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'HISTORY'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>All History</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-400 font-mono">
              {allTasks.length}
            </span>
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={() => {
              setRefreshing(true);
              loadPlannerData(true);
            }}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Refresh Planner Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Tab Panels */}
      {activeTab === 'TODAY' && (
        <LiveScheduleView
          tasks={todayTasks}
          todaySummary={todaySummary}
          activeTaskId={activeTask?.id || null}
          onStartTask={handleStartTask}
          onOpenReflection={task => setReflectionTask(task)}
          onUpdateStatus={handleUpdateStatus}
          onCreateTask={handleCreateTask}
          onDeleteTask={handleDeleteTask}
          studentName={currentUser.name}
        />
      )}

      {activeTab === 'WEEKLY' && analytics && (
        <WeeklyAnalysisView weeklySummary={analytics.week} />
      )}

      {activeTab === 'MONTHLY' && analytics && (
        <MonthlyAnalysisView monthlySummary={analytics.month} />
      )}

      {activeTab === 'HISTORY' && (
        <HistoryLogView
          tasks={allTasks}
          onOpenReflection={task => setReflectionTask(task)}
          onDeleteTask={handleDeleteTask}
        />
      )}

      {/* Delete Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Delete Scheduled Task?</h3>
                  <span className="text-xs text-slate-400">This action will remove the task immediately.</span>
                </div>
              </div>
              <button
                onClick={() => setTaskToDelete(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/70 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-semibold text-white truncate max-w-[240px]">{taskToDelete.title}</span>
                <span className="font-mono text-slate-300">{taskToDelete.startTime}</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Duration: <strong className="text-slate-200">{taskToDelete.plannedDurationMinutes} mins</strong> • Priority: <span className="capitalize font-medium text-amber-300">{taskToDelete.priority.toLowerCase()}</span>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setTaskToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmDelete(taskToDelete.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Task</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Task Reflection Modal */}
      {reflectionTask && (
        <PostTaskReflectionModal
          task={reflectionTask}
          isOpen={!!reflectionTask}
          onClose={() => setReflectionTask(null)}
          onSaveReflection={handleSaveReflection}
        />
      )}

      {/* Live Active Countdown Timer Bar & Notifications */}
      {activeTask && (
        <LiveTimerWidget
          activeTask={activeTask}
          studentName={currentUser.name}
          allTodayTasks={todayTasks}
          onPauseTask={handlePauseTask}
          onResumeTask={handleResumeTask}
          onCompleteTask={handleCompleteTask}
          onContinueTask={handleContinueTask}
          onSelectTaskToStart={handleStartTask}
          isTakingTest={isTakingTest}
        />
      )}
    </div>
  );
};
