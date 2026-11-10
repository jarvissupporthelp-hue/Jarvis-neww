"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { PersonalEventEditor, type PersonalEvent } from "./personal-planner";
import { useEffect, useState, type FormEvent } from "react";

type Lesson = {
  id: string; lesson_date: string; starts_at: string; ends_at: string; room: string;
  offering_id: string; lecturer_id: string; course: string; student_group: string; lecturer: string;
};

type AdminOptions = {
  offerings: { id: string; label: string }[];
  users: { id: string; display_name: string; role: string; status: string }[];
  assignments: { user_id: string; offering_id: string }[];
};

const field = "w-full rounded border border-[#789181] bg-white p-2";
const button = "rounded bg-[#1e3328] px-4 py-2 text-white disabled:opacity-50";

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
          const result = await personal.from("personal_events")
            .select("id,title,event_date,starts_at,ends_at")
            .gte("event_date", week).lt("event_date", shiftDate(week, 7))
            .abortSignal(controller.signal);
          if (controller.signal.aborted) return;
          if (result.error) {
            setEvents([]);
            setMessage("Could not load personal events.");
          } else {
            setEvents(result.data);
          }
        }
      } catch {
        if (!controller.signal.aborted) setMessage("Could not load the timetable.");
      }
    })();
    return () => controller.abort();
  }, [getToken, week, revision, personal]);

  function changeWeek(date: string) {
    setWeek(date); setLessons(null); setEvents([]); setEventId(""); setSelected(""); setOffering(""); setMessage("");
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
    ...(lessons ?? []).map((item) => ({ source: "official" as const, date: item.lesson_date, item })),
    ...events.map((item) => ({ source: "personal" as const, date: item.event_date, item })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.item.starts_at.localeCompare(b.item.starts_at));
  const lesson = lessons?.find((item) => item.id === selected);
  const lecturers = admin?.users.filter((user) => user.role === "lecturer" && user.status === "active"
    && admin.assignments.some((item) => item.user_id === user.id && item.offering_id === offering));

  return (
    <section className="space-y-4 rounded border border-[#789181] p-4">
      <h2 className="text-2xl font-semibold">{admin ? "Edit timetable" : personal ? "My weekly calendar" : "My timetable"}</h2>
      <p className="text-sm">All times are in Asia/Yerevan.</p>
      <nav aria-label="Timetable week" className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" disabled={busy} className="underline" onClick={() => changeWeek(shiftDate(week, -7))}>Previous</button>
        <span>{week} to {shiftDate(week, 6)}</span>
        <button type="button" disabled={busy} className="underline" onClick={() => changeWeek(shiftDate(week, 7))}>Next</button>
      </nav>
      {!lessons && !message && <p>Loading lessons…</p>}
      {lessons && entries.length === 0 && <p>No calendar entries this week.</p>}
      <ul className="space-y-2">
        {entries.map((entry) => (
          <li key={entry.source + entry.item.id} className="rounded bg-white p-3">
            <p className="text-xs font-semibold uppercase">{entry.source === "official" ? "Official class" : "Personal event"}</p>
            <strong className="break-words">{entry.source === "official" ? entry.item.course : entry.item.title}</strong>
            <p>{entry.date} · {entry.item.starts_at.slice(0, 5)}–{entry.item.ends_at.slice(0, 5)}</p>
            {entry.source === "official" ? (
              <>
                <p className="text-sm">{entry.item.room} · {entry.item.student_group} · {entry.item.lecturer}</p>
                {admin && <button type="button" disabled={busy} className="underline" onClick={() => {
                  setSelected(entry.item.id); setOffering(entry.item.offering_id); setMessage("");
                }}>Edit lesson</button>}
              </>
            ) : <button type="button" className="underline" onClick={() => setEventId(entry.item.id)}>Edit event</button>}
          </li>
        ))}
      </ul>
      {personal && (
        <PersonalEventEditor key={week + eventId + revision} client={personal}
          event={events.find((event) => event.id === eventId)} from={week} to={shiftDate(week, 6)}
          onCancel={() => setEventId("")} onSaved={() => {
            setEventId(""); setRevision((value) => value + 1); setMessage("Personal calendar updated.");
          }} />
      )}
      {admin && (
        <form key={selected + week + revision} onSubmit={save} className="space-y-3">
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
