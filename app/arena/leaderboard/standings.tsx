"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { arena, arenaRanked, type Locale } from "@/lib/locales";
import { arenaGames } from "@/modules/arena/catalog";
import { arenaProgress } from "@/modules/arena/progression";
import { arenaErrorCode, arenaRequest } from "@/modules/arena/ranked-client";
import styles from "../arena.module.css";

type Standing = { rank: number; alias: string; mine: boolean; xp: number };
type Snapshot = { totalXp: number; canPlayRanked: boolean; leaders: Standing[] };
type Board = { key: string; snapshot?: Snapshot; error?: string };

export function ArenaStandings({ locale }: { locale: Locale }) {
  const copy = arenaRanked[locale];
  const [period, setPeriod] = useState("all");
  const [game, setGame] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [board, setBoard] = useState<Board>();
  const key = `${period}:${game}:${refresh}`;
  const current = board?.key === key ? board : undefined;

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ period });
    if (game) query.set("game", game);
    void arenaRequest<Snapshot>(`/api/arena?${query}`).then(
      (snapshot) => { if (active) setBoard({ key, snapshot }); },
      (error) => { if (active) setBoard({ key, error: arenaErrorCode(error) }); },
    );
    return () => { active = false; };
  }, [period, game, key]);

  const snapshot = current?.snapshot;
  const progress = snapshot ? arenaProgress(snapshot.totalXp) : undefined;
  const failure = Object.entries(copy.errors).find(([code]) => code === current?.error)?.[1] ?? copy.errors.unavailable;

  return <>
    <div className={styles.gameControls}>
      <label>{copy.season} <select value={period} onChange={(event) => setPeriod(event.target.value)}>
        <option value="all">{copy.allTime}</option>
        <option value="week">{copy.week}</option>
      </select></label>
      <label>{copy.game} <select value={game} onChange={(event) => setGame(event.target.value)}>
        <option value="">{copy.allGames}</option>
        {arenaGames.map(({ id }) => <option value={id} key={id}>{arena[locale].games[id][0]}</option>)}
      </select></label>
      <button type="button" onClick={() => setRefresh((value) => value + 1)}>{copy.refresh}</button>
    </div>
    {!current && <p role="status">{copy.waiting}</p>}
    {current?.error && <p role="status">
      {current.error === "signin" ? <Link href={`/account?lang=${locale}`}>{failure}</Link> : failure}
    </p>}
    {snapshot && <>
      {snapshot.canPlayRanked && progress && <dl className={styles.result}>
        <div><dt>{copy.total}</dt><dd>{snapshot.totalXp.toLocaleString(locale)}</dd></div>
        <div><dt>{copy.level}</dt><dd>{progress.level}</dd></div>
        <div><dt>{copy.league}</dt><dd>{copy.levelNames[progress.league]}</dd></div>
      </dl>}
      {snapshot.leaders.length === 0 ? <p className={styles.status}>{copy.empty}</p> :
        <table className={styles.rankings} aria-label={copy.leaderboard}>
          <thead><tr><th scope="col">{copy.rank}</th><th scope="col">{copy.player}</th><th scope="col">XP</th></tr></thead>
          <tbody>{snapshot.leaders.map((player) => <tr key={player.alias} data-mine={player.mine}>
            <td>{player.rank}</td><td>{player.alias}{player.mine && ` (${copy.you})`}</td><td>{player.xp.toLocaleString(locale)}</td>
          </tr>)}</tbody>
        </table>}
    </>}
  </>;
}
