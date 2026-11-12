import type { GradeCourse, GradeModule } from "./grading";

function course(code: string, title: string, ects: string, parts: [string, string, string][]): GradeCourse {
  return { code, title, ects, components: parts.map(([name, weight, score]) => ({ name, weight, score })) };
}

export const exampleModules: GradeModule[] = [
  { name: "Module 13", courses: [
    course("NUM301", "Numerical Methods", "3", [["Midterm", "0.4", "14"], ["Final", "0.6", "18"]]),
    course("LOG301", "Logic 1", "3", [["Midterm", "0.4", "15"], ["Final", "0.6", "0"]]),
  ] },
  { name: "Module 14", courses: [
    course("INF301", "Information Theory", "3", [["Midterm", "0.4", "5"], ["Final", "0.6", "7"]]),
    course("ARC301", "Computer Architecture", "3", [["Midterm", "0.5", "17.5"], ["Final", "0.5", "17.5"]]),
  ] },
  { name: "Module 15", courses: [course("ALG301", "Algorithms", "6", [["Theory midterm", "0.3", "18.5"], ["Theory final", "0.25", "17.5"], ["Practical final", "0.25", "15"], ["Practical oral", "0.2", "19"]])] },
  { name: "Module 16", courses: [
    course("CS301", "C#", "3", [["Midterm", "0.2", "0.2"], ["Final", "0.5", "17"], ["Oral", "0.3", "19"]]),
    course("PRO301", "Project", "3", [["Project", "1", "18"]]),
  ] },
  { name: "Module 17", courses: [course("FRE301", "French", "4", [["Final", "0.8", "9.1"], ["Oral", "0.2", "16"]])] },
  { name: "Module 18", courses: [course("ENG301", "English", "2", [["Final", "0.8", "13.25"], ["Oral", "0.2", "18"]])] },
];

export const semesters = ["Semester 1", "Semester 2", "Semester 3", "Semester 4"];
export const courses = exampleModules.flatMap((module) => module.courses);
export const lecturers = ["Maya Grigoryan", "Aram Sargsyan", "Lilit Hakobyan", "David Petrosyan"];
export const prerequisites: Record<string, string[]> = { PRO301: ["CS301", "SYS201"], ALG301: ["LOG301"] };
export const currentModules = exampleModules.map((module) => ({
  ...module,
  courses: module.courses.map((item) => item.code === "PRO301" ? {
    ...item, components: item.components.map((component) => ({ ...component, score: null })),
  } : item),
}));

export type Event = { id: string; course: string; title: string; start: string; end: string; status: "Scheduled" | "Changed" | "Cancelled"; reason?: string; lecturer?: string };

// Year 3 Computer Science, semester 1. Only the two days visible on the source sheet.
const classDates = ["2026-11-09", "2026-11-10"];
const classTimes = [["10:30", "11:50"], ["12:00", "13:20"], ["14:00", "15:20"], ["15:30", "16:50"]];

export const computerScienceTimetable: Event[] = classDates.flatMap((date) =>
  classTimes.map(([start, end]) => ({
    id: `${date}-${start}`,
    course: "ARC301",
    title: "Computer Architecture",
    lecturer: "Armelle Bonenfant",
    start: `${date}T${start}:00+04:00`,
    end: `${date}T${end}:00+04:00`,
    status: "Scheduled",
  })),
);

export function demoSchedule(now = new Date()) {
  const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Yerevan", dateStyle: "short" }).format(now);
  const dateAt = (offset: number, hour: string) => {
    const date = new Date(`${day}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    return `${date.toISOString().slice(0, 10)}T${hour}:00+04:00`;
  };
  const exams: Event[] = [
    { id: "e1", course: "ALG301", title: "Algorithms final", start: dateAt(12, "09:00"), end: dateAt(12, "11:00"), status: "Scheduled" },
    { id: "e2", course: "ARC301", title: "Architecture final", start: dateAt(15, "11:00"), end: dateAt(15, "13:00"), status: "Scheduled" },
  ];
  const assignments = [
    { id: "a1", title: "Interpolation worksheet", course: "NUM301", due: dateAt(0, "18:00") },
    { id: "a2", title: "Cache simulation", course: "ARC301", due: dateAt(1, "10:00") },
    { id: "a3", title: "Graph traversal report", course: "ALG301", due: dateAt(13, "16:00") },
  ];
  return { timetable: computerScienceTimetable, exams, assignments, day };
}
