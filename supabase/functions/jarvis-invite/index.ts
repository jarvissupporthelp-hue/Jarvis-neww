import { createClient } from "npm:@supabase/supabase-js@2.90.1";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function result(message: string, status: number) {
  return Response.json({ message }, { status, headers: { "Cache-Control": "no-store" } });
}

function permittedRedirect(input: unknown): string | null {
  if (typeof input !== "string") return null;
  try {
    const url = new URL(input);
    const hostname = url.hostname.toLowerCase();
    const allowed = hostname === "jarvis-three-olive.vercel.app"
      || /^jarvis-[a-z0-9]+-jarvis-8637\.vercel\.app$/.test(hostname);
    if (url.protocol !== "https:" || !allowed || url.port || url.username || url.password || url.hash
      || url.pathname !== "/account" || url.searchParams.get("flow") !== "invite"
      || Array.from(url.searchParams.keys()).some((key) => key !== "flow")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return result("Method not allowed.", 405);
  const url = Deno.env.get("SUPABASE_URL");
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !secret) return result("Invitation service unavailable.", 503);

  const authorization = request.headers.get("authorization") ?? "";
  if (!/^Bearer \S+$/.test(authorization)) return result("Sign in required.", 401);

  const admin = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data: identity, error: identityError } = await admin.auth.getUser(authorization.slice(7));
  if (identityError || !identity.user) return result("Sign in required.", 401);

  const { data: member, error: membershipError } = await admin.from("memberships")
    .select("role,status").eq("user_id", identity.user.id).maybeSingle();
  if (membershipError) return result("Could not verify admin permissions.", 503);
  if (member?.role !== "admin" || member?.status !== "active") return result("Active admin access required.", 403);

  const input = await request.json().catch(() => null);
  const email = typeof input?.email === "string" ? input.email.trim().toLowerCase() : "";
  const role = input?.role;
  const group = role === "student" ? input?.groupId : null;
  const redirectTo = permittedRedirect(input?.redirectTo);
  if (!email || email.length > 254 || !emailPattern.test(email) || !redirectTo
    || (role !== "student" && role !== "lecturer")
    || (role === "student" && (typeof group !== "string" || !uuidPattern.test(group)))) {
    return result("Enter a valid email, role and student group.", 400);
  }

  // Save only new approvals; never overwrite a user's previously approved role.
  const { error: approvalError } = await admin.from("account_invitations")
    .upsert({ email, role, student_group_id: group }, { onConflict: "email", ignoreDuplicates: true });
  if (approvalError?.code === "23503") return result("Student group does not exist.", 400);
  if (approvalError) return result("Could not save the invitation approval.", 503);

  const { data: approval, error: lookupError } = await admin.from("account_invitations")
    .select("role,student_group_id,activated_at").eq("email", email).single();
  if (lookupError || !approval) return result("Could not verify the invitation approval.", 503);
  if (approval.activated_at || approval.role !== role || approval.student_group_id !== group) {
    return result("This email already has an active or different approval.", 409);
  }

  // Supabase Auth handles token creation and sends mail using the project's SMTP.
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (inviteError) {
    if (/already (registered|exists)|already been registered/i.test(inviteError.message)) {
      return result("An account already exists. Ask the user to sign in or reset their password.", 409);
    }
    return result("Approval saved, but Supabase Auth could not send the invitation. Check SMTP settings and retry.", 502);
  }
  return result("Invitation email sent.", 200);
});
