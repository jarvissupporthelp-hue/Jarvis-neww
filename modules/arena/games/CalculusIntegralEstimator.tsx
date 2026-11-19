import React, { useState } from 'react';
import { CheckCircle2, Minus, Plus } from 'lucide-react';
import { soundFx } from '../sound';
import { useRoundTransition } from '../round-transition';
import type { ActiveGameRenderProps } from '../game-types';

import { getIntegralProblems, estimateIntegral, type QuadratureMethod } from '../rules/CalculusIntegralEstimator';

export const CalculusIntegralEstimator: React.FC<ActiveGameRenderProps> = ({
  difficulty,
  onFinish,
}) => {
  const problems = getIntegralProblems(difficulty);
  const [idx, setIdx] = useState(0);
  const [partitions, setPartitions] = useState(3);
  const [method, setMethod] = useState<QuadratureMethod>('Left');
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  const prob = problems[idx];

  const { estimate, rects, yMax } = estimateIntegral(prob, partitions, method);

  const absError = Math.abs(estimate - prob.exactArea);
  const withinTolerance =
    absError <= prob.tolerance && partitions <= prob.maxPartitionsAllowed;

  const toSvgX = (x: number) => 45 + ((x - prob.a) / (prob.b - prob.a)) * 420;
  const toSvgY = (y: number) => 215 - (Math.max(0, y) / yMax) * 185;

  const curvePoints = Array.from({ length: 51 }, (_, i) => {
    const x = prob.a + ((prob.b - prob.a) * i) / 50;
    return `${toSvgX(x).toFixed(1)},${toSvgY(prob.fn(x)).toFixed(1)}`;
  }).join(' ');

  const [answers, setAnswers] = useState<unknown[]>([]);
  const { pending, advanceAfterFeedback, isTransitioning } = useRoundTransition();

  const handleVerify = () => {
    if (isTransitioning()) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    if (withinTolerance) {
      const nextAnswers = [...answers, [method, partitions]];
      setAnswers(nextAnswers);
      soundFx.playSuccess();
      setFeedback(`Quadrature converged within ±${prob.tolerance} using ${method} rule.`);
      if (idx + 1 >= problems.length) {
        const accuracy = Math.min(
          100,
          Math.round((problems.length / nextAttempts) * 100)
        );
        advanceAfterFeedback(() => {
          onFinish({
            score: accuracy * 10,
            maxScore: 1000,
            accuracy,
            roundsCompleted: problems.length,
            totalRounds: problems.length,
            submissionPayload: { answers: nextAnswers },
            highlights: [
              `Converged ${problems.length} numerical integrals on ${difficulty}`,
            ],
          });
        }, 450);
      } else {
        advanceAfterFeedback(() => {
          setIdx((i) => i + 1);
          setPartitions(3);
          setMethod('Left');
          setFeedback(null);
        }, 550);
      }
    } else {
      soundFx.playError();
      setFeedback(
        `Current error is ${absError.toFixed(3)} (target ≤ ${prob.tolerance} with n ≤ ${prob.maxPartitionsAllowed}). Try Midpoint or Trapezoid!`
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs font-mono text-amber-400">
            INTEGRAL {idx + 1} OF {problems.length}
          </div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-slate-50 mt-0.5">
            {prob.title}
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            Select quadrature rule and partition count n ≤ {prob.maxPartitionsAllowed} to achieve approximation error ≤ {prob.tolerance}.
          </p>
        </div>
        <div className="font-mono text-xs bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-sky-300 shrink-0">
          {prob.formulaLabel}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-[#0B0F17] border border-slate-800 rounded-xl p-4">
          <svg
            viewBox="0 0 500 245"
            className="w-full h-auto select-none"
            role="img"
            aria-label="Riemann sum integral approximation graph"
          >
            {/* Axes */}
            <line x1="45" y1="20" x2="45" y2="215" stroke="#475569" strokeWidth="1.5" />
            <line x1="45" y1="215" x2="475" y2="215" stroke="#475569" strokeWidth="1.5" />

            {/* Riemann Rectangles / Trapezoids */}
            {rects.map((r, i) => {
              const xL = toSvgX(r.x0);
              const xR = toSvgX(r.x1);
              if (method === 'Trapezoid') {
                const yL = toSvgY(r.hLeft);
                const yR = toSvgY(r.hRight);
                return (
                  <polygon
                    key={i}
                    points={`${xL},215 ${xL},${yL} ${xR},${yR} ${xR},215`}
                    fill="rgba(56, 189, 248, 0.22)"
                    stroke="#38BDF8"
                    strokeWidth="1.2"
                  />
                );
              }
              const yTop = toSvgY(r.hSample);
              return (
                <rect
                  key={i}
                  x={xL}
                  y={yTop}
                  width={Math.max(1, xR - xL)}
                  height={Math.max(0, 215 - yTop)}
                  fill="rgba(56, 189, 248, 0.22)"
                  stroke="#38BDF8"
                  strokeWidth="1.2"
                />
              );
            })}

            {/* Exact Curve */}
            <polyline
              points={curvePoints}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2.5"
            />
          </svg>
        </div>

        <div className="lg:col-span-5 bg-[#0B0F17] border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
          <div>
            <div className="text-xs font-medium text-slate-300 mb-2">
              Quadrature Rule
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['Left', 'Right', 'Midpoint', 'Trapezoid'] as QuadratureMethod[]).map(
                (m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      setMethod(m);
                      setFeedback(null);
                    }}
                    className={`min-h-[40px] px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                      method === m
                        ? 'bg-sky-400 text-slate-950 border-sky-300'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {m} Rule
                  </button>
                )
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Subintervals (max n = {prob.maxPartitionsAllowed})
              </span>
              <span className="font-mono font-bold text-amber-400 tabular-nums">
                n = {partitions}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  setPartitions((n) => Math.max(1, n - 1));
                }}
                aria-label="Decrease partitions"
                className="flex-1 min-h-[40px] inline-flex items-center justify-center bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-lg text-slate-200 cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  setPartitions((n) => Math.min(prob.maxPartitionsAllowed, n + 1));
                }}
                aria-label="Increase partitions"
                className="flex-1 min-h-[40px] inline-flex items-center justify-center bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-lg text-slate-200 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs font-mono tabular-nums">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <div className="text-slate-400">Estimate</div>
              <div className="text-sky-400 text-base font-bold mt-0.5">
                {estimate.toFixed(3)}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <div className="text-slate-400">Absolute Error</div>
              <div
                className={`text-base font-bold mt-0.5 ${
                  withinTolerance ? 'text-emerald-400' : 'text-amber-300'
                }`}
              >
                {absError.toFixed(3)}
              </div>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-lg border text-xs ${
                withinTolerance
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
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {idx + 1 === problems.length
                ? 'Verify & Finish Lab'
                : 'Verify Integral Estimate'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
