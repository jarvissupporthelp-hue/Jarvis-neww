import { authorize } from "@/lib/authorization";
import { createStudyClient } from "@/lib/study-context";
import { offeringIdPattern } from "@/modules/academics/portal-types";

function reply(body: object, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request: Request) {
  const caller = await authorize(request, ["student", "lecturer", "admin"]);
  if (!caller.ok) return reply({}, caller.status);
  const authorization = request.headers.get("authorization");
  const client = authorization && createStudyClient(authorization);
  if (!client) return reply({}, 503);

  const offeringId = new URL(request.url).searchParams.get("offering");
  if (offeringId !== null && !offeringIdPattern.test(offeringId)) return reply({}, 404);
  const query = client.from("course_offerings")
    .select("id,course:courses!inner(code,name),semester:semesters!inner(name),group:student_groups(name)")
    .order("id");
  const { data: courses, error } = await (offeringId ? query.eq("id", offeringId) : query);
  if (error || !courses) return reply({}, 503);
  if (offeringId && !courses.length) return reply({}, 404);

  const assignments = offeringId && caller.role !== "admin"
    ? await client.from("course_assignments").select("id,offering_id,title,brief,due_on,due_at")
      .eq("offering_id", offeringId).order("due_on").order("due_at").order("id")
    : null;
  return reply({ role: caller.role, courses, assignments: assignments?.data ?? null });
}
