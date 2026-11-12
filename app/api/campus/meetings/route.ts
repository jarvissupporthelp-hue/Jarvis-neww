import { Prisma } from "@prisma/client";
import { foundationDb } from "@/lib/foundation/db";
import { authorize } from "@/lib/authorization";

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const fail = (error: string, status: number) => Response.json({ error }, { status });

export async function GET(request: Request) {
  const identity = await authorize(request, ["student", "lecturer"]);
  if (!identity.ok) return fail("Sign in as a student or lecturer.", identity.status);
  try {
    const db = foundationDb();
    const [people, meetings] = await Promise.all([
      db.$queryRaw<{ id: string; name: string; role: string }[]>`
        SELECT p.id, p.display_name AS name, m.role::text FROM public.profiles p
        JOIN public.memberships m ON m.user_id = p.id WHERE m.status = 'active'
        AND (m.role = 'lecturer' OR (m.role = 'student' AND m.student_group_id =
          (SELECT student_group_id FROM public.memberships WHERE user_id = ${identity.userId}::uuid)))
        ORDER BY p.display_name`,
      db.campusMeeting.findMany({ where: { OR: [
        { studentId: identity.userId }, { lecturerId: identity.userId }, { participants: { has: identity.userId } },
      ] }, orderBy: { startAt: "desc" }, take: 100 }),
    ]);
    return Response.json({ people, meetings, viewer: identity.userId, role: identity.role });
  } catch {
    return fail("Meetings are unavailable. Check the Campus database configuration.", 503);
  }
}

export async function POST(request: Request) {
  const identity = await authorize(request, ["student", "lecturer"]);
  if (!identity.ok) return fail("Sign in as a student or lecturer.", identity.status);
  try {
    const body = await request.json();
    const db = foundationDb();
    if (body.action === "request" && identity.role === "student") {
      const { lecturerId } = body;
      const topic = typeof body.topic === "string" ? body.topic.trim() : "";
      const agenda = typeof body.agenda === "string" ? body.agenda.trim() : "";
      const startAt = new Date(String(body.startAt));
      const participants: string[] = Array.isArray(body.participants) ? [...new Set<string>(body.participants)] : [];
      if (typeof lecturerId !== "string" || !uuid.test(lecturerId) || participants.length > 8
        || participants.some((id) => typeof id !== "string" || !uuid.test(id) || id === identity.userId)
        || !topic || topic.length > 100 || !agenda || agenda.length > 1000
        || !Number.isFinite(+startAt) || +startAt <= Date.now() || +startAt > Date.now() + 90 * 86400000) {
        return fail("Choose a lecturer and future time, and enter a topic and agenda.", 400);
      }
      const [allowed] = await db.$queryRaw<{ lecturer: boolean; participants: number }[]>`
        SELECT EXISTS (SELECT 1 FROM public.memberships WHERE user_id = ${lecturerId}::uuid
          AND role = 'lecturer' AND status = 'active') AS lecturer,
        (SELECT count(*)::int FROM public.memberships WHERE user_id IN
          (${Prisma.join((participants.length ? participants : [identity.userId]).map((id) => Prisma.sql`${id}::uuid`))})
          AND role = 'student' AND status = 'active' AND student_group_id =
          (SELECT student_group_id FROM public.memberships WHERE user_id = ${identity.userId}::uuid)) AS participants`;
      if (!allowed.lecturer || (participants.length && allowed.participants !== participants.length)) return fail("Choose active participants from the directory.", 400);
      await db.campusMeeting.create({ data: { studentId: identity.userId, lecturerId, topic, agenda, startAt, participants } });
    } else if (["accept", "decline", "cancel"].includes(body.action)) {
      const response = typeof body.response === "string" ? body.response.trim() : "";
      if (!uuid.test(String(body.id)) || response.length > 1000) return fail("Check the meeting response.", 400);
      const cancel = body.action === "cancel";
      if ((cancel && identity.role !== "student") || (!cancel && identity.role !== "lecturer")) return fail("You cannot change this meeting.", 403);
      const changed = await db.campusMeeting.updateMany({
        where: { id: body.id, ...(cancel ? { studentId: identity.userId } : { lecturerId: identity.userId }),
          status: { in: cancel ? ["pending", "accepted"] : ["pending"] }, startAt: { gt: new Date() } },
        data: cancel ? { status: "cancelled" } : { status: body.action === "accept" ? "accepted" : "declined", response },
      });
      if (!changed.count) return fail("This meeting can no longer be changed.", 409);
    } else return fail("Unknown meeting action.", 400);
    return Response.json({ ok: true });
  } catch (error) {
    const conflict = error instanceof Prisma.PrismaClientKnownRequestError
      && (error.code === "P2004" || error.code === "P2010" && error.meta?.code === "23P01");
    return fail(conflict ? "The lecturer already has a meeting at that time." : "Could not save the meeting. Check the Campus database configuration.", conflict ? 409 : 503);
  }
}
