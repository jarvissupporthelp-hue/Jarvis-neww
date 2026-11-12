import { courseSkills, skills } from "./catalog.ts";

export const stages = ["saved", "applied", "interview", "offer", "rejected"] as const;
export type Stage = typeof stages[number];
export const cvFields = ["summary", "education", "experience", "projects", "skills", "languages"] as const;
export type Cv = Record<typeof cvFields[number], string>;
export const emptyCv: Cv = { summary: "", education: "", experience: "", projects: "", skills: "", languages: "" };
export const sampleCv: Cv = {
  summary: "Computer Science student interested in data and software engineering.",
  education: "French University in Armenia · Computer Science",
  experience: "University team project · Implemented and tested a course dashboard.",
  projects: "Library inventory · Designed a relational model and wrote SQL reports.",
  skills: "SQL, Git, Python", languages: "Հայերեն · Français · Русский · English",
};

export type Application = { stage: Stage; notes: string; history: { stage: Stage; at: string }[] };
export type Project = { id: string; skill: string; title: string; level: number; link: string; file?: { name: string; data: string }; verified: boolean };
export type MentorRequest = { id: string; mentorId: string; message: string; at: string; status: "pending" | "accepted" | "declined" };
export type Profile = {
  cv: Cv; uploadedCv?: { name: string; data: string }; applications: Record<string, Application>; projects: Project[];
  internship: Record<string, { documents: string[]; report: string }>;
  practice: Record<string, { answer: string; rating: number }>;
  requests: MentorRequest[];
};

export function newProfile(): Profile {
  return { cv: { ...emptyCv }, applications: {}, projects: [], internship: {}, practice: {}, requests: [] };
}
export function applicationStage(previous: Application | undefined, stage: Stage, notes: string, at: string): Application {
  return { stage, notes, history: previous?.stage === stage ? previous.history : [...(previous?.history ?? []), { stage, at }] };
}

const clean = (value: string) => value.trim().toLowerCase();
const aliases = new Map<string, typeof skills[number]>(skills.flatMap((entry) => [[clean(entry[0]), entry], [clean(entry[1]), entry]]));
export const canonicalSkill = (value: string) => aliases.get(clean(value))?.[0];
export function evidenceLevels(completed: string[], projects: Project[]) {
  const entries: Record<string, number> = {};
  for (const code of completed) for (const skill of courseSkills[code]?.skills ?? []) entries[skill] = 2;
  for (const project of projects) {
    const skill = canonicalSkill(project.skill);
    if (skill) entries[skill] = Math.max(entries[skill] ?? 0, project.level);
  }
  return entries;
}

export function jobMatch(requirements: string[], levels: Record<string, number>) {
  const rows = requirements.map((requirement) => {
    const entry = aliases.get(clean(requirement));
    if (!entry) return { requirement, status: "UNKNOWN" as const, rule: "Not in the catalog. Excluded from scoring.", suggestion: "" };
    const [skill, , idea] = entry;
    const level = levels[skill] ?? 0;
    const matched = level >= 2;
    const course = Object.values(courseSkills).find((item) => item.skills.includes(skill));
    return { requirement, status: matched ? "MATCHED" as const : "GAP" as const,
      rule: `${requirement === skill ? skill : `${requirement} → ${skill}`} · Level ${level} ${matched ? "meets" : "is below"} the required level 2.`,
      suggestion: matched ? "" : course ? `Take ${course.title} or try this project: ${idea}.` : `${idea}.` };
  });
  const matched = rows.filter((row) => row.status === "MATCHED").length;
  const scored = rows.filter((row) => row.status !== "UNKNOWN").length;
  return { rows, score: scored ? matched / scored * 100 : null };
}

export function portfolioScore(skill: string, completed: string[], projects: Project[]) {
  const courses = completed.filter((code) => courseSkills[code]?.skills.includes(skill)).map((code) => courseSkills[code].title);
  const work = projects.filter((project) => project.skill === skill);
  const verified = work.some((project) => project.verified && (project.link || project.file));
  return { courses, work, score: (courses.length ? 40 : 0) + (work.length ? 30 : 0) + (verified ? 30 : 0),
    missing: [...(courses.length ? [] : ["Add completed course evidence"]),
      ...(work.length ? [] : [`Add a project using ${skill}`]), ...(verified ? [] : ["Add a work sample and get it verified"])] };
}

export function canVerify(role: "staff" | "mentor" | "student", sample: Pick<Project, "link" | "file">, assigned: boolean) {
  return (role === "staff" || role === "mentor" && assigned) && Boolean(sample.link || sample.file);
}
