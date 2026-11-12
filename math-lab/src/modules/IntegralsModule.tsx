import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import GlassPanel from '../components/ui/GlassPanel';
import SliderRow from '../components/ui/SliderRow';
import TabBar from '../components/ui/TabBar';
import { safeEval, drawGrid, worldToCanvas, plotFunction, numericalIntegral } from '../utils/math';

const TABS = [{ id: 'practical', label: 'Riemann Lab' }, { id: 'theory', label: 'Theory' }];
type SumType = 'left' | 'right' | 'midpoint';

export default function IntegralsModule() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState('practical');
  const [expr, setExpr] = useState('sin(x)');
  const [a, setA] = useState(0);
  const [b, setB] = useState(3.14159);
  const [n, setN] = useState(8);
  const [sumType, setSumType] = useState<SumType>('midpoint');
  const [animating, setAnimating] = useState(false);
  const animRef = useRef<number | null>(null);
  const [animN, setAnimN] = useState(8);
  const [panOffsetX, setPanOffsetX] = useState(0);
  const [panOffsetY, setPanOffsetY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const draw = useCallback((nOverride?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    const rectN = nOverride ?? n;

    const xRange = Math.max(b - a, 0.1) * 1.5;
    const xMin = (a + b) / 2 - xRange + panOffsetX;
    const xMax = (a + b) / 2 + xRange + panOffsetX;

    // y range from function
    const pts = plotFunction(expr, xMin, xMax, 300);
    const ys = pts.map(p => p.y).filter(y => isFinite(y) && !isNaN(y));
    const yPad = 1;
    const yMin = Math.min(-0.5, ...(ys.length ? [Math.min(...ys)] : [-2])) - yPad + panOffsetY;
    const yMax = Math.max(0.5, ...(ys.length ? [Math.max(...ys)] : [2])) + yPad + panOffsetY;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, w, h);
    drawGrid(ctx, xMin, xMax, yMin, yMax, w, h);

    // Draw Riemann rectangles
    const dx = (b - a) / rectN;
    for (let i = 0; i < rectN; i++) {
      let evalX: number;
      if (sumType === 'left') evalX = a + i * dx;
      else if (sumType === 'right') evalX = a + (i + 1) * dx;
      else evalX = a + (i + 0.5) * dx;

      const fy = safeEval(expr, { x: evalX }) ?? 0;
      const { cx: rx } = worldToCanvas(a + i * dx, 0, xMin, xMax, yMin, yMax, w, h);
      const { cx: rx2 } = worldToCanvas(a + (i + 1) * dx, 0, xMin, xMax, yMin, yMax, w, h);
      const { cy: ry0 } = worldToCanvas(0, 0, xMin, xMax, yMin, yMax, w, h);
      const { cy: ry } = worldToCanvas(0, fy, xMin, xMax, yMin, yMax, w, h);

      const rw = Math.max(1, rx2 - rx - 1);
      const rh = ry0 - ry;

      ctx.fillStyle = fy >= 0 ? 'rgba(59,130,246,0.3)' : 'rgba(239,68,68,0.3)';
      ctx.strokeStyle = fy >= 0 ? 'rgba(59,130,246,0.8)' : 'rgba(239,68,68,0.8)';
      ctx.lineWidth = 1;
      ctx.fillRect(rx, Math.min(ry, ry0), rw, Math.abs(rh));
      ctx.strokeRect(rx, Math.min(ry, ry0), rw, Math.abs(rh));
    }

    // Draw function curve
    ctx.save();
    ctx.strokeStyle = '#06B6D4';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#06B6D4';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    let penDown = false;
    for (const pt of pts) {
      if (isNaN(pt.y) || pt.y < yMin - 5 || pt.y > yMax + 5) { penDown = false; continue; }
      const { cx, cy } = worldToCanvas(pt.x, pt.y, xMin, xMax, yMin, yMax, w, h);
      if (!penDown) { ctx.moveTo(cx, cy); penDown = true; }
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.restore();

    // Boundary markers
    for (const bnd of [a, b]) {
      const { cx } = worldToCanvas(bnd, 0, xMin, xMax, yMin, yMax, w, h);
      ctx.save();
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
      ctx.restore();
    }

    // Result overlay
    const area = numericalIntegral(expr, a, b, Math.max(rectN, 100));
    ctx.save();
    ctx.fillStyle = 'rgba(15,20,35,0.85)';
    ctx.strokeStyle = 'rgba(59,130,246,0.4)';
    ctx.lineWidth = 1;
    roundRect(ctx, w - 160, 12, 148, 50, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#8B9CC0';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText(`n = ${rectN}`, w - 150, 32);
    ctx.fillStyle = '#3B82F6';
    ctx.font = 'bold 13px JetBrains Mono, monospace';
    ctx.fillText(`∫ ≈ ${area.toFixed(6)}`, w - 150, 52);
    ctx.restore();
  }, [expr, a, b, n, sumType, panOffsetX, panOffsetY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      draw();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onMouseDown = (e: MouseEvent) => {
      setIsPanning(true);
      setPanStart({ x: e.offsetX * devicePixelRatio, y: e.offsetY * devicePixelRatio });
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isPanning) return;
      const dx = e.offsetX * devicePixelRatio - panStart.x;
      const dy = e.offsetY * devicePixelRatio - panStart.y;
      // Use a lower pan factor for smoother dragging
      setPanOffsetX(prev => prev - dx * 0.0008);
      setPanOffsetY(prev => prev + dy * 0.0008); // y inverted
    };
    const onMouseUp = () => {
      setIsPanning(false);
    };
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isPanning, panStart]);

  const startAnimation = () => {
    if (animating) {
      setAnimating(false);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }
    setAnimating(true);
    let cur = 2;
    const step = () => {
      setAnimN(cur);
      draw(cur);
      cur = Math.min(cur + (cur < 20 ? 1 : cur < 50 ? 2 : cur < 100 ? 5 : 10), 200);
      if (cur <= 200) {
        animRef.current = requestAnimationFrame(step) as unknown as number;
      } else {
        setAnimating(false);
        setAnimN(n);
      }
    };
    animRef.current = requestAnimationFrame(step) as unknown as number;
  };

  useEffect(() => {
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <TabBar tabs={TABS} active={tab} onChange={setTab} color="#06B6D4" />
      {tab === 'theory' ? <IntegralTheory /> : (
        <div className="flex flex-1 flex-col lg:flex-row gap-4 min-h-0">
          <div className="flex-1 min-w-0 relative rounded-xl overflow-hidden">
            <canvas ref={canvasRef} className="w-full h-full" style={{ minHeight: 300 }} />
          </div>
          <div className="w-full lg:w-64 lg:overflow-y-auto flex flex-col gap-3 flex-shrink-0">
            <GlassPanel title="Function" accentColor="#06B6D4">
              <input type="text" value={expr} onChange={e => setExpr(e.target.value)} className="w-full text-sm" placeholder="e.g. sin(x)" />
            </GlassPanel>

            <GlassPanel title="Bounds" accentColor="#3B82F6">
              <SliderRow label="Lower bound (a)" value={a} min={-10} max={b - 0.1} onChange={setA} color="#3B82F6" />
              <SliderRow label="Upper bound (b)" value={b} min={a + 0.1} max={10} onChange={setB} color="#06B6D4" />
            </GlassPanel>

            <GlassPanel title="Riemann Sum" accentColor="#10B981">
              <div className="flex gap-2">
                {(['left', 'right', 'midpoint'] as SumType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setSumType(t)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                    style={{
                      background: sumType === t ? '#10B98125' : 'rgba(255,255,255,0.05)',
                      color: sumType === t ? '#10B981' : 'var(--text-secondary)',
                      border: sumType === t ? '1px solid #10B98140' : '1px solid transparent',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <SliderRow label={`Rectangles (n = ${animating ? animN : n})`} value={n} min={1} max={100} step={1} onChange={setN} color="#10B981" />
              <button
                onClick={startAnimation}
                className="w-full py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: animating ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                  color: animating ? '#EF4444' : '#10B981',
                  border: `1px solid ${animating ? '#EF444440' : '#10B98140'}`,
                }}
              >
                {animating ? 'Stop' : 'Animate n → ∞'}
              </button>
            </GlassPanel>

            <GlassPanel title="Presets" accentColor="#F59E0B">
              {[
                { label: 'π Area', expr: 'sin(x)', a: 0, b: 3.14159 },
                { label: 'Bell Curve', expr: 'exp(-x^2)', a: -3, b: 3 },
                { label: 'Log', expr: 'log(x+1)', a: 0, b: 4 },
                { label: 'Cubic', expr: 'x^3-3*x', a: -2, b: 2 },
              ].map(p => (
                <button
                  key={p.label}
                  onClick={() => { setExpr(p.expr); setA(p.a); setB(p.b); }}
                  className="text-left text-xs text-[var(--text-secondary)] hover:text-[#F59E0B] font-mono transition-colors py-0.5"
                >
                  {p.expr} [{p.a.toFixed(2)}, {p.b.toFixed(2)}]
                </button>
              ))}
            </GlassPanel>
          </div>
        </div>
      )}
    </div>
  );
}

function IntegralTheory() {
  return (
    <motion.div className="flex-1 overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-6">
          <h3 className="font-bold text-white mb-4">Fundamental Theorem of Calculus</h3>
          <div className="space-y-3 text-sm text-[var(--text-secondary)]">
            <div className="glass rounded-lg p-3 font-mono text-xs text-[#06B6D4]">∫_a^b f(x)dx = F(b) - F(a)</div>
            <p>If F is any antiderivative of f, the definite integral equals the difference of F at the bounds. Riemann sums approximate this as n → ∞.</p>
          </div>
        </div>
        <div className="glass rounded-xl p-6">
          <h3 className="font-bold text-white mb-4">Riemann Sum Types</h3>
          <div className="space-y-2 text-sm text-[var(--text-secondary)]">
            <div className="glass rounded-lg p-2 text-xs"><span className="text-[#3B82F6]">Left:</span> Sample at left edge of each sub-interval</div>
            <div className="glass rounded-lg p-2 text-xs"><span className="text-[#06B6D4]">Right:</span> Sample at right edge of each sub-interval</div>
            <div className="glass rounded-lg p-2 text-xs"><span className="text-[#10B981]">Midpoint:</span> Sample at center — most accurate</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
