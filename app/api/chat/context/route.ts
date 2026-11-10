import { authorize } from "@/lib/authorization";
import { createStudyClient, loadStudyContext } from "@/lib/study-context";

function reply(body: object, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request: Request) {
  const caller = await authorize(request, ["student"]);
  if (!caller.ok) return reply({ error: "Active student access required." }, caller.status);

  const token = request.headers.get("authorization");
  const client = token && createStudyClient(token);
  if (!client) return reply({ error: "Study context unavailable." }, 503);

  const result = await loadStudyContext(client);
  if (!result.context) return reply({ error: "Study context unavailable." }, result.forbidden ? 403 : 503);
  return reply(result.context);
}
