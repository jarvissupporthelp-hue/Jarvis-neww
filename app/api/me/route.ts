import { authorize } from "@/lib/authorization";
import { createStudyClient } from "@/lib/study-context";

export async function GET(request: Request) {
  const result = await authorize(request, ["student", "lecturer", "admin"]);
  const headers = { "Cache-Control": "private, no-store" };

  if (result.ok) {
    const token = request.headers.get("authorization");
    const client = token && createStudyClient(token);
    if (!client) return Response.json({ error: "Identity unavailable" }, { status: 503, headers });
    const profile = await client.from("profiles").select("display_name").eq("id", result.userId).maybeSingle();
    if (profile.error || !profile.data) return Response.json({ error: "Identity unavailable" }, { status: 503, headers });
    return Response.json({ userId: result.userId, role: result.role, displayName: profile.data.display_name }, { headers });
  }

  const message = {
    401: "Sign in required",
    403: "Active membership required",
    503: "Authorization service unavailable",
  }[result.status];

  return Response.json({ error: message }, { status: result.status, headers });
}
