"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { getAccessToken } from "@/lib/browser-supabase";
import type { CourseAssignment } from "@/lib/course-assignments";
import { CourseResources } from "../resources/workspace";
import { Timetable } from "../account/timetable";

type Offering = {
  id: string;
  course: { name: string; code: string };
  group: { name: string };
  semester: { name: string };
};
type WorkspaceData = { courses: Offering[] } | { course: Offering; assignments: CourseAssignment[] };

const field = "block w-full rounded border border-[#789181] bg-white p-2";
const card = "jarvis-panel space-y-3";

function CoursePage({ offering, initialAssignments }: { offering: Offering; initialAssignments: CourseAssignment[] }) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const pending = useRef<{ id: string; details: string } | null>(null);
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Yerevan", dateStyle: "short" }).format(new Date());

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    const details = JSON.stringify(fields);
    if (pending.current?.details !== details) pending.current = { id: crypto.randomUUID(), details };
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/lecturer", {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, offeringId: offering.id, id: pending.current.id }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Could not publish the assignment.");
        return;
      }
      setAssignments((items) => [...items.filter((item) => item.id !== result.id), result]
        .sort((a, b) => a.due_on.localeCompare(b.due_on) || a.due_at.localeCompare(b.due_at) || a.id.localeCompare(b.id)));
      pending.current = null;
      form.reset();
      setMessage("Assignment published to enrolled students.");
    } catch {
      setError("Could not confirm publication. Retry with the same details.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="jarvis-lecturer-workspace">
      <header className="jarvis-role-hero">
        <span className="jarvis-eyebrow">COURSE WORKSPACE · {offering.group.name}</span>
        <h1>{offering.course.name}</h1>
        <p>{offering.course.code} · {offering.semester.name}</p>
        <div className="jarvis-role-hero-links"><a href="#publish-assignment">Publish assignment ↓</a><a href="#course-pdf-resources">Course PDFs ↓</a></div>
      </header>
      <form id="publish-assignment" className={card} onSubmit={publish}>
        <div className="jarvis-section-heading"><div><span className="jarvis-eyebrow">PUBLISH TO STUDENTS</span><h2 className="text-xl font-semibold">Create an assignment</h2></div></div>
        <p>Enrolled students in {offering.group.name} can read the brief and see the deadline on their dashboard and calendar.</p>
        <fieldset className="space-y-3" disabled={busy}>
          <label className="block">Title<input className={field} name="title" maxLength={120} required /></label>
          <label className="block">Brief and submission instructions<textarea className={field} name="brief" rows={4} maxLength={4000} required /></label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label>Due date<input className={field} type="date" name="dueOn" min={today} required /></label>
            <label>Due time (Yerevan)<input className={field} type="time" name="dueAt" defaultValue="23:59" required /></label>
          </div>
          <button className="rounded jarvis-primary-button px-4 py-2 text-white disabled:opacity-50">
            {busy ? "Publishing…" : "Publish assignment"}
          </button>
        </fieldset>
        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
      </form>
      <section className={card}>
        <div className="jarvis-section-heading"><div><span className="jarvis-eyebrow">COURSEWORK</span><h2 className="text-xl font-semibold">Published assignments</h2></div><span className="jarvis-counter">{assignments.length}</span></div>
        {assignments.length ? (
          <ul className="space-y-2">
            {assignments.map((item) => (
              <li key={item.id} className="jarvis-muted-panel p-3">
                <strong className="break-words">{item.title}</strong>
                <p className="text-sm">Due {item.due_on} · {item.due_at.slice(0, 5)} Yerevan</p>
                <p className="whitespace-pre-wrap break-words">{item.brief}</p>
              </li>
            ))}
          </ul>
        ) : <p>No assignments published for this group yet.</p>}
      </section>
      <div id="course-pdf-resources"><CourseResources offeringId={offering.id} canPublish /></div>
    </div>
  );
}

export function LecturerWorkspace({ offeringId }: { offeringId?: string }) {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [error, setError] = useState("");
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const token = await getAccessToken();
        if (controller.signal.aborted) return;
        if (!token) { setNeedsSignIn(true); return; }
        const query = offeringId ? `?course=${encodeURIComponent(offeringId)}` : "";
        const response = await fetch(`/api/lecturer${query}`, {
          headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
        });
        const result = await response.json();
        if (controller.signal.aborted) return;
        if (response.status === 401 || response.status === 403) setNeedsSignIn(true);
        else if (!response.ok) setError(result.error ?? "Could not load the lecturer workspace.");
        else setData(result);
      } catch {
        if (!controller.signal.aborted) setError("Could not load the lecturer workspace. Reload to try again.");
      }
    })();
    return () => controller.abort();
  }, [offeringId, retry]);

  if (needsSignIn) return <p>Sign in with an active lecturer account. <Link href="/account" className="underline">Sign in</Link></p>;
  if (error) return <div className="jarvis-empty-state" role="alert"><strong>Couldn&apos;t load your courses</strong><p>{error}</p><button className="jarvis-secondary-button" type="button" onClick={() => {setError(""); setRetry(n => n+1);}}>Try again</button></div>;
  if (!data) return <p role="status">Loading lecturer workspace…</p>;
  if ("course" in data) return <CoursePage offering={data.course} initialAssignments={data.assignments} />;

  return (
    <div className="jarvis-lecturer-workspace">
      <header className="jarvis-role-hero">
        <span className="jarvis-eyebrow">LECTURER WORKSPACE</span>
        <h1>Teach with clarity.</h1>
        <p>Your courses, student groups, and teaching schedule in one place.</p>
      </header>
      <div className="jarvis-stats" aria-label="Teaching summary">
        <div className="jarvis-stat"><span>Assigned courses</span><strong>{data.courses.length}</strong><small>Your teaching responsibilities</small></div>
        <div className="jarvis-stat"><span>Student groups</span><strong>{new Set(data.courses.map(item => item.group.name)).size}</strong><small>Across course offerings</small></div>
      </div>
      <section className={card}>
        <div className="jarvis-section-heading"><div><span className="jarvis-eyebrow">YOUR COURSES</span><h2 className="text-xl font-semibold">Assigned course groups</h2></div></div>
        {data.courses.length ? (
          <ul className="jarvis-course-grid">
            {data.courses.map((item) => (
              <li key={item.id}>
                <Link className="jarvis-course-card jarvis-course-link" href={"/lecturer/"+item.id}>
                  <span className="jarvis-course-symbol" aria-hidden="true">{item.course.code.slice(0,2).toUpperCase()}</span>
                  <span className="min-w-0"><strong>{item.course.name}</strong><small>{item.course.code} · {item.group.name} · {item.semester.name}</small></span>
                  <span className="jarvis-course-chevron" aria-hidden="true">↗</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p>No courses assigned yet.</p>}
      </section>
      <Timetable getToken={getAccessToken} />
    </div>
  );
}
