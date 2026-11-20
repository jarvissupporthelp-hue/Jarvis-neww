"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { InterfaceLanguage, useInterfaceCopy } from "@/app/components/interface-language";
import { getClient } from "@/lib/browser-supabase";
import { digitalLibrary } from "@/lib/locales";
import { bookLanguages, libraryFaculties, type BookCategory, type BookLanguage, type LibraryFaculty } from "./books";

export type PhysicalBook = {
  id: string;
  title: string;
  author: string;
  category: BookCategory;
  language: BookLanguage;
  faculties: LibraryFaculty[];
  shelf: string;
  expected_return: string | null;
};

type WaitlistEntry = { id: string; book_id: string; notified_at: string | null; read_at: string | null };
const availabilityOptions = [["", "All availability"], ["available", "Available"], ["loaned", "On loan"]] as const;
const normalize = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function PhysicalLibrary({ initialBooks }: { initialBooks: PhysicalBook[] | null }) {
  const t = useInterfaceCopy();
  const [books, setBooks] = useState(initialBooks);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [role, setRole] = useState("");
  const [query, setQuery] = useState("");
  const [availability, setAvailability] = useState("");
  const [language, setLanguage] = useState("");
  const [faculty, setFaculty] = useState("");
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState(12);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const locale = useContext(InterfaceLanguage);
  const date = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
    dateStyle: "medium", timeZone: "UTC",
  });
  const today = new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeZone: "Asia/Yerevan" }).format(new Date());
  const categories = [...new Set(books?.map(book => book.category))].sort();
  const search = normalize(query.trim());
  const matches = books?.filter(book => normalize(`${book.title} ${book.author} ${book.shelf}`).includes(search)
    && (!language || book.language === language) && (!category || book.category === category)
    && (!faculty || book.faculties.some(value => value === faculty))
    && (!availability || (availability === "loaned") === Boolean(book.expected_return))) ?? [];
  const waiting = new Set(waitlist.filter(entry => !entry.notified_at).map(entry => entry.book_id));
  const alerts = waitlist.filter(entry => entry.notified_at)
    .sort((first, second) => Number(Boolean(first.read_at)) - Number(Boolean(second.read_at)));
  const bookById = new Map(books?.map(book => [book.id, book]));

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const db = getClient();
    const { data: { session } } = await db.auth.getSession();
    const [catalog, membership, entries] = await Promise.all([
      db.from("physical_library_books").select("id,title,author,category,language,faculties,shelf,expected_return")
        .order("title").returns<PhysicalBook[]>(),
      session ? db.from("memberships").select("role").eq("user_id", session.user.id).eq("status", "active").maybeSingle() : null,
      session ? db.from("physical_library_waitlist").select("id,book_id,notified_at,read_at")
        .eq("user_id", session.user.id).order("notified_at", { ascending: false, nullsFirst: true }).returns<WaitlistEntry[]>() : null,
    ]);
    if (signal?.aborted) return;
    if (!catalog.error) setBooks(catalog.data);
    setRole(membership?.data?.role ?? "");
    if (!entries?.error) setWaitlist(entries?.data ?? []);
    if (catalog.error || membership?.error || entries?.error) throw new Error("Could not refresh the library.");
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    function update() {
      if (document.visibilityState === "hidden") return;
      void refresh(controller.signal).catch(() => {
        if (!controller.signal.aborted) setMessage("Could not refresh the library.");
      });
    }
    update();
    const timer = window.setInterval(update, 30_000);
    window.addEventListener("focus", update);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, [refresh]);

  async function act(action: () => PromiseLike<{ error: unknown; data?: unknown }>, notice: string) {
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      const { error, data } = await action();
      if (error) throw error;
      await refresh();
      setMessage(data === false ? "This book is already available or was removed." : notice);
    } catch {
      setMessage("Could not update the library. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function setReturnDate(id: string, expectedReturn: string | null) {
    return act(() => getClient().from("physical_library_books").update({ expected_return: expectedReturn })
      .eq("id", id).select("id").single(), "Book status updated.");
  }

  return <section className="space-y-5" aria-labelledby="physical-library-heading">
    <header className="jarvis-panel space-y-2">
      <h2 id="physical-library-heading" className="text-2xl font-semibold">{t("Physical Library")}</h2>
      <p className="text-sm text-[var(--muted)]">{t("Sample inventory. Join the waitlist to get an in-app alert when a book is returned.")}</p>
      <div className="grid gap-3 pt-2 sm:grid-cols-2 lg:grid-cols-5">
        <label className="grid min-w-0 gap-1 text-sm">{t("Search")}
          <input type="search" value={query} placeholder={t("Title, author, or shelf")} onChange={event => { setQuery(event.target.value); setLimit(12); }}/>
        </label>
        <label className="grid min-w-0 gap-1 text-sm">{t("Availability")}
          <select value={availability} onChange={event => { setAvailability(event.target.value); setLimit(12); }}>
            {availabilityOptions.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
          </select>
        </label>
        <label className="grid min-w-0 gap-1 text-sm">{t("Category")}
          <select value={category} onChange={event => { setCategory(event.target.value); setLimit(12); }}>
            <option value="">{t("All categories")}</option>
            {categories.map(value => <option key={value} value={value}>{t(digitalLibrary.en.categories[value])}</option>)}
          </select>
        </label>
        <label className="grid min-w-0 gap-1 text-sm">{t("Language")}
          <select value={language} onChange={event => { setLanguage(event.target.value); setLimit(12); }}>
            <option value="">{t("All languages")}</option>
            {bookLanguages.map(value => <option key={value} value={value}>{t(digitalLibrary.en.languages[value])}</option>)}
          </select>
        </label>
        <label className="grid min-w-0 gap-1 text-sm">{t("Faculty")}
          <select value={faculty} onChange={event => { setFaculty(event.target.value); setLimit(12); }}>
            <option value="">{t("All faculties")}</option>
            {libraryFaculties.map(value => <option key={value} value={value}>{t(digitalLibrary.en.faculties[value])}</option>)}
          </select>
        </label>
      </div>
    </header>
    {message && <p role="status" className="jarvis-panel text-sm">{t(message)}</p>}
    {role && alerts.length > 0 && <section id="availability-alerts" className="jarvis-panel scroll-mt-20 space-y-3">
      <h3 className="font-semibold">{t("Library alerts")}</h3>
      <ul className="divide-y divide-[var(--stroke)]">
        {alerts.slice(0, 10).map(entry => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
          <p><strong>{bookById.get(entry.book_id)?.title}</strong> · {t("Returned to the library")}</p>
          {entry.read_at ? <span className="text-sm text-[var(--muted)]">{t("Read")}</span>
            : <button type="button" className="ui-action-secondary" disabled={pending} onClick={() => void act(() =>
              getClient().from("physical_library_waitlist").update({ read_at: new Date().toISOString() }).eq("id", entry.id),
              "Alert marked as read.")}>{t("Mark as read")}</button>}
        </li>)}
      </ul>
    </section>}
    {books ? <p role="status" className="text-sm text-[var(--muted)]">{matches.length} / {books.length} {t("books")}</p>
      : <p role="status">{t("Loading the catalog…")}</p>}
    {books && !matches.length && <p className="jarvis-panel">{t("No books match these filters.")}</p>}
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {matches.slice(0, limit).map(book => {
        const due = book.expected_return;
        return <li key={book.id} className="jarvis-panel flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-[var(--muted)]">{t(digitalLibrary.en.categories[book.category])} · {t(digitalLibrary.en.languages[book.language])}</span>
            <span className={due ? "rounded-full border border-[var(--stroke)] bg-[var(--panel-raised)] px-2 py-1 font-semibold" : "rounded-full bg-[#234c3c] px-2 py-1 font-semibold text-white"}>{t(due ? "On loan" : "Available")}</span>
          </div>
          <div>
            <h3 className="break-words text-lg font-semibold" lang={book.language}>{book.title}</h3>
            <p className="text-sm text-[var(--muted)]" lang={book.language}>{book.author}</p>
          </div>
          <div className="text-sm">{due
            ? <>{t(due < today ? "Return overdue" : "Expected return")} · <time dateTime={due}>{date.format(new Date(due + "T00:00:00Z"))}</time></>
            : <>{t("Shelf")} · {book.shelf}</>}</div>
          {due && (role
            ? <button type="button" className="ui-action-secondary mt-auto self-start" disabled={pending}
              aria-pressed={waiting.has(book.id)} onClick={() => void act(() => getClient().rpc("change_physical_library_waitlist", {
                p_book: book.id, p_join: !waiting.has(book.id),
              }), waiting.has(book.id) ? "You left the waitlist." : "You joined the waitlist.")}>
              {t(waiting.has(book.id) ? "Leave waitlist" : "Join waitlist")}
            </button>
            : <Link className="ui-action-secondary mt-auto self-start" href="/account">{t("Sign in to join the waitlist")}</Link>)}
          {role === "admin" && <details className="border-t border-[var(--stroke)] pt-2 text-sm">
            <summary className="cursor-pointer font-medium">{t("Manage availability")}</summary>
            <form className="mt-2 grid gap-2" onSubmit={event => {
              event.preventDefault();
              const value = new FormData(event.currentTarget).get("returnDate");
              if (typeof value === "string" && value) void setReturnDate(book.id, value);
            }}>
              <label className="grid gap-1">{t("Expected return")}
                <input type="date" name="returnDate" min={today} defaultValue={due && due >= today ? due : ""} required/>
              </label>
              <div className="flex flex-wrap gap-2">
                <button className="ui-action-secondary" disabled={pending}>{t("Save loan date")}</button>
                {due && <button type="button" className="ui-action-secondary" disabled={pending} onClick={() => void setReturnDate(book.id, null)}>{t("Mark returned")}</button>}
              </div>
            </form>
          </details>}
        </li>;
      })}
    </ul>
    {matches.length > limit && <button type="button" className="ui-action-secondary" onClick={() => setLimit(value => value + 12)}>{t("Show more books")}</button>}
  </section>;
}
