import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shuffle, Lightbulb, ArrowRight } from 'lucide-react';
import { MODULES, MATH_FACTS, INTERESTING_PRESETS } from '../constants';
import type { ModuleId } from '../types';

interface Props {
  onNavigate: (id: ModuleId) => void;
}

export default function Dashboard({ onNavigate }: Props) {
  const [factIdx, setFactIdx] = useState(0);
  const [seenPresets, setSeenPresets] = useState<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFactIdx(i => (i + 1) % MATH_FACTS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleShuffle = () => {
    const available = INTERESTING_PRESETS.map((_, i) => i).filter(i => !seenPresets.includes(i));
    const pool = available.length > 0 ? available : INTERESTING_PRESETS.map((_, i) => i);
    const idx = pool[Math.floor(Math.random() * pool.length)];
    const preset = INTERESTING_PRESETS[idx];
    setSeenPresets(prev => [...prev, idx].slice(-INTERESTING_PRESETS.length + 1));
    onNavigate(preset.id as ModuleId);
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto animate-fade-up">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Discovery Hub</h1>
        <p className="text-[var(--text-secondary)]">Your interactive mathematics laboratory</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module grid */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MODULES.map((m, i) => (
              <motion.button
                key={m.id}
                onClick={() => onNavigate(m.id)}
                className="glass rounded-xl p-5 text-left group hover:scale-[1.02] transition-all duration-200 relative overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                style={{ borderColor: `${m.color}25` }}
                whileHover={{ borderColor: `${m.color}50` }}
              >
                {/* Glow */}
                <div
                  className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${m.color}18 0%, transparent 70%)`, transform: 'translate(30%,-30%)' }}
                />
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg"
                    style={{ background: `${m.color}18`, color: m.color }}
                  >
                    {m.icon}
                  </div>
                  <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: m.color }} />
                </div>
                <div className="text-sm font-semibold text-white mb-1">{m.label}</div>
                <div className="text-xs text-[var(--text-muted)] leading-relaxed">{m.description}</div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Sidebar panels */}
        <div className="flex flex-col gap-4">
          {/* Math Fact */}
          <motion.div
            className="glass rounded-xl p-5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={16} className="text-[#F59E0B]" />
              <span className="text-xs font-semibold text-[#F59E0B] uppercase tracking-widest">Did You Know?</span>
            </div>
            <motion.p
              key={factIdx}
              className="text-sm text-[var(--text-secondary)] leading-relaxed"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {MATH_FACTS[factIdx].text}
            </motion.p>
            <div className="flex gap-1 mt-4">
              {MATH_FACTS.map((_, i) => (
                <div
                  key={i}
                  className="h-0.5 rounded-full transition-all duration-300"
                  style={{
                    flex: i === factIdx ? 3 : 1,
                    background: i === factIdx ? '#F59E0B' : 'rgba(255,255,255,0.1)',
                  }}
                />
              ))}
            </div>
          </motion.div>

          {/* Shuffle */}
          <motion.button
            onClick={handleShuffle}
            className="glass rounded-xl p-5 text-left group hover:scale-[1.02] transition-all duration-200 relative overflow-hidden"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ borderColor: 'rgba(6,182,212,0.4)' }}
            style={{ borderColor: 'rgba(6,182,212,0.2)' }}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.08) 0%, transparent 60%)' }}
            />
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#06B6D4]/20">
                <Shuffle size={18} className="text-[#06B6D4]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Surprise Me</div>
                <div className="text-xs text-[var(--text-muted)]">Random exploration</div>
              </div>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Jump to a randomly selected module with interesting preset parameters. New discovery every time.
            </p>
          </motion.button>

          {/* Quick stats */}
          <motion.div
            className="glass rounded-xl p-5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-widest mb-4">Modules</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Modules', value: '8', color: '#3B82F6' },
                { label: 'Presets', value: '6+', color: '#10B981' },
                { label: 'Interactive', value: '∞', color: '#F59E0B' },
                { label: 'Real-time', value: '60fps', color: '#06B6D4' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-[var(--text-muted)]">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
