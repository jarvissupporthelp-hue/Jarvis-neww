import Link from "next/link";
import { arena, arenaRanked } from "@/lib/locales";
import { arenaHref } from "@/modules/arena/catalog";
import styles from "../arena.module.css";
import { ArenaStandings } from "./standings";

export default async function ArenaLeaderboard({ searchParams }: PageProps<"/arena/leaderboard">) {
  const query = await searchParams;
  const locale = query.lang === "en" ? "en" : "hy";
  const copy = arenaRanked[locale];
  return <main className={styles.hub} lang={locale}>
    <div className={styles.gameNav}>
      <Link href={arenaHref(locale)}>← {copy.back}</Link>
      <nav className={styles.filters} aria-label={arena[locale].language}>
        <Link href="/arena/leaderboard" lang="hy" hrefLang="hy" aria-current={locale === "hy" ? "page" : undefined}>Հայերեն</Link>
        <Link href="/arena/leaderboard?lang=en" lang="en" hrefLang="en" aria-current={locale === "en" ? "page" : undefined}>English</Link>
      </nav>
    </div>
    <header className={styles.gameHeading}><h1>{copy.leaderboard}</h1><p>{copy.note}</p></header>
    <ArenaStandings locale={locale} />
  </main>;
}
