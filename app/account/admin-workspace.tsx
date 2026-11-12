"use client";

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

type Section = "users" | "group" | "semester" | "course" | "offering" | "timetable" | "audit";

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

export function AdminWorkspace({ getToken }: { getToken: () => Promise<string | undefined> }) {
  const [data, setData] = useState<Workspace | null>(null);
  const [section, setSection] = useState<Section>("users");
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    const readHash = () => {
      const hash = window.location.hash.slice(1);
      if (!hash.startsWith("admin-")) return;
      const next = hash.slice(6) as Section;
      if (adminSections.some((item) => item.id === next)) {
        setSection(next);
        setSelected("");
      }
    };
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  function openSection(next: Section) {
    setSection(next);
    setSelected("");
    setMessage("");
    window.history.replaceState(null, "", "#admin-" + next);
  }

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
  }, [getToken]);

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

  if (!data) return <p role="status">{message || "Loading admin workspace…"}</p>;

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
  const filteredUsers = users.filter((item) => item.name.toLocaleLowerCase().includes(userSearch.trim().toLocaleLowerCase()));
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
      <div className="jarvis-admin-tabs" role="tablist" aria-label="Administration sections">
        {adminSections.map((item) => (
          <button key={item.id} id={"admin-tab-" + item.id} role="tab" type="button" className="jarvis-admin-tab"
            aria-selected={section === item.id} aria-controls="admin-panel" onClick={() => openSection(item.id)}>{item.title}</button>
        ))}
      </div>
      <div className="jarvis-admin-body" id="admin-panel" role="tabpanel" aria-labelledby={"admin-tab-" + section}>
        <h3 className="jarvis-admin-panel-title">{sectionTitle}</h3>
        <fieldset disabled={busy} className="space-y-3">
        {section === "users" && (
          <>
            <label className="block">Search people
              <input className={field + " jarvis-admin-search"} type="search" placeholder="Search by name, email or role"
                value={userSearch} onChange={(event) => setUserSearch(event.target.value)} />
            </label>
            <label className="block">Select account<select className={field} value={selected} onChange={(event) => setSelected(event.target.value)}>
              <option value="">Choose a user ({filteredUsers.length} matching)</option>
              {filteredUsers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select></label>
            {user && <p className="text-sm"><strong>{user.display_name}</strong> · {user.role} · <span className="jarvis-admin-status">{user.status}</span></p>}
            {!data.users.length && <p>No members have been registered yet.</p>
            {user && user.role !== "admin" && (
              <div key={user.id} className="space-y-3">
                {user.status !== "pending" && (
                  <form onSubmit={save}>
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
          </>
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
        {message && <p role="status">{message}</p>}
      </div>
    </section>
  );
}
