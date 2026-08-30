import { Shape3DElement, Shape3DType } from '../types';

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface ProjectedPoint {
  x: number;
  y: number;
  z: number; // for depth sorting if needed
}

interface Edge3D {
  p1: number;
  p2: number;
  dashed?: boolean;
}

function rotate3D(v: Vec3, rotXDeg: number, rotYDeg: number, rotZDeg: number): Vec3 {
  const radX = (rotXDeg * Math.PI) / 180;
  const radY = (rotYDeg * Math.PI) / 180;
  const radZ = (rotZDeg * Math.PI) / 180;

  // Rotate around X (pitch)
  let y1 = v.y * Math.cos(radX) - v.z * Math.sin(radX);
  let z1 = v.y * Math.sin(radX) + v.z * Math.cos(radX);
  let x1 = v.x;

  // Rotate around Y (yaw)
  let x2 = x1 * Math.cos(radY) + z1 * Math.sin(radY);
  let z2 = -x1 * Math.sin(radY) + z1 * Math.cos(radY);
  let y2 = y1;

  // Rotate around Z (roll)
  let x3 = x2 * Math.cos(radZ) - y2 * Math.sin(radZ);
  let y3 = x2 * Math.sin(radZ) + y2 * Math.cos(radZ);
  let z3 = z2;

  return { x: x3, y: y3, z: z3 };
}

function project3D(v: Vec3, cx: number, cy: number, scale = 1): ProjectedPoint {
  // Orthographic / Isometric Projection with slight depth
  return {
    x: cx + v.x * scale,
    y: cy + v.y * scale,
    z: v.z,
  };
}

export function draw3DShape(ctx: CanvasRenderingContext2D, element: Shape3DElement) {
  const {
    shape,
    x,
    y,
    width,
    height,
    depth = Math.min(Math.abs(width), Math.abs(height)),
    rotX = -20,
    rotY = 35,
    rotZ = 0,
    color,
    fillColor,
    strokeWidth,
    showHiddenEdges = true,
    showVertexLabels = false,
    label,
  } = element;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const cx = x + width / 2;
  const cy = y + height / 2;
  const w2 = Math.abs(width) / 2;
  const h2 = Math.abs(height) / 2;
  const d2 = Math.abs(depth) / 2;

  // Special procedural rendering for curved solids (Sphere, Cylinder, Cone, Hemisphere)
  if (shape === 'SPHERE') {
    drawSphere(ctx, cx, cy, Math.min(w2, h2), color, fillColor, strokeWidth, rotX, rotY, showHiddenEdges);
    ctx.restore();
    return;
  }

  if (shape === 'CYLINDER') {
    drawCylinder(ctx, cx, cy, w2, h2, color, fillColor, strokeWidth, rotX, rotY, showHiddenEdges);
    ctx.restore();
    return;
  }

  if (shape === 'CONE') {
    drawCone(ctx, cx, cy, w2, h2, color, fillColor, strokeWidth, rotX, rotY, showHiddenEdges);
    ctx.restore();
    return;
  }

  if (shape === 'HEMISPHERE') {
    drawHemisphere(ctx, cx, cy, Math.min(w2, h2), color, fillColor, strokeWidth, rotX, rotY, showHiddenEdges);
    ctx.restore();
    return;
  }

  // Polyhedral solids (Cube, Cuboid, Prism, Pyramid, Tetrahedron)
  let vertices: Vec3[] = [];
  let edges: Edge3D[] = [];
  let vertexNames: string[] = [];

  switch (shape) {
    case 'CUBE':
    case 'CUBOID': {
      const sx = shape === 'CUBE' ? Math.min(w2, h2, d2) : w2;
      const sy = shape === 'CUBE' ? Math.min(w2, h2, d2) : h2;
      const sz = shape === 'CUBE' ? Math.min(w2, h2, d2) : d2;

      // 8 vertices
      vertices = [
        { x: -sx, y: -sy, z: -sz }, // 0: Top-left-back
        { x: sx, y: -sy, z: -sz },  // 1: Top-right-back
        { x: sx, y: sy, z: -sz },   // 2: Bottom-right-back
        { x: -sx, y: sy, z: -sz },  // 3: Bottom-left-back
        { x: -sx, y: -sy, z: sz },  // 4: Top-left-front
        { x: sx, y: -sy, z: sz },   // 5: Top-right-front
        { x: sx, y: sy, z: sz },    // 6: Bottom-right-front
        { x: -sx, y: sy, z: sz },   // 7: Bottom-left-front
      ];

      vertexNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

      edges = [
        // Back face
        { p1: 0, p2: 1, dashed: true },
        { p1: 1, p2: 2, dashed: true },
        { p1: 2, p2: 3, dashed: true },
        { p1: 3, p2: 0, dashed: true },
        // Front face
        { p1: 4, p2: 5 },
        { p1: 5, p2: 6 },
        { p1: 6, p2: 7 },
        { p1: 7, p2: 4 },
        // Connecting struts
        { p1: 0, p2: 4 },
        { p1: 1, p2: 5 },
        { p1: 2, p2: 6 },
        { p1: 3, p2: 7 },
      ];
      break;
    }

    case 'PRISM': {
      // Triangular Prism
      vertices = [
        // Front triangle
        { x: 0, y: -h2, z: d2 },     // 0: Apex front
        { x: -w2, y: h2, z: d2 },    // 1: Left front
        { x: w2, y: h2, z: d2 },     // 2: Right front
        // Back triangle
        { x: 0, y: -h2, z: -d2 },    // 3: Apex back
        { x: -w2, y: h2, z: -d2 },   // 4: Left back
        { x: w2, y: h2, z: -d2 },    // 5: Right back
      ];

      vertexNames = ['A', 'B', 'C', "A'", "B'", "C'"];

      edges = [
        { p1: 0, p2: 1 },
        { p1: 1, p2: 2 },
        { p1: 2, p2: 0 },
        { p1: 3, p2: 4, dashed: true },
        { p1: 4, p2: 5, dashed: true },
        { p1: 5, p2: 3, dashed: true },
        { p1: 0, p2: 3 },
        { p1: 1, p2: 4 },
        { p1: 2, p2: 5 },
      ];
      break;
    }

    case 'PYRAMID': {
      // Square Pyramid
      vertices = [
        { x: 0, y: -h2, z: 0 },      // 0: Apex (top)
        { x: -w2, y: h2, z: -d2 },   // 1: Base Back-left
        { x: w2, y: h2, z: -d2 },    // 2: Base Back-right
        { x: w2, y: h2, z: d2 },     // 3: Base Front-right
        { x: -w2, y: h2, z: d2 },    // 4: Base Front-left
      ];

      vertexNames = ['V', 'A', 'B', 'C', 'D'];

      edges = [
        { p1: 1, p2: 2, dashed: true },
        { p1: 2, p2: 3 },
        { p1: 3, p2: 4 },
        { p1: 4, p2: 1, dashed: true },
        { p1: 0, p2: 1, dashed: true },
        { p1: 0, p2: 2 },
        { p1: 0, p2: 3 },
        { p1: 0, p2: 4 },
      ];
      break;
    }

    case 'TETRAHEDRON': {
      // 4 vertices regular triangular pyramid
      const s = Math.min(w2, h2, d2);
      vertices = [
        { x: 0, y: -s * 1.2, z: 0 },
        { x: -s, y: s * 0.8, z: -s * 0.6 },
        { x: s, y: s * 0.8, z: -s * 0.6 },
        { x: 0, y: s * 0.8, z: s },
      ];

      vertexNames = ['A', 'B', 'C', 'D'];

      edges = [
        { p1: 0, p2: 1 },
        { p1: 0, p2: 2 },
        { p1: 0, p2: 3 },
        { p1: 1, p2: 2, dashed: true },
        { p1: 2, p2: 3 },
        { p1: 3, p2: 1 },
      ];
      break;
    }
  }

  // Rotate & Project vertices
  const projected = vertices.map(v => {
    const rot = rotate3D(v, rotX, rotY, rotZ);
    return project3D(rot, cx, cy);
  });

  // Optional subtle translucent face shading
  if (fillColor && fillColor !== 'transparent') {
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    projected.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fill();
  }

  // Render edges
  edges.forEach(edge => {
    const p1 = projected[edge.p1];
    const p2 = projected[edge.p2];
    if (!p1 || !p2) return;

    if (edge.dashed && !showHiddenEdges) {
      return; // hide hidden edges if disabled
    }

    ctx.beginPath();
    if (edge.dashed) {
      ctx.setLineDash([strokeWidth * 2.5, strokeWidth * 2]);
      ctx.strokeStyle = color + '99'; // slightly transparent for hidden edges
    } else {
      ctx.setLineDash([]);
      ctx.strokeStyle = color;
    }

    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  });

  // Render Vertex labels
  if (showVertexLabels) {
    ctx.setLineDash([]);
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    projected.forEach((p, i) => {
      const name = vertexNames[i] || `${i + 1}`;
      ctx.fillText(name, p.x + 8, p.y - 8);
    });
  }

  if (label) {
    ctx.setLineDash([]);
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, cx, y + height + 20);
  }

  ctx.restore();
}

function drawSphere(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  fillColor: string | undefined,
  strokeWidth: number,
  rotX: number,
  rotY: number,
  showHidden: boolean
) {
  // Outer circle
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  if (fillColor && fillColor !== 'transparent') {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  ctx.stroke();

  // Equator ellipse
  const eqTilt = Math.abs(Math.sin((rotX * Math.PI) / 180));
  const ry = Math.max(2, r * eqTilt);

  // Front equator arc
  ctx.beginPath();
  ctx.setLineDash([]);
  ctx.ellipse(cx, cy, r, ry, 0, 0, Math.PI);
  ctx.stroke();

  // Back equator arc (dashed)
  if (showHidden) {
    ctx.beginPath();
    ctx.setLineDash([strokeWidth * 2, strokeWidth * 2]);
    ctx.ellipse(cx, cy, r, ry, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
  }

  // Meridian ellipse
  const merTilt = Math.abs(Math.sin((rotY * Math.PI) / 180));
  const rx = Math.max(2, r * merTilt);

  ctx.beginPath();
  ctx.setLineDash([]);
  ctx.ellipse(cx, cy, rx, r, 0, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  if (showHidden) {
    ctx.beginPath();
    ctx.setLineDash([strokeWidth * 2, strokeWidth * 2]);
    ctx.ellipse(cx, cy, rx, r, 0, Math.PI / 2, (3 * Math.PI) / 2);
    ctx.stroke();
  }
}

function drawCylinder(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  h2: number,
  color: string,
  fillColor: string | undefined,
  strokeWidth: number,
  rotX: number,
  rotY: number,
  showHidden: boolean
) {
  const ry = Math.max(8, rx * 0.35);

  // Top Ellipse
  ctx.beginPath();
  ctx.ellipse(cx, cy - h2 + ry, rx, ry, 0, 0, Math.PI * 2);
  if (fillColor && fillColor !== 'transparent') {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  ctx.stroke();

  // Vertical boundary sides
  ctx.beginPath();
  ctx.moveTo(cx - rx, cy - h2 + ry);
  ctx.lineTo(cx - rx, cy + h2 - ry);
  ctx.moveTo(cx + rx, cy - h2 + ry);
  ctx.lineTo(cx + rx, cy + h2 - ry);
  ctx.stroke();

  // Bottom front arc
  ctx.beginPath();
  ctx.ellipse(cx, cy + h2 - ry, rx, ry, 0, 0, Math.PI);
  ctx.stroke();

  // Bottom back arc (dashed)
  if (showHidden) {
    ctx.beginPath();
    ctx.setLineDash([strokeWidth * 2, strokeWidth * 2]);
    ctx.ellipse(cx, cy + h2 - ry, rx, ry, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
}

function drawCone(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  h2: number,
  color: string,
  fillColor: string | undefined,
  strokeWidth: number,
  rotX: number,
  rotY: number,
  showHidden: boolean
) {
  const ry = Math.max(8, rx * 0.35);
  const apexY = cy - h2;
  const baseY = cy + h2 - ry;

  // Slant height lines
  ctx.beginPath();
  ctx.moveTo(cx, apexY);
  ctx.lineTo(cx - rx, baseY);
  ctx.moveTo(cx, apexY);
  ctx.lineTo(cx + rx, baseY);
  ctx.stroke();

  // Bottom front arc
  ctx.beginPath();
  ctx.ellipse(cx, baseY, rx, ry, 0, 0, Math.PI);
  if (fillColor && fillColor !== 'transparent') {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  ctx.stroke();

  // Bottom back arc (dashed)
  if (showHidden) {
    ctx.beginPath();
    ctx.setLineDash([strokeWidth * 2, strokeWidth * 2]);
    ctx.ellipse(cx, baseY, rx, ry, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
}

function drawHemisphere(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  fillColor: string | undefined,
  strokeWidth: number,
  rotX: number,
  rotY: number,
  showHidden: boolean
) {
  const ry = Math.max(6, r * 0.35);

  // Top Dome Arc
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0);
  if (fillColor && fillColor !== 'transparent') {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  ctx.stroke();

  // Base Ellipse front
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, ry, 0, 0, Math.PI);
  ctx.stroke();

  // Base Ellipse back (dashed)
  if (showHidden) {
    ctx.beginPath();
    ctx.setLineDash([strokeWidth * 2, strokeWidth * 2]);
    ctx.ellipse(cx, cy, r, ry, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
}
