"use client";

import Link from "next/link";
import { getClient, getAccessToken } from "@/lib/browser-supabase";
import { PersonalTasks } from "./personal-planner";
import { StudentDashboard } from "./student-dashboard";
import { Timetable } from "./timetable";
import { AdminWorkspace } from "./admin-workspace";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

type Flow = "signin" | "forgot" | "invite" | "recovery";
type Role = "student" | "lecturer" | "admin";
type Group = { id: string; name: string };

async function currentIdentity(token: string): Promise<{ role: Role; displayName: string } | null> {
  const response = await fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error("Membership check unavailable");
  const identity = await response.json();
  return { role: identity.role, displayName: identity.displayName };
}

const inputClass = "w-full rounded border border-[#789181] bg-white p-2";
const buttonClass = "min-h-11 rounded bg-[#1e3328] px-4 py-2 text-white disabled:opacity-50";

export function AccountForm() {
  const [flow, setFlow] = useState<Flow>("signin");
  const [role, setRole] = useState<Role | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [inviteRole, setInviteRole] = useState("student");
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const accountStatus = useRef<HTMLParagraphElement>(null);

  function setMessage(text: string) {
    setNotice(text ? { text, error: false } : null);
  }

  const setError = useCallback((text: string) => setNotice({ text, error: true }), []);
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
          if (!validFragment || !data.session) setError(expected === "invite"
            ? "This invitation link is invalid or expired. Ask your JARVIS administrator for a fresh invitation."
            : "This reset link is invalid or expired. Request a new one from the sign-in form.");
          window.history.replaceState(null, "", "/account");
        } else if (data.session) {
          const identity = await currentIdentity(data.session.access_token);
          setRole(identity?.role ?? null);
          setDisplayName(identity?.displayName ?? "");
        }
      } catch {
        if (mounted) setError("Authentication is unavailable. Try again shortly.");
      } finally {
        if (mounted) setReady(true);
      }
    }
    void initialize();
    return () => { mounted = false; };
  }, [setError]);

  useEffect(() => {
    if (role !== "admin") return;
    let mounted = true;
    void getClient().from("student_groups").select("id,name").order("name").then(({ data, error }) => {
      if (!mounted) return;
      if (error) setError("Could not load student groups.");
      else setGroups(data ?? []);
    });
    return () => { mounted = false; };
  }, [role, setError]);

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
            setError("Your password was set, but JARVIS could not activate access. Contact the admin if retrying fails.");
            return;
          }
        }
        await supabase.auth.signOut({ scope: "local" });
        setFlow("signin");
        setShowPassword(false);
        setLinkReady(false);
        setMessage("Password saved. Sign in to continue.");
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) {
        setError("Could not sign in. Check your email and password, or use Forgot password below.");
        return;
      }
      const verified = await currentIdentity(data.session.access_token);
      if (!verified) {
        await supabase.auth.signOut({ scope: "local" });
        setError("Your sign-in worked, but your JARVIS access is inactive. Contact your administrator.");
        return;
      }
      setRole(verified.role);
      setDisplayName(verified.displayName);
    } catch {
      setError("Could not finish the request. Check your details and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const { data } = await getClient().auth.getSession();
      if (!data.session) throw new Error("Session unavailable");
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ email: fields.get("email"), role: inviteRole, groupId: fields.get("groupId") }),
      });
      const result = await response.json();
      if (response.ok) setMessage(result.message);
      else setError(result.message);
    } catch {
      setError("Could not confirm invitation delivery. Retry with the same email, role, and group.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (role) accountStatus.current?.focus();
  }, [role]);

  if (!ready) return <p role="status">Checking your session…</p>;

  const callback = flow === "invite" || flow === "recovery";
  return (
    <div className="space-y-4">
      {role ? (
        <>
          <p ref={accountStatus} tabIndex={-1}>Signed in as <strong>{displayName}</strong> ({role}).</p>
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
          {role === "lecturer" && <Link href="/lecturer" className="inline-block font-semibold underline">Lecturer workspace</Link>}
          {role === "admin" ? <AdminWorkspace getToken={getAccessToken} /> : (
            <>
              {role === "student" && <StudentDashboard getToken={getAccessToken} />}
              <div id="student-timetable"><Timetable getToken={getAccessToken} personal={role === "student" ? getClient() : undefined} /></div>
              {role === "student" && <PersonalTasks client={getClient()} />}
            </>
          )}
          <button type="button" className="underline" onClick={async () => {
            const { error } = await getClient().auth.signOut({ scope: "local" });
            if (error) setError("Could not sign out. Try again.");
            else { setRole(null); setDisplayName(""); setMessage(""); }
          }}>Sign out</button>
        </>
      ) : (
        <>
          {(!callback || linkReady) && (
            <form key={flow} onSubmit={submit} className="space-y-3" aria-busy={busy}>
              {callback && <h2 className="text-xl font-semibold">{flow === "invite" ? "Activate your JARVIS account" : "Set a new password"}</h2>}
              {!callback && <label className="block">Email<input className={inputClass} name="email" type="email" autoComplete="email" required /></label>}
              {flow === "invite" && <label className="block">Display name<input className={inputClass} name="displayName" maxLength={100} required /></label>}
              {flow !== "forgot" && (
                <div>
                  <label className="block">Password<input className={inputClass} name="password" type={showPassword ? "text" : "password"} minLength={callback ? 8 : undefined} autoComplete={callback ? "new-password" : "current-password"} required /></label>
                  {callback && <p className="mt-1 text-sm">Use at least 8 characters.</p>}
                  <button type="button" className="mt-1 min-h-11 underline" aria-pressed={showPassword}
                    onClick={() => setShowPassword((value) => !value)}>Show password</button>
                </div>
              )}
              <button className={buttonClass} disabled={busy}>{busy ? "Working…" : flow === "signin" ? "Sign in" : flow === "forgot" ? "Send reset link" : flow === "invite" ? "Activate account" : "Save password"}</button>
            </form>
          )}
          <button type="button" className="underline" onClick={() => {
            setFlow(flow === "signin" ? "forgot" : "signin");
            setShowPassword(false);
            setMessage("");
          }}>{flow === "signin" ? "Forgot password?" : "Back to sign-in"}</button>
        </>
      )}
      {notice && <p role={notice.error ? "alert" : "status"}>{notice.text}</p>}
    </div>
  );
}
