import React, { useState } from 'react';
import { PlannerTask, TaskReflection } from '../../types';
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  FileText,
  CheckCircle,
  X,
  Sparkles,
  Clock,
  Smartphone,
  Coffee,
  Volume2,
  HelpCircle,
  Hourglass,
  Tag,
  Save,
} from 'lucide-react';

interface PostTaskReflectionModalProps {
  task: PlannerTask;
  isOpen: boolean;
  onClose: () => void;
  onSaveReflection: (taskId: string, reflection: TaskReflection) => Promise<void>;
}

const COMMON_DISTRACTIONS = [
  { tag: 'Phone / Social Media', icon: Smartphone },
  { tag: 'Fatigue / Sleep', icon: Coffee },
  { tag: 'Noise / Environment', icon: Volume2 },
  { tag: 'Concept Confusion', icon: HelpCircle },
  { tag: 'Procrastination', icon: Hourglass },
  { tag: 'Tricky Formulas', icon: Brain },
];

export const PostTaskReflectionModal: React.FC<PostTaskReflectionModalProps> = ({
  task,
  isOpen,
  onClose,
  onSaveReflection,
}) => {
  if (!isOpen) return null;

  const existing = task.reflection || {};
  const [distractionTags, setDistractionTags] = useState<string[]>(existing.distractionTags || []);
  const [distractions, setDistractions] = useState<string>(existing.distractions || '');
  const [difficulties, setDifficulties] = useState<string>(existing.difficulties || '');
  const [improvements, setImprovements] = useState<string>(existing.improvements || '');
  const [notes, setNotes] = useState<string>(existing.notes || '');
  const [saving, setSaving] = useState<boolean>(false);

  const toggleTag = (tag: string) => {
    if (distractionTags.includes(tag)) {
      setDistractionTags(distractionTags.filter(t => t !== tag));
    } else {
      setDistractionTags([...distractionTags, tag]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: TaskReflection = {
        distractionTags,
        distractions: distractions.trim() || undefined,
        difficulties: difficulties.trim() || undefined,
        improvements: improvements.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      await onSaveReflection(task.id, payload);
      onClose();
    } catch (err) {
      console.error('Failed to save reflection:', err);
    } finally {
      setSaving(false);
    }
  };

  const isOverTime = (task.actualDurationMinutes || 0) > (task.plannedDurationMinutes || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 text-slate-100 my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">Post-Task Reflection</h2>
            </div>
            <p className="text-xs text-slate-400">
              Task: <strong className="text-slate-200">{task.title}</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Time Snapshot Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/50 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Planned Time</span>
            <span className="font-semibold text-slate-200">{task.plannedDurationMinutes} mins</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Actual Recorded Time</span>
            <span className={`font-semibold ${isOverTime ? 'text-amber-400' : 'text-emerald-400'}`}>
              {task.actualDurationMinutes || task.plannedDurationMinutes} mins
              {isOverTime && ` (+${(task.actualDurationMinutes || 0) - task.plannedDurationMinutes}m)`}
            </span>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-slate-400 block text-[11px]">Status</span>
            <span className="font-semibold text-indigo-300 capitalize">{task.status.toLowerCase().replace('_', ' ')}</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="space-y-4">
          {/* Question 1: Distractions */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span>1. What distracted me?</span>
              <span className="text-[11px] text-slate-400 font-normal">(Select quick tags or type below)</span>
            </label>

            {/* Quick distraction tags */}
            <div className="flex flex-wrap gap-2 pt-1">
              {COMMON_DISTRACTIONS.map(item => {
                const Icon = item.icon;
                const isSelected = distractionTags.includes(item.tag);
                return (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => toggleTag(item.tag)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.tag}</span>
                  </button>
                );
              })}
            </div>

            <textarea
              value={distractions}
              onChange={e => setDistractions(e.target.value)}
              placeholder="e.g. Phone notifications, unexpected noise, mind wandering during numericals..."
              rows={2}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Question 2: Difficulties */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>2. What difficulty did I face?</span>
            </label>
            <textarea
              value={difficulties}
              onChange={e => setDifficulties(e.target.value)}
              placeholder="e.g. Calculation mistakes on question 12, confusion in formula application, slow speed..."
              rows={2}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Question 3: Improvements */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>3. What should I improve for the next session?</span>
            </label>
            <textarea
              value={improvements}
              onChange={e => setImprovements(e.target.value)}
              placeholder="e.g. Revise shortcut formulas before starting, solve with a countdown on each question..."
              rows={2}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Question 4: Notes */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <FileText className="w-4 h-4 text-blue-400" />
              <span>4. Additional session notes</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Finished 45 out of 50 problems. Kept accuracy high on conceptual MCQs."
              rows={2}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            Skip for Now
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Reflection'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
