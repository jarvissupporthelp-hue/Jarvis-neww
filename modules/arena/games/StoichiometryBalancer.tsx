
import {UiText} from "@/app/components/interface-language";
import React, { useMemo, useState } from 'react';
import { CheckCircle2, Minus, Plus } from 'lucide-react';
import { soundFx } from '../sound';
import { useRoundTransition } from '../round-transition';
import type { ActiveGameRenderProps } from '../game-types';

import { atomInventory, getEquations } from '../rules/StoichiometryBalancer';

export const StoichiometryBalancer: React.FC<ActiveGameRenderProps> = ({
  difficulty,
  onFinish,
}) => {
  const equations = getEquations(difficulty);
  const [idx, setIdx] = useState(0);
  const equation = equations[idx];

  const [reactantCoeffs, setReactantCoeffs] = useState<number[]>(() =>
    equation.reactants.map(() => 1)
  );
  const [productCoeffs, setProductCoeffs] = useState<number[]>(() =>
    equation.products.map(() => 1)
  );
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  const inventory = useMemo(
    () => atomInventory(equation, reactantCoeffs, productCoeffs),
    [equation, reactantCoeffs, productCoeffs]
  );

  const isBalanced = inventory.every((row) => row.balanced);

  const adjustCoeff = (side: 'reactant' | 'product', termIdx: number, delta: number) => {
    soundFx.playClick();
    setFeedback(null);
    if (side === 'reactant') {
      setReactantCoeffs((prev) =>
        prev.map((v, i) => (i === termIdx ? Math.max(1, Math.min(12, v + delta)) : v))
      );
    } else {
      setProductCoeffs((prev) =>
        prev.map((v, i) => (i === termIdx ? Math.max(1, Math.min(12, v + delta)) : v))
      );
    }
  };

  const [answers, setAnswers] = useState<unknown[]>([]);
  const { pending, advanceAfterFeedback, isTransitioning } = useRoundTransition();

  const handleVerify = () => {
    if (isTransitioning()) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    if (!isBalanced) {
      soundFx.playError();
      setFeedback('Atom counts are not equal across both sides of the reaction.');
      return;
    }

    soundFx.playSuccess();
    const nextAnswers = [...answers, [reactantCoeffs, productCoeffs]];
    setAnswers(nextAnswers);
    setFeedback('Conservation of mass verified!');

    if (idx + 1 >= equations.length) {
      const accuracy = Math.min(
        100,
        Math.round((equations.length / nextAttempts) * 100)
      );
      advanceAfterFeedback(() => {
        onFinish({
          score: accuracy * 10,
          maxScore: 1000,
          accuracy,
          roundsCompleted: equations.length,
          totalRounds: equations.length,
          submissionPayload: { answers: nextAnswers },
          highlights: [
            `Balanced ${equations.length} stoichiometric reactions on ${difficulty}`,
          ],
        });
      }, 450);
    } else {
      const nextIdx = idx + 1;
      advanceAfterFeedback(() => {
        setIdx(nextIdx);
        setReactantCoeffs(equations[nextIdx].reactants.map(() => 1));
        setProductCoeffs(equations[nextIdx].products.map(() => 1));
        setFeedback(null);
      }, 550);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-mono text-emerald-400">
          {"REACTION"} {idx + 1} {"OF"} {equations.length}
        </div>
        <h2 className="font-display text-lg sm:text-xl font-bold text-slate-50 mt-0.5">
          {equation.title}
        </h2>
        <p className="text-sm text-slate-300 mt-1">
          Adjust stoichiometric coefficients until every element matches on both reactant and product sides.
        </p>
      </div>

      {/* Interactive Reaction Equation Workbench */}
      <div className="bg-[#0B0F17] border border-slate-800 rounded-xl p-4 sm:p-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        {equation.reactants.map((term, i) => (
          <React.Fragment key={`r-${term.formula}`}>
            {i > 0 && <span className="text-xl font-bold text-slate-500">+</span>}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 flex items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => adjustCoeff('reactant', i, 1)}
                  aria-label={`Increase coefficient for ${term.formula}`}
                  className="w-9 h-9 inline-flex items-center justify-center rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <span className="font-mono text-xl font-bold text-amber-400 tabular-nums">
                  {reactantCoeffs[i]}
                </span>
                <button
                  type="button"
                  onClick={() => adjustCoeff('reactant', i, -1)}
                  aria-label={`Decrease coefficient for ${term.formula}`}
                  className="w-9 h-9 inline-flex items-center justify-center rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
              <span className="font-mono text-lg sm:text-xl font-semibold text-slate-100">
                {term.formula}
              </span>
            </div>
          </React.Fragment>
        ))}

        <span className="text-2xl font-bold text-sky-400 px-2">→</span>

        {equation.products.map((term, i) => (
          <React.Fragment key={`p-${term.formula}`}>
            {i > 0 && <span className="text-xl font-bold text-slate-500">+</span>}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 flex items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => adjustCoeff('product', i, 1)}
                  aria-label={`Increase coefficient for ${term.formula}`}
                  className="w-9 h-9 inline-flex items-center justify-center rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <span className="font-mono text-xl font-bold text-sky-400 tabular-nums">
                  {productCoeffs[i]}
                </span>
                <button
                  type="button"
                  onClick={() => adjustCoeff('product', i, -1)}
                  aria-label={`Decrease coefficient for ${term.formula}`}
                  className="w-9 h-9 inline-flex items-center justify-center rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
              <span className="font-mono text-lg sm:text-xl font-semibold text-slate-100">
                {term.formula}
              </span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Atomic Inventory Table */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        <div className="md:col-span-7 bg-[#0B0F17] border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-300 mb-3">
            Atomic Inventory Ledger
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {inventory.map((row) => (
              <div
                key={row.element}
                className={`p-3 rounded-lg border ${
                  row.balanced
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-base text-slate-100">
                    {row.element}
                  </span>
                  <span
                    className={`text-[11px] font-mono font-semibold ${
                      row.balanced ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    <UiText value={row.balanced ? 'EQUAL' : 'UNBALANCED'}/>
                  </span>
                </div>
                <div className="font-mono text-xs text-slate-300 tabular-nums mt-1.5">
                  {"L:"} {row.left} {"· R:"} {row.right}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-5 space-y-3">
          {feedback && (
            <div
              className={`p-3 rounded-lg border text-xs ${
                isBalanced
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
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm rounded-lg transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              <UiText value={idx + 1 === equations.length
                ? 'Verify & Finish Lab'
                : 'Verify Balanced Equation'}/>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
