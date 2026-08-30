import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  UploadCloud,
  Link as LinkIcon,
  Sparkles,
  Image as ImageIcon,
  Check,
  Maximize2,
  Lock,
  Layers,
  FileImage,
} from 'lucide-react';
import {
  STEM_DIAGRAM_PRESETS,
  STEMDiagramPreset,
  readFileAsDataURL,
  loadImageDimensions,
  fitDimensions,
} from '../utils/imageUtils';

interface ImageImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertImage: (imageElement: {
    src: string;
    width: number;
    height: number;
    fileName?: string;
    lockAspectRatio?: boolean;
    isBackground?: boolean;
  }) => void;
}

export const ImageImportModal: React.FC<ImageImportModalProps> = ({
  isOpen,
  onClose,
  onInsertImage,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'stem'>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected or preview image
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('Imported_Image.png');
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [sizePreset, setSizePreset] = useState<'AUTO' | 'COMPACT' | 'MEDIUM' | 'LARGE' | 'ORIGINAL'>('AUTO');
  const [insertAsBackground, setInsertAsBackground] = useState(false);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);

  // URL Tab input
  const [urlInput, setUrlInput] = useState('');

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when opened/closed
  useEffect(() => {
    if (!isOpen) {
      setPreviewSrc(null);
      setError(null);
      setUrlInput('');
      setDimensions(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProcessImageSrc = async (src: string, name: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { width, height } = await loadImageDimensions(src);
      setPreviewSrc(src);
      setFileName(name);
      setDimensions({ width, height });
    } catch {
      setError('Unable to load or decode this image. Please check the file or URL.');
      setPreviewSrc(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelected = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, SVG, WebP, GIF).');
      return;
    }

    try {
      const dataUrl = await readFileAsDataURL(file);
      await handleProcessImageSrc(dataUrl, file.name);
    } catch {
      setError('Failed to read image file.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleLoadUrl = () => {
    if (!urlInput.trim()) return;
    const cleanUrl = urlInput.trim();
    const guessedName = cleanUrl.split('/').pop()?.split('?')[0] || 'Web_Image.png';
    handleProcessImageSrc(cleanUrl, guessedName);
  };

  const handleSelectSTEMPreset = (preset: STEMDiagramPreset) => {
    setPreviewSrc(preset.dataUrl);
    setFileName(preset.title);
    setDimensions({ width: preset.defaultWidth, height: preset.defaultHeight });
  };

  const handleConfirmInsert = () => {
    if (!previewSrc || !dimensions) return;

    let targetW = dimensions.width;
    let targetH = dimensions.height;

    const ratio = (dimensions.width || 1) / (dimensions.height || 1);

    if (sizePreset === 'AUTO') {
      const fitted = fitDimensions(dimensions.width, dimensions.height, 680, 480);
      targetW = fitted.width;
      targetH = fitted.height;
    } else if (sizePreset === 'COMPACT') {
      targetW = 380;
      targetH = Math.round(targetW / ratio);
    } else if (sizePreset === 'MEDIUM') {
      targetW = 600;
      targetH = Math.round(targetW / ratio);
    } else if (sizePreset === 'LARGE') {
      targetW = 900;
      targetH = Math.round(targetW / ratio);
    } else if (sizePreset === 'ORIGINAL') {
      targetW = dimensions.width;
      targetH = dimensions.height;
    }

    onInsertImage({
      src: previewSrc,
      width: targetW,
      height: targetH,
      fileName,
      lockAspectRatio,
      isBackground: insertAsBackground,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150 select-none">
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">Import Image to Whiteboard</h2>
              <p className="text-xs text-slate-400">Add an image as a separate movable &amp; resizable layer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 ${
              activeTab === 'upload'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900/90'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload File</span>
          </button>

          <button
            onClick={() => setActiveTab('stem')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 ${
              activeTab === 'stem'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900/90'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>STEM Diagrams &amp; Figures</span>
          </button>

          <button
            onClick={() => setActiveTab('url')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 ${
              activeTab === 'url'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900/90'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            <span>Image URL</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          {/* TAB 1: UPLOAD LOCAL FILE */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition ${
                  dragOver
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-slate-700 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileSelected(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/15 text-indigo-400 flex items-center justify-center mb-3">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <p className="text-sm font-semibold text-white">
                  Drag &amp; drop an image here, or <span className="text-indigo-400 underline">browse files</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supports PNG, JPG, WebP, SVG vector diagrams, GIF (up to 20MB)
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: STEM SCIENCE PRESETS */}
          {activeTab === 'stem' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Choose from curriculum-aligned vector diagrams for physics, chemistry, and mathematics:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STEM_DIAGRAM_PRESETS.map((preset) => {
                  const isSelected = previewSrc === preset.dataUrl;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectSTEMPreset(preset)}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/15 ring-1 ring-indigo-500'
                          : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="w-16 h-12 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex-shrink-0 flex items-center justify-center p-0.5">
                        <img
                          src={preset.dataUrl}
                          alt={preset.title}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                            {preset.category}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white truncate">{preset.title}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {preset.description}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: IMAGE WEB URL */}
          {activeTab === 'url' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">Image Web Address (URL):</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/diagram.png"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLoadUrl()}
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleLoadUrl}
                  disabled={!urlInput.trim() || isLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
                >
                  {isLoading ? 'Loading...' : 'Preview'}
                </button>
              </div>
            </div>
          )}

          {/* PREVIEW & LAYER CUSTOMIZATION SECTION */}
          {previewSrc && dimensions && (
            <div className="border border-slate-800 bg-slate-950/60 rounded-2xl p-4 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileImage className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white truncate max-w-xs">{fileName}</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {dimensions.width} × {dimensions.height} px
                </span>
              </div>

              {/* Preview Canvas Thumbnail */}
              <div className="w-full h-44 bg-slate-950/90 rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden p-2">
                <img
                  src={previewSrc}
                  alt="Preview"
                  className="max-h-full max-w-full object-contain rounded"
                />
              </div>

              {/* Layer insertion settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Size Preset */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    Initial Size on Canvas
                  </label>
                  <div className="flex gap-1">
                    {(['AUTO', 'COMPACT', 'MEDIUM', 'ORIGINAL'] as const).map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setSizePreset(preset)}
                        className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition border ${
                          sizePreset === preset
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {preset === 'AUTO' ? 'Auto Fit' : preset.charAt(0) + preset.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Layer Mode */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    Layer Configuration
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLockAspectRatio(!lockAspectRatio)}
                      className={`flex-1 py-1.5 px-2 text-[11px] font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition ${
                        lockAspectRatio
                          ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                      title="Keep width & height proportional when resizing"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Lock Proportions</span>
                    </button>

                    <button
                      onClick={() => setInsertAsBackground(!insertAsBackground)}
                      className={`flex-1 py-1.5 px-2 text-[11px] font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition ${
                        insertAsBackground
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                      title="Set as fixed slide background vs movable independent layer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{insertAsBackground ? 'Slide Background' : 'Separate Layer'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {previewSrc ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Ready to insert layer
              </span>
            ) : (
              <span>Select an image or preset to continue</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmInsert}
              disabled={!previewSrc}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 cursor-pointer"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Insert Image Layer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
