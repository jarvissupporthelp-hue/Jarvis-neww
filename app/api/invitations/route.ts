import { createClient } from "@supabase/supabase-js";
import { authorize } from "@/lib/authorization";

function reply(message: string, status: number) {
  return Response.json({ message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const caller = await authorize(request, ["admin"]);
  if (!caller.ok) return reply("Active admin access required.", caller.status);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const origin = process.env.JARVIS_AUTH_ORIGIN;
  if (!url || !secret || !origin) return reply("Invitation delivery is not configured.", 503);

  const input = await request.json().catch(() => null);
  const email = typeof input?.email === "string" ? input.email.trim().toLowerCase() : "";
  const role = input?.role;
  const group = role === "student" ? input?.groupId : null;
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || (role !== "student" && role !== "lecturer")
    || (role === "student" && (typeof group !== "string" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(group)))) {
    return reply("Enter a valid email, role and student group.", 400);
  }

  const supabase = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: approvalError } = await supabase.from("account_invitations").upsert(
    { email, role, student_group_id: group },
    { onConflict: "email", ignoreDuplicates: true },
  );
  if (approvalError?.code === "23503") return reply("Student group does not exist.", 400);
  if (approvalError) return reply("Could not save the approval.", 503);

  const { data: approval, error: lookupError } = await supabase.from("account_invitations")
    .select("role, student_group_id, activated_at").eq("email", email).single();
  if (lookupError) return reply("Could not verify the approval.", 503);
  if (approval.activated_at || approval.role !== role || approval.student_group_id !== group) {
    return reply("This email already has an active or different approval.", 409);
  }

  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: new URL("/account?flow=invite", origin).toString(),
  });
  if (error) {
    return reply("Approval saved. Invitation delivery failed. Retry after checking email settings.", 502);
  }
  return reply("Invitation sent.", 200);
}
