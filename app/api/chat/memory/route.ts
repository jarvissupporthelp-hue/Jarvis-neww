import { authorize } from "@/lib/authorization";
import { createStudyClient } from "@/lib/study-context";

const blank = { learning_preferences: "", current_goal: "", topics_to_practice: "" };
const headers = { "Cache-Control": "private, no-store" };
const reply = (body: object, status = 200) => Response.json(body, { status, headers });

async function access(request: Request) {
  const caller = await authorize(request, ["student"]);
  if (!caller.ok) return { response: reply({ error: "Active student access required." }, caller.status) };
  const token = request.headers.get("authorization");
  const client = token && createStudyClient(token);
  return client ? { client, userId: caller.userId } : { response: reply({ error: "Memory unavailable." }, 503) };
}

export async function GET(request: Request) {
  const auth = await access(request);
  if ("response" in auth) return auth.response;
  const { data, error } = await auth.client.from("student_ai_preferences")
    .select("learning_preferences,current_goal,topics_to_practice")
    .eq("student_id", auth.userId).maybeSingle();
  return error ? reply({ error: "Could not load your preferences." }, 503) : reply({ memory: data ?? blank });
}

export async function PUT(request: Request) {
  const auth = await access(request);
  if ("response" in auth) return auth.response;
  const input = await request.json().catch(() => null);
  const values = Object.fromEntries(Object.keys(blank).map((key) => [key, input?.[key]]));
  if (Object.values(values).some((value) => typeof value !== "string" || value.length > 1000)) {
    return reply({ error: "Each preference field must be under 1,000 characters." }, 400);
  }
  const existing = await auth.client.from("student_ai_preferences").select("student_id").eq("student_id", auth.userId).maybeSingle();
  if (existing.error) return reply({ error: "Could not save your preferences." }, 503);
  const query = existing.data
    ? auth.client.from("student_ai_preferences").update({ ...values, updated_at: new Date().toISOString() }).eq("student_id", auth.userId)
    : auth.client.from("student_ai_preferences").insert(values);
  const { data, error } = await query.select("learning_preferences,current_goal,topics_to_practice").single();
  return error ? reply({ error: "Could not save your preferences." }, 503) : reply({ memory: data });
}

export async function DELETE(request: Request) {
  const auth = await access(request);
  if ("response" in auth) return auth.response;
  const { error } = await auth.client.from("student_ai_preferences").delete().eq("student_id", auth.userId);
  return error ? reply({ error: "Could not clear your preferences." }, 503) : reply({ memory: blank });
}
