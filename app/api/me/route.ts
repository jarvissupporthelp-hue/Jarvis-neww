import { authorize } from "@/lib/authorization";

export async function GET(request: Request) {
  const result = await authorize(request, ["student", "lecturer", "admin"]);
  const headers = { "Cache-Control": "private, no-store" };

  if (result.ok) {
    return Response.json({ userId: result.userId, role: result.role }, { headers });
  }

  const message = {
    401: "Sign in required",
    403: "Active membership required",
    503: "Authorization service unavailable",
  }[result.status];

  return Response.json({ error: message }, { status: result.status, headers });
}
