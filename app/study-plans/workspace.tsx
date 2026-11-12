"use client";

import Link from "next/link";
import { studyPlanHandoffKey, type QuizPlanHandoff, type StudyPlanHandoff } from "@/lib/study-plan-handoff";
import { SchedulePreview } from "./schedule-preview";
import { useEffect, useState, type FormEvent } from "react";
import { getAccessToken, getClient } from "@/lib/browser-supabase";

type Topic = { name: string; confidence: number };
type Course = { id: string; name: string; code: string; semester: string };
type Draft = {
  id: string; offeringId: string; course: string; examDate: string; target: string;
  minutes: number; start: string; end: string; studyDays: number[]; topics: Topic[];
};
type SavedPlan = {
  id: string; offering_id: string; course_name: string; exam_date: string; target_outcome: string;
  session_minutes: number; study_start: string; study_end: string; study_days: number[];
  study_plan_topics: (Topic & { position: number })[];
  study_sessions: { id: string; completed_at: string | null }[];
};

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const field = "w-full rounded border border-[#789181] bg-white p-2";
const card = "space-y-3 rounded-xl border border-[#afbeb3] bg-white p-4 sm:p-5";
const button = "min-h-11 rounded jarvis-primary-button px-4 py-2 text-white disabled:opacity-50";

function minutesAt(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function PlanDetails({ plan }: { plan: Pick<Draft, "course" | "examDate" | "target" | "minutes" | "start" | "end" | "studyDays" | "topics"> }) {
  return (
    <div className="space-y-2">
      <p><strong>{plan.course}</strong> · Exam {plan.examDate}</p>
      <p className="break-words"><strong>Goal:</strong> {plan.target}</p>
      <p>{plan.minutes} min per session · {plan.start.slice(0, 5)}–{plan.end.slice(0, 5)} Yerevan time</p>
      <p><strong>Study days:</strong> {plan.studyDays.map((day) => days[day - 1]).join(", ")}</p>
      <ol className="list-decimal space-y-1 pl-5">{plan.topics.map((topic, index) => (
        <li key={index} className="break-words">{topic.name} · Confidence {topic.confidence}/5</li>
      ))}</ol>
    </div>
  );
}

async function readPlans(signal?: AbortSignal) {
  const query = getClient().from("study_plans").select(
    "id,offering_id,course_name,exam_date,target_outcome,session_minutes,study_start,study_end,study_days,study_plan_topics(position,name,confidence),study_sessions(id,completed_at)",
  ).order("created_at", { ascending: false });
  const result = await (signal ? query.abortSignal(signal) : query);
  if (result.error) throw result.error;
  return result.data as SavedPlan[];
}

export function StudyPlanWorkspace() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [topics, setTopics] = useState<Topic[]>([{ name: "", confidence: 3 }]);
  const [prefill, setPrefill] = useState<StudyPlanHandoff | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<QuizPlanHandoff | null>(null);
  const [revisionSource, setRevisionSource] = useState<SavedPlan | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [showForm, setShowForm] = useState(true);
  const [busy, setBusy] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [revision, setRevision] = useState(0);
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Yerevan", dateStyle: "short" }).format(new Date());

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const token = await getAccessToken();
        if (!token) { if (!controller.signal.aborted) setNeedsSignIn(true); return; }
        const response = await fetch("/api/dashboard", {
          headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
        });
        if (response.status === 401 || response.status === 403) {
          if (!controller.signal.aborted) setNeedsSignIn(true);
          return;
        }
        if (!response.ok) throw new Error();
        const [dashboard, saved] = await Promise.all([response.json(), readPlans(controller.signal)]);
        if (controller.signal.aborted) return;
        try {
          const handoff = sessionStorage.getItem(studyPlanHandoffKey);
          if (handoff) {
            const suggested: StudyPlanHandoff | QuizPlanHandoff = JSON.parse(handoff);
            sessionStorage.removeItem(studyPlanHandoffKey);
            if ("kind" in suggested) {
              if (suggested.kind === "quiz" && dashboard.courses.some((course: Course) => course.id === suggested.offeringId)
                && Array.isArray(suggested.topics) && suggested.topics.length > 0 && suggested.topics.length <= 10
                && suggested.topics.every((name) => typeof name === "string" && name.trim() && name.length <= 120)) {
                setQuizFeedback(suggested);
                setTopics(suggested.topics.map((name) => ({ name, confidence: 2 })));
              }
            } else {
              setPrefill(suggested);
              setTopics([{ name: suggested.topic, confidence: 3 }]);
            }
          }
        } catch {
          // The standard form still works when browser storage is unavailable.
        }
        setCourses(dashboard.courses);
        setPlans(saved);
      } catch {
        if (!controller.signal.aborted) setError("Could not load your study plans.");
      }
    })();
    return () => controller.abort();
  }, [loadAttempt]);

  useEffect(() => {
    if (!showForm) document.getElementById("study-plan-preview-heading")?.focus();
  }, [showForm]);

  useEffect(() => {
    if (courses && window.location.hash === "#saved-plans") {
      document.getElementById("saved-plans")?.scrollIntoView();
    }
  }, [courses]);

  async function refreshPlans() {
    try {
      setPlans(await readPlans());
    } catch {
      setError("Your change was saved. Reload to refresh the plan summary.");
    }
  }

  function reviseFromQuiz(plan: SavedPlan) {
    if (!quizFeedback || busy) return;
    const practice = quizFeedback.topics.map((name) => ({ name, confidence: 2 }));
    const practiceNames = new Set(practice.map((topic) => topic.name.trim().toLowerCase()));
    const otherTopics = [...plan.study_plan_topics].sort((a, b) => a.position - b.position)
      .filter((topic) => !practiceNames.has(topic.name.trim().toLowerCase()))
      .map(({ name, confidence }) => ({ name, confidence }));
    setTopics([...practice, ...otherTopics]);
    setRevisionSource(plan);
    setRevision((value) => value + 1);
    setDraft(null);
    setShowForm(true);
    setError("");
    setMessage("");
    requestAnimationFrame(() => document.getElementById("study-plan-form-heading")?.focus());
  }

  function preview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const values = new FormData(event.currentTarget);
    const course = courses?.find((item) => item.id === values.get("course"));
    const examDate = String(values.get("examDate"));
    const start = String(values.get("start"));
    const end = String(values.get("end"));
    const minutes = Number(values.get("minutes"));
    const studyDays = values.getAll("studyDays").map(Number);
    const target = String(values.get("target")).trim();
    const cleanTopics = topics.map((topic) => ({ ...topic, name: topic.name.trim() }));
    if (cleanTopics.length > 10) {
      setError("Keep at most ten topics in your revised draft.");
      return;
    }
    if (!course || examDate < today || !target || !studyDays.length || cleanTopics.some((topic) => !topic.name)
      || minutesAt(end) - minutesAt(start) < minutes) {
      setError("Choose an enrolled course, an upcoming exam, study days, and a study window long enough for your session. Fill in the goal and topic names.");
      return;
    }
    setDraft({ id: crypto.randomUUID(), offeringId: course.id, course: course.name, examDate, target, minutes, start, end, studyDays, topics: cleanTopics });
    setShowForm(false);
  }

  async function save() {
    if (!draft || busy) return;
    setBusy(true);
    setError("");
    let saved = false;
    try {
      const { error } = await getClient().rpc("save_study_plan_draft", { p_plan: draft });
      if (error) throw error;
      saved = true;
      setDraft(null);
      setPrefill(null);
      setQuizFeedback(null);
      setRevisionSource(null);
      setTopics([{ name: "", confidence: 3 }]);
      setRevision((value) => value + 1);
      setShowForm(true);
      setMessage("Study plan draft saved.");
      setPlans(await readPlans());
    } catch {
      setError(saved ? "Draft saved. Reload to update the saved list." : "Could not save the draft. Your preview is still here.");
    } finally {
      setBusy(false);
    }
  }

  if (needsSignIn) return <p>Sign in with an active student account. <Link className="underline" href="/account">Sign in</Link></p>;
  if (!courses) return error ? (
    <div className="space-y-2">
      <p role="alert">{error}</p>
      <button type="button" className={button} onClick={() => {
        setError("");
        setLoadAttempt((value) => value + 1);
      }}>Retry loading study plans</button>
    </div>
  ) : <p role="status">Loading your study plans…</p>;

  return (
    <div className="space-y-4">
      {!courses.length && <p className={card}>You need an enrolled course before creating a plan.</p>}
      {courses.length > 0 && (
        <form key={revision} hidden={!showForm} className={card} onSubmit={preview}>
          <h2 id="study-plan-form-heading" tabIndex={-1} className="text-xl font-semibold">{revisionSource ? "Revised study plan draft" : "New study plan"}</h2>
          {quizFeedback && <p className="text-sm">Quiz feedback prefilled the topics that need practice. Review their confidence ratings before saving.</p>}
          {revisionSource && <p className="text-sm">This draft is a copy. Your existing sessions and progress stay with the original plan.</p>}
          {topics.length > 10 && <p role="status">Remove topics until ten or fewer remain.</p>}
          <label className="block">Course
            <select name="course" defaultValue={quizFeedback?.offeringId ?? (prefill && courses.length === 1 ? courses[0].id : "")} required className={field}>
              <option value="" disabled>Choose an enrolled course</option>
              {courses.map((course) => <option key={course.id} value={course.id}>{course.name} · {course.semester}</option>)}
            </select>
          </label>
          <label className="block">Exam date<input className={field} name="examDate" type="date" min={today} defaultValue={revisionSource?.exam_date ?? prefill?.examDate} required /></label>
          <label className="block">Target outcome<input className={field} name="target" maxLength={240} defaultValue={revisionSource?.target_outcome} required /></label>
          <label className="block">Session duration in minutes<input className={field} name="minutes" type="number" min={15} max={180} defaultValue={revisionSource?.session_minutes ?? prefill?.minutes ?? 45} required /></label>
          <fieldset className="grid gap-2 sm:grid-cols-2">
            <legend className="font-semibold">Daily study window (Yerevan time)</legend>
            <label className="block">Available from<input className={field} name="start" type="time" defaultValue={revisionSource?.study_start.slice(0, 5) ?? "17:00"} required /></label>
            <label className="block">Available until<input className={field} name="end" type="time" defaultValue={revisionSource?.study_end.slice(0, 5) ?? "20:00"} required /></label>
          </fieldset>
          <fieldset className="flex flex-wrap gap-3">
            <legend className="font-semibold">Available days</legend>
            {days.map((day, index) => (
              <label key={day} className="flex gap-1"><input name="studyDays" type="checkbox" value={index + 1} defaultChecked={revisionSource?.study_days.includes(index + 1) ?? true} />{day}</label>
            ))}
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="font-semibold">Topics and current confidence</legend>
            {topics.map((topic, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
                <label>Topic {index + 1}<input className={field} maxLength={120} required value={topic.name}
                  onChange={(event) => setTopics((items) => items.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} /></label>
                <label>Confidence
                  <select className={field} value={topic.confidence}
                    onChange={(event) => setTopics((items) => items.map((item, i) => i === index ? { ...item, confidence: Number(event.target.value) } : item))}>
                    <option value={1}>1 · Very low</option><option value={2}>2 · Low</option><option value={3}>3 · Medium</option>
                    <option value={4}>4 · High</option><option value={5}>5 · Very high</option>
                  </select>
                </label>
                {topics.length > 1 && <button type="button" className="self-end underline" onClick={() => setTopics((items) => items.filter((_, i) => i !== index))}>Remove topic {index + 1}</button>}
              </div>
            ))}
            <button type="button" className="underline" disabled={topics.length >= 10} onClick={() => setTopics((items) => [...items, { name: "", confidence: 3 }])}>Add another topic</button>
          </fieldset>
          <button className={button}>Preview study plan</button>
        </form>
      )}
      {!showForm && draft && (
        <section className={card} aria-label="Draft preview">
          <h2 id="study-plan-preview-heading" tabIndex={-1} className="text-xl font-semibold">Review your study plan</h2>
          <PlanDetails plan={draft} />
          <div className="flex flex-wrap gap-3">
            <button type="button" className={button} disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save draft"}</button>
            <button type="button" className="underline" disabled={busy} onClick={() => { setShowForm(true); setError(""); requestAnimationFrame(() => document.getElementById("study-plan-form-heading")?.focus()); }}>Edit inputs</button>
          </div>
        </section>
      )}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <section id="saved-plans" className={card}>
        <h2 className="text-xl font-semibold">Saved study plans</h2>
        {plans.length === 0 && <p>No study plans saved yet.</p>}
        {plans.map((plan) => (
          <details key={plan.id} className="rounded jarvis-muted-panel p-3">
            <summary className="cursor-pointer break-words py-2 font-semibold">{plan.course_name} · {plan.exam_date}</summary>
            <div className="mt-2"><PlanDetails plan={{
              course: plan.course_name, examDate: plan.exam_date, target: plan.target_outcome,
              minutes: plan.session_minutes, start: plan.study_start, end: plan.study_end,
              studyDays: plan.study_days, topics: [...plan.study_plan_topics].sort((a, b) => a.position - b.position),
            }} /></div>
            {plan.study_sessions.length > 0 && (
              <p className="mt-2 font-semibold">
                {plan.study_sessions.filter((session) => session.completed_at).length} of {plan.study_sessions.length} sessions completed
              </p>
            )}
            {quizFeedback?.offeringId === plan.offering_id && plan.exam_date >= today && (
              <button type="button" className="mt-2 font-semibold underline" disabled={busy}
                onClick={() => reviseFromQuiz(plan)}>Revise a copy using quiz feedback</button>
            )}
            <SchedulePreview planId={plan.id} hasSessions={plan.study_sessions.length > 0}
              practiceTopics={quizFeedback?.offeringId === plan.offering_id ? quizFeedback.topics : undefined}
              refreshPlans={refreshPlans} />
          </details>
        ))}
      </section>
    </div>
  );
}
