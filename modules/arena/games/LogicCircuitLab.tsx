import React, { useMemo, useState } from 'react';
import { CheckCircle2, Cpu, Zap } from 'lucide-react';
import { soundFx } from '../sound';
import { useRoundTransition } from '../round-transition';
import type { ActiveGameRenderProps } from '../game-types';

import { getCircuitStages, evalGate, type GateType } from '../rules/LogicCircuitLab';

export const LogicCircuitLab: React.FC<ActiveGameRenderProps> = ({
  difficulty,
  onFinish,
}) => {
  const stages = getCircuitStages(difficulty);
  const [stageIndex, setStageIndex] = useState(0);
  const [gate1, setGate1] = useState<GateType>(stages[0].availableGates[0]);
  const [gate2, setGate2] = useState<GateType>(stages[0].availableGates[0]);
  const [probeA, setProbeA] = useState(stages[0].inputs.A);
  const [probeB, setProbeB] = useState(stages[0].inputs.B);
  const [probeC, setProbeC] = useState(stages[0].inputs.C);
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [submittedStages, setSubmittedStages] = useState<Array<{ gate1: GateType; gate2: GateType }>>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const stage = stages[stageIndex];

  const liveSignals = useMemo(() => {
    const g1 = evalGate(gate1, probeA, probeB);
    const out = evalGate(gate2, g1, probeC);
    return { g1, out };
  }, [gate1, gate2, probeA, probeB, probeC]);

  const vectorResults = useMemo(() => {
    return stage.truthTestVectors.map((vec) => {
      const g1 = evalGate(gate1, vec.A, vec.B);
      const actual = evalGate(gate2, g1, vec.C);
      return { ...vec, actual, pass: actual === vec.expected };
    });
  }, [gate1, gate2, stage]);

  const { pending, advanceAfterFeedback, isTransitioning } = useRoundTransition();

  const handleVerifyCircuit = () => {
    if (isTransitioning()) return;
    setAttempts((a) => a + 1);
    const allPass = vectorResults.every((v) => v.pass);

    if (allPass) {
      soundFx.playSuccess();
      const nextCorrect = correctCount + 1;
      setCorrectCount(nextCorrect);
      const nextSubmitted = [...submittedStages, { gate1, gate2 }];
      setSubmittedStages(nextSubmitted);
      setFeedback('Circuit verified across all truth-table test vectors.');

      if (stageIndex + 1 >= stages.length) {
        const totalAttempts = attempts + 1;
        const accuracy = Math.min(
          100,
          Math.round((stages.length / totalAttempts) * 100)
        );
        const score = Math.round(accuracy * 10);
        advanceAfterFeedback(() => {
          onFinish({
            score,
            maxScore: 1000,
            accuracy,
            roundsCompleted: stages.length,
            totalRounds: stages.length,
            hintsUsed: 0,
            submissionPayload: { stages: nextSubmitted },
            highlights: [
              `Solved ${stages.length} combinational circuits on ${difficulty} tier`,
              `Total verification checks: ${totalAttempts}`,
            ],
          });
        }, 450);
      } else {
        const nextIdx = stageIndex + 1;
        advanceAfterFeedback(() => {
          setStageIndex(nextIdx);
          setGate1(stages[nextIdx].availableGates[0]);
          setGate2(stages[nextIdx].availableGates[0]);
          setProbeA(stages[nextIdx].inputs.A);
          setProbeB(stages[nextIdx].inputs.B);
          setProbeC(stages[nextIdx].inputs.C);
          setFeedback(null);
        }, 550);
      }
    } else {
      soundFx.playError();
      setFeedback('Mismatch on one or more truth-table rows. Adjust Gate 1 or Gate 2.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Stage Progress & Prompt */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs font-mono text-sky-400">
            CIRCUIT STAGE {stageIndex + 1} OF {stages.length}
          </div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-slate-50 mt-0.5">
            {stage.title}
          </h2>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            {stage.description}
          </p>
        </div>
        <div className="text-xs text-slate-400 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2 shrink-0">
          Hint: {stage.hint}
        </div>
      </div>

      {/* Main Split: Interactive SVG Schematic + Truth Table Verification */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Schematic & Gate Selector */}
        <div className="lg:col-span-7 bg-[#0B0F17] border border-slate-800 rounded-xl p-4 sm:p-5 space-y-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-slate-200">
              <Cpu className="w-4 h-4 text-sky-400" />
              Interactive Wire Schematic (tap inputs A, B, C to probe)
            </span>
            <span className="font-mono tabular-nums">
              OUT = {liveSignals.out}
            </span>
          </div>

          <div className="w-full overflow-x-auto">
            <svg
              viewBox="0 0 600 240"
              className="w-full min-w-[440px] h-auto select-none"
              role="group"
              aria-label="Digital logic circuit diagram"
            >
              {/* Wire A -> Gate 1 */}
              <path
                d="M 85 55 H 215"
                stroke={probeA ? '#38BDF8' : '#334155'}
                strokeWidth="3.5"
                fill="none"
              />
              {/* Wire B -> Gate 1 */}
              <path
                d="M 85 115 H 215"
                stroke={probeB ? '#38BDF8' : '#334155'}
                strokeWidth="3.5"
                fill="none"
              />
              {/* Wire Gate 1 -> Gate 2 */}
              <path
                d="M 315 85 H 360 V 105 H 395"
                stroke={liveSignals.g1 ? '#F59E0B' : '#334155'}
                strokeWidth="3.5"
                fill="none"
              />
              {/* Wire C -> Gate 2 */}
              <path
                d="M 85 185 H 360 V 145 H 395"
                stroke={probeC ? '#38BDF8' : '#334155'}
                strokeWidth="3.5"
                fill="none"
              />
              {/* Wire Gate 2 -> Output */}
              <path
                d="M 495 125 H 535"
                stroke={liveSignals.out ? '#10B981' : '#334155'}
                strokeWidth="4"
                fill="none"
              />

              {/* Input Nodes (Clickable) */}
              {[
                { label: 'A', val: probeA, y: 55, toggle: () => setProbeA((v) => (v ? 0 : 1)) },
                { label: 'B', val: probeB, y: 115, toggle: () => setProbeB((v) => (v ? 0 : 1)) },
                { label: 'C', val: probeC, y: 185, toggle: () => setProbeC((v) => (v ? 0 : 1)) },
              ].map((inp) => (
                <g
                  key={inp.label}
                  role="button"
                  tabIndex={0}
                  aria-label={`Toggle input ${inp.label}`}
                  aria-pressed={Boolean(inp.val)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    soundFx.playClick();
                    inp.toggle();
                  }}
                  onClick={() => {
                    soundFx.playClick();
                    inp.toggle();
                  }}
                  className="cursor-pointer"
                >
                  <rect
                    x="20"
                    y={inp.y - 20}
                    width="65"
                    height="40"
                    rx="8"
                    fill={inp.val ? '#0C4A6E' : '#1E293B'}
                    stroke={inp.val ? '#38BDF8' : '#475569'}
                    strokeWidth="2"
                  />
                  <text
                    x="52"
                    y={inp.y + 5}
                    textAnchor="middle"
                    fill="#F8FAFC"
                    fontSize="14"
                    fontWeight="700"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    {inp.label}: {inp.val}
                  </text>
                </g>
              ))}

              {/* Gate 1 Box */}
              <g>
                <rect
                  x="215"
                  y="45"
                  width="100"
                  height="80"
                  rx="10"
                  fill="#151E2E"
                  stroke="#F59E0B"
                  strokeWidth="2"
                />
                <text
                  x="265"
                  y="74"
                  textAnchor="middle"
                  fill="#94A3B8"
                  fontSize="11"
                  fontFamily="DM Sans, sans-serif"
                >
                  GATE 1
                </text>
                <text
                  x="265"
                  y="98"
                  textAnchor="middle"
                  fill="#FBBF24"
                  fontSize="18"
                  fontWeight="700"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {gate1}
                </text>
              </g>

              {/* Gate 2 Box */}
              <g>
                <rect
                  x="395"
                  y="85"
                  width="100"
                  height="80"
                  rx="10"
                  fill="#151E2E"
                  stroke="#38BDF8"
                  strokeWidth="2"
                />
                <text
                  x="445"
                  y="114"
                  textAnchor="middle"
                  fill="#94A3B8"
                  fontSize="11"
                  fontFamily="DM Sans, sans-serif"
                >
                  GATE 2
                </text>
                <text
                  x="445"
                  y="138"
                  textAnchor="middle"
                  fill="#38BDF8"
                  fontSize="18"
                  fontWeight="700"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {gate2}
                </text>
              </g>

              {/* Output Indicator */}
              <g>
                <circle
                  cx="558"
                  cy="125"
                  r="22"
                  fill={liveSignals.out ? '#064E3B' : '#1E293B'}
                  stroke={liveSignals.out ? '#10B981' : '#475569'}
                  strokeWidth="2.5"
                />
                <text
                  x="558"
                  y="130"
                  textAnchor="middle"
                  fill={liveSignals.out ? '#34D399' : '#94A3B8'}
                  fontSize="16"
                  fontWeight="700"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {liveSignals.out}
                </text>
              </g>
            </svg>
          </div>

          {/* Touch-friendly Gate Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
            <div className="space-y-2">
              <div className="text-xs font-medium text-amber-300">
                Select Gate 1 (Inputs A, B)
              </div>
              <div className="flex flex-wrap gap-2">
                {stage.availableGates.map((g) => (
                  <button
                    key={`g1-${g}`}
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      setGate1(g);
                    }}
                    className={`min-h-[40px] px-3 py-1.5 text-xs font-mono font-semibold rounded-lg border transition-colors cursor-pointer ${
                      gate1 === g
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-sky-300">
                Select Gate 2 (Inputs G1, C)
              </div>
              <div className="flex flex-wrap gap-2">
                {stage.availableGates.map((g) => (
                  <button
                    key={`g2-${g}`}
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      setGate2(g);
                    }}
                    className={`min-h-[40px] px-3 py-1.5 text-xs font-mono font-semibold rounded-lg border transition-colors cursor-pointer ${
                      gate2 === g
                        ? 'bg-sky-400 text-slate-950 border-sky-300'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Truth Table Verification & Submit */}
        <div className="lg:col-span-5 bg-[#0B0F17] border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-100">
              Target Truth Vector Check
            </h3>
            <span className="text-xs font-mono tabular-nums text-slate-400">
              {vectorResults.filter((v) => v.pass).length}/{vectorResults.length} Passing
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono tabular-nums">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 pr-2">A</th>
                  <th className="py-2 pr-2">B</th>
                  <th className="py-2 pr-2">C</th>
                  <th className="py-2 pr-2">Target</th>
                  <th className="py-2 pr-2">Yours</th>
                  <th className="py-2 text-right">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {vectorResults.map((row, idx) => (
                  <tr key={idx} className="text-slate-200">
                    <td className="py-2.5 pr-2">{row.A}</td>
                    <td className="py-2.5 pr-2">{row.B}</td>
                    <td className="py-2.5 pr-2">{row.C}</td>
                    <td className="py-2.5 pr-2 text-amber-300 font-semibold">
                      {row.expected}
                    </td>
                    <td className="py-2.5 pr-2 font-semibold">{row.actual}</td>
                    <td className="py-2.5 text-right">
                      {row.pass ? (
                        <span className="text-emerald-400 font-semibold">MATCH</span>
                      ) : (
                        <span className="text-rose-400 font-semibold">DIFF</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-lg border text-xs ${
                vectorResults.every((v) => v.pass)
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {feedback}
            </div>
          )}

          <button
            type="button"
            onClick={handleVerifyCircuit}
            disabled={pending}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm rounded-lg transition-colors cursor-pointer"
          >
            {stageIndex + 1 === stages.length ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Verify & Finish Arena</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Verify & Advance Stage</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
