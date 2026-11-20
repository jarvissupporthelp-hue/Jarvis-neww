
import {UiText} from "@/app/components/interface-language";
import React, { useMemo, useState } from 'react';
import { CheckCircle2, KeyRound, Minus, Plus } from 'lucide-react';
import { soundFx } from '../sound';
import { useRoundTransition } from '../round-transition';
import type { ActiveGameRenderProps } from '../game-types';

import { getCipherChallenges, encryptAffine, decryptAffine, modInverse, VALID_A } from '../rules/CipherBreakerLab';

export const CipherBreakerLab: React.FC<ActiveGameRenderProps> = ({
  difficulty,
  onFinish,
}) => {
  const challenges = getCipherChallenges(difficulty);
  const [idx, setIdx] = useState(0);
  const [guessA, setGuessA] = useState(1);
  const [guessB, setGuessB] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  const challenge = challenges[idx];
  const ciphertext = useMemo(
    () => encryptAffine(challenge.plaintext, challenge.a, challenge.b),
    [challenge]
  );
  const candidatePlain = useMemo(
    () => decryptAffine(ciphertext, guessA, guessB),
    [ciphertext, guessA, guessB]
  );

  const topFrequencies = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;
    for (const ch of ciphertext) {
      if (ch >= 'A' && ch <= 'Z') {
        counts[ch] = (counts[ch] ?? 0) + 1;
        total += 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([letter, count]) => ({
        letter,
        count,
        pct: Math.round((count / Math.max(1, total)) * 100),
      }));
  }, [ciphertext]);

  const [answers, setAnswers] = useState<unknown[]>([]);
  const { pending, advanceAfterFeedback, isTransitioning } = useRoundTransition();

  const handleVerify = () => {
    if (isTransitioning()) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    if (candidatePlain === challenge.plaintext) {
      const nextAnswers = [...answers, [guessA, guessB]];
      setAnswers(nextAnswers);
      soundFx.playSuccess();
      setFeedback('Key parameters verified. Plaintext recovered cleanly.');
      if (idx + 1 >= challenges.length) {
        const accuracy = Math.min(
          100,
          Math.round((challenges.length / nextAttempts) * 100)
        );
        advanceAfterFeedback(() => {
          onFinish({
            score: accuracy * 10,
            maxScore: 1000,
            accuracy,
            roundsCompleted: challenges.length,
            totalRounds: challenges.length,
            submissionPayload: { answers: nextAnswers },
            highlights: [
              `Decrypted ${challenges.length} ${challenge.mode} ciphers on ${difficulty}`,
            ],
          });
        }, 450);
      } else {
        advanceAfterFeedback(() => {
          setIdx((i) => i + 1);
          setGuessA(1);
          setGuessB(0);
          setFeedback(null);
        }, 550);
      }
    } else {
      soundFx.playError();
      setFeedback('Recovered text is still scrambled. Check E/T/A frequency spikes.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs font-mono text-sky-400">
            {"CIPHER"} {idx + 1} {"OF"} {challenges.length} · {challenge.mode} {"Mode"}
          </div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-slate-50 mt-0.5">
            {challenge.title}
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            Use the frequency distribution (English top letters: E, T, A, O, I, N) to deduce encryption key E(x) = (a·x + b) mod 26.
          </p>
        </div>
        <div className="font-mono text-xs bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 shrink-0">
          {"a⁻¹ mod 26 ="} {modInverse(guessA, 26)}
        </div>
      </div>

      {/* Intercepted Ciphertext & Live Decryption Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#0B0F17] border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="text-xs font-medium text-slate-400">Intercepted Ciphertext</div>
          <p className="font-mono text-sm sm:text-base text-amber-300 tracking-wide leading-relaxed break-words">
            {ciphertext}
          </p>
        </div>
        <div className="bg-[#0B0F17] border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="text-xs font-medium text-slate-400">Live Decrypted Output</div>
          <p className="font-mono text-sm sm:text-base text-emerald-300 tracking-wide leading-relaxed break-words">
            {candidatePlain}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Frequency Bar Chart */}
        <div className="lg:col-span-6 bg-[#0B0F17] border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold text-slate-300">
            Top Ciphertext Letter Frequencies
          </div>
          <div className="space-y-2">
            {topFrequencies.map((item) => (
              <div key={item.letter} className="flex items-center gap-3 text-xs font-mono">
                <span className="w-5 font-bold text-slate-100">{item.letter}</span>
                <div className="flex-1 h-2.5 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-400 rounded-full"
                    style={{ width: `${Math.min(100, item.pct * 4)}%` }}
                  />
                </div>
                <span className="w-12 text-right text-slate-400 tabular-nums">
                  {item.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Key Controls */}
        <div className="lg:col-span-6 bg-[#0B0F17] border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
          {challenge.mode === 'Affine' && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Multiplier (a, coprime to 26)</span>
                <span className="font-mono text-sky-400 font-bold">{"a ="} {guessA}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {VALID_A.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      setGuessA(val);
                      setFeedback(null);
                    }}
                    className={`min-w-[40px] min-h-[38px] px-2.5 font-mono text-xs font-semibold rounded-lg border cursor-pointer ${
                      guessA === val
                        ? 'bg-sky-400 text-slate-950 border-sky-300'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                Shift Offset (b mod 26)
              </span>
              <span className="font-mono text-amber-400 font-bold tabular-nums">
                {"b ="} {guessB}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={25}
              step={1}
              value={guessB}
              onChange={(e) => {
                setGuessB(Number(e.target.value));
                setFeedback(null);
              }}
              aria-label="Shift offset b"
              className="w-full accent-amber-400 cursor-pointer"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  setGuessB((b) => (b + 25) % 26);
                }}
                aria-label="Decrease shift"
                className="flex-1 min-h-[40px] inline-flex items-center justify-center bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-lg text-slate-200 cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  setGuessB((b) => (b + 1) % 26);
                }}
                aria-label="Increase shift"
                className="flex-1 min-h-[40px] inline-flex items-center justify-center bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-lg text-slate-200 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-lg border text-xs ${
                candidatePlain === challenge.plaintext
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
              <UiText value={idx + 1 === challenges.length
                ? 'Verify & Finish Lab'
                : 'Submit Decrypted Plaintext'}/>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
