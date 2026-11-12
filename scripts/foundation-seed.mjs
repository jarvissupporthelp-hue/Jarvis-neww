import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client.ts";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "node:process";

try { loadEnvFile(); } catch (error) { if (error.code !== "ENOENT") throw error; }

const { DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, JARVIS_DEMO_PASSWORD } = process.env;
const localHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);
const database = DATABASE_URL && new URL(DATABASE_URL);
const authUrl = NEXT_PUBLIC_SUPABASE_URL && new URL(NEXT_PUBLIC_SUPABASE_URL);
if (!database || !authUrl || !localHosts.has(database.hostname) || !localHosts.has(authUrl.hostname)
  || database.searchParams.get("schema") !== "foundation" || !SUPABASE_SECRET_KEY
  || !JARVIS_DEMO_PASSWORD || JARVIS_DEMO_PASSWORD.length < 12) {
  throw new Error("Seed requires local Supabase, the foundation schema, and a demo password of at least 12 characters.");
}

const auth = createClient(authUrl.href, SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const databaseUrl = new URL(DATABASE_URL);
databaseUrl.searchParams.delete("schema");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl.toString() }, { schema: "foundation" }) });
const roles = ["student", "staff", "admin"];
const courses = [
  ["NET", "Computer Networks"], ["DB", "Databases"], ["SYS", "Operating Systems"],
  ["ALG", "Algorithms"], ["MATH", "Applied Mathematics"], ["FR", "Academic French"],
];

async function accounts() {
  const existing = new Map();
  for (let page = 1; ; page++) {
    const { data, error } = await auth.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error("Could not list local demo identities.");
    for (const user of data.users) existing.set(user.email, user.id);
    if (data.users.length < 100) break;
  }
  const identities = [];
  for (const role of roles) {
    const email = `jarvis-${role}@example.com`;
    let id = existing.get(email);
    if (!id) {
      const { data, error } = await auth.auth.admin.createUser({ email, password: JARVIS_DEMO_PASSWORD, email_confirm: true });
      if (error || !data.user) throw new Error("Could not create a local demo identity.");
      id = data.user.id;
    }
    identities.push({ id, role });
  }
  return identities;
}

try {
  const [group] = await db.$queryRaw`select id from public.student_groups where code = 'DEMO-IMA-Y2'`;
  if (!group) throw new Error("Run the local Supabase seed first.");
  const identities = await accounts();
  await db.$transaction(async (tx) => {
    for (const { id, role } of identities) {
      const legacyRole = role === "staff" ? "lecturer" : role;
      const groupId = role === "student" ? group.id : null;
      await tx.$executeRaw`insert into public.profiles (id, display_name) values (${id}::uuid, ${"Demo " + role}) on conflict (id) do nothing`;
      await tx.$executeRaw`insert into public.memberships (user_id, role, status, student_group_id)
        values (${id}::uuid, ${legacyRole}::public.membership_role, 'active', ${groupId}::uuid)
        on conflict (user_id) do update set role = excluded.role, status = excluded.status, student_group_id = excluded.student_group_id`;
      await tx.user.upsert({ where: { id }, create: { id, role }, update: { role } });
    }
    const studentId = identities.find(({ role }) => role === "student").id;
    const student = await tx.student.upsert({
      where: { userId: studentId },
      create: { userId: studentId, faculty: "IKM", year: 2 },
      update: {},
    });
    for (const [code, title] of courses) {
      const course = await tx.course.upsert({ where: { code }, create: { code, title, credits: 5, ects: 5 }, update: {} });
      await tx.enrollment.upsert({
        where: { studentId_courseId: { studentId: student.id, courseId: course.id } },
        create: { studentId: student.id, courseId: course.id, status: "active" },
        update: {},
      });
    }
    for (let index = 0; index < 10; index++) {
      const source = "demo";
      const sourceId = String(index + 1);
      await tx.deadline.upsert({
        where: { studentId_source_sourceId: { studentId: student.id, source, sourceId } },
        create: { studentId: student.id, title: `Demo deadline ${sourceId}`, dueAt: new Date(Date.now() + 86_400_000 * index), source, sourceId, status: "open" },
        update: {},
      });
    }
    for (let index = 0; index < 5; index++) {
      const id = `ad01e777-4531-46de-8acd-00000000000${index}`;
      await tx.notification.upsert({
        where: { id },
        create: { id, userId: studentId, type: index === 0 ? "welcome" : "reminder", payload: { demo: true } },
        update: {},
      });
    }
  });
  console.log("Seeded three demo roles, six courses, ten deadlines, and five notifications.");
} catch {
  console.error("Local seed failed. Check Supabase, migrations, and the local seed configuration.");
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
