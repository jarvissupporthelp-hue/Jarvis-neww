import { authorize } from "@/lib/authorization";
import { foundationDb } from "@/lib/foundation/db";
import { postings, questions } from "@/modules/career/catalog";
import { CareerInput, completedCourses, mentorKey, text, updateProfile } from "@/modules/career/profile";
import { applicationStage, canVerify, canonicalSkill, cvFields, newProfile, stages, type Profile, type Stage } from "@/modules/career/rules";

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const fail = (error: string, status: number) => Response.json({ error }, { status });
const roles = ["student", "lecturer", "admin"] as const;
const documents = ["Agreement", "Learning objectives", "Supervisor evaluation"];

function reviewer(role: typeof roles[number], userId: string) {
  if (role === "student") return "student";
  return role === "lecturer" && mentorKey(userId) ? "mentor" : "staff";
}

export async function GET(request: Request) {
  const identity = await authorize(request, roles);
  if (!identity.ok) return fail("Sign in to use your private Career workspace.", identity.status);
  try {
    const db = foundationDb();
    const role = reviewer(identity.role, identity.userId);
    if (role === "student") {
      const row = await db.careerProfile.findUnique({ where: { userId: identity.userId } });
      return Response.json({ role, profile: row?.data ?? newProfile(), completed: completedCourses(identity.userId) });
    }
    const key = mentorKey(identity.userId);
    const rows = await db.careerProfile.findMany({ where: role === "mentor" ? { data: { path: ["requests"], array_contains: [{ mentorId: key! }] } } : {}, take: 100 });
    return Response.json({ role, review: rows.flatMap(({ userId, data }) => {
      const profile = data as unknown as Profile;
      const requests = profile.requests.filter((item) => role === "mentor" ? item.mentorId === key : true);
      const projects = role === "staff" || requests.some((item) => item.status === "accepted")
        ? profile.projects.filter((item) => !item.verified && (item.link || item.file)) : [];
      return projects.length || requests.length ? [{ userId, projects, requests }] : [];
    }) });
  } catch {
    return fail("Career data is unavailable. Check the Career database migration.", 503);
  }
}

export async function POST(request: Request) {
  const identity = await authorize(request, roles);
  if (!identity.ok) return fail("Sign in to update Career.", identity.status);
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") return fail("Invalid request.", 400);
    const role = reviewer(identity.role, identity.userId);
    const id = String(body.id ?? "");
    const at = new Date().toISOString();
    if (role !== "student") {
      const userId = String(body.userId);
      if (!uuid.test(userId) || !["verify", "respond"].includes(body.action)) return fail("Invalid review.", 400);
      await updateProfile(userId, (profile) => {
        const key = mentorKey(identity.userId);
        if (body.action === "respond") {
          const item = profile.requests.find((entry) => entry.id === id && entry.status === "pending" && (role === "staff" || entry.mentorId === key));
          if (!item || !["accepted", "declined"].includes(body.status)) throw new CareerInput("This request cannot be updated.");
          item.status = body.status;
        } else {
          const project = profile.projects.find((entry) => entry.id === id);
          const assigned = profile.requests.some((entry) => entry.mentorId === key && entry.status === "accepted");
          if (!project || !canVerify(role, project, assigned)) throw new CareerInput("This work sample cannot be verified.");
          project.verified = true;
        }
      });
      return Response.json({ ok: true });
    }
    const profile = await updateProfile(identity.userId, (current) => {
      const posting = postings.find((entry) => entry.id === id);
      switch (body.action) {
        case "application": {
          if (!posting || !stages.includes(body.stage)) throw new CareerInput("Choose a posting and stage.");
          current.applications[id] = applicationStage(current.applications[id], body.stage as Stage,
            body.notes === undefined ? current.applications[id]?.notes ?? "" : text(body.notes, 2500), at);
          break;
        }
        case "internship": {
          if (posting?.type !== "Internship" || !Array.isArray(body.documents)) throw new CareerInput("Choose an internship.");
          current.internship[id] = { documents: documents.filter((item) => body.documents.includes(item)), report: text(body.report, 6000) };
          break;
        }
        case "cv":
          for (const field of cvFields) current.cv[field] = text(body.cv?.[field], 2200);
          break;
        case "practice": {
          const rating = Number(body.rating);
          if (!questions[Number(id)] || !Number.isInteger(rating) || rating < 1 || rating > 5) throw new CareerInput("Choose a question and a rating from 1 to 5.");
          current.practice[id] = { answer: text(body.answer, 2500, true), rating };
          break;
        }
        case "upload-cv": {
          const name = text(body.name, 140, true);
          const data = text(body.data, 1400000, true);
          const pdf = Buffer.from(data, "base64");
          if (!name.toLowerCase().endsWith(".pdf") || pdf.length > 1048576 || pdf.toString("base64") !== data
            || pdf.subarray(0, 5).toString("ascii") !== "%PDF-" || !pdf.subarray(-1024).includes(Buffer.from("%%EOF"))) {
            throw new CareerInput("Choose a PDF file up to 1 MB.");
          }
          current.uploadedCv = { name, data };
          break;
        }
        case "remove-cv":
          delete current.uploadedCv;
          break;
        case "project": {
          const skill = canonicalSkill(text(body.skill, 100, true));
          const level = Number(body.level);
          const link = text(body.link, 500);
          const title = text(body.title, 120, true);
          if (!skill || ![1, 2, 3].includes(level) || current.projects.length >= 25) throw new CareerInput("Choose a skill and level, or review your existing projects.");
          if (link && !URL.canParse(link)) throw new CareerInput("Enter a valid link.");
          if (link && !["http:", "https:"].includes(new URL(link).protocol)) throw new CareerInput("Use an HTTP or HTTPS link.");
          const file = body.file && { name: text(body.file.name, 140, true), data: text(body.file.data, 270000, true) };
          if (file && !/^[A-Za-z0-9+/]+={0,2}$/.test(file.data)) throw new CareerInput("Choose a valid file up to 200 KB.");
          if (file && current.projects.reduce((total, project) => total + (project.file?.data.length ?? 0), 0) + file.data.length > 1100000) {
            throw new CareerInput("The combined work-sample upload limit has been reached. Add a link instead.");
          }
          current.projects.push({ id: crypto.randomUUID(), skill, title, level, link, ...(file ? { file } : {}), verified: false });
          break;
        }
        default: throw new CareerInput("Unknown Career action.");
      }
    });
    return Response.json({ profile });
  } catch (error) {
    return error instanceof CareerInput ? fail(error.message, 400) : fail("Career data could not be saved.", 503);
  }
}
