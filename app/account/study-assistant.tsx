"use client";

import Link from "next/link";
import { ChatPlanStarter } from "./chat-plan-starter";
import { StudyContextSummary } from "./study-context-summary";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { getAccessToken, getClient } from "@/lib/browser-supabase";
import { MAX_STUDY_PROMPT } from "@/lib/study-chat-limits";

type Thread = { id: string; title: string };
type Turn = { id: string; prompt: string; answer: string };
type Usage = { limit: number; used: number; remaining: number; inputTokens: number; outputTokens: number; tokenReportedAttempts: number; resetsAt: string };
type Memory = { learning_preferences: string; current_goal: string; topics_to_practice: string };

const button = "min-h-11 rounded bg-[#1e3328] px-4 py-2 text-white disabled:opacity-50";
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
  const [threadsAttempt, setThreadsAttempt] = useState(0);
  const [turnsAttempt, setTurnsAttempt] = useState(0);
  const [sendStatus, setSendStatus] = useState("");
  const composer = useRef<HTMLHeadingElement>(null);
  const history = useRef<HTMLOListElement>(null);
  const [busy, setBusy] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [memory, setMemory] = useState<Memory | null>(null);
  const [memoryStatus, setMemoryStatus] = useState("");

  const selectedId = selected?.id;
  const draft = selectedId ? drafts[selectedId] ?? "" : "";

  const refreshUsage = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    const response = await fetch("/api/chat/usage", { headers: { Authorization: `Bearer ${token}` } });
    if (response.ok) setUsage(await response.json());
  }, []);

  useEffect(() => {
    void (async () => {
      const token = await getAccessToken();
      if (!token) return;
      const response = await fetch("/api/chat/memory", { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) setMemory((await response.json()).memory);
    })().catch(() => {});
  }, []);

  async function saveMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!memory) return;
    setMemoryStatus("Saving…");
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/chat/memory", {
        method: "PUT", headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
        body: JSON.stringify(memory),
      });
      setMemoryStatus(response.ok ? "Saved for your future JARVIS conversations." : "Could not save preferences.");
    } catch { setMemoryStatus("Could not save preferences."); }
  }

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const token = await getAccessToken();
        if (!token) { if (!controller.signal.aborted) setNeedsSignIn(true); return; }
        const response = await fetch("/api/me", {
          signal: controller.signal, headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok && response.status !== 401 && response.status !== 403) throw new Error();
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
        void refreshUsage().catch(() => {});
      } catch {
        if (!controller.signal.aborted) setError("Could not load conversations.");
      }
    })();
    return () => controller.abort();
  }, [threadsAttempt, refreshUsage]);

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
        if (!controller.signal.aborted) setError("Could not load messages for this conversation.");
      }
    })();
    return () => controller.abort();
  }, [selectedId, turnsAttempt]);

  useEffect(() => {
    if (selectedId) composer.current?.focus();
  }, [selectedId]);

  useEffect(() => {
    const messages = history.current;
    if (messages) messages.scrollTop = messages.scrollHeight;
  }, [turns]);

  function open(thread: Thread) {
    if (thread.id !== selectedId) setTurns(null);
    setSelected(thread);
    setTitle(thread.title);
    setError("");
    setSendStatus("");
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
    setSendStatus(coursePdfSearch ? "Searching course PDFs…" : "Waiting for JARVIS…");
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
        setSendStatus("");
        setError(result.error || "Could not get a reply. Your draft is still here.");
        return;
      }
      setTurns((items) => [...(items ?? []), result.turn].slice(-100));
      setSendStatus("Reply ready. Read it in the conversation messages above.");
      setDrafts((items) => ({ ...items, [selectedId]: "" }));
    } catch {
      setSendStatus("");
      setError("Could not get a reply. Your draft is still here.");
    } finally {
      setBusy(false);
      void refreshUsage().catch(() => {});
    }
  }

  if (needsSignIn) return <p>Sign in with an active student account to use saved conversations. <Link className="underline" href="/account">Sign in</Link></p>;
  if (!threads) return error ? (
    <div className="space-y-2">
      <p role="alert">{error}</p>
      <button type="button" className={button} onClick={() => {
        setError("");
        setThreadsAttempt((value) => value + 1);
      }}>Retry loading conversations</button>
    </div>
  ) : <p role="status">Loading conversations…</p>;

  return (
    <div className="grid gap-4 md:grid-cols-[15rem_minmax(0,1fr)]">
      <aside aria-label="Conversations" className="space-y-3 rounded-xl border border-[#afbeb3] bg-white p-4">
        <div className="rounded-lg bg-[#eef3ee] p-3" aria-label="Daily AI usage">
          <h2 className="font-semibold">Today’s JARVIS usage</h2>
          {usage ? <>
            <p><strong>{usage.remaining}</strong> of {usage.limit} AI messages left</p>
            <p className="text-sm">{usage.used} attempts used · Resets at 00:00 UTC</p>
            <p className="mt-2 text-sm">Tokens reported today: <strong>{(usage.inputTokens + usage.outputTokens).toLocaleString()}</strong></p>
            <p className="text-xs">{usage.inputTokens.toLocaleString()} input · {usage.outputTokens.toLocaleString()} output</p>
            {usage.tokenReportedAttempts < usage.used && <p className="text-xs">Some attempts have no token report from the model provider.</p>}
            <p className="text-xs">PDF-only search does not use an AI message.</p>
          </> : <p className="text-sm">Checking your usage…</p>}
        </div>
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer font-semibold">My study memory</summary>
          <p className="mt-2 text-xs">Only your account can edit this. JARVIS uses it when you agree to an AI request.</p>
          {memory ? <form className="mt-2 space-y-2" onSubmit={saveMemory}>
            <label className="block text-sm">How I learn best<textarea className={field} rows={2} maxLength={1000} value={memory.learning_preferences} onChange={(event) => setMemory({ ...memory, learning_preferences: event.target.value })} /></label>
            <label className="block text-sm">Current goal<textarea className={field} rows={2} maxLength={1000} value={memory.current_goal} onChange={(event) => setMemory({ ...memory, current_goal: event.target.value })} /></label>
            <label className="block text-sm">Topics to practice<textarea className={field} rows={2} maxLength={1000} value={memory.topics_to_practice} onChange={(event) => setMemory({ ...memory, topics_to_practice: event.target.value })} /></label>
            <button className="rounded bg-[#1e3328] px-3 py-2 text-sm text-white">Save memory</button>
            <button type="button" className="ml-2 text-sm underline" onClick={async () => {
              const token = await getAccessToken();
              const response = await fetch("/api/chat/memory", { method: "DELETE", headers: { Authorization: `Bearer ${token ?? ""}` } });
              if (response.ok) { setMemory((await response.json()).memory); setMemoryStatus("Memory cleared."); }
              else setMemoryStatus("Could not clear memory.");
            }}>Clear memory</button>
          </form> : <p className="text-sm">Memory unavailable.</p>}
          {memoryStatus && <p role="status" className="text-xs">{memoryStatus}</p>}
        </details>
        <button type="button" className={button} disabled={busy} aria-label="Create new conversation" onClick={() => void manage("create")}>New conversation</button>
        {threads.length === 0 && <p>No saved conversations yet.</p>}
        <ul className="max-h-48 space-y-1 overflow-y-auto p-1 md:max-h-96">
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
            {!turns && !error && <p role="status">Loading conversation…</p>}
            {!turns && error && <button type="button" className={button} onClick={() => {
              setError("");
              setTurnsAttempt((value) => value + 1);
            }}>Retry loading messages</button>}
            {turns?.length === 0 && <p>No messages yet. Ask a study question to begin.</p>}
            {!!turns?.length && (
              <ol ref={history} aria-label="Conversation messages" tabIndex={0}
                className="max-h-[42vh] space-y-3 overflow-y-auto p-1">
                {turns.map((turn) => (
                  <li key={turn.id} className="space-y-2 rounded bg-[#eef3ee] p-3">
                    <p className="whitespace-pre-wrap break-words"><strong>You:</strong> {turn.prompt}</p>
                    <p className="whitespace-pre-wrap break-words"><strong>JARVIS:</strong> {turn.answer}</p>
                  </li>
                ))}
              </ol>
            )}
            <form className="space-y-3" onSubmit={ask} aria-busy={busy}>
              <h3 ref={composer} tabIndex={-1} className="font-semibold">Ask a study question</h3>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={coursePdfSearch} disabled={busy}
                  onChange={(event) => setCoursePdfSearch(event.target.checked)} />
                Search course PDFs
              </label>
              {coursePdfSearch ? (
                <p className="text-sm">Find passages with page references in your course PDFs. Results are temporary and stay inside JARVIS. <Link href="/resources" className="underline">Open course resources</Link></p>
              ) : <p className="text-sm">AI requests send your question, up to four recent exchanges, and the study context shown above through Vercel AI Gateway to an external model provider. Personal event titles and task titles are excluded. The free preview model provider may retain or use requests for model improvement. Leave out confidential information.</p>}
              <label className="block">Study question
                <textarea className={field} rows={4} maxLength={MAX_STUDY_PROMPT} required readOnly={busy}
                  value={draft} onChange={(event) => setDrafts({ ...drafts, [selected.id]: event.target.value })} />
              </label>
              {!coursePdfSearch && <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={consent} disabled={busy}
                  onChange={(event) => setConsent(event.target.checked)} />
                I agree to send this question, recent exchanges, and study context to the AI provider, which may retain or use them for model improvement.
              </label>}
              <button className={button} disabled={busy || !turns || (!coursePdfSearch && !consent) || !draft.trim()}>
                {busy ? "Working…" : coursePdfSearch ? "Search PDFs" : "Ask JARVIS"}
              </button>
              <p role="status">{sendStatus}</p>
            </form>
          </>
        ) : <p>Select a saved conversation or create a new one.</p>}
      </section>
    </div>
  );
}
