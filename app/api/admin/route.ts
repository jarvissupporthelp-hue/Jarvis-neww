import { createClient } from "@supabase/supabase-js";
import { authorize } from "@/lib/authorization";

function reply(body: object, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function run(request: Request, action: string, data: object) {
  const caller = await authorize(request, ["admin"]);
  if (!caller.ok) return reply({ error: "Active admin access required." }, caller.status);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const authorization = request.headers.get("authorization");
  if (!url || !key || !authorization) return reply({ error: "Admin service unavailable." }, 503);

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const result = await supabase.rpc("admin_workspace", { p_action: action, p_data: data });
  if (!result.error) return reply(result.data);

  const code = result.error.code;
  if (code === "42501") return reply({ error: "Active admin access required." }, 403);
  if (code === "23505") return reply({ error: "That record or assignment already exists." }, 409);
  if (code === "P0002") return reply({ error: "The record was not found or cannot be changed." }, 404);
  if (code.startsWith("22") || code.startsWith("23")) {
    return reply({ error: "Check the form values and selected records." }, 400);
  }
  return reply({ error: "Admin service unavailable." }, 503);
}

export function GET(request: Request) {
  return run(request, "list", {});
}

export async function POST(request: Request) {
  const input = await request.json().catch(() => null);
  const actions = ["user_status", "user_group", "group", "semester", "course", "offering", "assign", "unassign"];
  if (!actions.includes(input?.action) || !input?.data || typeof input.data !== "object" || Array.isArray(input.data)) {
    return reply({ error: "Invalid admin action." }, 400);
  }
  return run(request, input.action, input.data);
}
