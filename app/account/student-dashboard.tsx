"use client";
import type { AssignmentDeadline } from "@/lib/course-assignments";
import Link from "next/link";
import { useEffect, useState } from "react";

type Lesson = { id:string; course:string; lesson_date:string; starts_at:string; ends_at:string; room:string };
type Dashboard = {
  name:string; date:string; today:Lesson[]; next:Lesson|null;
  courses:{id:string;code:string;name:string;semester:string}[];
  assignmentDeadlines?:AssignmentDeadline[]|null;
  studyProgress?:{id:string;course_name:string;exam_date:string;scheduled:number;completed:number}[];
};
function dateLabel(date:string) {
  return new Intl.DateTimeFormat("en-GB",{weekday:"long",day:"numeric",month:"long",timeZone:"UTC"}).format(new Date(date+"T00:00:00Z"));
}
function LessonInfo({lesson}:{lesson:Lesson}) {
  return <div className="jarvis-event-line"><strong>{lesson.course}</strong><p>{lesson.starts_at.slice(0,5)}–{lesson.ends_at.slice(0,5)} · {lesson.room||"Room not specified"}</p></div>;
}
export function StudentDashboard({getToken}:{getToken:()=>Promise<string|undefined>}) {
  const [data,setData]=useState<Dashboard|null>(null);
  const [error,setError]=useState("");
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    void (async()=>{
      try {
        const token=await getToken();
        const response=await fetch("/api/dashboard",{signal:controller.signal,headers:{Authorization:"Bearer "+(token??"")}});
        if(!response.ok) throw new Error();
        const result=await response.json();
        if(!controller.signal.aborted) {setData(result);setError("");}
      } catch {if(!controller.signal.aborted) setError("Unable to load your overview. Check your connection and try again.");}
    })();
    return ()=>controller.abort();
  },[getToken,retry]);
  if(!data) return <section className="jarvis-empty-state" role={error?"alert":"status"}>
    <strong>{error?"Dashboard unavailable":"Preparing your dashboard…"}</strong>
    <p>{error||"Loading your classes, courses, and deadlines."}</p>
    {error&&<button className="jarvis-secondary-button" type="button" onClick={()=>{setError("");setRetry(n=>n+1);}}>Retry</button>}
  </section>;
  const plans=data.studyProgress??[];
  const done=plans.reduce((n,p)=>n+p.completed,0);
  const scheduled=plans.reduce((n,p)=>n+p.scheduled,0);
  const deadlines=data.assignmentDeadlines;
  return <section className="jarvis-student-workspace" aria-labelledby="student-dashboard-heading">
    <header className="jarvis-student-hero">
      <div><span className="jarvis-eyebrow">STUDENT WORKSPACE · {dateLabel(data.date)}</span>
        <h2 id="student-dashboard-heading">Welcome back, {data.name}.</h2>
        <p>Your week, your courses, your progress. All in one place.</p>
      </div>
      <Link href="/study-plans" className="jarvis-hero-action">View study plans <span aria-hidden="true">↗</span></Link>
    </header>
    <div className="jarvis-stats" aria-label="Academic summary">
      <div className="jarvis-stat"><span>Classes today</span><strong>{data.today.length}</strong><small>Scheduled lessons</small></div>
      <div className="jarvis-stat"><span>My courses</span><strong>{data.courses.length}</strong><small>Current enrollments</small></div>
      <div className="jarvis-stat"><span>Upcoming deadlines</span><strong>{deadlines===null?"—":deadlines?.length??0}</strong><small>{deadlines===null?"Temporarily unavailable":"Known assignments"}</small></div>
      <div className="jarvis-stat"><span>Study sessions done</span><strong>{done}<em> / {scheduled}</em></strong><small>Across saved plans</small></div>
    </div>
    <nav className="jarvis-quick-links" aria-label="Student shortcuts">
      <a href="#student-timetable">Calendar ↗</a>
      <a href="#student-tasks">My tasks ↗</a>
      <Link href="/resources">Course resources ↗</Link>
      <Link href="/focus">Focus timer ↗</Link>
    </nav>
    <div className="jarvis-dashboard-grid">
      <section className="jarvis-panel">
        <div className="jarvis-panel-heading"><div><span className="jarvis-eyebrow">CLASS SCHEDULE</span><h3>Today&apos;s classes</h3></div><a href="#student-timetable">Full calendar →</a></div>
        {data.today.length?<ol className="jarvis-event-list">{data.today.map(lesson=><li key={lesson.id}><span className="jarvis-event-time">{lesson.starts_at.slice(0,5)}</span><LessonInfo lesson={lesson}/></li>)}</ol>
          :<div className="jarvis-empty-state"><strong>No classes today</strong><p>Your day is free of scheduled university classes.</p></div>}
      </section>
      <section className="jarvis-panel">
        <div className="jarvis-panel-heading"><div><span className="jarvis-eyebrow">LOOKING AHEAD</span><h3>Next on your timetable</h3></div></div>
        {data.next?<div className="jarvis-next-class"><span className="jarvis-next-date">{dateLabel(data.next.lesson_date)}</span><LessonInfo lesson={data.next}/>
          <a className="jarvis-secondary-button" href="#student-timetable">See weekly timetable</a></div>
          :<div className="jarvis-empty-state"><strong>No upcoming classes</strong><p>No further lessons are currently scheduled.</p></div>}
      </section>
      <section className="jarvis-panel">
        <div className="jarvis-panel-heading"><div><span className="jarvis-eyebrow">COURSEWORK</span><h3>Assignment deadlines</h3></div><a href="#student-timetable">Calendar →</a></div>
        {deadlines===null?<div className="jarvis-empty-state"><strong>Deadlines unavailable</strong><p>The rest of your workspace is still available.</p></div>
        :deadlines?.length?<ul className="jarvis-deadline-list">{deadlines.map(item=><li key={item.id}>
          <div className="jarvis-deadline-date"><strong>{item.due_on.slice(8,10)}</strong><small>{new Intl.DateTimeFormat("en-GB",{month:"short",timeZone:"UTC"}).format(new Date(item.due_on+"T00:00:00Z"))}</small></div>
          <div><details><summary>{item.title}</summary><p className="jarvis-muted whitespace-pre-wrap break-words">{item.brief}</p></details>
          <p className="jarvis-muted">{item.offering.course.name} · {item.due_at.slice(0,5)} Yerevan</p></div>
        </li>)}</ul>:<div className="jarvis-empty-state"><strong>You're up to date</strong><p>No upcoming published deadlines.</p></div>}
      </section>
      <section className="jarvis-panel">
        <div className="jarvis-panel-heading"><div><span className="jarvis-eyebrow">STUDY PROGRESS</span><h3>Your study plans</h3></div><Link href="/study-plans">Open plans →</Link></div>
        {plans.length?<ul className="jarvis-progress-list">{plans.map(plan=>{
          const pct=plan.scheduled?Math.max(0,Math.min(100,Math.round(plan.completed/plan.scheduled*100))):0;
          return <li key={plan.id}><div className="jarvis-progress-top"><strong>{plan.course_name}</strong><span>{plan.completed} / {plan.scheduled} sessions</span></div>
            <div className="jarvis-progress-track" role="progressbar" aria-label={plan.course_name+" completed sessions"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><div style={{width:pct+"%"}}/></div>
            <p>Exam: {dateLabel(plan.exam_date)}</p></li>;
        })}</ul>:<div className="jarvis-empty-state"><strong>No confirmed plans yet</strong><p>Create a plan to see study progress here.</p>
          <Link className="jarvis-secondary-button" href="/study-plans">Create a study plan</Link></div>}
      </section>
    </div>
    <section id="student-courses" className="jarvis-panel">
      <div className="jarvis-panel-heading"><div><span className="jarvis-eyebrow">ACADEMIC CATALOG</span><h3>My courses</h3></div><Link href="/resources">Course resources →</Link></div>
      {data.courses.length?<ul className="jarvis-course-grid">{data.courses.map(course=><li key={course.id} className="jarvis-course-card">
        <span className="jarvis-course-symbol" aria-hidden="true">{course.code.slice(0,2).toUpperCase()}</span>
        <div><strong>{course.name}</strong><p>{course.code} · {course.semester}</p></div>
      </li>)}</ul>:<div className="jarvis-empty-state"><strong>No courses assigned</strong><p>Your administrator can add course enrollments.</p></div>}
    </section>
  </section>;
}
