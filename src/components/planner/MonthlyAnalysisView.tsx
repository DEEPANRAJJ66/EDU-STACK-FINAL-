import React from 'react';
import { MonthlyProgressSummary } from '../../types';
import {
  Calendar,
  Clock,
  TrendingUp,
  Award,
  AlertOctagon,
  CheckCircle,
  BarChart,
  ShieldAlert,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  Sparkles,
} from 'lucide-react';

interface MonthlyAnalysisViewProps {
  monthlySummary: MonthlyProgressSummary;
}

export const MonthlyAnalysisView: React.FC<MonthlyAnalysisViewProps> = ({ monthlySummary }) => {
  const {
    monthName,
    year,
    totalTasks,
    completedTasks,
    missedTasks,
    continuedTasks,
    completionPercentage,
    totalPlannedMinutes,
    totalActualMinutes,
    bestPerformingDays = [],
    lowPerformingDays = [],
    weeklyTrend = [],
    commonDistractions = [],
    consistencyScore,
    reflectionsCount,
  } = monthlySummary;

  const plannedHours = (totalPlannedMinutes / 60).toFixed(1);
  const actualHours = (totalActualMinutes / 60).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Calendar className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Monthly Long-Term Overview</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
            Monthly Analysis & Habit Retention ({monthName} {year})
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Comprehensive evaluation of study discipline, peak focus days, and weekly trends.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700/80 text-right">
            <span className="text-[11px] text-slate-400 block font-medium">Monthly Consistency</span>
            <span className="text-lg font-black text-emerald-400">{consistencyScore}%</span>
          </div>
        </div>
      </div>

      {/* 4 Core Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Completion Rate</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-white">{completionPercentage}%</span>
            <span className="text-xs text-slate-400">({completedTasks}/{totalTasks})</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            {missedTasks} tasks missed this month
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Total Study Time</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-indigo-400">{actualHours}h</span>
            <span className="text-xs text-slate-400">/ {plannedHours}h plan</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            {totalActualMinutes} minutes accumulated
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Extended Sessions</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-400">{continuedTasks}</span>
            <span className="text-xs text-slate-400">continued</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            Tasks continued beyond scheduled time
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Reflections Logged</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-400">
              {reflectionsCount}
            </span>
            <span className="text-xs text-slate-400">reviews</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            Self-reported learnings & improvements
          </span>
        </div>
      </div>

      {/* Best Performing Days vs Weak Performing Days */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Best Performing Days */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Award className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Best-Performing Days</h3>
              <p className="text-xs text-slate-400">Highest completion rate & focused study output</p>
            </div>
          </div>

          {bestPerformingDays.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-800/40 rounded-xl border border-slate-800">
              No standout high-completion days recorded yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {bestPerformingDays.map(d => (
                <div
                  key={d.date}
                  className="p-3.5 bg-slate-800/70 rounded-xl border border-emerald-500/30 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{d.day}</span>
                      <span className="text-[11px] text-slate-400 font-mono">({d.date})</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Study Time: <strong className="text-emerald-300">{(d.actualMinutes / 60).toFixed(1)}h</strong>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-sm border border-emerald-500/40">
                      {d.completionPercentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low-Performing / Weak Days */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <AlertOctagon className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Weak / Low-Completion Days</h3>
              <p className="text-xs text-slate-400">Days with missed schedules requiring schedule adjustments</p>
            </div>
          </div>

          {lowPerformingDays.length === 0 ? (
            <div className="p-6 text-center text-xs text-emerald-400 bg-slate-800/40 rounded-xl border border-slate-800">
              ✓ Excellent discipline! No days with below 70% completion recorded.
            </div>
          ) : (
            <div className="space-y-2.5">
              {lowPerformingDays.map(d => (
                <div
                  key={d.date}
                  className="p-3.5 bg-slate-800/70 rounded-xl border border-rose-500/30 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{d.day}</span>
                      <span className="text-[11px] text-slate-400 font-mono">({d.date})</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Missed: <strong className="text-rose-300">{d.missedCount} tasks</strong>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-400 font-black text-sm border border-rose-500/40">
                      {d.completionPercentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Weekly Breakdown Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-400" />
          <span>Month-Long Weekly Trend</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Week Span</th>
                <th className="py-2.5 px-3">Completion Rate</th>
                <th className="py-2.5 px-3">Study Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {weeklyTrend.map((w, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3 font-bold text-white">{w.label}</td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-emerald-400">{w.completionRate}%</span>
                  </td>
                  <td className="py-3 px-3 text-indigo-300 font-bold font-mono">{w.studyHours}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Common Distractions in reflections */}
      {commonDistractions.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Recurring Distraction Tags</h3>
              <p className="text-xs text-slate-400">Distractions recorded by you in post-task reflections</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {commonDistractions.map(item => (
              <div
                key={item.tag}
                className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60 flex items-center justify-between text-xs"
              >
                <span className="font-medium text-slate-200">{item.tag}</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold text-[11px]">
                  {item.count} occurrences
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
