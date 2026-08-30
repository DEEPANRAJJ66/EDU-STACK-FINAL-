import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';

interface SafeSvgRendererProps {
  svgContent: string;
  className?: string;
}

export const SafeSvgRenderer: React.FC<SafeSvgRendererProps> = ({ svgContent, className = '' }) => {
  const sanitizedSvg = useMemo(() => {
    return DOMPurify.sanitize(svgContent, {
      USE_PROFILES: { svg: true },
    });
  }, [svgContent]);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
    />
  );
};
