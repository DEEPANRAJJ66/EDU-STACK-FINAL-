import React, { useState, useEffect, useRef } from 'react';
import { Question, SubjectType } from '../types';
import { MathRenderer } from '../utils/mathRenderer';
import { MathToolbar } from './MathToolbar';
import { SafeSvgRenderer } from './SafeSvgRenderer';
import { QuestionImage } from './QuestionImage';
import {
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Upload,
  X,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Clock,
  Eye,
  ImageIcon,
  Code,
  ChevronDown,
  Check,
} from 'lucide-react';

interface QuestionEditorProps {
  question: Question;
  totalQuestions: number;
  onUpdate: (updatedQuestion: Question) => void;
  onDelete: (questionId: string) => void;
  onDuplicate: (questionId: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  saveStatus: 'SAVED' | 'SAVING' | 'IDLE';
  lastSavedText?: string;
  onSaveImmediate?: () => void;
}

function ensureFourOptions(q: Question): Question {
  const labels: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  const existingOptions = q.options || [];
  const options = labels.map((label, idx) => {
    const existing = existingOptions.find(o => o.optionLabel === label) || existingOptions[idx];
    if (existing) {
      return { ...existing, optionLabel: label, orderIndex: idx + 1 };
    }
    return {
      id: `opt_${q.id}_${label}_${idx + 1}`,
      questionId: q.id,
      optionLabel: label,
      optionText: '',
      orderIndex: idx + 1,
    };
  });
  return {
    ...q,
    options,
  };
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  totalQuestions,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  saveStatus,
  lastSavedText,
  onSaveImmediate,
}) => {
  const [localQ, setLocalQ] = useState<Question>(ensureFourOptions(question));
  const [activeInput, setActiveInput] = useState<'question' | 'optionA' | 'optionB' | 'optionC' | 'optionD' | 'solution' | 'numerical'>('question');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showModeSelect, setShowModeSelect] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modeSelectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modeSelectRef.current && !modeSelectRef.current.contains(event.target as Node)) {
        setShowModeSelect(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync state when active question changes
  useEffect(() => {
    setLocalQ(ensureFourOptions(question));
  }, [question.id]);

  // Debounced auto-sync to parent
  useEffect(() => {
    const handler = setTimeout(() => {
      if (JSON.stringify(localQ) !== JSON.stringify(question)) {
        onUpdate(localQ);
      }
    }, 2000);

    return () => clearTimeout(handler);
  }, [localQ]);

  // Handle keyboard shortcuts (Ctrl+S for immediate save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onUpdate(localQ);
        if (onSaveImmediate) onSaveImmediate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [localQ, onUpdate, onSaveImmediate]);

  const handleOptionChange = (idx: number, text: string) => {
    const newOptions = [...localQ.options];
    if (newOptions[idx]) {
      newOptions[idx] = { ...newOptions[idx], optionText: text };
      setLocalQ({ ...localQ, options: newOptions });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setLocalQ({ ...localQ, questionImageUrl: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    // Use null (not undefined): JSON.stringify() drops keys whose value is
    // undefined, so the removal would never reach the backend save request
    // and the old image would come back after a refresh.
    setLocalQ({ ...localQ, questionImageUrl: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOptionImageUpload = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      const newOptions = [...localQ.options];
      newOptions[idx] = { ...newOptions[idx], optionImageUrl: base64 };
      setLocalQ({ ...localQ, options: newOptions });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveOptionImage = (idx: number) => {
    const newOptions = [...localQ.options];
    // null (not undefined) — see note in handleRemoveImage above.
    newOptions[idx] = { ...newOptions[idx], optionImageUrl: null };
    setLocalQ({ ...localQ, options: newOptions });
  };

  const handleOptionSvgUpload = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'image/svg+xml') {
      alert('Please select a valid SVG file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const text = uploadEvent.target?.result as string;
      const newOptions = [...localQ.options];
      newOptions[idx] = { ...newOptions[idx], optionSvgContent: text };
      setLocalQ({ ...localQ, options: newOptions });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRemoveOptionSvg = (idx: number) => {
    const newOptions = [...localQ.options];
    // null (not undefined) — see note in handleRemoveImage above.
    newOptions[idx] = { ...newOptions[idx], optionSvgContent: null };
    setLocalQ({ ...localQ, options: newOptions });
  };

  const handleSolutionImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setLocalQ({ ...localQ, solutionImageUrl: base64 });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveSolutionImage = () => {
    // null (not undefined) — see note in handleRemoveImage above.
    setLocalQ({ ...localQ, solutionImageUrl: null });
  };

  const insertLatexToActiveField = (snippet: string) => {
    if (activeInput === 'question') {
      setLocalQ({ ...localQ, questionText: (localQ.questionText || '') + ' ' + snippet });
    } else if (activeInput === 'solution') {
      setLocalQ({ ...localQ, solutionText: (localQ.solutionText || '') + ' ' + snippet });
    } else {
      const optIdx = activeInput === 'optionA' ? 0 : activeInput === 'optionB' ? 1 : activeInput === 'optionC' ? 2 : 3;
      handleOptionChange(optIdx, (localQ.options[optIdx]?.optionText || '') + ' ' + snippet);
    }
  };

  const isQuestionComplete = localQ.type === 'NUMERICAL'
    ? localQ.questionText.trim().length > 0 && typeof localQ.numericalAnswer === 'number'
    : localQ.questionText.trim().length > 0 &&
      localQ.options.length >= 4 &&
      localQ.options.every(o => o.optionText.trim().length > 0) &&
      Boolean(localQ.correctOptionId);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Top Action Bar */}
      <div className="bg-slate-50/80 px-4 sm:px-6 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
              Q{localQ.orderIndex}
            </span>
            <div className="flex items-center gap-2">
              <select
                value={localQ.subject}
                onChange={(e) => setLocalQ({ ...localQ, subject: e.target.value as SubjectType })}
                className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 shadow-2xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="PHYSICS">Physics</option>
                <option value="CHEMISTRY">Chemistry</option>
                <option value="MATHEMATICS">Mathematics</option>
                <option value="GENERAL">General</option>
              </select>

              <div className="relative" ref={modeSelectRef}>
                <button
                  type="button"
                  onClick={() => setShowModeSelect(!showModeSelect)}
                  className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 shadow-2xs focus:ring-2 focus:ring-indigo-500 hover:bg-slate-50 transition"
                >
                  {localQ.type === 'NUMERICAL' ? 'Numerical Type' : 'MCQ'}
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {showModeSelect && (
                  <div className="absolute top-full left-0 mt-1.5 w-48 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-10">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Select Question Mode
                      </span>
                    </div>
                    <div className="p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setLocalQ({ ...localQ, type: 'MCQ' });
                          setShowModeSelect(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
                          (!localQ.type || localQ.type === 'MCQ') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        MCQ
                        {(!localQ.type || localQ.type === 'MCQ') && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLocalQ({ ...localQ, type: 'NUMERICAL' });
                          setShowModeSelect(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
                          localQ.type === 'NUMERICAL' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Numerical Type
                        {localQ.type === 'NUMERICAL' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                  isQuestionComplete
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isQuestionComplete ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {isQuestionComplete ? 'Complete' : 'Incomplete'}
              </span>
            </div>
          </div>
        </div>

        {/* Auto-Save indicator & Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-2">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {saveStatus === 'SAVING' ? (
                <span className="text-amber-600 font-medium">Saving...</span>
              ) : (
                <span className="text-emerald-600 font-medium">Saved ✓</span>
              )}
            </span>
            {lastSavedText && <span className="text-[11px] text-slate-400 hidden sm:inline">({lastSavedText})</span>}
          </div>

          <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition"
              title="Preview Question"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onDuplicate(localQ.id)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition"
              title="Duplicate Question (Creates clone)"
            >
              <Copy className="w-4 h-4" />
            </button>
            {onMoveUp && (
              <button
                type="button"
                onClick={onMoveUp}
                disabled={localQ.orderIndex <= 1}
                className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
                title="Move Up"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
            {onMoveDown && (
              <button
                type="button"
                onClick={onMoveDown}
                disabled={localQ.orderIndex >= totalQuestions}
                className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
                title="Move Down"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              id="delete-question-btn"
              onClick={() => onDelete(localQ.id)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
              title="Delete Question"
              aria-label="Delete Question"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Editor Body */}
      <div className="p-4 sm:p-6 space-y-6">
        {/* Math KaTeX Toolbar */}
        <MathToolbar
          onInsert={insertLatexToActiveField}
          previewText={
            activeInput === 'question'
              ? localQ.questionText
              : activeInput === 'solution'
              ? localQ.solutionText
              : localQ.options[activeInput === 'optionA' ? 0 : activeInput === 'optionB' ? 1 : activeInput === 'optionC' ? 2 : 3]?.optionText
          }
        />

        {/* Question Text Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span>Question Statement</span>
              <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400">Supports KaTeX math formatting ($...$ or $$...$$)</span>
          </div>

          <textarea
            rows={3}
            value={localQ.questionText}
            onFocus={() => setActiveInput('question')}
            onChange={(e) => setLocalQ({ ...localQ, questionText: e.target.value })}
            placeholder="Type your question here... e.g. A particle of mass $m=2\text{ kg}$ is projected with speed $u=20\text{ m/s}$ at an angle $\theta=30^\circ$..."
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-normal text-slate-900 transition resize-y leading-relaxed font-sans"
          />
        </div>

        {/* Question Image Attachment (Circuit diagrams, figures, graphs) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span>Question Diagram / Image (Optional)</span>
            </label>
            <span className="text-[11px] text-slate-400">PNG, JPG, WEBP up to 5MB</span>
          </div>

          {localQ.questionImageUrl ? (
            <div className="relative inline-block border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-2 group">
              <img
                src={localQ.questionImageUrl}
                alt="Question Diagram"
                className="max-h-52 max-w-full object-contain rounded-lg shadow-2xs"
              />
              <div className="absolute top-3 right-3 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2 py-1 bg-white/90 backdrop-blur-xs text-xs font-semibold text-slate-700 rounded-md shadow hover:bg-white transition"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="p-1 bg-rose-600 text-white rounded-md shadow hover:bg-rose-700 transition"
                  title="Remove Image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5"
            >
              <Upload className="w-5 h-5 text-indigo-500" />
              <span className="text-xs font-semibold text-slate-700">Click to upload question image/diagram</span>
              <span className="text-[11px] text-slate-400">Circuit diagram, geometry figure, chemical structure</span>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {(!localQ.type || localQ.type === 'MCQ') ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span>Options & Correct Answer</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500">Select the radio button on the correct option</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {localQ.options.map((option, idx) => {
                const isCorrect = localQ.correctOptionId === option.id;
                const inputKey = idx === 0 ? 'optionA' : idx === 1 ? 'optionB' : idx === 2 ? 'optionC' : 'optionD';

                return (
                  <div
                    key={option.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isCorrect
                        ? 'bg-emerald-50/60 border-emerald-400 ring-2 ring-emerald-200/50 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <button
                        type="button"
                        onClick={() => setLocalQ({ ...localQ, correctOptionId: option.id })}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition shadow-2xs ${
                          isCorrect
                            ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                            : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700 border border-slate-300'
                        }`}
                      >
                        {option.optionLabel}
                      </button>

                      <span className="text-xs font-bold text-slate-700">
                        Option {option.optionLabel}
                      </span>

                      {isCorrect ? (
                        <span className="ml-auto text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Correct Answer
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setLocalQ({ ...localQ, correctOptionId: option.id })}
                          className="ml-auto text-[11px] text-slate-400 hover:text-emerald-700 font-medium"
                        >
                          Set as Correct
                        </button>
                      )}
                    </div>

                    <textarea
                      rows={2}
                      value={option.optionText}
                      onFocus={() => setActiveInput(inputKey)}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`Enter Option ${option.optionLabel} text or formula...`}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 text-xs font-normal text-slate-800 transition resize-y font-sans mb-2"
                    />

                    {option.optionImageUrl ? (
                      <div className="relative inline-block border border-slate-200 rounded-lg p-1 bg-white">
                        <img src={option.optionImageUrl} alt={`Option ${option.optionLabel}`} className="max-h-24 rounded object-contain" />
                        <button
                          type="button"
                          onClick={() => handleRemoveOptionImage(idx)}
                          className="absolute -top-2 -right-2 bg-rose-100 text-rose-600 rounded-full p-1 border border-rose-200 hover:bg-rose-500 hover:text-white transition"
                          title="Remove Image"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="inline-block mr-2 mb-2">
                        <input
                          type="file"
                          accept="image/*"
                          id={`option-image-${idx}`}
                          className="hidden"
                          onChange={(e) => handleOptionImageUpload(idx, e)}
                        />
                        <label
                          htmlFor={`option-image-${idx}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 rounded-md transition cursor-pointer"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          Add Image
                        </label>
                      </div>
                    )}

                    {option.optionSvgContent ? (
                      <div className="relative inline-block border border-slate-200 rounded-lg p-1 bg-white ml-2">
                        <SafeSvgRenderer svgContent={option.optionSvgContent} className="max-h-24 object-contain" />
                        <button
                          type="button"
                          onClick={() => handleRemoveOptionSvg(idx)}
                          className="absolute -top-2 -right-2 bg-rose-100 text-rose-600 rounded-full p-1 border border-rose-200 hover:bg-rose-500 hover:text-white transition"
                          title="Remove Diagram"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="inline-block mb-2">
                        <input
                          type="file"
                          accept="image/svg+xml"
                          id={`option-svg-${idx}`}
                          className="hidden"
                          onChange={(e) => handleOptionSvgUpload(idx, e)}
                        />
                        <label
                          htmlFor={`option-svg-${idx}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 rounded-md transition cursor-pointer"
                        >
                          <Code className="w-3.5 h-3.5" />
                          Add Diagram (SVG)
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span>Correct Numerical Answer</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500">Enter a number (decimals and negatives allowed)</span>
            </div>
            
            <div className="p-4 bg-white border border-slate-200 rounded-xl max-w-sm">
              <input
                type="number"
                step="any"
                value={localQ.numericalAnswer ?? ''}
                onFocus={() => setActiveInput('numerical')}
                onChange={(e) => {
                  const val = e.target.value;
                  setLocalQ({
                    ...localQ,
                    numericalAnswer: val !== '' ? Number(val) : null
                  });
                }}
                placeholder="e.g. 42, -5, 3.14"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-semibold text-slate-900 transition font-mono"
              />
            </div>
          </div>
        )}

        {/* Marks & Negative Marks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Marks for Correct Answer (+M)
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="20"
                value={localQ.marks}
                onChange={(e) => setLocalQ({ ...localQ, marks: Number(e.target.value) || 4 })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white"
              />
              <span className="absolute right-3 top-1.5 text-xs font-bold text-emerald-600">+ Marks</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Negative Marks for Incorrect (-N)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="10"
                value={localQ.negativeMarks}
                onChange={(e) => setLocalQ({ ...localQ, negativeMarks: Number(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white"
              />
              <span className="absolute right-3 top-1.5 text-xs font-bold text-rose-600">- Marks</span>
            </div>
          </div>
        </div>

        {/* Solution & Explanation */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span>Step-by-Step Solution / Explanation</span>
            </label>
            <span className="text-[11px] text-slate-400">Shown to students only after final test submission</span>
          </div>

          <textarea
            rows={3}
            value={localQ.solutionText || ''}
            onFocus={() => setActiveInput('solution')}
            onChange={(e) => setLocalQ({ ...localQ, solutionText: e.target.value })}
            placeholder="Explain the detailed solution and equations step-by-step for students..."
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-xs font-normal text-slate-900 transition resize-y font-sans leading-relaxed mb-2"
          />

          {localQ.solutionImageUrl ? (
            <div className="relative inline-block border border-slate-200 rounded-lg p-2 bg-white mt-1">
              <img src={localQ.solutionImageUrl} alt="Solution figure" className="max-h-32 rounded object-contain" />
              <button
                type="button"
                onClick={handleRemoveSolutionImage}
                className="absolute -top-2 -right-2 bg-rose-100 text-rose-600 rounded-full p-1 border border-rose-200 hover:bg-rose-500 hover:text-white transition"
                title="Remove Image"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div>
              <input
                type="file"
                accept="image/*"
                id="solution-image-upload"
                className="hidden"
                onChange={handleSolutionImageUpload}
              />
              <label
                htmlFor="solution-image-upload"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-800 rounded-lg transition cursor-pointer"
              >
                <ImageIcon className="w-4 h-4" />
                Add Solution Diagram / Image
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Instant Single Question Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-indigo-600 text-white font-bold text-xs">
                  {localQ.subject} — Q{localQ.orderIndex}
                </span>
                <span className="text-xs text-slate-500">Live Student Preview</span>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="text-sm font-medium text-slate-900 leading-relaxed">
                <MathRenderer content={localQ.questionText || 'No question text specified.'} />
              </div>

              {localQ.questionImageUrl && (
                <div className="border border-slate-200 rounded-lg p-2 max-w-sm">
                  <QuestionImage src={localQ.questionImageUrl} alt="Question figure" />
                </div>
              )}

              <div className="space-y-2 pt-2">
                {(!localQ.type || localQ.type === 'MCQ') ? (
                  localQ.options.map((opt) => (
                    <div
                      key={opt.id}
                      className={`p-3 rounded-xl border flex items-center gap-3 text-xs ${
                        opt.id === localQ.correctOptionId
                          ? 'bg-emerald-50 border-emerald-300 font-semibold text-emerald-900'
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <span className="w-6 h-6 rounded-full bg-white border border-slate-300 flex items-center justify-center font-bold shrink-0">
                        {opt.optionLabel}
                      </span>
                      <div className="flex flex-col gap-2">
                        <MathRenderer content={opt.optionText || '(Empty option)'} />
                        {opt.optionImageUrl && (
                          <div className="bg-white border border-slate-200 rounded p-1 max-w-[200px]">
                            <img src={opt.optionImageUrl} alt={`Option ${opt.optionLabel} figure`} className="rounded object-contain" />
                          </div>
                        )}
                        {opt.optionSvgContent && (
                          <div className="bg-white border border-slate-200 rounded p-1 max-w-[200px]">
                            <SafeSvgRenderer svgContent={opt.optionSvgContent} className="rounded object-contain" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Numerical Answer</span>
                    <div className="text-sm font-mono font-bold text-slate-900">
                      {localQ.numericalAnswer !== undefined ? localQ.numericalAnswer : 'Not provided'}
                    </div>
                  </div>
                )}
              </div>

              {(localQ.solutionText || localQ.solutionImageUrl) && (
                <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 block">Solution:</span>
                  {localQ.solutionText && (
                    <div className="text-xs text-slate-800 leading-relaxed">
                      <MathRenderer content={localQ.solutionText} />
                    </div>
                  )}
                  {localQ.solutionImageUrl && (
                    <div className="bg-white border border-slate-200 rounded p-2 max-w-sm mt-2">
                      <img src={localQ.solutionImageUrl} alt="Solution figure" className="rounded object-contain" />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 text-right border-t border-slate-100">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};