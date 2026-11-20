"use client";
import {UiText} from "@/app/components/interface-language";


import Link from "next/link";
import { useEffect, useState } from "react";
import { CourseResources } from "@/app/resources/workspace";
import { getAccessToken } from "@/lib/browser-supabase";
import { academicPortal, type Locale } from "@/lib/locales";
import type { PortalSnapshot } from "./portal-types";

type Page = "overview" | "courses" | "assignments";

export function AcademicPortal({ locale, page, offeringId }: { locale: Locale; page: Page; offeringId?: string }) {
  const copy = academicPortal[locale];
  const [response, setResponse] = useState<{ data?: PortalSnapshot; status: number }>();
  const [attempt, setAttempt] = useState(0);
  const lang = `lang=${locale}`;
  const title = page === "overview" ? copy.title : page === "courses" ? copy.courses : copy.assignments;
  const data = response?.data;
  const offering = offeringId ? data?.courses[0] : undefined;
  const tile = "rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-4 sm:p-5";
  const link = "inline-block font-semibold underline underline-offset-4";

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const token = await getAccessToken().catch(() => undefined);
        if (!token) {
          if (!controller.signal.aborted) setResponse({ status: 401 });
          return;
        }
        const query = offeringId ? `?offering=${encodeURIComponent(offeringId)}` : page === "assignments" ? "?view=assignments" : "";
        const result = await fetch(`/api/academic-portal${query}`, {
          cache: "no-store", signal: controller.signal, headers: { Authorization: `Bearer ${token}` },
        });
        const data = result.ok ? await result.json() as PortalSnapshot : undefined;
        if (!controller.signal.aborted) setResponse({ status: result.status, data });
      } catch {
        if (!controller.signal.aborted) setResponse({ status: 503 });
      }
    })();
    return () => controller.abort();
  }, [attempt, offeringId, page]);

  return <main className="space-y-6" lang={locale}>
    <header className={tile}>
      <Link href="/" className={link}><UiText value={copy.home}/></Link>
      <h1 className="mt-4 break-words text-3xl font-semibold sm:text-5xl">{offering?.course.name ?? title}</h1>
      {(offering || page === "overview") && <p className="mt-2 text-[var(--muted)]">{offering
        ? [offering.course.code, offering.group?.name, offering.semester.name].filter(Boolean).join(" · ") : copy.description}</p>}
    </header>
    {!response && <p role="status"><UiText value={copy.loading}/></p>}
    {response?.status === 401 && <div className={tile}><p><UiText value={copy.signedOut}/></p><Link href={`/account?${lang}`} className={link}><UiText value={copy.signIn}/></Link></div>}
    {response?.status === 403 && <p role="status"><UiText value={copy.denied}/></p>}
    {response?.status === 404 && <p role="status"><UiText value={copy.missing}/></p>}
    {response && response.status >= 500 && <div role="status">
      <p><UiText value={copy.failed}/></p><button type="button" className={link} onClick={() => { setResponse(undefined); setAttempt((n) => n + 1); }}><UiText value={copy.retry}/></button>
    </div>}
    {data && (
      <nav className="jarvis-section-nav" aria-label={copy.title}>
        <Link href={`/academics?${lang}`} aria-current={page === "overview" ? "page" : undefined}><UiText value={copy.overview}/></Link>
        <Link href={`/academics/courses?${lang}`} aria-current={page === "courses" ? "page" : undefined}><UiText value={copy.courses}/></Link>
        {data.role !== "admin" && <Link href={`/academics/assignments?${lang}`} aria-current={page === "assignments" ? "page" : undefined}><UiText value={copy.assignments}/></Link>}
      </nav>
    )}
    {data && !offering && page !== "assignments" && <section aria-labelledby="portal-courses">
        <h2 id="portal-courses" className="mb-3 text-xl font-semibold"><UiText value={copy.courses}/></h2>
        {!data.courses.length ? <p><UiText value={copy.empty}/></p> : <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...data.courses].sort((a, b) => a.course.name.localeCompare(b.course.name, locale)).map((item) => (
            <li key={item.id} className={tile}>
              <h3 className="text-lg font-semibold">{item.course.name}</h3>
              <p className="mb-2 text-sm text-[var(--muted)]">{[item.course.code, item.group?.name, item.semester.name].filter(Boolean).join(" · ")}</p>
              <Link aria-label={[copy.open, item.course.name, item.group?.name, item.semester.name].filter(Boolean).join(" · ")} className={link} href={`/academics/courses/${item.id}?${lang}`}><UiText value={copy.open}/> →</Link>
            </li>
          ))}
        </ul>}
    </section>}
    {data && (page === "assignments" || (offering && data.role !== "admin")) && <section className={tile} aria-labelledby="portal-assignments">
        <h2 id="portal-assignments" className="mb-2 text-xl font-semibold"><UiText value={copy.assignments}/></h2>
        {data.assignments === null ? <p><UiText value={copy.failed}/></p> : !data.assignments.length ? <p><UiText value={copy.noAssignments}/></p> :
          <ul className="space-y-3">{data.assignments.map((item) => <li key={item.id}>
            <h3 className="font-semibold">{item.title}</h3>
            {!offering && <p>{data.courses.find(({ id }) => id === item.offering_id)?.course.name}</p>}
            <time dateTime={`${item.due_on}T${item.due_at}+04:00`}>{item.due_on} · {item.due_at.slice(0, 5)} {"· Asia/Yerevan"}</time>
            <p className="whitespace-pre-wrap break-words">{item.brief}</p>
          </li>)}</ul>}
    </section>}
    {offering && data && data.role !== "admin" && <>
      {data.role === "student" && <div className={tile + " flex flex-wrap gap-x-6 gap-y-3"}>
        <Link className={link} href={`/chat?${lang}&offering=${offering.id}`}><UiText value={copy.ask}/> →</Link>
        <Link className={link} href={`/chat?${lang}&offering=${offering.id}&mode=course-pdfs`}><UiText value={copy.search}/> →</Link>
      </div>}
      {data.role === "lecturer" && <Link className={link} href={`/lecturer/${offering.id}`}><UiText value={copy.lecturer}/> →</Link>}
      <section className={tile} aria-labelledby="portal-resources">
        <h2 id="portal-resources" className="mb-2 text-xl font-semibold"><UiText value={copy.resources}/></h2>
        <div lang="en"><CourseResources offeringId={offering.id} /></div>
      </section>
    </>}
    <Link href="/academics/demo" className={link}><UiText value={copy.demo}/></Link>
  </main>;
}
