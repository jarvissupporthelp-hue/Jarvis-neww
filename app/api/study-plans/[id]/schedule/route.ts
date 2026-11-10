import { authorize } from "@/lib/authorization";
import { createStudyClient } from "@/lib/study-context";
import { proposeStudySchedule, type ScheduleInput } from "@/lib/study-scheduler";

function reply(body: object, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = await authorize(request, ["student"]);
  if (!caller.ok) return reply({ error: "Active student access required." }, caller.status);

  const { id } = await params;
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
    return reply({ error: "Study plan not found." }, 404);
  }

  const token = request.headers.get("authorization");
  const client = token && createStudyClient(token);
  if (!client) return reply({ error: "Schedule preview unavailable." }, 503);

  const { data, error } = await client.rpc("study_schedule_inputs", { p_plan_id: id });
  if (error?.code === "42501") return reply({ error: "Active student access required." }, 403);
  if (error) return reply({ error: "Could not load your timetable and study preferences." }, 503);
  if (!data) return reply({ error: "Study plan not found." }, 404);

  return reply(proposeStudySchedule(data as unknown as ScheduleInput));
}
