import { listNotifications, markNotificationRead } from "@/lib/foundation/notifications";
import { requireRole } from "@/lib/foundation/roles";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const identity = await requireRole(request);
  if (!identity.ok) return Response.json(null, { status: identity.status, headers });
  try {
    return Response.json(await listNotifications(identity.userId), { headers });
  } catch {
    return Response.json(null, { status: 503, headers });
  }
}

export async function PATCH(request: Request) {
  const identity = await requireRole(request);
  if (!identity.ok) return Response.json(null, { status: identity.status, headers });
  const input = await request.json().catch(() => null);
  const id = input?.id;
  if (typeof id !== "string" || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)) {
    return Response.json(null, { status: 400, headers });
  }
  try {
    await markNotificationRead(identity.userId, id);
    return new Response(null, { status: 204, headers });
  } catch {
    return Response.json(null, { status: 503, headers });
  }
}
