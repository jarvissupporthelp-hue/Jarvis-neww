"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getAccessToken } from "@/lib/browser-supabase";

type Note = { id: string; title: string; content: string };
type Pdf = { id: string; title: string; filename: string };

export function LecturerPrivateVault({ offeringId }: { offeringId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [files, setFiles] = useState<Pdf[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const token = await getAccessToken();
        const response = await fetch(`/api/lecturer/private?course=${encodeURIComponent(offeringId)}`, {
          headers: { Authorization: `Bearer ${token ?? ""}` },
        });
        const result = await response.json();
        if (!active) return;
        if (response.ok) { setNotes(result.notes); setFiles(result.files); }
        else setMessage(result.error ?? "Could not load private materials.");
      } catch { if (active) setMessage("Could not load private materials."); }
    })();
    return () => { active = false; };
  }, [offeringId]);

  async function save(event: FormEvent<HTMLFormElement>, kind: "note" | "file") {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    setBusy(true); setMessage("");
    try {
      const token = await getAccessToken();
      const fields = new FormData(form);
      const response = await fetch("/api/lecturer/private", {
        method: "POST", headers: kind === "note"
          ? { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" }
          : { Authorization: `Bearer ${token ?? ""}` },
        body: kind === "note"
          ? JSON.stringify({ offeringId, title: fields.get("title"), content: fields.get("content") })
          : (() => { fields.set("offeringId", offeringId); return fields; })(),
      });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error ?? "Could not save private material."); return; }
      if (kind === "note") setNotes((items) => [result.note, ...items]);
      else setFiles((items) => [result.file, ...items]);
      form.reset(); setMessage(kind === "note" ? "Private note saved." : "Private PDF saved.");
    } catch { setMessage("Could not save private material. Try again."); }
    finally { setBusy(false); }
  }

  async function remove(id: string, kind: "note" | "file") {
    setMessage("");
    const token = await getAccessToken();
    const response = await fetch("/api/lecturer/private", {
      method: "DELETE", headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id, kind }),
    });
    if (!response.ok) { setMessage("Could not remove private material."); return; }
    if (kind === "note") setNotes((items) => items.filter((item) => item.id !== id));
    else setFiles((items) => items.filter((item) => item.id !== id));
  }

  async function download(id: string) {
    const token = await getAccessToken();
    const response = await fetch(`/api/lecturer/private?file=${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token ?? ""}` },
    });
    if (!response.ok) { setMessage("Could not open private PDF."); return; }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a"); link.href = url; link.download = "private-lecturer.pdf"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return <section className="space-y-4 rounded-xl border border-[#afbeb3] bg-white p-4">
    <h2 className="text-xl font-semibold">Private lecturer materials</h2>
    <p>Only you can open these notes and PDFs. They are never included in student chat or student course resources.</p>
    <form className="space-y-2" onSubmit={(event) => save(event, "note")}>
      <h3 className="font-semibold">Private exam note</h3>
      <label className="block">Title<input className="block w-full rounded border p-2" name="title" maxLength={120} required /></label>
      <label className="block">Notes<textarea className="block w-full rounded border p-2" name="content" rows={5} maxLength={12000} required placeholder="Draft exam guidance, marking considerations, or teaching preparation. This stays private to your account." /></label>
      <button className="rounded bg-[#1e3328] px-4 py-2 text-white disabled:opacity-50" disabled={busy}>Save private note</button>
    </form>
    <ul className="space-y-2">{notes.map((item) => <li className="rounded bg-[#eef3ee] p-3" key={item.id}>
      <strong>{item.title}</strong><p className="whitespace-pre-wrap">{item.content}</p>
      <button className="underline" onClick={() => void remove(item.id, "note")}>Delete note</button>
    </li>)}</ul>
    <form className="space-y-2" onSubmit={(event) => save(event, "file")}>
      <h3 className="font-semibold">Private PDF</h3>
      <label className="block">Title<input className="block w-full rounded border p-2" name="title" maxLength={120} required /></label>
      <label className="block">PDF<input className="block w-full rounded border p-2" name="pdf" type="file" accept="application/pdf,.pdf" required /></label>
      <button className="rounded bg-[#1e3328] px-4 py-2 text-white disabled:opacity-50" disabled={busy}>Upload private PDF</button>
    </form>
    <ul className="space-y-2">{files.map((item) => <li key={item.id} className="rounded bg-[#eef3ee] p-3">
      <strong>{item.title}</strong> ({item.filename}){" "}
      <button className="underline" onClick={() => void download(item.id)}>Download</button>{" · "}
      <button className="underline" onClick={() => void remove(item.id, "file")}>Delete</button>
    </li>)}</ul>
    {message && <p role="status">{message}</p>}
  </section>;
}
