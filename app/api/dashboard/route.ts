import { createClient } from "@supabase/supabase-js";
import { assignmentDeadlines, type AssignmentDeadline } from "@/lib/course-assignments";
import { authorize } from "@/lib/authorization";

function reply(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request: Request) {
  const caller = await authorize(request, ["student"]);
  if (!caller.ok) return reply({ error: "Active student access required." }, caller.status);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const authorization = request.headers.get("authorization");
  if (!url || !key || !authorization) return reply({ error: "Dashboard unavailable." }, 503);

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const localDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Yerevan", dateStyle: "short" }).format(new Date());
  const [dashboard, deadlines] = await Promise.all([
    supabase.rpc("student_dashboard"),
    assignmentDeadlines(supabase).gte("due_on", localDate).limit(10).returns<AssignmentDeadline[]>(),
  ]);
  const { data, error } = dashboard;
  if (error?.code === "42501") return reply({ error: "Active student access required." }, 403);
  if (error) return reply({ error: "Dashboard unavailable." }, 503);
  return reply({ ...data, assignmentDeadlines: deadlines.error ? null : deadlines.data });
}
