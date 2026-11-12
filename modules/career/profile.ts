import type { Prisma } from "@/lib/generated/prisma/client";
import { foundationDb } from "@/lib/foundation/db";
import { demoStudentId, getCompletedCourses } from "@/modules/academics/services";
import { newProfile, type Profile } from "./rules";

export class CareerInput extends Error {}

export function text(value: unknown, max: number, required = false) {
  const result = typeof value === "string" ? value.trim() : "";
  if (result.length > max || (required && !result)) throw new CareerInput(`Enter text up to ${max} characters.`);
  return result;
}

export function mentorKey(userId: string) {
  return process.env.CAREER_MENTOR_ACCOUNTS?.split(",").find((entry) => entry.split("=")[1] === userId)?.split("=")[0];
}

export function completedCourses(userId: string) {
  return userId === process.env.CAREER_DEMO_STUDENT_USER_ID ? getCompletedCourses(demoStudentId).map(({ code }) => code) : [];
}

export async function updateProfile(userId: string, update: (profile: Profile) => void) {
  const db = foundationDb();
  const initial = newProfile();
  await db.careerProfile.createMany({ data: [{ userId, data: initial as unknown as Prisma.InputJsonValue }], skipDuplicates: true });
  for (let attempt = 0; attempt < 4; attempt++) {
    const row = await db.careerProfile.findUniqueOrThrow({ where: { userId } });
    const profile = row.data as unknown as Profile;
    update(profile);
    const result = await db.careerProfile.updateMany({ where: { userId, version: row.version },
      data: { data: profile as unknown as Prisma.InputJsonValue, version: { increment: 1 } },
    });
    if (result.count) return profile;
  }
  throw new CareerInput("Another update is in progress. Try again.");
}
