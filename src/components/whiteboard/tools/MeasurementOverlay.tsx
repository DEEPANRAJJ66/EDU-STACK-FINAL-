import React, { useState, useRef, useEffect } from 'react';
import { MeasurementOverlayState } from '../types';
import { RotateCw, X, Move, Compass, Sliders } from 'lucide-react';

interface MeasurementOverlayProps {
  state: MeasurementOverlayState;
  onChange: (newState: Partial<MeasurementOverlayState>) => void;
  onCloseRuler: () => void;
  onCloseProtractor: () => void;
}

export const MeasurementOverlay: React.FC<MeasurementOverlayProps> = ({
  state,
  onChange,
  onCloseRuler,
  onCloseProtractor,
}) => {
  const [isDraggingRuler, setIsDraggingRuler] = useState(false);
  const [isRotatingRuler, setIsRotatingRuler] = useState(false);
  const [isDraggingProtractor, setIsDraggingProtractor] = useState(false);
  const [isRotatingProtractor, setIsRotatingProtractor] = useState(false);

  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startPosRef = useRef<{ x: number; y: number; angle: number }>({ x: 0, y: 0, angle: 0 });

  // Handle Drag / Rotate for Ruler
  const handleRulerMouseDown = (e: React.MouseEvent, action: 'drag' | 'rotate') => {
    e.stopPropagation();
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    startPosRef.current = { x: state.rulerX, y: state.rulerY, angle: state.rulerAngle };

    if (action === 'drag') setIsDraggingRuler(true);
    if (action === 'rotate') setIsRotatingRuler(true);
  };

  // Handle Drag / Rotate for Protractor
  const handleProtractorMouseDown = (e: React.MouseEvent, action: 'drag' | 'rotate') => {
    e.stopPropagation();
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    startPosRef.current = { x: state.protractorX, y: state.protractorY, angle: state.protractorAngle };

    if (action === 'drag') setIsDraggingProtractor(true);
    if (action === 'rotate') setIsRotatingProtractor(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      if (isDraggingRuler) {
        onChange({
          rulerX: startPosRef.current.x + dx,
          rulerY: startPosRef.current.y + dy,
        });
      } else if (isRotatingRuler) {
        // Calculate angle from center of ruler to mouse
        const angleDeg = (Math.atan2(e.clientY - state.rulerY, e.clientX - state.rulerX) * 180) / Math.PI;
        onChange({ rulerAngle: Math.round(angleDeg) });
      } else if (isDraggingProtractor) {
        onChange({
          protractorX: startPosRef.current.x + dx,
          protractorY: startPosRef.current.y + dy,
        });
      } else if (isRotatingProtractor) {
        const angleDeg = (Math.atan2(e.clientY - state.protractorY, e.clientX - state.protractorX) * 180) / Math.PI;
        onChange({ protractorAngle: Math.round(angleDeg) });
      }
    };

    const handleMouseUp = () => {
      setIsDraggingRuler(false);
      setIsRotatingRuler(false);
      setIsDraggingProtractor(false);
      setIsRotatingProtractor(false);
    };

    if (isDraggingRuler || isRotatingRuler || isDraggingProtractor || isRotatingProtractor) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingRuler, isRotatingRuler, isDraggingProtractor, isRotatingProtractor, state, onChange]);

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden select-none">
      {/* 1. INTERACTIVE CLASSROOM RULER */}
      {state.rulerVisible && (
        <div
          className="absolute pointer-events-auto shadow-2xl rounded-sm border border-amber-300/40 cursor-move bg-amber-100/85 backdrop-blur-sm text-slate-800 transition-shadow"
          style={{
            left: `${state.rulerX}px`,
            top: `${state.rulerY}px`,
            width: `${state.rulerLength || 460}px`,
            height: '74px',
            transform: `rotate(${state.rulerAngle}deg)`,
            transformOrigin: '20px 37px',
          }}
        >
          {/* Top Ticks (cm & mm) */}
          <div className="relative w-full h-8 border-b border-amber-400/60 overflow-hidden flex items-start">
            {Array.from({ length: 21 }).map((_, cm) => (
              <div key={cm} className="relative flex-1 h-full border-r border-slate-700">
                <span className="absolute right-1 top-0.5 text-[9px] font-bold text-slate-800">
                  {cm > 0 ? cm : '0'}
                </span>
                {/* 4 intermediate mm ticks */}
                <div className="flex h-3 items-end justify-between px-0.5">
                  <div className="w-px h-1.5 bg-slate-500" />
                  <div className="w-px h-2 bg-slate-600" />
                  <div className="w-px h-1.5 bg-slate-500" />
                  <div className="w-px h-2.5 bg-slate-700" />
                </div>
              </div>
            ))}
          </div>

          {/* Bottom info & handles */}
          <div className="px-3 py-1 flex items-center justify-between text-xs">
            <div
              onMouseDown={(e) => handleRulerMouseDown(e, 'drag')}
              className="flex items-center gap-1.5 font-bold text-amber-900 cursor-grab active:cursor-grabbing px-2 py-0.5 rounded hover:bg-amber-200/50"
            >
              <Move className="w-3.5 h-3.5" />
              <span>EduStack Scale ({Math.round(state.rulerLength / 22)} cm)</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] bg-amber-200/80 px-1.5 py-0.5 rounded font-bold text-amber-950">
                {state.rulerAngle}°
              </span>

              {/* Rotate Knob */}
              <button
                onMouseDown={(e) => handleRulerMouseDown(e, 'rotate')}
                className="p-1 bg-amber-300 hover:bg-amber-400 rounded-full text-slate-800 shadow cursor-ew-resize"
                title="Rotate Ruler"
              >
                <RotateCw className="w-3 h-3" />
              </button>

              {/* Close Button */}
              <button
                onClick={onCloseRuler}
                className="p-1 hover:bg-rose-500 hover:text-white rounded text-slate-700 transition"
                title="Close Ruler"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. INTERACTIVE CLASSROOM PROTRACTOR (180°) */}
      {state.protractorVisible && (
        <div
          className="absolute pointer-events-auto rounded-t-full shadow-2xl border-2 border-indigo-400/50 bg-indigo-50/85 backdrop-blur-sm text-slate-800 cursor-move"
          style={{
            left: `${state.protractorX - 160}px`,
            top: `${state.protractorY - 160}px`,
            width: '320px',
            height: '160px',
            transform: `rotate(${state.protractorAngle}deg)`,
            transformOrigin: '160px 160px',
          }}
        >
          {/* Inner cutout semicircle */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-14 bg-white/70 border border-indigo-300/80 rounded-t-full flex flex-col items-center justify-end pb-1">
            <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
            <span className="text-[10px] font-bold text-indigo-900">
              {state.protractorAngle}°
            </span>
          </div>

          {/* Radial degree tick marks (0 to 180 in steps of 10) */}
          <div className="relative w-full h-full">
            {Array.from({ length: 19 }).map((_, i) => {
              const deg = i * 10;
              const rad = (deg * Math.PI) / 180;
              const r = 145;
              const x = 160 - r * Math.cos(rad);
              const y = 160 - r * Math.sin(rad);

              return (
                <div
                  key={deg}
                  className="absolute text-[8px] font-bold text-indigo-950 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${x}px`, top: `${y}px` }}
                >
                  {deg}°
                </div>
              );
            })}
          </div>

          {/* Drag & Controls bar on base */}
          <div className="absolute -bottom-7 left-0 right-0 flex items-center justify-between px-2 bg-indigo-900/90 text-white rounded-b-lg py-1 text-xs">
            <div
              onMouseDown={(e) => handleProtractorMouseDown(e, 'drag')}
              className="flex items-center gap-1 font-bold cursor-grab"
            >
              <Compass className="w-3.5 h-3.5 text-indigo-300" />
              <span>Protractor</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onMouseDown={(e) => handleProtractorMouseDown(e, 'rotate')}
                className="p-1 bg-indigo-700 hover:bg-indigo-600 rounded-full cursor-ew-resize"
                title="Rotate Protractor"
              >
                <RotateCw className="w-3 h-3" />
              </button>

              <button
                onClick={onCloseProtractor}
                className="p-1 hover:bg-rose-600 rounded"
                title="Close Protractor"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
