import { createClient } from "@supabase/supabase-js";
import { authorize } from "@/lib/authorization";

function reply(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function run(request: Request, action: string, data: object) {
  const caller = await authorize(request, action === "list" ? ["student", "lecturer", "admin"] : ["admin"]);
  if (!caller.ok) return reply({ error: "Authorized JARVIS access required." }, caller.status);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const token = request.headers.get("authorization");
  if (!url || !key || !token) return reply({ error: "Timetable service unavailable." }, 503);

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: token } },
  });

  const result = await supabase.rpc("timetable", { p_action: action, p_data: data });
  if (!result.error) return reply(result.data);

  const { code, message } = result.error;
  if (code === "23P01") return reply({ error: message }, 409);
  if (code === "42501") return reply({ error: "Authorized JARVIS access required." }, 403);
  if (code === "P0002") return reply({ error: "Lesson no longer exists." }, 404);
  if (code === "22023") return reply({ error: message }, 400);
  if (code.startsWith("22") || code.startsWith("23")) return reply({ error: "Check the lesson details." }, 400);
  return reply({ error: "Timetable service unavailable." }, 503);
}

export function GET(request: Request) {
  const week = new URL(request.url).searchParams.get("week");
  if (!week || !/^\d{4}-\d{2}-\d{2}$/.test(week)) return reply({ error: "Choose a week." }, 400);
  return run(request, "list", { week });
}

export async function POST(request: Request) {
  const input = await request.json().catch(() => null);
  if (!["save", "remove"].includes(input?.action) || !input?.data
    || typeof input.data !== "object" || Array.isArray(input.data)) {
    return reply({ error: "Invalid timetable action." }, 400);
  }
  return run(request, input.action, input.data);
}
