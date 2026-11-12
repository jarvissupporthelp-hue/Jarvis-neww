"use client";

import Link from "next/link";
import { accountCopy } from "@/lib/foundation/copy";
import type { Locale } from "@/lib/locales";
import { getClient, getAccessToken } from "@/lib/browser-supabase";
import { PersonalTasks } from "./personal-planner";
import { StudentDashboard } from "./student-dashboard";
import { Timetable } from "./timetable";
import { AdminWorkspace, type AdminSection } from "./admin-workspace";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

type Flow = "signin" | "forgot" | "invite" | "recovery";
type Role = "student" | "lecturer" | "admin";
type Group = { id: string; name: string };
export type AccountView = "dashboard" | "calendar" | "tasks";

async function currentIdentity(token: string): Promise<{role: Role; displayName: string} | null> {
  const response = await fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error("Membership check unavailable");
  const identity = await response.json();
  return { role: identity.role, displayName: identity.displayName };
}

const inputClass = "w-full rounded border border-[#789181] bg-white p-2";
const buttonClass = "min-h-11 rounded jarvis-primary-button px-4 py-2 text-white disabled:opacity-50";

export function AccountForm({ view = "dashboard", adminSection, locale = "en" }: {
  view?: AccountView;
  adminSection?: AdminSection;
  locale?: Locale;
}) {
  const copy = accountCopy[locale];
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
            ? copy.invalidInvite : copy.invalidRecovery);
          window.history.replaceState(null, "", "/account?lang=" + locale);
        } else if (data.session) {
          const identity = await currentIdentity(data.session.access_token);
          setRole(identity?.role ?? null);
          setDisplayName(identity?.displayName ?? "");
        }
      } catch {
        if (mounted) setError(copy.unavailable);
      } finally {
        if (mounted) setReady(true);
      }
    }
    void initialize();
    return () => { mounted = false; };
  }, [copy, locale, setError]);

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
        setMessage(copy.resetSent);
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
            setError(copy.activationError);
            return;
          }
        }
        await supabase.auth.signOut({ scope: "local" });
        setFlow("signin");
        setShowPassword(false);
        setLinkReady(false);
        setMessage(copy.passwordSaved);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) {
        setError(error?.status === 429 ? copy.limited : copy.invalid);
        return;
      }
      const verified = await currentIdentity(data.session.access_token);
      if (!verified) {
        await supabase.auth.signOut({ scope: "local" });
        setError(copy.inactive);
        return;
      }
      setRole(verified.role);
      setDisplayName(verified.displayName);
    } catch {
      setError(copy.error);
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

  if (!ready) return <div className="jarvis-view-loading" role="status">
    <span className="jarvis-view-loading-spinner" aria-hidden="true"/>
    <span>{copy.checking}</span>
  </div>;

  const callback = flow === "invite" || flow === "recovery";
  return (
    <div className="jarvis-account-flow space-y-4">
      {role ? (
        <div className="authenticated-workspace space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4" style={{ borderColor: "var(--stroke)", background: "var(--panel)" }}>
            <p ref={accountStatus} tabIndex={-1} className="text-sm">Signed in as <strong>{displayName || role}</strong> <span className="capitalize">({role})</span></p>
            <span className="jarvis-admin-status">Connected to JARVIS</span>
          </div>
          {role === "admin" && (
            <form onSubmit={invite} className="jarvis-invite-form space-y-3 rounded-xl border p-5" style={{borderColor:"var(--stroke)",background:"var(--panel)"}}>
              <div className="jarvis-section-heading">
                <div><span className="jarvis-eyebrow">ACCESS MANAGEMENT</span><h2 className="text-xl font-semibold">Invite a new member</h2>
                <p>Only approved students and lecturers can activate an account.</p></div>
              </div>
              <label className="block">{copy.email}<input className={inputClass} name="email" type="email" required /></label>
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
              <button className={buttonClass} disabled={busy}>{busy ? "Sending invitation…" : "Send or resend invitation"}</button>
            </form>
          )}
          {role === "lecturer" && <Link href="/lecturer" className="inline-block font-semibold underline">Lecturer workspace</Link>}
          {role === "admin" ? <div className="jarvis-view-enter" key={adminSection ?? "admin-overview"}>
            <AdminWorkspace getToken={getAccessToken} section={adminSection ?? "users"} />
          </div> : (
            <div key={view} className="jarvis-view-enter">
              {role === "student" && view === "dashboard" && <StudentDashboard getToken={getAccessToken} />}
              {view === "calendar" && <Timetable getToken={getAccessToken} personal={role === "student" ? getClient() : undefined} />}
              {role === "student" && view === "tasks" && <PersonalTasks client={getClient()} />}
              {role === "lecturer" && view === "dashboard" && (
                <div className="jarvis-empty-state">
                  <strong>Your teaching workspace</strong>
                  <p>Open your timetable or manage courses and assignments.</p>
                  <div className="flex flex-wrap gap-3">
                    <Link href="/account/calendar" className="jarvis-secondary-button">View timetable</Link>
                    <Link href="/lecturer" className="jarvis-secondary-button">Manage courses</Link>
                  </div>
                </div>
              )}
            </div>
          )}
          <button type="button" className="underline" onClick={async () => {
            const { error } = await getClient().auth.signOut({ scope: "local" });
            if (error) setError("Could not sign out. Try again.");
            else { setRole(null); setMessage(""); }
          }}>Sign out</button>
        </div>
      ) : (
        <>
          {(!callback || linkReady) && (
            <form key={flow} onSubmit={submit} className="space-y-4" aria-busy={busy}>
              <div className="jarvis-signin-heading"><div className="jarvis-signin-mark">✦</div>
                <h2>{flow === "signin" ? (locale === "hy" ? "Բարի վերադարձ" : "Welcome back") : flow === "forgot" ? copy.recovery : flow === "invite" ? copy.invite : copy.recovery}</h2>
                <p>{flow === "signin" ? (locale === "hy" ? "Մուտք գործիր հրավերով ակտիվացված համալսարանական հաշվով։" : "Use your invited university account to continue.") : flow === "forgot" ? copy.resetSent : copy.length}</p>
              </div>
              {callback && <h2 className="text-xl font-semibold">{flow === "invite" ? copy.invite : copy.recovery}</h2>}
              {!callback && <label className="block">Email<input className={inputClass} name="email" type="email" autoComplete="email" required /></label>}
              {flow === "invite" && <label className="block">{copy.name}<input className={inputClass} name="displayName" maxLength={100} required /></label>}
              {flow !== "forgot" && (
                <div>
                  <label className="block">{copy.password}<input className={inputClass} name="password" type={showPassword ? "text" : "password"} minLength={callback ? 8 : undefined} autoComplete={callback ? "new-password" : "current-password"} required /></label>
                  {callback && <p className="mt-1 text-sm">{copy.length}</p>}
                  <button type="button" className="mt-1 min-h-11 underline" aria-pressed={showPassword}
                    onClick={() => setShowPassword((value) => !value)}>{copy.show}</button>
                </div>
              )}
              <button className={buttonClass} disabled={busy}>{busy ? copy.working : flow === "signin" ? copy.signin : flow === "forgot" ? copy.reset : flow === "invite" ? copy.activate : copy.save}</button>
            </form>
          )}
          <button type="button" className="underline" onClick={() => {
            setFlow(flow === "signin" ? "forgot" : "signin");
            setShowPassword(false);
            setMessage("");
          }}>{flow === "signin" ? copy.forgot : copy.back}</button>
        </>
      )}
      {notice && <p role={notice.error ? "alert" : "status"}>{notice.text}</p>}
    </div>
  );
}
