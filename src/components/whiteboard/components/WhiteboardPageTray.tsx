import React, { useState } from 'react';
import { WhiteboardPage } from '../types';
import {
  Plus,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';

interface WhiteboardPageTrayProps {
  pages: WhiteboardPage[];
  activePageIndex: number;
  onSelectPage: (index: number) => void;
  onAddPage: () => void;
  onDuplicatePage: (index: number) => void;
  onDeletePage: (index: number) => void;
}

export const WhiteboardPageTray: React.FC<WhiteboardPageTrayProps> = ({
  pages,
  activePageIndex,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const activePage = pages[activePageIndex] || pages[0];
  const activeElementsCount = activePage?.elements?.length || 0;
  const hasActiveBackground = Boolean(activePage?.backgroundImage);

  // If collapsed: Show compact three-icon control + active slide thumbnail/indicator + expand toggle
  if (isCollapsed) {
    return (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-2xl shadow-2xl px-2.5 py-1.5 flex items-center gap-1.5 sm:gap-2 text-white select-none transition-all duration-200">
        {/* 1. Previous Slide Button */}
        <button
          onClick={() => onSelectPage(Math.max(0, activePageIndex - 1))}
          disabled={activePageIndex === 0}
          className="p-2 rounded-xl bg-slate-800/90 hover:bg-indigo-600 disabled:opacity-30 disabled:hover:bg-slate-800 disabled:cursor-not-allowed transition text-slate-300 hover:text-white cursor-pointer"
          title="Previous Slide"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* 2. Active Slide Small Thumbnail & Indicator (Visible when minimized) */}
        <div
          onClick={() => setIsCollapsed(false)}
          className="group relative flex items-center gap-2 px-2 py-1 rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-indigo-500/60 hover:border-indigo-400 cursor-pointer transition shadow-inner"
          title={`Active: Slide ${activePageIndex + 1} of ${pages.length} (Click to expand slide bar)`}
        >
          {/* Mini Active Slide Thumbnail */}
          <div className="w-9 h-6 sm:w-10 sm:h-7 rounded-md bg-indigo-950/70 border border-indigo-500/70 flex flex-col justify-between p-0.5 overflow-hidden shadow-inner shrink-0 relative">
            <div className="flex items-center justify-between text-[8px] font-bold">
              <span className="text-indigo-300 font-mono">#{activePageIndex + 1}</span>
              {hasActiveBackground && (
                <span title="PDF Background">
                  <FileText className="w-2 h-2 text-rose-400" />
                </span>
              )}
            </div>
            <div className="text-[7.5px] text-slate-300 font-medium truncate leading-none">
              {activeElementsCount > 0 ? `${activeElementsCount} obj` : 'Blank'}
            </div>
          </div>

          {/* Text Indicator */}
          <div className="flex flex-col text-left pr-0.5">
            <div className="text-[11px] font-bold text-slate-100 flex items-center gap-1 leading-tight whitespace-nowrap">
              <span>Slide</span>
              <span className="text-indigo-400 font-mono text-xs">{activePageIndex + 1}</span>
              <span className="text-slate-400 text-[10px] font-normal">/ {pages.length}</span>
            </div>
            <div className="text-[9px] text-slate-400 truncate max-w-[80px] sm:max-w-[100px] leading-tight">
              {activePage?.title || `Slide ${activePageIndex + 1}`}
            </div>
          </div>
        </div>

        {/* 3. Next Slide Button */}
        <button
          onClick={() => onSelectPage(Math.min(pages.length - 1, activePageIndex + 1))}
          disabled={activePageIndex === pages.length - 1}
          className="p-2 rounded-xl bg-slate-800/90 hover:bg-indigo-600 disabled:opacity-30 disabled:hover:bg-slate-800 disabled:cursor-not-allowed transition text-slate-300 hover:text-white cursor-pointer"
          title="Next Slide"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* 4. Add Slide Button */}
        <button
          onClick={onAddPage}
          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md shadow-indigo-600/40 cursor-pointer"
          title="Add Slide Next to Current (+)"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Subtle separator */}
        <div className="h-4 w-px bg-slate-700 mx-0.5" />

        {/* 5. Expand Slide Panel Toggle */}
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-indigo-300 transition cursor-pointer"
          title="Expand Slide Panel"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Expanded full slide tray
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl px-3 py-2 flex items-center gap-3 text-white max-w-[95vw] overflow-x-auto select-none transition-all duration-200">
      {/* Quick Paging Arrows & Indicator */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onSelectPage(Math.max(0, activePageIndex - 1))}
          disabled={activePageIndex === 0}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition text-slate-300 cursor-pointer"
          title="Previous Slide"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="text-xs font-bold text-slate-300 px-2 select-none whitespace-nowrap">
          Slide <span className="text-indigo-400 font-mono text-sm">{activePageIndex + 1}</span> / {pages.length}
        </div>

        <button
          onClick={() => onSelectPage(Math.min(pages.length - 1, activePageIndex + 1))}
          disabled={activePageIndex === pages.length - 1}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition text-slate-300 cursor-pointer"
          title="Next Slide"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="h-6 w-px bg-slate-700/80 mx-1 hidden sm:block" />

      {/* Slide Thumbnails List */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-[46vw]">
        {pages.map((page, idx) => {
          const isActive = idx === activePageIndex;
          const hasBackground = Boolean(page.backgroundImage);
          const elementCount = page.elements.length;

          return (
            <div
              key={page.id}
              onClick={() => onSelectPage(idx)}
              className={`group relative shrink-0 w-20 h-12 rounded-lg border-2 transition-all cursor-pointer overflow-hidden flex flex-col justify-between p-1 select-none ${
                isActive
                  ? 'border-indigo-500 bg-indigo-950/40 ring-2 ring-indigo-500/50 shadow-md scale-105'
                  : 'border-slate-700 bg-slate-800 hover:border-slate-500 hover:bg-slate-750'
              }`}
            >
              {/* Thumbnail Mini Preview / Badge */}
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className={isActive ? 'text-indigo-300 font-mono' : 'text-slate-400 font-mono'}>
                  #{idx + 1}
                </span>
                {hasBackground && (
                  <span title="PDF Background">
                    <FileText className="w-2.5 h-2.5 text-rose-400" />
                  </span>
                )}
              </div>

              <div className="text-[9px] text-slate-400 font-medium truncate">
                {elementCount > 0 ? `${elementCount} obj` : 'Blank'}
              </div>

              {/* Hover actions: Duplicate & Delete */}
              {pages.length > 1 && (
                <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicatePage(idx);
                    }}
                    className="p-1 hover:bg-indigo-600 text-slate-300 hover:text-white rounded"
                    title="Duplicate Slide"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePage(idx);
                    }}
                    className="p-1 hover:bg-rose-600 text-slate-300 hover:text-white rounded"
                    title="Delete Slide"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add New Slide Button */}
      <button
        onClick={onAddPage}
        className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 whitespace-nowrap cursor-pointer"
        title="Add New Blank Slide (+)"
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">Add Slide</span>
      </button>

      <div className="h-6 w-px bg-slate-700/80 mx-1 hidden sm:block" />

      {/* Collapse Panel Button */}
      <button
        onClick={() => setIsCollapsed(true)}
        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
        title="Collapse Slide Panel"
      >
        <ChevronDown className="w-4 h-4" />
      </button>
    </div>
  );
};
