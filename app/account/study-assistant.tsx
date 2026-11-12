"use client";

import Link from "next/link";
import { ChatAnswer } from "./chat-answer";
import { ChatPlanStarter } from "./chat-plan-starter";
import { StudyContextSummary } from "./study-context-summary";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { getAccessToken, getClient } from "@/lib/browser-supabase";
import { MAX_STUDY_PROMPT } from "@/lib/study-chat-limits";

type Thread = { id: string; title: string };
type Turn = { id: string; prompt: string; answer: string };
type Usage = { limit: number; used: number; remaining: number; inputTokens: number; outputTokens: number; tokenReportedAttempts: number; resetsAt: string };
type Memory = { learning_preferences: string; current_goal: string; topics_to_practice: string };

const button = "min-h-11 rounded-xl bg-[#214b36] px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-[#163c2b] disabled:cursor-not-allowed disabled:opacity-50";
const field = "w-full rounded-xl border border-[#bbccbc] bg-white p-3 text-[#1e3328] placeholder:text-[#73877a]";

export function StudyAssistant() {
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [selected, setSelected] = useState<Thread | null>(null);
  const [turns, setTurns] = useState<Turn[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [title, setTitle] = useState("");
  const [coursePdfSearch, setCoursePdfSearch] = useState(false);
  const [error, setError] = useState("");
  const [threadsAttempt, setThreadsAttempt] = useState(0);
  const [turnsAttempt, setTurnsAttempt] = useState(0);
  const [sendStatus, setSendStatus] = useState("");
  const composer = useRef<HTMLHeadingElement>(null);
  const history = useRef<HTMLOListElement>(null);
  const newAnswer = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [memory, setMemory] = useState<Memory | null>(null);
  const [memoryStatus, setMemoryStatus] = useState("");
  const [usageError, setUsageError] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState("");
  const [failedPrompt, setFailedPrompt] = useState("");
  const [newTurnId, setNewTurnId] = useState<string | null>(null);

  const selectedId = selected?.id;
  const draft = selectedId ? drafts[selectedId] ?? "" : "";

  const refreshUsage = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    const response = await fetch("/api/chat/usage", { headers: { Authorization: `Bearer ${token}` } });
    if (response.ok) { setUsage(await response.json()); setUsageError(false); }
    else setUsageError(true);
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
        if (data.length) {
          setSelected((current) => current ?? data[0]);
          setTitle((current) => current || data[0].title);
        }
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
  }, [turns, pendingPrompt, failedPrompt]);

  useEffect(() => {
    if (newTurnId) newAnswer.current?.focus({ preventScroll: true });
  }, [newTurnId]);

  function open(thread: Thread) {
    if (thread.id !== selectedId) setTurns(null);
    setSelected(thread);
    setTitle(thread.title);
    setError("");
    setSendStatus("");
    setNewTurnId(null);
    setFailedPrompt("");
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
    if (busy || !selectedId || !turns || !draft.trim()) return;
    const question = draft.trim();
    setSendStatus(coursePdfSearch ? "Searching course PDFs…" : "Waiting for JARVIS…");
    setPendingPrompt(question);
    setFailedPrompt("");
    setNewTurnId(null);
    setBusy(true);
    setError("");
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedId, prompt: question, mode: coursePdfSearch ? "course-pdfs" : "general" }),
      });
      const result = await response.json();
      if (!response.ok) {
        setSendStatus("");
        setError(result.error || "Could not get a reply. Your draft is still here.");
        setFailedPrompt(question);
        return;
      }
      if (typeof result?.turn?.id !== "string" || typeof result.turn.prompt !== "string" || typeof result.turn.answer !== "string") {
        throw new Error("Invalid chat response");
      }
      setTurns((items) => [...(items ?? []), result.turn].slice(-100));
      setNewTurnId(result.turn.id);
      setSendStatus("Reply ready.");
      setDrafts((items) => ({ ...items, [selectedId]: "" }));
    } catch {
      setSendStatus("");
      setError("Could not get a reply. Your draft is still here.");
      setFailedPrompt(question);
    } finally {
      setPendingPrompt("");
      setBusy(false);
      void refreshUsage().catch(() => {});
    }
  }

  if (needsSignIn) return <div className="mx-auto max-w-xl rounded-3xl border border-[#d8e3d5] bg-white p-8 text-center shadow-sm">
    <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#e5f2e3] text-2xl text-[#214b36]">✦</div>
    <h2 className="text-2xl font-semibold">Your study space is ready</h2>
    <p className="mt-2 text-[#536a59]">Sign in with an active student account to see your conversations and ask JARVIS a question.</p>
    <Link className={button + " mt-6 inline-flex items-center"} href="/account">Sign in to JARVIS</Link>
  </div>;
  if (!threads) return error ? (
    <div className="rounded-2xl border border-[#e8c8bb] bg-white p-6">
      <p role="alert" className="mb-4 text-[#9b3d31]">{error}</p>
      <button type="button" className={button} onClick={() => {
        setError("");
        setThreadsAttempt((value) => value + 1);
      }}>Retry loading conversations</button>
    </div>
  ) : <p role="status" className="rounded-2xl bg-white p-6 text-[#536a59]">Loading your study space…</p>;

  const navigation = <div className="flex h-full min-h-0 flex-col gap-4">
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#69836d]">Your workspace</p>
      <h2 className="mt-1 text-xl font-semibold">Conversations</h2>
    </div>
    <button type="button" className={button + " w-full"} disabled={busy} onClick={() => void manage("create")}>+ New conversation</button>
    <div aria-label="Daily AI usage" className="rounded-2xl border border-[#d9e7d7] bg-[#edf5e9] p-4">
      <p className="text-sm font-semibold text-[#294b32]">Daily AI messages</p>
      {usage ? <>
        <p className="mt-1 text-2xl font-bold text-[#183d2b]">{usage.remaining} <span className="text-sm font-normal text-[#55705a]">/ {usage.limit} left</span></p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#d3e4d2]">
          <div className="h-full rounded-full bg-[#4c8a5a]" style={{ width: String((usage.remaining / usage.limit) * 100) + "%" }} />
        </div>
        <p className="mt-2 text-xs text-[#55705a]">Resets at 00:00 UTC · {usage.used} used</p>
        <p className="mt-3 border-t border-[#d3e4d2] pt-2 text-xs text-[#4c6653]">
          {usage.inputTokens + usage.outputTokens} tokens reported ({usage.inputTokens} in · {usage.outputTokens} out)
        </p>
        {usage.tokenReportedAttempts < usage.used && <p className="mt-1 text-xs text-[#6d7158]">Some replies have no token report.</p>}
      </> : <p className="mt-2 text-sm text-[#536a59]">{usageError ? "Usage is unavailable. Try reloading." : "Checking usage…"}</p>}
    </div>
    <nav aria-label="Saved conversations" className="min-h-0 flex-1 overflow-y-auto">
      {threads.length === 0 ? <p className="rounded-xl border border-dashed border-[#ccd9ca] p-3 text-sm text-[#6a7c6d]">No conversations yet. Start one above.</p>
        : <ul className="space-y-1">{threads.map((thread) => <li key={thread.id}>
          <button type="button" disabled={busy} aria-current={thread.id === selectedId ? "page" : undefined}
            className="w-full rounded-xl px-3 py-3 text-left text-sm break-words transition hover:bg-[#edf4eb] aria-[current=page]:bg-[#e0efdf] aria-[current=page]:font-semibold disabled:opacity-60"
            onClick={() => open(thread)}>{thread.title}</button>
        </li>)}</ul>}
    </nav>
    <details className="shrink-0 rounded-xl border border-[#d9e2d7] bg-white p-3">
      <summary className="cursor-pointer text-sm font-semibold">My study memory</summary>
      <p className="mt-2 text-xs text-[#647868]">Only your account can edit this. JARVIS uses it only to personalize your account.</p>
      {memory ? <form className="mt-3 space-y-3" onSubmit={saveMemory}>
        <label className="block text-xs font-medium">How I learn best<textarea className={field} rows={2} maxLength={1000} value={memory.learning_preferences} onChange={(event) => setMemory({ ...memory, learning_preferences: event.target.value })} /></label>
        <label className="block text-xs font-medium">Current goal<textarea className={field} rows={2} maxLength={1000} value={memory.current_goal} onChange={(event) => setMemory({ ...memory, current_goal: event.target.value })} /></label>
        <label className="block text-xs font-medium">Topics to practice<textarea className={field} rows={2} maxLength={1000} value={memory.topics_to_practice} onChange={(event) => setMemory({ ...memory, topics_to_practice: event.target.value })} /></label>
        <div className="flex flex-wrap items-center gap-3">
          <button className={button}>Save memory</button>
          <button type="button" className="text-sm underline" onClick={async () => {
            const token = await getAccessToken();
            const response = await fetch("/api/chat/memory", { method: "DELETE", headers: { Authorization: "Bearer " + (token ?? "") } });
            if (response.ok) { setMemory((await response.json()).memory); setMemoryStatus("Memory cleared."); }
            else setMemoryStatus("Could not clear memory.");
          }}>Clear</button>
        </div>
      </form> : <p className="mt-2 text-sm">Memory unavailable.</p>}
      {memoryStatus && <p role="status" className="mt-2 text-xs">{memoryStatus}</p>}
    </details>
  </div>;

  return <div className="grid gap-4 lg:h-[calc(100dvh-10rem)] lg:min-h-[580px] lg:grid-cols-[17rem_minmax(0,1fr)]">
    <aside aria-label="Conversations and usage" className="hidden min-h-0 rounded-3xl border border-[#d7e2d4] bg-white p-5 shadow-sm lg:block">{navigation}</aside>
    <div className="flex min-w-0 flex-col gap-3 lg:min-h-0">
      <details className="rounded-2xl border border-[#d7e2d4] bg-white p-3 shadow-sm lg:hidden">
        <summary className="cursor-pointer font-semibold">Conversations, usage & memory</summary>
        <div className="mt-4 max-h-[60dvh] overflow-y-auto">{navigation}</div>
      </details>
      <section aria-label="Study conversation" className="flex h-[min(78dvh,820px)] min-h-[540px] min-w-0 flex-col overflow-hidden rounded-3xl border border-[#d7e2d4] bg-white shadow-[0_18px_45px_rgba(30,51,40,0.08)] lg:h-full lg:min-h-0">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#e8eee6] bg-[#fbfdf9] px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#58745f]"><span className="size-2 rounded-full bg-[#64aa70]" /> JARVIS · Study coach</p>
            <h2 className="mt-1 truncate text-lg font-semibold sm:text-xl">{selected?.title ?? "Your new conversation"}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {usage && <span className="hidden rounded-full bg-[#e7f1e4] px-3 py-1 text-xs font-semibold text-[#315b3a] sm:block">{usage.remaining} messages left</span>}
            <button type="button" className="rounded-xl border border-[#b7ceb7] px-3 py-2 text-xs font-semibold text-[#214b36] hover:bg-[#eaf4e8] disabled:opacity-50" disabled={busy} onClick={() => void manage("create")}>+ New chat</button>
          </div>
        </header>
        {selected && <details className="shrink-0 border-b border-[#e8eee6] bg-white px-4 py-2 text-sm sm:px-6">
          <summary className="cursor-pointer font-medium text-[#496b51]">Course context, study plans & chat settings</summary>
          <div className="grid gap-3 py-3 md:grid-cols-2">
            <StudyContextSummary />
            <ChatPlanStarter />
            <form className="flex flex-col gap-2 rounded-xl bg-[#f3f7f1] p-3 md:col-span-2" onSubmit={(event) => { event.preventDefault(); void manage("rename"); }}>
              <label className="text-sm font-medium">Conversation title<input className={field} required maxLength={100} value={title} disabled={busy} onChange={(event) => setTitle(event.target.value)} /></label>
              <div className="flex items-center gap-4">
                <button type="submit" className="font-semibold text-[#214b36] underline disabled:opacity-50" disabled={busy || !title.trim() || title.trim() === selected.title}>Rename</button>
                <button type="button" className="text-[#a23c36] underline disabled:opacity-50" disabled={busy} onClick={() => void manage("delete")}>Delete conversation</button>
              </div>
            </form>
          </div>
        </details>}
        {error && <p role="alert" className="mx-4 mt-3 shrink-0 rounded-xl border border-[#ebc5b9] bg-[#fff2ed] px-4 py-3 text-sm text-[#9b3d31] sm:mx-6">{error}</p>}
        <ol ref={history} role="log" aria-label="Conversation messages" aria-live="polite" aria-relevant="additions" tabIndex={0}
          className="min-h-0 flex-1 space-y-6 overflow-y-auto bg-[linear-gradient(180deg,#fbfdf9_0%,#ffffff_65%)] px-4 py-6 sm:px-6">
          {!selected && <li className="mx-auto flex h-full max-w-md flex-col items-center justify-center text-center">
            <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-[#e5f2e3] text-3xl text-[#214b36]">✦</div>
            <h3 className="text-2xl font-semibold">Learn with JARVIS</h3>
            <p className="mt-2 text-[#647868]">Ask about your courses, prepare for an exam, or work through a difficult concept step by step.</p>
            <button type="button" className={button + " mt-6"} onClick={() => void manage("create")}>Start a conversation</button>
          </li>}
          {selected && !turns && !error && <li role="status" className="text-center text-sm text-[#647868]">Loading conversation…</li>}
          {selected && !turns && error && <li className="text-center"><button type="button" className={button} onClick={() => {
            setError("");
            setTurnsAttempt((value) => value + 1);
          }}>Retry loading messages</button></li>}
          {selected && turns?.length === 0 && !pendingPrompt && <li className="mx-auto max-w-md py-10 text-center">
            <p className="text-lg font-semibold">What would you like to study?</p>
            <p className="mt-2 text-sm text-[#647868]">Try a course question or ask for an exam preparation plan.</p>
            <button type="button" className="mt-5 rounded-xl border border-[#cbdcca] bg-white px-4 py-3 text-left text-sm text-[#315b3a] hover:bg-[#eff6ed]" onClick={() => setDrafts((items) => ({ ...items, [selected.id]: "Explain this topic from theory to an exam-style example." }))}>Explain theory, then show an exam example ↗</button>
          </li>}
          {turns?.map((turn) => <li key={turn.id} className="space-y-4">
            <div className="ml-auto w-fit max-w-[92%] rounded-2xl rounded-br-md bg-[#214b36] px-4 py-3 text-[15px] leading-6 text-white shadow-sm sm:max-w-[78%]">
              <p className="mb-1 text-xs font-semibold text-[#b9d8bd]">You</p>
              <p className="whitespace-pre-wrap break-words">{turn.prompt}</p>
            </div>
            <div ref={newTurnId === turn.id ? newAnswer : undefined} tabIndex={newTurnId === turn.id ? -1 : undefined}
              className="mr-auto max-w-full rounded-2xl rounded-bl-md border border-[#dbe7da] bg-white px-4 py-4 shadow-sm sm:max-w-[92%] sm:px-5">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[#214b36]"><span className="flex size-7 items-center justify-center rounded-lg bg-[#e7f2e4]">✦</span> JARVIS</p>
              <ChatAnswer text={turn.answer} />
            </div>
          </li>)}
          {pendingPrompt && <li className="space-y-4">
            <div className="ml-auto w-fit max-w-[92%] rounded-2xl rounded-br-md bg-[#214b36] px-4 py-3 text-[15px] text-white sm:max-w-[78%]">
              <p className="mb-1 text-xs font-semibold text-[#b9d8bd]">You</p>
              <p className="whitespace-pre-wrap break-words">{pendingPrompt}</p>
            </div>
            <div role="status" className="mr-auto w-fit rounded-2xl border border-[#dbe7da] bg-white px-5 py-4 text-sm text-[#52715a] shadow-sm">
              <span className="mr-2 inline-block size-2 animate-pulse rounded-full bg-[#6cab76]" />{coursePdfSearch ? "Searching your course PDFs…" : "JARVIS is preparing your answer…"}
            </div>
          </li>}
          {failedPrompt && !pendingPrompt && <li className="space-y-4">
            <div className="ml-auto w-fit max-w-[92%] rounded-2xl rounded-br-md bg-[#214b36] px-4 py-3 text-[15px] text-white sm:max-w-[78%]">
              <p className="mb-1 text-xs font-semibold text-[#b9d8bd]">You</p>
              <p className="whitespace-pre-wrap break-words">{failedPrompt}</p>
            </div>
            <div role="alert" className="mr-auto max-w-full rounded-2xl border border-[#ebc5b9] bg-[#fff2ed] px-5 py-4 text-sm text-[#803c32] shadow-sm">
              <p className="font-semibold">JARVIS could not answer yet</p>
              <p className="mt-1">{error || "The model connection failed. Your question is still in the box below."}</p>
              <p className="mt-2 text-xs">Your question was not saved as a reply. You can retry it after the connection is fixed.</p>
            </div>
          </li>}
        </ol>
        {selected ? <form className="jarvis-chat-composer shrink-0 space-y-3 border-t px-4 py-3 sm:px-6" onSubmit={ask} aria-busy={busy}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className={"jarvis-pdf-mode " + (coursePdfSearch ? "is-active" : "")}>
              <input className="sr-only" type="checkbox" checked={coursePdfSearch} disabled={busy}
                onChange={(event) => setCoursePdfSearch(event.target.checked)} />
              <span className="jarvis-pdf-icon" aria-hidden="true">PDF</span>
              <span><strong>Course sources</strong><small>{coursePdfSearch ? "Search PDFs only" : "Use general AI"}</small></span>
              <span className="jarvis-mode-switch" aria-hidden="true"><i /></span>
            </label>
            <span className="text-xs text-[#708473]">{coursePdfSearch ? "Cited pages · no AI message used" : usage ? usage.remaining + " AI messages left today" : "AI study mode"}</span>
          </div>
          <label className="sr-only" htmlFor="study-question">Study question</label>
          <textarea id="study-question" className={field + " jarvis-chat-input block max-h-40 min-h-20 resize-y"} rows={3} maxLength={MAX_STUDY_PROMPT} required readOnly={busy}
            placeholder={coursePdfSearch ? "Search your course material…" : "Ask JARVIS anything about your studies…"}
            value={draft}
            onChange={(event) => setDrafts((items) => ({ ...items, [selected.id]: event.target.value }))}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 flex-1 text-xs text-[#637766]">
              {coursePdfSearch ? <>Answers include source pages. <Link href="/resources" className="underline">View course resources</Link></>
                : <>Enter to send · Shift + Enter for a new line</>}
            </p>
            <button className={button + " jarvis-chat-send min-w-28"} disabled={busy || !turns || !draft.trim()}>
              {busy ? "Working…" : coursePdfSearch ? "Search PDFs" : "Send"}
              {!busy && <span aria-hidden="true">↗</span>}
            </button>
          </div>
          <p role="status" className="sr-only">{sendStatus}</p>
        </form> : <p className="shrink-0 border-t border-[#e4ece2] px-5 py-4 text-center text-sm text-[#647868]">Create a conversation to start chatting.</p>}
      </section>
    </div>
  </div>;
}
