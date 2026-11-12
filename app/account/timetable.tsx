"use client";

import { assignmentDeadlines, type AssignmentDeadline } from "@/lib/course-assignments";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PersonalEventEditor, type PersonalEvent } from "./personal-planner";
import { useEffect, useState, type FormEvent } from "react";

type Lesson = {
  id: string; lesson_date: string; starts_at: string; ends_at: string; room: string;
  offering_id: string; lecturer_id: string; course: string; student_group: string; lecturer: string;
};

type ConfirmedSession = { id: string; title: string; session_date: string; starts_at: string; ends_at: string; completed_at: string | null };

type AdminOptions = {
  offerings: { id: string; label: string }[];
  users: { id: string; display_name: string; role: string; status: string }[];
  assignments: { user_id: string; offering_id: string }[];
};

const field = "w-full rounded border border-[#789181] bg-white p-2";
const button = "rounded jarvis-primary-button px-4 py-2 text-white disabled:opacity-50";

function shiftDate(date: string, days: number) {
  const value = new Date(date + "T00:00:00Z");
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function yerevanWeek() {
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Yerevan", dateStyle: "short" }).format(new Date());
  const weekday = new Date(today + "T00:00:00Z").getUTCDay();
  return shiftDate(today, -((weekday + 6) % 7));
}

export function Timetable({ getToken, admin, personal }: {
  getToken: () => Promise<string | undefined>; admin?: AdminOptions; personal?: SupabaseClient;
}) {
  const [week, setWeek] = useState(yerevanWeek);
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [studySessions, setStudySessions] = useState<ConfirmedSession[]>([]);
  const [deadlines, setDeadlines] = useState<AssignmentDeadline[]>([]);
  const [events, setEvents] = useState<PersonalEvent[]>([]);
  const [eventId, setEventId] = useState("");
  const [selected, setSelected] = useState("");
  const [offering, setOffering] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const token = await getToken();
        const response = await fetch(`/api/timetable?week=${week}`, {
          signal: controller.signal, headers: { Authorization: `Bearer ${token ?? ""}` },
        });
        if (!response.ok) throw new Error();
        const official = await response.json();
        setLessons(official);
        if (personal) {
          const until = shiftDate(week, 7);
          const [eventsResult, sessionsResult, deadlinesResult] = await Promise.all([
            personal.from("personal_events").select("id,title,event_date,starts_at,ends_at")
              .gte("event_date", week).lt("event_date", until).abortSignal(controller.signal),
            personal.from("study_sessions").select("id,title,session_date,starts_at,ends_at,completed_at")
              .gte("session_date", week).lt("session_date", until).abortSignal(controller.signal),
            assignmentDeadlines(personal).gte("due_on", week).lt("due_on", until)
              .abortSignal(controller.signal).returns<AssignmentDeadline[]>(),
          ]);
          if (controller.signal.aborted) return;
          setEvents(eventsResult.data ?? []);
          setStudySessions(sessionsResult.data ?? []);
          setDeadlines(deadlinesResult.data ?? []);
          if (eventsResult.error || sessionsResult.error || deadlinesResult.error) setMessage("Could not load all calendar entries.");
        }
      } catch {
        if (!controller.signal.aborted) setMessage("Could not load the timetable.");
      }
    })();
    return () => controller.abort();
  }, [getToken, week, revision, personal]);

  function changeWeek(date: string) {
    setWeek(date); setLessons(null); setEvents([]); setStudySessions([]); setDeadlines([]); setEventId(""); setSelected(""); setOffering(""); setMessage("");
  }

  async function mutate(action: "save" | "remove", data: object) {
    setBusy(true);
    setMessage("");
    try {
      const token = await getToken();
      const response = await fetch("/api/timetable", {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action, data }),
      });
      if (!response.ok) { setMessage((await response.json()).error); return; }
      if (action === "remove") { setSelected(""); setOffering(""); }
      setRevision((value) => value + 1);
      setMessage(action === "save" ? "Lesson saved." : "Lesson removed.");
    } catch {
      setMessage("Could not save the change.");
    } finally {
      setBusy(false);
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void mutate("save", Object.fromEntries(new FormData(event.currentTarget)));
  }

  const entries = [
    ...(lessons ?? []).map((item) => ({ source: "official" as const, date: item.lesson_date, time: item.starts_at, item })),
    ...studySessions.map((item) => ({ source: "study" as const, date: item.session_date, time: item.starts_at, item })),
    ...events.map((item) => ({ source: "personal" as const, date: item.event_date, time: item.starts_at, item })),
    ...deadlines.map((item) => ({ source: "assignment" as const, date: item.due_on, time: item.due_at, item })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const visibleDays = [...new Set(entries.map((entry) => entry.date))];
  const lesson = lessons?.find((item) => item.id === selected);
  const lecturers = admin?.users.filter((user) => user.role === "lecturer" && user.status === "active"
    && admin.assignments.some((item) => item.user_id === user.id && item.offering_id === offering));

  return (
    <section className="jarvis-panel space-y-4" aria-label="Weekly timetable">
      <div className="jarvis-section-heading">
        <div><span className="jarvis-eyebrow">ACADEMIC CALENDAR</span>
          <h2 className="text-2xl font-semibold">{admin ? "Edit timetable" : personal ? "My weekly calendar" : "My timetable"}</h2>
          <p>All event times shown in Asia/Yerevan.</p>
        </div>
        <span className="jarvis-counter">{entries.length} {entries.length === 1 ? "event" : "events"}</span>
      </div>
      <nav aria-label="Timetable week" className="jarvis-calendar-nav">
        <button type="button" disabled={busy} className="jarvis-secondary-button" onClick={() => changeWeek(shiftDate(week, -7))}>← Previous</button>
        <span className="jarvis-calendar-range">{week} – {shiftDate(week, 6)}</span>
        <button type="button" disabled={busy} className="jarvis-secondary-button" onClick={() => changeWeek(yerevanWeek())}>This week</button>
        <button type="button" disabled={busy} className="jarvis-secondary-button" onClick={() => changeWeek(shiftDate(week, 7))}>Next →</button>
      </nav>
      {!lessons && !message && <p role="status">Loading calendar entries…</p>}
      {lessons && entries.length === 0 && <div className="jarvis-empty-state"><strong>No events this week</strong><p>Change weeks to explore the timetable, or add a personal event where available.</p></div>}
      <div className="jarvis-calendar-days">
        {visibleDays.map((day) => (
          <div className="jarvis-calendar-day" key={day}>
            <h3>{new Intl.DateTimeFormat("en-GB", {weekday:"long",day:"numeric",month:"long",timeZone:"UTC"}).format(new Date(day+"T00:00:00Z"))}</h3>
            <ul className="jarvis-calendar-entries">
              {entries.filter((entry) => entry.date === day).map((entry) => entry.source === "assignment" ? (
          <li key={entry.source + entry.item.id} className="jarvis-calendar-entry" data-kind="assignment">
            <p className="jarvis-calendar-kind">Assignment deadline</p>
            <details>
              <summary className="cursor-pointer break-words font-semibold">{entry.item.title}</summary>
              <p className="whitespace-pre-wrap break-words">{entry.item.brief}</p>
            </details>
            <p>{entry.date} · Due {entry.time.slice(0, 5)}</p>
            <p className="text-sm">{entry.item.offering.course.name}</p>
          </li>
        ) : (
          <li key={entry.source + entry.item.id} className="jarvis-calendar-entry" data-kind={entry.source}>
            <p className="jarvis-calendar-kind">{entry.source === "official" ? "Official class" : entry.source === "study" ? "Study session" : "Personal event"}</p>
            <strong className="break-words">{entry.source === "official" ? entry.item.course : entry.item.title}</strong>
            <p>{entry.date} · {entry.item.starts_at.slice(0, 5)}–{entry.item.ends_at.slice(0, 5)}</p>
            {entry.source === "study" && entry.item.completed_at && <p className="text-sm font-semibold">Completed</p>}
            {entry.source === "official" ? (
              <>
                <p className="text-sm">{entry.item.room} · {entry.item.student_group} · {entry.item.lecturer}</p>
                {admin && <button type="button" disabled={busy} className="underline" onClick={() => {
                  setSelected(entry.item.id); setOffering(entry.item.offering_id); setMessage("");
                }}>Edit lesson</button>}
              </>
            ) : entry.source === "personal" && <button type="button" className="underline" onClick={() => setEventId(entry.item.id)}>Edit event</button>}
          </li>
        ))}
            </ul>
          </div>
        ))}
      </div>
      {personal && (
        <PersonalEventEditor key={week + eventId + revision} client={personal}
          event={events.find((event) => event.id === eventId)} from={week} to={shiftDate(week, 6)}
          onCancel={() => setEventId("")} onSaved={() => {
            setEventId(""); setRevision((value) => value + 1); setMessage("Personal calendar updated.");
          }} />
      )}
      {admin && (
        <form key={selected + week + revision} onSubmit={save} className="jarvis-calendar-form space-y-3">
          <fieldset disabled={busy} className="space-y-3">
            <h3 className="font-semibold">{lesson ? "Edit selected lesson" : "Add lesson"}</h3>
            <input type="hidden" name="id" value={selected} />
            <label className="block">Course offering
              <select className={field} name="offeringId" value={offering} required onChange={(event) => setOffering(event.target.value)}>
                <option value="" disabled>Choose an offering</option>
                {admin.offerings.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label className="block">Lecturer
              <select key={offering} className={field} name="lecturerId" defaultValue={lesson?.offering_id === offering ? lesson.lecturer_id : ""} required>
                <option value="" disabled>Choose an assigned lecturer</option>
                {lecturers?.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}
              </select>
            </label>
            {offering && !lecturers?.length && <p>Assign an active lecturer to this offering first.</p>}
            <label className="block">Date<input className={field} name="date" type="date" min={week} max={shiftDate(week, 6)} defaultValue={lesson?.lesson_date ?? week} required /></label>
            <label className="block">Starts<input className={field} name="start" type="time" defaultValue={lesson?.starts_at.slice(0, 5)} required /></label>
            <label className="block">Ends<input className={field} name="end" type="time" defaultValue={lesson?.ends_at.slice(0, 5)} required /></label>
            <label className="block">Room<input className={field} name="room" maxLength={80} defaultValue={lesson?.room} required /></label>
            <div className="flex flex-wrap gap-3">
              <button className={button} disabled={!lecturers?.length}>Save lesson</button>
              {lesson && <>
                <button type="button" className="underline" onClick={() => { setSelected(""); setOffering(""); }}>Cancel edit</button>
                <button type="button" className="underline" onClick={() => {
                  if (window.confirm("Remove this lesson from the timetable?")) void mutate("remove", { id: lesson.id });
                }}>Remove lesson</button>
              </>}
            </div>
          </fieldset>
        </form>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
