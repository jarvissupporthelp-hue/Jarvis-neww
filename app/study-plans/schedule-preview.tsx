"use client";

import Link from "next/link";
import { useState } from "react";
import { getAccessToken } from "@/lib/browser-supabase";
import { SessionCompletion } from "./session-completion";
import type { StudySchedule } from "@/lib/study-scheduler";

type VisibleSchedule = Omit<StudySchedule, "sessions"> & {
  sessions: (StudySchedule["sessions"][number] & {
    id?: string; completedAt?: string | null; confidenceAfter?: number | null;
  })[];
};

export function SchedulePreview({ planId, hasSessions, refreshPlans }: {
  planId: string; hasSessions: boolean; refreshPlans: () => Promise<void>;
}) {
  const [schedule, setSchedule] = useState<VisibleSchedule | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setBusy(true);
    setError("");
    setSchedule(null);
    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/study-plans/${planId}/schedule`, {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Could not generate the schedule.");
        return;
      }
      setSchedule(result);
      setConfirmed(result.confirmed === true);
    } catch {
      setError("Could not generate the schedule. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!schedule?.sessions.length || busy || confirmed) return;
    setBusy(true);
    setError("");
    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/study-plans/${planId}/schedule`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: true, sessions: schedule.sessions }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) setSchedule(null);
        setError(result.error || "Could not confirm the schedule.");
        return;
      }
      // Reload the stored sessions, including when this request was a retry.
      await generate();
      await refreshPlans();
    } catch {
      setError("Could not confirm the schedule. Try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-3 space-y-2 border-t border-[#afbeb3] pt-3" aria-label="Schedule preview">
      <button type="button" disabled={busy} onClick={() => void generate()}
        className="rounded bg-[#1e3328] px-4 py-2 text-white disabled:opacity-50">
        {busy ? "Working…" : hasSessions || confirmed ? "View study sessions" : "Generate schedule preview"}
      </button>
      {error && <p role="alert">{error}</p>}
      {schedule && (
        <div className="space-y-2" aria-live="polite">
          <h3 className="font-semibold">{confirmed ? "Confirmed sessions" : "Proposed sessions"} · Yerevan time</h3>
          {schedule.sessions.length ? (
            <ol className="list-decimal space-y-1 pl-5">{schedule.sessions.map((session) => (
              <li key={session.id ?? session.topicPosition ?? "review"} className="break-words">
                <strong>{session.title}</strong> · {session.date} · {session.start}–{session.end}
                {session.completedAt && (
                  <p className="text-sm font-semibold">Completed{session.confidenceAfter ? ` · Confidence ${session.confidenceAfter}/5` : ""}</p>
                )}
                {confirmed && session.id && !session.completedAt && (
                  <SessionCompletion sessionId={session.id} topic={session.topicPosition === null ? null : session.title}
                    onCompleted={async () => {
                      await generate();
                      await refreshPlans();
                    }} />
                )}
              </li>
            ))}</ol>
          ) : <p>No sessions fit before the exam.</p>}
          {schedule.unscheduled.length > 0 && (
            <p><strong>Topics that didn’t fit:</strong> {schedule.unscheduled.map((topic) => topic.name).join(", ")}.
              {" "}Try widening your availability or shortening sessions.</p>
          )}
          {confirmed ? (
            <p className="text-sm">Saved to your calendar. <Link href="/account#student-timetable" className="underline">Open calendar</Link></p>
          ) : (
            <>
              <p className="text-sm">Preview only. Sessions haven’t been saved to your calendar.</p>
              {schedule.sessions.length > 0 && (
                <button type="button" disabled={busy} onClick={() => void confirm()}
                  className="rounded bg-[#1e3328] px-4 py-2 text-white disabled:opacity-50">Confirm schedule</button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
