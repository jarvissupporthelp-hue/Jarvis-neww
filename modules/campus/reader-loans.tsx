"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useInterfaceCopy } from "@/app/components/interface-language";
import { getClient } from "@/lib/browser-supabase";

type Loan = { id: string; title: string; borrowed_at: string | null; due_on: string; returned_at: string | null; renewable: boolean };

export function ReaderLoans({ locale }: { locale: string }) {
  const t = useInterfaceCopy();
  const [rows, setRows] = useState<Loan[]>([]);
  const [state, setState] = useState("loading");
  const [revision, refresh] = useState(0);
  const [pending, setPending] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      const db = getClient();
      const { data: { session } } = await db.auth.getSession();
      if (!active) return;
      if (!session) { setState("guest"); return; }
      const { data, error } = await db.rpc("reader_loan_history");
      if (!active) return;
      if (error) throw error;
      setRows(data ?? []);
      setState("ready");
    }
    void load().catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, [revision]);
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Asia/Yerevan" });
  const today = new Intl.DateTimeFormat("sv-SE", {timeZone:"Asia/Yerevan"}).format(new Date());
  async function renew(id: string) {
    setPending(id);
    try {
      const {data:{session}} = await getClient().auth.getSession();
      if (!session) { setState("guest"); return; }
      const response = await fetch("/api/campus", {method:"POST", headers:{Authorization:`Bearer ${session.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({action:"renew",id})});
      if (!response.ok) throw new Error();
      refresh(value => value + 1);
    } catch { setState("error"); }
    finally { setPending(""); }
  }
  if (state === "guest") return <Link href="/account" className="ui-action-secondary">{t("Sign in")}</Link>;
  if (state === "loading") return <p role="status">{t("Loading…")}</p>;
  if (state === "error") return <div role="alert">{t("Could not load your loans.")} <button onClick={() => refresh(v => v + 1)}>{t("Retry")}</button></div>;
  return <div className="space-y-6">{[false,true].map(history => {
    const items = rows.filter(row => Boolean(row.returned_at) === history).sort((a,b) => history
      ? Date.parse(b.returned_at!) - Date.parse(a.returned_at!) : a.due_on.localeCompare(b.due_on));
    return <section key={String(history)} className="jarvis-panel space-y-3">
      <h2 className="text-xl font-semibold">{t(history ? "Borrowing history" : "Current loans")} ({items.length})</h2>
      {!items.length && <p>{t(history ? "No returned books yet." : "No books on loan.")}</p>}
      {items.map(row => <article key={row.id} className="space-y-3 border-t py-4">
        <h3 className="font-semibold">{row.title}</h3>
        {!history && row.due_on < today && <strong>{t("Overdue")}</strong>}
        <dl className="grid gap-3 sm:grid-cols-3">
          {([["Borrowed on",row.borrowed_at],["Due date",row.due_on],...(history ? [["Returned on",row.returned_at]] : [])]).map(([label,value]) =>
            <div key={label}><dt className="text-sm text-[var(--muted)]">{t(label!)}</dt><dd>{value ? formatter.format(new Date(value)) : t("Not recorded")}</dd></div>)}
        </dl>
        {row.renewable && <button className="ui-action-secondary" disabled={Boolean(pending)} onClick={() => void renew(row.id)}>{t("Renew")}</button>}
      </article>)}
    </section>;
  })}</div>;
}
