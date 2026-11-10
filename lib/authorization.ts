type Role = "student" | "lecturer" | "admin";

type Authorization =
  | { ok: true; userId: string; role: Role }
  | { ok: false; status: 401 | 403 | 503 };

export async function authorize(
  request: Request,
  allowedRoles: readonly Role[],
): Promise<Authorization> {
  const token = request.headers.get("authorization");
  if (!token || !/^Bearer [^\s]+$/i.test(token)) {
    return { ok: false, status: 401 };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { ok: false, status: 503 };

  const options = {
    headers: { apikey: key, authorization: token },
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  } as const;

  try {
    const identity = await fetch(new URL("/auth/v1/user", url), options);
    if (identity.status === 401 || identity.status === 403) {
      return { ok: false, status: 401 };
    }
    if (!identity.ok) return { ok: false, status: 503 };

    const user = await identity.json();
    if (typeof user?.id !== "string" || !user.id) return { ok: false, status: 503 };

    const membershipUrl = new URL("/rest/v1/memberships", url);
    membershipUrl.search = new URLSearchParams({
      select: "role",
      user_id: `eq.${user.id}`,
      status: "eq.active",
    }).toString();

    const membership = await fetch(membershipUrl, options);
    if (membership.status === 401) return { ok: false, status: 401 };
    if (!membership.ok) return { ok: false, status: 503 };

    const rows = await membership.json();
    if (!Array.isArray(rows)) return { ok: false, status: 503 };
    const role = allowedRoles.find((candidate) => candidate === rows[0]?.role);
    if (!role) return { ok: false, status: 403 };

    return { ok: true, userId: user.id, role };
  } catch {
    return { ok: false, status: 503 };
  }
}
