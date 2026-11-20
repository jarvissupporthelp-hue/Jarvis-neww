
import {UiText} from "@/app/components/interface-language";
import type { Metadata } from "next";
import Link from "next/link";
import { arena } from "@/lib/locales";
import { arenaDisciplines, arenaGames, arenaHref, arenaSubject } from "@/modules/arena/catalog";
import { ArenaSectionNav } from "./section-nav";
import styles from "./arena.module.css";

export async function generateMetadata({ searchParams }: PageProps<"/arena">): Promise<Metadata> {
  const { lang } = await searchParams;
  const copy = arena[lang === "hy" ? "hy" : "en"];
  return { title: copy.title, description: copy.description };
}

export default async function ArenaPage({ searchParams }: PageProps<"/arena">) {
  const query = await searchParams;
  const locale = query.lang === "hy" ? "hy" : "en";
  const copy = arena[locale];
  const subject = arenaSubject(query.subject);
  const games = subject ? arenaGames.filter((game) => game.discipline === subject) : arenaGames;

  return (
    <main className={styles.hub} lang={locale}>
      <header className={styles.hero}>
        <h1><UiText value={copy.title}/></h1>
        <p><UiText value={copy.description}/></p>
      </header>
      <ArenaSectionNav locale={locale} page="catalogue"/>

      <section aria-labelledby="arena-catalogue">
        <h2 id="arena-catalogue"><UiText value={copy.catalogue}/></h2>
        <p className={styles.status}><UiText value={copy.practiceNote}/></p>
        <nav className="jarvis-section-nav" aria-label={copy.subjects}>
          <Link href={arenaHref(locale)} aria-current={subject === undefined ? "page" : undefined}><UiText value={copy.all}/></Link>
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
                  <span>{game.minutes} <UiText value={copy.minutes}/></span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
                <Link className={styles.play} href={arenaHref(locale, subject, game.id)} aria-label={`${copy.play} · ${title}`}>
                  <UiText value={copy.play}/> <span aria-hidden="true">→</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
