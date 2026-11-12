import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import TabBar from '../components/ui/TabBar';
import GlassPanel from '../components/ui/GlassPanel';
import SliderRow from '../components/ui/SliderRow';

const TABS = [{ id: 'practical', label: 'Simulator' }, { id: 'theory', label: 'Theory' }];
type DistType = 'uniform' | 'normal' | 'poisson' | 'exponential';

function randn(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function randPoisson(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

export default function ProbabilityModule() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState('practical');
  const [dist, setDist] = useState<DistType>('normal');
  const [n, setN] = useState(500);
  const [mu, setMu] = useState(0);
  const [sigma, setSigma] = useState(1);
  const [lambda, setLambda] = useState(3);
  const [data, setData] = useState<number[]>([]);
  const [running, setRunning] = useState(false);
  const animRef = useRef<number | null>(null);
  const dataRef = useRef<number[]>([]);
  const [panOffsetX, setPanOffsetX] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const generateSample = useCallback((): number => {
    if (dist === 'normal') return mu + sigma * randn();
    if (dist === 'uniform') return Math.random() * 6 - 3;
    if (dist === 'poisson') return randPoisson(lambda);
    return -Math.log(Math.random()) / lambda;
  }, [dist, mu, sigma, lambda]);

  const generate = useCallback(() => {
    const samples: number[] = Array.from({ length: n }, generateSample);
    dataRef.current = samples;
    setData(samples);
  }, [n, generateSample]);

  useEffect(() => { generate(); }, [generate]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, w, h);

    const samples = dataRef.current;
    if (samples.length === 0) return;

    const margin = { left: 50, right: 20, top: 20, bottom: 50 };
    const pw = w - margin.left - margin.right;
    const ph = h - margin.top - margin.bottom;

    const xMin = (dist === 'poisson' ? -0.5 : Math.min(...samples) - 0.5) + panOffsetX;
    const xMax = (dist === 'poisson' ? lambda * 3 + 0.5 : Math.max(...samples) + 0.5) + panOffsetX;
    const numBins = dist === 'poisson' ? Math.ceil(lambda * 3) + 1 : 30;

    const bins = new Array(numBins).fill(0);
    const binWidth = (xMax - xMin) / numBins;

    for (const s of samples) {
      const bin = Math.floor((s - xMin) / binWidth);
      if (bin >= 0 && bin < numBins) bins[bin]++;
    }

    const maxBin = Math.max(...bins);
    const xScale = pw / (xMax - xMin);
    const yScale = ph / maxBin;

    // Grid
    ctx.save();
    ctx.strokeStyle = 'rgba(59,130,246,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = margin.top + ph - (i / 5) * ph;
      ctx.beginPath(); ctx.moveTo(margin.left, y); ctx.lineTo(margin.left + pw, y); ctx.stroke();
      ctx.fillStyle = 'rgba(139,156,192,0.5)'; ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(maxBin * i / 5)}`, margin.left - 5, y + 4);
    }
    ctx.restore();

    // Bars
    for (let i = 0; i < numBins; i++) {
      const barH = bins[i] * yScale;
      const bx = margin.left + (i * binWidth) * xScale;
      const by = margin.top + ph - barH;
      const bw = Math.max(1, binWidth * xScale - 1);

      const t = bins[i] / maxBin;
      ctx.fillStyle = `rgba(59,${Math.round(130 + t * 50)},${Math.round(246 - t * 100)},${0.4 + t * 0.4})`;
      ctx.strokeStyle = `rgba(59,130,246,${0.5 + t * 0.3})`;
      ctx.lineWidth = 0.5;
      ctx.fillRect(bx, by, bw, barH);
      ctx.strokeRect(bx, by, bw, barH);
    }

    // Normal overlay
    if (dist === 'normal') {
      const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
      const variance = samples.reduce((a, s) => a + (s - mean) ** 2, 0) / samples.length;
      const std = Math.sqrt(variance);
      const totalArea = samples.length * binWidth;

      ctx.save();
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let px = 0; px <= pw; px++) {
        const x = xMin + (px / pw) * (xMax - xMin);
        const pdf = totalArea * (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mean) / std) ** 2);
        const cy = margin.top + ph - pdf * yScale;
        if (px === 0) {
          ctx.moveTo(margin.left + px, cy);
        } else {
          ctx.lineTo(margin.left + px, cy);
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    // X axis
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(margin.left, margin.top + ph); ctx.lineTo(margin.left + pw, margin.top + ph); ctx.stroke();
    ctx.fillStyle = 'rgba(139,156,192,0.6)'; ctx.font = '10px JetBrains Mono, monospace'; ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
      const x = xMin + (i / 5) * (xMax - xMin);
      const px = margin.left + (i / 5) * pw;
      ctx.fillText(x.toFixed(1), px, margin.top + ph + 16);
    }
    ctx.restore();

    // Stats
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((a, s) => a + (s - mean) ** 2, 0) / samples.length;
    ctx.save();
    ctx.fillStyle = 'rgba(15,20,35,0.88)';
    ctx.strokeStyle = 'rgba(59,130,246,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(margin.left + pw - 170, margin.top, 165, 60, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8B9CC0'; ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`n = ${samples.length}`, margin.left + pw - 160, margin.top + 18);
    ctx.fillText(`mean = ${mean.toFixed(3)}`, margin.left + pw - 160, margin.top + 34);
    ctx.fillText(`std = ${Math.sqrt(variance).toFixed(3)}`, margin.left + pw - 160, margin.top + 50);
    ctx.restore();
  }, [dist, lambda, panOffsetX]);

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

  useEffect(() => { draw(); }, [data, draw]);

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
      setPanOffsetX(prev => prev - dx * 0.0008);
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

  const startStream = () => {
    if (running) {
      setRunning(false);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }
    setRunning(true);
    dataRef.current = [];
    let count = 0;
    const target = n;
    const step = () => {
      const batch = Math.min(20, target - count);
      for (let i = 0; i < batch; i++) {
        dataRef.current.push(generateSample());
        count++;
      }
      setData([...dataRef.current]);
      if (count < target) {
        animRef.current = requestAnimationFrame(step) as unknown as number;
      } else {
        setRunning(false);
      }
    };
    animRef.current = requestAnimationFrame(step) as unknown as number;
  };

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  return (
    <div className="flex flex-col h-full">
      <TabBar tabs={TABS} active={tab} onChange={setTab} color="#14B8A6" />
      {tab === 'theory' ? <ProbTheory /> : (
        <div className="flex flex-1 flex-col lg:flex-row gap-4 min-h-0">
          <div className="flex-1 min-w-0 relative rounded-xl overflow-hidden">
            <canvas ref={canvasRef} className="w-full h-full" style={{ minHeight: 300 }} />
          </div>
          <div className="w-full lg:w-64 lg:overflow-y-auto flex flex-col gap-3 flex-shrink-0">
            <GlassPanel title="Distribution" accentColor="#14B8A6">
              <div className="grid grid-cols-2 gap-2">
                {(['normal', 'uniform', 'poisson', 'exponential'] as DistType[]).map(d => (
                  <button key={d} onClick={() => setDist(d)}
                    className="py-2 rounded-lg text-xs font-medium capitalize transition-all"
                    style={{
                      background: dist === d ? '#14B8A620' : 'rgba(255,255,255,0.05)',
                      color: dist === d ? '#14B8A6' : 'var(--text-secondary)',
                      border: dist === d ? '1px solid #14B8A640' : '1px solid transparent',
                    }}>
                    {d}
                  </button>
                ))}
              </div>
            </GlassPanel>

            {dist === 'normal' && (
              <GlassPanel title="Parameters" accentColor="#3B82F6">
                <SliderRow label="Mean (μ)" value={mu} min={-3} max={3} step={0.1} onChange={setMu} color="#3B82F6" />
                <SliderRow label="Std Dev (σ)" value={sigma} min={0.1} max={3} step={0.1} onChange={setSigma} color="#10B981" />
              </GlassPanel>
            )}

            {(dist === 'poisson' || dist === 'exponential') && (
              <GlassPanel title="Parameters" accentColor="#F59E0B">
                <SliderRow label="Lambda (λ)" value={lambda} min={0.5} max={10} step={0.5} onChange={setLambda} color="#F59E0B" />
              </GlassPanel>
            )}

            <GlassPanel title="Simulation" accentColor="#10B981">
              <SliderRow label={`Samples (n=${n})`} value={n} min={50} max={5000} step={50} onChange={setN} color="#10B981" />
              <div className="flex gap-2">
                <button onClick={generate} className="flex-1 py-2 rounded-lg text-xs font-medium bg-[#3B82F620] text-[#3B82F6] hover:bg-[#3B82F630] transition-colors">
                  Generate
                </button>
                <button onClick={startStream}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{ background: running ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', color: running ? '#EF4444' : '#10B981' }}>
                  {running ? 'Stop' : 'Stream'}
                </button>
              </div>
            </GlassPanel>
          </div>
        </div>
      )}
    </div>
  );
}

function ProbTheory() {
  return (
    <motion.div className="flex-1 overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-6">
          <h3 className="font-bold text-white mb-4">Normal Distribution</h3>
          <div className="glass rounded-lg p-3 font-mono text-xs text-[#14B8A6] mb-3">f(x) = (1/σ√(2π))·e^(-½((x-μ)/σ)²)</div>
          <p className="text-sm text-[var(--text-secondary)]">Bell-shaped curve. ~68% of values within ±1σ, ~95% within ±2σ, ~99.7% within ±3σ.</p>
        </div>
        <div className="glass rounded-xl p-6">
          <h3 className="font-bold text-white mb-4">Central Limit Theorem</h3>
          <p className="text-sm text-[var(--text-secondary)]">The sum of many independent random variables tends toward a normal distribution, regardless of the original distribution — one of statistics' most powerful results.</p>
        </div>
      </div>
    </motion.div>
  );
}
