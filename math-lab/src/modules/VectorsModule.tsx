import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import TabBar from '../components/ui/TabBar';
import GlassPanel from '../components/ui/GlassPanel';
import { worldToCanvas, canvasToWorld } from '../utils/math';

const TABS = [{ id: 'practical', label: 'Vector Space' }, { id: 'theory', label: 'Theory' }];

interface Vec2 { x: number; y: number; }

export default function VectorsModule() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState('practical');
  const [vA, setVA] = useState<Vec2>({ x: 2, y: 1 });
  const [vB, setVB] = useState<Vec2>({ x: 0.5, y: 2.5 });
  const dragging = useRef<'A' | 'B' | null>(null);
  const [panOffsetX, setPanOffsetX] = useState(0);
  const [panOffsetY, setPanOffsetY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const xMin = -4 + panOffsetX, xMax = 4 + panOffsetX, yMin = -4 + panOffsetY, yMax = 4 + panOffsetY;

  const dot = vA.x * vB.x + vA.y * vB.y;
  const magA = Math.sqrt(vA.x ** 2 + vA.y ** 2);
  const magB = Math.sqrt(vB.x ** 2 + vB.y ** 2);
  const angle = magA > 0 && magB > 0 ? (Math.acos(Math.max(-1, Math.min(1, dot / (magA * magB)))) * 180 / Math.PI) : 0;
  const crossZ = vA.x * vB.y - vA.y * vB.x;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.save();
    ctx.strokeStyle = 'rgba(59,130,246,0.07)';
    ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i++) {
      const { cx, cy } = worldToCanvas(i, 0, xMin, xMax, yMin, yMax, w, h);
      const { cx: cx2 } = worldToCanvas(i, 4, xMin, xMax, yMin, yMax, w, h);
      const { cy: cy2 } = worldToCanvas(0, i, xMin, xMax, yMin, yMax, w, h);
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx2, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy2); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1.5;
    const { cy: y0 } = worldToCanvas(0, 0, xMin, xMax, yMin, yMax, w, h);
    const { cx: x0 } = worldToCanvas(0, 0, xMin, xMax, yMin, yMax, w, h);
    ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(w, y0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0, h); ctx.stroke();
    ctx.restore();

    const origin = worldToCanvas(0, 0, xMin, xMax, yMin, yMax, w, h);

    // Angle arc
    if (magA > 0 && magB > 0) {
      const angleA = Math.atan2(vA.y, vA.x);
      const angleB = Math.atan2(vB.y, vB.x);
      const arcR = 35;
      ctx.save();
      ctx.strokeStyle = 'rgba(245,158,11,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(origin.cx, origin.cy, arcR, -angleA, -angleB, angleB > angleA);
      ctx.stroke();
      const midAngle = (angleA + angleB) / 2;
      const tx = origin.cx + (arcR + 14) * Math.cos(-midAngle);
      const ty = origin.cy + (arcR + 14) * Math.sin(-midAngle);
      ctx.fillStyle = '#F59E0B';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${angle.toFixed(1)}°`, tx, ty);
      ctx.restore();
    }

    // Dot product projection
    if (magA > 0) {
      const proj = dot / (magA * magA);
      const px = vA.x * proj, py = vA.y * proj;
      const pp = worldToCanvas(px, py, xMin, xMax, yMin, yMax, w, h);
      const pb = worldToCanvas(vB.x, vB.y, xMin, xMax, yMin, yMax, w, h);
      ctx.save();
      ctx.strokeStyle = 'rgba(16,185,129,0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(pb.cx, pb.cy); ctx.lineTo(pp.cx, pp.cy); ctx.stroke();
      ctx.restore();
    }

    drawVectorArrow(ctx, origin, worldToCanvas(vA.x, vA.y, xMin, xMax, yMin, yMax, w, h), '#3B82F6', 'A');
    drawVectorArrow(ctx, origin, worldToCanvas(vB.x, vB.y, xMin, xMax, yMin, yMax, w, h), '#10B981', 'B');

    // Sum vector
    const sumP = worldToCanvas(vA.x + vB.x, vA.y + vB.y, xMin, xMax, yMin, yMax, w, h);
    drawVectorArrow(ctx, origin, sumP, 'rgba(245,158,11,0.6)', 'A+B', true);

    // Drag handle indicators
    for (const [v, color] of [[vA, '#3B82F6'], [vB, '#10B981']] as const) {
      const p = worldToCanvas(v.x, v.y, xMin, xMax, yMin, yMax, w, h);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color + '30';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.cx, p.cy, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }, [vA, vB, dot, magA, magB, angle, xMin, yMin, xMax, yMax]);

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

  const getWorldPos = useCallback((e: MouseEvent | Touch) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * devicePixelRatio;
    const cy = (e.clientY - rect.top) * devicePixelRatio;
    return canvasToWorld(cx, cy, xMin, xMax, yMin, yMax, canvas.width, canvas.height);
  }, [xMin, yMin, xMax, yMax]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const hitTest = (wx: number, wy: number, v: Vec2) => Math.hypot(wx - v.x, wy - v.y) < 0.4;

    const onDown = (e: MouseEvent) => {
      const p = getWorldPos(e);
      if (!p) return;
      if (hitTest(p.wx, p.wy, vA)) dragging.current = 'A';
      else if (hitTest(p.wx, p.wy, vB)) dragging.current = 'B';
      else {
        setIsPanning(true);
        setPanStart({ x: e.offsetX * devicePixelRatio, y: e.offsetY * devicePixelRatio });
      }
    };
    const onMove = (e: MouseEvent) => {
      if (dragging.current) {
        const p = getWorldPos(e);
        if (!p) return;
        const clamped = { x: Math.max(xMin, Math.min(xMax, p.wx)), y: Math.max(yMin, Math.min(yMax, p.wy)) };
        if (dragging.current === 'A') setVA(clamped);
        else setVB(clamped);
      } else if (isPanning) {
        const dx = e.offsetX * devicePixelRatio - panStart.x;
        const dy = e.offsetY * devicePixelRatio - panStart.y;
        setPanOffsetX(prev => prev - dx * 0.0008);
        setPanOffsetY(prev => prev + dy * 0.0008);
      }
    };
    const onUp = () => { 
      dragging.current = null; 
      setIsPanning(false);
    };

    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [getWorldPos, vA, vB, xMin, yMin, xMax, yMax, isPanning, panStart]);

  return (
    <div className="flex flex-col h-full">
      <TabBar tabs={TABS} active={tab} onChange={setTab} color="#F59E0B" />
      {tab === 'theory' ? <VectorTheory /> : (
        <div className="flex flex-1 flex-col lg:flex-row gap-4 min-h-0">
          <div className="flex-1 min-w-0 relative rounded-xl overflow-hidden" style={{ cursor: 'crosshair' }}>
            <canvas ref={canvasRef} className="w-full h-full" style={{ minHeight: 300 }} />
          </div>
          <div className="w-full lg:w-64 lg:overflow-y-auto flex flex-col gap-3 flex-shrink-0">
            <GlassPanel title="Vector A" accentColor="#3B82F6">
              <div className="text-xs text-[var(--text-muted)]">Drag the arrow head on canvas, or:</div>
              <div className="flex gap-2">
                <div className="flex-1"><label className="text-xs text-[var(--text-muted)]">x</label><input type="number" step={0.1} value={vA.x.toFixed(2)} onChange={e => setVA(v => ({ ...v, x: parseFloat(e.target.value) || 0 }))} className="w-full mt-1" /></div>
                <div className="flex-1"><label className="text-xs text-[var(--text-muted)]">y</label><input type="number" step={0.1} value={vA.y.toFixed(2)} onChange={e => setVA(v => ({ ...v, y: parseFloat(e.target.value) || 0 }))} className="w-full mt-1" /></div>
              </div>
              <div className="text-xs text-[var(--text-muted)]">|A| = <span className="text-[#3B82F6] font-mono">{magA.toFixed(4)}</span></div>
            </GlassPanel>

            <GlassPanel title="Vector B" accentColor="#10B981">
              <div className="flex gap-2">
                <div className="flex-1"><label className="text-xs text-[var(--text-muted)]">x</label><input type="number" step={0.1} value={vB.x.toFixed(2)} onChange={e => setVB(v => ({ ...v, x: parseFloat(e.target.value) || 0 }))} className="w-full mt-1" /></div>
                <div className="flex-1"><label className="text-xs text-[var(--text-muted)]">y</label><input type="number" step={0.1} value={vB.y.toFixed(2)} onChange={e => setVB(v => ({ ...v, y: parseFloat(e.target.value) || 0 }))} className="w-full mt-1" /></div>
              </div>
              <div className="text-xs text-[var(--text-muted)]">|B| = <span className="text-[#10B981] font-mono">{magB.toFixed(4)}</span></div>
            </GlassPanel>

            <GlassPanel title="Operations" accentColor="#F59E0B">
              <div className="space-y-2 text-sm">
                <div className="glass rounded-lg p-3">
                  <div className="text-xs text-[var(--text-muted)] mb-1">Dot Product A·B</div>
                  <div className="font-mono text-[#F59E0B] text-sm">{dot.toFixed(4)}</div>
                </div>
                <div className="glass rounded-lg p-3">
                  <div className="text-xs text-[var(--text-muted)] mb-1">Cross Product |A×B|</div>
                  <div className="font-mono text-[#EC4899] text-sm">{Math.abs(crossZ).toFixed(4)}</div>
                </div>
                <div className="glass rounded-lg p-3">
                  <div className="text-xs text-[var(--text-muted)] mb-1">Angle θ</div>
                  <div className="font-mono text-[#06B6D4] text-sm">{angle.toFixed(2)}°</div>
                </div>
                <div className="glass rounded-lg p-3">
                  <div className="text-xs text-[var(--text-muted)] mb-1">A + B</div>
                  <div className="font-mono text-[#F59E0B] text-xs">({(vA.x+vB.x).toFixed(2)}, {(vA.y+vB.y).toFixed(2)})</div>
                </div>
              </div>
            </GlassPanel>
          </div>
        </div>
      )}
    </div>
  );
}

function drawVectorArrow(ctx: CanvasRenderingContext2D, origin: { cx: number; cy: number }, tip: { cx: number; cy: number }, color: string, label: string, dashed = false) {
  const { cx: x1, cy: y1 } = origin;
  const { cx: x2, cy: y2 } = tip;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = dashed ? 1.5 : 2.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = dashed ? 0 : 10;
  if (dashed) ctx.setLineDash([5, 3]);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 12 * Math.cos(angle - 0.4), y2 - 12 * Math.sin(angle - 0.4));
  ctx.lineTo(x2 - 12 * Math.cos(angle + 0.4), y2 - 12 * Math.sin(angle + 0.4));
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x2 + 14 * Math.cos(angle - Math.PI / 2), y2 + 14 * Math.sin(angle - Math.PI / 2));
  ctx.restore();
}

function VectorTheory() {
  return (
    <motion.div className="flex-1 overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-6">
          <h3 className="font-bold text-white mb-4">Dot Product</h3>
          <div className="glass rounded-lg p-3 font-mono text-xs text-[#3B82F6] mb-3">A·B = |A||B|cos(θ)</div>
          <p className="text-sm text-[var(--text-secondary)]">Measures how much two vectors point in the same direction. Zero when perpendicular.</p>
        </div>
        <div className="glass rounded-xl p-6">
          <h3 className="font-bold text-white mb-4">Cross Product (2D)</h3>
          <div className="glass rounded-lg p-3 font-mono text-xs text-[#10B981] mb-3">|A×B| = |A||B|sin(θ)</div>
          <p className="text-sm text-[var(--text-secondary)]">The magnitude equals the area of the parallelogram spanned by A and B.</p>
        </div>
      </div>
    </motion.div>
  );
}
