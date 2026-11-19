import type { Metadata } from "next";
import Link from "next/link";
import { arena, arenaRanked } from "@/lib/locales";
import { arenaDisciplines, arenaGames, arenaHref, arenaSubject } from "@/modules/arena/catalog";
import styles from "./arena.module.css";

export async function generateMetadata({ searchParams }: PageProps<"/arena">): Promise<Metadata> {
  const { lang } = await searchParams;
  const copy = arena[lang === "en" ? "en" : "hy"];
  return { title: copy.title, description: copy.description };
}

export default async function ArenaPage({ searchParams }: PageProps<"/arena">) {
  const query = await searchParams;
  const locale = query.lang === "en" ? "en" : "hy";
  const copy = arena[locale];
  const subject = arenaSubject(query.subject);
  const games = subject ? arenaGames.filter((game) => game.discipline === subject) : arenaGames;

  return (
    <main className={styles.hub} lang={locale}>
      <header className={styles.hero}>
        <nav className={styles.language} aria-label={copy.language}>
          <Link href={arenaHref("hy", subject)} hrefLang="hy" lang="hy" aria-current={locale === "hy" ? "page" : undefined}>Հայերեն</Link>
          <Link href={arenaHref("en", subject)} hrefLang="en" lang="en" aria-current={locale === "en" ? "page" : undefined}>English</Link>
        </nav>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
        <Link className={styles.heroAction} href={`/arena/leaderboard?lang=${locale}`}>{arenaRanked[locale].leaderboard} →</Link>
      </header>

      <section aria-labelledby="arena-catalogue">
        <h2 id="arena-catalogue">{copy.catalogue}</h2>
        <p className={styles.status}>{copy.practiceNote}</p>
        <nav className={styles.filters} aria-label={copy.subjects}>
          <Link href={arenaHref(locale)} aria-current={subject === undefined ? "page" : undefined}>{copy.all}</Link>
          {arenaDisciplines.map((discipline) => (
            <Link key={discipline} href={arenaHref(locale, discipline)} aria-current={subject === discipline ? "page" : undefined}>
              {copy.disciplines[discipline]}
            </Link>
          ))}
        </nav>
        <ul className={styles.games} role="list">
          {games.map((game) => {
            const [title, description] = copy.games[game.id];
            return (
              <li className={styles.card} key={game.id}>
                <div className={styles.cardMeta}>
                  <span>{copy.disciplines[game.discipline]}</span>
                  <span>{game.minutes} {copy.minutes}</span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
                <Link className={styles.play} href={arenaHref(locale, subject, game.id)} aria-label={`${copy.play} · ${title}`}>
                  {copy.play} <span aria-hidden="true">→</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
