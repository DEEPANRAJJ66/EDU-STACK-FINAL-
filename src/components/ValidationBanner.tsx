import React from 'react';
import { TestValidationResult } from '../types';
import { AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';

interface ValidationBannerProps {
  validation: TestValidationResult;
  onSelectQuestion?: (questionId: string) => void;
  onPublish?: () => void;
  isPublishing?: boolean;
  isPublished?: boolean;
}

export const ValidationBanner: React.FC<ValidationBannerProps> = ({
  validation,
  onSelectQuestion,
  onPublish,
  isPublishing = false,
  isPublished = false,
}) => {
  if (validation.isValid) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-900">
              {isPublished ? 'Test is Live and Published' : 'Test is Ready for Publication'}
            </h4>
            <p className="text-xs text-emerald-700">
              {isPublished
                ? 'All checks pass. Use the status control below if you need to unpublish this test.'
                : 'All questions have complete statements, all 4 options, valid marks, and correct answer keys assigned.'}
            </p>
          </div>
        </div>

        {/* Only offer this action while the test is NOT yet published — once it's live, the
            status control card below is the single source of truth for publish/unpublish,
            so this button never fires the same toggle in a conflicting direction. */}
        {onPublish && !isPublished && (
          <button
            onClick={onPublish}
            disabled={isPublishing}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 shrink-0"
          >
            {isPublishing ? 'Publishing...' : 'Publish Test Now'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-900">
              Your test cannot be published yet ({validation.issues.length} {validation.issues.length === 1 ? 'problem' : 'problems'} found)
            </h4>
            <p className="text-xs text-amber-800">
              Please resolve the following required fields to make this test available for students:
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 border-t border-amber-200/60">
        {validation.issues.map((issue, idx) => (
          <div
            key={idx}
            onClick={() => issue.questionId && onSelectQuestion && onSelectQuestion(issue.questionId)}
            className={`flex items-center justify-between p-2 rounded-lg bg-white border border-amber-200/70 text-xs text-slate-800 transition ${
              issue.questionId ? 'cursor-pointer hover:border-amber-400 hover:bg-amber-50/50' : ''
            }`}
          >
            <span className="font-medium">
              <span className="font-bold text-amber-700 mr-1.5">#{idx + 1}</span>
              {issue.message}
            </span>
            {issue.questionId && (
              <span className="flex items-center text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 shrink-0 ml-2">
                Fix <ChevronRight className="w-3 h-3 ml-0.5" />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};