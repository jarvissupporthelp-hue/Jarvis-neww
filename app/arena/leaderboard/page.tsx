
import {UiText} from "@/app/components/interface-language";
import { arenaRanked } from "@/lib/locales";
import { ArenaSectionNav } from "../section-nav";
import styles from "../arena.module.css";
import { ArenaStandings } from "./standings";

export default async function ArenaLeaderboard({ searchParams }: PageProps<"/arena/leaderboard">) {
  const query = await searchParams;
  const locale = query.lang === "hy" ? "hy" : "en";
  const copy = arenaRanked[locale];
  return <main className={styles.hub} lang={locale}>
    <header className={styles.gameHeading}><h1><UiText value={copy.leaderboard}/></h1><p><UiText value={copy.note}/></p></header>
    <ArenaSectionNav locale={locale} page="leaderboard"/>
    <ArenaStandings locale={locale} />
  </main>;
}
