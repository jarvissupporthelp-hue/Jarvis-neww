import { notFound } from "next/navigation";
import { Learning } from "@/modules/learning/workspace";
import { learningPages } from "@/modules/learning/routes";
import { demoStudentId, getExamSchedule, getFreeTimeSlots } from "@/modules/academics/services";

export default async function LearningPage({ params }: PageProps<"/learning/[[...section]]">) {
  const { section = [] } = await params;
  const [page = "overview"] = section;
  if (section.length > 1 || !["overview", ...learningPages].includes(page)) notFound();
  const now = new Date();
  const end = new Date(now.getTime() + 30 * 86_400_000);
  const exams = getExamSchedule(demoStudentId, now, end)
    .filter(({ status }) => status !== "Cancelled")
    .map(({ id, title, course, start }) => ({ id, title, course, start: Date.parse(start) }));
  const slots = getFreeTimeSlots(demoStudentId, now, end, 50)
    .map(({ start, end: finish }) => ({ start: start.getTime(), end: finish.getTime() }));
  return <Learning page={page} exams={exams} slots={slots} />;
}
