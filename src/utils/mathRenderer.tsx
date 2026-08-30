import React, { useMemo } from 'react';
import katex from 'katex';
import DOMPurify from 'dompurify';

interface MathRendererProps {
  content: string;
  className?: string;
  inline?: boolean;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '', inline = false }) => {
  if (!content) {
    return <span className={className}></span>;
  }

  // Parse string into chunks of text, inline math ($...$), block math ($$...$$), and svg
  const parseSegments = (text: string) => {
    const segments: { type: 'text' | 'inline-math' | 'block-math' | 'svg'; content: string }[] = [];
    let currentIdx = 0;

    // Match either $$...$$ (block), $...$ (inline), or <svg>...</svg> (svg)
    const regex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$|<svg[\s\S]*?<\/svg>)/gi;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      const matchedString = match[0];

      // Add preceding plain text
      if (matchIndex > currentIdx) {
        segments.push({
          type: 'text',
          content: text.substring(currentIdx, matchIndex),
        });
      }

      if (matchedString.startsWith('$$') && matchedString.endsWith('$$')) {
        segments.push({
          type: 'block-math',
          content: matchedString.slice(2, -2).trim(),
        });
      } else if (matchedString.startsWith('$') && matchedString.endsWith('$')) {
        segments.push({
          type: 'inline-math',
          content: matchedString.slice(1, -1).trim(),
        });
      } else if (matchedString.toLowerCase().startsWith('<svg')) {
        segments.push({
          type: 'svg',
          content: matchedString,
        });
      }

      currentIdx = matchIndex + matchedString.length;
    }

    // Add remaining plain text
    if (currentIdx < text.length) {
      segments.push({
        type: 'text',
        content: text.substring(currentIdx),
      });
    }

    return segments;
  };

  const renderKatexHtml = (math: string, displayMode: boolean): string => {
    try {
      return katex.renderToString(math, {
        displayMode,
        throwOnError: false,
        output: 'htmlAndMathml',
      });
    } catch (e) {
      return `<span class="text-rose-500 font-mono text-xs">[Formula Error: ${math}]</span>`;
    }
  };

  // We use useMemo to avoid re-parsing on every single render if content hasn't changed.
  const segments = useMemo(() => parseSegments(content), [content]);

  return (
    <span className={`inline-block leading-relaxed break-words w-full ${className}`}>
      {segments.map((segment, idx) => {
        if (segment.type === 'text') {
          // Handle line breaks
          const lines = segment.content.split('\n');
          return (
            <React.Fragment key={idx}>
              {lines.map((line, lineIdx) => (
                <React.Fragment key={lineIdx}>
                  {line}
                  {lineIdx < lines.length - 1 && <br />}
                </React.Fragment>
              ))}
            </React.Fragment>
          );
        }
        
        if (segment.type === 'svg') {
          // Sanitize the SVG strictly to prevent XSS
          const sanitizedSvg = DOMPurify.sanitize(segment.content, {
            USE_PROFILES: { svg: true },
          });
          
          return (
            <span
              key={idx}
              className="inline-block my-2 max-w-full"
              dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
            />
          );
        }

        const isBlock = segment.type === 'block-math';
        const html = renderKatexHtml(segment.content, isBlock);

        return (
          <span
            key={idx}
            className={isBlock ? 'my-2 block overflow-x-auto text-center py-1' : 'inline-block px-0.5 align-middle'}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
};
