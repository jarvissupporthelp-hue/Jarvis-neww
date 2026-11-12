"use client";

import Link from "next/link";
import { Timetable } from "./timetable";
import { useEffect, useState, type FormEvent } from "react";

type Option = { id: string; name: string };
type CatalogItem = Option & { code: string };
type Group = CatalogItem & { program_id: string; academic_year: number };
type Semester = CatalogItem & { starts_on: string; ends_on: string };
type User = { id: string; display_name: string; email: string; role: string; status: string; student_group_id: string | null };
type Workspace = {
  users: User[];
  groups: Group[];
  programs: Option[];
  semesters: Semester[];
  courses: CatalogItem[];
  offerings: { id: string; label: string }[];
  assignments: { user_id: string; offering_id: string }[];
  audit: { id: string; actor_id: string; action: string; resource_id: string; created_at: string }[];
};

export type AdminSection = "users" | "group" | "semester" | "course" | "offering" | "timetable" | "audit";
type Section = AdminSection;

const adminSections: { id: Section; title: string }[] = [
  { id: "users", title: "People & access" },
  { id: "group", title: "Groups" },
  { id: "semester", title: "Semesters" },
  { id: "course", title: "Courses" },
  { id: "offering", title: "Offerings" },
  { id: "timetable", title: "Timetable" },
  { id: "audit", title: "Audit history" },
];

const field = "w-full rounded border border-[#789181] bg-white p-2";
const button = "rounded jarvis-primary-button px-4 py-2 text-white disabled:opacity-50";

function Select({ name, label, options, value = "" }: {
  name: string; label: string; options: Option[]; value?: string;
}) {
  return (
    <label className="block">{label}
      <select name={name} defaultValue={value} required className={field}>
        <option value="" disabled>Choose {label.toLowerCase()}</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    </label>
  );
}

export function AdminWorkspace({ getToken, section = "users" }: { getToken: () => Promise<string | undefined>; section?: AdminSection }) {
  const [data, setData] = useState<Workspace | null>(null);
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const token = await getToken();
        const response = await fetch("/api/admin", {
          headers: { Authorization: `Bearer ${token ?? ""}` }, signal: controller.signal,
        });
        if (!response.ok) throw new Error();
        setData(await response.json());
      } catch {
        if (!controller.signal.aborted) setMessage("Could not load the admin workspace. Sign in again to retry.");
      }
    })();
    return () => controller.abort();
  }, [getToken, loadAttempt]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    const { action, ...values } = fields;
    setBusy(true);
    setMessage("");
    let saved = false;
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" };
      const response = await fetch("/api/admin", {
        method: "POST", headers, body: JSON.stringify({ action, data: values }),
      });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error); return; }
      saved = true;
      const refreshed = await fetch("/api/admin", { headers });
      if (!refreshed.ok) throw new Error();
      setData(await refreshed.json());
      if (!values.id) setSelected(result.id);
      setMessage("Saved.");
    } catch {
      setMessage(saved ? "Saved, but the workspace could not refresh. Reload to see the change." : "Could not save the change.");
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <div className="jarvis-empty-state" role={message ? "alert" : "status"}>
    <strong>{message ? "Administration unavailable" : "Loading your workspace…"}</strong>
    <p>{message || "Checking the latest university data."}</p>
    {message && <button className="jarvis-secondary-button" type="button" onClick={() => { setMessage(""); setLoadAttempt((n) => n + 1); }}>Try again</button>}
  </div>;

  const records = section === "group" ? data.groups : section === "semester" ? data.semesters : data.courses;
  const record = records.find((item) => item.id === selected);
  const group = data.groups.find((item) => item.id === selected);
  const semester = data.semesters.find((item) => item.id === selected);
  const user = data.users.find((item) => item.id === selected);
  const users = data.users.map((item) => ({
    id: item.id, name: `${item.display_name} · ${item.email} · ${item.role} · ${item.status}`,
  }));
  const offerings = data.offerings.map((item) => ({ id: item.id, name: item.label }));
  const assignments = data.assignments.filter((item) => item.user_id === user?.id);
  const eligible = offerings.filter((item) => !assignments.some((assignment) => assignment.offering_id === item.id));
  const filteredUsers = data.users.filter((item) => {
    const term = userSearch.trim().toLocaleLowerCase();
    const matchesText = !term || [item.display_name, item.email, item.role, item.status].some((value) => value.toLocaleLowerCase().includes(term));
    return matchesText && (statusFilter === "all" || item.status === statusFilter)
      && (roleFilter === "all" || item.role === roleFilter);
  });
  const activeUsers = data.users.filter((item) => item.status === "active").length;
  const sectionTitle = adminSections.find((item) => item.id === section)?.title ?? "Overview";

  return (
    <section id="admin-workspace" className="jarvis-admin space-y-4">
      <div className="jarvis-admin-hero">
        <div>
          <span className="jarvis-eyebrow">UNIVERSITY CONTROL CENTER</span>
          <h2>Administration</h2>
          <p>Manage university people, academic structure, and teaching schedules.</p>
        </div>
        <span className="jarvis-admin-hero-badge">● Secure workspace</span>
      </div>
      <div className="jarvis-admin-metrics" aria-label="University overview">
        <div className="jarvis-admin-metric"><span>Total members</span><strong>{data.users.length}</strong></div>
        <div className="jarvis-admin-metric"><span>Active accounts</span><strong>{activeUsers}</strong></div>
        <div className="jarvis-admin-metric"><span>Student groups</span><strong>{data.groups.length}</strong></div>
        <div className="jarvis-admin-metric"><span>Course offerings</span><strong>{data.offerings.length}</strong></div>
      </div>
      <nav className="jarvis-admin-tabs" aria-label="Administration sections">
        {adminSections.map((item) => (
          <Link key={item.id} href={"/account/admin/" + item.id} className="jarvis-admin-tab"
            aria-current={section === item.id ? "page" : undefined}>{item.title}</Link>
        ))}
      </nav>
      <div className="jarvis-admin-body" id="admin-panel">
        <h3 className="jarvis-admin-panel-title">{sectionTitle}</h3>
        <fieldset disabled={busy} className="space-y-3">
        {section === "users" && (
          <div className="jarvis-directory">
            <div className="jarvis-directory-list">
              <div className="jarvis-directory-filters">
                <label>Find a person
                  <input className={field} type="search" placeholder="Name or email…" autoComplete="off"
                    value={userSearch} onChange={(event) => setUserSearch(event.target.value)} />
                </label>
                <div className="jarvis-directory-filter-row">
                  <label>Role
                    <select className={field} value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setSelected(""); }}>
                      <option value="all">All roles</option><option value="student">Student</option>
                      <option value="lecturer">Lecturer</option><option value="admin">Admin</option>
                    </select>
                  </label>
                  <label>Status
                    <select className={field} value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setSelected(""); }}>
                      <option value="all">All statuses</option><option value="active">Active</option>
                      <option value="pending">Pending</option><option value="disabled">Disabled</option>
                    </select>
                  </label>
                </div>
                <p className="jarvis-directory-count" role="status">{filteredUsers.length} of {data.users.length} accounts shown</p>
              </div>
              {filteredUsers.length ? <div className="jarvis-directory-results" aria-label="Filtered accounts">
                {filteredUsers.map((person) => (
                  <button key={person.id} type="button" className="jarvis-directory-person" aria-pressed={selected === person.id}
                    onClick={() => { setSelected(person.id); setMessage(""); }}>
                    <span className="jarvis-person-avatar" aria-hidden="true">{(person.display_name || person.email).slice(0, 1).toUpperCase()}</span>
                    <span className="jarvis-directory-person-text">
                      <strong>{person.display_name || person.email}</strong>
                      <small>{person.email}</small>
                      <span>{person.role} · {person.status}</span>
                    </span>
                  </button>
                ))}
              </div> : <div className="jarvis-empty-state">
                <strong>{data.users.length ? "No matching people" : "No accounts yet"}</strong>
                <p>{data.users.length ? "Try another name or change the filters." : "Invite your first student or lecturer above."}</p>
                {data.users.length > 0 && <button type="button" className="jarvis-secondary-button" onClick={() => { setUserSearch(""); setRoleFilter("all"); setStatusFilter("all"); }}>Clear filters</button>}
              </div>}
            </div>
            <div className="jarvis-directory-detail">
              {!user && <div className="jarvis-empty-state">
                <strong>Account details</strong>
                <p>Select a person to review membership, assigned group and access.</p>
              </div>}
              {user && <div className="jarvis-directory-person-heading">
                <span className="jarvis-person-avatar jarvis-person-avatar-lg" aria-hidden="true">{(user.display_name || user.email).slice(0,1).toUpperCase()}</span>
                <div className="min-w-0"><h4>{user.display_name || "Unnamed account"}</h4>
                  <p className="break-all">{user.email}</p><span className="jarvis-admin-status">{user.role} · {user.status}</span>
                </div>
              </div>}
              {user?.role === "admin" && <p className="jarvis-muted">Administrator access is managed separately.</p>}
              {user && user.role !== "admin" && (
              <div key={user.id} className="space-y-3">
                {user.status !== "pending" && (
                  <form onSubmit={(event) => {
                    if (user.status === "active" && !window.confirm("Disable access for " + (user.display_name || user.email) + "? They will lose JARVIS access.")) {
                      event.preventDefault();
                      return;
                    }
                    void save(event);
                  }}>
                    <input type="hidden" name="action" value="user_status" />
                    <input type="hidden" name="id" value={user.id} />
                    <input type="hidden" name="status" value={user.status === "active" ? "disabled" : "active"} />
                    <button className={button}>{user.status === "active" ? "Disable account" : "Reactivate account"}</button>
                  </form>
                )}
                {user.role === "student" && (
                  <form onSubmit={save} className="space-y-2">
                    <input type="hidden" name="action" value="user_group" />
                    <input type="hidden" name="id" value={user.id} />
                    <Select key={user.student_group_id} name="groupId" label="Group" options={data.groups} value={user.student_group_id ?? ""} />
                    <button className={button}>Save group</button>
                  </form>
                )}
                {user.status === "active" && eligible.length > 0 && (
                  <form onSubmit={save} className="space-y-2">
                    <input type="hidden" name="action" value="assign" />
                    <input type="hidden" name="id" value={user.id} />
                    <Select name="offeringId" label="Course offering" options={eligible} />
                    <button className={button}>Assign course</button>
                  </form>
                )}
                {assignments.map((assignment) => (
                  <form key={assignment.offering_id} onSubmit={save} className="flex items-center justify-between gap-2">
                    <input type="hidden" name="action" value="unassign" />
                    <input type="hidden" name="id" value={user.id} />
                    <input type="hidden" name="offeringId" value={assignment.offering_id} />
                    <span>{offerings.find((item) => item.id === assignment.offering_id)?.name}</span>
                    <button className="underline">Remove assignment</button>
                  </form>
                ))}
              </div>
            )}
            </div>
          </div>
        )}
        {(section === "group" || section === "semester" || section === "course") && (
          <>
            <label className="block">Record<select className={field} value={selected} onChange={(event) => setSelected(event.target.value)}>
              <option value="">Create new</option>
              {records.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select></label>
            <form key={section + selected} onSubmit={save} className="space-y-2">
              <input type="hidden" name="action" value={section} />
              <input type="hidden" name="id" value={selected} />
              <label className="block">Name<input className={field} name="name" defaultValue={record?.name} maxLength={120} required /></label>
              <label className="block">Code<input className={field} name="code" defaultValue={record?.code} maxLength={32} pattern="[A-Za-z0-9][A-Za-z0-9_\\-]{0,31}" required /></label>
              {section === "group" && (
                <>
                  <Select name="programId" label="Program" options={data.programs} value={group?.program_id} />
                  <label className="block">Academic year<input className={field} name="year" type="number" min={1} max={32767} defaultValue={group?.academic_year} required /></label>
                </>
              )}
              {section === "semester" && (
                <>
                  <label className="block">Start date<input className={field} name="start" type="date" defaultValue={semester?.starts_on} required /></label>
                  <label className="block">End date<input className={field} name="end" type="date" defaultValue={semester?.ends_on} required /></label>
                </>
              )}
              <button className={button}>Save {section}</button>
            </form>
          </>
        )}
        {section === "offering" && (
          <>
            <form onSubmit={save} className="space-y-2">
              <input type="hidden" name="action" value="offering" />
              <Select name="courseId" label="Course" options={data.courses} />
              <Select name="semesterId" label="Semester" options={data.semesters} />
              <Select name="groupId" label="Group" options={data.groups} />
              <button className={button}>Create offering</button>
            </form>
            <ul className="list-disc pl-5">{offerings.map((item) => <li key={item.id}>{item.name}</li>)}</ul>
          </>
        )}
        {section === "audit" && (
          data.audit.length ? <ul className="space-y-2">
            {data.audit.map((entry) => <li key={entry.id}>
              <strong>{entry.action.replaceAll("_", " ")}</strong> · {new Date(entry.created_at).toLocaleString()}
              <span className="block break-all text-sm">Actor {users.find((item) => item.id === entry.actor_id)?.name ?? entry.actor_id} · Record {entry.resource_id}</span>
            </li>)}
          </ul> : <p>No admin changes recorded yet.</p>
        )}
      </fieldset>
        {section === "timetable" && <Timetable getToken={getToken} admin={data} />}
        {message && <p className="jarvis-feedback" role="status" aria-live="polite">{message}</p>}
      </div>
    </section>
  );
}
