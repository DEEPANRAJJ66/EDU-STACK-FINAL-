import React from 'react';
import { SubjectStat, SubjectType } from '../types';
import { AlertCircle, CheckCircle2, Bookmark, HelpCircle, X } from 'lucide-react';

interface SubmitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  markedCount: number;
  answeredAndMarkedCount: number;
  notVisitedCount: number;
  timeRemainingText: string;
  isSubmitting?: boolean;
}

export const SubmitConfirmModal: React.FC<SubmitConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  totalQuestions,
  answeredCount,
  unansweredCount,
  markedCount,
  answeredAndMarkedCount,
  notVisitedCount,
  timeRemainingText,
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Confirm Test Submission</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-600">
          Are you sure you want to submit your test? You will not be able to change your answers once submitted.
        </p>

        {/* Summary Breakdown Cards */}
        <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-slate-100">
            <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
              {answeredCount + answeredAndMarkedCount}
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-semibold uppercase">Answered</div>
              <div className="text-xs font-bold text-slate-800">{answeredCount + answeredAndMarkedCount} Questions</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-slate-100">
            <div className="w-6 h-6 rounded-md bg-rose-500 text-white flex items-center justify-center text-xs font-bold">
              {unansweredCount}
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-semibold uppercase">Not Answered</div>
              <div className="text-xs font-bold text-slate-800">{unansweredCount} Questions</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-slate-100">
            <div className="w-6 h-6 rounded-md bg-purple-600 text-white flex items-center justify-center text-xs font-bold">
              {markedCount}
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-semibold uppercase">Marked for Review</div>
              <div className="text-xs font-bold text-slate-800">{markedCount} Questions</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-slate-100">
            <div className="w-6 h-6 rounded-md bg-slate-400 text-white flex items-center justify-center text-xs font-bold">
              {notVisitedCount}
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-semibold uppercase">Not Visited</div>
              <div className="text-xs font-bold text-slate-800">{notVisitedCount} Questions</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>Total Questions: <strong>{totalQuestions}</strong></span>
          <span>Time Remaining: <strong className="text-indigo-600 font-mono">{timeRemainingText}</strong></span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
          >
            Cancel & Return to Test
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md hover:shadow transition flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Submitting Test...</span>
              </>
            ) : (
              <span>Yes, Final Submit</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
