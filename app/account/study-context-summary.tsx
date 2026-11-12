"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/browser-supabase";
import type { StudyContext } from "@/lib/study-context";

export function StudyContextSummary() {
  const [context, setContext] = useState<StudyContext | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const token = await getAccessToken();
        const response = await fetch("/api/chat/context", {
          headers: { Authorization: `Bearer ${token ?? ""}` }, signal: controller.signal,
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!controller.signal.aborted) setContext(data);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    })();
    return () => controller.abort();
  }, []);

  return (
    <details className="rounded jarvis-muted-panel p-3 text-sm">
      <summary className="cursor-pointer font-semibold">My study context</summary>
      {failed && <p>Could not load the context preview.</p>}
      {!context && !failed && <p>Loading study context…</p>}
      {context && (
        <div className="mt-2 space-y-2">
          <p>{context.from} to {context.through} · {context.timeZone}</p>
          <p><strong>Courses:</strong> {context.courses.map((course) => course.name).join(", ") || "No current courses"}</p>
          {context.classes.length ? (
            <ul className="list-disc pl-5">{context.classes.map((lesson, index) => (
              <li key={index}>{lesson.course} · {lesson.date} · {lesson.start.slice(0, 5)}–{lesson.end.slice(0, 5)}</li>
            ))}</ul>
          ) : <p>No scheduled classes in this window.</p>}
          <p><strong>Personal busy blocks:</strong> {context.busyTimes.length}</p>
          <ul className="list-disc pl-5">{context.busyTimes.map((block, index) => (
            <li key={index}>{block.date} · {block.start.slice(0, 5)}–{block.end.slice(0, 5)}</li>
          ))}</ul>
          <p><strong>Personal task due dates:</strong> {context.taskDueDates.length}</p>
          <ul className="list-disc pl-5">{context.taskDueDates.map((due) => (
            <li key={due.date}>{due.date} · {due.count} open {due.count === 1 ? "task" : "tasks"}</li>
          ))}</ul>
          {!context.officialExamDatesAvailable && <p>Verified exam dates aren’t available yet.</p>}
        </div>
      )}
    </details>
  );
}
