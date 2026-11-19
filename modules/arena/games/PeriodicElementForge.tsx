import React, { useState } from 'react';
import { Atom, CheckCircle2, Minus, Plus } from 'lucide-react';
import { soundFx } from '../sound';
import { useRoundTransition } from '../round-transition';
import type { ActiveGameRenderProps } from '../game-types';

import { getElementTargets } from '../rules/PeriodicElementForge';

export const PeriodicElementForge: React.FC<ActiveGameRenderProps> = ({
  difficulty,
  onFinish,
}) => {
  const targets = getElementTargets(difficulty);
  const [idx, setIdx] = useState(0);
  const [protons, setProtons] = useState(1);
  const [neutrons, setNeutrons] = useState(0);
  const [electrons, setElectrons] = useState(1);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  const target = targets[idx];
  const massNumber = protons + neutrons;
  const netCharge = protons - electrons;

  // Shell occupancy: K(2), L(8), M(8)
  const kShell = Math.min(2, electrons);
  const lShell = Math.min(8, Math.max(0, electrons - 2));
  const mShell = Math.min(8, Math.max(0, electrons - 10));

  const isExact =
    protons === target.protons &&
    neutrons === target.neutrons &&
    electrons === target.electrons;

  const renderElectronDots = (count: number, radius: number) => {
    return Array.from({ length: count }).map((_, i) => {
      const angle = (i / Math.max(1, count)) * Math.PI * 2 - Math.PI / 2;
      const cx = 140 + Math.cos(angle) * radius;
      const cy = 140 + Math.sin(angle) * radius;
      return (
        <circle
          key={`${radius}-${i}`}
          cx={cx}
          cy={cy}
          r="5"
          fill="#38BDF8"
          stroke="#0B0F17"
          strokeWidth="1.5"
        />
      );
    });
  };

  const [answers, setAnswers] = useState<unknown[]>([]);
  const { pending, advanceAfterFeedback, isTransitioning } = useRoundTransition();

  const handleVerify = () => {
    if (isTransitioning()) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    if (isExact) {
      const nextAnswers = [...answers, [protons, neutrons, electrons]];
      setAnswers(nextAnswers);
      soundFx.playSuccess();
      setFeedback(`Synthesized ${target.name} (${target.symbol}) accurately.`);
      if (idx + 1 >= targets.length) {
        const accuracy = Math.min(
          100,
          Math.round((targets.length / nextAttempts) * 100)
        );
        advanceAfterFeedback(() => {
          onFinish({
            score: accuracy * 10,
            maxScore: 1000,
            accuracy,
            roundsCompleted: targets.length,
            totalRounds: targets.length,
            submissionPayload: { answers: nextAnswers },
            highlights: [
              `Assembled ${targets.length} isotopes and ions on ${difficulty}`,
            ],
          });
        }, 450);
      } else {
        advanceAfterFeedback(() => {
          setIdx((i) => i + 1);
          setProtons(1);
          setNeutrons(0);
          setElectrons(1);
          setFeedback(null);
        }, 550);
      }
    } else {
      soundFx.playError();
      setFeedback(
        `Current build: Z=${protons}, Mass=${massNumber}, Charge=${
          netCharge > 0 ? `+${netCharge}` : netCharge
        }. Check target clue.`
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs font-mono text-sky-400">
            ATOM {idx + 1} OF {targets.length}
          </div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-slate-50 mt-0.5">
            Synthesize {target.name} ({target.symbol})
          </h2>
          <p className="text-sm text-slate-300 mt-1">{target.clue}</p>
        </div>
        <div className="font-mono text-xs bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-amber-300 shrink-0">
          Target Charge: {target.chargeLabel}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Bohr Shell SVG Visualizer */}
        <div className="lg:col-span-6 bg-[#0B0F17] border border-slate-800 rounded-xl p-4 flex flex-col items-center">
          <svg
            viewBox="0 0 280 280"
            className="w-full max-w-[290px] h-auto select-none"
            role="img"
            aria-label="Bohr atomic orbital diagram"
          >
            {/* K, L, M Shells */}
            <circle cx="140" cy="140" r="46" fill="none" stroke="#1E293B" strokeWidth="1.5" />
            <circle cx="140" cy="140" r="82" fill="none" stroke="#1E293B" strokeWidth="1.5" />
            <circle cx="140" cy="140" r="118" fill="none" stroke="#1E293B" strokeWidth="1.5" />

            {/* Nucleus */}
            <circle
              cx="140"
              cy="140"
              r="22"
              fill="#1E293B"
              stroke="#F59E0B"
              strokeWidth="2"
            />
            <text
              x="140"
              y="137"
              textAnchor="middle"
              fill="#FBBF24"
              fontSize="11"
              fontWeight="700"
              fontFamily="IBM Plex Mono, monospace"
            >
              {protons}p⁺
            </text>
            <text
              x="140"
              y="151"
              textAnchor="middle"
              fill="#94A3B8"
              fontSize="10"
              fontFamily="IBM Plex Mono, monospace"
            >
              {neutrons}n⁰
            </text>

            {/* Electrons */}
            {renderElectronDots(kShell, 46)}
            {renderElectronDots(lShell, 82)}
            {renderElectronDots(mShell, 118)}
          </svg>

          <div className="text-xs font-mono text-slate-400 tabular-nums mt-2">
            Shells: K={kShell}/2 · L={lShell}/8 · M={mShell}/8
          </div>
        </div>

        {/* Subatomic Particle Steppers */}
        <div className="lg:col-span-6 bg-[#0B0F17] border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
          {[
            {
              label: 'Protons (p⁺ · Atomic Number Z)',
              val: protons,
              min: 1,
              max: 20,
              set: setProtons,
              color: 'text-amber-400',
            },
            {
              label: 'Neutrons (n⁰ · Isotope Stability)',
              val: neutrons,
              min: 0,
              max: 24,
              set: setNeutrons,
              color: 'text-slate-200',
            },
            {
              label: 'Electrons (e⁻ · Shell Configuration)',
              val: electrons,
              min: 0,
              max: 18,
              set: setElectrons,
              color: 'text-sky-400',
            },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 flex items-center justify-between gap-3"
            >
              <div>
                <div className="text-xs text-slate-400">{item.label}</div>
                <div className={`font-mono text-2xl font-bold tabular-nums ${item.color}`}>
                  {item.val}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    item.set((v) => Math.max(item.min, v - 1));
                    setFeedback(null);
                  }}
                  aria-label={`Decrease ${item.label}`}
                  className="w-11 h-11 inline-flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    item.set((v) => Math.min(item.max, v + 1));
                    setFeedback(null);
                  }}
                  aria-label={`Increase ${item.label}`}
                  className="w-11 h-11 inline-flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          <div className="grid grid-cols-3 gap-2.5 text-xs font-mono tabular-nums">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
              <div className="text-slate-400">Atomic Z</div>
              <div className="text-slate-100 font-bold text-sm mt-0.5">{protons}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
              <div className="text-slate-400">Mass A</div>
              <div className="text-slate-100 font-bold text-sm mt-0.5">{massNumber}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
              <div className="text-slate-400">Net Charge</div>
              <div className="text-sky-400 font-bold text-sm mt-0.5">
                {netCharge > 0 ? `+${netCharge}` : netCharge}
              </div>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-lg border text-xs ${
                isExact
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {feedback}
            </div>
          )}

          <button
            type="button"
            onClick={handleVerify}
            disabled={pending}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm rounded-lg transition-colors cursor-pointer"
          >
            {idx + 1 === targets.length ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Synthesize & Finish Lab</span>
              </>
            ) : (
              <>
                <Atom className="w-4 h-4" />
                <span>Verify Atomic Build</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
