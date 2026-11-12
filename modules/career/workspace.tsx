"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { InterviewPanel } from "./interview-panel";
import { getAccessToken } from "@/lib/browser-supabase";
import { mentors, postings, skills } from "./catalog";
import { canonicalSkill, cvFields, evidenceLevels, jobMatch, newProfile, portfolioScore, sampleCv, stages,
  type Cv, type MentorRequest, type Profile, type Project } from "./rules";

const panel = "rounded-2xl border border-slate-200 bg-white p-5";
const field = "mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm";
const primary = "inline-block rounded-lg bg-[#214c3b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";
const secondary = "inline-block rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50";
const sections = ["Opportunities", "Applications", "CV builder", "Interview practice", "Skill portfolio", "Job match"] as const;
type Section = typeof sections[number] | "Review";
type Posting = typeof postings[number];
type Snapshot = { role: "student"; profile: Profile; completed: string[] } | {
  role: "staff" | "mentor"; review: { userId: string; projects: Project[]; requests: MentorRequest[] }[];
};
type Save = (values: Record<string, unknown>) => Promise<boolean>;
const date = (value: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
const docs = ["Agreement", "Learning objectives", "Supervisor evaluation"];
const badge = "rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800";

async function api(payload?: Record<string, unknown>) {
  const token = await getAccessToken().catch(() => undefined);
  if (!token) return null;
  const response = await fetch("/api/career", { method: payload ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}

function formValues(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  return Object.fromEntries(new FormData(event.currentTarget));
}

const sampleProject: Project = {
  id: "sample", skill: "SQL", title: "University library inventory", level: 2, link: "", verified: false,
};

function WorkSample({ project }: { project: Project }) {
  function download() {
    if (!project.file) return;
    const bytes = Uint8Array.from(atob(project.file.data), (character) => character.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/octet-stream" }));
    const a = document.createElement("a");
    a.href = url; a.download = project.file.name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="flex flex-wrap items-center gap-2 text-sm">
    {project.link && <a className="underline" href={project.link} target="_blank" rel="noreferrer">Open work sample ↗</a>}
    {project.file && <button type="button" className="underline" onClick={download}>Download {project.file.name}</button>}
    <span className="text-slate-600">{project.verified ? "Verified" : "Unverified"}</span>
  </div>;
}

function Opportunities({ profile, save, pending }: { profile: Profile; save: Save; pending: boolean }) {
  const [type, setType] = useState("");
  const [location, setLocation] = useState("");
  const [skill, setSkill] = useState("");
  const [deadline, setDeadline] = useState("");
  const [query, setQuery] = useState("");
  const items = postings.filter((job) => (!type || job.type === type) && (!location || job.location === location)
    && (!deadline || job.deadline <= deadline) && (!skill || job.requirements.some((item) => canonicalSkill(item) === skill))
    && `${job.title} ${job.employer}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="space-y-4">
    <div className={`${panel} grid gap-3 sm:grid-cols-2 lg:grid-cols-5`}>
      <label>Search<input type="search" className={field} value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <label>Type<select className={field} value={type} onChange={(e) => setType(e.target.value)}><option value="">All types</option><option>Job</option><option>Internship</option></select></label>
      <label>Location<select className={field} value={location} onChange={(e) => setLocation(e.target.value)}><option value="">All locations</option>{["Yerevan", "Remote", "Hybrid"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Deadline by<input type="date" className={field} value={deadline} onChange={(e) => setDeadline(e.target.value)} /></label>
      <label>Skill<select className={field} value={skill} onChange={(e) => setSkill(e.target.value)}><option value="">All skills</option>{skills.map(([name]) => <option key={name}>{name}</option>)}</select></label>
    </div>
    <p role="status" className="text-sm text-slate-600">{items.length} sample opportunities</p>
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((job) => <li className={`${panel} flex flex-col gap-3`} key={job.id}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#305f4a]">{job.type} · {job.location}</p>
      <div><h2 className="text-lg font-semibold"><Link href={`/career/${job.id}`} className="hover:underline">{job.title}</Link></h2>
      <p className="text-sm text-slate-600">{job.employer} · Due {date(job.deadline)}</p></div>
      <div className="flex flex-wrap gap-2">{job.requirements.map((item) => <span key={item} className="rounded-full bg-slate-100 px-2 py-1 text-xs">{item}</span>)}</div>
      <button className={`${secondary} mt-auto w-fit`} disabled={pending || !!profile.applications[job.id]} onClick={() => void save({ action: "application", id: job.id, stage: "saved" })}>
        {profile.applications[job.id] ? "On your board" : "Save opportunity"}
      </button>
    </li>)}</ul>
    {!items.length && <p>No opportunities match your filters.</p>}
  </section>;
}

function Job({ job, profile, save, pending, onMatch }: { job: Posting; profile: Profile; save: Save; pending: boolean; onMatch: () => void }) {
  const checklist = profile.internship[job.id];
  return <section className="space-y-4">
    <Link className={secondary} href="/career">All opportunities</Link>
    <article className={panel}>
      <p className="text-sm font-semibold text-[#305f4a]">{job.type} · {job.location} · Sample posting</p>
      <h2 className="mt-2 text-3xl font-semibold">{job.title}</h2><p>{job.employer} · Due {date(job.deadline)}</p>
      <p className="my-4">{job.description}</p>
      <h3 className="font-semibold">Requirements</h3><ul className="my-2 list-disc pl-5">{job.requirements.map((item) => <li key={item}>{item}</li>)}</ul>
      <div className="mt-4 flex flex-wrap gap-2"><button className={primary} disabled={pending || !!profile.applications[job.id]} onClick={() => void save({ action: "application", id: job.id, stage: "saved" })}>
        {profile.applications[job.id] ? "On your board" : "Save opportunity"}</button><button className={secondary} onClick={onMatch}>See job match</button></div>
    </article>
    {job.type === "Internship" && <form className={`${panel} space-y-3`} key={job.id} onSubmit={(event) => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      void save({ action: "internship", id: job.id, documents: form.getAll("documents"), report: form.get("report") });
    }}>
      <h3 className="font-semibold">Internship documents and report</h3>
      <fieldset className="space-y-2"><legend className="mb-2">Document checklist</legend>
        {docs.map((item) => <label key={item} className="block"><input type="checkbox" name="documents" value={item} defaultChecked={checklist?.documents.includes(item)} /> {item}</label>)}
      </fieldset>
      <label className="block">Internship report<textarea name="report" className={field} rows={5} maxLength={6000} defaultValue={checklist?.report} /></label>
      <button className={primary} disabled={pending}>Save internship progress</button>
    </form>}
  </section>;
}

function Board({ profile, save, pending }: { profile: Profile; save: Save; pending: boolean }) {
  return <section className="space-y-4">
    <h2 className="text-xl font-semibold">Application board</h2>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{stages.map((stage) => <div key={stage} className="min-w-0 rounded-xl bg-slate-100 p-3">
      <h3 className="mb-3 font-semibold capitalize">{stage}</h3>
      {Object.entries(profile.applications).filter(([, value]) => value.stage === stage).map(([id, value]) => <form key={id} className={`${panel} mb-3 space-y-2 !p-3`} onSubmit={(event) => void save({ ...formValues(event), action: "application", id })}>
        <Link href={`/career/${id}`} className="font-semibold underline">{postings.find((job) => job.id === id)?.title}</Link>
        <label className="block">Stage<select name="stage" className={field} defaultValue={value.stage}>{stages.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="block">Notes<textarea name="notes" className={field} rows={2} maxLength={2500} defaultValue={value.notes} /></label>
        <button className={secondary} disabled={pending}>Save update</button>
        <details><summary className="cursor-pointer text-sm">Stage history</summary><ul className="text-sm">{value.history.map(({ stage, at }, index) => <li key={index} className="capitalize">{stage} · {date(at)}</li>)}</ul></details>
      </form>)}
    </div>)}</div>
    {!Object.keys(profile.applications).length && <p>Save an opportunity to start your board.</p>}
  </section>;
}

function CvBuilder({ initial, uploaded, save, pending }: { initial: Cv; uploaded?: Profile["uploadedCv"]; save: Save; pending: boolean }) {
  const [cv, setCv] = useState(initial);
  const [exportMessage, setExportMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  async function exportPdf() {
    setExporting(true); setExportMessage("");
    try {
      const token = await getAccessToken().catch(() => undefined);
      if (!token) throw new Error("Sign in to export your CV. You can download the sample PDF below.");
      const response = await fetch("/api/career/pdf", { method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(cv) });
      if (!response.ok) throw new Error(await response.text());
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = "jarvis-cv.pdf"; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setExportMessage(error instanceof Error ? error.message : "Could not export PDF."); }
    finally { setExporting(false); }
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("cv");
    setExportMessage("");
    if (!(file instanceof File) || !file.size || file.size > 1048576 || !file.name.toLowerCase().endsWith(".pdf")) {
      setExportMessage("Choose a PDF file up to 1 MB.");
      return;
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      if (await save({ action: "upload-cv", name: file.name, data: btoa(binary) })) form.reset();
    } catch {
      setExportMessage("Could not read this PDF.");
    }
  }
  function downloadUpload() {
    if (!uploaded) return;
    const bytes = Uint8Array.from(atob(uploaded.data), (letter) => letter.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = uploaded.name; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="space-y-4">
    <form className={`${panel} space-y-3`} onSubmit={(event) => void upload(event)}>
      <h2 className="text-xl font-semibold">Upload an existing CV</h2>
      <label className="block max-w-md">CV PDF (up to 1 MB)<input required name="cv" type="file" accept=".pdf,application/pdf" className={field} /></label>
      <button className={primary} disabled={pending}>{uploaded ? "Replace PDF" : "Upload PDF"}</button>
      {uploaded && <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="break-all">{uploaded.name}</span>
        <button type="button" className={secondary} onClick={downloadUpload}>Download</button>
        <button type="button" className={secondary} disabled={pending} onClick={() => void save({ action: "remove-cv" })}>Remove PDF</button>
      </div>}
    </form>
    {exportMessage && <p role="status">{exportMessage}</p>}
    <div className="grid gap-4 lg:grid-cols-2">

    <form className={`${panel} space-y-3`} onSubmit={(event) => { event.preventDefault(); void save({ action: "cv", cv }); }}>
      <h2 className="text-xl font-semibold">CV builder</h2>
      {cvFields.map((name) => <label key={name} className="block capitalize">{name}<textarea className={field} maxLength={2200} rows={2} value={cv[name]} onChange={(e) => setCv({ ...cv, [name]: e.target.value })} /></label>)}
      <div className="flex flex-wrap gap-2"><button className={primary} disabled={pending}>Save CV</button><button type="button" className={secondary} onClick={() => setCv(sampleCv)}>Use sample</button>
      <button type="button" className={secondary} disabled={exporting} onClick={() => void exportPdf()}>{exporting ? "Exporting…" : "Export PDF"}</button>
      <Link className={secondary} href="/api/career/pdf" prefetch={false}>Sample PDF</Link></div>
    </form>
    <article className={`${panel} space-y-4`}><h2 className="text-xl font-semibold">Live preview</h2>
      {cvFields.map((name) => cv[name] && <div key={name}><h3 className="font-semibold capitalize">{name}</h3><p className="whitespace-pre-wrap break-words">{cv[name]}</p></div>)}
    </article>
    </div>
  </section>;
}

function Portfolio({ profile, completed, save, pending, demo }: { profile: Profile; completed: string[]; save: Save; pending: boolean; demo: boolean }) {
  const [skill, setSkill] = useState("SQL");
  const [message, setMessage] = useState("");
  const result = portfolioScore(skill, completed, demo ? [sampleProject] : profile.projects);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const file = values.get("sample");
    setMessage("");
    if (file instanceof File && file.size > 200_000) { setMessage("Choose a file up to 200 KB."); return; }
    let sample;
    if (file instanceof File && file.size) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      sample = { name: file.name, data: btoa(binary) };
    }
    if (await save({ action: "project", skill, title: values.get("title"), level: values.get("level"), link: values.get("link"), file: sample })) form.reset();
  }
  return <section className="space-y-4">
    <div className={`${panel} space-y-3`}>
      <h2 className="text-xl font-semibold">Skill portfolio <span className={badge}>Smart</span></h2>
      <label className="block max-w-md">Skill<select className={field} value={skill} onChange={(e) => setSkill(e.target.value)}>{skills.map(([name]) => <option key={name}>{name}</option>)}</select></label>
      <p className="text-2xl font-semibold">{result.score}% complete</p>
      <p className="text-sm text-slate-600">Course evidence 40% · Project 30% · Verified sample 30%</p>
      <div className="grid gap-3 md:grid-cols-3">
        <div><h3 className="font-semibold">Course → Skill</h3><p>{result.courses.join(", ") || "No completed course evidence"}</p><p>{skill}</p></div>
        <div><h3 className="font-semibold">Skill → Project</h3>{result.work.map((project) => <p key={project.id}>{project.title} · Level {project.level}</p>)}</div>
        <div><h3 className="font-semibold">Project → Work sample</h3>{result.work.map((project) => <WorkSample key={project.id} project={project} />)}</div>
      </div>
      {result.missing.length > 0 && <ul className="list-disc pl-5 text-sm">{result.missing.map((item) => <li key={item}>{item}</li>)}</ul>}
    </div>
    <form className={`${panel} grid gap-3 sm:grid-cols-2`} onSubmit={(event) => void submit(event)}>
      <h3 className="font-semibold sm:col-span-2">Add a project using {skill}</h3>
      <label>Project title<input className={field} required name="title" maxLength={120} /></label>
      <label>Skill level<select className={field} name="level" defaultValue="2"><option value="1">1 · Learning</option><option value="2">2 · Can apply</option><option value="3">3 · Can work independently</option></select></label>
      <label>Work sample or repository URL<input className={field} name="link" type="url" maxLength={500} /></label>
      <label>Work sample file (up to 200 KB)<input className={field} name="sample" type="file" /></label>
      <button className={`${primary} w-fit`} disabled={pending}>Add project</button>
      {message && <p role="status">{message}</p>}
    </form>
  </section>;
}

function Match({ completed, projects, initial }: { completed: string[]; projects: Project[]; initial: string }) {
  const [id, setId] = useState(initial);
  const job = postings.find((item) => item.id === id) ?? postings[0];
  const result = jobMatch(job.requirements, evidenceLevels(completed, projects));
  return <section className={`${panel} space-y-4`}>
    <h2 className="text-xl font-semibold">Job match <span className={badge}>Smart</span></h2>
    <label className="block max-w-xl">Opportunity<select className={field} value={job.id} onChange={(e) => setId(e.target.value)}>{postings.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
    <p className="text-3xl font-semibold">{result.score === null ? "No scored requirements" : `${Math.round(result.score)}% match`}</p>
    <p className="text-sm text-slate-600">Matched ÷ (matched + gaps). Unknown requirements are excluded.</p>
    <ul className="space-y-2">{result.rows.map((item) => <li key={item.requirement} className="rounded-xl border p-3">
      <p className="font-semibold">{item.requirement} · {item.status}</p><p className="text-sm">{item.rule}</p>{item.suggestion && <p className="text-sm text-[#305f4a]">{item.suggestion}</p>}
    </li>)}</ul>
  </section>;
}

export function CareerWorkspace({ initialJob }: { initialJob?: string }) {
  const [section, setSection] = useState<Section>("Opportunities");
  const [selected, setSelected] = useState(initialJob ?? "");
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    api().then((value) => { if (alive && value) setSnapshot(value); },
      (error: Error) => { if (alive) setNotice(error.message); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  async function save(values: Record<string, unknown>) {
    setPending(true); setNotice("");
    try {
      const result = await api(values);
      if (!result) { setNotice("Sign in to save your Career work."); return false; }
      if (result.profile) setSnapshot((previous) => ({ role: "student", profile: result.profile,
        completed: previous?.role === "student" ? previous.completed : [] }));
      else {
        const updated = await api();
        if (updated) setSnapshot(updated);
      }
      setNotice("Saved.");
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save.");
      return false;
    } finally { setPending(false); }
  }
  const profile = snapshot?.role === "student" ? snapshot.profile : newProfile();
  const completed = snapshot?.role === "student" ? snapshot.completed : [];
  const review = snapshot && snapshot.role !== "student" ? snapshot.review : undefined;
  const job = postings.find(({ id }) => id === selected);
  return <div className="space-y-5">
    <nav aria-label="Career tools" className="flex flex-wrap gap-2">{[...sections, ...(review ? ["Review" as const] : [])].map((tab) =>
      <button key={tab} aria-pressed={section === tab} className={section === tab ? primary : secondary} onClick={() => { setSection(tab); if (tab === "Opportunities") setSelected(""); }}>{tab}</button>
    )}</nav>
    {notice && <p role="status" className="rounded-lg bg-slate-100 p-3">{notice} {notice.startsWith("Sign in") && <Link href="/account" className="underline">Open account</Link>}</p>}
    {!loading && !snapshot && !notice && <p className="text-sm text-slate-600">Browse sample opportunities, or <Link href="/account" className="underline">sign in</Link> to save your work.</p>}
    {section === "Opportunities" && (job ? <Job key={job.id} job={job} profile={profile} save={save} pending={pending} onMatch={() => setSection("Job match")} /> :
      <Opportunities profile={profile} save={save} pending={pending} />)}
    {section === "Applications" && <Board profile={profile} save={save} pending={pending} />}
    {section === "CV builder" && !loading && <CvBuilder initial={profile.cv} uploaded={profile.uploadedCv} save={save} pending={pending} />}
    {section === "Interview practice" && <InterviewPanel />}
    {section === "Skill portfolio" && <Portfolio profile={profile} completed={completed} save={save} pending={pending} demo={!snapshot} />}
    {section === "Job match" && <Match initial={selected} completed={completed} projects={snapshot ? profile.projects : [sampleProject]} />}
    {section === "Review" && review && <section className="space-y-3"><h2 className="text-xl font-semibold">Review work samples and mentoring requests</h2>
      {!review.length && <p>Nothing to review.</p>}
      {review.map(({ userId, projects, requests }) => <div className={`${panel} space-y-3`} key={userId}>
        {projects.map((project) => <article key={project.id} className="space-y-2 border-b pb-3"><h3 className="font-semibold">{project.title} · {project.skill}</h3>
          <WorkSample project={project} /><button className={primary} disabled={pending} onClick={() => void save({ action: "verify", userId, id: project.id })}>Verify sample</button>
        </article>)}
        {requests.map((item) => <article key={item.id} className="space-y-2"><h3 className="font-semibold">{mentors.find(({ id }) => id === item.mentorId)?.name} · {item.status}</h3><p className="whitespace-pre-wrap break-words">{item.message}</p>
          {item.status === "pending" && <div className="flex gap-2">{(["accepted", "declined"] as const).map((status) => <button key={status} className={secondary} disabled={pending} onClick={() => void save({ action: "respond", userId, id: item.id, status })}>{status === "accepted" ? "Accept" : "Decline"}</button>)}</div>}
        </article>)}
      </div>)}
    </section>}
  </div>;
}
