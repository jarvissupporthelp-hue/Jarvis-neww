"use client";

import Link from "next/link";
import { ChatPlanStarter } from "./chat-plan-starter";
import { StudyContextSummary } from "./study-context-summary";
import { useEffect, useState, type FormEvent } from "react";
import { getAccessToken, getClient } from "@/lib/browser-supabase";
import { MAX_STUDY_PROMPT } from "@/lib/study-chat-limits";

type Thread = { id: string; title: string };
type Turn = { id: string; prompt: string; answer: string };

const button = "rounded bg-[#1e3328] px-4 py-2 text-white disabled:opacity-50";
const field = "w-full rounded border border-[#789181] p-2";

export function StudyAssistant() {
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [selected, setSelected] = useState<Thread | null>(null);
  const [turns, setTurns] = useState<Turn[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [title, setTitle] = useState("");
  const [coursePdfSearch, setCoursePdfSearch] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  const selectedId = selected?.id;
  const draft = selectedId ? drafts[selectedId] ?? "" : "";

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const token = await getAccessToken();
        if (!token) { if (!controller.signal.aborted) setNeedsSignIn(true); return; }
        const response = await fetch("/api/me", {
          signal: controller.signal, headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok || (await response.json()).role !== "student") {
          if (!controller.signal.aborted) setNeedsSignIn(true);
          return;
        }
        const { data, error } = await getClient().from("study_conversations")
          .select("id,title").order("created_at", { ascending: false }).order("id")
          .abortSignal(controller.signal);
        if (controller.signal.aborted) return;
        if (error) throw error;
        setThreads(data);
      } catch {
        if (!controller.signal.aborted) setError("Could not load conversations. Reload to try again.");
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const { data, error } = await getClient().from("study_turns")
          .select("id,prompt,answer").eq("conversation_id", selectedId)
          .order("created_at", { ascending: false }).order("id", { ascending: false })
          .limit(100).abortSignal(controller.signal);
        if (controller.signal.aborted) return;
        if (error) throw error;
        setTurns(data.reverse());
      } catch {
        if (!controller.signal.aborted) setError("Could not open this conversation. Reload to try again.");
      }
    })();
    return () => controller.abort();
  }, [selectedId]);

  function open(thread: Thread) {
    if (thread.id !== selectedId) setTurns(null);
    setSelected(thread);
    setTitle(thread.title);
    setError("");
  }

  async function manage(action: "create" | "rename" | "delete") {
    if (busy || (action !== "create" && !selectedId)) return;
    if (action === "delete" && !window.confirm("Delete this conversation and its messages?")) return;
    setBusy(true);
    setError("");

    try {
      const table = getClient().from("study_conversations");
      if (action === "delete") {
        const { error } = await table.delete().eq("id", selectedId).select("id").single();
        if (error) throw error;
        setThreads((items) => items?.filter((item) => item.id !== selectedId) ?? []);
        setSelected(null);
        setTitle("");
        setTurns(null);
        return;
      }

      const query = action === "create"
        ? table.insert({ title: "New conversation" })
        : table.update({ title: title.trim() }).eq("id", selectedId);
      const { data, error } = await query.select("id,title").single();
      if (error) throw error;
      setThreads((items) => action === "create" ? [data, ...(items ?? [])]
        : (items ?? []).map((item) => item.id === data.id ? data : item));
      open(data);
    } catch {
      setError("Could not update the conversation. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !selectedId || !turns || !draft.trim() || (!coursePdfSearch && !consent)) return;
    setBusy(true);
    setError("");
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedId, prompt: draft.trim(), consent, mode: coursePdfSearch ? "course-pdfs" : "general" }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Could not get a reply. Your draft is still here.");
        return;
      }
      setTurns((items) => [...(items ?? []), result.turn].slice(-100));
      setDrafts((items) => ({ ...items, [selectedId]: "" }));
    } catch {
      setError("Could not get a reply. Your draft is still here.");
    } finally {
      setBusy(false);
    }
  }

  if (needsSignIn) return <p>Sign in with an active student account to use saved conversations. <Link className="underline" href="/account">Sign in</Link></p>;
  if (!threads) return <p role="status">{error || "Loading conversations…"}</p>;

  return (
    <div className="grid gap-4 md:grid-cols-[15rem_minmax(0,1fr)]">
      <aside aria-label="Conversations" className="space-y-3 rounded-xl border border-[#afbeb3] bg-white p-4">
        <button type="button" className={button} disabled={busy} onClick={() => void manage("create")}>New conversation</button>
        {threads.length === 0 && <p>No saved conversations yet.</p>}
        <ul className="space-y-1">
          {threads.map((thread) => (
            <li key={thread.id}>
              <button type="button" disabled={busy} aria-pressed={thread.id === selectedId}
                className="w-full rounded p-2 text-left break-words aria-pressed:bg-[#dfe9df]"
                onClick={() => open(thread)}>{thread.title}</button>
            </li>
          ))}
        </ul>
      </aside>
      <section aria-label="Study conversation" className="min-w-0 space-y-4 rounded-xl border border-[#afbeb3] bg-white p-4">
        <StudyContextSummary />
        <ChatPlanStarter />
        {error && <p role="alert">{error}</p>}
        {selected ? (
          <>
            <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); void manage("rename"); }}>
              <label className="min-w-0 flex-1">Conversation title
                <input className={field} required maxLength={100} value={title} disabled={busy}
                  onChange={(event) => setTitle(event.target.value)} />
              </label>
              <button type="submit" className="underline" disabled={busy || !title.trim() || title.trim() === selected.title}>Rename</button>
              <button type="button" className="underline" disabled={busy} onClick={() => void manage("delete")}>Delete conversation</button>
            </form>
            {!turns && !error && <p>Loading conversation…</p>}
            {turns?.length === 0 && <p>No messages yet. Ask a study question to begin.</p>}
            {turns && (
              <ol aria-label="Conversation messages" className="space-y-3">
                {turns.map((turn) => (
                  <li key={turn.id} className="space-y-2 rounded bg-[#eef3ee] p-3">
                    <p className="whitespace-pre-wrap break-words"><strong>You:</strong> {turn.prompt}</p>
                    <p className="whitespace-pre-wrap break-words"><strong>JARVIS:</strong> {turn.answer}</p>
                  </li>
                ))}
              </ol>
            )}
            <form className="space-y-3" onSubmit={ask}>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={coursePdfSearch} disabled={busy}
                  onChange={(event) => setCoursePdfSearch(event.target.checked)} />
                Search course PDFs
              </label>
              {coursePdfSearch ? (
                <p className="text-sm">Find passages with page references in your course PDFs. Results are temporary and stay inside JARVIS. <Link href="/resources" className="underline">Open course resources</Link></p>
              ) : <p className="text-sm">AI requests send your question, up to four recent exchanges, and the study context shown above through Vercel AI Gateway to an external model provider. Personal event titles and task titles are excluded. Leave out confidential information.</p>}
              <label className="block">Study question
                <textarea className={field} rows={4} maxLength={MAX_STUDY_PROMPT} required disabled={busy}
                  value={draft} onChange={(event) => setDrafts({ ...drafts, [selected.id]: event.target.value })} />
              </label>
              {!coursePdfSearch && <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={consent} disabled={busy}
                  onChange={(event) => setConsent(event.target.checked)} />
                I agree to send this question, recent exchanges, and study context to the AI provider.
              </label>}
              <button className={button} disabled={busy || !turns || (!coursePdfSearch && !consent) || !draft.trim()}>
                {busy ? "Working…" : coursePdfSearch ? "Search PDFs" : "Ask JARVIS"}
              </button>
            </form>
          </>
        ) : <p>Select a saved conversation or create a new one.</p>}
      </section>
    </div>
  );
}
