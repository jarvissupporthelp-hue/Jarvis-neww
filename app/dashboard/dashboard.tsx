"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Component, useEffect, useState, type ReactNode } from "react";
import { getAccessToken, getClient } from "@/lib/browser-supabase";
import { dashboardCopy } from "@/lib/foundation/copy";
import * as registeredModules from "@/lib/foundation/registry";
import type { DashboardSlot, ModuleRegistration } from "@/lib/foundation/registry";
import type { FoundationRole } from "@/lib/foundation/roles";
import type { Locale } from "@/lib/locales";

type Copy = (typeof dashboardCopy)[Locale];
type Notice = { id: string; type: string; readAt: string | null };

async function request(path: string, init?: RequestInit) {
  const token = await getAccessToken();
  if (!token) return new Response(null, { status: 401 });
  return fetch(path, {
    ...init,
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
}

class SlotBoundary extends Component<{ fallback: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <p role="alert">{this.props.fallback}</p> : this.props.children;
  }
}

function Notifications({ copy }: { copy: Copy }) {
  const [items, setItems] = useState<Notice[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void request("/api/foundation/notifications", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const result: Notice[] = await response.json();
        if (!controller.signal.aborted) setItems(result);
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [attempt]);

  async function read(id: string) {
    setPending(id);
    try {
      const response = await request("/api/foundation/notifications", {
        method: "PATCH", body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error();
      setItems((current) => current?.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item) ?? null);
    } catch {
      setFailed(true);
    } finally {
      setPending(null);
    }
  }

  if (failed) return (
    <div>
      <p role="alert">{copy.error}</p>
      <button className="underline" onClick={() => { setFailed(false); setAttempt((count) => count + 1); }}>{copy.retry}</button>
    </div>
  );
  if (!items) return <p role="status">{copy.loading}</p>;
  if (!items.length) return <p>{copy.empty}</p>;
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex flex-wrap justify-between gap-2">
          <span>{item.type === "welcome" ? copy.welcome : item.type === "reminder" ? copy.reminder : copy.notification}</span>
          {item.readAt ? <span>{copy.read}</span> : (
            <button className="underline" disabled={pending !== null} onClick={() => void read(item.id)}>{copy.markRead}</button>
          )}
        </li>
      ))}
    </ul>
  );
}

const slots: readonly DashboardSlot[] = ["myDay", "search", "notifications", "saved", "requests", "quick"];
const registrations: readonly ModuleRegistration[] = Object.values(registeredModules);

function SlotContent({ render }: { render: () => ReactNode }) {
  return render();
}

export function Dashboard({ moduleKey }: { moduleKey?: string }) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("hy");
  const [role, setRole] = useState<FoundationRole | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "denied" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const copy = dashboardCopy[locale];

  useEffect(() => {
    const controller = new AbortController();
    void request("/api/foundation", { signal: controller.signal }).then(async (response) => {
      if (response.status === 401 || response.status === 403) {
        if (!controller.signal.aborted) setStatus("denied");
        return;
      }
      if (!response.ok) throw new Error();
      const result = await response.json();
      if (controller.signal.aborted) return;
      setRole(result.role);
      if (result.locale) setLocale(result.locale);
      else if (new URLSearchParams(window.location.search).get("lang") === "en") setLocale("en");
      setStatus("ready");
    }).catch(() => { if (!controller.signal.aborted) setStatus("error"); });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = locale;
    return () => { document.documentElement.lang = previous; };
  }, [locale]);

  async function changeLocale(next: Locale) {
    setSaving(true);
    setSaveFailed(false);
    try {
      const response = await request("/api/foundation", { method: "PATCH", body: JSON.stringify({ locale: next }) });
      if (!response.ok) throw new Error();
      setLocale(next);
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    try {
      const { error } = await getClient().auth.signOut({ scope: "local" });
      if (error) throw error;
      router.push(`/account?lang=${locale}`);
    } catch {
      setStatus("error");
    }
  }

  if (status === "loading") return <main className="p-8"><p role="status">{copy.loading}</p></main>;
  if (status === "denied") return <main className="space-y-3 p-8"><p>{copy.denied}</p><Link className="underline" href="/account">{copy.signIn}</Link></main>;
  if (status === "error" || !role) return <main className="space-y-3 p-8"><p role="alert">{copy.error}</p><button className="underline" onClick={() => { setStatus("loading"); setAttempt((count) => count + 1); }}>{copy.retry}</button></main>;

  const permitted = registrations.filter((entry) => entry.permissions.includes(role));
  const selected = permitted.find((entry) => entry.key === moduleKey);
  const ModulePage = selected?.Page;
  if (moduleKey && !ModulePage) return <main className="p-8"><p>{copy.denied}</p></main>;

  const title = (entry: ModuleRegistration) => entry.titles[locale][entry.titleKey];
  const matches = permitted.filter((entry) => title(entry).toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale)));

  function widget(slot: DashboardSlot) {
    if (slot === "notifications") return <Notifications copy={copy} />;
    if (slot === "search") return (
      <div className="space-y-2">
        <label className="block">{copy.searchLabel}<input type="search" className="mt-1 w-full rounded border p-2" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        {matches.length ? <ul>{matches.map((entry) => <li key={entry.key}><Link className="underline" href={entry.navItem}>{title(entry)}</Link></li>)}</ul> : <p>{copy.noResults}</p>}
      </div>
    );
    const contributions = permitted.flatMap((entry) => entry.dashboardWidgets
      .filter((item) => item.slot === slot).map((item) => ({ ...item, entry })));
    if (slot === "quick") return <Link className="underline" href={role === "staff" ? "/lecturer" : "/account"}>{copy.workspace}</Link>;
    return contributions.length ? <ul>{contributions.map(({ href, entry }) => <li key={`${entry.key}:${href}`}><Link className="underline" href={href}>{title(entry)}</Link></li>)}</ul> : <p>{copy.empty}</p>;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-3xl font-semibold">{copy.heading}</h1><p>{copy[role]}</p></div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2">{copy.language}
            <select className="rounded border bg-white p-2" value={locale} disabled={saving}
              onChange={(event) => void changeLocale(event.target.value === "en" ? "en" : "hy")}>
              <option value="hy" lang="hy">Հայերեն</option>
              <option value="en" lang="en">English</option>
            </select>
          </label>
          <button className="underline" onClick={() => void signOut()}>{copy.signOut}</button>
        </div>
        {saveFailed && <p role="alert">{copy.saveError}</p>}
      </header>
      {permitted.length > 0 && <nav aria-label={copy.navigation} className="flex flex-wrap gap-4">
        {permitted.map((entry) => <Link className="underline" href={entry.navItem} key={entry.key}>{title(entry)}</Link>)}
      </nav>}
      {ModulePage ? (
        <SlotBoundary fallback={copy.error}><ModulePage locale={locale} /></SlotBoundary>
      ) : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {slots.map((slot) => (
          <section className="min-w-0 space-y-3 rounded-xl border border-[#b1c0b3] bg-white p-5" key={slot}>
            <h2 className="text-lg font-semibold">{copy[slot]}</h2>
            <SlotBoundary fallback={copy.error}><SlotContent render={() => widget(slot)} /></SlotBoundary>
          </section>
        ))}
      </div>}
    </main>
  );
}
