import { WhiteboardElement, FreehandStroke, Point } from '../types';

/**
 * Calculates squared distance from point (px, py) to line segment (x1, y1)-(x2, y2).
 */
export function distToSegmentSquared(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) {
    const dpx = px - x1;
    const dpy = py - y1;
    return dpx * dpx + dpy * dpy;
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  const qx = px - projX;
  const qy = py - projY;
  return qx * qx + qy * qy;
}

/**
 * Partially erases a freehand stroke by removing points/segments that intersect
 * the capsule formed by sweeping the eraser circle of given radius from p1 to p2.
 * 
 * If erased in the middle, splits the stroke into multiple untouched sub-strokes.
 * If completely erased, returns an empty array.
 * If untouched, returns [stroke].
 */
export function eraseStroke(
  stroke: FreehandStroke,
  p1: Point,
  p2: Point,
  eraserRadius: number
): FreehandStroke[] {
  const pts = stroke.points;
  if (!pts || pts.length === 0) return [];

  const w = stroke.strokeWidth || 2;
  const effectiveRadius = eraserRadius + w / 2;
  const effRadiusSq = effectiveRadius * effectiveRadius;

  // 1. Fast AABB bounding box rejection check
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const eraseMinX = Math.min(p1.x, p2.x) - effectiveRadius;
  const eraseMaxX = Math.max(p1.x, p2.x) + effectiveRadius;
  const eraseMinY = Math.min(p1.y, p2.y) - effectiveRadius;
  const eraseMaxY = Math.max(p1.y, p2.y) + effectiveRadius;

  // If bounding boxes don't intersect, stroke is untouched
  if (
    maxX < eraseMinX ||
    minX > eraseMaxX ||
    maxY < eraseMinY ||
    minY > eraseMaxY
  ) {
    return [stroke];
  }

  // 2. Resample / densify stroke polyline so points are smoothly tested and sliced
  interface DensePoint {
    x: number;
    y: number;
    pressure?: number;
    erased: boolean;
  }

  const dense: DensePoint[] = [];
  const maxStep = Math.max(3, Math.min(8, eraserRadius / 3));

  for (let i = 0; i < pts.length; i++) {
    const curr = pts[i];
    if (i === 0) {
      const d2 = distToSegmentSquared(curr.x, curr.y, p1.x, p1.y, p2.x, p2.y);
      dense.push({
        x: curr.x,
        y: curr.y,
        pressure: curr.pressure ?? 0.5,
        erased: d2 <= effRadiusSq,
      });
    } else {
      const prev = pts[i - 1];
      const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);
      const numSteps = Math.max(1, Math.ceil(dist / maxStep));

      for (let s = 1; s <= numSteps; s++) {
        const t = s / numSteps;
        const ix = prev.x + (curr.x - prev.x) * t;
        const iy = prev.y + (curr.y - prev.y) * t;
        const ip =
          (prev.pressure ?? 0.5) + ((curr.pressure ?? 0.5) - (prev.pressure ?? 0.5)) * t;
        const d2 = distToSegmentSquared(ix, iy, p1.x, p1.y, p2.x, p2.y);
        dense.push({
          x: ix,
          y: iy,
          pressure: ip,
          erased: d2 <= effRadiusSq,
        });
      }
    }
  }

  // Check if any point was erased
  const hasErasedPoints = dense.some((p) => p.erased);
  if (!hasErasedPoints) {
    return [stroke];
  }

  // 3. Group consecutive non-erased points into separate sub-strokes
  const result: FreehandStroke[] = [];
  let currentGroup: { x: number; y: number; pressure?: number }[] = [];

  const strokeBaseId = (stroke.id || 'stroke').replace(/^stroke_/, '');
  let subIndex = 0;

  const flushGroup = () => {
    if (currentGroup.length === 0) return;

    // Decimate redundant close points in the group to maintain smooth performance
    const simplified: { x: number; y: number; pressure?: number }[] = [];
    for (let i = 0; i < currentGroup.length; i++) {
      if (
        simplified.length === 0 ||
        i === currentGroup.length - 1 ||
        Math.hypot(
          currentGroup[i].x - simplified[simplified.length - 1].x,
          currentGroup[i].y - simplified[simplified.length - 1].y
        ) >= 2
      ) {
        simplified.push(currentGroup[i]);
      }
    }

    subIndex++;
    const uniqueId = `stroke_${strokeBaseId}_p${subIndex}_${Math.random().toString(36).substring(2, 7)}`;

    if (simplified.length >= 2) {
      result.push({
        id: uniqueId,
        type: 'STROKE',
        tool: stroke.tool,
        points: simplified,
        color: stroke.color,
        strokeWidth: stroke.strokeWidth,
        opacity: stroke.opacity,
      });
    } else if (simplified.length === 1) {
      result.push({
        id: uniqueId,
        type: 'STROKE',
        tool: stroke.tool,
        points: [
          simplified[0],
          { x: simplified[0].x + 0.1, y: simplified[0].y + 0.1, pressure: simplified[0].pressure },
        ],
        color: stroke.color,
        strokeWidth: stroke.strokeWidth,
        opacity: stroke.opacity,
      });
    }
    currentGroup = [];
  };

  for (let i = 0; i < dense.length; i++) {
    const pt = dense[i];
    if (!pt.erased) {
      currentGroup.push({ x: pt.x, y: pt.y, pressure: pt.pressure });
    } else {
      flushGroup();
    }
  }
  flushGroup();

  return result;
}

/**
 * Checks if a non-stroke discrete element intersects the eraser sweep capsule.
 */
export function hitTestDiscreteElement(
  el: WhiteboardElement,
  p1: Point,
  p2: Point,
  radius: number
): boolean {
  // Imported images must NEVER be deleted by stroke eraser sweeps.
  // They are only deleted when explicitly selected and deleted by the student.
  if (el.type === 'IMAGE') return false;
  if (!('x' in el && 'y' in el)) return false;
  const w = 'width' in el ? (el.width as number) : 100;
  const h = 'height' in el ? (el.height as number) : ('fontSize' in el ? (el.fontSize as number) * 1.5 : 40);
  const r2 = radius * radius;

  const segDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const steps = Math.max(1, Math.ceil(segDist / Math.max(4, radius / 2)));

  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const cx = p1.x + (p2.x - p1.x) * t;
    const cy = p1.y + (p2.y - p1.y) * t;

    const closestX = Math.max(el.x, Math.min(cx, el.x + w));
    const closestY = Math.max(el.y, Math.min(cy, el.y + h));
    const dx = cx - closestX;
    const dy = cy - closestY;
    if (dx * dx + dy * dy <= r2) {
      return true;
    }
  }
  return false;
}

/**
 * Erases strokes and elements across the path p1 -> p2 with given eraser radius.
 */
export function eraseElementsInPath(
  elements: WhiteboardElement[],
  p1: Point,
  p2: Point,
  eraserRadius: number
): { newElements: WhiteboardElement[]; hasChanged: boolean } {
  let hasChanged = false;
  const newElements: WhiteboardElement[] = [];

  for (const el of elements) {
    if (el.type === 'STROKE') {
      const stroke = el as FreehandStroke;
      const splitStrokes = eraseStroke(stroke, p1, p2, eraserRadius);
      if (
        splitStrokes.length !== 1 ||
        splitStrokes[0] !== stroke
      ) {
        hasChanged = true;
        newElements.push(...splitStrokes);
      } else {
        newElements.push(stroke);
      }
    } else if (el.type === 'IMAGE') {
      // Always preserve imported image layer - image layers are permanent until student explicitly deletes them
      newElements.push(el);
    } else {
      if (hitTestDiscreteElement(el, p1, p2, eraserRadius)) {
        hasChanged = true;
        // Erased
      } else {
        newElements.push(el);
      }
    }
  }

  return { newElements, hasChanged };
}
