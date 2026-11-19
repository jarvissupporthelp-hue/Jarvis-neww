import React, { useMemo, useState } from 'react';
import { CheckCircle2, Minus, Plus, RotateCw } from 'lucide-react';
import { soundFx } from '../sound';
import { useRoundTransition } from '../round-transition';
import type { ActiveGameRenderProps } from '../game-types';

import { getMatrixChallenges, BASE_SHAPE, transformPoint } from '../rules/MatrixTransformArena';

export const MatrixTransformArena: React.FC<ActiveGameRenderProps> = ({
  difficulty,
  onFinish,
}) => {
  const challenges = getMatrixChallenges(difficulty);
  const [roundIdx, setRoundIdx] = useState(0);
  const [matrix, setMatrix] = useState<[number, number, number, number]>([1, 0, 0, 1]);
  const [submittedMatrices, setSubmittedMatrices] = useState<Array<[number, number, number, number]>>([]);
  const [checks, setChecks] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  const challenge = challenges[roundIdx];
  const determinant = matrix[0] * matrix[3] - matrix[1] * matrix[2];
  const isMatch =
    matrix[0] === challenge.targetMatrix[0] &&
    matrix[1] === challenge.targetMatrix[1] &&
    matrix[2] === challenge.targetMatrix[2] &&
    matrix[3] === challenge.targetMatrix[3];

  const svgCoords = (x: number, y: number) => `${160 + x * 42},${160 - y * 42}`;

  const playerPoly = useMemo(
    () =>
      BASE_SHAPE.map((pt) => {
        const [tx, ty] = transformPoint(pt, matrix);
        return svgCoords(tx, ty);
      }).join(' '),
    [matrix]
  );

  const targetPoly = useMemo(
    () =>
      BASE_SHAPE.map((pt) => {
        const [tx, ty] = transformPoint(pt, challenge.targetMatrix);
        return svgCoords(tx, ty);
      }).join(' '),
    [challenge.targetMatrix]
  );

  const updateCell = (idx: 0 | 1 | 2 | 3, delta: number) => {
    soundFx.playClick();
    setMatrix((prev) => {
      const next = [...prev] as [number, number, number, number];
      next[idx] = Math.max(-3, Math.min(3, next[idx] + delta));
      return next;
    });
    setFeedback(null);
  };

  const { pending, advanceAfterFeedback, isTransitioning } = useRoundTransition();

  const handleSubmit = () => {
    if (isTransitioning()) return;
    const nextChecks = checks + 1;
    setChecks(nextChecks);

    if (isMatch) {
      soundFx.playSuccess();
      const nextMatrices = [...submittedMatrices, matrix];
      setSubmittedMatrices(nextMatrices);
      setFeedback('Transformation matrix aligned with target silhouette.');
      if (roundIdx + 1 >= challenges.length) {
        const accuracy = Math.min(
          100,
          Math.round((challenges.length / nextChecks) * 100)
        );
        advanceAfterFeedback(() => {
          onFinish({
            score: accuracy * 10,
            maxScore: 1000,
            accuracy,
            roundsCompleted: challenges.length,
            totalRounds: challenges.length,
            hintsUsed: 0,
            submissionPayload: { matrices: nextMatrices },
            highlights: [
              `Aligned ${challenges.length} linear transformations on ${difficulty}`,
            ],
          });
        }, 450);
      } else {
        advanceAfterFeedback(() => {
          setRoundIdx((r) => r + 1);
          setMatrix([1, 0, 0, 1]);
          setFeedback(null);
        }, 550);
      }
    } else {
      soundFx.playError();
      setFeedback('Matrix silhouette does not yet overlap the dashed target.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs font-mono text-sky-400">
            TRANSFORM {roundIdx + 1} OF {challenges.length}
          </div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-slate-50 mt-0.5">
            {challenge.title}
          </h2>
          <p className="text-sm text-slate-300 mt-1">{challenge.description}</p>
        </div>
        <div className="font-mono text-xs bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-slate-200 tabular-nums shrink-0">
          det(M) = {determinant}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coordinate Plane SVG */}
        <div className="lg:col-span-6 bg-[#0B0F17] border border-slate-800 rounded-xl p-4 flex justify-center">
          <svg
            viewBox="0 0 320 320"
            className="w-full max-w-[340px] h-auto select-none"
            role="img"
            aria-label="2D matrix transformation coordinate plane"
          >
            {[-3, -2, -1, 0, 1, 2, 3].map((v) => (
              <g key={`grid-${v}`}>
                <line
                  x1={160 + v * 42}
                  y1="16"
                  x2={160 + v * 42}
                  y2="304"
                  stroke={v === 0 ? '#475569' : '#1E293B'}
                  strokeWidth={v === 0 ? 1.5 : 1}
                />
                <line
                  x1="16"
                  y1={160 - v * 42}
                  x2="304"
                  y2={160 - v * 42}
                  stroke={v === 0 ? '#475569' : '#1E293B'}
                  strokeWidth={v === 0 ? 1.5 : 1}
                />
              </g>
            ))}

            {/* Target Silhouette */}
            <polygon
              points={targetPoly}
              fill="rgba(16, 185, 129, 0.14)"
              stroke="#10B981"
              strokeWidth="2.5"
              strokeDasharray="5 4"
            />

            {/* Player Transformed Polygon */}
            <polygon
              points={playerPoly}
              fill="rgba(56, 189, 248, 0.25)"
              stroke="#38BDF8"
              strokeWidth="2.5"
            />

            {/* Basis Vectors î and ĵ */}
            <line
              x1="160"
              y1="160"
              x2={160 + matrix[0] * 42}
              y2={160 - matrix[2] * 42}
              stroke="#F59E0B"
              strokeWidth="2.5"
            />
            <line
              x1="160"
              y1="160"
              x2={160 + matrix[1] * 42}
              y2={160 - matrix[3] * 42}
              stroke="#A78BFA"
              strokeWidth="2.5"
            />
          </svg>
        </div>

        {/* Matrix Editor & Presets */}
        <div className="lg:col-span-6 bg-[#0B0F17] border border-slate-800 rounded-xl p-4 sm:p-5 space-y-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>2×2 Transformation Matrix [ [a, b], [c, d] ]</span>
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setMatrix([1, 0, 0, 1]);
              }}
              className="inline-flex items-center gap-1 text-slate-300 hover:text-white cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Identity</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { idx: 0 as const, label: 'a (î·x)', color: 'text-amber-300' },
              { idx: 1 as const, label: 'b (ĵ·x)', color: 'text-violet-300' },
              { idx: 2 as const, label: 'c (î·y)', color: 'text-amber-300' },
              { idx: 3 as const, label: 'd (ĵ·y)', color: 'text-violet-300' },
            ].map((cell) => (
              <div
                key={cell.idx}
                className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-center justify-between gap-2"
              >
                <div>
                  <div className={`text-[11px] font-mono ${cell.color}`}>
                    {cell.label}
                  </div>
                  <div className="font-mono text-xl font-bold text-slate-50 tabular-nums">
                    {matrix[cell.idx]}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateCell(cell.idx, -1)}
                    aria-label={`Decrease ${cell.label}`}
                    className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCell(cell.idx, 1)}
                    aria-label={`Increase ${cell.label}`}
                    className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {[
              { label: 'Rotate 90°', mat: [0, -1, 1, 0] as [number, number, number, number] },
              { label: 'Reflect X', mat: [1, 0, 0, -1] as [number, number, number, number] },
              { label: 'Scale 2×', mat: [2, 0, 0, 2] as [number, number, number, number] },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  setMatrix(preset.mat);
                }}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-md text-slate-300 cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-lg border text-xs ${
                isMatch
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {feedback}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm rounded-lg transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {roundIdx + 1 === challenges.length
                ? 'Verify & Finish Arena'
                : 'Verify Transform'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
