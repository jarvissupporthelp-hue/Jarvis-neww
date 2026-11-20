"use client";
import {UiText} from "@/app/components/interface-language";


import { useEffect, useState } from "react";
import Link from "next/link";
import { arena, arenaRanked, type Locale } from "@/lib/locales";
import type { ArenaGameId } from "@/modules/arena/catalog";
import { gameDifficulties, type GameDifficulty, type PracticeOutcome } from "@/modules/arena/game-types";
import { playableGames } from "@/modules/arena/games/GameRegistry";
import { soundFx } from "@/modules/arena/sound";
import { arenaErrorCode, arenaRequest } from "@/modules/arena/ranked-client";
import { useGameTimer } from "@/modules/arena/timer";
import styles from "../arena.module.css";

export function PracticeGame({ gameId, locale }: { gameId: ArenaGameId; locale: Locale }) {
  const copy = arena[locale];
  const [difficulty, setDifficulty] = useState<GameDifficulty>("Beginner");
  const [run, setRun] = useState(0);
  const ranked = arenaRanked[locale];
  const [sessionId, setSessionId] = useState<string>();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const [audio, setAudio] = useState(false);
  const Game = playableGames[gameId];

  useEffect(() => () => soundFx.setEnabled(false), []);

  function toggleAudio() {
    soundFx.setEnabled(!audio);
    setAudio(!audio);
  }

  function reset() {
    setSessionId(undefined);
    setStartError("");
    setRun((current) => current + 1);
  }

  async function startRanked() {
    setStarting(true);
    setStartError("");
    try {
      const result = await arenaRequest<{ sessionId: string }>("/api/arena", { action: "start", game: gameId, difficulty });
      setSessionId(result.sessionId);
      setRun((current) => current + 1);
    } catch (error) {
      setStartError(arenaErrorCode(error));
    } finally {
      setStarting(false);
    }
  }

  return (
    <>
      <div className={styles.gameControls}>
        <label>
          <UiText value={copy.difficulty}/>
          <select value={difficulty} disabled={starting} onChange={(event) => {
            const selected = gameDifficulties.find((tier) => tier === event.target.value);
            if (selected) { setDifficulty(selected); reset(); }
          }}>
            {gameDifficulties.map((tier) => <option key={tier} value={tier}>{copy.levels[tier]}</option>)}
          </select>
        </label>
        <button type="button" aria-pressed={audio} onClick={toggleAudio}><UiText value={copy.sound}/></button>
        <button type="button" disabled={starting} onClick={reset}>{sessionId ? copy.practice : copy.restart}</button>
        <button type="button" disabled={starting} onClick={startRanked}>{starting ? ranked.waiting : ranked.start}</button>
      </div>
      {startError && <RankedError error={startError} locale={locale} />}
      <PracticeRun sessionId={sessionId} key={`${gameId}:${difficulty}:${run}`} Game={Game} difficulty={difficulty} locale={locale} />
    </>
  );
}

function RankedError({ error, locale }: { error: string; locale: Locale }) {
  const messages = arenaRanked[locale].errors;
  const message = Object.entries(messages).find(([code]) => code === error)?.[1] ?? messages.unavailable;
  return <p className={styles.status} role="status">
    {error === "signin" ? <Link href={`/account?lang=${locale}`}>{message}</Link> : message}
  </p>;
}

function PracticeRun({ Game, difficulty, locale, sessionId }: {
  Game: (typeof playableGames)[ArenaGameId];
  difficulty: GameDifficulty;
  locale: Locale;
  sessionId?: string;
}) {
  const copy = arena[locale];
  const copyRanked = arenaRanked[locale];
  const timer = useGameTimer();
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verified, setVerified] = useState<{ xp: number; score: number }>();
  const [outcome, setOutcome] = useState<PracticeOutcome | null>(null);

  function finish(result: PracticeOutcome) {
    timer.pause();
    soundFx.playVictory();
    setOutcome(result);
  }

  async function verify() {
    setVerifying(true);
    setVerifyError("");
    try {
      const result = await arenaRequest<{ xp: number; score: number }>("/api/arena", {
        action: "finish", sessionId, proof: outcome?.submissionPayload,
      });
      setVerified(result);
    } catch (error) {
      setVerifyError(arenaErrorCode(error));
    } finally {
      setVerifying(false);
    }
  }

  return (
    <>
      <p className={styles.status}>{sessionId ? copyRanked.activeNote : copy.practiceNote}</p>
      <p className={styles.status}><UiText value={copy.time}/> <time dateTime={`PT${timer.seconds}S`}>{timer.formatted}</time></p>
      {outcome ? (
        <section aria-live="polite" className={styles.card}>
          <h2>{verified ? copyRanked.verified : sessionId ? copyRanked.complete : copy.complete}</h2>
          <dl className={styles.result}>
            {!sessionId && <>
              <div><dt><UiText value={copy.score}/></dt><dd>{outcome.score} / {outcome.maxScore}</dd></div>
              <div><dt><UiText value={copy.accuracy}/></dt><dd>{outcome.accuracy}%</dd></div>
            </>}
            <div><dt><UiText value={copy.rounds}/></dt><dd>{outcome.roundsCompleted} / {outcome.totalRounds}</dd></div>
            {verified && <>
              <div><dt>{copyRanked.score}</dt><dd>{verified.score} / 1000</dd></div>
              <div><dt>{copyRanked.earned}</dt><dd>{verified.xp}</dd></div>
            </>}
          </dl>
          {sessionId && !verified && <div className={styles.gameControls}>
            <button type="button" disabled={verifying} onClick={verify}>{verifying ? copyRanked.waiting : copyRanked.save}</button>
          </div>}
          {verified?.xp === 0 && <p className={styles.status}>{copyRanked.noAward}</p>}
          {verifyError && <RankedError error={verifyError} locale={locale} />}
          {verified && <Link className={styles.play} href={`/arena/leaderboard?lang=${locale}`}>{copyRanked.leaderboard} →</Link>}
          {outcome.highlights && <ul className="mt-4 list-disc pl-5" lang="en">
            {outcome.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
          </ul>}
        </section>
      ) : (
        <div className={styles.gamePanel} lang="en">
          <Game difficulty={difficulty} onFinish={finish} />
        </div>
      )}
    </>
  );
}
