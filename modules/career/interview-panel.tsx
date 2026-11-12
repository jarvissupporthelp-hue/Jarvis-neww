"use client";

import { useState, type FormEvent } from "react";
import { interviewDomains, type InterviewDomain, type InterviewTurn } from "./interview";

export function InterviewPanel() {
  const [domain, setDomain] = useState<InterviewDomain>("DevOps");
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  async function send(message: string) {
    const content = message.trim();
    if (!content || busy) return;
    setBusy(true);
    setNotice("");
    try {
      const updated: InterviewTurn[] = [...turns, { role: "user", content }];
      const response = await fetch("/api/career/interview", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, messages: updated.slice(-13) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setTurns([...updated, { role: "assistant", content: result.reply }]);
      setDraft("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not send your message.");
    } finally {
      setBusy(false);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(draft);
  }
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
    <div>
      <h2 className="text-xl font-semibold">AI Interview Practice</h2>
      <p className="text-sm text-slate-600">Choose a domain, answer mock interview questions, or ask the coach a technical question.</p>
    </div>
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm font-medium">Interview domain<select className="mt-1 block rounded-lg border border-slate-300 bg-white p-2" disabled={busy} value={domain} onChange={(event) => {
        setDomain(event.target.value as InterviewDomain); setTurns([]); setDraft(""); setNotice("");
      }}>{interviewDomains.map((item) => <option key={item}>{item}</option>)}</select></label>
      {turns.length ? <button className="rounded-lg border px-3 py-2 text-sm" disabled={busy} onClick={() => { setTurns([]); setDraft(""); setNotice(""); }}>New interview</button>
        : <button className="rounded-lg bg-[#214c3b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy} onClick={() => void send("Start a mock interview.")}>Start interview</button>}
    </div>
    <div role="log" aria-label="Interview conversation" className="max-h-[30rem] min-h-24 space-y-3 overflow-auto rounded-xl bg-slate-50 p-4">
      {!turns.length && <p className="text-sm text-slate-600">Start a mock interview or type your first question.</p>}
      {turns.map(({ role, content }, index) => <div key={index} className={`max-w-[92%] rounded-xl px-4 py-3 ${role === "user" ? "ml-auto bg-emerald-100" : "bg-white border border-slate-200"}`}>
        <p className="mb-1 text-xs font-semibold text-slate-600">{role === "user" ? "You" : "Interview coach"}</p>
        <p className="whitespace-pre-wrap break-words text-sm">{content}</p>
      </div>)}
      {busy && <p role="status" className="text-sm text-slate-600">The coach is preparing a reply…</p>}
    </div>
    {notice && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">{notice}</p>}
    <form onSubmit={submit} className="space-y-2">
      <label className="block text-sm font-medium">Your message<textarea className="mt-1 block w-full rounded-lg border border-slate-300 p-3" rows={3} maxLength={2000} value={draft} onChange={(event) => setDraft(event.target.value)} disabled={busy} /></label>
      <button className="rounded-lg bg-[#214c3b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy || !draft.trim()}>Send message</button>
    </form>
    <p className="text-xs text-slate-600">Messages are sent to the configured AI provider. The interview stays in this tab.</p>
  </section>;
}
