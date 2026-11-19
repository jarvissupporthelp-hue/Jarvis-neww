"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CourseResources } from "@/app/resources/workspace";
import { getAccessToken } from "@/lib/browser-supabase";
import { academicPortal, type Locale } from "@/lib/locales";
import type { PortalSnapshot } from "./portal-types";

export function AcademicPortal({ locale, offeringId }: { locale: Locale; offeringId?: string }) {
  const copy = academicPortal[locale];
  const [response, setResponse] = useState<{ data?: PortalSnapshot; status: number }>();
  const [attempt, setAttempt] = useState(0);
  const lang = `lang=${locale}`;
  const path = offeringId ? `/academics/courses/${offeringId}` : "/academics";
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
        const query = offeringId ? `?offering=${encodeURIComponent(offeringId)}` : "";
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
  }, [attempt, offeringId]);

  return <main className="space-y-6" lang={locale}>
    <header className={tile}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={offeringId ? `/academics?${lang}` : "/"} className={link}>{offeringId ? copy.allCourses : copy.home}</Link>
        <nav aria-label={copy.language} className="flex gap-4">
          <Link href={`${path}?lang=hy`} lang="hy" aria-current={locale === "hy" ? "page" : undefined}>Հայերեն</Link>
          <Link href={`${path}?lang=en`} lang="en" aria-current={locale === "en" ? "page" : undefined}>English</Link>
        </nav>
      </div>
      <h1 className="mt-4 break-words text-3xl font-semibold sm:text-5xl">{offering?.course.name ?? copy.title}</h1>
      <p className="mt-2 text-[var(--muted)]">{offering
        ? [offering.course.code, offering.group?.name, offering.semester.name].filter(Boolean).join(" · ") : copy.description}</p>
    </header>
    {!response && <p role="status">{copy.loading}</p>}
    {response?.status === 401 && <div className={tile}><p>{copy.signedOut}</p><Link href={`/account?${lang}`} className={link}>{copy.signIn}</Link></div>}
    {response?.status === 403 && <p role="status">{copy.denied}</p>}
    {response?.status === 404 && <p role="status">{copy.missing}</p>}
    {response && response.status >= 500 && <div role="status">
      <p>{copy.failed}</p><button type="button" className={link} onClick={() => { setResponse(undefined); setAttempt((n) => n + 1); }}>{copy.retry}</button>
    </div>}
    {data && !offering && <>
      <nav className={tile + " flex flex-wrap gap-x-6 gap-y-3"} aria-label={copy.title}>
        <Link className={link} href={`/account/calendar?${lang}`}>{copy.calendar}</Link>
        {data.role === "student" && <>
          <Link className={link} href={`/account?${lang}`}>{copy.dashboard}</Link>
          <Link className={link} href={`/chat?${lang}`}>{copy.chat}</Link>
          <Link className={link} href="/study-plans">{copy.plans}</Link>
        </>}
        {data.role === "lecturer" && <Link className={link} href="/lecturer">{copy.lecturer}</Link>}
        {data.role === "admin" && <Link className={link} href={`/account?${lang}`}>{copy.admin}</Link>}
      </nav>
      <section aria-labelledby="portal-courses">
        <h2 id="portal-courses" className="mb-3 text-xl font-semibold">{copy.courses}</h2>
        {!data.courses.length ? <p>{copy.empty}</p> : <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...data.courses].sort((a, b) => a.course.name.localeCompare(b.course.name, locale)).map((item) => (
            <li key={item.id} className={tile}>
              <h3 className="text-lg font-semibold">{item.course.name}</h3>
              <p className="mb-2 text-sm text-[var(--muted)]">{[item.course.code, item.group?.name, item.semester.name].filter(Boolean).join(" · ")}</p>
              <Link aria-label={[copy.open, item.course.name, item.group?.name, item.semester.name].filter(Boolean).join(" · ")} className={link} href={`/academics/courses/${item.id}?${lang}`}>{copy.open} →</Link>
            </li>
          ))}
        </ul>}
      </section>
    </>}
    {offering && data && data.role !== "admin" && <>
      {data.role === "student" && <div className={tile + " flex flex-wrap gap-x-6 gap-y-3"}>
        <Link className={link} href={`/chat?${lang}&offering=${offering.id}`}>{copy.ask} →</Link>
        <Link className={link} href={`/chat?${lang}&offering=${offering.id}&mode=course-pdfs`}>{copy.search} →</Link>
      </div>}
      {data.role === "lecturer" && <Link className={link} href={`/lecturer/${offering.id}`}>{copy.lecturer} →</Link>}
      <section className={tile} aria-labelledby="portal-assignments">
        <h2 id="portal-assignments" className="mb-2 text-xl font-semibold">{copy.assignments}</h2>
        {data.assignments === null ? <p>{copy.failed}</p> : !data.assignments.length ? <p>{copy.noAssignments}</p> :
          <ul className="space-y-3">{data.assignments.map((item) => <li key={item.id}>
            <h3 className="font-semibold">{item.title}</h3>
            <time dateTime={`${item.due_on}T${item.due_at}+04:00`}>{item.due_on} · {item.due_at.slice(0, 5)} · Asia/Yerevan</time>
            <p className="whitespace-pre-wrap break-words">{item.brief}</p>
          </li>)}</ul>}
      </section>
      <section className={tile} aria-labelledby="portal-resources">
        <h2 id="portal-resources" className="mb-2 text-xl font-semibold">{copy.resources}</h2>
        <div lang="en"><CourseResources offeringId={offering.id} /></div>
      </section>
    </>}
    <Link href="/academics/demo" className={link}>{copy.demo}</Link>
  </main>;
}
