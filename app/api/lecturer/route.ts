import { authorize } from "@/lib/authorization";
import { createStudyClient } from "@/lib/study-context";

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function reply(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function access(request: Request) {
  const caller = await authorize(request, ["lecturer"]);
  if (!caller.ok) return reply({ error: "Active lecturer access required." }, caller.status);
  const token = request.headers.get("authorization");
  const client = token && createStudyClient(token);
  return client || reply({ error: "Lecturer workspace unavailable." }, 503);
}

export async function GET(request: Request) {
  const client = await access(request);
  if (client instanceof Response) return client;
  const id = new URL(request.url).searchParams.get("course");
  if (id && !uuid.test(id)) return reply({ error: "Assigned course not found." }, 404);

  const courses = client.from("course_offerings")
    .select("id,course:courses!inner(name,code),group:student_groups!inner(name),semester:semesters!inner(name),lecturer_assignments!inner()");
  if (!id) {
    const result = await courses.order("id");
    if (result.error) return reply({ error: "Could not load assigned courses." }, 503);
    return reply({ courses: result.data });
  }

  const [course, assignments] = await Promise.all([
    courses.eq("id", id).maybeSingle(),
    client.from("course_assignments").select("id,offering_id,title,brief,due_on,due_at")
      .eq("offering_id", id).order("due_on").order("due_at").order("id"),
  ]);
  if (course.error || assignments.error) return reply({ error: "Could not load the course page." }, 503);
  if (!course.data) return reply({ error: "Assigned course not found." }, 404);
  return reply({ course: course.data, assignments: assignments.data });
}

export async function POST(request: Request) {
  const client = await access(request);
  if (client instanceof Response) return client;
  const input = await request.json().catch(() => null);
  if (typeof input?.id !== "string" || !uuid.test(input.id)
    || typeof input.offeringId !== "string" || !uuid.test(input.offeringId)
    || typeof input.title !== "string" || !input.title.trim() || input.title.trim().length > 120
    || typeof input.brief !== "string" || !input.brief.trim() || input.brief.trim().length > 4000
    || typeof input.dueOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.dueOn)
    || typeof input.dueAt !== "string" || !/^\d{2}:\d{2}$/.test(input.dueAt)) {
    return reply({ error: "Enter a title, assignment brief, and deadline." }, 400);
  }
  const { data, error } = await client.rpc("publish_course_assignment", {
    p_id: input.id, p_offering_id: input.offeringId, p_title: input.title, p_brief: input.brief,
    p_due_on: input.dueOn, p_due_at: input.dueAt,
  });
  if (!error) return reply(data);
  if (error.code === "42501") return reply({ error: "You can publish only for a course group you teach." }, 403);
  if (error.code === "23505") return reply({ error: error.message }, 409);
  if (error.code.startsWith("22") || error.code === "23514") {
    return reply({ error: "Enter a valid brief and a future deadline in Yerevan time." }, 400);
  }
  return reply({ error: "Could not publish the assignment. Try again." }, 503);
}
