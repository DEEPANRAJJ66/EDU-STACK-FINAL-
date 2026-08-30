import React, { useRef, useState, useEffect, useMemo } from 'react';
import { TestAttempt, Test, Question, AttemptErrorNotes, ErrorNote, SubjectType } from '../types';
import { MathRenderer } from '../utils/mathRenderer';
import { SafeSvgRenderer } from './SafeSvgRenderer';
import { ERROR_CATEGORIES_CONFIG } from './ErrorNotesWorkspace';
import { api } from '../services/api';
import { safeStorage } from '../utils/safeStorage';
import {
  Printer,
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sparkles,
  HelpCircle,
  ImageIcon,
  Layers,
  Download,
  Loader2,
} from 'lucide-react';

interface ErrorNotesPDFModalProps {
  attempt: TestAttempt;
  test: Test;
  questions: Question[];
  errorNotes?: AttemptErrorNotes | null;
  onClose: () => void;
}

export const ErrorNotesPDFModal: React.FC<ErrorNotesPDFModalProps> = ({
  attempt,
  test,
  questions = [],
  errorNotes: initialErrorNotes,
  onClose,
}) => {
  const printContainerRef = useRef<HTMLDivElement>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'MISTAKES_AND_NOTES'>('ALL');
  const [mergedNotesMap, setMergedNotesMap] = useState<Record<string, ErrorNote>>(() => {
    return initialErrorNotes?.notes || {};
  });
  const [isExporting, setIsExporting] = useState(false);

  const storageKey = `edustack_err_notes_${attempt.id}`;

  useEffect(() => {
    let isMounted = true;
    try {
      const cached = safeStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.notes && typeof parsed.notes === 'object') {
          setMergedNotesMap(prev => ({
            ...prev,
            ...parsed.notes,
          }));
        }
      }
    } catch (e) {
      console.warn('Could not read cached error notes from safeStorage', e);
    }

    async function fetchLatestNotes() {
      try {
        const res: any = await api.errorNotes.getByAttemptId(attempt.id);
        if (res?.errorNotes?.notes && isMounted) {
          setMergedNotesMap(prev => ({
            ...prev,
            ...(res.errorNotes.notes || {}),
          }));
        }
      } catch (err) {
        console.warn('Backend fetch for PDF notes returned fallback', err);
      }
    }

    fetchLatestNotes();

    return () => {
      isMounted = false;
    };
  }, [attempt.id, storageKey]);

  const getFullPrintCSS = () => `
    @page {
      size: A4 portrait;
      margin: 8mm 8mm 8mm 8mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    body {
      background-color: #ffffff !important;
      color: #0f172a !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
      font-size: 12px;
      line-height: 1.45;
      padding: 0 !important;
      margin: 0 !important;
    }
    
    .avoid-break-header {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    
    .pdf-card {
      border: 1px solid #cbd5e1 !important;
      border-radius: 10px !important;
      padding: 12px 14px !important;
      background-color: #ffffff !important;
      margin-bottom: 10px !important;
    }
    
    img {
      max-width: 100% !important;
      height: auto !important;
      display: block;
    }
    .katex, .katex * {
      line-height: 1.2 !important;
    }

    /* Layout & Utilities */
    .flex { display: flex !important; }
    .flex-col { flex-direction: column !important; }
    .flex-wrap { flex-wrap: wrap !important; }
    .items-center { align-items: center !important; }
    .items-start { align-items: flex-start !important; }
    .justify-between { justify-content: space-between !important; }
    .gap-1 { gap: 0.25rem !important; }
    .gap-1\\.5 { gap: 0.375rem !important; }
    .gap-2 { gap: 0.5rem !important; }
    .gap-2\\.5 { gap: 0.625rem !important; }
    .gap-3 { gap: 0.75rem !important; }
    .grid { display: grid !important; }
    .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
    .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
    .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
    
    .space-y-4 > * + * { margin-top: 0.85rem !important; }
    .space-y-3 > * + * { margin-top: 0.65rem !important; }
    .space-y-2 > * + * { margin-top: 0.45rem !important; }
    .space-y-1\\.5 > * + * { margin-top: 0.35rem !important; }
    .space-y-1 > * + * { margin-top: 0.25rem !important; }

    /* Compact Paddings */
    .p-1 { padding: 0.25rem !important; }
    .p-2 { padding: 0.45rem !important; }
    .p-2\\.5 { padding: 0.55rem !important; }
    .p-3 { padding: 0.65rem !important; }
    .p-3\\.5 { padding: 0.75rem !important; }
    .p-4 { padding: 0.85rem !important; }
    .pt-1 { padding-top: 0.25rem !important; }
    .pt-2 { padding-top: 0.5rem !important; }
    .pb-1\\.5 { padding-bottom: 0.35rem !important; }
    .pb-2 { padding-bottom: 0.45rem !important; }
    .pb-3 { padding-bottom: 0.65rem !important; }
    .pb-4 { padding-bottom: 0.85rem !important; }
    .px-1\\.5 { padding-left: 0.375rem !important; padding-right: 0.375rem !important; }
    .px-2 { padding-left: 0.5rem !important; padding-right: 0.5rem !important; }
    .px-2\\.5 { padding-left: 0.625rem !important; padding-right: 0.625rem !important; }
    .px-3 { padding-left: 0.75rem !important; padding-right: 0.75rem !important; }
    .py-0\\.5 { padding-top: 0.125rem !important; padding-bottom: 0.125rem !important; }
    .py-1 { padding-top: 0.25rem !important; padding-bottom: 0.25rem !important; }

    /* Borders */
    .rounded { border-radius: 0.25rem !important; }
    .rounded-md { border-radius: 0.375rem !important; }
    .rounded-lg { border-radius: 0.5rem !important; }
    .rounded-xl { border-radius: 0.65rem !important; }
    .rounded-2xl { border-radius: 0.85rem !important; }
    .rounded-full { border-radius: 9999px !important; }
    .border { border: 1px solid #cbd5e1 !important; }
    .border-b { border-bottom: 1px solid #e2e8f0 !important; }
    .border-b-2 { border-bottom: 2px solid #0f172a !important; }
    .border-t { border-top: 1px solid #e2e8f0 !important; }
    .border-slate-100 { border-color: #f1f5f9 !important; }
    .border-slate-200 { border-color: #e2e8f0 !important; }
    .border-slate-300 { border-color: #cbd5e1 !important; }
    .border-indigo-100 { border-color: #e0e7ff !important; }
    .border-indigo-200 { border-color: #c7d2fe !important; }
    .border-rose-200 { border-color: #fecdd3 !important; }
    .border-rose-400 { border-color: #fb7185 !important; }
    .border-emerald-200 { border-color: #a7f3d0 !important; }
    .border-emerald-300 { border-color: #6ee7b7 !important; }
    .border-emerald-400 { border-color: #34d399 !important; }
    .border-amber-200 { border-color: #fde68a !important; }
    .border-teal-200 { border-color: #99f6e4 !important; }
    .border-blue-200 { border-color: #bfdbfe !important; }

    /* Backgrounds */
    .bg-white { background-color: #ffffff !important; }
    .bg-slate-50 { background-color: #f8fafc !important; }
    .bg-slate-100 { background-color: #f1f5f9 !important; }
    .bg-slate-900 { background-color: #0f172a !important; }
    .bg-indigo-50 { background-color: #eef2ff !important; }
    .bg-indigo-100 { background-color: #e0e7ff !important; }
    .bg-indigo-600 { background-color: #4f46e5 !important; }
    .bg-rose-50 { background-color: #fff1f2 !important; }
    .bg-rose-100 { background-color: #ffe4e6 !important; }
    .bg-rose-600 { background-color: #e11d48 !important; }
    .bg-emerald-50 { background-color: #ecfdf5 !important; }
    .bg-emerald-100 { background-color: #d1fae5 !important; }
    .bg-emerald-600 { background-color: #059669 !important; }
    .bg-emerald-700 { background-color: #047857 !important; }
    .bg-amber-50 { background-color: #fffbeb !important; }
    .bg-amber-100 { background-color: #fef3c7 !important; }
    .bg-teal-50 { background-color: #f0fdfa !important; }
    .bg-blue-50 { background-color: #eff6ff !important; }

    /* Colors */
    .text-slate-400 { color: #94a3b8 !important; }
    .text-slate-500 { color: #64748b !important; }
    .text-slate-600 { color: #475569 !important; }
    .text-slate-700 { color: #334155 !important; }
    .text-slate-800 { color: #1e293b !important; }
    .text-slate-900 { color: #0f172a !important; }
    .text-indigo-600 { color: #4f46e5 !important; }
    .text-indigo-700 { color: #4338ca !important; }
    .text-indigo-900 { color: #312e81 !important; }
    .text-indigo-950 { color: #1e1b4b !important; }
    .text-rose-600 { color: #e11d48 !important; }
    .text-rose-700 { color: #be123c !important; }
    .text-rose-800 { color: #9f1239 !important; }
    .text-rose-900 { color: #881337 !important; }
    .text-rose-950 { color: #4c0519 !important; }
    .text-emerald-700 { color: #047857 !important; }
    .text-emerald-800 { color: #065f46 !important; }
    .text-emerald-950 { color: #022c22 !important; }
    .text-amber-700 { color: #b45309 !important; }
    .text-amber-800 { color: #92400e !important; }
    .text-amber-900 { color: #78350f !important; }
    .text-amber-950 { color: #451a03 !important; }
    .text-teal-800 { color: #115e59 !important; }
    .text-blue-700 { color: #1d4ed8 !important; }
    .text-white { color: #ffffff !important; }

    /* Typography */
    .font-black { font-weight: 900 !important; }
    .font-bold { font-weight: 700 !important; }
    .font-semibold { font-weight: 600 !important; }
    .font-medium { font-weight: 500 !important; }
    .font-normal { font-weight: 400 !important; }
    .text-\\[9px\\] { font-size: 9px !important; }
    .text-\\[10px\\] { font-size: 10px !important; }
    .text-\\[11px\\] { font-size: 11px !important; }
    .text-xs { font-size: 11.5px !important; }
    .text-sm { font-size: 13px !important; }
    .text-base { font-size: 14.5px !important; }
    .text-xl { font-size: 17px !important; }
    .text-2xl { font-size: 20px !important; }
    .uppercase { text-transform: uppercase !important; }
    .leading-relaxed { line-height: 1.5 !important; }
    .whitespace-pre-wrap { white-space: pre-wrap !important; }
    .w-3 { width: 0.75rem !important; }
    .h-3 { height: 0.75rem !important; }
    .w-3\\.5 { width: 0.875rem !important; }
    .h-3\\.5 { height: 0.875rem !important; }
    .w-4 { width: 1rem !important; }
    .h-4 { height: 1rem !important; }
    .w-5 { width: 1.25rem !important; }
    .h-5 { height: 1.25rem !important; }
    
    .max-h-48 { max-height: 190px !important; }
    .max-h-64 { max-height: 220px !important; }
    .object-contain { object-fit: contain !important; }
    .text-center { text-align: center !important; }
    .text-right { text-align: right !important; }
    .shrink-0 { flex-shrink: 0 !important; }
    .truncate { overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
  `;

  const triggerNativePrintPDF = () => {
    if (!printContainerRef.current) return;
    setIsExporting(true);

    try {
      const printIframe = document.createElement('iframe');
      printIframe.setAttribute('title', 'EduStack PDF Export');
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      printIframe.style.visibility = 'hidden';
      document.body.appendChild(printIframe);

      const iframeDoc = printIframe.contentDocument || printIframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('Unable to access print iframe document');
      }

      const contentHtml = printContainerRef.current.innerHTML;

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <title>${test.title || 'EduStack'} — Error Revision Notes</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
            <style>
              ${getFullPrintCSS()}
            </style>
          </head>
          <body>
            <div style="width: 100%; max-width: 820px; margin: 0 auto;">
              ${contentHtml}
            </div>
          </body>
        </html>
      `);
      iframeDoc.close();

      setTimeout(() => {
        try {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
        } catch (printErr) {
          console.warn('Iframe print fallback to window.print', printErr);
          window.print();
        } finally {
          setIsExporting(false);
          setTimeout(() => {
            if (document.body.contains(printIframe)) {
              document.body.removeChild(printIframe);
            }
          }, 5000);
        }
      }, 700);
    } catch (err) {
      console.error('Print initialization error', err);
      setIsExporting(false);
      window.print();
    }
  };

  const errorTypeSummary: Record<string, { label: string; count: number; category: string }> = useMemo(() => {
    const summary: Record<string, { label: string; count: number; category: string }> = {};

    ERROR_CATEGORIES_CONFIG.forEach(cat => {
      cat.items.forEach(item => {
        summary[item.type] = {
          label: item.label,
          count: 0,
          category: cat.title,
        };
      });
    });

    Object.values(mergedNotesMap).forEach((n: ErrorNote) => {
      if (n.thisIsFine) {
        if (summary['THIS_IS_FINE']) {
          summary['THIS_IS_FINE'].count++;
        }
      }
      (n.selectedErrorTypes || []).forEach((t: string) => {
        if (summary[t]) {
          summary[t].count++;
        }
      });
    });

    return summary;
  }, [mergedNotesMap]);

  const activeErrors = useMemo(() => {
    return Object.entries(errorTypeSummary).filter(([_, val]) => val.count > 0);
  }, [errorTypeSummary]);

  const getRecommendedTimeSeconds = (subject?: SubjectType) => {
    switch (subject) {
      case 'CHEMISTRY':
        return 90;
      case 'PHYSICS':
        return 140;
      case 'MATHEMATICS':
        return 160;
      default:
        return 120;
    }
  };

  const formatSeconds = (sec: number) => {
    const s = Math.max(0, Math.round(sec || 0));
    const m = Math.floor(s / 60);
    const remS = s % 60;
    if (m === 0) return `${remS}s`;
    return `${m}m ${remS < 10 ? '0' : ''}${remS}s`;
  };

  const reviewedQuestions = useMemo(() => {
    if (filterMode === 'ALL') {
      return questions;
    }

    const filtered = questions.filter(q => {
      const n = mergedNotesMap[q.id];
      const ans = attempt.answers?.[q.id];
      const hasMistake = !ans || !ans.isCorrect;
      const hasNotesOrTags =
        Boolean(n?.thisIsFine) ||
        (n?.selectedErrorTypes && n.selectedErrorTypes.length > 0) ||
        Boolean(n?.whatIMessed?.trim()) ||
        (n?.whatIMessedImages && n.whatIMessedImages.length > 0) ||
        Boolean(n?.whatILearned?.trim()) ||
        (n?.whatILearnedImages && n.whatILearnedImages.length > 0) ||
        Boolean(n?.importantNote?.trim()) ||
        (n?.importantNoteImages && n.importantNoteImages.length > 0) ||
        Boolean(n?.keyPoint?.trim()) ||
        (n?.keyPointImages && n.keyPointImages.length > 0);

      return hasMistake || hasNotesOrTags;
    });

    return filtered.length > 0 ? filtered : questions;
  }, [questions, mergedNotesMap, attempt.answers, filterMode]);

  const totalNotesRecordedCount = useMemo(() => {
    return Object.values(mergedNotesMap).filter((n: ErrorNote) => {
      return (
        Boolean(n.whatIMessed?.trim()) ||
        (n.whatIMessedImages && n.whatIMessedImages.length > 0) ||
        Boolean(n.whatILearned?.trim()) ||
        (n.whatILearnedImages && n.whatILearnedImages.length > 0) ||
        Boolean(n.importantNote?.trim()) ||
        (n.importantNoteImages && n.importantNoteImages.length > 0) ||
        Boolean(n.keyPoint?.trim()) ||
        (n.keyPointImages && n.keyPointImages.length > 0)
      );
    }).length;
  }, [mergedNotesMap]);

  const totalImagesAttachedCount = useMemo(() => {
    let count = 0;
    Object.values(mergedNotesMap).forEach((n: ErrorNote) => {
      count += (n.whatIMessedImages?.length || 0);
      count += (n.whatILearnedImages?.length || 0);
      count += (n.importantNoteImages?.length || 0);
      count += (n.keyPointImages?.length || 0);
    });
    return count;
  }, [mergedNotesMap]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-100 rounded-2xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden my-auto">
        <div className="print:hidden bg-slate-900 text-white px-5 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black flex items-center gap-2">
                <span>Smart Error Revision Notes — PDF Document</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Ready
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Contains complete question statements, student notes, uploaded diagrams, and time analysis.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setFilterMode('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  filterMode === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Questions ({questions.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('MISTAKES_AND_NOTES')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  filterMode === 'MISTAKES_AND_NOTES'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Mistakes & Notes ({filterMode === 'MISTAKES_AND_NOTES' ? reviewedQuestions.length : questions.filter(q => {
                  const n = mergedNotesMap[q.id];
                  const ans = attempt.answers?.[q.id];
                  return (!ans || !ans.isCorrect) || Boolean(n?.thisIsFine) || (n?.selectedErrorTypes && n.selectedErrorTypes.length > 0) || Boolean(n?.whatIMessed?.trim()) || Boolean(n?.whatILearned?.trim()) || Boolean(n?.importantNote?.trim()) || Boolean(n?.keyPoint?.trim());
                }).length})
              </button>
            </div>

            <button
              type="button"
              id="download-pdf-button"
              onClick={triggerNativePrintPDF}
              disabled={isExporting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
              title="Save as PDF using browser vector export"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isExporting ? 'Preparing Document...' : 'Save / Download PDF'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
              title="Close Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-200/60 print:bg-white print:p-0 print:overflow-visible">
          <div
            ref={printContainerRef}
            id="error-notes-printable-document"
            className="bg-white max-w-3xl mx-auto p-5 sm:p-8 rounded-2xl shadow-md print:shadow-none print:p-0 print:max-w-none text-slate-900 font-sans space-y-4"
          >
            {/* Header Block */}
            <div className="avoid-break-header border-b-2 border-slate-900 pb-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">
                      EduStack CBT Examination Suite
                    </span>
                  </div>
                  <h1 className="text-lg sm:text-xl font-black text-slate-900">
                    Smart Error & Revision Analysis Notes
                  </h1>
                  <p className="text-xs font-bold text-slate-700">{test.title}</p>
                </div>

                <div className="text-right text-[11px] space-y-0.5 text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div>
                    Student: <strong className="text-slate-900">{attempt.studentName || 'JEE Aspirant'}</strong>
                  </div>
                  <div>
                    Test Date:{' '}
                    <strong className="text-slate-900">
                      {new Date(attempt.submittedAt || attempt.startTime).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </strong>
                  </div>
                  <div>
                    Score:{' '}
                    <strong className="text-indigo-700 font-black">
                      {attempt.totalScore} / {attempt.maxScore} ({attempt.accuracy}%)
                    </strong>
                  </div>
                  <div>
                    Total Time Taken:{' '}
                    <strong className="text-slate-900">{formatSeconds(attempt.timeTakenSeconds)}</strong>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center text-xs">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    Questions In PDF
                  </div>
                  <div className="text-sm font-black text-slate-900">{reviewedQuestions.length}</div>
                </div>
                <div className="p-2 rounded-lg bg-rose-50 border border-rose-200">
                  <div className="text-[9px] font-bold text-rose-700 uppercase tracking-wider">
                    Total Incorrect
                  </div>
                  <div className="text-sm font-black text-rose-950">{attempt.totalIncorrect}</div>
                </div>
                <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200">
                  <div className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider">
                    Notes Written
                  </div>
                  <div className="text-sm font-black text-indigo-950">{totalNotesRecordedCount} Qs</div>
                </div>
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="text-[9px] font-bold text-amber-700 uppercase tracking-wider">
                    Diagrams / Images
                  </div>
                  <div className="text-sm font-black text-amber-950">{totalImagesAttachedCount} Attached</div>
                </div>
              </div>
            </div>

            {/* Error Breakdown Block */}
            <div className="avoid-break-header bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  <span>1. Error Classification Breakdown</span>
                </h3>
                <span className="text-[10px] font-bold text-slate-500">
                  Total Tagged Factors: {activeErrors.reduce((acc, [_, item]) => acc + item.count, 0)}
                </span>
              </div>

              {activeErrors.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {activeErrors.map(([typeKey, data]) => (
                    <div
                      key={typeKey}
                      className="p-1.5 px-2 bg-white rounded-md border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <span className="text-slate-800 font-semibold text-[10.5px] truncate pr-1">
                        {data.label}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-950 font-black text-[11px] shrink-0">
                        {data.count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic py-0.5">
                  No specific error classification tags applied yet.
                </p>
              )}
            </div>

            {/* Questions Section */}
            <div className="space-y-3">
              <div className="avoid-break-header flex items-center justify-between border-b border-slate-200 pb-1.5">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>2. Question-by-Question Detailed Revision Notes</span>
                </h3>
                <span className="text-[11px] font-semibold text-slate-500">
                  {reviewedQuestions.length} Questions Documented
                </span>
              </div>

              {reviewedQuestions.map((q, idx) => {
                const note = mergedNotesMap[q.id];
                const ans = attempt.answers?.[q.id];
                const isAnswered = ans && Boolean(ans.selectedOptionId);
                const isCorrect = Boolean(ans?.isCorrect);

                const actualTime = ans?.timeSpentSeconds || 0;
                const recTime = getRecommendedTimeSeconds(q.subject);
                const diffTime = actualTime - recTime;

                let timeBadge = {
                  text: `On Pace (${formatSeconds(actualTime)})`,
                  className: 'bg-slate-100 text-slate-700 border-slate-200',
                };

                if (diffTime > 30) {
                  timeBadge = {
                    text: `Over-Time by +${formatSeconds(diffTime)}`,
                    className: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
                  };
                } else if (actualTime < recTime * 0.4 && !isCorrect) {
                  timeBadge = {
                    text: `Rushed / Fast Attempt (-${formatSeconds(Math.abs(diffTime))})`,
                    className: 'bg-amber-50 text-amber-700 border-amber-200 font-bold',
                  };
                } else if (Math.abs(diffTime) <= 30) {
                  timeBadge = {
                    text: `Optimal Pace (${formatSeconds(actualTime)})`,
                    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
                  };
                } else if (diffTime < -30) {
                  timeBadge = {
                    text: `Fast Pace (-${formatSeconds(Math.abs(diffTime))})`,
                    className: 'bg-blue-50 text-blue-700 border-blue-200 font-bold',
                  };
                }

                const hasWhatIMessed = Boolean(note?.whatIMessed?.trim()) || (note?.whatIMessedImages && note.whatIMessedImages.length > 0);
                const hasWhatILearned = Boolean(note?.whatILearned?.trim()) || (note?.whatILearnedImages && note.whatILearnedImages.length > 0);
                const hasImportantNote = Boolean(note?.importantNote?.trim()) || (note?.importantNoteImages && note.importantNoteImages.length > 0);
                const hasKeyPoint = Boolean(note?.keyPoint?.trim()) || (note?.keyPointImages && note.keyPointImages.length > 0);
                const hasAnyNotes = hasWhatIMessed || hasWhatILearned || hasImportantNote || hasKeyPoint;

                return (
                  <div
                    key={q.id}
                    className="pdf-card p-4 rounded-xl border border-slate-300 bg-white space-y-3"
                  >
                    {/* Header Row */}
                    <div className="avoid-break-header flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white text-xs font-black">
                          Q{q.orderIndex || idx + 1}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                          {q.subject || 'GENERAL'}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-xs font-black border ${
                            isCorrect
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isAnswered
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {isCorrect ? '✓ Correct' : isAnswered ? '✗ Incorrect' : '○ Unattempted'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-500">
                          Marks: <strong className="text-slate-900">{ans?.marksAwarded ?? 0}</strong> / {q.marks || 4}
                        </span>
                      </div>
                    </div>

                    {/* Time Analysis Bar */}
                    <div className="avoid-break-header bg-slate-50 p-2 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-3 text-slate-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            Time Spent: <strong className="text-slate-900">{formatSeconds(actualTime)}</strong>
                          </span>
                        </div>
                        <div className="hidden sm:inline text-slate-300">•</div>
                        <div>
                          Benchmark: <strong className="text-slate-900">{formatSeconds(recTime)}</strong>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10.5px] border ${timeBadge.className}`}>
                        {timeBadge.text}
                      </span>
                    </div>

                    {/* Question Statement */}
                    <div className="avoid-break-header space-y-1">
                      <div className="text-[9.5px] font-black uppercase tracking-wider text-slate-400">
                        Question Statement:
                      </div>
                      <div className="text-xs sm:text-sm text-slate-900 font-medium leading-relaxed">
                        <MathRenderer content={q.questionText} />
                      </div>
                    </div>

                    {q.questionImageUrl && (
                      <div className="avoid-break-header p-2 bg-slate-50 rounded-lg border border-slate-200 inline-block max-w-full">
                        <img
                          src={q.questionImageUrl}
                          alt={`Question Q${q.orderIndex || idx + 1} Diagram`}
                          className="max-h-48 rounded object-contain bg-white border border-slate-200"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    {/* Options / Numerical Answer */}
                    {q.type === 'NUMERICAL' ? (
                      <div className="avoid-break-header p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
                        <div className="text-[9.5px] font-black uppercase tracking-wider text-slate-500">
                          Numerical Answer Evaluation:
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <div className="p-1.5 px-2.5 rounded bg-white border border-slate-200 flex items-center gap-2">
                            <span className="text-slate-500 font-semibold">Your Entered:</span>
                            <span className={`font-black ${isCorrect ? 'text-emerald-700' : isAnswered ? 'text-rose-700' : 'text-slate-500'}`}>
                              {ans?.numericalResponse !== undefined && ans?.numericalResponse !== null ? ans.numericalResponse : 'Unattempted'}
                            </span>
                          </div>
                          <div className="p-1.5 px-2.5 rounded bg-emerald-50 border border-emerald-300 flex items-center gap-2">
                            <span className="text-emerald-800 font-semibold">Official Key:</span>
                            <span className="text-emerald-950 font-black">
                              {q.numericalAnswer !== undefined && q.numericalAnswer !== null ? q.numericalAnswer : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="avoid-break-header grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs pt-0.5">
                        {q.options?.map((opt, oIdx) => {
                          const isStudent = ans?.selectedOptionId === opt.id;
                          const isCorrectKey = q.correctOptionId === opt.id;

                          let style = 'bg-slate-50 border-slate-200 text-slate-700';
                          if (isCorrectKey) {
                            style = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold';
                          } else if (isStudent && !isCorrectKey) {
                            style = 'bg-rose-50 border-rose-400 text-rose-950 font-medium';
                          }

                          return (
                            <div
                              key={opt.id}
                              className={`p-2 rounded-lg border flex items-center gap-2 ${style}`}
                            >
                              <span className="w-4 h-4 rounded-full bg-white border border-slate-300 flex items-center justify-center font-bold text-[9px] shrink-0">
                                {opt.optionLabel || String.fromCharCode(65 + oIdx)}
                              </span>
                              <span className="flex-1 flex flex-col gap-1">
                                <MathRenderer content={opt.optionText} />
                                {opt.optionImageUrl && (
                                  <div className="bg-white border border-slate-200 rounded p-0.5 max-w-[120px]">
                                    <img src={opt.optionImageUrl} alt="Option figure" className="rounded object-contain" />
                                  </div>
                                )}
                                {opt.optionSvgContent && (
                                  <div className="bg-white border border-slate-200 rounded p-0.5 max-w-[120px]">
                                    <SafeSvgRenderer svgContent={opt.optionSvgContent} className="rounded object-contain" />
                                  </div>
                                )}
                              </span>

                              {isCorrectKey && (
                                <span className="text-[8.5px] font-black px-1.5 py-0.2 rounded bg-emerald-600 text-white shrink-0">
                                  OFFICIAL KEY
                                </span>
                              )}
                              {isStudent && !isCorrectKey && (
                                <span className="text-[8.5px] font-black px-1.5 py-0.2 rounded bg-rose-600 text-white shrink-0">
                                  YOUR ANSWER
                                </span>
                              )}
                              {isStudent && isCorrectKey && (
                                <span className="text-[8.5px] font-black px-1.5 py-0.2 rounded bg-emerald-700 text-white shrink-0">
                                  YOUR ANSWER ✓
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Tagged Classifications */}
                    {((note?.selectedErrorTypes && note.selectedErrorTypes.length > 0) || note?.thisIsFine) && (
                      <div className="avoid-break-header flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] font-bold text-slate-500">Tags:</span>
                        {note.thisIsFine && (
                          <span className="px-2 py-0.2 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[9.5px] font-bold">
                            ✓ This is Fine (Concept Mastered)
                          </span>
                        )}
                        {note.selectedErrorTypes?.map(t => (
                          <span
                            key={t}
                            className="px-2 py-0.2 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[9.5px] font-bold"
                          >
                            {errorTypeSummary[t]?.label || t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Solution */}
                    {(q.solutionText || q.solutionImageUrl) && (
                      <div className="avoid-break-header p-2.5 bg-indigo-50 rounded-lg border border-indigo-100 text-xs space-y-1">
                        <div className="flex items-center gap-1 font-bold text-indigo-900 text-[10px] uppercase tracking-wider">
                          <HelpCircle className="w-3 h-3 text-indigo-600" />
                          <span>Teacher Solution:</span>
                        </div>
                        {q.solutionText && (
                          <div className="text-slate-800 leading-relaxed font-normal">
                            <MathRenderer content={q.solutionText} />
                          </div>
                        )}
                        {q.solutionImageUrl && (
                          <div className="bg-white border border-slate-200 rounded p-1 max-w-xs mt-1">
                            <img src={q.solutionImageUrl} alt="Solution figure" className="rounded object-contain" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Student Notes & Attachments Grid */}
                    {hasAnyNotes && (
                      <div className="pt-1 space-y-2">
                        <div className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 border-t border-slate-100 pt-1.5">
                          Student Smart Error Notes & Visual Attachments:
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* 1. What I Messed */}
                          {hasWhatIMessed && (
                            <div className="avoid-break-header p-2.5 bg-rose-50 rounded-lg border border-rose-200 text-xs space-y-1.5">
                              <div className="flex items-center justify-between border-b border-rose-200 pb-1">
                                <strong className="text-rose-900 text-[10.5px] uppercase tracking-wider flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                                  <span>What I Messed</span>
                                </strong>
                                {note.whatIMessedImages && note.whatIMessedImages.length > 0 && (
                                  <span className="text-[9px] font-bold text-rose-700 bg-rose-100 px-1 py-0.2 rounded">
                                    {note.whatIMessedImages.length} Img
                                  </span>
                                )}
                              </div>

                              {note.whatIMessed && (
                                <p className="text-slate-800 font-medium leading-relaxed whitespace-pre-wrap text-[11.5px]">
                                  {note.whatIMessed}
                                </p>
                              )}

                              {note.whatIMessedImages && note.whatIMessedImages.length > 0 && (
                                <div className="space-y-1.5 pt-0.5">
                                  {note.whatIMessedImages.map((imgUrl, imgIdx) => (
                                    <div
                                      key={imgIdx}
                                      className="p-1.5 bg-white rounded border border-rose-200 space-y-0.5"
                                    >
                                      <div className="flex items-center gap-1 text-[9px] font-bold text-rose-700">
                                        <ImageIcon className="w-2.5 h-2.5" />
                                        <span>Attachment #{imgIdx + 1}</span>
                                      </div>
                                      <img
                                        src={imgUrl}
                                        alt={`Attachment ${imgIdx + 1}`}
                                        className="w-full max-h-48 object-contain rounded bg-slate-50"
                                        referrerPolicy="no-referrer"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* 2. What I Learned */}
                          {hasWhatILearned && (
                            <div className="avoid-break-header p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs space-y-1.5">
                              <div className="flex items-center justify-between border-b border-emerald-200 pb-1">
                                <strong className="text-emerald-900 text-[10.5px] uppercase tracking-wider flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>What I Learned</span>
                                </strong>
                                {note.whatILearnedImages && note.whatILearnedImages.length > 0 && (
                                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded">
                                    {note.whatILearnedImages.length} Img
                                  </span>
                                )}
                              </div>

                              {note.whatILearned && (
                                <p className="text-slate-800 font-medium leading-relaxed whitespace-pre-wrap text-[11.5px]">
                                  {note.whatILearned}
                                </p>
                              )}

                              {note.whatILearnedImages && note.whatILearnedImages.length > 0 && (
                                <div className="space-y-1.5 pt-0.5">
                                  {note.whatILearnedImages.map((imgUrl, imgIdx) => (
                                    <div
                                      key={imgIdx}
                                      className="p-1.5 bg-white rounded border border-emerald-200 space-y-0.5"
                                    >
                                      <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-700">
                                        <ImageIcon className="w-2.5 h-2.5" />
                                        <span>Attachment #{imgIdx + 1}</span>
                                      </div>
                                      <img
                                        src={imgUrl}
                                        alt={`Attachment ${imgIdx + 1}`}
                                        className="w-full max-h-48 object-contain rounded bg-slate-50"
                                        referrerPolicy="no-referrer"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* 3. Important Note */}
                          {hasImportantNote && (
                            <div className="avoid-break-header p-2.5 bg-indigo-50 rounded-lg border border-indigo-200 text-xs space-y-1.5">
                              <div className="flex items-center justify-between border-b border-indigo-200 pb-1">
                                <strong className="text-indigo-900 text-[10.5px] uppercase tracking-wider flex items-center gap-1">
                                  <FileText className="w-3 h-3 text-indigo-600" />
                                  <span>Important Note</span>
                                </strong>
                                {note.importantNoteImages && note.importantNoteImages.length > 0 && (
                                  <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100 px-1 py-0.2 rounded">
                                    {note.importantNoteImages.length} Img
                                  </span>
                                )}
                              </div>

                              {note.importantNote && (
                                <p className="text-slate-800 font-medium leading-relaxed whitespace-pre-wrap text-[11.5px]">
                                  {note.importantNote}
                                </p>
                              )}

                              {note.importantNoteImages && note.importantNoteImages.length > 0 && (
                                <div className="space-y-1.5 pt-0.5">
                                  {note.importantNoteImages.map((imgUrl, imgIdx) => (
                                    <div
                                      key={imgIdx}
                                      className="p-1.5 bg-white rounded border border-indigo-200 space-y-0.5"
                                    >
                                      <div className="flex items-center gap-1 text-[9px] font-bold text-indigo-700">
                                        <ImageIcon className="w-2.5 h-2.5" />
                                        <span>Attachment #{imgIdx + 1}</span>
                                      </div>
                                      <img
                                        src={imgUrl}
                                        alt={`Attachment ${imgIdx + 1}`}
                                        className="w-full max-h-48 object-contain rounded bg-slate-50"
                                        referrerPolicy="no-referrer"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* 4. Key Point */}
                          {hasKeyPoint && (
                            <div className="avoid-break-header p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs space-y-1.5">
                              <div className="flex items-center justify-between border-b border-amber-200 pb-1">
                                <strong className="text-amber-900 text-[10.5px] uppercase tracking-wider flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-amber-600" />
                                  <span>Key Point</span>
                                </strong>
                                {note.keyPointImages && note.keyPointImages.length > 0 && (
                                  <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 py-0.2 rounded">
                                    {note.keyPointImages.length} Img
                                  </span>
                                )}
                              </div>

                              {note.keyPoint && (
                                <p className="text-slate-800 font-medium leading-relaxed whitespace-pre-wrap text-[11.5px]">
                                  {note.keyPoint}
                                </p>
                              )}

                              {note.keyPointImages && note.keyPointImages.length > 0 && (
                                <div className="space-y-1.5 pt-0.5">
                                  {note.keyPointImages.map((imgUrl, imgIdx) => (
                                    <div
                                      key={imgIdx}
                                      className="p-1.5 bg-white rounded border border-amber-200 space-y-0.5"
                                    >
                                      <div className="flex items-center gap-1 text-[9px] font-bold text-amber-700">
                                        <ImageIcon className="w-2.5 h-2.5" />
                                        <span>Attachment #{imgIdx + 1}</span>
                                      </div>
                                      <img
                                        src={imgUrl}
                                        alt={`Attachment ${imgIdx + 1}`}
                                        className="w-full max-h-48 object-contain rounded bg-slate-50"
                                        referrerPolicy="no-referrer"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Document Footer */}
            <div className="avoid-break-header pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
              <div>EduStack CBT System • Smart Error Mastery & Revision</div>
              <div>Generated for {attempt.studentName || 'Student'} • {new Date().toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};