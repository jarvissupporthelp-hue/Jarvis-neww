"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { InterfaceLanguage, UiText } from "@/app/components/interface-language";
import { getAccessToken, getClient } from "@/lib/browser-supabase";
import { dashboardCopy } from "@/lib/foundation/copy";
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

function LibraryAlertLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      if (document.visibilityState === "hidden") return;
      try {
        const { count, error } = await getClient().from("physical_library_waitlist")
          .select("id", { count: "exact", head: true }).not("notified_at", "is", null)
          .is("read_at", null).abortSignal(controller.signal);
        if (!error && !controller.signal.aborted) setCount(count ?? 0);
      } catch {
        // The account notification list remains usable if the library is unavailable.
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, []);

  return count > 0 && <Link className="ui-action-secondary mb-3" href="/library/physical#availability-alerts">
    <UiText value="Library alerts"/> {`(${count})`}
  </Link>;
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
      <p role="alert"><UiText value={copy.error}/></p>
      <button className="underline" onClick={() => { setFailed(false); setAttempt((count) => count + 1); }}><UiText value={copy.retry}/></button>
    </div>
  );
  if (!items) return <p role="status"><UiText value={copy.loading}/></p>;
  if (!items.length) return <p><UiText value={copy.empty}/></p>;
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex flex-wrap justify-between gap-2">
          <span>{item.type === "welcome" ? copy.welcome : item.type === "reminder" ? copy.reminder : copy.notification}</span>
          {item.readAt ? <span><UiText value={copy.read}/></span> : (
            <button className="underline" disabled={pending !== null} onClick={() => void read(item.id)}><UiText value={copy.markRead}/></button>
          )}
        </li>
      ))}
    </ul>
  );
}

export function AccountNotifications({ locale }: { locale: Locale }) {
  const language = useContext(InterfaceLanguage);
  const copy = dashboardCopy[language === "fr" || language === "ru" ? language : locale];
  return <section className="jarvis-panel space-y-3" aria-labelledby="account-notifications">
    <h2 id="account-notifications" className="flex items-center gap-2 text-lg font-semibold">
      <Bell size={18} aria-hidden="true"/><UiText value={copy.notifications}/>
    </h2>
    <LibraryAlertLink />
    <Notifications copy={copy} />
  </section>;
}
