import React from 'react';
import { Question, SubjectType } from '../types';
import { MathRenderer } from '../utils/mathRenderer';
import { CheckCircle2, AlertTriangle, Key, Sparkles } from 'lucide-react';

interface AnswerKeyMatrixProps {
  questions: Question[];
  onSelectOption: (questionId: string, optionId: string) => void;
  onSelectQuestion: (questionId: string) => void;
  onSetNumericalAnswer?: (questionId: string, value: number | null) => void;
  onSaveKey?: () => void;
}

export const AnswerKeyMatrix: React.FC<AnswerKeyMatrixProps> = ({
  questions,
  onSelectOption,
  onSelectQuestion,
  onSetNumericalAnswer,
  onSaveKey,
}) => {
  const subjects: SubjectType[] = ['PHYSICS', 'CHEMISTRY', 'MATHEMATICS', 'GENERAL'];

  const questionsBySubject: Record<SubjectType, Question[]> = {
    PHYSICS: questions.filter(q => q.subject === 'PHYSICS'),
    CHEMISTRY: questions.filter(q => q.subject === 'CHEMISTRY'),
    MATHEMATICS: questions.filter(q => q.subject === 'MATHEMATICS'),
    GENERAL: questions.filter(q => q.subject === 'GENERAL' || !['PHYSICS', 'CHEMISTRY', 'MATHEMATICS'].includes(q.subject)),
  };

  const missingAnswersCount = questions.filter(q =>
    q.type === 'NUMERICAL'
      ? typeof q.numericalAnswer !== 'number' || Number.isNaN(q.numericalAnswer)
      : !q.correctOptionId
  ).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Answer Key Matrix</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Quickly audit and set correct answer options across all subjects with one-click toggles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {missingAnswersCount > 0 ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>{missingAnswersCount} Questions missing correct answers</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>All {questions.length} questions assigned correct answers</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid of Subjects */}
      <div className="space-y-6">
        {subjects.map((subject) => {
          const subjectQuestions = questionsBySubject[subject];
          if (subjectQuestions.length === 0) return null;

          return (
            <div key={subject} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  {subject} ({subjectQuestions.length} Questions)
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {subjectQuestions.map((q) => {
                  const isNumerical = q.type === 'NUMERICAL';
                  const hasAnswer = isNumerical
                    ? typeof q.numericalAnswer === 'number' && !Number.isNaN(q.numericalAnswer)
                    : Boolean(q.correctOptionId);

                  return (
                    <div
                      key={q.id}
                      className={`p-3 rounded-xl border transition-all ${
                        hasAnswer
                          ? 'bg-slate-50/70 border-slate-200'
                          : 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-slate-800">
                          Q{q.orderIndex}
                        </span>
                        <button
                          type="button"
                          onClick={() => onSelectQuestion(q.id)}
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
                        >
                          Edit Q
                        </button>
                      </div>

                      {/* Question Text preview snippet */}
                      <div className="text-[11px] text-slate-600 truncate mb-2.5 font-medium">
                        {q.questionText ? (
                          <MathRenderer content={q.questionText.slice(0, 50) + (q.questionText.length > 50 ? '...' : '')} />
                        ) : (
                          <span className="text-rose-500 italic">No question statement</span>
                        )}
                      </div>

                      {/* Option Pills (MCQ) or Numeric Answer Input (Numerical) */}
                      {isNumerical ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="any"
                            value={q.numericalAnswer !== undefined && q.numericalAnswer !== null ? q.numericalAnswer : ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              onSetNumericalAnswer?.(q.id, val !== '' ? Number(val) : null);
                            }}
                            placeholder="Enter correct numeric answer"
                            className={`flex-1 py-1 px-2 text-xs font-bold rounded-lg border transition ${
                              hasAnswer
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                : 'bg-white border-amber-300 text-slate-700'
                            }`}
                          />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1.5 py-1 rounded bg-slate-100 border border-slate-200">
                            Numerical
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {q.options.map((opt) => {
                            const isSelected = q.correctOptionId === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => onSelectOption(q.id, opt.id)}
                                className={`flex-1 py-1 text-xs font-bold rounded-lg border transition ${
                                  isSelected
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                                }`}
                              >
                                {opt.optionLabel} {isSelected && '✓'}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};