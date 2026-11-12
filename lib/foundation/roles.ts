import { authorize } from "../authorization";

export type FoundationRole = "student" | "staff" | "admin";

export async function requireRole(
  request: Request,
  allowed: readonly FoundationRole[] = ["student", "staff", "admin"],
) {
  const result = await authorize(request, allowed.map((role) => role === "staff" ? "lecturer" : role));
  if (!result.ok) return result;
  const role: FoundationRole = result.role === "lecturer" ? "staff" : result.role;
  return { ...result, role };
}
