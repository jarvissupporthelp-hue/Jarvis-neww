
import {UiText} from "@/app/components/interface-language";
import React, { useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, CheckCircle2 } from 'lucide-react';
import { soundFx } from '../sound';
import type { ActiveGameRenderProps } from '../game-types';

import { isSortedAsc, getSortPuzzles } from '../rules/AlgorithmSortDuel';

export const AlgorithmSortDuel: React.FC<ActiveGameRenderProps> = ({
  difficulty,
  onFinish,
}) => {
  const puzzles = getSortPuzzles(difficulty);
  const lastSubmittedRound = useRef(-1);
  const [roundIdx, setRoundIdx] = useState(0);
  const [array, setArray] = useState<number[]>(() => [...puzzles[0].initial]);
  const [submittedArrays, setSubmittedArrays] = useState<number[][]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [swaps, setSwaps] = useState(0);
  const [totalSwaps, setTotalSwaps] = useState(0);
  const [totalPar, setTotalPar] = useState(0);

  const puzzle = puzzles[roundIdx];
  const maxVal = useMemo(() => Math.max(...array), [array]);
  const sorted = useMemo(() => isSortedAsc(array), [array]);

  const handleSelectBar = (idx: number) => {
    if (sorted) return;
    if (selectedIdx === null) {
      soundFx.playClick();
      setSelectedIdx(idx);
      return;
    }
    if (selectedIdx === idx) {
      setSelectedIdx(null);
      return;
    }

    const next = [...array];
    const tmp = next[selectedIdx];
    next[selectedIdx] = next[idx];
    next[idx] = tmp;

    soundFx.playClick();
    setArray(next);
    setSelectedIdx(null);
    setSwaps((s) => s + 1);
  };

  const handleAdvance = () => {
    if (lastSubmittedRound.current === roundIdx) return;
    if (!sorted) {
      soundFx.playError();
      return;
    }
    lastSubmittedRound.current = roundIdx;
    soundFx.playSuccess();
    const nextTotalSwaps = totalSwaps + swaps;
    const nextTotalPar = totalPar + puzzle.parSwaps;
    const nextSubmittedArrays = [...submittedArrays, [...array]];
    setSubmittedArrays(nextSubmittedArrays);

    if (roundIdx + 1 >= puzzles.length) {
      const efficiency = Math.min(
        100,
        Math.max(50, Math.round((nextTotalPar / Math.max(1, nextTotalSwaps)) * 100))
      );
      onFinish({
        score: efficiency * 10,
        maxScore: 1000,
        accuracy: efficiency,
        roundsCompleted: puzzles.length,
        totalRounds: puzzles.length,
        hintsUsed: 0,
        submissionPayload: { sorted_arrays: nextSubmittedArrays },
        highlights: [
          `Sorted ${puzzles.length} arrays in ${nextTotalSwaps} swaps (Par ${nextTotalPar})`,
        ],
      });
    } else {
      const nextIdx = roundIdx + 1;
      setTotalSwaps(nextTotalSwaps);
      setTotalPar(nextTotalPar);
      setRoundIdx(nextIdx);
      setArray([...puzzles[nextIdx].initial]);
      setSelectedIdx(null);
      setSwaps(0);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs font-mono text-emerald-400">
            {puzzle.title} ({roundIdx + 1}/{puzzles.length})
          </div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-slate-50 mt-0.5">
            In-Place Optimal Swap Sorting
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            Tap any two elements to swap them into ascending order while minimizing total swaps (Cycle Sort / Selection optimality).
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs tabular-nums shrink-0">
          <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200">
            Swaps: <span className="text-amber-400 font-bold">{swaps}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-400">
            Optimal Par: <span className="text-emerald-400 font-bold">{puzzle.parSwaps}</span>
          </div>
        </div>
      </div>

      {/* Interactive Array Bar Stage */}
      <div className="bg-[#0B0F17] border border-slate-800 rounded-xl p-4 sm:p-6">
        <div className="grid gap-2 sm:gap-3 items-end h-56" style={{ gridTemplateColumns: `repeat(${array.length}, minmax(0, 1fr))` }}>
          {array.map((val, idx) => {
            const isSelected = selectedIdx === idx;
            const heightPct = Math.max(20, Math.round((val / maxVal) * 100));
            return (
              <button
                key={`${idx}-${val}`}
                type="button"
                onClick={() => handleSelectBar(idx)}
                className={`group flex flex-col items-center justify-end h-full focus-visible:outline-none cursor-pointer`}
              >
                <span className="font-mono text-xs sm:text-sm font-bold text-slate-100 tabular-nums mb-1.5">
                  {val}
                </span>
                <div
                  style={{ height: `${heightPct}%` }}
                  className={`w-full rounded-t-lg border transition-all duration-150 ${
                    sorted
                      ? 'bg-emerald-500/30 border-emerald-400'
                      : isSelected
                      ? 'bg-amber-400 border-amber-300 -translate-y-1'
                      : 'bg-sky-500/25 border-sky-400/50 group-hover:bg-sky-500/40'
                  }`}
                />
                <span className="font-mono text-[11px] text-slate-500 mt-1.5 tabular-nums">
                  [{idx}]
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <ArrowLeftRight className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            {sorted
              ? 'Array is sorted in ascending order.'
              : selectedIdx !== null
              ? `Selected index [${selectedIdx}] (value ${array[selectedIdx]}). Tap another bar to swap.`
              : 'Tap any bar to begin a swap.'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleAdvance}
          disabled={!sorted}
          className={`min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            sorted
              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>
            <UiText value={roundIdx + 1 === puzzles.length ? 'Finish Sorting Duel' : 'Next Array'}/>
          </span>
        </button>
      </div>
    </div>
  );
};
