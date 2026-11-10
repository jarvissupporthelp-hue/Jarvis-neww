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

  const saved = await client.from("study_sessions")
    .select("id,topic_position,title,session_date,starts_at,ends_at,completed_at,confidence_after")
    .eq("plan_id", id).eq("student_id", caller.userId)
    .order("session_date").order("starts_at");
  if (saved.error) return reply({ error: "Could not load confirmed sessions." }, 503);
  if (saved.data.length) {
    return reply({
      confirmed: true,
      sessions: saved.data.map((session) => ({
        id: session.id, topicPosition: session.topic_position, title: session.title, date: session.session_date,
        completedAt: session.completed_at, confidenceAfter: session.confidence_after,
        start: session.starts_at.slice(0, 5), end: session.ends_at.slice(0, 5),
      })),
      unscheduled: [],
    });
  }

  const { data, error } = await client.rpc("study_schedule_inputs", { p_plan_id: id });
  if (error?.code === "42501") return reply({ error: "Active student access required." }, 403);
  if (error) return reply({ error: "Could not load your timetable and study preferences." }, 503);
  if (!data) return reply({ error: "Study plan not found." }, 404);

  return reply(proposeStudySchedule(data as unknown as ScheduleInput));
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = await authorize(request, ["student"]);
  if (!caller.ok) return reply({ error: "Active student access required." }, caller.status);

  const { id } = await params;
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
    return reply({ error: "Study plan not found." }, 404);
  }
  const input = await request.json().catch(() => null);
  if (input?.confirmed !== true || !Array.isArray(input.sessions) || input.sessions.length < 1 || input.sessions.length > 11) {
    return reply({ error: "Review and confirm a schedule with at least one session." }, 400);
  }
  const token = request.headers.get("authorization");
  const client = token && createStudyClient(token);
  if (!client) return reply({ error: "Schedule confirmation unavailable." }, 503);

  const result = await client.rpc("confirm_study_schedule", { p_plan_id: id, p_sessions: input.sessions });
  if (!result.error) return reply({ saved: result.data });
  const { code, message } = result.error;
  if (code === "23P01") return reply({ error: message }, 409);
  if (code === "P0002") return reply({ error: "Study plan not found." }, 404);
  if (code === "42501") return reply({ error: "Active student access required." }, 403);
  if (code.startsWith("22") || code.startsWith("23")) return reply({ error: "Invalid schedule. Generate a fresh preview." }, 400);
  return reply({ error: "Could not confirm the schedule. Try again shortly." }, 503);
}
