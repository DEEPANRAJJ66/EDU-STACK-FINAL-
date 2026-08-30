import React, { useState } from 'react';
import { PlannerTask, DayProgressSummary, TaskPriority, TaskStatus, TaskReflection } from '../../types';
import {
  getISTTime,
  getISTDateStr,
  getISTDayName,
  getISTFormattedFull,
  formatTo12HourIST,
  calculateEndTimeIST,
} from '../../utils/istTime';
import {
  Calendar,
  Clock,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Flame,
  Check,
  Trash2,
  Edit3,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Brain,
  Smartphone,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';

interface LiveScheduleViewProps {
  tasks: PlannerTask[];
  todaySummary: DayProgressSummary;
  activeTaskId: string | null;
  onStartTask: (task: PlannerTask) => void;
  onOpenReflection: (task: PlannerTask) => void;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onCreateTask: (data: {
    title: string;
    startTime: string;
    plannedDurationMinutes: number;
    priority: TaskPriority;
  }) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  studentName: string;
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; bg: string; text: string; border: string }> = {
  LOW: { label: 'Low Priority', bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' },
  MEDIUM: { label: 'Medium Priority', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' },
  HIGH: { label: 'High Priority', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40' },
  URGENT: { label: 'Urgent', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/40' },
};

const STATUS_CONFIG: Record<TaskStatus, { label: string; bg: string; text: string; border: string }> = {
  UPCOMING: { label: 'Upcoming', bg: 'bg-slate-800/80', text: 'text-slate-300', border: 'border-slate-700' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/50' },
  COMPLETED: { label: 'Completed', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/50' },
  NOT_COMPLETED: { label: 'Not Completed', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/40' },
  CONTINUED: { label: 'Continued', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/50' },
};

export const LiveScheduleView: React.FC<LiveScheduleViewProps> = ({
  tasks = [],
  todaySummary,
  activeTaskId,
  onStartTask,
  onOpenReflection,
  onUpdateStatus,
  onCreateTask,
  onDeleteTask,
  studentName,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [startTime, setStartTime] = useState(() => getISTTime());
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [priority, setPriority] = useState<TaskPriority>('HIGH');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReflectionsAccordion, setShowReflectionsAccordion] = useState(true);

  // Auto-calculated current date in Indian Standard Time (Asia/Kolkata)
  const formattedToday = `${getISTFormattedFull()} (IST)`;

  const handleOpenCreateModal = () => {
    // Automatically capture exact current Indian time (IST) at this moment
    const currentIST = getISTTime();
    setStartTime(currentIST);
    setTaskTitle('');
    setDurationMinutes(60);
    setPriority('HIGH');
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreateTask({
        title: taskTitle.trim(),
        startTime: startTime || getISTTime(),
        plannedDurationMinutes: Number(durationMinutes),
        priority,
      });
      setTaskTitle('');
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error('Error creating task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Quick Add */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Live Today Schedule</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Today's Planner & Live Schedule
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {formattedToday} • Focus on: <strong className="text-slate-200">"What do I need to do NOW?"</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Schedule</span>
          </button>
        </div>
      </div>

      {/* 2. Today's Live Metric Snapshot */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Completion</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-white">{todaySummary.completionPercentage}%</span>
            <span className="text-xs text-slate-400">({todaySummary.completedTasks}/{todaySummary.totalTasks})</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full"
              style={{ width: `${todaySummary.completionPercentage}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Study Time</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-indigo-400">
              {(todaySummary.actualStudyMinutes / 60).toFixed(1)}h
            </span>
            <span className="text-xs text-slate-400">/ {(todaySummary.plannedStudyMinutes / 60).toFixed(1)}h plan</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            {todaySummary.actualStudyMinutes} mins logged today
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">On-Time vs Late</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-400">{todaySummary.completedOnTimeCount}</span>
            <span className="text-xs text-slate-400">on-time / {todaySummary.lateOrContinuedCount} continued</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            {todaySummary.continuedTasks} sessions extended
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Reflections</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-400">{todaySummary.reflections.length}</span>
            <span className="text-xs text-slate-400">written notes</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            {todaySummary.distractionsList.length} distraction tags
          </span>
        </div>
      </div>

      {/* 3. Chronological Task Timeline List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>Chronological Task Schedule ({tasks.length})</span>
          </h3>
          <span className="text-xs text-slate-400">Sorted by Scheduled Start Time</span>
        </div>

        {tasks.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">No tasks scheduled for today</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Add your practice tasks, question targets, and mock review blocks for today to start the live timer.
              </p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Schedule</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map(task => {
              const pConf = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
              const sConf = STATUS_CONFIG[task.status] || STATUS_CONFIG.UPCOMING;
              const isActive = activeTaskId === task.id;
              const endTime = calculateEndTimeIST(task.startTime, task.plannedDurationMinutes);
              const hasReflection = task.reflection && (
                task.reflection.distractions ||
                task.reflection.difficulties ||
                task.reflection.improvements ||
                task.reflection.notes ||
                (task.reflection.distractionTags && task.reflection.distractionTags.length > 0)
              );

              return (
                <div
                  key={task.id}
                  className={`bg-slate-900 border rounded-2xl p-4 sm:p-5 transition-all duration-200 ${
                    isActive
                      ? 'border-indigo-500/80 shadow-lg shadow-indigo-500/10 bg-slate-900/95 ring-1 ring-indigo-500/50'
                      : task.status === 'COMPLETED'
                      ? 'border-slate-800/80 opacity-90'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Time & Details */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      {/* Start Time Stamp Badge */}
                      <div className="shrink-0 text-center px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700/70 min-w-[76px]">
                        <span className="text-xs font-black text-white block font-mono">{task.startTime}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">to {endTime}</span>
                        <span className="text-[9px] text-amber-400/80 font-bold block uppercase tracking-wider">IST</span>
                      </div>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${pConf.bg} ${pConf.text} ${pConf.border}`}>
                            {pConf.label}
                          </span>

                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${sConf.bg} ${sConf.text} ${sConf.border}`}>
                            {sConf.label}
                          </span>

                          <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>Planned: {task.plannedDurationMinutes}m</span>
                            {task.actualDurationMinutes > 0 && (
                              <span className="text-slate-300">
                                • Actual: <strong className={task.actualDurationMinutes > task.plannedDurationMinutes ? 'text-amber-400' : 'text-emerald-400'}>{task.actualDurationMinutes}m</strong>
                              </span>
                            )}
                          </span>
                        </div>

                        <h4 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
                          {task.title}
                        </h4>

                        {/* Reflection Tag Badges Preview if present */}
                        {hasReflection && task.reflection?.distractionTags && task.reflection.distractionTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {task.reflection.distractionTags.map(tag => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-medium"
                              >
                                <Smartphone className="w-3 h-3" />
                                <span>{tag}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {task.status !== 'COMPLETED' ? (
                        <>
                          <button
                            onClick={() => onStartTask(task)}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-md ${
                              isActive
                                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                            }`}
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>{isActive ? 'Active Timer' : task.status === 'CONTINUED' ? 'Resume Continued' : 'Start Task'}</span>
                          </button>

                          <button
                            onClick={() => onOpenReflection(task)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border border-emerald-700/50 text-xs font-bold transition cursor-pointer"
                            title="Mark as completed & write reflection"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Mark Complete</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => onOpenReflection(task)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{hasReflection ? 'View Reflection' : 'Add Reflection'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition cursor-pointer"
                        title="Delete Task from Schedule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Day Progress & Reflections Summary */}
      {todaySummary.reflections.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => setShowReflectionsAccordion(!showReflectionsAccordion)}
          >
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Brain className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Today's Recorded Reflections & Insights</h3>
                <p className="text-xs text-slate-400">Authentic observations entered during post-task completions</p>
              </div>
            </div>

            <button className="text-slate-400 hover:text-white p-1">
              {showReflectionsAccordion ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

          {showReflectionsAccordion && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2 border-t border-slate-800">
              {todaySummary.reflections.map(r => (
                <div
                  key={r.taskId}
                  className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-700/40 pb-2">
                    <span className="font-bold text-slate-200 truncate">{r.taskTitle}</span>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase">Recorded</span>
                  </div>

                  {r.reflection.distractions && (
                    <div>
                      <span className="text-slate-400 font-semibold block text-[11px]">Distraction:</span>
                      <p className="text-slate-300">{r.reflection.distractions}</p>
                    </div>
                  )}

                  {r.reflection.difficulties && (
                    <div>
                      <span className="text-slate-400 font-semibold block text-[11px]">Difficulty:</span>
                      <p className="text-slate-300">{r.reflection.difficulties}</p>
                    </div>
                  )}

                  {r.reflection.improvements && (
                    <div>
                      <span className="text-emerald-400 font-semibold block text-[11px]">Improvement Goal:</span>
                      <p className="text-slate-300">{r.reflection.improvements}</p>
                    </div>
                  )}

                  {r.reflection.notes && (
                    <div>
                      <span className="text-slate-400 font-semibold block text-[11px]">Session Notes:</span>
                      <p className="text-slate-300">{r.reflection.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. CREATE TASK MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-100 my-8">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <h3 className="text-lg font-bold text-white tracking-tight">New Schedule</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Start time is automatically synced to Indian Standard Time (IST). You can freely edit the time.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Task Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">
                  Task Name / Objective <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder="e.g. Solve 50 questions in Electrostatics, Revise Organic Mechanisms..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>

              {/* Auto Assigned Date & Day (Read-only banner in IST) */}
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-xs text-slate-300">
                <span className="text-slate-400">Schedule Date:</span>
                <span className="font-bold text-indigo-300 font-mono">{formattedToday}</span>
              </div>

              {/* Start Time & Duration with IST Sync */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <label className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Start Time (IST)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setStartTime(getISTTime())}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 transition cursor-pointer"
                      title="Sync with current Indian Time"
                    >
                      <RotateCw className="w-2.5 h-2.5" />
                      <span>Now (IST)</span>
                    </button>
                  </div>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono transition"
                  />
                  <div className="text-[11px] text-slate-400 pt-0.5 flex items-center justify-between">
                    <span>Selected: <strong className="text-amber-300 font-mono">{formatTo12HourIST(startTime)}</strong></span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200">Planned Duration</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={5}
                      max={360}
                      step={5}
                      value={durationMinutes}
                      onChange={e => setDurationMinutes(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                    />
                    <span className="text-xs text-slate-400 font-medium shrink-0">mins</span>
                  </div>
                  <div className="text-[11px] text-slate-400 pt-0.5">
                    <span>Est. End: <strong className="text-emerald-300 font-mono">{formatTo12HourIST(calculateEndTimeIST(startTime, durationMinutes))}</strong></span>
                  </div>
                </div>
              </div>

              {/* Quick Duration Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[15, 30, 45, 60, 90, 120].map(mins => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDurationMinutes(mins)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                      durationMinutes === mins
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">Priority Level</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as TaskPriority[]).map(p => {
                    const conf = PRIORITY_CONFIG[p];
                    const isSelected = priority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`py-2 rounded-xl text-xs font-bold border transition text-center capitalize ${
                          isSelected
                            ? `${conf.bg} ${conf.text} ${conf.border} ring-1 ring-current`
                            : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        {p.toLowerCase()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !taskTitle.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Scheduling...' : 'Save to Schedule'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
