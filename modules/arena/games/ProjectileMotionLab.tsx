import React, { useEffect, useMemo, useState } from 'react';
import { Circle, Minus, Plus } from 'lucide-react';
import { soundFx } from '../sound';
import { useRoundTransition } from '../round-transition';
import type { ActiveGameRenderProps } from '../game-types';

import { getLandingChallenges, computeTrajectory } from '../rules/ProjectileMotionLab';

export const ProjectileMotionLab: React.FC<ActiveGameRenderProps> = ({
  difficulty,
  onFinish,
}) => {
  const targets = getLandingChallenges(difficulty);
  const [roundIdx, setRoundIdx] = useState(0);
  const [angle, setAngle] = useState(45);
  const [velocity, setVelocity] = useState(25);
  const [throws, setThrows] = useState(0);
  const [ballTrail, setBallTrail] = useState<Array<{ x: number; y: number }> | null>(null);
  const [animProgress, setAnimProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>(
    'Adjust the angle and speed, then throw the ball.'
  );

  const target = targets[roundIdx];

  const preview = useMemo(
    () => computeTrajectory(angle, velocity, target.gravity, target.windAccel),
    [angle, velocity, target.gravity, target.windAccel]
  );

  useEffect(() => {
    if (!ballTrail) return;
    let frame = 0;
    const id = window.setInterval(() => {
      frame += 1;
      setAnimProgress(frame / 20);
      if (frame >= 20) {
        window.clearInterval(id);
      }
    }, 22);
    return () => window.clearInterval(id);
  }, [ballTrail]);

  const [answers, setAnswers] = useState<unknown[]>([]);
  const { pending, advanceAfterFeedback, isTransitioning } = useRoundTransition();

  const handleThrow = () => {
    if (isTransitioning()) return;
    const nextThrows = throws + 1;
    setThrows(nextThrows);
    setBallTrail(preview.points);
    setAnimProgress(0);

    const delta = Math.abs(preview.landingX - target.targetX);
    if (delta <= target.tolerance) {
      const nextAnswers = [...answers, [angle, velocity]];
      setAnswers(nextAnswers);
      soundFx.playSuccess();
      setStatusMessage(
        `Ball landed in the zone at ${preview.landingX.toFixed(1)} m (error ${delta.toFixed(1)} m).`
      );

      if (roundIdx + 1 >= targets.length) {
        const accuracy = Math.min(100, Math.round((targets.length / nextThrows) * 100));
        const score = Math.round(accuracy * 10);
        advanceAfterFeedback(() => {
          onFinish({
            score,
            maxScore: 1000,
            accuracy,
            roundsCompleted: targets.length,
            totalRounds: targets.length,
            submissionPayload: { answers: nextAnswers },
            highlights: [
              `Cleared ${targets.length} landing challenges in ${nextThrows} launches`,
              `Distance from zone centre: ${delta.toFixed(2)} m`,
            ],
          });
        }, 700);
      } else {
        advanceAfterFeedback(() => {
          setRoundIdx((r) => r + 1);
          setBallTrail(null);
          setStatusMessage('Next challenge: adjust the angle and speed of the throw.');
        }, 750);
      }
    } else {
      soundFx.playError();
      const dir = preview.landingX < target.targetX ? 'short' : 'overshot';
      setStatusMessage(
        `Landed at ${preview.landingX.toFixed(1)} m (${dir} by ${delta.toFixed(1)} m). Adjust and try again.`
      );
    }
  };

  // Map meters (0..150m horizontal, 0..70m vertical) to SVG 600x260
  const toSvgX = (m: number) => 40 + (m / 150) * 520;
  const toSvgY = (m: number) => 225 - (m / 70) * 185;

  const visibleTrailCount = ballTrail
    ? Math.max(2, Math.round(ballTrail.length * animProgress))
    : 0;
  const activeTrailPoints = ballTrail
    ? ballTrail
        .slice(0, visibleTrailCount)
        .map((p) => `${toSvgX(p.x).toFixed(1)},${toSvgY(p.y).toFixed(1)}`)
        .join(' ')
    : '';
  const projectileHead =
    ballTrail && visibleTrailCount > 0
      ? ballTrail[Math.min(ballTrail.length - 1, visibleTrailCount - 1)]
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs font-mono text-amber-400">
            ZONE {roundIdx + 1} OF {targets.length} · {target.planetLabel}
          </div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-slate-50 mt-0.5">
            {target.name}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Landing zone: <span className="font-mono text-slate-100">{target.targetX} m</span>{' '}
            (±{target.tolerance} m) · Wind Acceleration:{' '}
            <span className="font-mono text-sky-300">
              {target.windAccel >= 0 ? `+${target.windAccel}` : target.windAccel} m/s²
            </span>
          </p>
        </div>
        <div className="font-mono text-xs bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 tabular-nums">
          x(t) = v₀cos(θ)t + ½a_wind·t²
        </div>
      </div>

      {/* SVG Trajectory Canvas */}
      <div className="bg-[#0B0F17] border border-slate-800 rounded-xl p-3 sm:p-4">
        <svg
          viewBox="0 0 600 260"
          className="w-full h-auto select-none"
          role="img"
          aria-label="Ball trajectory and landing zone"
        >
          {/* Subtle coordinate grid */}
          {[0, 30, 60, 90, 120, 150].map((m) => (
            <g key={`gx-${m}`}>
              <line
                x1={toSvgX(m)}
                y1="25"
                x2={toSvgX(m)}
                y2="225"
                stroke="#1E293B"
                strokeWidth="1"
              />
              <text
                x={toSvgX(m)}
                y="245"
                textAnchor="middle"
                fill="#64748B"
                fontSize="10"
                fontFamily="IBM Plex Mono, monospace"
              >
                {m}m
              </text>
            </g>
          ))}
          {[20, 40, 60].map((h) => (
            <line
              key={`gy-${h}`}
              x1="40"
              y1={toSvgY(h)}
              x2="560"
              y2={toSvgY(h)}
              stroke="#1E293B"
              strokeWidth="1"
            />
          ))}

          {/* Ground */}
          <line x1="30" y1="225" x2="575" y2="225" stroke="#475569" strokeWidth="2" />

          {/* Target Landing Zone */}
          <rect
            x={toSvgX(target.targetX - target.tolerance)}
            y="218"
            width={Math.max(
              8,
              toSvgX(target.targetX + target.tolerance) -
                toSvgX(target.targetX - target.tolerance)
            )}
            height="10"
            rx="2"
            fill="#10B981"
          />
          <line
            x1={toSvgX(target.targetX)}
            y1="195"
            x2={toSvgX(target.targetX)}
            y2="225"
            stroke="#34D399"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <text
            x={toSvgX(target.targetX)}
            y="188"
            textAnchor="middle"
            fill="#34D399"
            fontSize="11"
            fontWeight="600"
            fontFamily="IBM Plex Mono, monospace"
          >
            ZONE {target.targetX}m
          </text>

          {/* Initial velocity indicator */}
          <line
            x1={toSvgX(0)}
            y1={toSvgY(0)}
            x2={toSvgX(Math.cos((angle * Math.PI) / 180) * 14)}
            y2={toSvgY(Math.sin((angle * Math.PI) / 180) * 14)}
            stroke="#F59E0B"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx={toSvgX(0)} cy={toSvgY(0)} r="6" fill="#F59E0B" />

          {/* Ball trajectory */}
          {activeTrailPoints && (
            <polyline
              points={activeTrailPoints}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="2.5"
            />
          )}
          {projectileHead && (
            <circle
              cx={toSvgX(projectileHead.x)}
              cy={toSvgY(projectileHead.y)}
              r="5"
              fill="#F8FAFC"
              stroke="#38BDF8"
              strokeWidth="2"
            />
          )}
        </svg>
      </div>

      {/* Parameter Sliders + Touch Steppers + Action */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        {/* Angle Control */}
        <div className="bg-[#0B0F17] border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Throw Angle (θ)</span>
            <span className="font-mono font-bold text-amber-400 text-sm tabular-nums">
              {angle}°
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={80}
            step={1}
            value={angle}
            onChange={(e) => setAngle(Number(e.target.value))}
            aria-label="Throw angle in degrees"
            className="w-full accent-amber-400 cursor-pointer"
          />
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setAngle((a) => Math.max(10, a - 1))}
              aria-label="Decrease angle"
              className="flex-1 min-h-[40px] inline-flex items-center justify-center bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-lg text-slate-200 cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setAngle((a) => Math.min(80, a + 1))}
              aria-label="Increase angle"
              className="flex-1 min-h-[40px] inline-flex items-center justify-center bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-lg text-slate-200 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Velocity Control */}
        <div className="bg-[#0B0F17] border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Initial Velocity (v₀)</span>
            <span className="font-mono font-bold text-sky-400 text-sm tabular-nums">
              {velocity} m/s
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={50}
            step={0.5}
            value={velocity}
            onChange={(e) => setVelocity(Number(e.target.value))}
            aria-label="Initial velocity in meters per second"
            className="w-full accent-sky-400 cursor-pointer"
          />
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setVelocity((v) => Math.max(10, Number((v - 0.5).toFixed(1))))}
              aria-label="Decrease velocity"
              className="flex-1 min-h-[40px] inline-flex items-center justify-center bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-lg text-slate-200 cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setVelocity((v) => Math.min(50, Number((v + 0.5).toFixed(1))))}
              aria-label="Increase velocity"
              className="flex-1 min-h-[40px] inline-flex items-center justify-center bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-lg text-slate-200 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Telemetry & Launch Button */}
        <div className="bg-[#0B0F17] border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Predicted Apex</span>
              <span className="font-mono text-slate-200 tabular-nums">
                {preview.maxHeight.toFixed(1)} m
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Flight Time</span>
              <span className="font-mono text-slate-200 tabular-nums">
                {preview.flightTime.toFixed(2)} s
              </span>
            </div>
            <div className="text-slate-300 pt-1">{statusMessage}</div>
          </div>

          <button
            type="button"
            onClick={handleThrow}
            disabled={pending}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm rounded-lg transition-colors cursor-pointer"
          >
            <Circle className="w-4 h-4" />
            <span>Throw the ball</span>
          </button>
        </div>
      </div>
    </div>
  );
};
