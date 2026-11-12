"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { getAccessToken } from "@/lib/browser-supabase";
import { RoomSimulation, DigitalLibrary } from "./discovery";
import { MeetingPanel } from "./meeting-panel";

const input = "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
const button = "rounded-lg bg-[#1e3328] px-4 py-2 text-sm font-semibold text-white";
const panel = "rounded-2xl border border-slate-200 bg-white p-5";
const tabs = ["Rooms & map", "Library", "Team booking"] as const;
type Tab = typeof tabs[number] | "Staff";
type Resource = { id: string; title: string; kind: string; capacity: number; building: string; floor: number; position: number; accessible: boolean; features: string[]; opens: number; closes: number };
type Booking = { id: string; resourceId: string; startAt: string; endAt: string; status: string; purpose?: string; lateCancelAt?: string };
type Loan = { id: string; resourceId: string; dueAt: string; renewals: number; returnedAt?: string; remindedAt?: string };
type Data = { resources: Resource[]; reservations: Booking[]; loans: Loan[]; occupied: { resourceId: string; unit: number }[]; invitations: Booking[]; staff: boolean };
const format = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Yerevan", dateStyle: "medium", timeStyle: "short" });
const dateTime = (value: string) => value ? new Date(value + ":00+04:00").toISOString() : "";
async function request(params: URLSearchParams, payload?: Record<string, unknown>) {
  const token = await getAccessToken().catch(() => undefined);
  if (!token) throw new Error("Sign in to browse and book campus resources.");
  const response = await fetch(`/api/campus?${params}`, {
    method: payload ? "POST" : "GET", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}

export function CampusWorkspace() {
  const [tab, setTab] = useState<Tab>("Rooms & map");
  const [data, setData] = useState<Data | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [editing, setEditing] = useState<Resource>();
  useEffect(() => {
    let active = true;
    request(new URLSearchParams()).then((value) => { if (active) setData(value); },
      (error: Error) => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, []);
  const resources = data?.resources ?? [];
  const title = (id: string) => resources.find((item) => item.id === id)?.title ?? id;
  const params = () => new URLSearchParams(start && end ? { start: dateTime(start), end: dateTime(end) } : {});
  async function act(payload?: Record<string, unknown>) {
    setPending(true);
    setMessage("");
    try {
      if (payload) await request(new URLSearchParams(), payload);
      setData(await request(params()));
      if (payload) setMessage("Saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Campus request failed."); }
    finally { setPending(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>, action: string) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    void act({ ...values, action });
  }
  const resource = resources.find(({ id }) => id === selected);
  const dateInputs = <div className="grid gap-3 sm:grid-cols-2">
    <label>Start <input className={input} type="datetime-local" value={start} onChange={(e) => { setStart(e.target.value); }} /></label>
    <label>End <input className={input} type="datetime-local" value={end} onChange={(e) => { setEnd(e.target.value); }} /></label>
  </div>;
  const reserveForm = resource && <form className={`${panel} mt-4 grid gap-3`} onSubmit={(event) => {
    event.preventDefault();
    const purpose = new FormData(event.currentTarget).get("purpose");
    if (!start || !end) { setMessage("Choose a start and end time."); return; }
    void act({ action: "reserve", id: resource.id, start: dateTime(start), end: dateTime(end), purpose });
  }}>
    <h2 className="font-semibold">Reserve {resource.title}</h2>
    <label>Purpose <input name="purpose" required maxLength={250} className={input} /></label>
    <button className={`${button} w-fit`} disabled={pending}>Create pending booking</button>
  </form>;
  return <div className="mt-7 space-y-5">
    <nav aria-label="Campus tools" className="flex flex-wrap gap-2">
      {[...tabs, ...(data?.staff ? ["Staff" as const] : [])].map((item) => <button type="button" key={item}
        aria-pressed={tab === item} onClick={() => { setTab(item); setSelected(""); setQuery(""); setMessage(""); }}
        className={tab === item ? button : "rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"}>
        {item}
      </button>)}
    </nav>
    {tab === "Rooms & map" && <RoomSimulation />}
    {tab === "Library" && <DigitalLibrary />}
    {tab === "Team booking" && <MeetingPanel />}
    {(tab === "Library" || tab === "Staff") && data && message && <p role="status" className="rounded-lg bg-slate-100 p-3">{message}</p>}
    {tab === "Library" && !data && <p className="text-sm text-slate-600"><Link href="/account" className="underline">Sign in</Link> to access campus loans and equipment when available.</p>}
    {data && tab === "Library" && <>
      <div className={`${panel} space-y-3`}><h2 className="font-semibold">Campus loans &amp; equipment</h2><label>Search by title <input className={input} type="search" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
        <p className="text-sm text-slate-600">Select dates to reserve equipment. Times are Asia/Yerevan.</p>{dateInputs}{reserveForm}
        <ul className="grid gap-3 sm:grid-cols-2">{resources.filter((item) => item.kind !== "room" && item.title.toLowerCase().includes(query.trim().toLowerCase())).map((item) => <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3" key={item.id}>
          <div><p className="font-medium">{item.title}</p><p className="text-sm text-slate-600">{item.kind === "book" ? "Library book" : "Equipment"} · {item.capacity} total</p></div>
          <button className={button} disabled={pending} onClick={() => item.kind === "book" ? void act({ action: "borrow", id: item.id }) : setSelected(item.id)}>{item.kind === "book" ? "Borrow" : "Reserve"}</button>
        </li>)}</ul>
      </div>
      <div className={panel}><h2 className="font-semibold">My equipment reservations</h2>
        {data.reservations.filter((item) => resources.some((resource) => resource.id === item.resourceId && resource.kind === "equipment")).map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-t py-3">
          <div><strong>{title(item.resourceId)}</strong><p>{format.format(new Date(item.startAt))} · {item.status}</p></div>
          {["pending", "confirmed"].includes(item.status) && <div className="flex gap-2">
            {item.status === "pending" && <button className={button} disabled={pending} onClick={() => void act({ action: "confirm", id: item.id })}>Confirm</button>}
            <button className="rounded-lg border px-4 py-2 text-sm" disabled={pending} onClick={() => void act({ action: "cancel", id: item.id })}>Cancel</button>
          </div>}
        </article>)}
      </div>
      {!data.staff && <div className={panel}><h2 className="mb-3 font-semibold">My loans</h2>{data.loans.map((item) => <article key={item.id} className="flex flex-wrap justify-between gap-3 border-t py-3">
        <div><strong>{title(item.resourceId)}</strong><p>{item.returnedAt ? "Returned" : `Due ${format.format(new Date(item.dueAt))}`} · {item.renewals}/2 renewals</p>{item.remindedAt && !item.returnedAt && <p className="font-medium text-amber-800">Library loan reminder</p>}</div>
        {!item.returnedAt && item.renewals < 2 && <button className={button} disabled={pending} onClick={() => void act({ action: "renew", id: item.id })}>Renew</button>}
      </article>)}</div>}
    </>}
    {data?.staff && tab === "Staff" && <>
      <div className={panel}>
        <h2 className="font-semibold">Manage catalog and room hours</h2>
        <label>Edit existing resource <select className={input} value={editing?.id ?? ""} onChange={(e) => setEditing(resources.find(({ id }) => id === e.target.value))}>
          <option value="">New resource</option>{resources.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}
        </select></label>
        <form key={editing?.id ?? "new"} className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={(event) => submit(event, "resource")}>
          <label>ID <input className={input} required name="id" defaultValue={editing?.id} readOnly={!!editing} /></label>
          <label>Title <input className={input} required name="title" defaultValue={editing?.title} /></label>
          <label>Type <select className={input} name="kind" defaultValue={editing?.kind ?? "room"}><option value="room">Room</option><option value="book">Book</option><option value="equipment">Equipment</option></select></label>
          <label>Building <input className={input} name="building" defaultValue={editing?.building} /></label>
          {(["capacity", "floor", "position", "opens", "closes"] as const).map((name, index) => <label key={name}>{["Seats / copies / units", "Floor", "Map position", "Opens (minutes after midnight)", "Closes (minutes after midnight)"][index]} <input required type="number" className={input} name={name} defaultValue={editing?.[name] ?? [1, 1, 0, 480, 1200][index]} /></label>)}
          <label>Features <input className={input} name="features" defaultValue={editing?.features.join(", ")} /></label>
          <label><input type="checkbox" name="accessible" defaultChecked={editing?.accessible} /> Accessible</label>
          <button className={`${button} w-fit`} disabled={pending}>Save resource</button>
        </form>
      </div>
      <div className={panel}><h2 className="font-semibold">Manage loans</h2>
        <form className="my-3 grid gap-3 sm:grid-cols-2" onSubmit={(event) => submit(event, "staff-borrow")}>
          <label>Book <select className={input} name="id">{resources.filter(({ kind }) => kind === "book").map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
          <label>Student account ID <input required className={input} name="borrower" /></label>
          <button className={`${button} w-fit`} disabled={pending}>Record loan</button>
        </form>
        {data.loans.map((item) => <div key={item.id} className="flex justify-between gap-3 border-t py-3"><p>{title(item.resourceId)} · {item.returnedAt ? "Returned" : `Due ${format.format(new Date(item.dueAt))}`}</p>
          {!item.returnedAt && <button className={button} disabled={pending} onClick={() => void act({ action: "return", id: item.id })}>Mark returned</button>}
        </div>)}
      </div>
    </>}
  </div>;
}
