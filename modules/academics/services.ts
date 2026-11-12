import { courses, currentModules, demoSchedule } from "./demo.ts";
import { semesterGrade } from "./grading.ts";

export const demoStudentId = "demo-student";

function dataFor(studentId: string) {
  if (studentId !== demoStudentId) throw new Error("Student is outside the demo dataset.");
  return demoSchedule();
}

function overlaps(start: string, end: string, from: Date, to: Date) {
  return Date.parse(start) < to.getTime() && Date.parse(end) > from.getTime();
}

export function getTimetable(studentId: string, from: Date, to: Date) {
  return dataFor(studentId).timetable.filter((event) => overlaps(event.start, event.end, from, to));
}

export function getExamSchedule(studentId: string, from: Date, to: Date) {
  return dataFor(studentId).exams.filter((event) => overlaps(event.start, event.end, from, to));
}

export function getUpcomingDeadlines(studentId: string, days: number) {
  const now = Date.now();
  const end = now + days * 86_400_000;
  return dataFor(studentId).assignments.filter(({ due }) => Date.parse(due) >= now && Date.parse(due) <= end)
    .sort((left, right) => Date.parse(left.due) - Date.parse(right.due));
}

export function getFreeTimeSlots(studentId: string, from: Date, to: Date, minMinutes: number) {
  const events = [...getTimetable(studentId, from, to), ...getExamSchedule(studentId, from, to)]
    .filter((event) => event.status !== "Cancelled")
    .sort((left, right) => Date.parse(left.start) - Date.parse(right.start));
  const free: { start: Date; end: Date }[] = [];
  const minimum = minMinutes * 60_000;
  let cursor = from.getTime();
  function addGap(end: number) {
    if (end > cursor && end - cursor >= minimum) free.push({ start: new Date(cursor), end: new Date(end) });
  }
  for (const event of events) {
    addGap(Date.parse(event.start));
    cursor = Math.max(cursor, Date.parse(event.end));
  }
  addGap(to.getTime());
  return free;
}

export function getCurrentGpa(studentId: string) {
  dataFor(studentId);
  const { gpa, earned } = semesterGrade(currentModules);
  return { gpa, ectsEarned: earned };
}

export function getCompletedCourses(studentId: string) {
  dataFor(studentId);
  return semesterGrade(currentModules).results.flatMap((result, index) => (
    result.validated && !result.missing ? currentModules[index].courses : []
  ));
}

export function getRemainingCourses(studentId: string) {
  const completed = new Set(getCompletedCourses(studentId).map(({ code }) => code));
  return courses.filter(({ code }) => !completed.has(code));
}
