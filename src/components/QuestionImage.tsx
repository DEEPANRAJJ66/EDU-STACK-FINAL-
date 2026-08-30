import React, { useState } from 'react';

interface QuestionImageProps {
  /** questionImageUrl (or optionImageUrl) — a regular https:// URL, a data: URI, or empty/undefined */
  src?: string | null;
  alt?: string;
  className?: string;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
}

/**
 * Renders a question/option diagram from `questionImageUrl`.
 * - Empty/undefined src -> renders nothing (no broken-image icon).
 * - Works for both plain URLs and base64 data URIs, since <img src> handles both natively.
 * - Responsive by default (max-width: 100%, height: auto) so it never overflows on mobile.
 * - If the image fails to load, swaps to a small "Diagram unavailable" placeholder
 *   instead of the browser's broken-image icon, and never throws/crashes the page.
 */
export const QuestionImage: React.FC<QuestionImageProps> = ({ src, alt = 'Question diagram', className = '', referrerPolicy }) => {
  const [failed, setFailed] = useState(false);

  if (!src) return null;

  if (failed) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 text-[11px] text-slate-400 italic border border-dashed border-slate-300 rounded-lg px-3 py-2 bg-slate-50 ${className}`}
      >
        Diagram unavailable
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      referrerPolicy={referrerPolicy}
      style={{ maxWidth: '100%', height: 'auto' }}
      className={`block rounded-lg ${className}`}
    />
  );
};