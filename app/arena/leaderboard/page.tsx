
import {UiText} from "@/app/components/interface-language";
import Link from "next/link";
import { arenaRanked } from "@/lib/locales";
import { arenaHref } from "@/modules/arena/catalog";
import styles from "../arena.module.css";
import { ArenaStandings } from "./standings";

export default async function ArenaLeaderboard({ searchParams }: PageProps<"/arena/leaderboard">) {
  const query = await searchParams;
  const locale = query.lang === "hy" ? "hy" : "en";
  const copy = arenaRanked[locale];
  return <main className={styles.hub} lang={locale}>
    <div className={styles.gameNav}>
      <Link href={arenaHref(locale)}>← <UiText value={copy.back}/></Link>
    </div>
    <header className={styles.gameHeading}><h1><UiText value={copy.leaderboard}/></h1><p><UiText value={copy.note}/></p></header>
    <ArenaStandings locale={locale} />
  </main>;
}
