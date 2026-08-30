import React, { useState } from 'react';
import { MathRenderer } from '../utils/mathRenderer';
import { Sigma, Eye, ChevronDown } from 'lucide-react';

interface MathToolbarProps {
  onInsert: (latexSnippet: string) => void;
  previewText?: string;
}

const MATH_SNIPPETS = [
  { label: 'Fraction', latex: '$\\frac{a}{b}$', desc: 'Fraction' },
  { label: 'Sqrt', latex: '$\\sqrt{x}$', desc: 'Square root' },
  { label: 'Power', latex: '$x^{2}$', desc: 'Superscript' },
  { label: 'Sub', latex: '$x_{1}$', desc: 'Subscript' },
  { label: 'Integral', latex: '$\\int_{0}^{t} f(x) \\, dx$', desc: 'Definite integral' },
  { label: 'Sum', latex: '$\\sum_{i=1}^{n} x_i$', desc: 'Summation' },
  { label: 'Vector', latex: '$\\vec{F}$', desc: 'Vector notation' },
  { label: 'Limit', latex: '$\\lim_{x \\to 0} \\frac{f(x)}{g(x)}$', desc: 'Limit expression' },
  { label: 'Delta Δ', latex: '$\\Delta G$', desc: 'Delta change' },
  { label: 'Theta θ', latex: '$\\theta$', desc: 'Angle' },
  { label: 'Pi π', latex: '$\\pi$', desc: 'Pi constant' },
  { label: 'Omega ω', latex: '$\\omega$', desc: 'Angular speed' },
  { label: 'Lambda λ', latex: '$\\lambda$', desc: 'Wavelength' },
  { label: 'Alpha α', latex: '$\\alpha$', desc: 'Alpha' },
  { label: 'Beta β', latex: '$\\beta$', desc: 'Beta' },
  { label: 'Matrix', latex: '$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$', desc: '2x2 Matrix' },
  { label: 'Chemistry Eq', latex: '$\\text{H}_2\\text{O} + \\text{CO}_2 \\rightarrow \\text{H}_2\\text{CO}_3$', desc: 'Reaction' },
];

export const MathToolbar: React.FC<MathToolbarProps> = ({ onInsert, previewText = '' }) => {
  const [showAll, setShowAll] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const displayedSnippets = showAll ? MATH_SNIPPETS : MATH_SNIPPETS.slice(0, 8);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
          <Sigma className="w-3.5 h-3.5 text-indigo-600" />
          <span>KaTeX Math & Formula Inserter</span>
        </div>

        <div className="flex items-center gap-2">
          {previewText && (
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition ${
                showPreview
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Eye className="w-3 h-3" />
              {showPreview ? 'Hide Math Preview' : 'Live Math Preview'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-0.5"
          >
            {showAll ? 'Less' : 'More Symbols'}
            <ChevronDown className={`w-3 h-3 transition-transform ${showAll ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Snippet Badges */}
      <div className="flex flex-wrap gap-1.5">
        {displayedSnippets.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onInsert(item.latex)}
            className="px-2 py-1 bg-white hover:bg-indigo-50 hover:border-indigo-300 border border-slate-200 rounded text-slate-700 hover:text-indigo-700 font-mono transition text-[11px] shadow-2xs"
            title={item.desc}
          >
            <MathRenderer content={item.latex} />
          </button>
        ))}
      </div>

      {/* Live Preview Box */}
      {showPreview && previewText && (
        <div className="mt-2 p-3 bg-white border border-indigo-200 rounded-lg shadow-inner">
          <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
            Rendered Output:
          </div>
          <div className="text-slate-800 text-sm font-medium leading-relaxed">
            <MathRenderer content={previewText} />
          </div>
        </div>
      )}
    </div>
  );
};
