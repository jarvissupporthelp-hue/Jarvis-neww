import { authorize } from "@/lib/authorization";
import { createStudyClient } from "@/lib/study-context";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  const caller = await authorize(request, ["student"]);
  if (!caller.ok) return Response.json({ error: "Student access required." }, { status: caller.status, headers });
  const token = request.headers.get("authorization");
  const client = token && createStudyClient(token);
  if (!client) return Response.json({ error: "Usage unavailable." }, { status: 503, headers });
  const { data, error } = await client.rpc("get_chat_usage");
  if (error) return Response.json({ error: "Usage unavailable." }, { status: 503, headers });
  return Response.json(data, { headers });
}
