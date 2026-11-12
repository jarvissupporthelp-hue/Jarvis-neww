import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import TabBar from '../components/ui/TabBar';
import GlassPanel from '../components/ui/GlassPanel';
import SliderRow from '../components/ui/SliderRow';
import { safeEval, plotFunction, drawGrid, worldToCanvas } from '../utils/math';

const TABS = [{ id: 'practical', label: 'Limit Explorer' }, { id: 'theory', label: 'Theory' }];

export default function LimitsModule() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState('practical');
  const [expr, setExpr] = useState('sin(x)/x');
  const [c, setC] = useState(0);
  const [epsilon, setEpsilon] = useState(0.5);
  const [t, setT] = useState(0);
  const animRef = useRef<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const [panOffsetX, setPanOffsetX] = useState(0);
  const [panOffsetY, setPanOffsetY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const draw = useCallback((tOverride?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    const tVal = tOverride ?? t;

    const xMin = c - 3 + panOffsetX, xMax = c + 3 + panOffsetX, yMin = -2.5 + panOffsetY, yMax = 2.5 + panOffsetY;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, w, h);
    drawGrid(ctx, xMin, xMax, yMin, yMax, w, h);

    // Epsilon tube
    const limitVal = safeEval(expr.replace(/x/g, `(${c}+1e-9)`), {});
    const L = limitVal ?? safeEval(expr, { x: c + 1e-7 }) ?? 0;

    const { cy: ey1 } = worldToCanvas(0, L + epsilon, xMin, xMax, yMin, yMax, w, h);
    const { cy: ey2 } = worldToCanvas(0, L - epsilon, xMin, xMax, yMin, yMax, w, h);
    ctx.save();
    ctx.fillStyle = 'rgba(16,185,129,0.07)';
    ctx.fillRect(0, Math.min(ey1, ey2), w, Math.abs(ey2 - ey1));
    ctx.strokeStyle = 'rgba(16,185,129,0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0, ey1); ctx.lineTo(w, ey1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, ey2); ctx.lineTo(w, ey2); ctx.stroke();
    ctx.restore();

    // Delta interval (derived from epsilon)
    const delta = epsilon * 0.8;
    const { cx: dx1 } = worldToCanvas(c - delta, 0, xMin, xMax, yMin, yMax, w, h);
    const { cx: dx2 } = worldToCanvas(c + delta, 0, xMin, xMax, yMin, yMax, w, h);
    ctx.save();
    ctx.fillStyle = 'rgba(239,68,68,0.07)';
    ctx.fillRect(dx1, 0, dx2 - dx1, h);
    ctx.strokeStyle = 'rgba(239,68,68,0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(dx1, 0); ctx.lineTo(dx1, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(dx2, 0); ctx.lineTo(dx2, h); ctx.stroke();
    ctx.restore();

    // Function curve
    const pts = plotFunction(expr, xMin, xMax, 400);
    ctx.save();
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#3B82F6';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    let penDown = false;
    for (const pt of pts) {
      if (isNaN(pt.y) || pt.y < yMin - 2 || pt.y > yMax + 2) { penDown = false; continue; }
      const { cx, cy } = worldToCanvas(pt.x, pt.y, xMin, xMax, yMin, yMax, w, h);
      if (!penDown) { ctx.moveTo(cx, cy); penDown = true; }
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.restore();

    // Limit point (hole indicator)
    const { cx: lcx, cy: lcy } = worldToCanvas(c, L, xMin, xMax, yMin, yMax, w, h);
    ctx.save();
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#0B0E14';
    ctx.beginPath(); ctx.arc(lcx, lcy, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();

    // Animated point approaching from both sides
    const direction = Math.sin(tVal * Math.PI * 2) > 0 ? 1 : -1;
    const progress = Math.abs(Math.sin(tVal * Math.PI * 2));
    const pxApproach = c + direction * (1 - progress) * 2.5;
    const pyApproach = safeEval(expr, { x: pxApproach });
    if (pyApproach !== null) {
      const { cx: px, cy: py } = worldToCanvas(pxApproach, pyApproach, xMin, xMax, yMin, yMax, w, h);
      ctx.save();
      ctx.fillStyle = direction > 0 ? '#F59E0B' : '#EC4899';
      ctx.shadowColor = direction > 0 ? '#F59E0B' : '#EC4899';
      ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Labels overlay
    ctx.save();
    ctx.fillStyle = 'rgba(15,20,35,0.88)';
    ctx.strokeStyle = 'rgba(59,130,246,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(12, h - 70, 200, 58, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8B9CC0'; ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText(`lim (x→${c}) ${expr}`, 22, h - 52);
    ctx.fillStyle = '#3B82F6'; ctx.font = 'bold 13px JetBrains Mono, monospace';
    ctx.fillText(`≈ ${L.toFixed(6)}`, 22, h - 30);
    ctx.fillStyle = 'rgba(139,156,192,0.6)'; ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText(`ε = ${epsilon.toFixed(2)}, δ = ${delta.toFixed(2)}`, 22, h - 14);
    ctx.restore();
  }, [expr, c, epsilon, t, panOffsetX, panOffsetY]);

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
      setPanOffsetX(prev => prev - dx * 0.0008);
      setPanOffsetY(prev => prev + dy * 0.0008);
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

  const toggleAnimation = () => {
    if (animating) {
      setAnimating(false);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }
    setAnimating(true);
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const elapsed = (ts - start) / 3000;
      setT(elapsed);
      draw(elapsed);
      animRef.current = requestAnimationFrame(step) as unknown as number;
    };
    animRef.current = requestAnimationFrame(step) as unknown as number;
  };

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  return (
    <div className="flex flex-col h-full">
      <TabBar tabs={TABS} active={tab} onChange={setTab} color="#EF4444" />
      {tab === 'theory' ? <LimitTheory /> : (
        <div className="flex flex-1 flex-col lg:flex-row gap-4 min-h-0">
          <div className="flex-1 min-w-0 relative rounded-xl overflow-hidden">
            <canvas ref={canvasRef} className="w-full h-full" style={{ minHeight: 300 }} />
          </div>
          <div className="w-full lg:w-64 lg:overflow-y-auto flex flex-col gap-3 flex-shrink-0">
            <GlassPanel title="Expression" accentColor="#EF4444">
              <input type="text" value={expr} onChange={e => setExpr(e.target.value)} className="w-full" placeholder="e.g. sin(x)/x" />
            </GlassPanel>
            <GlassPanel title="Approach Point" accentColor="#3B82F6">
              <SliderRow label="c (approach)" value={c} min={-5} max={5} step={0.1} onChange={setC} color="#3B82F6" />
            </GlassPanel>
            <GlassPanel title="Epsilon-Delta" accentColor="#10B981">
              <SliderRow label="ε (epsilon)" value={epsilon} min={0.05} max={2} step={0.05} onChange={setEpsilon} color="#10B981" />
              <p className="text-xs text-[var(--text-muted)]">Green band = ε-tube around L. Red band = δ-interval around c.</p>
              <button
                onClick={toggleAnimation}
                className="w-full py-2 rounded-lg text-sm font-medium transition-all mt-1"
                style={{
                  background: animating ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)',
                  color: animating ? '#EF4444' : '#3B82F6',
                }}
              >
                {animating ? 'Stop' : 'Animate Approach'}
              </button>
            </GlassPanel>
            <GlassPanel title="Classic Limits" accentColor="#F59E0B">
              {[
                { expr: 'sin(x)/x', c: 0, label: 'lim sin(x)/x' },
                { expr: '(1 + 1/x)^x', c: 1000, label: 'lim (1+1/x)^x' },
                { expr: '(x^2-1)/(x-1)', c: 1, label: 'Removable' },
                { expr: 'abs(x)/x', c: 0, label: 'Step (DNE)' },
              ].map(p => (
                <button key={p.label} onClick={() => { setExpr(p.expr); setC(p.c); }} className="text-left text-xs text-[var(--text-secondary)] hover:text-[#F59E0B] font-mono transition-colors py-0.5">
                  {p.label}
                </button>
              ))}
            </GlassPanel>
          </div>
        </div>
      )}
    </div>
  );
}

function LimitTheory() {
  return (
    <motion.div className="flex-1 overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-6">
          <h3 className="font-bold text-white mb-4">Epsilon-Delta Definition</h3>
          <div className="glass rounded-lg p-3 font-mono text-xs text-[#EF4444] mb-3">lim_(x→c) f(x) = L</div>
          <p className="text-sm text-[var(--text-secondary)]">For every ε {">"} 0, there exists δ {">"} 0 such that if 0 {"<"} |x - c| {"<"} δ, then |f(x) - L| {"<"} ε.</p>
        </div>
        <div className="glass rounded-xl p-6">
          <h3 className="font-bold text-white mb-4">One-Sided Limits</h3>
          <p className="text-sm text-[var(--text-secondary)]">A limit exists only if both one-sided limits agree:</p>
          <div className="space-y-2 mt-3">
            <div className="glass rounded-lg p-2 text-xs font-mono text-[#3B82F6]">lim_(x→c⁻) f(x) = L (left)</div>
            <div className="glass rounded-lg p-2 text-xs font-mono text-[#10B981]">lim_(x→c⁺) f(x) = L (right)</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
