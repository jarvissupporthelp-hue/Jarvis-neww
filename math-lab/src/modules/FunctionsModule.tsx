import { useEffect, useRef, useState, useCallback } from 'react';
import { Plus, Trash2, Download } from 'lucide-react';
import GlassPanel from '../components/ui/GlassPanel';
import SliderRow from '../components/ui/SliderRow';
import TabBar from '../components/ui/TabBar';
import { plotFunction, computeDerivative, findRoots, findExtrema, drawGrid, worldToCanvas } from '../utils/math';

const COLORS = ['#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];
const TABS = [
  { id: 'practical', label: 'Plotter' },
  { id: 'theory', label: 'Theory' },
];

interface Expr {
  id: number;
  expr: string;
  color: string;
  visible: boolean;
  showD1: boolean;
  showD2: boolean;
}

let idCounter = 1;

export default function FunctionsModule() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState('practical');
  const [exprs, setExprs] = useState<Expr[]>([
    { id: idCounter++, expr: 'sin(x)', color: COLORS[0], visible: true, showD1: false, showD2: false },
  ]);
  const [xMin, setXMin] = useState(-8);
  const [xMax, setXMax] = useState(8);
  const [yMin, setYMin] = useState(-4);
  const [yMax, setYMax] = useState(4);
  const [showRoots, setShowRoots] = useState(true);
  const [showExtrema, setShowExtrema] = useState(true);
  const [error, setError] = useState('');
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, xMin: 0, xMax: 0, yMin: 0, yMax: 0 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width: w, height: h } = canvas;
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, w, h);
    drawGrid(ctx, xMin, xMax, yMin, yMax, w, h);

    for (const e of exprs) {
      if (!e.visible) continue;
      try {
        drawCurve(ctx, e.expr, e.color, 2.5, xMin, xMax, yMin, yMax, w, h);

        if (e.showD1) {
          const d1 = computeDerivative(e.expr, 1);
          if (d1) drawCurve(ctx, d1, e.color, 1.5, xMin, xMax, yMin, yMax, w, h, [6, 4]);
        }
        if (e.showD2) {
          const d2 = computeDerivative(e.expr, 2);
          if (d2) drawCurve(ctx, d2, e.color, 1, xMin, xMax, yMin, yMax, w, h, [2, 4]);
        }

        if (showRoots) {
          const roots = findRoots(e.expr, xMin, xMax);
          for (const rx of roots) {
            const { cx, cy } = worldToCanvas(rx, 0, xMin, xMax, yMin, yMax, w, h);
            ctx.beginPath();
            ctx.arc(cx, cy, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#10B981';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }

        if (showExtrema) {
          const ext = findExtrema(e.expr, xMin, xMax);
          for (const { x, y, type } of ext) {
            const { cx, cy } = worldToCanvas(x, y, xMin, xMax, yMin, yMax, w, h);
            ctx.beginPath();
            ctx.arc(cx, cy, 5, 0, Math.PI * 2);
            ctx.fillStyle = type === 'max' ? '#F59E0B' : '#EF4444';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
      } catch {
        setError('Expression error');
      }
    }
  }, [exprs, xMin, xMax, yMin, yMax, showRoots, showExtrema]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      canvas.style.width = canvas.offsetWidth + 'px';
      canvas.style.height = canvas.offsetHeight + 'px';
      draw();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      const cx = (xMax + xMin) / 2, cy = (yMax + yMin) / 2;
      const rx = (xMax - xMin) / 2 * factor, ry = (yMax - yMin) / 2 * factor;
      setXMin(cx - rx); setXMax(cx + rx); setYMin(cy - ry); setYMax(cy + ry);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [xMin, xMax, yMin, yMax]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onMouseDown = (e: MouseEvent) => {
      setIsPanning(true);
      setPanStart({
        x: e.offsetX * devicePixelRatio,
        y: e.offsetY * devicePixelRatio,
        xMin, xMax, yMin, yMax
      });
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isPanning) return;
      const dx = e.offsetX * devicePixelRatio - panStart.x;
      const dy = e.offsetY * devicePixelRatio - panStart.y;
      const worldDx = dx / canvas.width * (panStart.xMax - panStart.xMin) * 0.25;
      const worldDy = dy / canvas.height * (panStart.yMax - panStart.yMin) * 0.25;
      setXMin(panStart.xMin - worldDx);
      setXMax(panStart.xMax - worldDx);
      setYMin(panStart.yMin + worldDy); // Note: y is inverted
      setYMax(panStart.yMax + worldDy);
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
  }, [isPanning, panStart, xMin, xMax, yMin, yMax]);

  const exportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'mathspace-function.png';
    a.click();
  };

  const addExpr = () => {
    if (exprs.length >= 5) return;
    setExprs(prev => [...prev, {
      id: idCounter++,
      expr: 'cos(x)',
      color: COLORS[prev.length % COLORS.length],
      visible: true,
      showD1: false,
      showD2: false,
    }]);
  };

  const updateExpr = (id: number, field: keyof Expr, value: unknown) => {
    setExprs(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const removeExpr = (id: number) => setExprs(prev => prev.filter(e => e.id !== id));

  return (
      <div className="flex flex-col h-full">
        <TabBar tabs={TABS} active={tab} onChange={setTab} color="#3B82F6" />

      {tab === 'theory' ? (
        <TheoryPanel />
      ) : (
        <div className="flex flex-1 flex-col lg:flex-row gap-4 min-h-0">
          {/* Canvas */}
          <div className="flex-1 min-w-0 relative rounded-xl overflow-hidden">
            <canvas ref={canvasRef} className="w-full h-full" style={{ minHeight: 300 }} />
            {error && (
              <div className="absolute bottom-4 left-4 glass rounded-lg px-3 py-2 text-xs text-[#EF4444]">
                {error}
              </div>
            )}
            <button
              onClick={exportPNG}
              className="absolute top-3 right-3 glass px-3 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <Download size={12} /> Export PNG
            </button>
          </div>

          {/* Controls */}
          <div className="w-full lg:w-64 lg:overflow-y-auto flex flex-col gap-3 flex-shrink-0">
            <GlassPanel title="Expressions" accentColor="#3B82F6">
              {exprs.map((e) => (
                <div key={e.id} className="flex flex-col gap-2 pb-3 border-b border-[var(--border)] last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: e.color }} />
                    <input
                      type="text"
                      value={e.expr}
                      onChange={ev => { setError(''); updateExpr(e.id, 'expr', ev.target.value); }}
                      className="flex-1 text-xs"
                      placeholder="e.g. sin(x)"
                    />
                    {exprs.length > 1 && (
                      <button onClick={() => removeExpr(e.id)} className="text-[var(--text-muted)] hover:text-[#EF4444]">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3 text-xs">
                    <label className="flex items-center gap-1 text-[var(--text-muted)] cursor-pointer">
                      <input type="checkbox" checked={e.showD1} onChange={ev => updateExpr(e.id, 'showD1', ev.target.checked)} className="w-3 h-3" />
                      f'(x)
                    </label>
                    <label className="flex items-center gap-1 text-[var(--text-muted)] cursor-pointer">
                      <input type="checkbox" checked={e.showD2} onChange={ev => updateExpr(e.id, 'showD2', ev.target.checked)} className="w-3 h-3" />
                      f''(x)
                    </label>
                  </div>
                </div>
              ))}
              {exprs.length < 5 && (
                <button onClick={addExpr} className="flex items-center gap-2 text-xs text-[#3B82F6] hover:text-[#60A5FA] transition-colors mt-1">
                  <Plus size={12} /> Add Expression
                </button>
              )}
            </GlassPanel>

            <GlassPanel title="View" accentColor="#06B6D4">
              <SliderRow label="X Min" value={xMin} min={-20} max={-0.1} onChange={setXMin} color="#06B6D4" />
              <SliderRow label="X Max" value={xMax} min={0.1} max={20} onChange={setXMax} color="#06B6D4" />
              <SliderRow label="Y Min" value={yMin} min={-20} max={-0.1} onChange={setYMin} color="#10B981" />
              <SliderRow label="Y Max" value={yMax} min={0.1} max={20} onChange={setYMax} color="#10B981" />
            </GlassPanel>

            <GlassPanel title="Points of Interest" accentColor="#F59E0B">
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input type="checkbox" checked={showRoots} onChange={e => setShowRoots(e.target.checked)} />
                <span className="w-3 h-3 rounded-full bg-[#10B981] inline-block" /> Roots (zeros)
              </label>
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input type="checkbox" checked={showExtrema} onChange={e => setShowExtrema(e.target.checked)} />
                <span className="w-3 h-3 rounded-full bg-[#F59E0B] inline-block" /> Maxima / Minima
              </label>
            </GlassPanel>

            <GlassPanel title="Quick Presets" accentColor="#10B981">
              {[
                { label: 'Sine Wave', expr: 'sin(x)' },
                { label: 'Parabola', expr: 'x^2 - 2' },
                { label: 'Cubic', expr: 'x^3 - 3*x' },
                { label: 'Butterfly', expr: 'sin(x)*cos(x/2)' },
                { label: 'Rational', expr: '1/(x^2+1)' },
              ].map(p => (
                <button
                  key={p.label}
                  onClick={() => setExprs([{ id: idCounter++, expr: p.expr, color: COLORS[0], visible: true, showD1: false, showD2: false }])}
                  className="text-left text-xs text-[var(--text-secondary)] hover:text-[#10B981] font-mono transition-colors py-0.5"
                >
                  {p.expr}
                </button>
              ))}
            </GlassPanel>
          </div>
        </div>
      )}
    </div>
  );
}

function drawCurve(
  ctx: CanvasRenderingContext2D,
  expr: string,
  color: string,
  lineWidth: number,
  xMin: number, xMax: number, yMin: number, yMax: number,
  w: number, h: number,
  dash: number[] = []
) {
  const pts = plotFunction(expr, xMin, xMax, 600);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(dash);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = lineWidth > 2 ? 8 : 3;
  ctx.beginPath();
  let penDown = false;
  for (const pt of pts) {
    if (isNaN(pt.y) || pt.y < yMin - 10 || pt.y > yMax + 10) {
      penDown = false;
      continue;
    }
    const { cx, cy } = worldToCanvas(pt.x, pt.y, xMin, xMax, yMin, yMax, w, h);
    if (!penDown) { ctx.moveTo(cx, cy); penDown = true; }
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();
  ctx.restore();
}

function TheoryPanel() {
  return (
    <div
      className="flex-1 overflow-y-auto pr-2"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-6">
          <h3 className="font-bold text-white mb-4 text-lg">Derivatives</h3>
          <div className="space-y-3 text-sm text-[var(--text-secondary)]">
            <p>The derivative f'(x) measures the instantaneous rate of change of f at x.</p>
            <div className="glass rounded-lg p-3 font-mono text-xs text-[#06B6D4]">
              f'(x) = lim_(h→0) [f(x+h) - f(x)] / h
            </div>
            <ul className="space-y-1 text-xs">
              <li>• d/dx[xⁿ] = n·xⁿ⁻¹ (Power Rule)</li>
              <li>• d/dx[sin x] = cos x</li>
              <li>• d/dx[eˣ] = eˣ (unique!)</li>
              <li>• d/dx[ln x] = 1/x</li>
            </ul>
          </div>
        </div>
        <div className="glass rounded-xl p-6">
          <h3 className="font-bold text-white mb-4 text-lg">Critical Points</h3>
          <div className="space-y-3 text-sm text-[var(--text-secondary)]">
            <p>Critical points occur where f'(x) = 0 or is undefined.</p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="glass rounded-lg p-3">
                <div className="text-[#F59E0B] font-semibold mb-1">Maximum</div>
                <div>f'(x) = 0 and f''(x) &lt; 0</div>
              </div>
              <div className="glass rounded-lg p-3">
                <div className="text-[#EF4444] font-semibold mb-1">Minimum</div>
                <div>f'(x) = 0 and f''(x) &gt; 0</div>
              </div>
            </div>
          </div>
        </div>
        <div className="glass rounded-xl p-6 md:col-span-2">
          <h3 className="font-bold text-white mb-4 text-lg">Quick Tips</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { tip: 'Use ^ for exponents', ex: 'x^3' },
              { tip: 'Trigonometric functions', ex: 'sin(x), cos(x)' },
              { tip: 'Logarithms', ex: 'log(x), log2(x)' },
              { tip: 'Constants', ex: 'pi, e, sqrt(2)' },
            ].map(t => (
              <div key={t.tip} className="glass rounded-lg p-3">
                <div className="text-xs text-[var(--text-muted)] mb-1">{t.tip}</div>
                <div className="text-xs font-mono text-[#3B82F6]">{t.ex}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
