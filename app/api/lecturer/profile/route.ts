import { authorize } from "@/lib/authorization";
import { createStudyClient } from "@/lib/study-context";

const fields = ["professor_name", "course_plan", "teaching_style", "explanation_preferences", "assessment_style", "course_rules"] as const;
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function reply(body: object, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function getClient(request: Request) {
  const caller = await authorize(request, ["lecturer"]);
  if (!caller.ok) return { response: reply({ error: "Active lecturer access required." }, caller.status) };
  const token = request.headers.get("authorization");
  const client = token && createStudyClient(token);
  return client ? { client, userId: caller.userId } : { response: reply({ error: "Lecturer workspace unavailable." }, 503) };
}

export async function GET(request: Request) {
  const access = await getClient(request);
  if ("response" in access) return access.response;
  const offeringId = new URL(request.url).searchParams.get("course") ?? "";
  if (!uuid.test(offeringId)) return reply({ error: "Choose an assigned course." }, 400);
  const { data, error } = await access.client.from("professor_ai_profiles")
    .select("offering_id,professor_name,course_plan,teaching_style,explanation_preferences,assessment_style,course_rules,updated_at")
    .eq("offering_id", offeringId).maybeSingle();
  if (error) return reply({ error: "Could not load the teaching profile." }, 503);
  return reply({ profile: data ?? { offering_id: offeringId, professor_name: "", course_plan: "", teaching_style: "", explanation_preferences: "", assessment_style: "", course_rules: "" } });
}

export async function PUT(request: Request) {
  const access = await getClient(request);
  if ("response" in access) return access.response;
  const input = await request.json().catch(() => null);
  if (!input || typeof input.offeringId !== "string" || !uuid.test(input.offeringId)
    || fields.some((key) => typeof input[key] !== "string" || input[key].length > (key === "course_plan" ? 5000 : 2000))) {
    return reply({ error: "Complete the profile fields within their character limits." }, 400);
  }
  const profile = Object.fromEntries(fields.map((key) => [key, input[key].trim()]));
  const { data, error } = await access.client.from("professor_ai_profiles").upsert({
    offering_id: input.offeringId, ...profile, updated_by: access.userId,
  }).select("offering_id,professor_name,course_plan,teaching_style,explanation_preferences,assessment_style,course_rules,updated_at").single();
  if (error?.code === "42501") return reply({ error: "You can edit profiles only for courses assigned to you." }, 403);
  if (error) return reply({ error: "Could not save the teaching profile." }, 503);
  return reply({ profile: data });
}
