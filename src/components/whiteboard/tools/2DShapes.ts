import { Shape2DElement, Shape2DType } from '../types';

export function draw2DShape(ctx: CanvasRenderingContext2D, element: Shape2DElement) {
  const { shape, x, y, width, height, color, fillColor, strokeWidth, strokeDash, rotation = 0, label } = element;

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2);
  if (rotation) {
    ctx.rotate((rotation * Math.PI) / 180);
  }
  ctx.translate(-(x + width / 2), -(y + height / 2));

  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (strokeDash === 'DASHED') {
    ctx.setLineDash([strokeWidth * 3, strokeWidth * 2]);
  } else if (strokeDash === 'DOTTED') {
    ctx.setLineDash([strokeWidth, strokeWidth * 1.5]);
  } else {
    ctx.setLineDash([]);
  }

  const applyFillAndStroke = () => {
    if (fillColor && fillColor !== 'transparent') {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    ctx.stroke();
  };

  const drawArrowHead = (fromX: number, fromY: number, toX: number, toY: number, headLen = 14) => {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLen * Math.cos(angle - Math.PI / 6),
      toY - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLen * Math.cos(angle + Math.PI / 6),
      toY - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  };

  switch (shape) {
    case 'LINE': {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + width, y + height);
      ctx.stroke();
      break;
    }

    case 'ARROW': {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + width, y + height);
      ctx.stroke();
      drawArrowHead(x, y, x + width, y + height);
      break;
    }

    case 'DOUBLE_ARROW': {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + width, y + height);
      ctx.stroke();
      drawArrowHead(x, y, x + width, y + height);
      drawArrowHead(x + width, y + height, x, y);
      break;
    }

    case 'RECTANGLE': {
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      applyFillAndStroke();
      break;
    }

    case 'ROUNDED_RECT': {
      const radius = Math.min(16, Math.abs(width) / 4, Math.abs(height) / 4);
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
      applyFillAndStroke();
      break;
    }

    case 'SQUARE': {
      const side = Math.min(Math.abs(width), Math.abs(height));
      const sx = width < 0 ? x - side : x;
      const sy = height < 0 ? y - side : y;
      ctx.beginPath();
      ctx.rect(sx, sy, side, side);
      applyFillAndStroke();
      break;
    }

    case 'CIRCLE': {
      const radius = Math.min(Math.abs(width), Math.abs(height)) / 2;
      const cx = x + width / 2;
      const cy = y + height / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      applyFillAndStroke();
      break;
    }

    case 'ELLIPSE': {
      const cx = x + width / 2;
      const cy = y + height / 2;
      const rx = Math.abs(width) / 2;
      const ry = Math.abs(height) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
      applyFillAndStroke();
      break;
    }

    case 'TRIANGLE': {
      ctx.beginPath();
      ctx.moveTo(x + width / 2, y);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      applyFillAndStroke();
      break;
    }

    case 'RIGHT_TRIANGLE': {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + height);
      ctx.lineTo(x + width, y + height);
      ctx.closePath();
      applyFillAndStroke();

      // Draw right-angle marker
      const markerSize = Math.min(16, Math.abs(width) / 5, Math.abs(height) / 5);
      ctx.beginPath();
      ctx.moveTo(x, y + height - markerSize);
      ctx.lineTo(x + markerSize, y + height - markerSize);
      ctx.lineTo(x + markerSize, y + height);
      ctx.stroke();
      break;
    }

    case 'PARALLELOGRAM': {
      const offset = width * 0.25;
      ctx.beginPath();
      ctx.moveTo(x + offset, y);
      ctx.lineTo(x + width, y);
      ctx.lineTo(x + width - offset, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      applyFillAndStroke();
      break;
    }

    case 'RHOMBUS': {
      ctx.beginPath();
      ctx.moveTo(x + width / 2, y);
      ctx.lineTo(x + width, y + height / 2);
      ctx.lineTo(x + width / 2, y + height);
      ctx.lineTo(x, y + height / 2);
      ctx.closePath();
      applyFillAndStroke();
      break;
    }

    case 'TRAPEZIUM': {
      const topInset = width * 0.2;
      ctx.beginPath();
      ctx.moveTo(x + topInset, y);
      ctx.lineTo(x + width - topInset, y);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      applyFillAndStroke();
      break;
    }

    case 'PENTAGON': {
      drawRegularPolygon(ctx, x + width / 2, y + height / 2, Math.min(Math.abs(width), Math.abs(height)) / 2, 5);
      applyFillAndStroke();
      break;
    }

    case 'HEXAGON': {
      drawRegularPolygon(ctx, x + width / 2, y + height / 2, Math.min(Math.abs(width), Math.abs(height)) / 2, 6);
      applyFillAndStroke();
      break;
    }

    case 'OCTAGON': {
      drawRegularPolygon(ctx, x + width / 2, y + height / 2, Math.min(Math.abs(width), Math.abs(height)) / 2, 8);
      applyFillAndStroke();
      break;
    }

    case 'ARC': {
      const cx = x + width / 2;
      const cy = y + height / 2;
      const rx = Math.abs(width) / 2;
      const ry = Math.abs(height) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI);
      ctx.stroke();
      break;
    }

    case 'SECTOR': {
      const cx = x + width / 2;
      const cy = y + height / 2;
      const r = Math.min(Math.abs(width), Math.abs(height)) / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, -Math.PI / 4, Math.PI / 4);
      ctx.closePath();
      applyFillAndStroke();
      break;
    }
  }

  // Draw optional text label on the shape
  if (label) {
    ctx.fillStyle = color;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + width / 2, y + height / 2);
  }

  ctx.restore();
}

function drawRegularPolygon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  sides: number
) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
    const px = cx + radius * Math.cos(angle);
    const py = cy + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}
