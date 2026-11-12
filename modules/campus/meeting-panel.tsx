"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { getAccessToken } from "@/lib/browser-supabase";

type Person = { id: string; name: string; role: string };
type Meeting = { id: string; studentId: string; lecturerId: string; topic: string; agenda: string; startAt: string; status: string; response: string };
type Data = { people: Person[]; meetings: Meeting[]; viewer: string; role: "student" | "lecturer" };
const field = "block w-full rounded-lg border border-slate-300 p-2";
const button = "rounded-lg bg-[#1e3328] px-4 py-2 font-medium text-white disabled:opacity-50";
const displayTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Yerevan", dateStyle: "medium", timeStyle: "short" });

async function load(payload?: Record<string, unknown>) {
  const token = await getAccessToken().catch(() => undefined);
  if (!token) throw new Error("Sign in to request a meeting.");
  const response = await fetch("/api/campus/meetings", {
    method: payload ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}

export function MeetingPanel() {
  const [data, setData] = useState<Data>();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => {
    let alive = true;
    load().then((result) => { if (alive) setData(result); }, (error: Error) => { if (alive) setMessage(error.message); });
    return () => { alive = false; };
  }, []);
  async function save(payload: Record<string, unknown>) {
    setPending(true);
    setMessage("");
    try {
      await load(payload);
      setData(await load());
      setMessage(payload.action === "request" ? "Meeting request sent." : "Meeting updated.");
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the meeting.");
      return false;
    } finally {
      setPending(false);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const startAt = new Date(`${values.get("start")}:00+04:00`).toISOString();
    void save({ action: "request", lecturerId: values.get("lecturerId"), topic: values.get("topic"),
      agenda: values.get("agenda"), startAt, participants: values.getAll("participants") })
      .then((saved) => { if (saved) form.reset(); });
  }
  const lecturers = data?.people.filter(({ role }) => role === "lecturer") ?? [];
  const students = data?.people.filter(({ role, id }) => role === "student" && id !== data.viewer) ?? [];
  const name = (id: string, fallback: string) => data?.people.find((person) => person.id === id)?.name ?? fallback;
  return <section className="space-y-5">
    <div><h2 className="text-xl font-semibold">Academic meetings</h2><p className="text-slate-600">Request 30 minutes with a lecturer to ask a question, discuss coursework, or get project feedback.</p></div>
    {message && <p role="status" className="rounded-lg bg-slate-100 p-3">{message} {message.startsWith("Sign in") && <Link href="/account" className="underline">Open account</Link>}</p>}
    {!data && !message && <p>Loading meeting requests…</p>}
    {data?.role === "student" && <form className="grid gap-4 rounded-xl border bg-white p-5 sm:grid-cols-2" onSubmit={submit}>
      <label>Lecturer <select required name="lecturerId" className={field}><option value="">Choose a lecturer</option>{lecturers.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
      <label>Preferred time (Yerevan) <input required name="start" type="datetime-local" className={field} /></label>
      <label className="sm:col-span-2">Topic <input required maxLength={100} name="topic" className={field} placeholder="e.g. Questions about the Networks assignment" /></label>
      <label className="sm:col-span-2">Question or agenda <textarea required maxLength={1000} name="agenda" className={field} rows={3} /></label>
      {students.length > 0 && <fieldset className="space-y-2 sm:col-span-2"><legend>Invite classmates (optional)</legend>
        {students.map((person) => <label key={person.id} className="mr-4 inline-flex items-center gap-2"><input type="checkbox" name="participants" value={person.id} />{person.name}</label>)}
      </fieldset>}
      <button className={`${button} w-fit`} disabled={pending || !lecturers.length}>Request meeting</button>
      {!lecturers.length && <p>No active lecturers are available in the directory.</p>}
    </form>}
    {data && <div className="space-y-3"><h3 className="font-semibold">{data.role === "lecturer" ? "Incoming requests" : "My meetings"}</h3>
      {!data.meetings.length && <p>No meetings yet.</p>}
      {data.meetings.map((meeting) => <article key={meeting.id} className="space-y-2 rounded-xl border bg-white p-4">
        <h4 className="font-semibold">{meeting.topic} <span className="rounded bg-slate-100 px-2 py-1 text-sm capitalize">{meeting.status}</span></h4>
        <p className="text-sm">{displayTime.format(new Date(meeting.startAt))} · {data.role === "lecturer" ? name(meeting.studentId, "Student") : name(meeting.lecturerId, "Lecturer")}</p>
        <p className="whitespace-pre-wrap break-words">{meeting.agenda}</p>
        {meeting.response && <p className="whitespace-pre-wrap break-words text-sm">Lecturer reply: {meeting.response}</p>}
        {data.role === "lecturer" && meeting.status === "pending" && <form className="space-y-2" onSubmit={(event) => {
          event.preventDefault();
          const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          void save({ action: submitter?.value, id: meeting.id, response: new FormData(event.currentTarget).get("response") });
        }}>
          <label>Reply or meeting location <textarea name="response" className={field} maxLength={1000} /></label>
          <div className="flex gap-2"><button className={button} value="accept" disabled={pending}>Accept</button>
            <button className="rounded-lg border px-4 py-2" value="decline" disabled={pending}>Decline</button></div>
        </form>}
        {meeting.studentId === data.viewer && ["pending", "accepted"].includes(meeting.status) && <button className="rounded-lg border px-4 py-2" disabled={pending} onClick={() => void save({ action: "cancel", id: meeting.id })}>Cancel request</button>}
      </article>)}
    </div>}
  </section>;
}
