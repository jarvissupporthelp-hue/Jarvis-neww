
import {UiText} from "@/app/components/interface-language";
import Link from "next/link";
import { academicPortal, mathVisualization } from "@/lib/locales";
import { offeringIdPattern } from "@/modules/academics/portal-types";
import { StudyAssistant } from "../account/study-assistant";

export default async function ChatPage({ searchParams }: PageProps<"/chat">) {
  const query = await searchParams;
  const locale = query.lang === "en" ? "en" : "hy";
  const copy = academicPortal[locale];
  const math = mathVisualization[locale];
  const offeringId = typeof query.offering === "string" && offeringIdPattern.test(query.offering) ? query.offering : undefined;
  const pdf = query.mode === "course-pdfs";

  return (
    <main lang={locale} className="jarvis-chat-page mx-auto max-w-7xl space-y-5 px-3 py-5 sm:px-6 sm:py-7">
      <header className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#1e3328] sm:text-4xl"><UiText value={copy.chat}/></h1>
          {offeringId && <p className="mt-2 text-sm text-[var(--muted)]">{pdf ? copy.search : copy.ask}</p>}
        </div>
        <nav className="flex flex-wrap gap-4 text-sm font-semibold underline underline-offset-4">
          <Link href={offeringId ? `/academics/courses/${offeringId}?lang=${locale}` : `/academics?lang=${locale}`}>← <UiText value={copy.title}/></Link>
          {offeringId && <Link href={`/chat?lang=${locale}`}><UiText value={copy.chat}/></Link>}
        </nav>
      </header>
      {!offeringId && <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-5" aria-labelledby="math-tool-heading">
        <div>
          <h2 id="math-tool-heading" className="text-lg font-semibold"><UiText value={math.title}/></h2>
          <p className="mt-1 text-sm text-[var(--muted)]"><UiText value={math.description}/></p>
        </div>
        <Link className="jarvis-primary-button inline-flex min-h-10 items-center px-4 py-2 no-underline" href={`/chat/math-visualization?lang=${locale}`}><UiText value={copy.openMath}/> →</Link>
      </section>}
      <div lang="en"><StudyAssistant key={`${offeringId ?? "all"}:${pdf}`} offeringId={offeringId} initialPdfMode={pdf} /></div>
    </main>
  );
}
