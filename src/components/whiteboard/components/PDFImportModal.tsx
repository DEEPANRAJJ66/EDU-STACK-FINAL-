import React, { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker if available
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.0.379'}/pdf.worker.min.mjs`;
} catch (e) {
  console.warn('PDF worker setup fallback', e);
}

interface PDFImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportPages: (pageImages: string[], fileName: string) => void;
}

export const PDFImportModal: React.FC<PDFImportModalProps> = ({
  isOpen,
  onClose,
  onImportPages,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processPDFFile = async (file: File) => {
    try {
      setIsProcessing(true);
      setError(null);
      setFileName(file.name);

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;
      const numPages = pdfDoc.numPages;

      setProgress({ current: 0, total: numPages });
      const renderedPageImages: string[] = [];

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        setProgress({ current: pageNum, total: numPages });
        const page = await pdfDoc.getPage(pageNum);

        // 16:9 presentation friendly scale (target 1920x1080 canvas)
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const scale = Math.max(1.5, 1600 / unscaledViewport.width);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (context) {
          // White background
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          // @ts-ignore
          await page.render(renderContext).promise;
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          renderedPageImages.push(dataUrl);
        }
      }

      onImportPages(renderedPageImages, file.name);
      onClose();
    } catch (err: any) {
      console.error('Failed to parse PDF', err);
      setError(err.message || 'Could not process PDF file. Please ensure it is a valid PDF document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processPDFFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
      processPDFFile(file);
    } else {
      setError('Please drop a valid .pdf document');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Import PDF Lecture / Questions</h3>
              <p className="text-xs text-slate-400">Convert PDF pages into whiteboard slides with full annotation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-slate-200">
          {/* Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
              isProcessing
                ? 'border-indigo-500/50 bg-indigo-950/20 cursor-wait'
                : 'border-slate-700 hover:border-indigo-500 bg-slate-950/50 hover:bg-slate-950'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            {isProcessing ? (
              <>
                <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                <div className="space-y-1">
                  <div className="text-sm font-bold text-white">
                    Processing Slide {progress.current} of {progress.total}...
                  </div>
                  <div className="text-xs text-slate-400 font-mono">{fileName}</div>
                  <div className="w-48 h-2 bg-slate-800 rounded-full mx-auto overflow-hidden mt-3">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-300"
                      style={{
                        width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    Click to browse or Drag & Drop PDF
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports textbook chapters, question papers, DPP sheets, and lecture notes
                  </p>
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs text-slate-300 space-y-1">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Smart PDF Slide Features:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-400 pl-1">
              <li>Each PDF page becomes an individual editable slide</li>
              <li>Draw, highlight, solve numericals, and place 2D/3D shapes over questions</li>
              <li>Annotations stay safely preserved across page navigation</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-850">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
