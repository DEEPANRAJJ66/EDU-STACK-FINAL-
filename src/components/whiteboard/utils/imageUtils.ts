// Image cache and utilities for Whiteboard Image Layers

const globalImageCache = new Map<string, HTMLImageElement>();
const loadingPromises = new Map<string, Promise<HTMLImageElement>>();

/**
 * Returns a cached HTMLImageElement if already loaded, or starts loading it asynchronously.
 * Triggers onLoaded callback when the image finishes loading.
 */
export function getCachedImage(
  src: string,
  onLoaded?: () => void
): HTMLImageElement | null {
  if (!src) return null;

  const cached = globalImageCache.get(src);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return cached;
  }

  if (!cached) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      globalImageCache.set(src, img);
      if (onLoaded) {
        onLoaded();
      }
    };
    img.onerror = () => {
      console.warn('Failed to load image for whiteboard layer:', src.slice(0, 50));
    };
    img.src = src;
    globalImageCache.set(src, img);
    return img;
  }

  return cached.complete && cached.naturalWidth > 0 ? cached : null;
}

/**
 * Loads an image from a source and resolves its natural dimensions
 */
export function loadImageDimensions(
  src: string
): Promise<{ width: number; height: number; img: HTMLImageElement }> {
  if (loadingPromises.has(src)) {
    return loadingPromises.get(src)!.then((img) => ({
      width: img.naturalWidth || 400,
      height: img.naturalHeight || 300,
      img,
    }));
  }

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const cached = globalImageCache.get(src);
    if (cached && cached.complete && cached.naturalWidth > 0) {
      resolve(cached);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      globalImageCache.set(src, img);
      resolve(img);
    };
    img.onerror = (err) => reject(err);
    img.src = src;
  });

  loadingPromises.set(src, promise);

  return promise.then((img) => ({
    width: img.naturalWidth || 400,
    height: img.naturalHeight || 300,
    img,
  }));
}

/**
 * Reads a File object as Data URL
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Calculates optimal initial width and height to fit nicely inside canvas bounds (e.g. max 700x500)
 */
export function fitDimensions(
  naturalWidth: number,
  naturalHeight: number,
  maxWidth = 640,
  maxHeight = 480
): { width: number; height: number } {
  if (!naturalWidth || !naturalHeight) {
    return { width: 400, height: 300 };
  }

  const ratio = naturalWidth / naturalHeight;

  let width = naturalWidth;
  let height = naturalHeight;

  if (width > maxWidth) {
    width = maxWidth;
    height = width / ratio;
  }

  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * STEM Diagram Presets (Vector SVGs encoded as Data URLs) for quick classroom & study illustration
 */
export interface STEMDiagramPreset {
  id: string;
  title: string;
  category: 'Physics' | 'Chemistry' | 'Mathematics' | 'Biology';
  description: string;
  dataUrl: string;
  defaultWidth: number;
  defaultHeight: number;
}

const OPTICS_RAY_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360" width="600" height="360" style="background:#0f172a;border-radius:12px">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8"/>
    </marker>
    <marker id="arrow-yellow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#facc15"/>
    </marker>
  </defs>
  <!-- Principal Axis -->
  <line x1="20" y1="180" x2="580" y2="180" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="6,4"/>
  <!-- Convex Lens -->
  <path d="M 300 40 Q 325 180 300 320 Q 275 180 300 40 Z" fill="rgba(56, 189, 248, 0.25)" stroke="#38bdf8" stroke-width="2.5"/>
  <!-- Focus & 2F Marks -->
  <circle cx="180" cy="180" r="4" fill="#f43f5e"/>
  <text x="175" y="205" fill="#f43f5e" font-size="14" font-weight="bold" font-family="sans-serif">2F₁</text>
  <circle cx="240" cy="180" r="4" fill="#f43f5e"/>
  <text x="235" y="205" fill="#f43f5e" font-size="14" font-weight="bold" font-family="sans-serif">F₁</text>
  <circle cx="300" cy="180" r="4" fill="#38bdf8"/>
  <text x="295" y="205" fill="#38bdf8" font-size="14" font-weight="bold" font-family="sans-serif">O</text>
  <circle cx="360" cy="180" r="4" fill="#f43f5e"/>
  <text x="355" y="205" fill="#f43f5e" font-size="14" font-weight="bold" font-family="sans-serif">F₂</text>
  <circle cx="420" cy="180" r="4" fill="#f43f5e"/>
  <text x="415" y="205" fill="#f43f5e" font-size="14" font-weight="bold" font-family="sans-serif">2F₂</text>
  <!-- Object AB -->
  <line x1="140" y1="180" x2="140" y2="80" stroke="#4ade80" stroke-width="3" marker-end="url(#arrow)"/>
  <text x="130" y="70" fill="#4ade80" font-size="14" font-weight="bold" font-family="sans-serif">A</text>
  <text x="130" y="200" fill="#4ade80" font-size="14" font-weight="bold" font-family="sans-serif">B</text>
  <!-- Ray 1: Parallel to Axis then through F2 -->
  <line x1="140" y1="80" x2="300" y2="80" stroke="#facc15" stroke-width="2" marker-mid="url(#arrow-yellow)"/>
  <line x1="300" y1="80" x2="520" y2="280" stroke="#facc15" stroke-width="2" marker-mid="url(#arrow-yellow)"/>
  <!-- Ray 2: Through Optical Center O -->
  <line x1="140" y1="80" x2="520" y2="280" stroke="#38bdf8" stroke-width="2" marker-mid="url(#arrow)"/>
  <!-- Inverted Real Image A'B' -->
  <line x1="520" y1="180" x2="520" y2="280" stroke="#f43f5e" stroke-width="3" marker-end="url(#arrow)"/>
  <text x="525" y="295" fill="#f43f5e" font-size="14" font-weight="bold" font-family="sans-serif">A'</text>
  <text x="525" y="175" fill="#f43f5e" font-size="14" font-weight="bold" font-family="sans-serif">B'</text>
  <text x="20" y="30" fill="#38bdf8" font-size="15" font-weight="bold" font-family="sans-serif">Ray Optics: Real &amp; Inverted Image by Convex Lens</text>
</svg>`)}`;

const CIRCUIT_WHEATSTONE_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 380" width="600" height="380" style="background:#0f172a;border-radius:12px">
  <!-- Title -->
  <text x="30" y="35" fill="#38bdf8" font-size="16" font-weight="bold" font-family="sans-serif">Wheatstone Bridge Circuit Network (Balanced: P/Q = R/S)</text>
  <!-- Diamond Loop Wires -->
  <!-- Top Node A (300, 70), Right Node B (480, 190), Bottom Node C (300, 310), Left Node D (120, 190) -->
  <!-- Resistor P (Top-Left: D to A) -->
  <path d="M 120 190 L 180 150 L 190 140 L 200 160 L 210 140 L 220 160 L 230 140 L 240 150 L 300 70" fill="none" stroke="#facc15" stroke-width="3"/>
  <text x="180" y="125" fill="#facc15" font-size="16" font-weight="bold" font-family="sans-serif">P</text>
  <!-- Resistor Q (Top-Right: A to B) -->
  <path d="M 300 70 L 360 110 L 370 100 L 380 120 L 390 100 L 400 120 L 410 100 L 420 110 L 480 190" fill="none" stroke="#38bdf8" stroke-width="3"/>
  <text x="410" y="125" fill="#38bdf8" font-size="16" font-weight="bold" font-family="sans-serif">Q</text>
  <!-- Resistor R (Bottom-Left: D to C) -->
  <path d="M 120 190 L 180 230 L 190 220 L 200 240 L 210 220 L 220 240 L 230 220 L 240 230 L 300 310" fill="none" stroke="#4ade80" stroke-width="3"/>
  <text x="180" y="275" fill="#4ade80" font-size="16" font-weight="bold" font-family="sans-serif">R</text>
  <!-- Resistor S (Bottom-Right: C to B) -->
  <path d="M 300 310 L 360 270 L 370 260 L 380 280 L 390 260 L 400 280 L 410 260 L 420 270 L 480 190" fill="none" stroke="#c084fc" stroke-width="3"/>
  <text x="410" y="275" fill="#c084fc" font-size="16" font-weight="bold" font-family="sans-serif">S</text>
  <!-- Galvanometer Central Arm A to C -->
  <line x1="300" y1="70" x2="300" y2="150" stroke="#f43f5e" stroke-width="2.5"/>
  <circle cx="300" cy="190" r="22" fill="#1e293b" stroke="#f43f5e" stroke-width="2.5"/>
  <text x="293" y="196" fill="#f43f5e" font-size="18" font-weight="bold" font-family="sans-serif">G</text>
  <line x1="300" y1="230" x2="300" y2="310" stroke="#f43f5e" stroke-width="2.5"/>
  <!-- Nodes -->
  <circle cx="120" cy="190" r="5" fill="#ffffff"/>
  <text x="95" y="195" fill="#ffffff" font-size="14" font-weight="bold" font-family="sans-serif">D</text>
  <circle cx="480" cy="190" r="5" fill="#ffffff"/>
  <text x="495" y="195" fill="#ffffff" font-size="14" font-weight="bold" font-family="sans-serif">B</text>
  <circle cx="300" cy="70" r="5" fill="#ffffff"/>
  <text x="295" y="55" fill="#ffffff" font-size="14" font-weight="bold" font-family="sans-serif">A</text>
  <circle cx="300" cy="310" r="5" fill="#ffffff"/>
  <text x="295" y="335" fill="#ffffff" font-size="14" font-weight="bold" font-family="sans-serif">C</text>
  <!-- External Battery & Key -->
  <path d="M 120 190 L 50 190 L 50 360 L 550 360 L 550 190 L 480 190" fill="none" stroke="#94a3b8" stroke-width="2"/>
  <!-- Battery symbol at bottom center -->
  <line x1="280" y1="345" x2="280" y2="375" stroke="#ffffff" stroke-width="3"/>
  <line x1="300" y1="352" x2="300" y2="368" stroke="#ffffff" stroke-width="2"/>
  <line x1="310" y1="345" x2="310" y2="375" stroke="#ffffff" stroke-width="3"/>
  <line x1="330" y1="352" x2="330" y2="368" stroke="#ffffff" stroke-width="2"/>
  <text x="290" y="340" fill="#38bdf8" font-size="13" font-weight="bold" font-family="sans-serif">Battery (E)</text>
</svg>`)}`;

const BENZENE_ORGANIC_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 340" width="500" height="340" style="background:#0f172a;border-radius:12px">
  <text x="30" y="35" fill="#a78bfa" font-size="16" font-weight="bold" font-family="sans-serif">Organic Chemistry: Aromatic Benzene &amp; Resonance Ring</text>
  <!-- Benzene Ring Outer Hexagon (cx: 170, cy: 180, r: 80) -->
  <polygon points="170,100 239,140 239,220 170,260 101,220 101,140" fill="rgba(167, 139, 250, 0.12)" stroke="#a78bfa" stroke-width="3.5"/>
  <!-- Alternating Double Bonds -->
  <line x1="170" y1="115" x2="225" y2="147" stroke="#a78bfa" stroke-width="2.5"/>
  <line x1="225" y1="213" x2="170" y2="245" stroke="#a78bfa" stroke-width="2.5"/>
  <line x1="115" y1="213" x2="115" y2="147" stroke="#a78bfa" stroke-width="2.5"/>
  <text x="135" y="295" fill="#e2e8f0" font-size="14" font-weight="bold" font-family="sans-serif">Kekulé Structure</text>
  <!-- Resonance Arrow -->
  <path d="M 270 175 L 310 175 M 300 167 L 310 175 L 300 183 M 270 185 L 310 185 M 280 177 L 270 185 L 280 193" stroke="#facc15" stroke-width="2" fill="none"/>
  <!-- Delocalized Pi Electron Cloud (cx: 390, cy: 180) -->
  <polygon points="390,100 459,140 459,220 390,260 321,220 321,140" fill="rgba(56, 189, 248, 0.12)" stroke="#38bdf8" stroke-width="3.5"/>
  <circle cx="390" cy="180" r="45" fill="none" stroke="#38bdf8" stroke-width="3" stroke-dasharray="6,4"/>
  <text x="350" y="295" fill="#e2e8f0" font-size="14" font-weight="bold" font-family="sans-serif">π-Resonance Ring</text>
</svg>`)}`;

const CARTESIAN_GRID_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 380" width="540" height="380" style="background:#090d16;border-radius:12px">
  <defs>
    <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(56, 189, 248, 0.12)" stroke-width="0.8"/>
    </pattern>
    <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
      <rect width="60" height="60" fill="url(#smallGrid)"/>
      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(56, 189, 248, 0.28)" stroke-width="1.2"/>
    </pattern>
    <marker id="mArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8"/>
    </marker>
  </defs>
  <rect width="540" height="380" fill="url(#grid)"/>
  <!-- Axes -->
  <line x1="20" y1="190" x2="520" y2="190" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#mArrow)"/>
  <line x1="270" y1="360" x2="270" y2="20" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#mArrow)"/>
  <!-- Labels -->
  <text x="505" y="180" fill="#38bdf8" font-size="14" font-weight="bold" font-family="sans-serif">+X</text>
  <text x="280" y="35" fill="#38bdf8" font-size="14" font-weight="bold" font-family="sans-serif">+Y</text>
  <text x="255" y="208" fill="#94a3b8" font-size="13" font-weight="bold" font-family="sans-serif">O (0,0)</text>
  <!-- Unit Circle -->
  <circle cx="270" cy="190" r="120" fill="none" stroke="#f43f5e" stroke-width="2" stroke-dasharray="4,4"/>
  <text x="395" y="180" fill="#f43f5e" font-size="12" font-weight="bold" font-family="sans-serif">(1, 0)</text>
  <text x="278" y="65" fill="#f43f5e" font-size="12" font-weight="bold" font-family="sans-serif">(0, 1)</text>
  <text x="25" y="35" fill="#38bdf8" font-size="15" font-weight="bold" font-family="sans-serif">4-Quadrant Cartesian Plane with Trigonometric Unit Circle</text>
</svg>`)}`;

export const STEM_DIAGRAM_PRESETS: STEMDiagramPreset[] = [
  {
    id: 'optics_lens',
    title: 'Convex Lens Ray Optics Diagram',
    category: 'Physics',
    description: 'Focal points, real & inverted image, optical center, principal axis',
    dataUrl: OPTICS_RAY_SVG,
    defaultWidth: 600,
    defaultHeight: 360,
  },
  {
    id: 'circuit_wheatstone',
    title: 'Wheatstone Bridge Circuit Network',
    category: 'Physics',
    description: 'Resistors P, Q, R, S, central galvanometer G and battery connection',
    dataUrl: CIRCUIT_WHEATSTONE_SVG,
    defaultWidth: 600,
    defaultHeight: 380,
  },
  {
    id: 'benzene_organic',
    title: 'Benzene Ring & π-Resonance Hybrid',
    category: 'Chemistry',
    description: 'Kekulé alternating double bonds & delocalized aromatic ring',
    dataUrl: BENZENE_ORGANIC_SVG,
    defaultWidth: 500,
    defaultHeight: 340,
  },
  {
    id: 'cartesian_plane',
    title: '4-Quadrant Cartesian Grid & Unit Circle',
    category: 'Mathematics',
    description: 'High-precision coordinate grid with trigonometric unit circle',
    dataUrl: CARTESIAN_GRID_SVG,
    defaultWidth: 540,
    defaultHeight: 380,
  },
];
