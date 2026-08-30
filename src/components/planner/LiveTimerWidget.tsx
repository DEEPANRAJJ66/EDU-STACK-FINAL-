import React, { useState, useEffect, useRef } from 'react';
import { PlannerTask } from '../../types';
import { getISTTime } from '../../utils/istTime';
import { plannerTimerStorage } from '../../utils/plannerTimerStorage';
import {
  Play,
  Pause,
  CheckCircle,
  Clock,
  RotateCw,
  AlertCircle,
  Bell,
  X,
  Sparkles,
  ChevronRight,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface LiveTimerWidgetProps {
  activeTask: PlannerTask | null;
  studentName: string;
  allTodayTasks: PlannerTask[];
  onPauseTask: (taskId: string, currentElapsedSeconds: number) => void;
  onResumeTask: (taskId: string) => void;
  onCompleteTask: (task: PlannerTask, finalActualMinutes: number) => void;
  onContinueTask: (taskId: string, currentElapsedSeconds: number) => void;
  onSelectTaskToStart?: (task: PlannerTask) => void;
  isTakingTest?: boolean;
}

export const LiveTimerWidget: React.FC<LiveTimerWidgetProps> = ({
  activeTask,
  studentName,
  allTodayTasks = [],
  onPauseTask,
  onResumeTask,
  onCompleteTask,
  onContinueTask,
  onSelectTaskToStart,
  isTakingTest = false,
}) => {
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showStartToast, setShowStartToast] = useState<boolean>(false);
  const [showPreEndReminder, setShowPreEndReminder] = useState<boolean>(false);
  const [showTimeOverModal, setShowTimeOverModal] = useState<boolean>(false);
  const [nextTaskNotification, setNextTaskNotification] = useState<PlannerTask | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [minimized, setMinimized] = useState<boolean>(false);

  const prevTaskIdRef = useRef<string | null>(null);
  const notifiedPreEndRef = useRef<boolean>(false);
  const notifiedTimeOverRef = useRef<boolean>(false);
  const lastSyncTimeRef = useRef<number>(0);

  // Soft audio chime using Web Audio API (no external asset dependencies)
  const playChime = (type: 'START' | 'WARNING' | 'COMPLETED') => {
    if (!soundEnabled || typeof window === 'undefined' || isTakingTest) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'START') {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'WARNING') {
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.15); // E5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else {
        // Double ding for completion / time over
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.2); // A5
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      }
    } catch {
      // Audio playback fails gracefully in sandboxed browser
    }
  };

  // Sync state when activeTask changes or on initial mount
  useEffect(() => {
    if (activeTask) {
      const saved = plannerTimerStorage.getSavedTimerState(activeTask.studentId);
      const isMatchingSaved = saved && saved.taskId === activeTask.id;
      
      const computedSeconds = plannerTimerStorage.computeElapsedSeconds(
        isMatchingSaved ? saved : activeTask
      );
      
      const pausedState = isMatchingSaved 
        ? saved.isPaused 
        : (activeTask.isTimerRunning === false);

      setSecondsElapsed(computedSeconds);
      setIsPaused(pausedState);

      const isFreshStart = prevTaskIdRef.current !== activeTask.id && (!isMatchingSaved || (computedSeconds < 5 && !pausedState && Math.abs(Date.now() - (saved.lastStartedTimestamp || 0)) < 4000));
      
      if (prevTaskIdRef.current !== activeTask.id) {
        prevTaskIdRef.current = activeTask.id;
        notifiedPreEndRef.current = false;
        notifiedTimeOverRef.current = false;

        if (isFreshStart) {
          setShowStartToast(true);
          playChime('START');
          const t = setTimeout(() => setShowStartToast(false), 6000);
          return () => clearTimeout(t);
        }
      }
    } else {
      prevTaskIdRef.current = null;
      setSecondsElapsed(0);
      setIsPaused(false);
      setShowTimeOverModal(false);
      setShowPreEndReminder(false);
    }
  }, [activeTask?.id]);

  // Main Persistent Timer Interval (Resilient to tab switches & frame throttling)
  useEffect(() => {
    if (!activeTask || isPaused || activeTask.status === 'COMPLETED') return;

    const plannedSeconds = (activeTask.plannedDurationMinutes || 30) * 60;

    const tick = () => {
      const saved = plannerTimerStorage.getSavedTimerState(activeTask.studentId);
      const isMatchingSaved = saved && saved.taskId === activeTask.id;

      const currentTarget = isMatchingSaved ? saved : activeTask;
      const currentSeconds = plannerTimerStorage.computeElapsedSeconds(currentTarget);

      setSecondsElapsed(currentSeconds);

      // Keep storage in sync periodically (every second)
      const now = Date.now();
      if (now - lastSyncTimeRef.current > 1000) {
        lastSyncTimeRef.current = now;
        plannerTimerStorage.saveTimerState({
          taskId: activeTask.id,
          studentId: activeTask.studentId,
          accumulatedSeconds: isMatchingSaved ? saved.accumulatedSeconds : (activeTask.secondsElapsed || 0),
          lastStartedTimestamp: isMatchingSaved && saved.lastStartedTimestamp ? saved.lastStartedTimestamp : (activeTask.lastStartedTimestamp || now),
          isPaused: false,
          status: activeTask.status === 'CONTINUED' ? 'CONTINUED' : 'IN_PROGRESS',
          plannedDurationMinutes: activeTask.plannedDurationMinutes || 30,
          title: activeTask.title,
          priority: activeTask.priority,
          startTime: activeTask.startTime,
          startedAt: activeTask.startedAt,
          updatedAt: new Date().toISOString(),
        });
      }

      // Check 5-minute pre-end reminder (if planned time >= 15m)
      if (plannedSeconds >= 900 && plannedSeconds - currentSeconds <= 300 && plannedSeconds - currentSeconds > 290 && !notifiedPreEndRef.current) {
        notifiedPreEndRef.current = true;
        setShowPreEndReminder(true);
        playChime('WARNING');
      }

      // Check time over reminder
      if (currentSeconds >= plannedSeconds && !notifiedTimeOverRef.current && activeTask.status !== 'CONTINUED') {
        notifiedTimeOverRef.current = true;
        setShowTimeOverModal(true);
        playChime('COMPLETED');
      }
    };

    // Immediate tick on mount/resume
    tick();

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeTask?.id, isPaused, activeTask?.status, activeTask?.plannedDurationMinutes]);

  // Next Scheduled Task Detection in Indian Standard Time (IST)
  useEffect(() => {
    if (isTakingTest) return;

    const checkNextTask = () => {
      const currentTimeStr = getISTTime();

      const upcoming = allTodayTasks.find(
        t => t.status === 'UPCOMING' && t.startTime === currentTimeStr && t.id !== activeTask?.id
      );

      if (upcoming && (!nextTaskNotification || nextTaskNotification.id !== upcoming.id)) {
        setNextTaskNotification(upcoming);
        playChime('WARNING');
      }
    };

    const interval = setInterval(checkNextTask, 15000);
    return () => clearInterval(interval);
  }, [allTodayTasks, activeTask?.id, nextTaskNotification, isTakingTest]);

  if (isTakingTest || !activeTask) {
    return null;
  }

  const plannedTotalSeconds = (activeTask.plannedDurationMinutes || 30) * 60;
  const remainingSeconds = Math.max(0, plannedTotalSeconds - secondsElapsed);
  const isOvertime = secondsElapsed > plannedTotalSeconds;
  const overtimeSeconds = secondsElapsed - plannedTotalSeconds;

  const formatTime = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const progressPercent = Math.min(100, Math.round((secondsElapsed / plannedTotalSeconds) * 100));

  const handlePauseToggle = () => {
    if (isPaused) {
      // Resume
      setIsPaused(false);
      const now = Date.now();
      plannerTimerStorage.saveTimerState({
        taskId: activeTask.id,
        studentId: activeTask.studentId,
        accumulatedSeconds: secondsElapsed,
        lastStartedTimestamp: now,
        isPaused: false,
        status: activeTask.status === 'CONTINUED' ? 'CONTINUED' : 'IN_PROGRESS',
        plannedDurationMinutes: activeTask.plannedDurationMinutes || 30,
        title: activeTask.title,
        priority: activeTask.priority,
        startTime: activeTask.startTime,
        startedAt: activeTask.startedAt,
        updatedAt: new Date().toISOString(),
      });
      onResumeTask(activeTask.id);
    } else {
      // Pause
      setIsPaused(true);
      plannerTimerStorage.saveTimerState({
        taskId: activeTask.id,
        studentId: activeTask.studentId,
        accumulatedSeconds: secondsElapsed,
        lastStartedTimestamp: null,
        isPaused: true,
        status: activeTask.status === 'CONTINUED' ? 'CONTINUED' : 'IN_PROGRESS',
        plannedDurationMinutes: activeTask.plannedDurationMinutes || 30,
        title: activeTask.title,
        priority: activeTask.priority,
        startTime: activeTask.startTime,
        startedAt: activeTask.startedAt,
        updatedAt: new Date().toISOString(),
      });
      onPauseTask(activeTask.id, secondsElapsed);
    }
  };

  const handleMarkComplete = () => {
    setShowTimeOverModal(false);
    plannerTimerStorage.clearSavedTimerState(activeTask.studentId);
    const finalMinutes = Math.max(1, Math.round(secondsElapsed / 60));
    onCompleteTask(activeTask, finalMinutes);
  };

  const handleContinue = () => {
    setShowTimeOverModal(false);
    const now = Date.now();
    plannerTimerStorage.saveTimerState({
      taskId: activeTask.id,
      studentId: activeTask.studentId,
      accumulatedSeconds: secondsElapsed,
      lastStartedTimestamp: now,
      isPaused: false,
      status: 'CONTINUED',
      plannedDurationMinutes: activeTask.plannedDurationMinutes || 30,
      title: activeTask.title,
      priority: activeTask.priority,
      startTime: activeTask.startTime,
      startedAt: activeTask.startedAt,
      updatedAt: new Date().toISOString(),
    });
    onContinueTask(activeTask.id, secondsElapsed);
  };

  return (
    <>
      {/* 1. START TOAST NOTIFICATION: "[Student Name], ready to solve..." */}
      {showStartToast && (
        <div className="fixed top-20 right-6 z-50 max-w-md w-full bg-slate-900/95 border border-indigo-500/60 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-slide-in text-white space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-indigo-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">Session Started</span>
            </div>
            <button
              onClick={() => setShowStartToast(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm font-medium text-slate-100 leading-relaxed">
            "{studentName}, ready to solve {activeTask.title}? Duration: {activeTask.plannedDurationMinutes} minutes."
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
            <span>Priority: <strong className="text-amber-300">{activeTask.priority}</strong></span>
            <span>Planned: <strong>{activeTask.plannedDurationMinutes}m</strong></span>
          </div>
        </div>
      )}

      {/* 2. 5-MINUTE PRE-END REMINDER */}
      {showPreEndReminder && !showTimeOverModal && (
        <div className="fixed top-20 right-6 z-50 max-w-md w-full bg-slate-900/95 border border-amber-500/60 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-slide-in text-white space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-400">
              <Bell className="w-5 h-5 animate-bounce" />
              <span className="text-xs font-bold uppercase tracking-wider">Time Warning</span>
            </div>
            <button
              onClick={() => setShowPreEndReminder(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm font-medium text-slate-200">
            ⚠️ Reminder: <strong>5 minutes remaining</strong> for <span className="text-amber-300">{activeTask.title}</span>. Wrap up your current question!
          </p>
        </div>
      )}

      {/* 3. SCHEDULED TIME OVER MODAL (Never auto-marks complete; offers Complete vs Continue) */}
      {showTimeOverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border-2 border-amber-500/70 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-white space-y-5">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Scheduled Time is Over!</h3>
                <p className="text-xs text-slate-400">Target duration ({activeTask.plannedDurationMinutes} mins) completed.</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
              <p className="text-sm font-semibold text-slate-200">{activeTask.title}</p>
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-700/60">
                <span>Planned: {activeTask.plannedDurationMinutes}m</span>
                <span>Elapsed: {Math.round(secondsElapsed / 60)}m</span>
                <span className="text-amber-400 font-medium">Status: Awaiting Action</span>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Would you like to wrap up and write your post-task reflection, or continue solving with extra time?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleContinue}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-xs font-bold transition cursor-pointer"
              >
                <RotateCw className="w-4 h-4 text-amber-400" />
                <span>Continue Task</span>
              </button>

              <button
                onClick={handleMarkComplete}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Mark as Completed</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. NEXT SCHEDULED TASK ALERT */}
      {nextTaskNotification && (
        <div className="fixed bottom-24 right-6 z-50 max-w-md w-full bg-slate-900/95 border border-indigo-500/60 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-slide-in text-white space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-indigo-400">
              <Bell className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Next Task Starting</span>
            </div>
            <button
              onClick={() => setNextTaskNotification(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-slate-200">
            Scheduled start time arrived for: <strong className="text-white">{nextTaskNotification.title}</strong> ({nextTaskNotification.startTime}).
          </p>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setNextTaskNotification(null)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition"
            >
              Dismiss
            </button>
            {onSelectTaskToStart && (
              <button
                onClick={() => {
                  onSelectTaskToStart(nextTaskNotification);
                  setNextTaskNotification(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition"
              >
                Switch to Task
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. FLOATING DOCKED LIVE TIMER BAR */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-3xl w-[94%] sm:w-full bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-lg text-slate-100 p-4 transition-all duration-300">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Task Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`p-2.5 rounded-xl ${
              isOvertime
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
            }`}>
              <Clock className={`w-5 h-5 ${!isPaused ? 'animate-pulse' : ''}`} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                  {activeTask.status === 'CONTINUED' ? 'Continued Task' : 'Live Task'}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wide">
                  {activeTask.priority}
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-white truncate" title={activeTask.title}>
                {activeTask.title}
              </h4>
            </div>
          </div>

          {/* Center: Live Digital Countdown */}
          <div className="text-center px-2 shrink-0">
            <div className="flex items-baseline justify-center gap-1.5">
              <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                isOvertime ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {isOvertime ? `+${formatTime(overtimeSeconds)}` : formatTime(remainingSeconds)}
              </span>
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                {isOvertime ? 'overtime' : 'remaining'}
              </span>
            </div>

            <div className="w-28 sm:w-36 h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden border border-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isOvertime ? 'bg-amber-400' : 'bg-gradient-to-r from-indigo-500 to-emerald-400'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border transition ${
                soundEnabled
                  ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                  : 'bg-slate-800/40 border-slate-800 text-slate-500'
              }`}
              title={soundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={handlePauseToggle}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                isPaused
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
              <span className="hidden sm:inline">{isPaused ? 'Resume' : 'Pause'}</span>
            </button>

            <button
              onClick={handleMarkComplete}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Complete</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
