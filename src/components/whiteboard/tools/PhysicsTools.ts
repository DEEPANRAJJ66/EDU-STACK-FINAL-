import { PhysicsElement, PhysicsToolType } from '../types';

export function drawPhysicsObject(ctx: CanvasRenderingContext2D, element: PhysicsElement) {
  const { physicsType, x, y, width, height, color, fillColor, strokeWidth, data } = element;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const cx = x + width / 2;
  const cy = y + height / 2;

  switch (physicsType) {
    case 'FBD_VECTOR': {
      drawFBD(ctx, cx, cy, width, height, color, strokeWidth, data);
      break;
    }

    case 'BLOCK_MASS': {
      drawBlockOnSurface(ctx, x, y, width, height, color, fillColor, strokeWidth, data);
      break;
    }

    case 'INCLINED_PLANE': {
      drawInclinedPlane(ctx, x, y, width, height, color, fillColor, strokeWidth, data);
      break;
    }

    case 'PULLEY_SYSTEM': {
      drawPulleySystem(ctx, x, y, width, height, color, fillColor, strokeWidth, data);
      break;
    }

    case 'SPRING_MASS': {
      drawSpringMassSystem(ctx, x, y, width, height, color, strokeWidth, data);
      break;
    }

    case 'PROJECTILE_MOTION': {
      drawProjectileTrajectory(ctx, x, y, width, height, color, strokeWidth, data);
      break;
    }

    case 'ELECTRIC_FIELD': {
      drawElectricField(ctx, x, y, width, height, color, strokeWidth, data);
      break;
    }

    case 'MAGNETIC_FIELD': {
      drawMagneticField(ctx, x, y, width, height, color, strokeWidth, data);
      break;
    }

    case 'CIRCUIT_RESISTOR':
    case 'CIRCUIT_CAPACITOR':
    case 'CIRCUIT_INDUCTOR':
    case 'CIRCUIT_BATTERY':
    case 'CIRCUIT_AC_SOURCE':
    case 'CIRCUIT_SWITCH': {
      drawCircuitSymbol(ctx, physicsType, x, y, width, height, color, strokeWidth, data);
      break;
    }
  }

  ctx.restore();
}

function drawFBD(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  color: string,
  strokeWidth: number,
  data: any
) {
  // Central point mass / box
  const boxS = 36;
  ctx.beginPath();
  ctx.rect(cx - boxS / 2, cy - boxS / 2, boxS, boxS);
  ctx.stroke();

  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(data.massValue || 'm', cx, cy);

  // 4 standard forces (Normal, Gravity, Tension/Pull, Friction)
  const fLen = Math.min(w, h) / 2 - 20;

  // Up: Normal Force
  drawForceArrow(ctx, cx, cy - boxS / 2, cx, cy - boxS / 2 - fLen, 'N (Normal)', 'top');
  // Down: Gravity
  drawForceArrow(ctx, cx, cy + boxS / 2, cx, cy + boxS / 2 + fLen, 'mg (Weight)', 'bottom');
  // Right: Applied Force / Pull
  drawForceArrow(ctx, cx + boxS / 2, cy, cx + boxS / 2 + fLen, cy, data.forceName || 'F (Applied)', 'right');
  // Left: Friction
  drawForceArrow(ctx, cx - boxS / 2, cy, cx - boxS / 2 - fLen, cy, 'f_s (Friction)', 'left');
}

function drawBlockOnSurface(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  fillColor: string | undefined,
  strokeWidth: number,
  data: any
) {
  const groundY = y + h - 16;
  const blockW = Math.min(w * 0.5, 90);
  const blockH = Math.min(h * 0.5, 60);
  const blockX = x + (w - blockW) / 2;
  const blockY = groundY - blockH;

  // Ground Line
  ctx.beginPath();
  ctx.moveTo(x, groundY);
  ctx.lineTo(x + w, groundY);
  ctx.stroke();

  // Ground Hatch marks (rough surface)
  ctx.strokeStyle = color + '88';
  ctx.lineWidth = 1.5;
  for (let gx = x; gx < x + w; gx += 10) {
    ctx.beginPath();
    ctx.moveTo(gx, groundY);
    ctx.lineTo(gx - 8, groundY + 12);
    ctx.stroke();
  }

  // Block
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.beginPath();
  ctx.rect(blockX, blockY, blockW, blockH);
  if (fillColor && fillColor !== 'transparent') {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  ctx.stroke();

  // Label
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Mass: ${data.massValue || 'M'}`, blockX + blockW / 2, blockY + blockH / 2);
}

function drawInclinedPlane(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  fillColor: string | undefined,
  strokeWidth: number,
  data: any
) {
  const baseY = y + h - 10;
  const apexY = y + 20;
  const angle = data.angleDeg || 30;

  // Wedge triangle
  ctx.beginPath();
  ctx.moveTo(x + 10, baseY);
  ctx.lineTo(x + w - 10, baseY);
  ctx.lineTo(x + w - 10, apexY);
  ctx.closePath();
  if (fillColor && fillColor !== 'transparent') {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  ctx.stroke();

  // Angle Arc
  ctx.beginPath();
  ctx.arc(x + 10, baseY, 36, 0, -((angle * Math.PI) / 180), true);
  ctx.stroke();
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`θ = ${angle}°`, x + 50, baseY - 8);

  // Block sitting on incline
  const inclineAngle = Math.atan2(baseY - apexY, (x + w - 10) - (x + 10));
  const midInclineX = x + 10 + (w - 20) * 0.55;
  const midInclineY = baseY - Math.sin(inclineAngle) * ((w - 20) * 0.55);

  ctx.save();
  ctx.translate(midInclineX, midInclineY);
  ctx.rotate(-inclineAngle);

  // Box on incline
  ctx.beginPath();
  ctx.rect(-20, -35, 40, 35);
  ctx.stroke();
  ctx.fillText('m', 0, -18);

  // Force component arrows (mg sin θ along plane, Normal perpendicular)
  ctx.restore();
}

function drawPulleySystem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  fillColor: string | undefined,
  strokeWidth: number,
  data: any
) {
  const cx = x + w / 2;
  const topY = y + 25;
  const pulleyR = 24;

  // Ceiling
  ctx.beginPath();
  ctx.moveTo(cx - 50, topY);
  ctx.lineTo(cx + 50, topY);
  ctx.stroke();

  // Support strut
  ctx.beginPath();
  ctx.moveTo(cx, topY);
  ctx.lineTo(cx, topY + 30);
  ctx.stroke();

  // Pulley Wheel
  const pulleyCenterY = topY + 30 + pulleyR;
  ctx.beginPath();
  ctx.arc(cx, pulleyCenterY, pulleyR, 0, Math.PI * 2);
  ctx.stroke();

  // Center axle
  ctx.beginPath();
  ctx.arc(cx, pulleyCenterY, 3, 0, Math.PI * 2);
  ctx.fill();

  // Left Rope & Mass 1
  const ropeLeftX = cx - pulleyR;
  const mass1Y = pulleyCenterY + h * 0.4;
  ctx.beginPath();
  ctx.moveTo(ropeLeftX, pulleyCenterY);
  ctx.lineTo(ropeLeftX, mass1Y);
  ctx.stroke();

  // Box 1
  ctx.beginPath();
  ctx.rect(ropeLeftX - 16, mass1Y, 32, 32);
  ctx.stroke();
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(data.massValue || 'm₁', ropeLeftX, mass1Y + 18);

  // Right Rope & Mass 2
  const ropeRightX = cx + pulleyR;
  const mass2Y = pulleyCenterY + h * 0.25;
  ctx.beginPath();
  ctx.moveTo(ropeRightX, pulleyCenterY);
  ctx.lineTo(ropeRightX, mass2Y);
  ctx.stroke();

  // Box 2
  ctx.beginPath();
  ctx.rect(ropeRightX - 20, mass2Y, 40, 40);
  ctx.stroke();
  ctx.fillText('m₂', ropeRightX, mass2Y + 22);

  // Tension annotations
  ctx.font = '10px sans-serif';
  ctx.fillText('T', ropeLeftX - 10, pulleyCenterY + 40);
  ctx.fillText('T', ropeRightX + 10, pulleyCenterY + 40);
}

function drawSpringMassSystem(
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
  const wallX = x + 20;

  // Rigid Wall
  ctx.beginPath();
  ctx.moveTo(wallX, y + 10);
  ctx.lineTo(wallX, y + h - 10);
  ctx.stroke();

  // Wall hatches
  for (let wy = y + 15; wy < y + h - 10; wy += 10) {
    ctx.beginPath();
    ctx.moveTo(wallX, wy);
    ctx.lineTo(wallX - 10, wy + 10);
    ctx.stroke();
  }

  // Spring Coils (Zig-zag)
  const springStartX = wallX;
  const springEndX = x + w - 80;
  const coils = 12;
  const coilW = (springEndX - springStartX) / coils;
  const coilAmp = 18;

  ctx.beginPath();
  ctx.moveTo(springStartX, cy);
  for (let i = 0; i < coils; i++) {
    const px = springStartX + (i + 0.5) * coilW;
    const py = cy + (i % 2 === 0 ? -coilAmp : coilAmp);
    ctx.lineTo(px, py);
  }
  ctx.lineTo(springEndX, cy);
  ctx.stroke();

  // Attached Block
  const blockW = 50;
  const blockH = 50;
  ctx.beginPath();
  ctx.rect(springEndX, cy - blockH / 2, blockW, blockH);
  ctx.stroke();

  // Labels
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(data.massValue || 'm', springEndX + blockW / 2, cy + 4);
  ctx.fillText(data.springK || 'k (Spring Constant)', (springStartX + springEndX) / 2, cy - coilAmp - 8);
}

function drawProjectileTrajectory(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  strokeWidth: number,
  data: any
) {
  const groundY = y + h - 20;
  const startX = x + 30;
  const endX = x + w - 30;
  const range = endX - startX;
  const maxH = h - 60;

  // Ground Line
  ctx.beginPath();
  ctx.moveTo(x, groundY);
  ctx.lineTo(x + w, groundY);
  ctx.stroke();

  // Parabolic Trajectory
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(startX, groundY);

  for (let i = 0; i <= 50; i++) {
    const t = i / 50;
    const px = startX + t * range;
    // Parabola 4 * H * t * (1 - t)
    const py = groundY - 4 * maxH * t * (1 - t);
    ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Initial velocity vector u
  const velLen = 50;
  const angleRad = (Math.PI * 35) / 180;
  const vTipX = startX + velLen * Math.cos(angleRad);
  const vTipY = groundY - velLen * Math.sin(angleRad);

  drawForceArrow(ctx, startX, groundY, vTipX, vTipY, data.launchVelocity || 'u (Initial Velocity)', 'right');

  // Max Height line H
  const midX = startX + range / 2;
  const apexY = groundY - maxH;
  ctx.strokeStyle = color + '88';
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(midX, groundY);
  ctx.lineTo(midX, apexY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = '10px sans-serif';
  ctx.fillText('H_max = u² sin²θ / 2g', midX + 8, (groundY + apexY) / 2);
  ctx.fillText('Range R = u² sin 2θ / g', midX, groundY + 16);
}

function drawElectricField(
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

  // Positive Charge (+Q) and Negative Charge (-Q) Dipole
  const q1X = x + w * 0.3;
  const q2X = x + w * 0.7;
  const qR = 16;

  // +Q Circle
  ctx.beginPath();
  ctx.arc(q1X, cy, qR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+q', q1X, cy);

  // -Q Circle
  ctx.beginPath();
  ctx.arc(q2X, cy, qR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillText('−q', q2X, cy);

  // Field Lines between + and -
  const lines = [-45, -25, 0, 25, 45];
  lines.forEach(offset => {
    ctx.beginPath();
    ctx.moveTo(q1X + qR, cy);
    ctx.quadraticCurveTo((q1X + q2X) / 2, cy + offset * 2.5, q2X - qR, cy);
    ctx.stroke();
  });
}

function drawMagneticField(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  strokeWidth: number,
  data: any
) {
  const isIntoPage = data.magFieldDir !== 'OUT_OF_PAGE';
  const rows = 4;
  const cols = 5;
  const cellW = w / (cols + 1);
  const cellH = h / (rows + 1);

  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const px = x + c * cellW;
      const py = y + r * cellH;

      ctx.beginPath();
      ctx.arc(px, py, 12, 0, Math.PI * 2);
      ctx.stroke();

      if (isIntoPage) {
        // Cross ⊗
        ctx.beginPath();
        ctx.moveTo(px - 6, py - 6);
        ctx.lineTo(px + 6, py + 6);
        ctx.moveTo(px + 6, py - 6);
        ctx.lineTo(px - 6, py + 6);
        ctx.stroke();
      } else {
        // Dot ⊙
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.fillText(
    isIntoPage ? 'Magnetic Field B⃗ (Into Page ⊗)' : 'Magnetic Field B⃗ (Out of Page ⊙)',
    x + w / 2,
    y + h - 10
  );
}

function drawCircuitSymbol(
  ctx: CanvasRenderingContext2D,
  type: PhysicsToolType,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  strokeWidth: number,
  data: any
) {
  const cy = y + h / 2;
  const leadLen = w * 0.25;

  // Left & Right lead wires
  ctx.beginPath();
  ctx.moveTo(x, cy);
  ctx.lineTo(x + leadLen, cy);
  ctx.moveTo(x + w - leadLen, cy);
  ctx.lineTo(x + w, cy);
  ctx.stroke();

  const midStartX = x + leadLen;
  const midEndX = x + w - leadLen;
  const midW = midEndX - midStartX;

  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';

  switch (type) {
    case 'CIRCUIT_RESISTOR': {
      // Resistor Zig-Zag
      const teeth = 6;
      const tW = midW / teeth;
      ctx.beginPath();
      ctx.moveTo(midStartX, cy);
      for (let i = 0; i < teeth; i++) {
        const tx = midStartX + (i + 0.5) * tW;
        const ty = cy + (i % 2 === 0 ? -15 : 15);
        ctx.lineTo(tx, ty);
      }
      ctx.lineTo(midEndX, cy);
      ctx.stroke();
      ctx.fillText(data.circuitValue || 'R (Resistor)', x + w / 2, cy - 20);
      break;
    }

    case 'CIRCUIT_CAPACITOR': {
      // Two parallel plates ||
      const plateH = 28;
      ctx.beginPath();
      ctx.moveTo(midStartX + midW * 0.4, cy - plateH / 2);
      ctx.lineTo(midStartX + midW * 0.4, cy + plateH / 2);
      ctx.moveTo(midStartX + midW * 0.6, cy - plateH / 2);
      ctx.lineTo(midStartX + midW * 0.6, cy + plateH / 2);
      ctx.stroke();
      ctx.fillText(data.circuitValue || 'C (Capacitor)', x + w / 2, cy - 20);
      break;
    }

    case 'CIRCUIT_INDUCTOR': {
      // Inductor Arcs
      const loops = 4;
      const lW = midW / loops;
      for (let i = 0; i < loops; i++) {
        ctx.beginPath();
        ctx.arc(midStartX + (i + 0.5) * lW, cy, lW / 2, Math.PI, 0);
        ctx.stroke();
      }
      ctx.fillText(data.circuitValue || 'L (Inductor)', x + w / 2, cy - 20);
      break;
    }

    case 'CIRCUIT_BATTERY': {
      // Long line (+) and short thick line (-)
      ctx.beginPath();
      // + plate
      ctx.moveTo(midStartX + midW * 0.4, cy - 20);
      ctx.lineTo(midStartX + midW * 0.4, cy + 20);
      ctx.stroke();

      // - plate
      ctx.lineWidth = strokeWidth + 2;
      ctx.beginPath();
      ctx.moveTo(midStartX + midW * 0.6, cy - 10);
      ctx.lineTo(midStartX + midW * 0.6, cy + 10);
      ctx.stroke();

      ctx.fillText(data.circuitValue || '+ V − (DC Source)', x + w / 2, cy - 26);
      break;
    }

    case 'CIRCUIT_AC_SOURCE': {
      // Circle with sine wave ~
      const r = 20;
      const mcx = x + w / 2;
      ctx.beginPath();
      ctx.arc(mcx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // ~ Sine inside
      ctx.beginPath();
      ctx.moveTo(mcx - 10, cy);
      ctx.quadraticCurveTo(mcx - 5, cy - 8, mcx, cy);
      ctx.quadraticCurveTo(mcx + 5, cy + 8, mcx + 10, cy);
      ctx.stroke();

      ctx.fillText(data.circuitValue || '~ AC Source', x + w / 2, cy - 26);
      break;
    }

    case 'CIRCUIT_SWITCH': {
      // Open / Closed Switch
      const p1X = midStartX + 10;
      const p2X = midEndX - 10;

      ctx.beginPath();
      ctx.arc(p1X, cy, 3, 0, Math.PI * 2);
      ctx.arc(p2X, cy, 3, 0, Math.PI * 2);
      ctx.fill();

      // Switch lever
      ctx.beginPath();
      ctx.moveTo(p1X, cy);
      ctx.lineTo(p2X - 4, cy - 14);
      ctx.stroke();

      ctx.fillText('Switch (Open)', x + w / 2, cy - 20);
      break;
    }
  }
}

function drawForceArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  label: string,
  labelPos: 'top' | 'bottom' | 'left' | 'right' = 'top'
) {
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // Arrowhead
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const headLen = 12;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
  ctx.stroke();

  // Label text
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let lx = toX;
  let ly = toY;
  if (labelPos === 'top') ly -= 12;
  if (labelPos === 'bottom') ly += 12;
  if (labelPos === 'right') lx += 36;
  if (labelPos === 'left') lx -= 36;

  ctx.fillText(label, lx, ly);
}
