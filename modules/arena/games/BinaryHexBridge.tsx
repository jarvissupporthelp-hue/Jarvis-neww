
import {UiText} from "@/app/components/interface-language";
import React, { useState } from 'react';
import { Binary, CheckCircle2 } from 'lucide-react';
import { soundFx } from '../sound';
import { useRoundTransition } from '../round-transition';
import type { ActiveGameRenderProps } from '../game-types';

import { getBinaryPuzzles, BIT_WEIGHTS } from '../rules/BinaryHexBridge';

export const BinaryHexBridge: React.FC<ActiveGameRenderProps> = ({
  difficulty,
  onFinish,
}) => {
  const puzzles = getBinaryPuzzles(difficulty);
  const [idx, setIdx] = useState(0);
  const [byteVal, setByteVal] = useState(puzzles[0].startByte);
  const [submittedBytes, setSubmittedBytes] = useState<number[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  const puzzle = puzzles[idx];

  const toggleBit = (weight: number) => {
    soundFx.playClick();
    setByteVal((v) => v ^ weight);
    setFeedback(null);
  };

  const applyOp = (op: 'LSHIFT' | 'RSHIFT' | 'NOT' | 'CLEAR') => {
    soundFx.playClick();
    setFeedback(null);
    if (op === 'LSHIFT') setByteVal((v) => (v << 1) & 0xff);
    if (op === 'RSHIFT') setByteVal((v) => v >> 1);
    if (op === 'NOT') setByteVal((v) => ~v & 0xff);
    if (op === 'CLEAR') setByteVal(0);
  };

  const { pending, advanceAfterFeedback, isTransitioning } = useRoundTransition();

  const handleVerify = () => {
    if (isTransitioning()) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    if (byteVal === puzzle.targetByte) {
      soundFx.playSuccess();
      const nextBytes = [...submittedBytes, byteVal];
      setSubmittedBytes(nextBytes);
      setFeedback('8-bit register matches target state.');
      if (idx + 1 >= puzzles.length) {
        const accuracy = Math.min(
          100,
          Math.round((puzzles.length / nextAttempts) * 100)
        );
        advanceAfterFeedback(() => {
          onFinish({
            score: accuracy * 10,
            maxScore: 1000,
            accuracy,
            roundsCompleted: puzzles.length,
            totalRounds: puzzles.length,
            hintsUsed: 0,
            submissionPayload: { bytes: nextBytes },
            highlights: [
              `Matched ${puzzles.length} 8-bit register challenges on ${difficulty}`,
            ],
          });
        }, 450);
      } else {
        const nextIdx = idx + 1;
        advanceAfterFeedback(() => {
          setIdx(nextIdx);
          setByteVal(puzzles[nextIdx].startByte);
          setFeedback(null);
        }, 550);
      }
    } else {
      soundFx.playError();
      setFeedback('Register value does not match target yet.');
    }
  };

  const hexString = `0x${byteVal.toString(16).toUpperCase().padStart(2, '0')}`;
  const binString = byteVal.toString(2).padStart(8, '0');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs font-mono text-emerald-400">
            {"REGISTER"} {idx + 1} {"OF"} {puzzles.length}
          </div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-slate-50 mt-0.5">
            {puzzle.title}
          </h2>
          <p className="text-sm text-slate-300 mt-1">{puzzle.prompt}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-right shrink-0">
          <div className="text-[11px] text-slate-400">Target Specification</div>
          <div className="font-mono text-base font-bold text-amber-400 tabular-nums">
            {puzzle.displayTargetAs === 'HEX'
              ? `0x${puzzle.targetByte.toString(16).toUpperCase().padStart(2, '0')}`
              : puzzle.displayTargetAs === 'DECIMAL'
              ? `${puzzle.targetByte} (dec)`
              : 'Evaluate Expression'}
          </div>
        </div>
      </div>

      {/* 8-Bit Interactive Switch Bank */}
      <div className="bg-[#0B0F17] border border-slate-800 rounded-xl p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
          {BIT_WEIGHTS.map((weight, bitIdx) => {
            const isSet = (byteVal & weight) !== 0;
            return (
              <button
                key={weight}
                type="button"
                onClick={() => toggleBit(weight)}
                className={`min-h-[74px] rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  isSet
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                <span className="font-mono text-[11px] text-slate-500">
                  2^{7 - bitIdx} ({weight})
                </span>
                <span className="font-mono text-2xl font-bold tabular-nums">
                  <UiText value={isSet ? '1' : '0'}/>
                </span>
              </button>
            );
          })}
        </div>

        {/* Bitwise Quick Operator Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyOp('LSHIFT')}
              className="px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-lg text-slate-200 cursor-pointer"
            >
              {'<< 1 (Shift Left)'}
            </button>
            <button
              type="button"
              onClick={() => applyOp('RSHIFT')}
              className="px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-lg text-slate-200 cursor-pointer"
            >
              {'>> 1 (Shift Right)'}
            </button>
            <button
              type="button"
              onClick={() => applyOp('NOT')}
              className="px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-lg text-slate-200 cursor-pointer"
            >
              ~ (Invert Bits)
            </button>
            <button
              type="button"
              onClick={() => applyOp('CLEAR')}
              className="px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-lg text-slate-400 cursor-pointer"
            >
              Clear (0x00)
            </button>
          </div>

          <div className="flex items-center gap-4 font-mono text-xs tabular-nums">
            <span className="text-slate-400">
              BIN: <strong className="text-slate-100">{binString}</strong>
            </span>
            <span className="text-slate-400">
              HEX: <strong className="text-sky-400">{hexString}</strong>
            </span>
            <span className="text-slate-400">
              DEC: <strong className="text-amber-400">{byteVal}</strong>
            </span>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg border text-xs ${
            byteVal === puzzle.targetByte
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Binary className="w-4 h-4 text-emerald-400" />
          <span>Sum of active bit weights determines register byte value.</span>
        </div>
        <button
          type="button"
          onClick={handleVerify}
          disabled={pending}
          className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm rounded-lg transition-colors cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>
            <UiText value={idx + 1 === puzzles.length ? 'Verify & Finish' : 'Verify Register'}/>
          </span>
        </button>
      </div>
    </div>
  );
};
