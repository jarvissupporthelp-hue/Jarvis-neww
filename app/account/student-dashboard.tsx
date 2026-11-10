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

const card = "rounded-xl border border-[#afbeb3] bg-white p-4 sm:p-5";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
  }).format(new Date(date + "T00:00:00Z"));
}

function LessonDetails({ lesson }: { lesson: Lesson }) {
  return (
    <>
      <strong className="break-words">{lesson.course}</strong>
      <p className="text-sm">{lesson.starts_at.slice(0, 5)}–{lesson.ends_at.slice(0, 5)} · {lesson.room}</p>
    </>
  );
}

export function StudentDashboard({ getToken }: { getToken: () => Promise<string | undefined> }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const token = await getToken();
        const response = await fetch("/api/dashboard", {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${token ?? ""}` },
        });
        if (!response.ok) throw new Error();
        setData(await response.json());
      } catch {
        if (!controller.signal.aborted) setError("Could not load your dashboard.");
      }
    })();
    return () => controller.abort();
  }, [getToken, attempt]);

  if (!data) {
    return (
      <section className={card}>
        <p role="status">{error || "Loading your dashboard…"}</p>
        {error && <button className="mt-2 underline" type="button" onClick={() => {
          setError(""); setAttempt((value) => value + 1);
        }}>Retry</button>}
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-labelledby="student-dashboard-heading">
      <header className="rounded-xl bg-[#dfe9df] p-5">
        <p className="text-sm">Student dashboard · {formatDate(data.date)}</p>
        <h2 id="student-dashboard-heading" className="mt-1 break-words text-2xl font-semibold">
          Welcome, {data.name}
        </h2>
        <nav aria-label="Student quick actions" className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          <a href="#student-timetable" className="font-semibold underline">Open weekly calendar</a>
          <Link href="/chat" className="font-semibold underline">Ask JARVIS</Link>
          <Link href="/study-plans" className="font-semibold underline">Study Plans</Link>
          <Link href="/quizzes" className="font-semibold underline">Course quizzes</Link>
          <Link href="/resources" className="font-semibold underline">Course resources</Link>
          <Link href="/focus" className="font-semibold underline">Start focus session</Link>
          <a href="#student-tasks" className="font-semibold underline">View my tasks</a>
          <a href="#student-courses" className="font-semibold underline">View my courses</a>
        </nav>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        <section className={card}>
          <h3 className="mb-2 text-lg font-semibold">Today’s classes</h3>
          {data.today.length ? (
            <ul className="space-y-3">{data.today.map((lesson) => (
              <li key={lesson.id}><LessonDetails lesson={lesson} /></li>
            ))}</ul>
          ) : <p>No classes scheduled today.</p>}
        </section>
        <section className={card}>
          <h3 className="mb-2 text-lg font-semibold">Next lesson</h3>
          {data.next ? (
            <>
              <p className="mb-1 text-sm">{formatDate(data.next.lesson_date)}</p>
              <LessonDetails lesson={data.next} />
            </>
          ) : <p>No upcoming lessons scheduled.</p>}
        </section>
      </div>
      <section className={card}>
        <h3 className="mb-2 text-lg font-semibold">Assignment deadlines</h3>
        {data.assignmentDeadlines === null ? <p>Could not load assignment deadlines.</p> : data.assignmentDeadlines?.length ? (
          <ul className="space-y-2">{data.assignmentDeadlines.map((item) => (
            <li key={item.id}>
              <details>
                <summary className="cursor-pointer break-words font-semibold">{item.title}</summary>
                <p className="mt-1 whitespace-pre-wrap break-words">{item.brief}</p>
              </details>
              <p className="text-sm">{item.offering.course.name} · Due {formatDate(item.due_on)} at {item.due_at.slice(0, 5)} Yerevan</p>
            </li>
          ))}</ul>
        ) : <p>No upcoming assignment deadlines.</p>}
      </section>
      <section className={card}>
        <h3 className="mb-2 text-lg font-semibold">Study plan progress</h3>
        {data.studyProgress?.length ? (
          <ul className="space-y-2">{data.studyProgress.map((plan) => (
            <li key={plan.id}>
              <strong className="break-words">{plan.course_name}</strong>
              <p className="text-sm">{plan.completed} of {plan.scheduled} sessions completed · Exam {formatDate(plan.exam_date)}</p>
            </li>
          ))}</ul>
        ) : <p>No confirmed sessions for upcoming exams.</p>}
        <div className="mt-2 flex flex-wrap gap-3">
          <Link href="/study-plans" className="font-semibold underline">Open Study Plans</Link>
          {data.studyProgress?.some((plan) => plan.completed < plan.scheduled) && (
            <Link href="/study-plans#saved-plans" className="font-semibold underline">Continue unfinished plans</Link>
          )}
        </div>
      </section>
      <section id="student-courses" className={card}>
        <h3 className="mb-2 text-lg font-semibold">My courses</h3>
        {data.courses.length ? (
          <ul className="space-y-2">{data.courses.map((course) => (
            <li key={course.id}>
              <strong className="break-words">{course.name}</strong>
              <p className="text-sm">{course.code} · {course.semester}</p>
            </li>
          ))}</ul>
        ) : <p>No courses assigned yet.</p>}
      </section>
    </section>
  );
}
