
import {UiText} from "@/app/components/interface-language";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { arena } from "@/lib/locales";
import { arenaGames, arenaHref, arenaSubject } from "@/modules/arena/catalog";
import styles from "../arena.module.css";
import { PracticeGame } from "./practice-game";

async function resolveGame({ params, searchParams }: PageProps<"/arena/[game]">) {
  const [{ game: slug }, query] = await Promise.all([params, searchParams]);
  const game = arenaGames.find(({ id }) => id === slug);
  if (!game) notFound();

  const locale = query.lang === "en" ? "en" : "hy";
  const copy = arena[locale];
  const [title, description] = copy.games[game.id];
  return { game, locale, copy, title, description, subject: arenaSubject(query.subject) } as const;
}

export async function generateMetadata(props: PageProps<"/arena/[game]">): Promise<Metadata> {
  const { title, description } = await resolveGame(props);
  return { title: `${title} | JARVIS Arena`, description };
}

export default async function ArenaGamePage(props: PageProps<"/arena/[game]">) {
  const { game, copy, locale, title, description, subject } = await resolveGame(props);

  return (
    <main className={styles.hub} lang={locale}>
      <div className={styles.gameNav}>
        <Link href={arenaHref(locale, subject)}>← <UiText value={copy.back}/></Link>
        <nav className={styles.filters} aria-label={copy.language}>
          <Link href={arenaHref("hy", subject, game.id)} hrefLang="hy" lang="hy" aria-current={locale === "hy" ? "page" : undefined}>Հայերեն</Link>
          <Link href={arenaHref("en", subject, game.id)} hrefLang="en" lang="en" aria-current={locale === "en" ? "page" : undefined}>English</Link>
        </nav>
      </div>
      <header className={styles.gameHeading}>
        <p>{copy.disciplines[game.discipline]}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <PracticeGame gameId={game.id} locale={locale} />
    </main>
  );
}
