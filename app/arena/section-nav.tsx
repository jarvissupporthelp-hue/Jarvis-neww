import Link from "next/link";
import { UiText } from "@/app/components/interface-language";
import { arena, arenaRanked } from "@/lib/locales";
import { arenaHref } from "@/modules/arena/catalog";

export function ArenaSectionNav({ locale, page }: { locale: "hy" | "en"; page: "catalogue" | "leaderboard" }) {
  return <nav className="jarvis-section-nav" aria-label={arena[locale].title}>
    <Link href={arenaHref(locale)} aria-current={page === "catalogue" ? "page" : undefined}>
      <UiText value={arena[locale].catalogue}/>
    </Link>
    <Link href={`/arena/leaderboard?lang=${locale}`} aria-current={page === "leaderboard" ? "page" : undefined}>
      <UiText value={arenaRanked[locale].leaderboard}/>
    </Link>
  </nav>;
}
