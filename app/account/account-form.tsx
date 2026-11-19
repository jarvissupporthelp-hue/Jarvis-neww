"use client";

import Link from "next/link";
import { accountCopy } from "@/lib/foundation/copy";
import { academicPortal, roleWorkspace, type Locale } from "@/lib/locales";
import { getClient, getAccessToken, passwordCallback, clearPasswordCallback } from "@/lib/browser-supabase";
import { PersonalTasks } from "./personal-planner";
import { StudentDashboard } from "./student-dashboard";
import { Timetable } from "./timetable";
import { AdminWorkspace, type AdminSection } from "./admin-workspace";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

type Flow = "signin" | "forgot" | "invite" | "recovery";
type Role = "student" | "lecturer" | "admin";
type Group = { id: string; name: string };
type PendingInvitation = { email: string; role: "student" | "lecturer"; student_group_id: string | null; group_name: string | null };
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
  const workspace = roleWorkspace[locale];
  const tools = academicPortal[locale];
  const lang = `?lang=${locale}`;
  const [flow, setFlow] = useState<Flow>("signin");
  const [role, setRole] = useState<Role | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [inviteRole, setInviteRole] = useState<PendingInvitation["role"]>("student");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteGroup, setInviteGroup] = useState("");
  const [pending, setPending] = useState<PendingInvitation[]>();
  const [pendingError, setPendingError] = useState(false);
  const [invitationRevision, setInvitationRevision] = useState(0);
  const inviteEmailField = useRef<HTMLInputElement>(null);
  const showInvitations = role === "admin" && view === "dashboard" && (!adminSection || adminSection === "users");
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const accountStatus = useRef<HTMLParagraphElement>(null);

  function setMessage(text: string) {
    setNotice(text ? { text, error: false } : null);
  }

  const setError = useCallback((text: string) => setNotice({ text, error: true }), []);
  const [ready, setReady] = useState(false);
  const [finishActivation, setFinishActivation] = useState(false);
  const [linkReady, setLinkReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function initialize() {
      const expected = new URL(window.location.href).searchParams.get("flow");
      try {
        const supabase = getClient();
        const callback = passwordCallback();
        const initialization = await supabase.auth.initialize();
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        if (expected === "invite" || expected === "recovery") {
          const valid = callback?.flow === expected && callback.validFragment && !initialization.error && Boolean(data.session);
          setFlow(expected);
          if (expected === "recovery" && valid && data.session) {
            const identity = await currentIdentity(data.session.access_token);
            if (!mounted) return;
            setFinishActivation(!identity);
          }
          setLinkReady(valid);
          if (!valid) setError(expected === "invite" ? copy.invalidInvite : copy.invalidRecovery);
          clearPasswordCallback();
          window.history.replaceState(window.history.state, "", "/account?lang=" + locale);
        } else if (data.session) {
          const identity = await currentIdentity(data.session.access_token);
          if (!mounted) return;
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
    if (!showInvitations) return;
    let mounted = true;
    void getClient().from("student_groups").select("id,name").order("name").then(({ data, error }) => {
      if (!mounted) return;
      if (error) setError(workspace.unavailableGroups);
      else setGroups(data ?? []);
    });
    return () => { mounted = false; };
  }, [showInvitations, workspace, setError]);

  useEffect(() => {
    if (!showInvitations) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const token = await getAccessToken();
        const response = await fetch("/api/invitations", {
          cache: "no-store", signal: controller.signal, headers: { Authorization: `Bearer ${token ?? ""}` },
        });
        if (!response.ok) throw new Error();
        const result = await response.json();
        if (!controller.signal.aborted) { setPending(result.invitations); setPendingError(false); }
      } catch {
        if (!controller.signal.aborted) setPendingError(true);
      }
    })();
    return () => controller.abort();
  }, [showInvitations, invitationRevision]);

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
        if (flow === "invite" || finishActivation) {
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
        setFinishActivation(false);
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
    try {
      const { data } = await getClient().auth.getSession();
      if (!data.session) throw new Error("Session unavailable");
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ email: fields.get("email"), role: inviteRole, groupId: fields.get("groupId") }),
      });
      const result = await response.json();
      if (response.ok) { setMessage(result.message); setInviteEmail(""); }
      else setError(result.message);
    } catch {
      setError("Could not confirm invitation delivery. Retry with the same email, role, and group.");
    } finally {
      setInvitationRevision((current) => current + 1);
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
          {showInvitations && (
            <>
            <form onSubmit={invite} className="jarvis-invite-form space-y-3 rounded-xl border p-5" style={{borderColor:"var(--stroke)",background:"var(--panel)"}}>
              <div className="jarvis-section-heading">
                <div><h2 className="text-xl font-semibold">{workspace.inviteTitle}</h2><p>{workspace.inviteHelp}</p></div>
              </div>
              <label className="block">{copy.email}<input ref={inviteEmailField} className={inputClass} name="email" type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} required /></label>
              <label className="block">{workspace.role}
                <select className={inputClass} value={inviteRole} onChange={(event) => setInviteRole(event.target.value === "lecturer" ? "lecturer" : "student")}>
                  <option value="student">{workspace.student}</option><option value="lecturer">{workspace.lecturer}</option>
                </select>
              </label>
              {inviteRole === "student" && (
                <label className="block">{workspace.group}
                  <select className={inputClass} name="groupId" required value={inviteGroup} onChange={(event) => setInviteGroup(event.target.value)}>
                    <option value="" disabled>{workspace.chooseGroup}</option>
                    {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                  </select>
                </label>
              )}
              <button className={buttonClass} disabled={busy}>{busy ? workspace.sending : workspace.send}</button>
            </form>
            <section className="space-y-3 rounded-xl border border-[var(--stroke)] bg-[var(--panel)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-semibold">{workspace.pending}</h2>
                <button type="button" className="underline" onClick={() => setInvitationRevision((value) => value + 1)}>{workspace.retry}</button>
              </div>
              {pendingError ? <p role="status">{workspace.pendingError}</p> : !pending ? <p role="status">{copy.checking}</p>
                : !pending.length ? <p>{workspace.pendingEmpty}</p> : <ul className="divide-y divide-[var(--stroke)]">
                  {pending.map((item) => <li key={item.email} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div className="min-w-0"><strong className="break-all">{item.email}</strong>
                      <p className="text-sm text-[var(--muted)]">{workspace[item.role]}{item.group_name && ` · ${item.group_name}`}</p>
                    </div>
                    <button type="button" className="underline disabled:opacity-50" disabled={busy} onClick={() => {
                      setInviteEmail(item.email); setInviteGroup(item.student_group_id ?? ""); setInviteRole(item.role);
                      inviteEmailField.current?.focus();
                    }}>{workspace.reuse}</button>
                  </li>)}
                </ul>}
            </section>
            </>
          )}
          {(adminSection && role !== "admin") || (view === "tasks" && role !== "student") ? (
            <div className="jarvis-empty-state"><p role="status">{workspace.denied}</p>
              <Link href={`/account${lang}`} className="underline">{workspace.back}</Link>
            </div>
          ) : role === "admin" ? <div className="jarvis-view-enter" key={adminSection ?? view}>
            <AdminWorkspace getToken={getAccessToken} section={adminSection ?? (view === "calendar" ? "timetable" : "users")} locale={locale} />
          </div> : (
            <div key={view} className="jarvis-view-enter">
              {role === "student" && view === "dashboard" && <StudentDashboard getToken={getAccessToken} />}
              {view === "calendar" && <Timetable getToken={getAccessToken} personal={role === "student" ? getClient() : undefined} />}
              {role === "student" && view === "tasks" && <PersonalTasks client={getClient()} />}
              {role === "lecturer" && view === "dashboard" && (
                <div className="jarvis-empty-state">
                  <strong>{tools.lecturer}</strong>
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/account/calendar${lang}`} className="jarvis-secondary-button">{tools.calendar}</Link>
                    <Link href="/lecturer" className="jarvis-secondary-button">{tools.lecturer}</Link>
                    <Link href={`/academics${lang}`} className="jarvis-secondary-button">{tools.title}</Link>
                  </div>
                </div>
              )}
            </div>
          )}
          <button type="button" className="underline" onClick={async () => {
            const { error } = await getClient().auth.signOut({ scope: "local" });
            if (error) setError("Could not sign out. Try again.");
            else { setRole(null); setPending(undefined); setGroups([]); setInviteEmail(""); setInviteGroup(""); setMessage(""); }
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
              {(flow === "invite" || (flow === "recovery" && finishActivation)) && <label className="block">{copy.name}<input className={inputClass} name="displayName" maxLength={100} required /></label>}
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
