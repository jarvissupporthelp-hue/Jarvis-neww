import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import TabBar from '../components/ui/TabBar';
import GlassPanel from '../components/ui/GlassPanel';
import { worldToCanvas } from '../utils/math';

const TABS = [{ id: 'practical', label: 'Transformer' }, { id: 'theory', label: 'Theory' }];

function matMul2(A: number[][], v: [number, number]): [number, number] {
  return [A[0][0] * v[0] + A[0][1] * v[1], A[1][0] * v[0] + A[1][1] * v[1]];
}

function det2(A: number[][]): number {
  return A[0][0] * A[1][1] - A[0][1] * A[1][0];
}

function eigenvalues2(A: number[][]): { re: number; im: number }[] {
  const trace = A[0][0] + A[1][1];
  const d = det2(A);
  const disc = trace * trace - 4 * d;
  if (disc >= 0) {
    const sq = Math.sqrt(disc);
    return [{ re: (trace + sq) / 2, im: 0 }, { re: (trace - sq) / 2, im: 0 }];
  }
  const sq = Math.sqrt(-disc);
  return [{ re: trace / 2, im: sq / 2 }, { re: trace / 2, im: -sq / 2 }];
}

function eigenvectors2(A: number[][], lambda: number): [number, number] {
  const b0 = A[0][0] - lambda, b1 = A[0][1];
  const len = Math.sqrt(b0 * b0 + b1 * b1);
  if (len < 1e-9) return [1, 0];
  return [-b1 / len, b0 / len];
}

export default function MatricesModule() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState('practical');
  const [matrix, setMatrix] = useState([[1, 0.5], [0.2, 1.2]]);
  const [panOffsetX, setPanOffsetX] = useState(0);
  const [panOffsetY, setPanOffsetY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, w, h);

    const xMin = -3.5 + panOffsetX, xMax = 3.5 + panOffsetX, yMin = -3.5 + panOffsetY, yMax = 3.5 + panOffsetY;
    const A = matrix;

    // Draw original grid (faint)
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i++) {
      const p1 = worldToCanvas(i, -3, xMin, xMax, yMin, yMax, w, h);
      const p2 = worldToCanvas(i, 3, xMin, xMax, yMin, yMax, w, h);
      ctx.beginPath(); ctx.moveTo(p1.cx, p1.cy); ctx.lineTo(p2.cx, p2.cy); ctx.stroke();
      const p3 = worldToCanvas(-3, i, xMin, xMax, yMin, yMax, w, h);
      const p4 = worldToCanvas(3, i, xMin, xMax, yMin, yMax, w, h);
      ctx.beginPath(); ctx.moveTo(p3.cx, p3.cy); ctx.lineTo(p4.cx, p4.cy); ctx.stroke();
    }
    ctx.restore();

    // Draw transformed grid
    ctx.save();
    ctx.strokeStyle = 'rgba(59,130,246,0.25)';
    ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i++) {
      const v1 = matMul2(A, [i, -3]); const v2 = matMul2(A, [i, 3]);
      const p1 = worldToCanvas(v1[0], v1[1], xMin, xMax, yMin, yMax, w, h);
      const p2 = worldToCanvas(v2[0], v2[1], xMin, xMax, yMin, yMax, w, h);
      ctx.beginPath(); ctx.moveTo(p1.cx, p1.cy); ctx.lineTo(p2.cx, p2.cy); ctx.stroke();
      const v3 = matMul2(A, [-3, i]); const v4 = matMul2(A, [3, i]);
      const p3 = worldToCanvas(v3[0], v3[1], xMin, xMax, yMin, yMax, w, h);
      const p4 = worldToCanvas(v4[0], v4[1], xMin, xMax, yMin, yMax, w, h);
      ctx.beginPath(); ctx.moveTo(p3.cx, p3.cy); ctx.lineTo(p4.cx, p4.cy); ctx.stroke();
    }
    ctx.restore();

    // Transformed axes
    const origin = worldToCanvas(0, 0, xMin, xMax, yMin, yMax, w, h);
    const iBasis = matMul2(A, [1, 0]);
    const jBasis = matMul2(A, [0, 1]);
    drawArrow(ctx, origin.cx, origin.cy, worldToCanvas(iBasis[0], iBasis[1], xMin, xMax, yMin, yMax, w, h), '#3B82F6', 2.5);
    drawArrow(ctx, origin.cx, origin.cy, worldToCanvas(jBasis[0], jBasis[1], xMin, xMax, yMin, yMax, w, h), '#10B981', 2.5);

    // Unit square transformation
    const corners: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
    const tCorners = corners.map(c => matMul2(A, c));
    ctx.save();
    ctx.fillStyle = 'rgba(245,158,11,0.15)';
    ctx.strokeStyle = 'rgba(245,158,11,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const p = worldToCanvas(tCorners[i][0], tCorners[i][1], xMin, xMax, yMin, yMax, w, h);
      if (i === 0) {
        ctx.moveTo(p.cx, p.cy);
      } else {
        ctx.lineTo(p.cx, p.cy);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Eigenvectors
    const evs = eigenvalues2(A);
    const evColors = ['#EF4444', '#EC4899'];
    for (let i = 0; i < evs.length; i++) {
      if (Math.abs(evs[i].im) < 1e-6) {
        const ev = eigenvectors2(A, evs[i].re);
        const scale = 3;
        const ep = worldToCanvas(ev[0] * scale, ev[1] * scale, xMin, xMax, yMin, yMax, w, h);
        const en = worldToCanvas(-ev[0] * scale, -ev[1] * scale, xMin, xMax, yMin, yMax, w, h);
        ctx.save();
        ctx.strokeStyle = evColors[i];
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 3]);
        ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.moveTo(en.cx, en.cy); ctx.lineTo(ep.cx, ep.cy); ctx.stroke();
        ctx.restore();
      }
    }

    // Stats overlay
    const d = det2(A);
    ctx.save();
    ctx.fillStyle = 'rgba(15,20,35,0.88)';
    ctx.strokeStyle = 'rgba(59,130,246,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(12, 12, 160, 70, 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8B9CC0';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText(`det(A) = ${d.toFixed(4)}`, 22, 32);
    ctx.fillText(`trace = ${(A[0][0] + A[1][1]).toFixed(4)}`, 22, 50);
    const evStr = evs[0].im !== 0 ? `λ = ${evs[0].re.toFixed(2)} ± ${evs[0].im.toFixed(2)}i` : `λ = ${evs[0].re.toFixed(2)}, ${evs[1].re.toFixed(2)}`;
    ctx.fillText(evStr, 22, 68);
    ctx.restore();
  }, [matrix, panOffsetX, panOffsetY]);

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

  const setEntry = (r: number, c: number, val: string) => {
    const v = parseFloat(val);
    if (isNaN(v)) return;
    setMatrix(prev => prev.map((row, ri) => row.map((cell, ci) => ri === r && ci === c ? v : cell)));
  };

  const presets = [
    { label: 'Identity', m: [[1, 0], [0, 1]] },
    { label: 'Rotation 45°', m: [[0.707, -0.707], [0.707, 0.707]] },
    { label: 'Shear', m: [[1, 1], [0, 1]] },
    { label: 'Scale ×2', m: [[2, 0], [0, 2]] },
    { label: 'Reflection', m: [[1, 0], [0, -1]] },
    { label: 'Squeeze', m: [[2, 0], [0, 0.5]] },
  ];

  return (
    <div className="flex flex-col h-full">
      <TabBar tabs={TABS} active={tab} onChange={setTab} color="#10B981" />
      {tab === 'theory' ? <MatrixTheory /> : (
        <div className="flex flex-1 flex-col lg:flex-row gap-4 min-h-0">
          <div className="flex-1 min-w-0 relative rounded-xl overflow-hidden">
            <canvas ref={canvasRef} className="w-full h-full" style={{ minHeight: 300 }} />
          </div>
          <div className="w-full lg:w-64 lg:overflow-y-auto flex flex-col gap-3 flex-shrink-0">
            <GlassPanel title="Matrix A" accentColor="#10B981">
              <div className="text-xs text-[var(--text-muted)] mb-2">Click values to edit</div>
              <div className="grid grid-cols-2 gap-2">
                {matrix.map((row, r) => row.map((val, c) => (
                  <div key={`${r}-${c}`} className="flex flex-col items-center gap-1">
                    <span className="text-xs text-[var(--text-muted)]">a{r+1}{c+1}</span>
                    <input
                      type="number"
                      step={0.1}
                      value={val}
                      onChange={e => setEntry(r, c, e.target.value)}
                      className="w-full text-center text-sm"
                    />
                  </div>
                )))}
              </div>
            </GlassPanel>

            <GlassPanel title="Presets" accentColor="#06B6D4">
              <div className="grid grid-cols-2 gap-2">
                {presets.map(p => (
                  <button
                    key={p.label}
                    onClick={() => setMatrix(p.m)}
                    className="py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-[#06B6D420] text-[var(--text-secondary)] hover:text-[#06B6D4]"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </GlassPanel>

            <GlassPanel title="Legend" accentColor="#F59E0B">
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-[#3B82F6]" /><span className="text-[var(--text-muted)]">i-basis vector</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-[#10B981]" /><span className="text-[var(--text-muted)]">j-basis vector</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-2 bg-[#F59E0B]/30 border border-[#F59E0B]/60" /><span className="text-[var(--text-muted)]">Transformed unit square</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-[#EF4444]" style={{ borderTop: '2px dashed #EF4444' }} /><span className="text-[var(--text-muted)]">Eigenvectors</span></div>
              </div>
            </GlassPanel>
          </div>
        </div>
      )}
    </div>
  );
}

function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, p2: { cx: number; cy: number }, color: string, width: number) {
  const { cx: x2, cy: y2 } = p2;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 10 * Math.cos(angle - 0.4), y2 - 10 * Math.sin(angle - 0.4));
  ctx.lineTo(x2 - 10 * Math.cos(angle + 0.4), y2 - 10 * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function MatrixTheory() {
  return (
    <motion.div className="flex-1 overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-6">
          <h3 className="font-bold text-white mb-4">Linear Transformations</h3>
          <p className="text-sm text-[var(--text-secondary)]">A 2×2 matrix A represents a linear transformation of the plane. Every point [x, y] maps to A·[x, y].</p>
          <div className="glass rounded-lg p-3 font-mono text-xs text-[#10B981] mt-3">[a b; c d] · [x; y] = [ax+by; cx+dy]</div>
        </div>
        <div className="glass rounded-xl p-6">
          <h3 className="font-bold text-white mb-4">Eigenvalues & Eigenvectors</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-2">Eigenvectors are directions unchanged by the transformation. Eigenvalues scale them.</p>
          <div className="glass rounded-lg p-3 font-mono text-xs text-[#EF4444]">Av = λv</div>
        </div>
      </div>
    </motion.div>
  );
}
