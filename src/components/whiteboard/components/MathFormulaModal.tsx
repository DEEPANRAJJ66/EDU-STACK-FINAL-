import React, { useState, useEffect, useRef } from 'react';
import katex from 'katex';
import { X, Sparkles, Plus, Check } from 'lucide-react';

interface MathFormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertFormula: (latex: string, fontSize: number, color: string) => void;
  initialFormula?: string;
}

const COMMON_SYMBOLS = [
  { label: 'α', latex: '\\alpha' },
  { label: 'β', latex: '\\beta' },
  { label: 'θ', latex: '\\theta' },
  { label: 'λ', latex: '\\lambda' },
  { label: 'π', latex: '\\pi' },
  { label: 'Δ', latex: '\\Delta' },
  { label: 'Σ', latex: '\\sum_{i=1}^{n}' },
  { label: '∫', latex: '\\int_{a}^{b} f(x) dx' },
  { label: '√x', latex: '\\sqrt{x}' },
  { label: 'a/b', latex: '\\frac{a}{b}' },
  { label: 'x²', latex: 'x^2' },
  { label: 'xₙ', latex: 'x_n' },
  { label: '±', latex: '\\pm' },
  { label: '≤', latex: '\\le' },
  { label: '≥', latex: '\\ge' },
  { label: '≠', latex: '\\ne' },
  { label: '∞', latex: '\\infty' },
  { label: '→', latex: '\\to' },
  { label: 'v⃗', latex: '\\vec{v}' },
  { label: 'sin θ', latex: '\\sin\\theta' },
  { label: 'cos θ', latex: '\\cos\\theta' },
  { label: 'tan θ', latex: '\\tan\\theta' },
  { label: 'lim', latex: '\\lim_{x \\to 0}' },
  { label: 'd/dx', latex: '\\frac{d}{dx}' },
];

const PRESETS = [
  { name: 'Quadratic Formula', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
  { name: 'Euler’s Identity', latex: 'e^{i\\pi} + 1 = 0' },
  { name: 'Schrödinger Eq', latex: 'i\\hbar \\frac{\\partial}{\\partial t}\\Psi = \\hat{H}\\Psi' },
  { name: 'Newton 2nd Law', latex: '\\vec{F}_{net} = m \\frac{d\\vec{v}}{dt}' },
  { name: 'Standard Integral', latex: '\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}' },
];

export const MathFormulaModal: React.FC<MathFormulaModalProps> = ({
  isOpen,
  onClose,
  onInsertFormula,
  initialFormula = 'E = mc^2',
}) => {
  const [formula, setFormula] = useState(initialFormula);
  const [fontSize, setFontSize] = useState(24);
  const [color, setColor] = useState('#6366f1');
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (previewRef.current) {
      try {
        katex.render(formula || '\\text{Enter LaTeX formula}', previewRef.current, {
          throwOnError: true,
          displayMode: true,
        });
        setError(null);
      } catch (err: any) {
        setError(err.message || 'KaTeX parsing error');
      }
    }
  }, [formula]);

  if (!isOpen) return null;

  const insertSymbol = (symLatex: string) => {
    setFormula(prev => prev + ' ' + symLatex);
  };

  const handleInsert = () => {
    if (!formula.trim()) return;
    onInsertFormula(formula.trim(), fontSize, color);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-serif text-lg font-bold">
              Σ
            </div>
            <div>
              <h3 className="text-base font-bold text-white">LaTeX Mathematical Equation Tool</h3>
              <p className="text-xs text-slate-400">Insert high-definition mathematical formulas onto the whiteboard</p>
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
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-slate-200">
          {/* Live Rendered KaTeX Box */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Formula Live Preview
            </label>
            <div className="min-h-[90px] p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-x-auto shadow-inner">
              <div ref={previewRef} className="text-white text-xl" />
            </div>
            {error && (
              <p className="text-rose-400 text-xs mt-1 font-mono">
                Syntax hint: {error}
              </p>
            )}
          </div>

          {/* LaTeX Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              LaTeX Code
            </label>
            <textarea
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              rows={3}
              placeholder="e.g. \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Quick Symbol Insert Chips */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Quick STEM Symbols
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-slate-950/60 rounded-xl border border-slate-800">
              {COMMON_SYMBOLS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => insertSymbol(s.latex)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-mono font-bold text-slate-300 transition"
                  title={s.latex}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Standard Physics & Math Presets
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setFormula(p.latex)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-indigo-300 transition"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Size & Color options */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Font Size: {fontSize}px
              </label>
              <input
                type="range"
                min="16"
                max="48"
                step="2"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Color
              </label>
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
            disabled={!formula.trim()}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>Insert on Whiteboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
