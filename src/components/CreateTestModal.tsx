import React, { useState } from 'react';
import { SubjectType, TestType } from '../types';
import { X, Sparkles, BookOpen } from 'lucide-react';

interface CreateTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    testType: TestType;
    durationMinutes: number;
    marksPerQuestion: number;
    negativeMarks: number;
    initialQuestionCount: number;
  }) => Promise<void>;
}

export const CreateTestModal: React.FC<CreateTestModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [testType, setTestType] = useState<TestType>('JEE_MAIN_FULL');
  const [durationMinutes, setDurationMinutes] = useState(180);
  const [marksPerQuestion, setMarksPerQuestion] = useState(4);
  const [negativeMarks, setNegativeMarks] = useState(1);
  const [initialQuestionCount, setInitialQuestionCount] = useState(75);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        testType,
        durationMinutes,
        marksPerQuestion,
        negativeMarks,
        initialQuestionCount,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to create test');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Adjust defaults when test type changes
  const handleTypeChange = (type: TestType) => {
    setTestType(type);
    if (type === 'JEE_MAIN_FULL') {
      setDurationMinutes(180);
      setInitialQuestionCount(75);
    } else {
      setDurationMinutes(60);
      setInitialQuestionCount(25);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Create New Test Series</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
              Test Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. JEE Main 2026 Grand Mock Test - 02"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
              Description / Topics
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Complete 11th & 12th PCM Syllabus: Mechanics, Electrostatics, Organic..."
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                Test Type
              </label>
              <select
                value={testType}
                onChange={(e) => handleTypeChange(e.target.value as TestType)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-slate-800 bg-white"
              >
                <option value="JEE_MAIN_FULL">Full Mock (PCM)</option>
                <option value="PHYSICS">Physics Only</option>
                <option value="CHEMISTRY">Chemistry Only</option>
                <option value="MATHEMATICS">Mathematics Only</option>
                <option value="CUSTOM">Custom Series</option>
              </select>
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                Duration (Mins)
              </label>
              <input
                type="number"
                min="1"
                max="360"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value) || 180)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-slate-800 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Initial Qs
              </label>
              <input
                type="number"
                min="1"
                max="90"
                value={initialQuestionCount}
                onChange={(e) => setInitialQuestionCount(Number(e.target.value) || 1)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-800 bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                +Marks
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={marksPerQuestion}
                onChange={(e) => setMarksPerQuestion(Number(e.target.value) || 4)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold text-emerald-700 bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                -Negative
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={negativeMarks}
                onChange={(e) => setNegativeMarks(Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold text-rose-700 bg-white"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md transition flex items-center gap-1.5"
            >
              {isSubmitting ? 'Creating...' : 'Create & Open Builder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
