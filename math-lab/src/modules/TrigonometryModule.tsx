import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import TabBar from '../components/ui/TabBar';
import GlassPanel from '../components/ui/GlassPanel';
import SliderRow from '../components/ui/SliderRow';

const TABS = [{ id: 'practical', label: 'Circle Engine' }, { id: 'theory', label: 'Theory' }];

export default function TrigonometryModule() {
  const circleRef = useRef<HTMLCanvasElement>(null);
  const waveRef = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState('practical');
  const [amplitude, setAmplitude] = useState(1);
  const [frequency, setFrequency] = useState(1);
  const [phase, setPhase] = useState(0);
  const [theta, setTheta] = useState(0);
  const [mode, setMode] = useState<'sin' | 'cos' | 'both'>('sin');
  const animRef = useRef<number | null>(null);
  const [animating, setAnimating] = useState(true);

  const drawCircle = useCallback((th: number) => {
    const canvas = circleRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;
    const R = Math.min(w, h) * 0.38;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.save();
    ctx.strokeStyle = 'rgba(59,130,246,0.08)';
    ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      const x = cx + i * R / 2;
      const y = cy + i * R / 2;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.restore();

    // Axes
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
    ctx.restore();

    // Unit circle
    ctx.save();
    ctx.strokeStyle = 'rgba(59,130,246,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // Angle arc
    ctx.save();
    ctx.strokeStyle = 'rgba(245,158,11,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.25, 0, -th, th < 0); ctx.stroke();
    ctx.restore();

    const px = cx + R * Math.cos(th);
    const py = cy - R * Math.sin(th);

    // Radius line
    ctx.save();
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#3B82F6';
    ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
    ctx.restore();

    // Sine component (vertical)
    if (mode !== 'cos') {
      ctx.save();
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(px, cy); ctx.lineTo(px, py); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(cx, py); ctx.lineTo(px, py); ctx.stroke();
      ctx.restore();
    }

    // Cosine component (horizontal)
    if (mode !== 'sin') {
      ctx.save();
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(cx, py); ctx.lineTo(px, py); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(px, cy); ctx.lineTo(px, py); ctx.stroke();
      ctx.restore();
    }

    // Point on circle
    ctx.save();
    ctx.fillStyle = '#3B82F6';
    ctx.shadowColor = '#3B82F6';
    ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Labels
    ctx.save();
    ctx.fillStyle = '#8B9CC0';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`θ = ${(th * 180 / Math.PI % 360).toFixed(1)}°`, cx, h - 12);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#10B981';
    ctx.fillText(`sin = ${Math.sin(th).toFixed(3)}`, 10, 20);
    ctx.fillStyle = '#F59E0B';
    ctx.fillText(`cos = ${Math.cos(th).toFixed(3)}`, 10, 36);
    ctx.restore();
  }, [mode]);

  const drawWave = useCallback((th: number) => {
    const canvas = waveRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.save();
    ctx.strokeStyle = 'rgba(59,130,246,0.08)';
    ctx.lineWidth = 1;
    for (let i = 0.25; i <= 1; i += 0.25) {
      ctx.beginPath(); ctx.moveTo(0, cy + i * cy * 0.8); ctx.lineTo(w, cy + i * cy * 0.8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, cy - i * cy * 0.8); ctx.lineTo(w, cy - i * cy * 0.8); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
    ctx.restore();

    const A = amplitude;
    const maxA = 2;
    const scale = (cy * 0.85) / maxA;
    const xScale = w / (Math.PI * 4);

    const drawWaveform = (fn: (x: number) => number, color: string) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let px = 0; px <= w; px++) {
        const x = px / xScale;
        const y = fn(x);
        const canY = cy - y * scale;
        if (px === 0) {
          ctx.moveTo(px, canY);
        } else {
          ctx.lineTo(px, canY);
        }
      }
      ctx.stroke();
      ctx.restore();
    };

    if (mode !== 'cos') drawWaveform(x => A * Math.sin(frequency * (x - phase)), '#10B981');
    if (mode !== 'sin') drawWaveform(x => A * Math.cos(frequency * (x - phase)), '#F59E0B');

    // Current theta marker
    const markerX = (th % (Math.PI * 4) + Math.PI * 4) % (Math.PI * 4) * xScale;
    ctx.save();
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(markerX, 0); ctx.lineTo(markerX, h); ctx.stroke();
    ctx.restore();

    if (mode !== 'cos') {
      const sinY = cy - A * Math.sin(frequency * (th - phase)) * scale;
      ctx.save();
      ctx.fillStyle = '#10B981';
      ctx.shadowColor = '#10B981';
      ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(markerX, sinY, 6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Formula
    ctx.save();
    ctx.fillStyle = 'rgba(15,20,35,0.88)';
    ctx.strokeStyle = 'rgba(59,130,246,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(10, 10, 240, 35, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#10B981'; ctx.font = '12px JetBrains Mono, monospace';
    ctx.fillText(`f(x) = ${A.toFixed(2)}·sin(${frequency.toFixed(2)}x${phase >= 0 ? '-' : '+'}${Math.abs(phase).toFixed(2)})`, 18, 32);
    ctx.restore();
  }, [amplitude, frequency, phase, mode]);

  useEffect(() => {
    [circleRef, waveRef].forEach(ref => {
      const canvas = ref.current;
      if (!canvas) return;
      const ro = new ResizeObserver(() => {
        canvas.width = canvas.offsetWidth * devicePixelRatio;
        canvas.height = canvas.offsetHeight * devicePixelRatio;
      });
      ro.observe(canvas);
      return () => ro.disconnect();
    });
  }, []);

  useEffect(() => {
    drawCircle(theta);
    drawWave(theta);
  }, [theta, drawCircle, drawWave]);

  useEffect(() => {
    if (animating) {
      let start: number | null = null;
      const step = (ts: number) => {
        if (!start) start = ts;
        const th = ((ts - start) / 1000) * 1.2;
        setTheta(th);
        animRef.current = requestAnimationFrame(step) as unknown as number;
      };
      animRef.current = requestAnimationFrame(step) as unknown as number;
    } else {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [animating]);

  return (
    <div className="flex flex-col h-full">
      <TabBar tabs={TABS} active={tab} onChange={setTab} color="#8B5CF6" />
      {tab === 'theory' ? <TrigTheory /> : (
        <div className="flex flex-1 flex-col lg:flex-row gap-4 min-h-0">
          <div className="flex flex-1 flex-col sm:flex-row gap-2 min-h-0">
            <div className="flex-1 min-w-0 relative rounded-xl overflow-hidden">
              <canvas ref={circleRef} className="w-full h-full" style={{ minHeight: 280 }} />
            </div>
            <div className="flex-1 min-w-0 relative rounded-xl overflow-hidden">
              <canvas ref={waveRef} className="w-full h-full" style={{ minHeight: 280 }} />
            </div>
          </div>
          <div className="w-full lg:w-56 lg:overflow-y-auto flex flex-col gap-3 flex-shrink-0">
            <GlassPanel title="Wave Controls" accentColor="#8B5CF6">
              <SliderRow label="Amplitude A" value={amplitude} min={0.1} max={2} step={0.05} onChange={setAmplitude} color="#10B981" />
              <SliderRow label="Frequency f" value={frequency} min={0.1} max={5} step={0.1} onChange={setFrequency} color="#F59E0B" />
              <SliderRow label="Phase φ" value={phase} min={-Math.PI} max={Math.PI} step={0.05} onChange={setPhase} color="#EC4899" unit="rad" />
            </GlassPanel>
            <GlassPanel title="Display Mode" accentColor="#06B6D4">
              <div className="flex flex-col gap-2">
                {(['sin', 'cos', 'both'] as const).map(m => (
                  <button key={m} onClick={() => setMode(m)}
                    className="py-2 rounded-lg text-xs font-medium capitalize transition-all"
                    style={{
                      background: mode === m ? '#8B5CF620' : 'rgba(255,255,255,0.05)',
                      color: mode === m ? '#8B5CF6' : 'var(--text-secondary)',
                      border: mode === m ? '1px solid #8B5CF640' : '1px solid transparent',
                    }}>
                    {m === 'both' ? 'sin + cos' : `${m}(x)`}
                  </button>
                ))}
              </div>
            </GlassPanel>
            <GlassPanel title="Animation" accentColor="#10B981">
              <button onClick={() => setAnimating(a => !a)}
                className="w-full py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: animating ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                  color: animating ? '#EF4444' : '#10B981',
                }}>
                {animating ? 'Pause' : 'Play'}
              </button>
              {!animating && <SliderRow label="θ" value={theta} min={0} max={Math.PI * 4} step={0.01} onChange={setTheta} color="#3B82F6" unit="rad" />}
            </GlassPanel>
          </div>
        </div>
      )}
    </div>
  );
}

function TrigTheory() {
  return (
    <motion.div className="flex-1 overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { name: 'sin(θ)', def: 'Opposite / Hypotenuse', key: 'Vertical component on unit circle', color: '#10B981' },
          { name: 'cos(θ)', def: 'Adjacent / Hypotenuse', key: 'Horizontal component on unit circle', color: '#F59E0B' },
          { name: 'tan(θ)', def: 'sin(θ) / cos(θ)', key: 'Slope of the radius line', color: '#3B82F6' },
        ].map(t => (
          <div key={t.name} className="glass rounded-xl p-6">
            <div className="text-2xl font-bold mb-2" style={{ color: t.color }}>{t.name}</div>
            <div className="text-sm text-white mb-1">{t.def}</div>
            <div className="text-xs text-[var(--text-muted)]">{t.key}</div>
          </div>
        ))}
        <div className="glass rounded-xl p-6 md:col-span-3">
          <h3 className="font-bold text-white mb-4">Key Identities</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['sin²x + cos²x = 1', 'sin(2x) = 2sin(x)cos(x)', 'cos(2x) = cos²x - sin²x', 'e^(ix) = cos(x) + i·sin(x)'].map(id => (
              <div key={id} className="glass rounded-lg p-3 font-mono text-xs text-[#06B6D4]">{id}</div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
