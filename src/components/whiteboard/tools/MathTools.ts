import { MathElement, MathToolType } from '../types';

export function drawMathObject(ctx: CanvasRenderingContext2D, element: MathElement) {
  const { mathType, x, y, width, height, color, fillColor, strokeWidth, data } = element;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const cx = x + width / 2;
  const cy = y + height / 2;

  switch (mathType) {
    case 'COORDINATE_PLANE': {
      drawCoordinatePlane(ctx, x, y, width, height, color, strokeWidth, data);
      break;
    }

    case 'FUNCTION_GRAPH': {
      drawFunctionGraph(ctx, x, y, width, height, color, strokeWidth, data);
      break;
    }

    case 'VECTOR_ARROW': {
      drawVectorWithComponents(ctx, x, y, width, height, color, strokeWidth, data);
      break;
    }

    case 'NUMBER_LINE': {
      drawNumberLine(ctx, x, y, width, height, color, strokeWidth, data);
      break;
    }

    case 'MATRIX_GRID': {
      drawMatrixGrid(ctx, x, y, width, height, color, strokeWidth, data);
      break;
    }

    case 'TRIG_CIRCLE': {
      drawTrigCircle(ctx, cx, cy, Math.min(Math.abs(width), Math.abs(height)) / 2, color, strokeWidth);
      break;
    }
  }

  ctx.restore();
}

function drawCoordinatePlane(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  strokeWidth: number,
  data: any
) {
  const cx = x + w / 2;
  const cy = y + h / 2;

  // Background subtle grid
  ctx.strokeStyle = color + '22';
  ctx.lineWidth = 1;
  const step = 25;

  for (let gx = cx; gx <= x + w; gx += step) {
    ctx.beginPath();
    ctx.moveTo(gx, y);
    ctx.lineTo(gx, y + h);
    ctx.stroke();
  }
  for (let gx = cx; gx >= x; gx -= step) {
    ctx.beginPath();
    ctx.moveTo(gx, y);
    ctx.lineTo(gx, y + h);
    ctx.stroke();
  }
  for (let gy = cy; gy <= y + h; gy += step) {
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x + w, gy);
    ctx.stroke();
  }
  for (let gy = cy; gy >= y; gy -= step) {
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x + w, gy);
    ctx.stroke();
  }

  // Main Axes
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, strokeWidth);

  // X Axis
  ctx.beginPath();
  ctx.moveTo(x, cy);
  ctx.lineTo(x + w, cy);
  ctx.stroke();

  // Y Axis
  ctx.beginPath();
  ctx.moveTo(cx, y + h);
  ctx.lineTo(cx, y);
  ctx.stroke();

  // Arrowheads
  drawArrowTip(ctx, x + w - 10, cy, x + w, cy);
  drawArrowTip(ctx, cx, y + 10, cx, y);

  // Labels
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = color;
  ctx.fillText('X', x + w - 15, cy - 8);
  ctx.fillText('Y', cx + 8, y + 15);
  ctx.fillText('O (0,0)', cx + 4, cy + 14);

  // Tick marks
  ctx.font = '10px sans-serif';
  let unit = 1;
  for (let gx = cx + step * 2; gx < x + w - 10; gx += step * 2) {
    ctx.beginPath();
    ctx.moveTo(gx, cy - 4);
    ctx.lineTo(gx, cy + 4);
    ctx.stroke();
    ctx.fillText(`${unit * 2}`, gx - 4, cy + 14);
    unit++;
  }
}

function drawFunctionGraph(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  strokeWidth: number,
  data: any
) {
  // First draw small coordinate system
  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.strokeStyle = color + '44';
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(x, cy);
  ctx.lineTo(x + w, cy);
  ctx.moveTo(cx, y + h);
  ctx.lineTo(cx, y);
  ctx.stroke();

  const formula = data.formula || 'sin(x)';
  const xMin = data.xMin ?? -10;
  const xMax = data.xMax ?? 10;
  const yMin = data.yMin ?? -5;
  const yMax = data.yMax ?? 5;

  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth + 1;
  ctx.beginPath();

  let started = false;
  const pointsCount = 200;

  for (let i = 0; i <= pointsCount; i++) {
    const t = i / pointsCount;
    const mathX = xMin + t * (xMax - xMin);
    let mathY = 0;

    try {
      if (formula.includes('sin')) {
        mathY = Math.sin(mathX);
      } else if (formula.includes('cos')) {
        mathY = Math.cos(mathX);
      } else if (formula.includes('tan')) {
        mathY = Math.tan(mathX);
      } else if (formula.includes('x^2') || formula.includes('x*x')) {
        mathY = (mathX * mathX) / 4;
      } else if (formula.includes('x^3')) {
        mathY = (mathX * mathX * mathX) / 10;
      } else if (formula.includes('sqrt')) {
        mathY = mathX >= 0 ? Math.sqrt(mathX) : NaN;
      } else if (formula.includes('exp') || formula.includes('e^x')) {
        mathY = Math.exp(mathX * 0.5);
      } else if (formula.includes('log') || formula.includes('ln')) {
        mathY = mathX > 0 ? Math.log(mathX) : NaN;
      } else {
        mathY = Math.sin(mathX);
      }
    } catch {
      mathY = Math.sin(mathX);
    }

    if (isNaN(mathY) || !isFinite(mathY) || mathY > yMax * 2 || mathY < yMin * 2) {
      started = false;
      continue;
    }

    const screenX = x + ((mathX - xMin) / (xMax - xMin)) * w;
    const screenY = y + h - ((mathY - yMin) / (yMax - yMin)) * h;

    if (!started) {
      ctx.moveTo(screenX, screenY);
      started = true;
    } else {
      ctx.lineTo(screenX, screenY);
    }
  }
  ctx.stroke();

  // Formula badge
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = color;
  ctx.fillText(`y = ${formula}`, x + 10, y + 20);
}

function drawVectorWithComponents(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  strokeWidth: number,
  data: any
) {
  const originX = x + 20;
  const originY = y + h - 20;
  const tipX = x + w - 20;
  const tipY = y + 20;

  // Main Vector Arrow
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(3, strokeWidth);
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  drawArrowTip(ctx, originX, originY, tipX, tipY, 14);

  // Dashed Component Projections
  ctx.strokeStyle = color + '88';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);

  // Horizontal component (X)
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(tipX, originY);
  ctx.stroke();

  // Vertical component (Y)
  ctx.beginPath();
  ctx.moveTo(tipX, originY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Angle Arc θ
  ctx.beginPath();
  ctx.arc(originX, originY, 30, 0, -Math.PI / 4, true);
  ctx.stroke();

  // Labels
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = color;
  ctx.fillText(data.arrowLabel || 'v⃗', (originX + tipX) / 2 - 10, (originY + tipY) / 2 - 10);
  ctx.fillText('vₓ = v cos θ', (originX + tipX) / 2, originY + 16);
  ctx.fillText('vᵧ = v sin θ', tipX + 6, (originY + tipY) / 2);
  ctx.fillText('θ', originX + 36, originY - 8);
}

function drawNumberLine(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  strokeWidth: number,
  data: any
) {
  const cy = y + h / 2;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, strokeWidth);

  // Line
  ctx.beginPath();
  ctx.moveTo(x + 10, cy);
  ctx.lineTo(x + w - 10, cy);
  ctx.stroke();

  drawArrowTip(ctx, x + 30, cy, x + 10, cy, 10);
  drawArrowTip(ctx, x + w - 30, cy, x + w - 10, cy, 10);

  // Ticks & Numbers (-5 to +5 default)
  const steps = data.numSteps || 11; // -5 to +5 is 11 points
  const startVal = -(Math.floor(steps / 2));
  const stepWidth = (w - 60) / (steps - 1);

  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';

  for (let i = 0; i < steps; i++) {
    const tx = x + 30 + i * stepWidth;
    const val = startVal + i;
    const isOrigin = val === 0;

    ctx.beginPath();
    ctx.moveTo(tx, cy - (isOrigin ? 8 : 5));
    ctx.lineTo(tx, cy + (isOrigin ? 8 : 5));
    ctx.stroke();

    ctx.fillStyle = isOrigin ? color : color + 'CC';
    ctx.fillText(`${val}`, tx, cy + 20);
  }
}

function drawMatrixGrid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  strokeWidth: number,
  data: any
) {
  const rows = data.matrixRows || 3;
  const cols = data.matrixCols || 3;
  const bracketW = 10;

  // Left Bracket [
  ctx.lineWidth = Math.max(2, strokeWidth);
  ctx.beginPath();
  ctx.moveTo(x + bracketW, y);
  ctx.lineTo(x, y);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + bracketW, y + h);
  ctx.stroke();

  // Right Bracket ]
  ctx.beginPath();
  ctx.moveTo(x + w - bracketW, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w - bracketW, y + h);
  ctx.stroke();

  // Sample matrix entries
  ctx.font = '13px monospace';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const cellW = (w - bracketW * 2) / cols;
  const cellH = h / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const val = data.matrixValues?.[r]?.[c] || `a${r + 1}${c + 1}`;
      const px = x + bracketW + c * cellW + cellW / 2;
      const py = y + r * cellH + cellH / 2;
      ctx.fillText(val, px, py);
    }
  }
}

function drawTrigCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  strokeWidth: number
) {
  // Axes
  ctx.strokeStyle = color + '66';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - r * 1.2, cy);
  ctx.lineTo(cx + r * 1.2, cy);
  ctx.moveTo(cx, cy + r * 1.2);
  ctx.lineTo(cx, cy - r * 1.2);
  ctx.stroke();

  // Unit Circle
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Angles 0, 30, 45, 60, 90, 180, 270
  const angles = [
    { deg: 0, label: '0, 2π' },
    { deg: 30, label: 'π/6 (30°)' },
    { deg: 45, label: 'π/4 (45°)' },
    { deg: 60, label: 'π/3 (60°)' },
    { deg: 90, label: 'π/2 (90°)' },
    { deg: 180, label: 'π (180°)' },
    { deg: 270, label: '3π/2 (270°)' },
  ];

  ctx.font = '10px sans-serif';
  ctx.fillStyle = color;

  angles.forEach(({ deg, label }) => {
    const rad = (-deg * Math.PI) / 180;
    const px = cx + r * Math.cos(rad);
    const py = cy + r * Math.sin(rad);

    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();

    const lx = cx + (r + 14) * Math.cos(rad);
    const ly = cy + (r + 14) * Math.sin(rad);
    ctx.fillText(label, lx, ly);
  });
}

function drawArrowTip(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  len = 10
) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - len * Math.cos(angle - Math.PI / 6), toY - len * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - len * Math.cos(angle + Math.PI / 6), toY - len * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}
