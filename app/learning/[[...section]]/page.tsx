import { notFound } from "next/navigation";
import { Learning } from "@/modules/learning/workspace";
import { learningPages } from "@/modules/learning/routes";
import { demoStudentId, getExamSchedule, getFreeTimeSlots, getTimetable } from "@/modules/academics/services";

export default async function LearningPage({ params, searchParams }: PageProps<"/learning/[[...section]]">) {
  const { section = [] } = await params;
  const [page = "overview"] = section;
  if (section.length > 1 || !["overview", ...learningPages].includes(page)) notFound();
  const { course, date: requestedDate } = await searchParams;
  const initialCourse = typeof course === "string" ? course : undefined;
  const now = new Date();
  const end = new Date(now.getTime() + 30 * 86_400_000);
  const exams = getExamSchedule(demoStudentId, now, end)
    .filter(({ status }) => status !== "Cancelled")
    .map(({ id, title, course, start }) => ({ id, title, course, start: Date.parse(start) }));
  const slots = getFreeTimeSlots(demoStudentId, now, end, 50)
    .map(({ start, end: finish }) => ({ start: start.getTime(), end: finish.getTime() }));
  const lessons = getTimetable(demoStudentId, new Date(now.getTime() - 60 * 86_400_000), end);
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Yerevan", dateStyle: "short" }).format(now);
  const recent = lessons.filter((lesson) => lesson.status !== "Cancelled" && lesson.start.slice(0, 10) <= today)
    .map((lesson) => lesson.start.slice(0, 10)).sort().at(-1);
  const date = typeof requestedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : recent ?? today;
  return <Learning key={initialCourse} page={page} exams={exams} slots={slots} lessons={lessons} date={date} initialCourse={initialCourse} />;
}
