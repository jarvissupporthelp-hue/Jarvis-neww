"use client";

import { useState } from "react";
import { getAccessToken } from "@/lib/browser-supabase";
import type { StudySchedule } from "@/lib/study-scheduler";

export function SchedulePreview({ planId }: { planId: string }) {
  const [schedule, setSchedule] = useState<StudySchedule | null>(null);
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
    } catch {
      setError("Could not generate the schedule. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-3 space-y-2 border-t border-[#afbeb3] pt-3" aria-label="Schedule preview">
      <button type="button" disabled={busy} onClick={() => void generate()}
        className="rounded bg-[#1e3328] px-4 py-2 text-white disabled:opacity-50">
        {busy ? "Finding study time…" : "Generate schedule preview"}
      </button>
      {error && <p role="alert">{error}</p>}
      {schedule && (
        <div className="space-y-2" aria-live="polite">
          <h3 className="font-semibold">Proposed sessions · Yerevan time</h3>
          {schedule.sessions.length ? (
            <ol className="list-decimal space-y-1 pl-5">{schedule.sessions.map((session) => (
              <li key={session.topicPosition ?? "review"} className="break-words">
                <strong>{session.title}</strong> · {session.date} · {session.start}–{session.end}
              </li>
            ))}</ol>
          ) : <p>No sessions fit before the exam.</p>}
          {schedule.unscheduled.length > 0 && (
            <p><strong>Topics that didn’t fit:</strong> {schedule.unscheduled.map((topic) => topic.name).join(", ")}.
              {" "}Try widening your availability or shortening sessions.</p>
          )}
          <p className="text-sm">Preview only. Sessions haven’t been saved to your calendar.</p>
        </div>
      )}
    </section>
  );
}
