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
const card = "space-y-3 rounded-xl border border-[#afbeb3] bg-white p-4";

function CoursePage({ offering, initialAssignments }: { offering: Offering; initialAssignments: CourseAssignment[] }) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState({ teaching_style: "", explanation_preferences: "", assessment_style: "", course_rules: "" });
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const pending = useRef<{ id: string; details: string } | null>(null);
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Yerevan", dateStyle: "short" }).format(new Date());

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const token = await getAccessToken();
        const response = await fetch(`/api/lecturer/profile?course=${encodeURIComponent(offering.id)}`, {
          headers: { Authorization: `Bearer ${token ?? ""}` },
        });
        const result = await response.json();
        if (active && response.ok) setProfile({
          teaching_style: result.profile.teaching_style ?? "",
          explanation_preferences: result.profile.explanation_preferences ?? "",
          assessment_style: result.profile.assessment_style ?? "",
          course_rules: result.profile.course_rules ?? "",
        });
      } catch { if (active) setProfileError("Could not load the teaching profile."); }
    })();
    return () => { active = false; };
  }, [offering.id]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (profileBusy) return;
    setProfileBusy(true); setProfileError(""); setProfileMessage("");
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/lecturer/profile", {
        method: "PUT", headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, offeringId: offering.id }),
      });
      const result = await response.json();
      if (!response.ok) { setProfileError(result.error ?? "Could not save the teaching profile."); return; }
      setProfileMessage("Teaching profile saved. JARVIS will use it for enrolled students in this course.");
    } catch { setProfileError("Could not save the teaching profile. Try again."); }
    finally { setProfileBusy(false); }
  }

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
    <>
      <h1 className="text-3xl font-semibold">{offering.course.name}</h1>
      <p>{offering.course.code} · {offering.group.name} · {offering.semester.name}</p>
      <form className={card} onSubmit={saveProfile}>
        <h2 className="text-xl font-semibold">JARVIS teaching profile</h2>
        <p>Tell JARVIS how you teach this course. Students will get explanations that follow these preferences alongside course materials.</p>
        <label className="block">Teaching approach<textarea className={field} rows={3} maxLength={2000} value={profile.teaching_style} onChange={(event) => setProfile({ ...profile, teaching_style: event.target.value })} placeholder="For example: start with intuition, then define terms and derive the formula." /></label>
        <label className="block">How to explain and solve exercises<textarea className={field} rows={3} maxLength={2000} value={profile.explanation_preferences} onChange={(event) => setProfile({ ...profile, explanation_preferences: event.target.value })} placeholder="Preferred steps, notation, examples, and common mistakes to point out." /></label>
        <label className="block">Assessment expectations<textarea className={field} rows={3} maxLength={2000} value={profile.assessment_style} onChange={(event) => setProfile({ ...profile, assessment_style: event.target.value })} placeholder="Question types, expected answer format, and what earns credit." /></label>
        <label className="block">Course-specific rules<textarea className={field} rows={3} maxLength={2000} value={profile.course_rules} onChange={(event) => setProfile({ ...profile, course_rules: event.target.value })} placeholder="Verified course rules JARVIS should follow. Avoid private student information." /></label>
        <button className="rounded bg-[#1e3328] px-4 py-2 text-white disabled:opacity-50" disabled={profileBusy}>{profileBusy ? "Saving…" : "Save teaching profile"}</button>
        {profileError && <p role="alert">{profileError}</p>}{profileMessage && <p role="status">{profileMessage}</p>}
      </form>
      <form className={card} onSubmit={publish}>
        <h2 className="text-xl font-semibold">Publish an assignment</h2>
        <p>Enrolled students in {offering.group.name} can read the brief and see the deadline on their dashboard and calendar.</p>
        <fieldset className="space-y-3" disabled={busy}>
          <label className="block">Title<input className={field} name="title" maxLength={120} required /></label>
          <label className="block">Brief and submission instructions<textarea className={field} name="brief" rows={4} maxLength={4000} required /></label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label>Due date<input className={field} type="date" name="dueOn" min={today} required /></label>
            <label>Due time (Yerevan)<input className={field} type="time" name="dueAt" defaultValue="23:59" required /></label>
          </div>
          <button className="rounded bg-[#1e3328] px-4 py-2 text-white disabled:opacity-50">
            {busy ? "Publishing…" : "Publish assignment"}
          </button>
        </fieldset>
        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
      </form>
      <section className={card}>
        <h2 className="text-xl font-semibold">Published assignments</h2>
        {assignments.length ? (
          <ul className="space-y-2">
            {assignments.map((item) => (
              <li key={item.id} className="rounded bg-[#eef3ee] p-3">
                <strong className="break-words">{item.title}</strong>
                <p className="text-sm">Due {item.due_on} · {item.due_at.slice(0, 5)} Yerevan</p>
                <p className="whitespace-pre-wrap break-words">{item.brief}</p>
              </li>
            ))}
          </ul>
        ) : <p>No assignments published for this group yet.</p>}
      </section>
      <CourseResources offeringId={offering.id} canPublish />
    </>
  );
}

export function LecturerWorkspace({ offeringId }: { offeringId?: string }) {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [error, setError] = useState("");
  const [needsSignIn, setNeedsSignIn] = useState(false);

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
  }, [offeringId]);

  if (needsSignIn) return <p>Sign in with an active lecturer account. <Link href="/account" className="underline">Sign in</Link></p>;
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p role="status">Loading lecturer workspace…</p>;
  if ("course" in data) return <CoursePage offering={data.course} initialAssignments={data.assignments} />;

  return (
    <>
      <section className={card}>
        <h2 className="text-xl font-semibold">Assigned courses</h2>
        {data.courses.length ? (
          <ul className="space-y-2">
            {data.courses.map((item) => (
              <li key={item.id}>
                <Link className="font-semibold underline" href={`/lecturer/${item.id}`}>{item.course.name}</Link>
                <p className="text-sm">{item.course.code} · {item.group.name} · {item.semester.name}</p>
              </li>
            ))}
          </ul>
        ) : <p>No courses assigned yet.</p>}
      </section>
      <Timetable getToken={getAccessToken} />
    </>
  );
}
