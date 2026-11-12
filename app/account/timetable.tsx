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
  const [activeDay, setActiveDay] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "official" | "study" | "personal" | "assignment">("all");
  const [eventEditorOpen, setEventEditorOpen] = useState(false);
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
    setWeek(date); setActiveDay("all"); setLessons(null); setEvents([]); setStudySessions([]); setDeadlines([]); setEventId(""); setEventEditorOpen(false); setSelected(""); setOffering(""); setMessage("");
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
  const today = new Intl.DateTimeFormat("sv-SE", {timeZone:"Asia/Yerevan",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const weekDays = Array.from({length:7}, (_, index) => shiftDate(week, index));
  const typedEntries = entries.filter((entry) => typeFilter === "all" || entry.source === typeFilter);
  const visibleEntries = typedEntries.filter((entry) => activeDay === "all" || entry.date === activeDay);
  const visibleDays = weekDays.filter((day) => (activeDay === "all" ? visibleEntries.some((entry) => entry.date === day) : day === activeDay));
  const lesson = lessons?.find((item) => item.id === selected);
  const lecturers = admin?.users.filter((user) => user.role === "lecturer" && user.status === "active"
    && admin.assignments.some((item) => item.user_id === user.id && item.offering_id === offering));

  return (
    <section className="ui-calendar" aria-label="Weekly calendar" id={admin ? "admin-timetable-workspace" : undefined}>
      <header className="ui-calendar-header">
        <div><span className="ui-kicker">YOUR ACADEMIC WEEK</span>
          <h2>{admin ? "Timetable management" : personal ? "My calendar" : "Teaching timetable"}</h2>
          <p>Classes, deadlines and personal events · All times in Yerevan (GMT+4)</p>
        </div>
        {personal && <button type="button" className="ui-action-primary" onClick={() => { setEventId(""); setEventEditorOpen(true); }}>
          <span aria-hidden="true">＋</span> Add event
        </button>}
      </header>

      <div className="ui-calendar-toolbar">
        <div className="ui-calendar-week-controls">
          <button type="button" className="ui-week-arrow" aria-label="Previous week" disabled={busy} onClick={() => changeWeek(shiftDate(week, -7))}>←</button>
          <div><strong>{new Intl.DateTimeFormat("en-GB",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(week+"T00:00:00Z"))}</strong>
            <span>{week} – {shiftDate(week,6)}</span></div>
          <button type="button" className="ui-week-arrow" aria-label="Next week" disabled={busy} onClick={() => changeWeek(shiftDate(week, 7))}>→</button>
        </div>
        <div className="ui-calendar-toolbar-actions">
          <button type="button" className="ui-action-secondary" disabled={busy} onClick={() => changeWeek(yerevanWeek())}>Today</button>
          <label className="ui-calendar-filter">Show <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}>
            <option value="all">All events</option><option value="official">Classes</option>
            {personal && <option value="assignment">Deadlines</option>}
            {personal && <option value="study">Study sessions</option>}
            {personal && <option value="personal">Personal events</option>}
          </select></label>
        </div>
      </div>

      <div className="ui-week-strip" role="group" aria-label="Select a day">
        {weekDays.map((day) => {
          const count = typedEntries.filter((entry) => entry.date === day).length;
          const parsed = new Date(day+"T00:00:00Z");
          return <button key={day} type="button" className={"ui-day-tile"+(day===today?" is-today":"")} aria-pressed={activeDay === day}
            onClick={() => setActiveDay(day)}>
            <span>{new Intl.DateTimeFormat("en-GB",{weekday:"short",timeZone:"UTC"}).format(parsed)}</span>
            <strong>{parsed.getUTCDate()}</strong>
            <small>{count ? count+" event"+(count===1?"":"s") : "Free"}</small>
          </button>;
        })}
      </div>

      <div className="ui-calendar-content">
        <div className="ui-calendar-agenda-heading">
          <div><span className="ui-kicker">SCHEDULE</span><h3>{activeDay==="all" ? "Your week at a glance" : new Intl.DateTimeFormat("en-GB",{weekday:"long",day:"numeric",month:"long",timeZone:"UTC"}).format(new Date(activeDay+"T00:00:00Z"))}</h3></div>
          <button type="button" className="ui-calendar-showall" aria-pressed={activeDay==="all"} onClick={() => setActiveDay("all")}>Entire week <span aria-hidden="true">↗</span></button>
        </div>

        {lessons === null && !message && <div className="ui-calendar-empty" role="status">Loading calendar events…</div>}
        {lessons !== null && visibleEntries.length === 0 && <div className="ui-calendar-empty">
          <span className="ui-empty-symbol" aria-hidden="true">☼</span>
          <strong>No events here</strong><p>Choose another day or event type to explore your schedule.</p>
        </div>}

        {lessons !== null && visibleDays.map((day) => (
          <section className="ui-agenda-day" key={day} aria-label={day}>
            {activeDay === "all" && <h4>{new Intl.DateTimeFormat("en-GB",{weekday:"long",day:"numeric",month:"long",timeZone:"UTC"}).format(new Date(day+"T00:00:00Z"))}</h4>}
            <ul className="ui-agenda-list">
              {visibleEntries.filter((entry) => entry.date === day).map((entry) => (
                <li key={entry.source + entry.item.id} className="ui-agenda-entry" data-kind={entry.source}>
                  <div className="ui-agenda-time">
                    <strong>{entry.time.slice(0,5)}</strong>
                    <span>{entry.source === "assignment" ? "Due" : "Start"}</span>
                  </div>
                  <div className="ui-agenda-entry-main">
                    <span className="ui-agenda-kind">{entry.source === "official" ? "University class" : entry.source === "assignment" ? "Deadline" : entry.source === "study" ? "Study session" : "Personal event"}</span>
                    {entry.source === "assignment" ? <>
                      <details><summary>{entry.item.title}</summary><p className="ui-agenda-description">{entry.item.brief}</p></details>
                      <p>{entry.item.offering.course.name}</p>
                    </> : <>
                      <strong>{entry.source === "official" ? entry.item.course : entry.item.title}</strong>
                      <p>{entry.item.starts_at.slice(0,5)} – {entry.item.ends_at.slice(0,5)}
                        {entry.source === "official" && entry.item.room ? " · "+entry.item.room : ""}
                      </p>
                      {entry.source === "official" && <p>{entry.item.student_group} · {entry.item.lecturer}</p>}
                      {entry.source === "study" && entry.item.completed_at && <span className="ui-agenda-completed">Completed</span>}
                      {admin && entry.source === "official" && <button type="button" className="ui-text-action" disabled={busy}
                        onClick={() => {setSelected(entry.item.id);setOffering(entry.item.offering_id);setMessage("");}}>Edit lesson</button>}
                      {personal && entry.source === "personal" && <button type="button" className="ui-text-action"
                        onClick={() => {setEventId(entry.item.id);setEventEditorOpen(true);}}>Edit event</button>}
                    </>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {personal && eventEditorOpen && <div className="ui-calendar-editor">
        <div className="ui-calendar-editor-header"><h3>{eventId ? "Edit personal event" : "New personal event"}</h3>
          <button className="ui-icon-close" type="button" aria-label="Close event editor" onClick={() => {setEventId("");setEventEditorOpen(false);}}>×</button></div>
        <PersonalEventEditor key={week + eventId + revision} client={personal} from={week} to={shiftDate(week,6)}
          initialDate={activeDay==="all" ? week : activeDay}
          event={events.find((event) => event.id===eventId)}
          onCancel={() => {setEventId("");setEventEditorOpen(false);}}
          onSaved={() => {setEventId("");setEventEditorOpen(false);setRevision((n)=>n+1);setMessage("Personal calendar updated.");}} />
      </div>}
      {admin && (
        <form id="jarvis-lesson-editor" key={selected + week + revision} onSubmit={save} className="ui-calendar-editor jarvis-calendar-form space-y-3">
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
      {message && <p role="status" className="ui-feedback">{message}</p>}
    </section>
  );
}
