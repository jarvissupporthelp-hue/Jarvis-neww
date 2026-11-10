"use client";

import { useState } from "react";
import { getAccessToken } from "@/lib/browser-supabase";
import type { RebalanceMove } from "@/lib/study-rebalance";

type Preview = { moves: RebalanceMove[]; unplaced: string[] };

function slot(date: string, start: string, end: string) {
  return `${date} · ${start.slice(0, 5)}–${end.slice(0, 5)}`;
}

export function RebalancePreview({ planId, practiceTopics, onApplied }: {
  planId: string; practiceTopics?: string[]; onApplied: () => Promise<void>;
}) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const changed = preview?.moves.filter((move) =>
    slot(move.oldDate, move.oldStart, move.oldEnd) !== slot(move.date, move.start, move.end)) ?? [];
  const canApply = preview && !preview.unplaced.length && changed.length > 0;

  async function submit(apply: boolean, useFeedback = false) {
    setBusy(true);
    setError("");
    if (!apply) setPreview(null);
    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/study-plans/${planId}/rebalance`, {
        method: apply || useFeedback ? "POST" : "GET",
        headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
        body: apply ? JSON.stringify({ confirmed: true, moves: preview?.moves })
          : useFeedback ? JSON.stringify({ practiceTopics }) : undefined,
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) setPreview(null);
        setError(result.error || "Could not rebalance your sessions.");
        return;
      }
      if (apply) await onApplied();
      else setPreview(result);
    } catch {
      setError("Could not rebalance your sessions. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-2 rounded border border-[#afbeb3] p-3" aria-label="Rebalance study sessions">
      <p className="text-sm">Rebalance missed and upcoming unfinished sessions around your latest calendar. Completed sessions and sessions in progress stay in place.</p>
      <button type="button" disabled={busy} onClick={() => void submit(false)}
        className="rounded border border-[#1e3328] px-3 py-2 disabled:opacity-50">Preview rebalance</button>
      {!!practiceTopics?.length && (
        <button type="button" disabled={busy} onClick={() => void submit(false, true)}
          className="ml-2 rounded border border-[#1e3328] px-3 py-2 disabled:opacity-50">Preview with quiz feedback</button>
      )}
      {error && <p role="alert">{error}</p>}
      {preview && (
        <div className="space-y-2" aria-live="polite">
          {preview.unplaced.length > 0 ? (
            <p>No changes can be applied because these sessions don’t fit before the exam: {preview.unplaced.join(", ")}.</p>
          ) : changed.length ? (
            <ul className="list-disc space-y-1 pl-5">
              {changed.map((move) => (
                <li key={move.id}>
                  <strong>{move.title}</strong><br />
                  <span className="text-sm">From {slot(move.oldDate, move.oldStart, move.oldEnd)} to {slot(move.date, move.start, move.end)}</span>
                </li>
              ))}
            </ul>
          ) : <p>{preview.moves.length ? "Your current schedule already fits." : "No unfinished sessions are eligible to move."}</p>}
          {canApply && (
            <button type="button" disabled={busy} onClick={() => void submit(true)}
              className="rounded bg-[#1e3328] px-4 py-2 text-white disabled:opacity-50">Apply rebalance</button>
          )}
        </div>
      )}
    </section>
  );
}
