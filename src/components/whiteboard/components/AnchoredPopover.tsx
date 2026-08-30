import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface AnchoredPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  className?: string;
  preferredAlign?: 'left' | 'right' | 'center';
  minWidth?: number;
  maxWidth?: number;
}

export const AnchoredPopover: React.FC<AnchoredPopoverProps> = ({
  isOpen,
  onClose,
  anchorRef,
  children,
  className = '',
  preferredAlign = 'left',
  minWidth,
  maxWidth,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    top: -9999,
    left: -9999,
    opacity: 0,
    pointerEvents: 'none',
  });

  const updatePosition = () => {
    if (!isOpen || !anchorRef.current || !popoverRef.current) return;

    const anchorRect = anchorRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();

    const popoverWidth = popoverRect.width || minWidth || 280;
    const popoverHeight = popoverRect.height || 300;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 10;

    // 1. Calculate Vertical Position (top vs bottom)
    const spaceBelow = viewportHeight - anchorRect.bottom - margin;
    const spaceAbove = anchorRect.top - margin;
    let top: number;
    let maxHeight = viewportHeight - margin * 2;

    if (spaceBelow < Math.min(popoverHeight, 220) && spaceAbove > spaceBelow) {
      // Open upwards above anchor
      top = Math.max(margin, anchorRect.top - popoverHeight - 6);
      maxHeight = Math.max(160, spaceAbove - 12);
    } else {
      // Open downwards below anchor
      top = anchorRect.bottom + 6;
      maxHeight = Math.max(160, spaceBelow - 12);
    }

    // 2. Calculate Horizontal Position (left vs right vs center)
    let left: number;
    if (preferredAlign === 'right') {
      left = anchorRect.right - popoverWidth;
    } else if (preferredAlign === 'center') {
      left = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2;
    } else {
      left = anchorRect.left;
    }

    // Clamp horizontally within viewport
    if (left + popoverWidth > viewportWidth - margin) {
      left = viewportWidth - popoverWidth - margin;
    }
    if (left < margin) {
      left = margin;
    }

    setStyle({
      position: 'fixed',
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      maxHeight: `${Math.round(maxHeight)}px`,
      width: minWidth ? `${minWidth}px` : undefined,
      maxWidth: maxWidth ? `${maxWidth}px` : `calc(100vw - ${margin * 2}px)`,
      zIndex: 99999,
      opacity: 1,
      pointerEvents: 'auto',
    });
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
      const raf = requestAnimationFrame(updatePosition);
      return () => cancelAnimationFrame(raf);
    } else {
      setStyle((prev) => ({ ...prev, opacity: 0, pointerEvents: 'none' }));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });
    document.addEventListener('fullscreenchange', handleScrollOrResize);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
      document.removeEventListener('fullscreenchange', handleScrollOrResize);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen && style.opacity === 0) return null;

  // Crucial: In fullscreen mode, document.fullscreenElement is the fullscreen container.
  // Portaling to document.fullscreenElement ensures the popup is rendered inside the fullscreen display context.
  const portalTarget =
    (typeof document !== 'undefined' && (document.fullscreenElement as HTMLElement)) ||
    (typeof document !== 'undefined' ? document.body : null);

  if (!portalTarget) return null;

  return createPortal(
    <div
      ref={popoverRef}
      style={style}
      className={`bg-slate-900/98 backdrop-blur-xl border border-slate-700/90 rounded-2xl shadow-2xl overflow-y-auto transition-opacity duration-150 text-white ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    portalTarget
  );
};
