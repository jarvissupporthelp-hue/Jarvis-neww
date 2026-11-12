import { foundationDb } from "@/lib/foundation/db";
import { requireRole } from "@/lib/foundation/roles";
import { isLocale } from "@/lib/locales";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const identity = await requireRole(request);
  if (!identity.ok) return Response.json(null, { status: identity.status, headers });
  try {
    const user = await foundationDb().user.findUnique({
      where: { id: identity.userId, deletedAt: null }, select: { locale: true },
    });
    return Response.json({ role: identity.role, locale: user?.locale ?? null, preferencesAvailable: true }, { headers });
  } catch {
    return Response.json({ role: identity.role, locale: null, preferencesAvailable: false }, { headers });
  }
}

export async function PATCH(request: Request) {
  const identity = await requireRole(request);
  if (!identity.ok) return Response.json(null, { status: identity.status, headers });
  const input = await request.json().catch(() => null);
  if (!isLocale(input?.locale)) return Response.json(null, { status: 400, headers });
  try {
    const { userId: id, role } = identity;
    const { locale } = input;
    await foundationDb().user.upsert({
      where: { id, deletedAt: null },
      create: { id, role, locale },
      update: { role, locale },
    });
    return Response.json({ locale }, { headers });
  } catch {
    return Response.json(null, { status: 503, headers });
  }
}
