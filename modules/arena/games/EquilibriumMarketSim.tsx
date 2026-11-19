import React, { useMemo, useState } from 'react';
import { CheckCircle2, Minus, Plus } from 'lucide-react';
import { soundFx } from '../sound';
import { useRoundTransition } from '../round-transition';
import type { ActiveGameRenderProps } from '../game-types';

import { getMarketScenarios, marketEquilibrium } from '../rules/EquilibriumMarketSim';

export const EquilibriumMarketSim: React.FC<ActiveGameRenderProps> = ({
  difficulty,
  onFinish,
}) => {
  const scenarios = getMarketScenarios(difficulty);
  const [idx, setIdx] = useState(0);
  const [price, setPrice] = useState(50);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  const sc = scenarios[idx];

  const metrics = useMemo(() => {
    const { eqQ, eqP } = marketEquilibrium(sc);
    const qDemanded = Math.max(0, (sc.dIntercept - price) / sc.dSlope);
    const qSupplied = Math.max(0, (price - sc.sIntercept) / sc.sSlope);
    const imbalance = qSupplied - qDemanded; // >0 surplus, <0 shortage
    const tradedQ = Math.min(qDemanded, qSupplied);
    const dwl =
      0.5 *
      Math.max(0, eqQ - tradedQ) *
      Math.abs((sc.dIntercept - sc.dSlope * tradedQ) - (sc.sIntercept + sc.sSlope * tradedQ));
    return { eqQ, eqP, qDemanded, qSupplied, imbalance, dwl };
  }, [sc, price]);

  const toX = (q: number) => 55 + (q / 45) * 410;
  const toY = (p: number) => 225 - (p / 135) * 195;

  const [answers, setAnswers] = useState<unknown[]>([]);
  const { pending, advanceAfterFeedback, isTransitioning } = useRoundTransition();

  const handleLockPrice = () => {
    if (isTransitioning()) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    const err = Math.abs(price - metrics.eqP);
    if (err <= 1.5) {
      const nextAnswers = [...answers, price];
      setAnswers(nextAnswers);
      soundFx.playSuccess();
      setFeedback(
        `Market cleared at P* = $${metrics.eqP.toFixed(1)}, Q* = ${metrics.eqQ.toFixed(1)}.`
      );
      if (idx + 1 >= scenarios.length) {
        const accuracy = Math.min(
          100,
          Math.round((scenarios.length / nextAttempts) * 100)
        );
        advanceAfterFeedback(() => {
          onFinish({
            score: accuracy * 10,
            maxScore: 1000,
            accuracy,
            roundsCompleted: scenarios.length,
            totalRounds: scenarios.length,
            submissionPayload: { answers: nextAnswers },
            highlights: [
              `Solved ${scenarios.length} market equilibrium shocks on ${difficulty}`,
            ],
          });
        }, 500);
      } else {
        advanceAfterFeedback(() => {
          setIdx((i) => i + 1);
          setPrice(50);
          setFeedback(null);
        }, 650);
      }
    } else {
      soundFx.playError();
      const stateText =
        metrics.imbalance > 0
          ? `Excess supply (surplus of ${metrics.imbalance.toFixed(1)} units). Lower price.`
          : `Excess demand (shortage of ${Math.abs(metrics.imbalance).toFixed(1)} units). Raise price.`;
      setFeedback(stateText);
    }
  };

  const dEndQ = Math.min(45, sc.dIntercept / sc.dSlope);
  const sEndQ = Math.min(45, (135 - sc.sIntercept) / sc.sSlope);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-mono text-amber-400">
          SCENARIO {idx + 1} OF {scenarios.length}
        </div>
        <h2 className="font-display text-lg sm:text-xl font-bold text-slate-50 mt-0.5">
          {sc.title}
        </h2>
        <p className="text-sm text-slate-300 mt-1">{sc.shockDescription}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-[#0B0F17] border border-slate-800 rounded-xl p-4">
          <svg
            viewBox="0 0 500 260"
            className="w-full h-auto select-none"
            role="img"
            aria-label="Supply and demand equilibrium graph"
          >
            {/* Axes */}
            <line x1="55" y1="20" x2="55" y2="225" stroke="#475569" strokeWidth="1.5" />
            <line x1="55" y1="225" x2="475" y2="225" stroke="#475569" strokeWidth="1.5" />
            <text x="20" y="35" fill="#94A3B8" fontSize="11" fontFamily="IBM Plex Mono, monospace">
              P ($)
            </text>
            <text x="450" y="245" fill="#94A3B8" fontSize="11" fontFamily="IBM Plex Mono, monospace">
              Q
            </text>

            {/* Demand Curve */}
            <line
              x1={toX(0)}
              y1={toY(sc.dIntercept)}
              x2={toX(dEndQ)}
              y2={toY(sc.dIntercept - sc.dSlope * dEndQ)}
              stroke="#38BDF8"
              strokeWidth="2.5"
            />
            <text
              x={toX(dEndQ * 0.72)}
              y={toY(sc.dIntercept - sc.dSlope * dEndQ * 0.72) - 8}
              fill="#38BDF8"
              fontSize="11"
              fontWeight="600"
            >
              Demand
            </text>

            {/* Supply Curve */}
            <line
              x1={toX(0)}
              y1={toY(sc.sIntercept)}
              x2={toX(sEndQ)}
              y2={toY(sc.sIntercept + sc.sSlope * sEndQ)}
              stroke="#10B981"
              strokeWidth="2.5"
            />
            <text
              x={toX(sEndQ * 0.78)}
              y={toY(sc.sIntercept + sc.sSlope * sEndQ * 0.78) - 8}
              fill="#10B981"
              fontSize="11"
              fontWeight="600"
            >
              Supply
            </text>

            {/* Current Price Horizontal Line */}
            <line
              x1="55"
              y1={toY(price)}
              x2="465"
              y2={toY(price)}
              stroke="#F59E0B"
              strokeWidth="2"
              strokeDasharray="5 4"
            />
            <text
              x="462"
              y={toY(price) - 6}
              textAnchor="end"
              fill="#FBBF24"
              fontSize="11"
              fontFamily="IBM Plex Mono, monospace"
            >
              P = ${price}
            </text>

            {/* Qd & Qs markers */}
            <circle cx={toX(metrics.qDemanded)} cy={toY(price)} r="4.5" fill="#38BDF8" />
            <circle cx={toX(metrics.qSupplied)} cy={toY(price)} r="4.5" fill="#10B981" />
          </svg>
        </div>

        <div className="lg:col-span-5 bg-[#0B0F17] border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Set Market Price (P)</span>
            <span className="font-mono text-lg font-bold text-amber-400 tabular-nums">
              ${price}
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={120}
            step={1}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            aria-label="Market price in dollars"
            className="w-full accent-amber-400 cursor-pointer"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPrice((p) => Math.max(10, p - 1))}
              aria-label="Decrease price"
              className="flex-1 min-h-[40px] inline-flex items-center justify-center bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-lg text-slate-200 cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setPrice((p) => Math.min(120, p + 1))}
              aria-label="Increase price"
              className="flex-1 min-h-[40px] inline-flex items-center justify-center bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-lg text-slate-200 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs font-mono tabular-nums">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <div className="text-slate-400">Qty Demanded</div>
              <div className="text-sky-400 text-base font-bold mt-0.5">
                {metrics.qDemanded.toFixed(1)}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <div className="text-slate-400">Qty Supplied</div>
              <div className="text-emerald-400 text-base font-bold mt-0.5">
                {metrics.qSupplied.toFixed(1)}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <div className="text-slate-400">Net Imbalance</div>
              <div className="text-slate-100 text-base font-bold mt-0.5">
                {metrics.imbalance >= 0
                  ? `+${metrics.imbalance.toFixed(1)}`
                  : metrics.imbalance.toFixed(1)}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <div className="text-slate-400">Deadweight Loss</div>
              <div className="text-amber-300 text-base font-bold mt-0.5">
                ${metrics.dwl.toFixed(0)}
              </div>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-lg border text-xs ${
                Math.abs(price - metrics.eqP) <= 1.5
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {feedback}
            </div>
          )}

          <button
            type="button"
            onClick={handleLockPrice}
            disabled={pending}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm rounded-lg transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {idx + 1 === scenarios.length
                ? 'Lock Equilibrium & Finish'
                : 'Lock Market Equilibrium'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
