"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { getClient } from "@/lib/browser-supabase";
import { focusSeconds, type ActiveFocusTimer, type FocusMode } from "@/lib/focus-timer";

type Snapshot = {
  server_now: string;
  active: ActiveFocusTimer | null;
  today_minutes: number;
  week_minutes: number;
  history: { id: string; label: string; duration_minutes: number; completed_at: string }[];
};
type Action = "read" | "start" | "pause" | "resume" | "reset";
const card = "space-y-3 rounded-xl border border-[#afbeb3] bg-white p-4 sm:p-5";
const button = "rounded bg-[#1e3328] px-4 py-2 text-white disabled:opacity-50";
const field = "block w-full rounded border border-[#789181] bg-white p-2";
const historyDate = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Yerevan",
});

export function FocusWorkspace() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [mode, setMode] = useState<FocusMode>("focus");
  const [minutes, setMinutes] = useState({ focus: 25, break: 5 });
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [signIn, setSignIn] = useState(false);
  const inFlight = useRef(false);
  const pendingStart = useRef<string | null>(null);
  const attemptedCompletion = useRef<string | null>(null);
  const serverOffset = useRef(0);
  const active = snapshot?.active;

  const update = useCallback(async (action: Action, options: Record<string, string | number> = {}) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const client = getClient();
      const { data: session, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session.session) { setSignIn(true); return; }
      const { data, error: failure } = await client.rpc("focus_timer", { p_action: action, ...options });
      if (failure?.code === "42501") { setSignIn(true); return; }
      if (failure) throw failure;
      const state = data as Snapshot;
      if (action === "start") pendingStart.current = null;
      serverOffset.current = Date.parse(state.server_now) - Date.now();
      setSeconds(state.active ? focusSeconds(state.active, Date.now() + serverOffset.current) : 0);
      if (state.active) setMode(state.active.mode);
      setSnapshot(state);
    } catch {
      setError("Could not sync your focus timer. Try again.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const request = window.setTimeout(() => void update("read"), 0);
    return () => window.clearTimeout(request);
  }, [update]);

  useEffect(() => {
    if (active?.state !== "running") return;
    const tick = () => setSeconds(focusSeconds(active, Date.now() + serverOffset.current));
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [active]);

  useEffect(() => {
    if (active?.state === "paused" || seconds > 0) attemptedCompletion.current = null;
    if (active?.state === "running" && seconds === 0 && !busy && attemptedCompletion.current !== active.id) {
      attemptedCompletion.current = active.id;
      void update("read");
    }
  }, [active, seconds, busy, update]);

  function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    pendingStart.current ??= crypto.randomUUID();
    void update("start", {
      p_id: pendingStart.current, p_mode: mode, p_minutes: minutes[mode],
      p_label: mode === "focus" ? String(fields.get("label") ?? "").trim() : "",
    });
  }

  if (signIn) return <p>Sign in with an active student account. <Link href="/account" className="underline">Sign in</Link></p>;
  if (!snapshot && !error) return <p role="status">Loading your focus timer…</p>;
  const time = [Math.floor(seconds / 60), seconds % 60].map((part) => String(part).padStart(2, "0")).join(":");

  return (
    <>
      {error && <p role="alert">{error}</p>}
      <section className={card} aria-label="Focus timer">
        {active ? (
          <>
            <p className="font-semibold">{active.mode === "focus" ? "Focus" : "Break"} · {active.state === "paused" ? "Paused" : "Running"}</p>
            {active.label && <p className="break-words">{active.label}</p>}
            <p role="timer" className="text-5xl font-semibold tabular-nums" aria-label={`${time} remaining`}>{time}</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" className={button} disabled={busy || seconds === 0}
                onClick={() => void update(active.state === "paused" ? "resume" : "pause", { p_id: active.id })}>
                {active.state === "paused" ? "Resume" : "Pause"}
              </button>
              <button type="button" className="underline disabled:opacity-50" disabled={busy || seconds === 0}
                onClick={() => void update("reset", { p_id: active.id })}>Reset timer</button>
            </div>
          </>
        ) : snapshot && (
          <form className="space-y-3" onSubmit={start} onChange={() => { pendingStart.current = null; }}>
            <label>Timer type
              <select className={field} value={mode} disabled={busy}
                onChange={(event) => setMode(event.target.value as FocusMode)}>
                <option value="focus">Focus</option><option value="break">Break</option>
              </select>
            </label>
            <label>Duration in minutes
              <input className={field} type="number" min={1} max={90} required value={minutes[mode] || ""} disabled={busy}
                onChange={(event) => setMinutes({ ...minutes, [mode]: Number(event.target.value) })} />
            </label>
            {mode === "focus" && <label>Task or study topic (optional)
              <input className={field} name="label" maxLength={120} disabled={busy} />
            </label>}
            <button className={button} disabled={busy}>{mode === "focus" ? "Start focus session" : "Start break"}</button>
          </form>
        )}
        <button type="button" className="text-sm underline disabled:opacity-50" disabled={busy}
          onClick={() => void update("read")}>Refresh timer and history</button>
      </section>
      {snapshot && <section className={card}>
        <h2 className="text-xl font-semibold">Focus history</h2>
        <p role="status">{snapshot.today_minutes} min today · {snapshot.week_minutes} min this week</p>
        {snapshot.history.length ? (
          <ul className="space-y-2">{snapshot.history.map((item) => (
            <li key={item.id} className="break-words">
              <strong>{item.label || "Focus session"}</strong>
              <p className="text-sm">{item.duration_minutes} min · {historyDate.format(new Date(item.completed_at))} Yerevan</p>
            </li>
          ))}</ul>
        ) : <p>No completed focus sessions yet.</p>}
      </section>}
    </>
  );
}
