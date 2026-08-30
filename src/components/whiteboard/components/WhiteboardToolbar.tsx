import React, { useState, useRef } from 'react';
import {
  WhiteboardTool,
  Shape2DType,
  Shape3DType,
  MathToolType,
  PhysicsToolType,
  BoardTheme,
} from '../types';
import {
  MousePointer,
  Pen,
  Pencil,
  Highlighter,
  Eraser,
  Square,
  Box,
  TrendingUp,
  Atom,
  Ruler,
  FileText,
  Sparkles,
  Undo2,
  Redo2,
  Trash2,
  RotateCcw,
  Maximize2,
  Minimize2,
  Download,
  Palette,
  ChevronDown,
  Hand,
  Compass,
  Image as ImageIcon,
} from 'lucide-react';
import {
  SHAPE_2D_ITEMS,
  SHAPE_3D_ITEMS,
  MATH_TOOL_ITEMS,
  PHYSICS_TOOL_ITEMS,
} from './WhiteboardToolIcons';
import { AnchoredPopover } from './AnchoredPopover';

interface WhiteboardToolbarProps {
  currentTool: WhiteboardTool;
  onSelectTool: (tool: WhiteboardTool) => void;
  selectedShape2D: Shape2DType;
  onSelectShape2D: (shape: Shape2DType) => void;
  selectedShape3D: Shape3DType;
  onSelectShape3D: (shape: Shape3DType) => void;
  selectedMathTool: MathToolType;
  onSelectMathTool: (tool: MathToolType) => void;
  selectedPhysicsTool: PhysicsToolType;
  onSelectPhysicsTool: (tool: PhysicsToolType) => void;
  color: string;
  onChangeColor: (color: string) => void;
  strokeWidth: number;
  onChangeStrokeWidth: (width: number) => void;
  eraserSize?: number;
  onChangeEraserSize?: (size: number) => void;
  boardTheme: BoardTheme;
  onChangeBoardTheme: (theme: BoardTheme) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasSelectedElement?: boolean;
  onDeleteSelected?: () => void;
  onClearPage: () => void;
  onOpenFormulaModal: () => void;
  onOpenGrapherModal: () => void;
  onOpenPDFModal: () => void;
  onOpenImageModal: () => void;
  onToggleRuler: () => void;
  isRulerActive: boolean;
  onToggleProtractor: () => void;
  isProtractorActive: boolean;
  onExportPNG: () => void;
  onExportPDF: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

const COLOR_PRESETS = [
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

const THEME_OPTIONS: { id: BoardTheme; name: string; bgClass: string; desc: string }[] = [
  { id: 'WHITEBOARD', name: 'Whiteboard', bgClass: 'bg-white text-slate-900', desc: 'Clean Light' },
  { id: 'BLACKBOARD', name: 'Chalkboard', bgClass: 'bg-emerald-950 text-white', desc: 'Green Slate' },
  { id: 'SLATE_DARK', name: 'Dark Studio', bgClass: 'bg-slate-900 text-white', desc: 'Dark Slate' },
  { id: 'MATH_GRID', name: 'Math Grid', bgClass: 'bg-slate-900 text-cyan-400', desc: 'Square Grid' },
  { id: 'DOT_GRID', name: 'Dot Grid', bgClass: 'bg-slate-900 text-indigo-400', desc: 'Dot Paper' },
  { id: 'ISOMETRIC', name: 'Isometric', bgClass: 'bg-slate-900 text-amber-400', desc: '3D Mesh' },
  { id: 'RULED_PAPER', name: 'Notebook', bgClass: 'bg-amber-50 text-slate-800', desc: 'Ruled Lines' },
];

export const WhiteboardToolbar: React.FC<WhiteboardToolbarProps> = ({
  currentTool,
  onSelectTool,
  selectedShape2D,
  onSelectShape2D,
  selectedShape3D,
  onSelectShape3D,
  selectedMathTool,
  onSelectMathTool,
  selectedPhysicsTool,
  onSelectPhysicsTool,
  color,
  onChangeColor,
  strokeWidth,
  onChangeStrokeWidth,
  eraserSize = 24,
  onChangeEraserSize,
  boardTheme,
  onChangeBoardTheme,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  hasSelectedElement = false,
  onDeleteSelected,
  onClearPage,
  onOpenFormulaModal,
  onOpenGrapherModal,
  onOpenPDFModal,
  onOpenImageModal,
  onToggleRuler,
  isRulerActive,
  onToggleProtractor,
  isProtractorActive,
  onExportPNG,
  onExportPDF,
  isFullscreen,
  onToggleFullscreen,
}) => {
  // Popover State (Only one open at a time)
  const [openPopup, setOpenPopup] = useState<
    'SHAPES_2D' | 'SHAPES_3D' | 'MATH_TOOLS' | 'PHYSICS_TOOLS' | 'THEMES' | 'COLOR' | null
  >(null);

  // Live hover preview label inside popover
  const [hoveredToolLabel, setHoveredToolLabel] = useState<string | null>(null);

  // Button Refs for Anchored Positioning
  const shapes2DButtonRef = useRef<HTMLButtonElement>(null);
  const shapes3DButtonRef = useRef<HTMLButtonElement>(null);
  const mathToolsButtonRef = useRef<HTMLButtonElement>(null);
  const physicsButtonRef = useRef<HTMLButtonElement>(null);
  const colorButtonRef = useRef<HTMLButtonElement>(null);
  const themeButtonRef = useRef<HTMLButtonElement>(null);

  const closePopup = () => {
    setOpenPopup(null);
    setHoveredToolLabel(null);
  };

  const togglePopup = (
    popup: 'SHAPES_2D' | 'SHAPES_3D' | 'MATH_TOOLS' | 'PHYSICS_TOOLS' | 'THEMES' | 'COLOR'
  ) => {
    setOpenPopup((prev) => (prev === popup ? null : popup));
    setHoveredToolLabel(null);
  };

  // Find active items
  const activeShape2DItem =
    SHAPE_2D_ITEMS.find((s) => s.id === selectedShape2D) || SHAPE_2D_ITEMS[0];
  const activeShape3DItem =
    SHAPE_3D_ITEMS.find((s) => s.id === selectedShape3D) || SHAPE_3D_ITEMS[0];
  const activeMathItem =
    MATH_TOOL_ITEMS.find((m) => m.id === selectedMathTool) || MATH_TOOL_ITEMS[0];
  const activePhysicsItem =
    PHYSICS_TOOL_ITEMS.find((p) => p.id === selectedPhysicsTool) || PHYSICS_TOOL_ITEMS[0];

  return (
    <div className="relative z-30 w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-lg select-none px-3 py-2">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        {/* LEFT SECTION: Primary Tools & Category Dropdowns */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {/* Select Tool */}
          <button
            onClick={() => {
              onSelectTool('SELECT');
              closePopup();
            }}
            className={`p-2 rounded-xl transition flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
              currentTool === 'SELECT'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Select & Move Object (V)"
          >
            <MousePointer className="w-4 h-4" />
            <span className="hidden lg:inline">Select</span>
          </button>

          {/* Pan Hand */}
          <button
            onClick={() => {
              onSelectTool('PAN');
              closePopup();
            }}
            className={`p-2 rounded-xl transition flex items-center gap-1 text-xs font-bold cursor-pointer ${
              currentTool === 'PAN'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Pan Canvas (H / Space)"
          >
            <Hand className="w-4 h-4" />
          </button>

          {/* Pen */}
          <button
            onClick={() => {
              onSelectTool('PEN');
              closePopup();
            }}
            className={`p-2 rounded-xl transition flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
              currentTool === 'PEN'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Pen (P)"
          >
            <Pen className="w-4 h-4" />
            <span className="hidden lg:inline">Pen</span>
          </button>

          {/* Pencil */}
          <button
            onClick={() => {
              onSelectTool('PENCIL');
              closePopup();
            }}
            className={`p-2 rounded-xl transition flex items-center gap-1 text-xs font-bold cursor-pointer ${
              currentTool === 'PENCIL'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Sketch Pencil"
          >
            <Pencil className="w-4 h-4" />
          </button>

          {/* Highlighter */}
          <button
            onClick={() => {
              onSelectTool('HIGHLIGHTER');
              closePopup();
            }}
            className={`p-2 rounded-xl transition flex items-center gap-1 text-xs font-bold cursor-pointer ${
              currentTool === 'HIGHLIGHTER'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Translucent Highlighter"
          >
            <Highlighter className="w-4 h-4" />
          </button>

          {/* Eraser */}
          <button
            onClick={() => {
              onSelectTool('ERASER');
              closePopup();
            }}
            className={`p-2 rounded-xl transition flex items-center gap-1 text-xs font-bold cursor-pointer ${
              currentTool === 'ERASER'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Eraser (E)"
          >
            <Eraser className="w-4 h-4" />
            <span className="hidden xl:inline">Eraser</span>
          </button>

          {/* Eraser Size / Strength Control (Active when Eraser is chosen) */}
          {currentTool === 'ERASER' && onChangeEraserSize && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-800/90 border border-rose-500/40 rounded-xl shadow-inner animate-fadeIn">
              <div className="flex items-center gap-1 text-xs text-rose-300 font-semibold whitespace-nowrap">
                <span>Size:</span>
                <span className="font-mono text-white text-[11px] bg-slate-900 px-1 py-0.5 rounded">
                  {eraserSize}px
                </span>
              </div>
              <input
                type="range"
                min="8"
                max="64"
                step="2"
                value={eraserSize}
                onChange={(e) => onChangeEraserSize(Number(e.target.value))}
                className="w-14 sm:w-20 accent-rose-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                title="Eraser Size / Radius Slider"
              />
            </div>
          )}

          {/* Laser */}
          <button
            onClick={() => {
              onSelectTool('LASER');
              closePopup();
            }}
            className={`p-2 rounded-xl transition flex items-center gap-1 text-xs font-bold cursor-pointer ${
              currentTool === 'LASER'
                ? 'bg-rose-500 text-white shadow-md animate-pulse'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Laser Presentation Trail (L)"
          >
            <Sparkles className="w-4 h-4 text-rose-400" />
            <span className="hidden lg:inline">Laser</span>
          </button>

          <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* ========================================================= */}
          {/* CATEGORY 1: 2D SHAPES DROPDOWN                            */}
          {/* ========================================================= */}
          <button
            ref={shapes2DButtonRef}
            onClick={() => togglePopup('SHAPES_2D')}
            className={`p-2 rounded-xl transition flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
              currentTool === 'SHAPE_2D'
                ? 'bg-indigo-600 text-white shadow-md ring-1 ring-indigo-400'
                : openPopup === 'SHAPES_2D'
                ? 'bg-slate-800 text-indigo-400 ring-1 ring-slate-700'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="2D Geometric Shapes"
          >
            <span className="w-4 h-4 flex items-center justify-center text-indigo-400">
              {currentTool === 'SHAPE_2D' ? activeShape2DItem.icon : <Square className="w-4 h-4" />}
            </span>
            <span className="hidden sm:inline">
              {currentTool === 'SHAPE_2D' ? activeShape2DItem.label : '2D Shapes'}
            </span>
            <ChevronDown
              className={`w-3 h-3 transition-transform duration-150 ${
                openPopup === 'SHAPES_2D' ? 'rotate-180 text-indigo-300' : 'text-slate-400'
              }`}
            />
          </button>

          <AnchoredPopover
            isOpen={openPopup === 'SHAPES_2D'}
            onClose={closePopup}
            anchorRef={shapes2DButtonRef}
            minWidth={280}
            className="p-3 space-y-2"
          >
            <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-800">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                2D Geometry Shapes
              </span>
              <span className="text-[11px] font-medium text-indigo-400 h-4">
                {hoveredToolLabel || (currentTool === 'SHAPE_2D' ? activeShape2DItem.label : '')}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {SHAPE_2D_ITEMS.map((item) => {
                const isSelected = currentTool === 'SHAPE_2D' && selectedShape2D === item.id;
                return (
                  <button
                    key={item.id}
                    onMouseEnter={() => setHoveredToolLabel(item.label)}
                    onMouseLeave={() => setHoveredToolLabel(null)}
                    onClick={() => {
                      onSelectShape2D(item.id);
                      onSelectTool('SHAPE_2D');
                      closePopup();
                    }}
                    className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition group cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/60'
                        : 'bg-slate-800/70 hover:bg-slate-750 text-slate-300 hover:text-white'
                    }`}
                    title={item.label}
                  >
                    <div className="scale-95 group-hover:scale-105 transition-transform">
                      {item.icon}
                    </div>
                    <span className="text-[10px] leading-tight font-medium text-center truncate max-w-[55px]">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </AnchoredPopover>

          {/* ========================================================= */}
          {/* CATEGORY 2: 3D SOLIDS DROPDOWN                            */}
          {/* ========================================================= */}
          <button
            ref={shapes3DButtonRef}
            onClick={() => togglePopup('SHAPES_3D')}
            className={`p-2 rounded-xl transition flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
              currentTool === 'SHAPE_3D'
                ? 'bg-purple-600 text-white shadow-md ring-1 ring-purple-400'
                : openPopup === 'SHAPES_3D'
                ? 'bg-slate-800 text-purple-400 ring-1 ring-slate-700'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="3D Solid Geometry & Stereometry"
          >
            <span className="w-4 h-4 flex items-center justify-center text-purple-400">
              {currentTool === 'SHAPE_3D' ? activeShape3DItem.icon : <Box className="w-4 h-4" />}
            </span>
            <span className="hidden sm:inline">
              {currentTool === 'SHAPE_3D' ? activeShape3DItem.label : '3D Solids'}
            </span>
            <ChevronDown
              className={`w-3 h-3 transition-transform duration-150 ${
                openPopup === 'SHAPES_3D' ? 'rotate-180 text-purple-300' : 'text-slate-400'
              }`}
            />
          </button>

          <AnchoredPopover
            isOpen={openPopup === 'SHAPES_3D'}
            onClose={closePopup}
            anchorRef={shapes3DButtonRef}
            minWidth={280}
            className="p-3 space-y-2"
          >
            <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-800">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                3D Solid Geometry
              </span>
              <span className="text-[11px] font-medium text-purple-400 h-4">
                {hoveredToolLabel || (currentTool === 'SHAPE_3D' ? activeShape3DItem.label : '')}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {SHAPE_3D_ITEMS.map((item) => {
                const isSelected = currentTool === 'SHAPE_3D' && selectedShape3D === item.id;
                return (
                  <button
                    key={item.id}
                    onMouseEnter={() => setHoveredToolLabel(item.label)}
                    onMouseLeave={() => setHoveredToolLabel(null)}
                    onClick={() => {
                      onSelectShape3D(item.id);
                      onSelectTool('SHAPE_3D');
                      closePopup();
                    }}
                    className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition group cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400/60'
                        : 'bg-slate-800/70 hover:bg-slate-750 text-slate-300 hover:text-white'
                    }`}
                    title={item.label}
                  >
                    <div className="scale-95 group-hover:scale-105 transition-transform">
                      {item.icon}
                    </div>
                    <span className="text-[10px] leading-tight font-medium text-center truncate max-w-[70px]">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </AnchoredPopover>

          {/* ========================================================= */}
          {/* CATEGORY 3: MATH TOOLS DROPDOWN                           */}
          {/* ========================================================= */}
          <button
            ref={mathToolsButtonRef}
            onClick={() => togglePopup('MATH_TOOLS')}
            className={`p-2 rounded-xl transition flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
              currentTool === 'MATH_TOOL'
                ? 'bg-sky-600 text-white shadow-md ring-1 ring-sky-400'
                : openPopup === 'MATH_TOOLS'
                ? 'bg-slate-800 text-sky-400 ring-1 ring-slate-700'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="JEE Mathematics Tools & Visualizers"
          >
            <span className="w-4 h-4 flex items-center justify-center text-sky-400">
              {currentTool === 'MATH_TOOL' ? activeMathItem.icon : <TrendingUp className="w-4 h-4" />}
            </span>
            <span className="hidden sm:inline">
              {currentTool === 'MATH_TOOL' ? activeMathItem.label : 'Math Tools'}
            </span>
            <ChevronDown
              className={`w-3 h-3 transition-transform duration-150 ${
                openPopup === 'MATH_TOOLS' ? 'rotate-180 text-sky-300' : 'text-slate-400'
              }`}
            />
          </button>

          <AnchoredPopover
            isOpen={openPopup === 'MATH_TOOLS'}
            onClose={closePopup}
            anchorRef={mathToolsButtonRef}
            minWidth={310}
            className="p-3 space-y-2.5"
          >
            <div className="flex items-center justify-between px-1 pb-1.5 border-b border-slate-800">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Mathematics Visualizers
              </span>
              <span className="text-[11px] font-medium text-sky-400 h-4">
                {hoveredToolLabel || (currentTool === 'MATH_TOOL' ? activeMathItem.label : '')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {MATH_TOOL_ITEMS.map((item) => {
                const isSelected = currentTool === 'MATH_TOOL' && selectedMathTool === item.id;
                return (
                  <button
                    key={item.id}
                    onMouseEnter={() => setHoveredToolLabel(item.label)}
                    onMouseLeave={() => setHoveredToolLabel(null)}
                    onClick={() => {
                      onSelectMathTool(item.id);
                      onSelectTool('MATH_TOOL');
                      closePopup();
                    }}
                    className={`p-2 rounded-xl flex items-center gap-2 transition text-left cursor-pointer ${
                      isSelected
                        ? 'bg-sky-600 text-white shadow-md ring-2 ring-sky-400/60'
                        : 'bg-slate-800/70 hover:bg-slate-750 text-slate-200 hover:text-white'
                    }`}
                  >
                    <div className="p-1 rounded-lg bg-slate-900/60 text-sky-400 shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{item.label}</div>
                      {item.category && (
                        <div className="text-[9px] text-slate-400 truncate">{item.category}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Advanced Modal Launchers: Plot f(x) and LaTeX Formula */}
            <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  onOpenGrapherModal();
                  closePopup();
                }}
                className="p-2 rounded-xl bg-sky-500/15 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 transition flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer"
              >
                <span>Plot f(x) Curve...</span>
              </button>
              <button
                onClick={() => {
                  onOpenFormulaModal();
                  closePopup();
                }}
                className="p-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer"
              >
                <span>Insert LaTeX...</span>
              </button>
            </div>
          </AnchoredPopover>

          {/* ========================================================= */}
          {/* CATEGORY 4: PHYSICS TOOLS DROPDOWN                        */}
          {/* ========================================================= */}
          <button
            ref={physicsButtonRef}
            onClick={() => togglePopup('PHYSICS_TOOLS')}
            className={`p-2 rounded-xl transition flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
              currentTool === 'PHYSICS_TOOL'
                ? 'bg-amber-600 text-white shadow-md ring-1 ring-amber-400'
                : openPopup === 'PHYSICS_TOOLS'
                ? 'bg-slate-800 text-amber-400 ring-1 ring-slate-700'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="JEE Physics Diagrams & Schematics"
          >
            <span className="w-4 h-4 flex items-center justify-center text-amber-400">
              {currentTool === 'PHYSICS_TOOL' ? activePhysicsItem.icon : <Atom className="w-4 h-4" />}
            </span>
            <span className="hidden sm:inline">
              {currentTool === 'PHYSICS_TOOL' ? activePhysicsItem.label : 'Physics'}
            </span>
            <ChevronDown
              className={`w-3 h-3 transition-transform duration-150 ${
                openPopup === 'PHYSICS_TOOLS' ? 'rotate-180 text-amber-300' : 'text-slate-400'
              }`}
            />
          </button>

          <AnchoredPopover
            isOpen={openPopup === 'PHYSICS_TOOLS'}
            onClose={closePopup}
            anchorRef={physicsButtonRef}
            minWidth={320}
            className="p-3 space-y-2.5"
          >
            <div className="flex items-center justify-between px-1 pb-1.5 border-b border-slate-800">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Physics Schematics & Free-Body Diagrams
              </span>
              <span className="text-[11px] font-medium text-amber-400 h-4">
                {hoveredToolLabel || (currentTool === 'PHYSICS_TOOL' ? activePhysicsItem.label : '')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 max-h-[360px] overflow-y-auto pr-1">
              {PHYSICS_TOOL_ITEMS.map((item) => {
                const isSelected =
                  currentTool === 'PHYSICS_TOOL' && selectedPhysicsTool === item.id;
                return (
                  <button
                    key={item.id}
                    onMouseEnter={() => setHoveredToolLabel(item.label)}
                    onMouseLeave={() => setHoveredToolLabel(null)}
                    onClick={() => {
                      onSelectPhysicsTool(item.id);
                      onSelectTool('PHYSICS_TOOL');
                      closePopup();
                    }}
                    className={`p-2 rounded-xl flex items-center gap-2 transition text-left cursor-pointer ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400/60'
                        : 'bg-slate-800/70 hover:bg-slate-750 text-slate-200 hover:text-white'
                    }`}
                  >
                    <div className="p-1 rounded-lg bg-slate-900/60 text-amber-400 shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{item.label}</div>
                      {item.category && (
                        <div className="text-[9px] text-slate-400 truncate">{item.category}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </AnchoredPopover>

          <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* Interactive Classroom Measurement Tools */}
          <button
            onClick={onToggleRuler}
            className={`p-2 rounded-xl transition flex items-center gap-1 text-xs font-bold cursor-pointer ${
              isRulerActive ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Interactive Millimeter Ruler"
          >
            <Ruler className="w-4 h-4 text-sky-400" />
            <span className="hidden xl:inline">Ruler</span>
          </button>

          <button
            onClick={onToggleProtractor}
            className={`p-2 rounded-xl transition flex items-center gap-1 text-xs font-bold cursor-pointer ${
              isProtractorActive
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Interactive 360° Protractor"
          >
            <Compass className="w-4 h-4 text-emerald-400" />
            <span className="hidden xl:inline">Protractor</span>
          </button>

          <button
            onClick={onOpenPDFModal}
            className="p-2 rounded-xl text-slate-300 hover:bg-slate-800 transition flex items-center gap-1 text-xs font-bold cursor-pointer"
            title="Import PDF / Past Exam Papers"
          >
            <FileText className="w-4 h-4 text-rose-400" />
            <span className="hidden xl:inline">PDF</span>
          </button>

          <button
            onClick={onOpenImageModal}
            className="p-2 rounded-xl text-slate-300 hover:bg-slate-800 transition flex items-center gap-1 text-xs font-bold cursor-pointer"
            title="Import Image (Upload image layer, STEM diagrams, URL)"
          >
            <ImageIcon className="w-4 h-4 text-sky-400" />
            <span className="hidden xl:inline">Image</span>
          </button>
        </div>

        {/* RIGHT SECTION: Color, Theme, Undo/Redo, Delete, Clear, Fullscreen */}
        <div className="flex items-center gap-1.5">
          {/* Color & Stroke Popover Button */}
          <button
            ref={colorButtonRef}
            onClick={() => togglePopup('COLOR')}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            title="Color Palette & Stroke Width"
          >
            <div
              className="w-4 h-4 rounded-full border border-slate-500 shadow-sm"
              style={{ backgroundColor: color }}
            />
            <span className="font-mono text-[11px] text-slate-300 hidden sm:inline">
              {strokeWidth}px
            </span>
          </button>

          <AnchoredPopover
            isOpen={openPopup === 'COLOR'}
            onClose={closePopup}
            anchorRef={colorButtonRef}
            preferredAlign="right"
            minWidth={220}
            className="p-3 space-y-2.5"
          >
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider pb-1 border-b border-slate-800">
              Color & Stroke Size
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    onChangeColor(c);
                    closePopup();
                  }}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full border transition cursor-pointer ${
                    color === c
                      ? 'border-white ring-2 ring-indigo-500 scale-110'
                      : 'border-slate-700 hover:scale-105'
                  }`}
                />
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-300 font-semibold">Custom Color:</span>
              <input
                type="color"
                value={color}
                onChange={(e) => onChangeColor(e.target.value)}
                className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
              />
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Pen / Stroke Width</span>
                <span className="font-mono font-bold text-indigo-400">{strokeWidth}px</span>
              </div>

              {/* Quick Pen Size Presets */}
              <div className="grid grid-cols-5 gap-1">
                {[
                  { label: '1px', val: 1, title: 'Ultra Fine' },
                  { label: '1.5px', val: 1.5, title: 'Fine (Default)' },
                  { label: '2.5px', val: 2.5, title: 'Normal' },
                  { label: '4px', val: 4, title: 'Medium' },
                  { label: '8px', val: 8, title: 'Bold' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => onChangeStrokeWidth(preset.val)}
                    title={preset.title}
                    className={`py-1 text-[10px] font-mono font-bold rounded-lg border transition cursor-pointer ${
                      strokeWidth === preset.val
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-xs'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-750'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <input
                type="range"
                min="0.5"
                max="16"
                step="0.5"
                value={strokeWidth}
                onChange={(e) => onChangeStrokeWidth(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
          </AnchoredPopover>

          {/* Board Theme Selector Popover */}
          <button
            ref={themeButtonRef}
            onClick={() => togglePopup('THEMES')}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition flex items-center gap-1 text-xs font-semibold cursor-pointer"
            title="Classroom Board Background"
          >
            <Palette className="w-4 h-4 text-emerald-400" />
            <span className="hidden lg:inline">Theme</span>
          </button>

          <AnchoredPopover
            isOpen={openPopup === 'THEMES'}
            onClose={closePopup}
            anchorRef={themeButtonRef}
            preferredAlign="right"
            minWidth={220}
            className="p-2 space-y-1"
          >
            <div className="px-2 py-1 text-[11px] font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 mb-1">
              Classroom Board Background
            </div>
            {THEME_OPTIONS.map((th) => (
              <button
                key={th.id}
                onClick={() => {
                  onChangeBoardTheme(th.id);
                  closePopup();
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center justify-between cursor-pointer ${
                  boardTheme === th.id
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded-full border border-slate-600 ${th.bgClass}`} />
                  <span>{th.name}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal">{th.desc}</span>
              </button>
            ))}
          </AnchoredPopover>

          {/* Undo / Redo */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          {/* Delete Selected Object */}
          <button
            onClick={onDeleteSelected}
            disabled={!hasSelectedElement}
            className={`p-2 rounded-xl transition flex items-center gap-1 text-xs font-bold ${
              hasSelectedElement
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md ring-1 ring-rose-400 cursor-pointer'
                : 'bg-slate-800 text-slate-500 opacity-40 cursor-not-allowed'
            }`}
            title={
              hasSelectedElement
                ? 'Delete Selected Object (Del / Backspace)'
                : 'Delete (Select an object first)'
            }
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden xl:inline">Delete</span>
          </button>

          {/* Clear Entire Slide Canvas */}
          <button
            onClick={onClearPage}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition cursor-pointer"
            title="Clear Slide (Wipe All Drawings)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Export PNG */}
          <button
            onClick={onExportPNG}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition hidden sm:flex items-center gap-1 text-xs font-bold cursor-pointer"
            title="Export Slide as PNG Image"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span className="hidden xl:inline">PNG</span>
          </button>

          {/* Export PDF */}
          <button
            onClick={onExportPDF}
            className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-1 shadow-md cursor-pointer"
            title="Export Full Multi-Page Lecture PDF"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export PDF</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={onToggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Presentation Mode'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
