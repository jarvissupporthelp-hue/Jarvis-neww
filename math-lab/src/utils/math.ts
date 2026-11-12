import { evaluate, derivative, parse } from 'mathjs';

export function safeEval(expr: string, scope: Record<string, number>): number | null {
  try {
    const result = evaluate(expr, scope);
    if (typeof result !== 'number' || !isFinite(result) || isNaN(result)) return null;
    return result;
  } catch {
    return null;
  }
}

export function plotFunction(
  expr: string,
  xMin: number,
  xMax: number,
  samples = 500
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const dx = (xMax - xMin) / samples;
  for (let i = 0; i <= samples; i++) {
    const x = xMin + i * dx;
    const y = safeEval(expr, { x });
    if (y !== null) points.push({ x, y });
    else points.push({ x, y: NaN });
  }
  return points;
}

export function computeDerivative(expr: string, order: 1 | 2 | 3 = 1): string | null {
  try {
    let node = parse(expr);
    for (let i = 0; i < order; i++) {
      node = derivative(node, 'x');
    }
    return node.toString();
  } catch {
    return null;
  }
}

export function findRoots(expr: string, xMin: number, xMax: number): number[] {
  const roots: number[] = [];
  const samples = 1000;
  const dx = (xMax - xMin) / samples;
  let prevY = safeEval(expr, { x: xMin });
  for (let i = 1; i <= samples; i++) {
    const x = xMin + i * dx;
    const y = safeEval(expr, { x });
    if (prevY !== null && y !== null && prevY * y < 0) {
      const root = x - dx * y / (y - prevY);
      roots.push(root);
    }
    prevY = y;
  }
  return roots;
}

export function findExtrema(expr: string, xMin: number, xMax: number): { x: number; y: number; type: 'max' | 'min' }[] {
  const result: { x: number; y: number; type: 'max' | 'min' }[] = [];
  const dExpr = computeDerivative(expr, 1);
  if (!dExpr) return result;
  const roots = findRoots(dExpr, xMin, xMax);
  const d2Expr = computeDerivative(expr, 2);
  for (const x of roots) {
    const y = safeEval(expr, { x });
    if (y === null) continue;
    if (d2Expr) {
      const d2 = safeEval(d2Expr, { x });
      if (d2 !== null && d2 > 0) result.push({ x, y, type: 'min' });
      else if (d2 !== null && d2 < 0) result.push({ x, y, type: 'max' });
    }
  }
  return result;
}

export function numericalIntegral(expr: string, a: number, b: number, n: number): number {
  const dx = (b - a) / n;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const xMid = a + (i + 0.5) * dx;
    const y = safeEval(expr, { x: xMid });
    if (y !== null) sum += y * dx;
  }
  return sum;
}

export function worldToCanvas(
  worldX: number,
  worldY: number,
  viewXMin: number,
  viewXMax: number,
  viewYMin: number,
  viewYMax: number,
  canvasW: number,
  canvasH: number
): { cx: number; cy: number } {
  const cx = ((worldX - viewXMin) / (viewXMax - viewXMin)) * canvasW;
  const cy = canvasH - ((worldY - viewYMin) / (viewYMax - viewYMin)) * canvasH;
  return { cx, cy };
}

export function canvasToWorld(
  cx: number,
  cy: number,
  viewXMin: number,
  viewXMax: number,
  viewYMin: number,
  viewYMax: number,
  canvasW: number,
  canvasH: number
): { wx: number; wy: number } {
  const wx = viewXMin + (cx / canvasW) * (viewXMax - viewXMin);
  const wy = viewYMin + ((canvasH - cy) / canvasH) * (viewYMax - viewYMin);
  return { wx, wy };
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  xMin: number, xMax: number, yMin: number, yMax: number,
  w: number, h: number
) {
  ctx.save();
  ctx.strokeStyle = 'rgba(59,130,246,0.08)';
  ctx.lineWidth = 1;

  const xRange = xMax - xMin;
  const yRange = yMax - yMin;
  const gridX = niceStep(xRange / 8);
  const gridY = niceStep(yRange / 8);

  const startX = Math.ceil(xMin / gridX) * gridX;
  for (let x = startX; x <= xMax; x += gridX) {
    const { cx } = worldToCanvas(x, 0, xMin, xMax, yMin, yMax, w, h);
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.stroke();
  }

  const startY = Math.ceil(yMin / gridY) * gridY;
  for (let y = startY; y <= yMax; y += gridY) {
    const { cy } = worldToCanvas(0, y, xMin, xMax, yMin, yMax, w, h);
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();
  }

  // Axes
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1.5;
  const { cx: x0 } = worldToCanvas(0, 0, xMin, xMax, yMin, yMax, w, h);
  const { cy: y0 } = worldToCanvas(0, 0, xMin, xMax, yMin, yMax, w, h);
  ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(w, y0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0, h); ctx.stroke();

  // Axis labels
  ctx.fillStyle = 'rgba(139,156,192,0.7)';
  ctx.font = '10px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  for (let x = Math.ceil(xMin / gridX) * gridX; x <= xMax; x += gridX) {
    if (Math.abs(x) < gridX * 0.01) continue;
    const { cx } = worldToCanvas(x, 0, xMin, xMax, yMin, yMax, w, h);
    const labelY = Math.min(Math.max(y0 + 14, 14), h - 4);
    ctx.fillText(x.toFixed(Math.abs(x) < 1 ? 2 : 1), cx, labelY);
  }
  ctx.textAlign = 'right';
  for (let y = Math.ceil(yMin / gridY) * gridY; y <= yMax; y += gridY) {
    if (Math.abs(y) < gridY * 0.01) continue;
    const { cy } = worldToCanvas(0, y, xMin, xMax, yMin, yMax, w, h);
    const labelX = Math.min(Math.max(x0 - 4, 4), w - 4);
    ctx.fillText(y.toFixed(Math.abs(y) < 1 ? 2 : 1), labelX, cy + 4);
  }

  ctx.restore();
}

function niceStep(roughStep: number): number {
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const residual = roughStep / magnitude;
  if (residual < 1.5) return magnitude;
  if (residual < 3.5) return 2 * magnitude;
  if (residual < 7.5) return 5 * magnitude;
  return 10 * magnitude;
}
