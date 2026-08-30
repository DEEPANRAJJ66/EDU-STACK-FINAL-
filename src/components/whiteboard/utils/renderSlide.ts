import { WhiteboardPage, BoardTheme, WhiteboardElement, FreehandStroke, Shape2DElement, Shape3DElement, MathElement, PhysicsElement, TextElement, ImageElement } from '../types';
import { draw2DShape } from '../tools/2DShapes';
import { draw3DShape } from '../tools/3DObjects';
import { drawMathObject } from '../tools/MathTools';
import { drawPhysicsObject } from '../tools/PhysicsTools';
import { getCachedImage } from './imageUtils';

export function drawThemeBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  theme: BoardTheme
) {
  ctx.save();

  if (theme === 'WHITEBOARD') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  } else if (theme === 'BLACKBOARD') {
    ctx.fillStyle = '#064e3b'; // Deep chalkboard green
    ctx.fillRect(0, 0, w, h);

    // Subtle chalk dust overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    for (let i = 0; i < 20; i++) {
      ctx.fillRect(0, (h / 20) * i, w, 2);
    }
  } else if (theme === 'SLATE_DARK') {
    ctx.fillStyle = '#0f172a'; // Slate 900
    ctx.fillRect(0, 0, w, h);
  } else if (theme === 'MATH_GRID') {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)'; // Cyan grid
    ctx.lineWidth = 1;
    const step = 32;

    for (let x = 0; x <= w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  } else if (theme === 'DOT_GRID') {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(129, 140, 248, 0.35)'; // Dot grid
    const step = 28;
    for (let x = step / 2; x <= w; x += step) {
      for (let y = step / 2; y <= h; y += step) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (theme === 'ISOMETRIC') {
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.12)'; // Isometric grid
    ctx.lineWidth = 1;
    const step = 36;

    for (let x = -w; x <= w * 2; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + h * 0.577, h);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x - h * 0.577, h);
      ctx.stroke();
    }
  } else if (theme === 'RULED_PAPER') {
    ctx.fillStyle = '#fefce8';
    ctx.fillRect(0, 0, w, h);

    // Left margin line in red
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(120, 0);
    ctx.lineTo(120, h);
    ctx.stroke();

    // Horizontal ruled lines
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 1;
    for (let y = 60; y <= h; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  ctx.restore();
}

export function renderElement(
  ctx: CanvasRenderingContext2D,
  element: WhiteboardElement,
  onImageLoaded?: () => void
) {
  switch (element.type) {
    case 'STROKE': {
      const stroke = element as FreehandStroke;
      const pts = stroke.points;
      if (!pts || pts.length === 0) return;

      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = stroke.strokeWidth;
      ctx.globalAlpha = stroke.opacity || 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (pts.length === 1) {
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, Math.max(0.5, stroke.strokeWidth / 2), 0, Math.PI * 2);
        ctx.fill();
      } else if (pts.length === 2) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          const xc = (pts[i].x + pts[i - 1].x) / 2;
          const yc = (pts[i].y + pts[i - 1].y) / 2;
          ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, xc, yc);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    case 'SHAPE_2D': {
      draw2DShape(ctx, element as Shape2DElement);
      break;
    }

    case 'SHAPE_3D': {
      draw3DShape(ctx, element as Shape3DElement);
      break;
    }

    case 'MATH_OBJECT': {
      drawMathObject(ctx, element as MathElement);
      break;
    }

    case 'PHYSICS_OBJECT': {
      drawPhysicsObject(ctx, element as PhysicsElement);
      break;
    }

    case 'TEXT': {
      const textEl = element as TextElement;
      ctx.save();
      ctx.font = `${textEl.bold ? 'bold ' : ''}${textEl.fontSize || 24}px ${textEl.fontFamily || 'sans-serif'}`;
      ctx.fillStyle = textEl.color || '#ffffff';
      ctx.fillText(textEl.text, textEl.x, textEl.y);
      ctx.restore();
      break;
    }

    case 'IMAGE': {
      const imgEl = element as ImageElement;
      const img = getCachedImage(imgEl.src, onImageLoaded);

      ctx.save();
      if (imgEl.opacity !== undefined && imgEl.opacity < 1) {
        ctx.globalAlpha = Math.max(0, Math.min(1, imgEl.opacity));
      }

      const cx = imgEl.x + imgEl.width / 2;
      const cy = imgEl.y + imgEl.height / 2;

      ctx.translate(cx, cy);

      if (imgEl.rotation) {
        ctx.rotate((imgEl.rotation * Math.PI) / 180);
      }

      if (imgEl.flipHorizontal || imgEl.flipVertical) {
        ctx.scale(imgEl.flipHorizontal ? -1 : 1, imgEl.flipVertical ? -1 : 1);
      }

      if (img && img.complete && img.naturalWidth > 0) {
        try {
          ctx.drawImage(img, -imgEl.width / 2, -imgEl.height / 2, imgEl.width, imgEl.height);
        } catch {
          // Fallback if image render throws
        }
      } else {
        // High-contrast clean placeholder while image is asynchronously loading
        ctx.strokeStyle = '#6366f1';
        ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(-imgEl.width / 2, -imgEl.height / 2, imgEl.width, imgEl.height);
        ctx.fillRect(-imgEl.width / 2, -imgEl.height / 2, imgEl.width, imgEl.height);

        ctx.fillStyle = '#818cf8';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(imgEl.fileName || 'Loading Image Layer...', 0, 0);
      }

      ctx.restore();
      break;
    }
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 30)}...`));
    img.src = src;
  });
}

/**
 * Renders ONLY the given slide's background and elements onto a dedicated 1920x1080 canvas.
 * Waits for any background images or image elements to load completely before resolving.
 */
export async function renderSlideToCanvas(
  page: WhiteboardPage,
  defaultTheme: BoardTheme = 'SLATE_DARK',
  width = 1920,
  height = 1080
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to acquire 2D canvas context');
  }

  // 1. Clear canvas & render theme background
  ctx.clearRect(0, 0, width, height);
  const theme = page.theme || defaultTheme;
  drawThemeBackground(ctx, width, height, theme);

  // 2. Render Slide Background (e.g. PDF page background)
  if (page.backgroundImage) {
    try {
      const bgImg = await loadImage(page.backgroundImage);
      ctx.drawImage(bgImg, 0, 0, width, height);
    } catch (err) {
      console.warn('Could not load slide background image for rendering', err);
    }
  }

  // 3. Preload all image elements in this slide to ensure complete rendering
  const imageElements = (page.elements || []).filter((el) => el.type === 'IMAGE') as ImageElement[];
  if (imageElements.length > 0) {
    await Promise.allSettled(imageElements.map((imgEl) => loadImage(imgEl.src)));
  }

  // 4. Render ONLY this slide's elements in sequence
  for (const element of page.elements || []) {
    renderElement(ctx, element);
  }

  return canvas;
}
