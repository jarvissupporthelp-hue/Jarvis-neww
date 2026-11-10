"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState, type FormEvent } from "react";

type Flow = "signin" | "forgot" | "invite" | "recovery";
type Role = "student" | "lecturer" | "admin";
type Group = { id: string; name: string };

let client: SupabaseClient | undefined;

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Authentication is not configured.");
  return client ??= createClient(url, key);
}

async function currentRole(token: string): Promise<Role | null> {
  const response = await fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } });
  return response.ok ? (await response.json()).role : null;
}

const inputClass = "w-full rounded border border-[#789181] bg-white p-2";
const buttonClass = "rounded bg-[#1e3328] px-4 py-2 text-white disabled:opacity-50";

export function AccountForm() {
  const [flow, setFlow] = useState<Flow>("signin");
  const [role, setRole] = useState<Role | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [inviteRole, setInviteRole] = useState("student");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [linkReady, setLinkReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function initialize() {
      const location = new URL(window.location.href);
      const expected = location.searchParams.get("flow");
      const fragment = new URLSearchParams(location.hash.slice(1));
      const callback = expected === "invite" || expected === "recovery";
      const validFragment = callback && fragment.get("type") === expected && fragment.has("access_token");
      try {
        const { data } = await getClient().auth.getSession();
        if (!mounted) return;
        if (callback) {
          setFlow(expected);
          setLinkReady(Boolean(validFragment && data.session));
          if (!validFragment || !data.session) setMessage("This link is invalid, expired, or already used.");
          window.history.replaceState(null, "", "/account");
        } else if (data.session) {
          setRole(await currentRole(data.session.access_token));
        }
      } catch {
        if (mounted) setMessage("Authentication is unavailable. Try again shortly.");
      } finally {
        if (mounted) setReady(true);
      }
    }
    void initialize();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (role !== "admin") return;
    let mounted = true;
    void getClient().from("student_groups").select("id,name").order("name").then(({ data, error }) => {
      if (!mounted) return;
      if (error) setMessage("Could not load student groups.");
      else setGroups(data ?? []);
    });
    return () => { mounted = false; };
  }, [role]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get("email") ?? "").trim();
    const password = String(fields.get("password") ?? "");
    setBusy(true);
    setMessage("");

    try {
      const supabase = getClient();
      if (flow === "forgot") {
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: new URL("/account?flow=recovery", window.location.origin).toString(),
        });
        setMessage("If the account can receive a reset email, check its inbox.");
        return;
      }

      if (flow === "invite" || flow === "recovery") {
        if (!linkReady) return;
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        if (flow === "invite") {
          const result = await supabase.rpc("activate_membership", {
            p_display_name: String(fields.get("displayName") ?? "").trim(),
          });
          if (result.error || !result.data) {
            setMessage("Your password was set, but JARVIS could not activate access. Contact the admin if retrying fails.");
            return;
          }
        }
        await supabase.auth.signOut({ scope: "local" });
        setFlow("signin");
        setLinkReady(false);
        setMessage("Password saved. Sign in to continue.");
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) {
        setMessage("Could not sign in with that email and password.");
        return;
      }
      const verified = await currentRole(data.session.access_token);
      if (!verified) {
        await supabase.auth.signOut({ scope: "local" });
        setMessage("An active JARVIS membership is required.");
        return;
      }
      setRole(verified);
    } catch {
      setMessage("Could not finish the request. Check your details and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      const { data } = await getClient().auth.getSession();
      if (!data.session) throw new Error("Session unavailable");
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ email: fields.get("email"), role: inviteRole, groupId: fields.get("groupId") }),
      });
      setMessage((await response.json()).message);
    } catch {
      setMessage("Could not process the invitation.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <p>Checking your session…</p>;

  const callback = flow === "invite" || flow === "recovery";
  return (
    <div className="space-y-4">
      {role ? (
        <>
          <p>Signed in as <strong>{role}</strong>.</p>
          {role === "admin" && (
            <form onSubmit={invite} className="space-y-3">
              <h2 className="text-xl font-semibold">Approve and invite</h2>
              <label className="block">Email<input className={inputClass} name="email" type="email" required /></label>
              <label className="block">Role
                <select className={inputClass} value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}>
                  <option value="student">Student</option><option value="lecturer">Lecturer</option>
                </select>
              </label>
              {inviteRole === "student" && (
                <label className="block">Group
                  <select className={inputClass} name="groupId" required defaultValue="">
                    <option value="" disabled>Choose a group</option>
                    {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                  </select>
                </label>
              )}
              <button className={buttonClass} disabled={busy}>Send or resend invitation</button>
            </form>
          )}
          <button type="button" className="underline" onClick={async () => {
            const { error } = await getClient().auth.signOut({ scope: "local" });
            if (error) setMessage("Could not sign out. Try again.");
            else { setRole(null); setMessage(""); }
          }}>Sign out</button>
        </>
      ) : (
        <>
          {(!callback || linkReady) && (
            <form key={flow} onSubmit={submit} className="space-y-3">
              {!callback && <label className="block">Email<input className={inputClass} name="email" type="email" autoComplete="email" required /></label>}
              {flow === "invite" && <label className="block">Display name<input className={inputClass} name="displayName" maxLength={100} required /></label>}
              {flow !== "forgot" && <label className="block">Password<input className={inputClass} name="password" type="password" minLength={callback ? 8 : undefined} autoComplete={callback ? "new-password" : "current-password"} required /></label>}
              <button className={buttonClass} disabled={busy}>{flow === "signin" ? "Sign in" : flow === "forgot" ? "Send reset link" : "Save password"}</button>
            </form>
          )}
          <button type="button" className="underline" onClick={() => {
            setFlow(flow === "signin" ? "forgot" : "signin");
            setMessage("");
          }}>{flow === "signin" ? "Forgot password?" : "Back to sign-in"}</button>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
