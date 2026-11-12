"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { annualGrade, decimal, displayCourseGrade, formatGrade, requiredScore, selectedScore, semesterGrade, type GradeModule, type MissingMode, type RetakePolicy } from "./grading";
import { courses, currentModules, demoSchedule, exampleModules, lecturers, prerequisites, semesters, type Event } from "./demo";
import { pages } from "./routes";

type Role = "student" | "lecturer" | "staff" | "admin";
type Submission = { text: string; file: string; score?: string; feedback?: string };
type Edit = { value: string; reason: string };
type Published = Record<string, string>;
const button = "rounded-md bg-[#234c3c] px-4 py-2 font-semibold text-white disabled:opacity-50";
const field = "rounded-md border border-[#a6b8aa] bg-white px-3 py-2";
const roles: Role[] = ["student", "lecturer", "staff", "admin"];
const changeEvent = "jarvis-academics-demo";

function subscribe(callback: () => void) {
  window.addEventListener(changeEvent, callback);
  return () => window.removeEventListener(changeEvent, callback);
}

function useDemoValue<T>(key: string, initial: T) {
  const fallback = JSON.stringify(initial);
  const snapshot = useSyncExternalStore(subscribe, () => sessionStorage.getItem(key) ?? fallback, () => fallback);
  return [JSON.parse(snapshot) as T, (value: T) => {
    sessionStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(changeEvent));
  }] as const;
}

function courseLecturer(code: string) {
  return lecturers[courses.findIndex((course) => course.code === code) % lecturers.length];
}

function dateLabel(value: string, style: "date" | "time" = "date") {
  return new Intl.DateTimeFormat("en-GB", style === "date"
    ? { timeZone: "Asia/Yerevan", dateStyle: "medium", timeStyle: "short" }
    : { timeZone: "Asia/Yerevan", timeStyle: "short" }).format(new Date(value));
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return <section className="min-w-0 space-y-3 rounded-xl border border-[#c5d0c6] bg-white p-5">
    <h2 className="text-lg font-semibold">{title}</h2>{children}
  </section>;
}

function Badge({ children, warning = false }: { children: ReactNode; warning?: boolean }) {
  return <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${warning ? "bg-[#fce6ce] text-[#793608]" : "bg-[#e5f0e7] text-[#234c3c]"}`}>{children}</span>;
}

function Events({ items }: { items: Event[] }) {
  return items.length ? <ul className="space-y-3">{items.map((item) => {
    const overlaps = item.status !== "Cancelled" && items.some((other) => other.id !== item.id && other.status !== "Cancelled"
      && Date.parse(item.start) < Date.parse(other.end) && Date.parse(other.start) < Date.parse(item.end));
    return <li key={item.id} className="border-b border-[#e3e9e3] pb-3">
      <div className="flex flex-wrap items-center gap-2"><strong>{item.title}</strong>
        {item.status !== "Scheduled" && <Badge warning>{item.status}</Badge>}{overlaps && <Badge warning>Overlap</Badge>}
      </div>
      <p className="text-sm">{dateLabel(item.start)} – {dateLabel(item.end, "time")}</p>
      {item.reason && <p className="text-sm">{item.reason}</p>}
    </li>;
  })}</ul> : <p>No scheduled events.</p>;
}

function Timetable({ items, day }: { items: Event[]; day: string }) {
  const [daily, setDaily] = useState(false);
  const [date, setDate] = useState(day);
  const first = new Date(date + "T00:00:00+04:00");
  if (!daily) first.setUTCDate(first.getUTCDate() - ((new Date(date + "T00:00:00Z").getUTCDay() + 6) % 7));
  const end = first.getTime() + (daily ? 1 : 7) * 86_400_000;
  return <Card title={daily ? "Daily timetable" : "Weekly timetable"}>
    <div className="flex flex-wrap items-center gap-3">
      <button className={button} type="button" aria-pressed={!daily} onClick={() => setDaily(false)}>Week</button>
      <button className={button} type="button" aria-pressed={daily} onClick={() => setDaily(true)}>Day</button>
      <label> Date <input className={field} type="date" value={date} onChange={(event) => { if (event.target.value) setDate(event.target.value); }} /></label>
    </div>
    <Events items={items.filter((item) => Date.parse(item.start) >= first.getTime() && Date.parse(item.start) < end)} />
  </Card>;
}

function GradeSheet({ official, calculator }: { official: GradeModule[]; calculator: boolean }) {
  const [semester, setSemester] = useState("2");
  const [mode, setMode] = useState<MissingMode>("zero");
  const [policy, setPolicy] = useState<RetakePolicy>("latest");
  const [conversion, setConversion] = useState(false);
  const [example, setExample] = useState(false);
  const [hypothetical, setHypothetical] = useState<Record<string, string>>({});
  const base = example && calculator ? exampleModules : official;
  const term = (id: string) => base.map((module) => ({ ...module, courses: module.courses.map((course) => ({
    ...course,
    components: course.components.map((component, index) => {
      const value = hypothetical[`${id}:${course.code}:${index}`];
      if (calculator && value !== undefined) return { ...component, score: value || null, attempts: undefined };
      return id === "2" ? component : { ...component, score: null, attempts: undefined };
    }),
  })) }));
  const modules = term(semester);
  const gradingMode = calculator ? mode : "official";
  const report = semesterGrade(modules, gradingMode, policy);
  const firstTerm = Number(semester) <= 2 ? "1" : "3";
  const secondTerm = Number(semester) <= 2 ? "2" : "4";
  const annual = annualGrade(semesterGrade(term(firstTerm), gradingMode, policy), semesterGrade(term(secondTerm), gradingMode, policy));

  return <Card title={calculator ? "GPA Calculator" : "Published grades"}>
    <div className="flex flex-wrap items-center gap-4">
      <label>Semester <select className={field} value={semester} onChange={(event) => setSemester(event.target.value)}>
        {semesters.map((name, index) => <option key={name} value={String(index + 1)}>{name}</option>)}
      </select></label>
      <label>Retakes <select className={field} value={policy} onChange={(event) => setPolicy(event.target.value === "best" ? "best" : "latest")}><option value="latest">Latest attempt</option><option value="best">Best attempt</option></select></label>
      <label><input type="checkbox" checked={conversion} onChange={(event) => setConversion(event.target.checked)} /> Show 4.0 conversion</label>
      {calculator && <>
        <label>Empty scores <select className={field} value={mode} onChange={(event) => setMode(event.target.value === "ignore" ? "ignore" : "zero")}><option value="zero">Treat empty as 0</option><option value="ignore">Ignore ungraded modules</option></select></label>
        <button className={button} type="button" onClick={() => { setExample(true); setHypothetical({}); setSemester("2"); setMode("zero"); }}>Load grading example</button>
      </>}
    </div>
    {calculator && <p>Hypothetical scores are never saved. Minimums assume the other blank scores are zero.</p>}
    <div className="overflow-x-auto">
      <table className="w-full min-w-[780px] border-collapse text-left text-sm">
        <thead><tr className="bg-[#e5eee6]"><th className="p-3">Module / Course</th><th>ECTS</th><th>Weighted components</th><th>Grade / 20</th><th>Validation</th></tr></thead>
        {modules.map((module, moduleIndex) => {
          const result = report.results[moduleIndex];
          const incomplete = result.missing && gradingMode !== "zero";
          return <tbody key={module.name}>
            <tr className="border-t bg-[#f1f5f0] font-semibold"><th className="p-3">{module.name}</th><td>{formatGrade(result.coefficient, decimal("1"))}</td><td /><td>{incomplete ? "Not graded yet" : result.grade}</td><td>{!incomplete && <Badge warning={!result.validated}>{result.validated ? "VALIDATED" : "NOT VALIDATED"}</Badge>}</td></tr>
            {module.courses.map((course, courseIndex) => <tr key={course.code} className="border-b border-[#e3e9e3]">
              <th className="p-3 font-normal">{course.title}</th><td>{course.ects}</td>
              <td className="py-2"><ul className="space-y-2">{course.components.map((component, componentIndex) => {
                const key = `${semester}:${course.code}:${componentIndex}`;
                const score = selectedScore(component, policy);
                const shownScore = score === null ? "" : formatGrade(score, decimal("1"), 6);
                const needed = score === null && calculator ? requiredScore(module, courseIndex, componentIndex, policy) : undefined;
                return <li key={component.name}>
                  <label>{component.name} ({formatGrade(decimal(component.weight) * 100n, decimal("1"))}%){calculator
                    ? <input aria-label={`${course.title} ${component.name}`} className={`ml-2 w-24 ${field}`} type="number" min="0" max="20" step="0.01" value={hypothetical[key] ?? shownScore} onChange={(event) => {
                      const value = event.target.value;
                      if (!value || (/^\d+(?:\.\d{1,6})?$/.test(value) && decimal(value) <= decimal("20"))) setHypothetical({ ...hypothetical, [key]: value });
                    }} />
                    : <strong className="ml-2">{shownScore || "Not graded yet"}</strong>}</label>
                  {needed !== undefined && <p className="text-xs">{needed === null ? "Not possible with this component alone." : `You need at least ${needed} in this component to validate the module.`}</p>}
                </li>;
              })}</ul></td>
              <td>{result.courses[courseIndex].missing && gradingMode !== "zero" ? "Not graded yet" : displayCourseGrade(result.courses[courseIndex].points)}</td><td />
            </tr>)}
          </tbody>;
        })}
      </table>
    </div>
    <div className="flex flex-wrap gap-5 rounded-lg bg-[#eaf2ea] p-4" aria-live="polite">
      <strong>Semester GPA: {report.gpa ?? "Incomplete"}</strong><strong>ECTS earned: {report.earned}</strong><strong>Annual GPA: {annual ?? "Incomplete"}</strong>
      {conversion && <span>4.0 conversion (not official): {report.conversion ?? "Incomplete"}</span>}
    </div>
  </Card>;
}

function Assignments({ role, schedule }: { role: Role; schedule: ReturnType<typeof demoSchedule> }) {
  const [submissions, setSubmissions] = useDemoValue<Record<string, Submission>>("jarvis-academics-submissions", {});
  const [message, setMessage] = useState("");
  const visible = role === "lecturer" ? schedule.assignments.filter((item) => courseLecturer(item.course) === lecturers[0]) : schedule.assignments;
  return <div className="grid gap-4">{visible.map((item) => {
    const submission = submissions[item.id];
    const near = schedule.assignments.some((other) => other.id !== item.id && Math.abs(Date.parse(other.due) - Date.parse(item.due)) <= 86_400_000);
    const examPeriod = item.due.slice(0, 10) >= schedule.exams[0].start.slice(0, 10) && item.due.slice(0, 10) <= schedule.exams.at(-1)!.end.slice(0, 10);
    return <Card title={item.title} key={item.id}>
      <p>{item.course} · Due {dateLabel(item.due)}</p>
      <div className="flex flex-wrap gap-2"><Badge>{submission?.score ? "Graded" : submission ? "Submitted" : "Open"}</Badge>
        {near && <Badge warning>Another deadline within 24 hours</Badge>}{examPeriod && <Badge warning>During exam period</Badge>}</div>
      {submission && <div className="space-y-1"><p>{submission.text}</p>{submission.file && <p>File selected: {submission.file}</p>}{submission.score && <p>Score: {submission.score}/20 · {submission.feedback}</p>}</div>}
      {role === "student" && <form className="grid gap-3" onSubmit={(event) => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        const text = String(fields.get("submission") ?? "").trim();
        const file = fields.get("file");
        const name = file instanceof File ? file.name : "";
        if (!text && !name) { setMessage("Enter text or choose a file."); return; }
        setSubmissions({ ...submissions, [item.id]: { text, file: name } });
        setMessage("Submission recorded for this demo session.");
      }}>
        <label>Submission text <textarea name="submission" className={`block w-full ${field}`} /></label>
        <label>File (demo records the name) <input name="file" type="file" className="block max-w-full" /></label>
        <button className={`w-fit ${button}`}>Submit assignment</button>
      </form>}
      {role === "lecturer" && submission && <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => {
        event.preventDefault(); const fields = new FormData(event.currentTarget);
        setSubmissions({ ...submissions, [item.id]: { ...submission, score: String(fields.get("score")), feedback: String(fields.get("feedback")) } });
        setMessage("Feedback saved in this demo session.");
      }}><label>Score <input className={field} name="score" type="number" min="0" max="20" step="0.01" required /></label><label>Feedback <input className={field} name="feedback" required /></label><button className={button}>Save feedback</button></form>}
    </Card>;
  })}<p role="status">{message}</p></div>;
}

function Gradebook({ published, publish }: { published: Published; publish: (value: Published) => void }) {
  const [drafts, setDrafts] = useDemoValue<Record<string, Edit>>("jarvis-academics-drafts", {});
  const [audit, setAudit] = useDemoValue<string[]>("jarvis-academics-audit", []);
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState(courses[0].code);
  const course = courses.find((item) => item.code === selected)!;
  return <Card title="Lecturer gradebook">
    <label>Course <select className={field} value={selected} onChange={(event) => setSelected(event.target.value)}>
      {courses.filter((item) => courseLecturer(item.code) === lecturers[0]).map((item) => <option key={item.code} value={item.code}>{item.title}</option>)}
    </select></label>
    <form onSubmit={(event) => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
      const next = { ...drafts };
      for (const [index] of course.components.entries()) {
        const key = `${course.code}:${index}`;
        const value = String(fields.get(key) ?? "");
        if (value && (!/^\d+(?:\.\d{1,6})?$/.test(value) || decimal(value) > decimal("20"))) {
          setNotice("Scores must be between 0 and 20."); return;
        }
        next[key] = { value, reason: String(fields.get("reason") ?? "").trim() };
      }
      if (submitter?.value !== "publish") { setDrafts(next); setNotice("Draft saved."); return; }
      const updates = { ...published };
      const history = [...audit];
      for (const [index, component] of course.components.entries()) {
        const key = `${course.code}:${index}`;
        const previous = published[key] ?? component.score;
        const edit = next[key];
        if (!edit.value || (previous !== null && decimal(previous) === decimal(edit.value))) continue;
        if (previous !== null && !edit.reason) { setNotice("A reason is required to change a published score."); return; }
        updates[key] = edit.value;
        history.push(`${new Date().toISOString()} · ${course.code} · ${component.name} · ${previous ?? "Unpublished"} → ${edit.value}${edit.reason ? " · " + edit.reason : ""}`);
      }
      publish(updates); setAudit(history); setDrafts(next); setNotice("Scores published to the student view.");
    }} className="space-y-4" key={selected}>
      <div className="overflow-x-auto"><table className="min-w-max text-left"><thead><tr><th className="pr-4">Student</th>{course.components.map((component) => <th key={component.name} className="p-2">{component.name}</th>)}</tr></thead>
      <tbody><tr><th>Demo Student</th>{course.components.map((component, index) => {
        const key = `${course.code}:${index}`;
        return <td className="p-2" key={key}><input className={`w-24 ${field}`} aria-label={component.name} name={key} type="number" min="0" max="20" step="0.01" defaultValue={drafts[key]?.value ?? published[key] ?? component.score ?? ""} /></td>;
      })}</tr></tbody></table></div>
      <label>Reason for a published change <input className={field} name="reason" /></label>
      <div className="flex gap-3"><button className={button} value="draft">Save draft</button><button className={button} value="publish">Publish</button></div>
    </form><p role="status">{notice}</p>
    {!!audit.length && <><h3 className="font-semibold">Published changes</h3><ul>{audit.map((entry, index) => <li key={index}>{entry}</li>)}</ul></>}
  </Card>;
}

const managementSeed: Record<string, string[]> = {
  Programs: ["Applied Mathematics and Computer Science"],
  Semesters: semesters,
  Modules: exampleModules.map((module) => module.name),
  Courses: courses.map((course) => course.title),
  Timetable: ["Numerical Methods · 10:00", "French · Cancelled"],
  Exams: ["Algorithms final", "Architecture final"],
  Enrollments: ["Demo Student · Applied Mathematics and Computer Science"],
};

function Management() {
  const [records, setRecords] = useDemoValue("jarvis-academics-management", managementSeed);
  const [category, setCategory] = useState("Programs");
  const [editing, setEditing] = useState<number | null>(null);
  const [name, setName] = useState("");
  return <Card title="Manage Academics">
    <label>Record type <select className={field} value={category} onChange={(event) => { setCategory(event.target.value); setEditing(null); setName(""); }}>
      {Object.keys(records).map((key) => <option key={key}>{key}</option>)}</select></label>
    <form className="flex flex-wrap gap-2" onSubmit={(event) => {
      event.preventDefault(); const value = name.trim(); if (!value) return;
      const list = [...records[category]];
      if (editing === null) list.push(value); else list[editing] = value;
      setRecords({ ...records, [category]: list }); setName(""); setEditing(null);
    }}><label>Record name <input className={field} value={name} onChange={(event) => setName(event.target.value)} required /></label><button className={button}>{editing === null ? "Add record" : "Save changes"}</button></form>
    <ul className="space-y-2">{records[category].map((item, index) => <li className="flex flex-wrap items-center gap-4" key={index}>
      <span>{item}</span><button className="underline" onClick={() => { setEditing(index); setName(item); }}>Edit</button>
      <button className="underline" onClick={() => { setRecords({ ...records, [category]: records[category].filter((_, position) => position !== index) }); setEditing(null); setName(""); }}>Remove</button>
    </li>)}</ul>
  </Card>;
}

export function AcademicsWorkspace({ page, code }: { page: string; code?: string }) {
  const [role, setRole] = useDemoValue<Role | null>("jarvis-academics-role", null);
  const [published, publish] = useDemoValue<Published>("jarvis-academics-published", {});
  const [loginError, setLoginError] = useState(false);
  const schedule = demoSchedule();
  if (!role) return <main className="mx-auto max-w-lg space-y-5 px-5 py-12">
    <Link href="/" className="underline">JARVIS home</Link><h1 className="text-4xl font-semibold">Academics</h1>
    <Card title="Sign in to the demo">
      <p>Use <strong>student@example.com</strong>, <strong>lecturer@example.com</strong>, <strong>staff@example.com</strong>, or <strong>admin@example.com</strong>. The demo password is <strong>JarvisDemo2026</strong>.</p>
      <form className="grid gap-3" onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault(); const fields = new FormData(event.currentTarget);
        const selected = roles.find((candidate) => fields.get("email") === `${candidate}@example.com`);
        if (!selected || fields.get("password") !== "JarvisDemo2026") { setLoginError(true); return; }
        setLoginError(false); setRole(selected);
      }}>
        <label>Email <input name="email" type="email" autoComplete="username" required className={`block w-full ${field}`} /></label>
        <label>Password <input name="password" type="password" autoComplete="current-password" required className={`block w-full ${field}`} /></label>
        <button className={button}>Sign in</button>{loginError && <p role="alert">The demo email or password is incorrect.</p>}
      </form>
    </Card>
  </main>;

  const allowed = role === "student" ? pages.filter((entry) => !["gradebook", "manage"].includes(entry.key))
    : role === "lecturer" ? pages.filter((entry) => ["overview", "courses", "assignments", "gradebook"].includes(entry.key))
    : pages.filter((entry) => ["overview", "manage"].includes(entry.key));
  const visibleCourses = role === "lecturer" ? courses.filter((item) => courseLecturer(item.code) === lecturers[0]) : courses;
  const official = currentModules.map((module) => ({ ...module, courses: module.courses.map((item) => ({
    ...item, components: item.components.map((component, index) => ({ ...component, score: published[`${item.code}:${index}`] ?? component.score })),
  })) }));
  const course = visibleCourses.find((item) => item.code === code);
  const completed = new Set(semesterGrade(official).results.flatMap((result, index) =>
    result.validated && !result.missing ? official[index].courses.map((item) => item.code) : []));
  const earned = semesterGrade(official).earned;
  const content = () => {
    if (!allowed.some((entry) => entry.key === page) || (code && !course)) return <p role="alert">This section is unavailable for your demo role.</p>;
    switch (page) {
      case "courses": return course ? <Card title={course.title}>
        <p>{course.code} · {course.ects} ECTS · {courseLecturer(course.code)}</p>
        <p>Develop practical and theoretical skills in {course.title.toLowerCase()} through lectures and assessed coursework.</p>
        <h3 className="font-semibold">Syllabus</h3><ul>{course.components.map((item) => <li key={item.name}>{item.name} · {formatGrade(decimal(item.weight) * 100n, decimal("1"))}%</li>)}</ul>
        <h3 className="font-semibold">Schedule</h3><Events items={schedule.timetable.filter((item) => item.course === code)} />
      </Card> : <div className="grid gap-3 sm:grid-cols-2">{visibleCourses.map((item) => <Card key={item.code} title={item.title}>
        <p>{item.code} · {item.ects} ECTS · {courseLecturer(item.code)}</p><Link className="underline" href={`/academics/courses/${item.code}`}>Open course</Link>
      </Card>)}</div>;
      case "timetable": return <Timetable items={schedule.timetable} day={schedule.day} />;
      case "exams": return <div className="grid gap-4 sm:grid-cols-2">{schedule.exams.map((item) => {
        const days = Math.round((Date.parse(item.start.slice(0, 10)) - Date.parse(schedule.day)) / 86_400_000);
        return <Card key={item.id} title={item.title}><p>{dateLabel(item.start)} – {dateLabel(item.end, "time")}</p><Badge>{days === 0 ? "Today" : `in ${days} days`}</Badge></Card>;
      })}</div>;
      case "grades": return <GradeSheet key="official" official={official} calculator={false} />;
      case "calculator": return <GradeSheet key="calculator" official={official} calculator />;
      case "assignments": return <Assignments role={role} schedule={schedule} />;
      case "gradebook": return <Gradebook published={published} publish={publish} />;
      case "manage": return <Management />;
      case "degree": return <Card title="Degree Progress">
        <p className="font-semibold">{earned} / 120 ECTS earned</p><progress value={earned} max="120" className="w-full" />
        <ul className="space-y-3">{[...courses, { code: "SYS201", title: "Systems 1" }].map((item) => {
          const missing = (prerequisites[item.code] ?? []).filter((entry) => !completed.has(entry));
          return <li key={item.code}><strong>{item.title}</strong> <Badge>{completed.has(item.code) ? "Completed" : missing.length || item.code === "SYS201" ? "Remaining" : "In progress"}</Badge>
            {!!missing.length && <p>Missing prerequisites: {missing.map((entry) => courses.find((candidate) => candidate.code === entry)?.title ?? entry).join(", ")}</p>}</li>;
        })}</ul>
      </Card>;
      default: return role === "student" ? <div className="grid gap-4 lg:grid-cols-3">
        <Card title="My day"><Events items={schedule.timetable.filter((item) => item.start.startsWith(schedule.day))} /></Card>
        <Card title="Due today">{schedule.assignments.filter((item) => item.due.startsWith(schedule.day)).map((item) => <p key={item.id}>{item.title} · {dateLabel(item.due, "time")}</p>)}</Card>
        <Card title="Exams today"><Events items={schedule.exams.filter((item) => item.start.startsWith(schedule.day))} /></Card>
      </div> : <Card title={role === "lecturer" ? "Teaching workspace" : "Academic administration"}>
        <Link className="underline" href={role === "lecturer" ? "/academics/gradebook" : "/academics/manage"}>{role === "lecturer" ? "Open gradebook" : "Manage Academics"}</Link>
      </Card>;
    }
  };
  return <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><Link href="/" className="text-sm font-semibold underline">JARVIS home</Link><h1 className="mt-2 text-4xl font-semibold">Academics</h1><p className="mt-1">Demo {role} · Asia/Yerevan</p></div>
      <button className="underline" onClick={() => setRole(null)}>Sign out</button>
    </header>
    <nav aria-label="Academics" className="flex flex-wrap gap-2 border-b border-[#c5d0c6] pb-4">
      {allowed.map((entry) => <Link key={entry.key} aria-current={page === entry.key ? "page" : undefined}
        className={`rounded-md px-3 py-2 text-sm font-semibold ${page === entry.key ? "bg-[#234c3c] text-white" : "bg-[#e6eee6]"}`}
        href={entry.key === "overview" ? "/academics" : `/academics/${entry.key}`}>{entry.title}</Link>)}
    </nav>
    {content()}
  </main>;
}
