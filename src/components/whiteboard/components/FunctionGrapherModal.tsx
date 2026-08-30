import React, { useState } from 'react';
import { X, TrendingUp, Check } from 'lucide-react';

interface FunctionGrapherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertGraph: (data: {
    formula: string;
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    color: string;
  }) => void;
}

const COMMON_FUNCTIONS = [
  { label: 'y = sin(x)', formula: 'sin(x)' },
  { label: 'y = cos(x)', formula: 'cos(x)' },
  { label: 'y = tan(x)', formula: 'tan(x)' },
  { label: 'y = x²', formula: 'x^2' },
  { label: 'y = x³', formula: 'x^3' },
  { label: 'y = √x', formula: 'sqrt(x)' },
  { label: 'y = e^x', formula: 'exp(x)' },
  { label: 'y = ln(x)', formula: 'ln(x)' },
];

export const FunctionGrapherModal: React.FC<FunctionGrapherModalProps> = ({
  isOpen,
  onClose,
  onInsertGraph,
}) => {
  const [formula, setFormula] = useState('sin(x)');
  const [xMin, setXMin] = useState(-10);
  const [xMax, setXMax] = useState(10);
  const [yMin, setYMin] = useState(-5);
  const [yMax, setYMax] = useState(5);
  const [color, setColor] = useState('#38bdf8');

  if (!isOpen) return null;

  const handleInsert = () => {
    onInsertGraph({
      formula: formula.trim(),
      xMin,
      xMax,
      yMin,
      yMax,
      color,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Mathematical Function Grapher</h3>
              <p className="text-xs text-slate-400">Plot 2D function curves on the interactive whiteboard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Function Formula f(x)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-400">y =</span>
              <input
                type="text"
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                placeholder="e.g. sin(x), x^2, exp(x)"
                className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Quick function presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Common JEE Functions
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_FUNCTIONS.map((cf) => (
                <button
                  key={cf.formula}
                  onClick={() => setFormula(cf.formula)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-sky-600 hover:text-white border border-slate-700 text-xs font-mono text-sky-300 transition"
                >
                  {cf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Domain & Range Range Controls */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">X Min / Max</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={xMin}
                  onChange={(e) => setXMin(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono"
                />
                <span className="text-slate-500">to</span>
                <input
                  type="number"
                  value={xMax}
                  onChange={(e) => setXMax(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Y Min / Max</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={yMin}
                  onChange={(e) => setYMin(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono"
                />
                <span className="text-slate-500">to</span>
                <input
                  type="number"
                  value={yMax}
                  onChange={(e) => setYMax(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Color */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <span className="text-xs font-semibold text-slate-400">Curve Stroke Color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
              />
              <span className="text-xs font-mono text-slate-400">{color}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-850">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleInsert}
            className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-lg shadow-sky-600/30 transition flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Plot Graph</span>
          </button>
        </div>
      </div>
    </div>
  );
};
