"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { getAccessToken } from "@/lib/browser-supabase";
import { maxPdfBytes, type CourseResource } from "@/lib/course-resources";

type Offering = { id: string; course: { name: string }; group: { name: string }; semester: { name: string } };

const field = "block w-full rounded border border-[#789181] bg-white p-2";
const indexLabels = { pending: "Awaiting indexing", indexed: "Searchable in Ask JARVIS", unsearchable: "Text could not be indexed" };
const button = "rounded bg-[#1e3328] px-4 py-2 text-white disabled:opacity-50";

async function resourceRequest(query: string, options: RequestInit = {}) {
  const token = await getAccessToken();
  return fetch(`/api/resources${query}`, {
    ...options, headers: { ...options.headers, Authorization: `Bearer ${token ?? ""}` },
  });
}

export function CourseResources({ offeringId, canPublish = false }: { offeringId: string; canPublish?: boolean }) {
  const [resources, setResources] = useState<CourseResource[] | null>(null);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [indexing, setIndexing] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [opened, setOpened] = useState<{ id: string; url: string } | null>(null);
  const pending = useRef<string | null>(null);
  const filter = search.trim().toLocaleLowerCase();
  const visible = resources?.filter((item) => `${item.title} ${item.filename}`.toLocaleLowerCase().includes(filter));

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await resourceRequest(`?course=${encodeURIComponent(offeringId)}`, { signal: controller.signal });
        const result = await response.json();
        if (controller.signal.aborted) return;
        if (response.ok) setResources(result.resources);
        else setLoadError(result.error ?? "Could not load the resources.");
      } catch {
        if (!controller.signal.aborted) setLoadError("Could not load the resources. Reload to try again.");
      }
    })();
    return () => controller.abort();
  }, [offeringId]);

  useEffect(() => {
    return () => { if (opened) URL.revokeObjectURL(opened.url); };
  }, [opened]);

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("pdf");
    if (!(file instanceof File) || !/\.pdf$/i.test(file.name) || !file.size || file.size > maxPdfBytes) {
      setError("Choose a nonempty PDF up to 4 MB.");
      return;
    }
    pending.current ??= crypto.randomUUID();
    data.set("id", pending.current);
    data.set("offeringId", offeringId);
    setUploading(true);
    setMessage("");
    setError("");
    try {
      const response = await resourceRequest("", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) pending.current = null;
        setError(result.error ?? "Could not publish the PDF.");
        return;
      }
      setResources((items) => [result, ...(items ?? []).filter((item) => item.id !== result.id)]);
      pending.current = null;
      form.reset();
      setMessage("PDF published to enrolled students.");
    } catch {
      setError("Could not confirm publication. Retry with the same file and title.");
    } finally {
      setUploading(false);
    }
  }

  async function indexPdf(id: string) {
    setIndexing(id);
    setError("");
    try {
      const response = await resourceRequest("", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok) setError(result.error ?? "Could not index the PDF.");
      else setResources((items) => items?.map((item) => item.id === id ? { ...item, index_status: result.index_status } : item) ?? null);
    } catch {
      setError("Could not index the PDF. Try again.");
    } finally {
      setIndexing(null);
    }
  }

  async function openPdf(item: CourseResource) {
    if (opening) return;
    setOpening(item.id);
    setOpened(null);
    setError("");
    try {
      const response = await resourceRequest(`?file=${encodeURIComponent(item.id)}`);
      if (!response.ok) {
        const result = await response.json();
        setError(result.error ?? "Could not open the PDF.");
        return;
      }
      setOpened({ id: item.id, url: URL.createObjectURL(await response.blob()) });
    } catch {
      setError("Could not open the PDF. Try again.");
    } finally {
      setOpening(null);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-[#afbeb3] bg-white p-4" aria-label="Course resources">
      <h2 className="text-xl font-semibold">Course resources</h2>
      {canPublish && (
        <form onSubmit={publish} onChange={() => { pending.current = null; }}>
          <fieldset className="space-y-2" disabled={uploading || resources === null}>
            <legend className="font-semibold">Publish a PDF</legend>
            <label>Resource title<input className={field} name="title" maxLength={120} required /></label>
            <label>PDF file (up to 4 MB)<input className={field} name="pdf" type="file" accept=".pdf,application/pdf" required /></label>
            <button className={button}>{uploading ? "Publishing…" : "Publish PDF"}</button>
          </fieldset>
        </form>
      )}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
      {loadError && <p role="alert">{loadError}</p>}
      {resources === null ? !loadError && <p role="status">Loading PDFs…</p> : (
        <>
          <label>Search PDFs<input className={field} type="search" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          {visible?.length ? (
            <ul className="space-y-2">
              {visible.map((item) => (
                <li key={item.id} className="space-y-1 rounded bg-[#eef3ee] p-3">
                  <strong className="break-words">{item.title}</strong>
                  <p className="break-words text-sm">{item.filename} · {Math.ceil(item.size_bytes / 1024)} KB</p>
                  <p className="text-sm">{indexLabels[item.index_status]}</p>
                  {canPublish && item.index_status !== "indexed" && (
                    <button type="button" className="mr-3 underline" disabled={indexing !== null}
                      onClick={() => void indexPdf(item.id)}>
                      {indexing === item.id ? "Indexing…" : item.index_status === "pending" ? "Index PDF" : "Retry indexing"}
                    </button>
                  )}
                  {opened?.id === item.id ? (
                    <div className="flex flex-wrap gap-3">
                      <a className="font-semibold underline" href={opened.url} target="_blank" rel="noopener noreferrer">View PDF</a>
                      <a className="underline" href={opened.url} download={item.filename}>Download PDF</a>
                    </div>
                  ) : <button type="button" disabled={opening !== null} className="font-semibold underline disabled:opacity-50"
                    aria-label={`Open PDF: ${item.title}`} onClick={() => void openPdf(item)}>{opening === item.id ? "Opening…" : "Open PDF"}</button>}
                </li>
              ))}
            </ul>
          ) : <p>{filter ? "No PDFs match your search." : "No PDFs published for this course yet."}</p>}
        </>
      )}
    </section>
  );
}

export function ResourceWorkspace() {
  const [courses, setCourses] = useState<Offering[] | null>(null);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [needsSignIn, setNeedsSignIn] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await resourceRequest("", { signal: controller.signal });
        const result = await response.json();
        if (controller.signal.aborted) return;
        if (response.status === 401 || response.status === 403) setNeedsSignIn(true);
        else if (!response.ok) setError(result.error ?? "Could not load your courses.");
        else {
          setCourses(result.courses);
          if (result.courses.length === 1) setSelected(result.courses[0].id);
        }
      } catch {
        if (!controller.signal.aborted) setError("Could not load your courses. Reload to try again.");
      }
    })();
    return () => controller.abort();
  }, []);

  if (needsSignIn) return <p>Sign in with an active student or lecturer account. <Link href="/account" className="underline">Sign in</Link></p>;
  if (error) return <p role="alert">{error}</p>;
  if (!courses) return <p role="status">Loading your courses…</p>;
  if (!courses.length) return <p>No courses available.</p>;
  return (
    <div className="space-y-3">
      <label>Course
        <select className={field} value={selected} onChange={(event) => setSelected(event.target.value)}>
          <option value="" disabled>Choose a course</option>
          {courses.map((item) => <option value={item.id} key={item.id}>{item.course.name} · {item.group.name} · {item.semester.name}</option>)}
        </select>
      </label>
      {selected && <CourseResources key={selected} offeringId={selected} />}
    </div>
  );
}
