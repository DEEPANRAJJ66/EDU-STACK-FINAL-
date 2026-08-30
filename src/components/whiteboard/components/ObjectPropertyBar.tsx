import React, { useState, useRef } from 'react';
import { WhiteboardElement, Shape3DElement, ImageElement } from '../types';
import {
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  Eye,
  EyeOff,
  Type,
  Maximize2,
  Lock,
  Unlock,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Sliders,
  Image as ImageIcon,
  Rotate3d,
  GripVertical,
  Move,
  Shapes,
} from 'lucide-react';

interface ObjectPropertyBarProps {
  selectedElement: WhiteboardElement | null;
  onUpdateElement: (updated: WhiteboardElement) => void;
  onDeleteElement: () => void;
  onDuplicateElement: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
}

const PRESET_COLORS = [
  '#ffffff',
  '#f87171',
  '#fb923c',
  '#facc15',
  '#4ade80',
  '#38bdf8',
  '#818cf8',
  '#c084fc',
  '#000000',
];

export const ObjectPropertyBar: React.FC<ObjectPropertyBarProps> = ({
  selectedElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
}) => {
  const barRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; initPosX: number; initPosY: number } | null>(null);

  // Floating Position state (allows moving & repositioning anywhere on whiteboard)
  const [floatingPos, setFloatingPos] = useState<{ x: number; y: number }>(() => {
    const initialX = typeof window !== 'undefined' ? Math.max(16, Math.round((window.innerWidth - 680) / 2)) : 100;
    return { x: initialX, y: 72 };
  });

  const handlePointerDownDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initPosX: floatingPos.x,
      initPosY: floatingPos.y,
    };
  };

  const handlePointerMoveDrag = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    const barWidth = barRef.current?.offsetWidth || 560;
    const barHeight = barRef.current?.offsetHeight || 52;
    const maxX = Math.max(16, window.innerWidth - barWidth - 16);
    const maxY = Math.max(16, window.innerHeight - barHeight - 16);

    const nextX = Math.min(Math.max(16, dragStartRef.current.initPosX + dx), maxX);
    const nextY = Math.min(Math.max(16, dragStartRef.current.initPosY + dy), maxY);
    setFloatingPos({ x: nextX, y: nextY });
  };

  const handlePointerUpDrag = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    dragStartRef.current = null;
  };

  if (!selectedElement) return null;

  const elementType = selectedElement.type ? String(selectedElement.type) : 'OBJECT';
  const isImage = elementType === 'IMAGE';
  const imgEl = isImage ? (selectedElement as ImageElement) : null;

  const is3D = elementType === 'SHAPE_3D';
  const el3D = is3D ? (selectedElement as Shape3DElement) : null;
  const is2D = elementType === 'SHAPE_2D';

  const handleColorChange = (newColor: string) => {
    onUpdateElement({ ...selectedElement, color: newColor } as WhiteboardElement);
  };

  const handleStrokeWidthChange = (width: number) => {
    onUpdateElement({
      ...selectedElement,
      strokeWidth: width,
    } as WhiteboardElement);
  };

  // Image Specific Handlers
  const handleImageWidthChange = (newWidth: number) => {
    if (!imgEl || newWidth < 20) return;
    const currentW = imgEl.width || 100;
    const currentH = imgEl.height || 100;
    const ratio = (imgEl.naturalWidth && imgEl.naturalHeight)
      ? imgEl.naturalWidth / imgEl.naturalHeight
      : currentW / currentH;

    const isLocked = imgEl.lockAspectRatio !== false;
    const newHeight = isLocked ? Math.round(newWidth / ratio) : currentH;

    onUpdateElement({
      ...imgEl,
      width: newWidth,
      height: newHeight,
    });
  };

  const handleImageHeightChange = (newHeight: number) => {
    if (!imgEl || newHeight < 20) return;
    const currentW = imgEl.width || 100;
    const currentH = imgEl.height || 100;
    const ratio = (imgEl.naturalWidth && imgEl.naturalHeight)
      ? imgEl.naturalWidth / imgEl.naturalHeight
      : currentW / currentH;

    const isLocked = imgEl.lockAspectRatio !== false;
    const newWidth = isLocked ? Math.round(newHeight * ratio) : currentW;

    onUpdateElement({
      ...imgEl,
      width: newWidth,
      height: newHeight,
    });
  };

  const handleImageRotationChange = (deg: number) => {
    if (!imgEl) return;
    // Normalize to -180 to 180
    let norm = deg % 360;
    if (norm > 180) norm -= 360;
    if (norm < -180) norm += 360;
    onUpdateElement({
      ...imgEl,
      rotation: Math.round(norm),
    });
  };

  const handleRotateBy = (delta: number) => {
    if (!imgEl) return;
    const current = imgEl.rotation || 0;
    handleImageRotationChange(current + delta);
  };

  const handleToggleFlipH = () => {
    if (!imgEl) return;
    onUpdateElement({
      ...imgEl,
      flipHorizontal: !imgEl.flipHorizontal,
    });
  };

  const handleToggleFlipV = () => {
    if (!imgEl) return;
    onUpdateElement({
      ...imgEl,
      flipVertical: !imgEl.flipVertical,
    });
  };

  const handleScalePreset = (factor: number) => {
    if (!imgEl) return;
    const baseW = imgEl.naturalWidth || imgEl.width || 400;
    const baseH = imgEl.naturalHeight || imgEl.height || 300;
    onUpdateElement({
      ...imgEl,
      width: Math.round(baseW * factor),
      height: Math.round(baseH * factor),
    });
  };

  return (
    <div
      ref={barRef}
      style={{
        left: `${floatingPos.x}px`,
        top: `${floatingPos.y}px`,
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      className="fixed z-40 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl px-3.5 py-2 flex flex-wrap items-center gap-2.5 text-slate-200 animate-in fade-in zoom-in-95 max-w-[96vw] select-none"
    >
      {/* 0. DRAG REPOSITION HANDLE */}
      <div
        onPointerDown={handlePointerDownDrag}
        onPointerMove={handlePointerMoveDrag}
        onPointerUp={handlePointerUpDrag}
        onPointerCancel={handlePointerUpDrag}
        className="flex items-center gap-1 px-2 py-1 bg-slate-800/90 hover:bg-indigo-600/30 text-slate-400 hover:text-indigo-300 border border-slate-700/60 hover:border-indigo-500/50 rounded-xl cursor-grab active:cursor-grabbing transition"
        title="Click and drag to reposition floating toolbar anywhere on whiteboard"
      >
        <GripVertical className="w-3.5 h-3.5 text-slate-400" />
        <Move className="w-3 h-3 text-indigo-400" />
        <span className="text-[10px] font-bold tracking-wider hidden sm:inline">MOVE</span>
      </div>

      {/* Element Type Indicator */}
      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/30 flex items-center gap-1">
        {isImage && <ImageIcon className="w-3 h-3 text-indigo-400" />}
        {is2D && <Shapes className="w-3 h-3 text-indigo-400" />}
        {is3D && <Rotate3d className="w-3 h-3 text-indigo-400" />}
        {isImage ? 'IMAGE' : is2D ? '2D SHAPE' : is3D ? '3D SHAPE' : elementType.replace(/_/g, ' ')}
      </span>

      {/* 1. IMAGE LAYER DEDICATED CONTROLS */}
      {isImage && imgEl && (
        <>
          {/* Dimension Controls: W & H */}
          <div className="flex items-center gap-1.5 border-r border-slate-700/80 pr-2">
            <span className="text-[11px] font-semibold text-slate-400">W:</span>
            <input
              type="number"
              min="20"
              max="3840"
              step="10"
              value={Math.round(imgEl.width || 100)}
              onChange={(e) => handleImageWidthChange(Number(e.target.value))}
              className="w-14 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono text-white text-center focus:outline-none focus:border-indigo-500"
            />
            <span className="text-[11px] font-semibold text-slate-400 ml-1">H:</span>
            <input
              type="number"
              min="20"
              max="2160"
              step="10"
              value={Math.round(imgEl.height || 100)}
              onChange={(e) => handleImageHeightChange(Number(e.target.value))}
              className="w-14 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono text-white text-center focus:outline-none focus:border-indigo-500"
            />
            {/* Lock Aspect Ratio */}
            <button
              onClick={() =>
                onUpdateElement({
                  ...imgEl,
                  lockAspectRatio: !(imgEl.lockAspectRatio !== false),
                })
              }
              className={`p-1 rounded text-xs transition ${
                imgEl.lockAspectRatio !== false
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}
              title={imgEl.lockAspectRatio !== false ? 'Aspect Ratio Locked' : 'Aspect Ratio Unlocked'}
            >
              {imgEl.lockAspectRatio !== false ? (
                <Lock className="w-3.5 h-3.5" />
              ) : (
                <Unlock className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Rotation Slider & Quick Buttons */}
          <div className="flex items-center gap-1.5 border-r border-slate-700/80 pr-2">
            <span className="text-[11px] font-semibold text-slate-400">Rot:</span>
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={imgEl.rotation || 0}
              onChange={(e) => handleImageRotationChange(Number(e.target.value))}
              className="w-16 accent-indigo-500"
              title="Rotate Image Layer"
            />
            <span className="text-[11px] font-mono text-indigo-300 w-8 text-center">
              {imgEl.rotation || 0}°
            </span>

            {/* Quick 90° CCW / CW */}
            <button
              onClick={() => handleRotateBy(-90)}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Rotate 90° Counter-Clockwise"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleRotateBy(90)}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Rotate 90° Clockwise"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Flip Horizontal & Vertical */}
          <div className="flex items-center gap-1 border-r border-slate-700/80 pr-2">
            <button
              onClick={handleToggleFlipH}
              className={`p-1.5 rounded text-xs transition ${
                imgEl.flipHorizontal
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Flip Horizontally"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleToggleFlipV}
              className={`p-1.5 rounded text-xs transition ${
                imgEl.flipVertical
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Flip Vertically"
            >
              <FlipVertical className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Opacity Slider */}
          <div className="flex items-center gap-1.5 border-r border-slate-700/80 pr-2">
            <span className="text-[11px] font-semibold text-slate-400">Opacity:</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={imgEl.opacity !== undefined ? imgEl.opacity : 1}
              onChange={(e) =>
                onUpdateElement({
                  ...imgEl,
                  opacity: Number(e.target.value),
                })
              }
              className="w-14 accent-indigo-500"
              title="Layer Opacity / Transparency"
            />
            <span className="text-[11px] font-mono text-slate-300 w-7 text-center">
              {Math.round((imgEl.opacity !== undefined ? imgEl.opacity : 1) * 100)}%
            </span>
          </div>

          {/* Scale Presets */}
          <div className="hidden lg:flex items-center gap-1 border-r border-slate-700/80 pr-2">
            <button
              onClick={() => handleScalePreset(0.5)}
              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 transition"
              title="50% of original"
            >
              50%
            </button>
            <button
              onClick={() => handleScalePreset(1)}
              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 transition"
              title="Original 100% Size"
            >
              100%
            </button>
            <button
              onClick={() => handleScalePreset(1.5)}
              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 transition"
              title="150% Size"
            >
              150%
            </button>
          </div>
        </>
      )}

      {/* 2. NON-IMAGE COLORS (Stroke & Shapes) */}
      {!isImage && 'color' in selectedElement && (
        <div className="flex items-center gap-1 border-r border-slate-700/80 pr-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => handleColorChange(c)}
              style={{ backgroundColor: c }}
              className={`w-5 h-5 rounded-full border transition cursor-pointer ${
                'color' in selectedElement && selectedElement.color === c
                  ? 'border-white ring-2 ring-indigo-500 scale-110'
                  : 'border-slate-700 hover:scale-105'
              }`}
            />
          ))}
          <input
            type="color"
            value={'color' in selectedElement ? selectedElement.color : '#ffffff'}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 ml-1"
            title="Custom Color"
          />
        </div>
      )}

      {/* 3. STROKE WIDTH (for vector shapes and strokes) */}
      {!isImage && 'strokeWidth' in selectedElement && (
        <div className="flex items-center gap-2 border-r border-slate-700/80 pr-2">
          <span className="text-[11px] text-slate-400 font-semibold">Width:</span>
          <input
            type="range"
            min="1"
            max="16"
            value={selectedElement.strokeWidth || 2}
            onChange={(e) => handleStrokeWidthChange(Number(e.target.value))}
            className="w-16 accent-indigo-500"
          />
          <span className="text-xs font-mono font-bold w-4 text-center">
            {selectedElement.strokeWidth}
          </span>
        </div>
      )}

      {/* 4. 3D SPECIAL CONTROLS */}
      {is3D && el3D && (
        <div className="flex items-center gap-2 border-r border-slate-700/80 pr-2">
          <div className="flex items-center gap-1.5" title="Rotate Pitch X">
            <span className="text-[10px] font-bold text-slate-400">RotX</span>
            <input
              type="range"
              min="-90"
              max="90"
              value={el3D.rotX}
              onChange={(e) =>
                onUpdateElement({ ...el3D, rotX: Number(e.target.value) })
              }
              className="w-14 accent-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5" title="Rotate Yaw Y">
            <span className="text-[10px] font-bold text-slate-400">RotY</span>
            <input
              type="range"
              min="-90"
              max="90"
              value={el3D.rotY}
              onChange={(e) =>
                onUpdateElement({ ...el3D, rotY: Number(e.target.value) })
              }
              className="w-14 accent-indigo-500"
            />
          </div>

          <button
            onClick={() =>
              onUpdateElement({ ...el3D, showHiddenEdges: !el3D.showHiddenEdges })
            }
            className={`p-1 rounded-lg text-xs flex items-center gap-1 transition ${
              el3D.showHiddenEdges ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
            title="Toggle Hidden Edges"
          >
            {el3D.showHiddenEdges ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="text-[10px] font-bold hidden sm:inline">Hidden Edges</span>
          </button>

          <button
            onClick={() =>
              onUpdateElement({ ...el3D, showVertexLabels: !el3D.showVertexLabels })
            }
            className={`p-1 rounded-lg text-xs flex items-center gap-1 transition ${
              el3D.showVertexLabels ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
            title="Toggle Vertex Labels (A, B, C, ...)"
          >
            <Type className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold hidden sm:inline">Labels</span>
          </button>
        </div>
      )}

      {/* 5. LAYER HIERARCHY BUTTONS (Bring to Front, Forward, Backward, Send to Back) */}
      <div className="flex items-center gap-1 border-r border-slate-700/80 pr-2">
        {onBringToFront && (
          <button
            onClick={onBringToFront}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Bring to Front (Top Layer)"
          >
            <ChevronsUp className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={onBringForward}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          title="Bring Forward"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onSendBackward}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          title="Send Backward"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
        {onSendToBack && (
          <button
            onClick={onSendToBack}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Send to Back (Bottom Layer)"
          >
            <ChevronsDown className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 6. ACTIONS: DUPLICATE & DELETE */}
      <div className="flex items-center gap-1">
        <button
          onClick={onDuplicateElement}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 transition flex items-center gap-1 text-xs font-bold"
          title="Duplicate Element"
        >
          <Copy className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Duplicate</span>
        </button>
        <button
          onClick={onDeleteElement}
          className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-800/60 transition flex items-center gap-1 text-xs font-bold"
          title="Delete Element (Del)"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Delete</span>
        </button>
      </div>
    </div>
  );
};

