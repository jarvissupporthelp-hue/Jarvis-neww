"use client";

import type { AssignmentDeadline } from "@/lib/course-assignments";
import Link from "next/link";
import { useEffect, useState } from "react";

type Lesson = {
  id: string; course: string; lesson_date: string; starts_at: string; ends_at: string; room: string;
};
type Dashboard = {
  name: string;
  date: string;
  today: Lesson[];
  next: Lesson | null;
  courses: { id: string; code: string; name: string; semester: string }[];
  assignmentDeadlines?: AssignmentDeadline[] | null;
  studyProgress?: { id: string; course_name: string; exam_date: string; scheduled: number; completed: number }[];
};

function dateLabel(date: string, weekday = true) {
  return new Intl.DateTimeFormat("en-GB", {
    ...(weekday ? { weekday: "long" as const } : {}),
    day: "numeric", month: "long", timeZone: "UTC",
  }).format(new Date(date + "T00:00:00Z"));
}

export function StudentDashboard({ getToken }: { getToken: () => Promise<string | undefined> }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const token = await getToken();
        const response = await fetch("/api/dashboard", {
          signal: controller.signal,
          headers: { Authorization: "Bearer " + (token ?? "") },
        });
        if (!response.ok) throw new Error();
        const result = await response.json();
        if (!controller.signal.aborted) { setData(result); setError(""); }
      } catch {
        if (!controller.signal.aborted) setError("We could not load your dashboard. Check your connection and retry.");
      }
    })();
    return () => controller.abort();
  }, [getToken, retry]);

  if (!data) return <section className="ui-empty-block" role={error ? "alert" : "status"}>
    <strong>{error ? "Dashboard unavailable" : "Getting your dashboard ready…"}</strong>
    <p>{error || "Loading classes, deadlines, and courses."}</p>
    {error && <button type="button" className="ui-action-secondary" onClick={() => { setError(""); setRetry((n) => n + 1); }}>Try again</button>}
  </section>;

  const plans = data.studyProgress ?? [];
  const totalSessions = plans.reduce((n, p) => n + p.scheduled, 0);
  const doneSessions = plans.reduce((n, p) => n + p.completed, 0);
  const deadlines = data.assignmentDeadlines;
  const firstName = data.name.trim().split(/\s+/)[0] || "student";
  const firstClass = data.today[0];

  return <section className="ui-overview" aria-labelledby="student-dashboard-heading">
    <header className="ui-overview-header">
      <div>
        <span className="ui-kicker">YOUR WORKSPACE <span className="ui-kicker-dot">·</span> {dateLabel(data.date)}</span>
        <h2 id="student-dashboard-heading">Good to see you, {firstName}<span className="ui-title-dot">.</span></h2>
        <p>Here is what is happening across your studies.</p>
      </div>
      <nav aria-label="Quick actions" className="ui-overview-actions">
        <a href="#student-tasks" className="ui-action-secondary">My tasks</a>
        <a href="#student-timetable" className="ui-action-primary">Open calendar <span aria-hidden="true">↗</span></a>
      </nav>
    </header>

    <div className="ui-overview-metrics" aria-label="Academic snapshot">
      <div><span>Classes today</span><strong>{data.today.length.toString().padStart(2, "0")}</strong><small>Your schedule</small></div>
      <div><span>Current courses</span><strong>{data.courses.length.toString().padStart(2, "0")}</strong><small>Enrolled subjects</small></div>
      <div><span>Deadlines</span><strong>{deadlines === null ? "—" : (deadlines?.length ?? 0).toString().padStart(2, "0")}</strong><small>Upcoming work</small></div>
      <div><span>Study sessions</span><strong>{doneSessions}<em> / {totalSessions}</em></strong><small>Completed</small></div>
    </div>

    <div className="ui-overview-primary">
      <section className="ui-focus-card" aria-labelledby="ui-today-title">
        <div className="ui-focus-card-header">
          <div><span className="ui-kicker">DAILY AGENDA</span><h3 id="ui-today-title">Today&apos;s schedule</h3></div>
          <span className="ui-soft-pill">{data.today.length} {data.today.length === 1 ? "class" : "classes"}</span>
        </div>
        {data.today.length ? <ol className="ui-timeline">
          {data.today.map((lesson) => <li key={lesson.id}>
            <time>{lesson.starts_at.slice(0, 5)}</time>
            <div className="ui-timeline-marker" aria-hidden="true" />
            <div className="ui-timeline-content">
              <strong>{lesson.course}</strong>
              <span>{lesson.starts_at.slice(0,5)} – {lesson.ends_at.slice(0,5)}</span>
              <small>{lesson.room || "Room not assigned"}</small>
            </div>
          </li>)}
        </ol> : <div className="ui-empty-block">
          <span className="ui-empty-symbol" aria-hidden="true">☀</span>
          <strong>A clear day ahead</strong>
          <p>No university classes scheduled today.</p>
        </div>}
        <a href="#student-timetable" className="ui-panel-footer-link">Explore weekly calendar <span aria-hidden="true">→</span></a>
      </section>

      <aside className="ui-next-panel" aria-labelledby="ui-next-title">
        <span className="ui-kicker">UP NEXT</span>
        <h3 id="ui-next-title">Your next class</h3>
        {data.next ? <div className="ui-next-content">
          <span className="ui-next-date">{dateLabel(data.next.lesson_date, false)}</span>
          <strong>{data.next.course}</strong>
          <span>{data.next.starts_at.slice(0, 5)} – {data.next.ends_at.slice(0, 5)}</span>
          <span>{data.next.room || "Room not assigned"}</span>
        </div> : <div className="ui-next-content">
          <strong>Nothing scheduled yet</strong>
          <span>Your upcoming classes will appear here.</span>
        </div>}
        {firstClass && <div className="ui-next-note"><span aria-hidden="true">✦</span><span>{data.today.length === 1 ? "One class on your schedule today." : "Your full schedule is ready in the calendar."}</span></div>}
        <Link href="/focus" className="ui-action-secondary">Start a focus session <span aria-hidden="true">↗</span></Link>
      </aside>
    </div>

    <div className="ui-overview-secondary">
      <section className="ui-overview-panel" aria-labelledby="ui-deadlines-title">
        <div className="ui-overview-panel-head"><div><span className="ui-kicker">COURSEWORK</span><h3 id="ui-deadlines-title">Upcoming deadlines</h3></div>
          <span className="ui-soft-pill">{deadlines === null ? "Unavailable" : (deadlines?.length ?? 0) + " items"}</span></div>
        {deadlines === null ? <div className="ui-empty-block"><strong>Deadlines unavailable</strong><p>Try the calendar again later.</p></div>
        : deadlines?.length ? <ul className="ui-overview-deadlines">{deadlines.map((item) => (
          <li key={item.id}>
            <div className="ui-date-chip">
              <strong>{item.due_on.slice(8,10)}</strong>
              <span>{new Intl.DateTimeFormat("en-GB", {month:"short",timeZone:"UTC"}).format(new Date(item.due_on+"T00:00:00Z"))}</span>
            </div>
            <div className="ui-deadline-copy">
              <details><summary>{item.title}</summary><p>{item.brief}</p></details>
              <span>{item.offering.course.name} · {item.due_at.slice(0,5)}</span>
            </div>
          </li>
        ))}</ul> : <div className="ui-empty-block"><strong>All caught up</strong><p>No published deadlines coming up.</p></div>}
      </section>

      <section className="ui-overview-panel" aria-labelledby="ui-progress-title">
        <div className="ui-overview-panel-head"><div><span className="ui-kicker">YOUR PROGRESS</span><h3 id="ui-progress-title">Study plans</h3></div>
          <Link href="/study-plans">Open plans ↗</Link></div>
        {plans.length ? <ul className="ui-overview-plans">{plans.map((plan) => {
          const percentage = plan.scheduled ? Math.min(100, Math.max(0, Math.round(plan.completed / plan.scheduled * 100))) : 0;
          return <li key={plan.id}>
            <div><strong>{plan.course_name}</strong><span>{plan.completed} of {plan.scheduled} sessions</span></div>
            <div className="ui-progress-meter" role="progressbar" aria-label={plan.course_name + " completed"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
              <span style={{width: percentage + "%"}} />
            </div>
            <small>Exam {dateLabel(plan.exam_date, false)}</small>
          </li>;
        })}</ul> : <div className="ui-empty-block"><strong>No plans yet</strong><p>Plan your revision and track your study sessions.</p><Link href="/study-plans" className="ui-action-secondary">Create study plan</Link></div>}
      </section>
    </div>

    <section id="student-courses" className="ui-overview-panel" aria-labelledby="ui-courses-title">
      <div className="ui-overview-panel-head"><div><span className="ui-kicker">MY UNIVERSITY</span><h3 id="ui-courses-title">Courses</h3></div>
        <Link href="/resources">Open library ↗</Link></div>
      {data.courses.length ? <ul className="ui-course-tiles">
        {data.courses.map((course) => <li key={course.id}>
          <span className="ui-course-avatar" aria-hidden="true">{course.code.slice(0,2).toUpperCase()}</span>
          <span><strong>{course.name}</strong><small>{course.code} · {course.semester}</small></span>
        </li>)}
      </ul> : <div className="ui-empty-block"><strong>No courses enrolled</strong><p>Contact your university administrator about course access.</p></div>}
    </section>
  </section>;
}
