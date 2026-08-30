import React from 'react';
import { WeeklyProgressSummary } from '../../types';
import {
  Calendar,
  Clock,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  RotateCw,
  Award,
  Sparkles,
  Smartphone,
  Brain,
  ShieldAlert,
  BarChart3,
  FileText,
} from 'lucide-react';

interface WeeklyAnalysisViewProps {
  weeklySummary: WeeklyProgressSummary;
}

export const WeeklyAnalysisView: React.FC<WeeklyAnalysisViewProps> = ({ weeklySummary }) => {
  const {
    startDate,
    endDate,
    totalTasks,
    completedTasks,
    missedTasks,
    continuedTasks,
    completionPercentage,
    totalPlannedMinutes,
    totalActualMinutes,
    onTimeCompletionCount,
    consistencyScore,
    dailyStats = [],
    commonDistractions = [],
    improvementNotes = [],
  } = weeklySummary;

  const plannedHours = (totalPlannedMinutes / 60).toFixed(1);
  const actualHours = (totalActualMinutes / 60).toFixed(1);
  const timeDifferenceHours = ((totalActualMinutes - totalPlannedMinutes) / 60).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <BarChart3 className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Weekly Performance Report</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
            Weekly Study & Consistency Analysis
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Window: <strong className="text-slate-200">{startDate}</strong> to <strong className="text-slate-200">{endDate}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700/80 text-right">
            <span className="text-[11px] text-slate-400 block font-medium">Consistency Score</span>
            <span className="text-lg font-black text-emerald-400">{consistencyScore}%</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Completion % */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Completion Rate</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{completionPercentage}%</span>
            <span className="text-xs text-slate-400">({completedTasks}/{totalTasks})</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Planned vs Actual Hours */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Study Hours</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-400">{actualHours}h</span>
            <span className="text-xs text-slate-400">/ {plannedHours}h plan</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            {Number(timeDifferenceHours) >= 0 ? `+${timeDifferenceHours}h over plan` : `${timeDifferenceHours}h below plan`}
          </span>
        </div>

        {/* Task Outcomes */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Completed vs Missed</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{completedTasks}</span>
            <span className="text-xs text-rose-400 font-semibold">{missedTasks} missed</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            {onTimeCompletionCount} on-time • {continuedTasks} continued
          </span>
        </div>

        {/* Recorded Distractions */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Distraction Tags</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-400">{commonDistractions.length}</span>
            <span className="text-xs text-slate-400">logged tags</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            {improvementNotes.length} recorded notes
          </span>
        </div>
      </div>

      {/* 7-Day Consistency Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Daily Consistency & Study Log</span>
            </h3>
            <p className="text-xs text-slate-400">Day-by-day task execution and study time distribution</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {dailyStats.map(day => {
            const hasActivity = day.total > 0;
            const rate = day.total > 0 ? Math.round((day.completed / day.total) * 100) : 0;
            return (
              <div
                key={day.date}
                className={`rounded-xl p-3.5 border transition-all ${
                  hasActivity
                    ? 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
                    : 'bg-slate-900/40 border-slate-800/60 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-700/50">
                  <span className="font-bold text-white">{day.shortDay || day.day.slice(0, 3)}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{day.date.slice(5)}</span>
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Completion</span>
                    <span className="font-bold text-white">
                      {hasActivity ? `${rate}%` : '—'}
                    </span>
                    {hasActivity && (
                      <span className="text-[10px] text-slate-400 ml-1">
                        ({day.completed}/{day.total})
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 block">Study Time</span>
                    <span className="font-semibold text-indigo-300">
                      {hasActivity ? `${(day.actualMinutes / 60).toFixed(1)}h` : '0h'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Plan: {(day.plannedMinutes / 60).toFixed(1)}h
                    </span>
                  </div>

                  <div className="w-full h-1 bg-slate-700/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full"
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Columns: Distraction Patterns & Student Improvement Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Recorded Distraction Patterns */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Reported Distraction Patterns</h3>
              <p className="text-xs text-slate-400">Frequency of self-reported study interruptions</p>
            </div>
          </div>

          {commonDistractions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-800/40 rounded-xl border border-slate-800">
              No distractions recorded this week. Great concentration!
            </div>
          ) : (
            <div className="space-y-2.5">
              {commonDistractions.map(item => (
                <div
                  key={item.tag}
                  className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="font-semibold text-slate-200">{item.tag}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold font-mono">
                    {item.count} {item.count === 1 ? 'time' : 'times'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Student Self-Improvement Goals */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Brain className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Recorded Improvement Goals</h3>
              <p className="text-xs text-slate-400">Actual takeaways written in post-task reflections</p>
            </div>
          </div>

          {improvementNotes.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-800/40 rounded-xl border border-slate-800">
              No improvement notes written yet. Write reflections after completing tasks!
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {improvementNotes.map((note, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60 text-xs space-y-1"
                >
                  <p className="text-slate-200 italic">"{note}"</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
