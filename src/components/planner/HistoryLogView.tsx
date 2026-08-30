import React, { useState } from 'react';
import { PlannerTask, TaskStatus, TaskPriority, TaskReflection } from '../../types';
import {
  Calendar,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Smartphone,
  Brain,
  FileText,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit,
  Tag,
} from 'lucide-react';

interface HistoryLogViewProps {
  tasks: PlannerTask[];
  onOpenReflection: (task: PlannerTask) => void;
  onDeleteTask: (taskId: string) => Promise<void>;
}

export const HistoryLogView: React.FC<HistoryLogViewProps> = ({
  tasks = [],
  onOpenReflection,
  onDeleteTask,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());

  const toggleExpand = (taskId: string) => {
    const next = new Set(expandedTaskIds);
    if (next.has(taskId)) {
      next.delete(taskId);
    } else {
      next.add(taskId);
    }
    setExpandedTaskIds(next);
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'ALL' || task.status === selectedStatus;
    const matchesPriority = selectedPriority === 'ALL' || task.priority === selectedPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <FileText className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Permanent Records</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
            Task History & Reflection Log
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Searchable permanent archive of all scheduled sessions, timer metrics, and written reflections.
          </p>
        </div>

        <div className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700/80 text-right">
          <span className="text-[11px] text-slate-400 block font-medium">Total Archived Tasks</span>
          <span className="text-lg font-black text-indigo-400">{tasks.length}</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="CONTINUED">Continued</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="NOT_COMPLETED">Not Completed</option>
          </select>

          <select
            value={selectedPriority}
            onChange={e => setSelectedPriority(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
          No historical tasks match the selected filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(task => {
            const isExpanded = expandedTaskIds.has(task.id);
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
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 transition space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="shrink-0 text-center px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 min-w-[72px]">
                      <span className="text-xs font-bold text-white block">{task.day?.slice(0, 3)}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{task.date}</span>
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                          {task.startTime}
                        </span>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                          task.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : task.status === 'CONTINUED'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {task.status.toLowerCase().replace('_', ' ')}
                        </span>

                        <span className="text-xs text-slate-400">
                          Planned: {task.plannedDurationMinutes}m • Actual: <strong className="text-slate-200">{task.actualDurationMinutes || task.plannedDurationMinutes}m</strong>
                        </span>
                      </div>

                      <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
                        {task.title}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => onOpenReflection(task)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition cursor-pointer"
                    >
                      {hasReflection ? 'Edit Reflection' : 'Add Reflection'}
                    </button>

                    {hasReflection && (
                      <button
                        onClick={() => toggleExpand(task.id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title={isExpanded ? 'Collapse' : 'Expand Details'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}

                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition cursor-pointer"
                      title="Delete Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Reflection Details */}
                {isExpanded && hasReflection && (
                  <div className="pt-3 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-950/40 p-3 rounded-xl">
                    {task.reflection?.distractionTags && task.reflection.distractionTags.length > 0 && (
                      <div className="col-span-full flex items-center gap-2 flex-wrap pb-1">
                        <span className="text-slate-400 font-semibold">Distraction Tags:</span>
                        {task.reflection.distractionTags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {task.reflection?.distractions && (
                      <div>
                        <span className="text-slate-400 font-bold block text-[11px]">Distraction Note:</span>
                        <p className="text-slate-300">{task.reflection.distractions}</p>
                      </div>
                    )}

                    {task.reflection?.difficulties && (
                      <div>
                        <span className="text-rose-400 font-bold block text-[11px]">Difficulty Encountered:</span>
                        <p className="text-slate-300">{task.reflection.difficulties}</p>
                      </div>
                    )}

                    {task.reflection?.improvements && (
                      <div>
                        <span className="text-emerald-400 font-bold block text-[11px]">Improvement Target:</span>
                        <p className="text-slate-300">{task.reflection.improvements}</p>
                      </div>
                    )}

                    {task.reflection?.notes && (
                      <div>
                        <span className="text-indigo-300 font-bold block text-[11px]">General Notes:</span>
                        <p className="text-slate-300">{task.reflection.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
