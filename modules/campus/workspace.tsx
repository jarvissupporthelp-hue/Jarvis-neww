"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { getAccessToken } from "@/lib/browser-supabase";
import { bookingAllowed, type Slot } from "./rules";

const input = "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
const button = "rounded-lg bg-[#1e3328] px-4 py-2 text-sm font-semibold text-white";
const panel = "rounded-2xl border border-slate-200 bg-white p-5";
const tabs = ["Rooms & map", "Bookings", "Library & equipment", "Team booking"] as const;
type Tab = typeof tabs[number] | "Staff";
type Resource = { id: string; title: string; kind: string; capacity: number; building: string; floor: number; position: number; accessible: boolean; features: string[]; opens: number; closes: number };
type Booking = { id: string; resourceId: string; startAt: string; endAt: string; status: string; purpose?: string; lateCancelAt?: string };
type Loan = { id: string; resourceId: string; dueAt: string; renewals: number; returnedAt?: string; remindedAt?: string };
type Data = { resources: Resource[]; reservations: Booking[]; loans: Loan[]; occupied: { resourceId: string; unit: number }[]; invitations: Booking[]; staff: boolean };
type Team = { options: (Slot & { resourceId: string; capacity: number; nextToClass: boolean })[]; reason: string; missingSchedules: number };
const format = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Yerevan", dateStyle: "medium", timeStyle: "short" });
const clock = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Yerevan", timeStyle: "short" });
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
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState(1);
  const [capacity, setCapacity] = useState(1);
  const [feature, setFeature] = useState("");
  const [accessible, setAccessible] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [checked, setChecked] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  const [teamInput, setTeamInput] = useState<Record<string, unknown>>({});
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
      if (payload?.action === "team") {
        setTeamInput(payload);
        setTeam(await request(new URLSearchParams(), payload));
        return;
      }
      if (payload) await request(new URLSearchParams(), payload);
      setData(await request(params()));
      setChecked(Boolean(start && end));
      if (payload) setMessage("Saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Campus request failed."); }
    finally { setPending(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>, action: string) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (action === "team") {
      values.start = dateTime(String(values.start));
      values.end = dateTime(String(values.end));
      setTeam(null);
    }
    void act({ ...values, action });
  }
  const slot = checked && start && end ? { start: Date.parse(dateTime(start)), end: Date.parse(dateTime(end)) } : null;
  const free = (item: Resource) => slot && bookingAllowed(slot, item, 0, Infinity)
    && (data?.occupied.filter(({ resourceId, unit }) => resourceId === item.id && unit <= item.capacity).length ?? 0) < (item.kind === "room" ? 1 : item.capacity);
  const buildings = [...new Set(resources.filter(({ kind }) => kind === "room").map((item) => item.building))];
  const mapBuilding = building || buildings[0];
  const mapRooms = resources.filter((item) => item.kind === "room" && item.building === mapBuilding && item.floor === floor);
  const rooms = resources.filter((item) => item.kind === "room" && (!building || item.building === building)
    && item.capacity >= capacity && (!accessible || item.accessible) && (!feature || item.features.includes(feature))
    && (!slot || free(item)));
  const resource = resources.find(({ id }) => id === selected);
  const dateInputs = <div className="grid gap-3 sm:grid-cols-2">
    <label>Start <input className={input} type="datetime-local" value={start} onChange={(e) => { setStart(e.target.value); setChecked(false); }} /></label>
    <label>End <input className={input} type="datetime-local" value={end} onChange={(e) => { setEnd(e.target.value); setChecked(false); }} /></label>
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
        {item} {item === "Team booking" && <span className="ml-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800">Smart</span>}
      </button>)}
    </nav>
    {message && <p role="status" className="rounded-lg bg-slate-100 p-3">{message} {!data && <Link href="/account" className="ml-2 underline">Open account</Link>}</p>}
    {!data && !message && <p role="status">Loading campus resources…</p>}
    {data && tab === "Rooms & map" && <>
      <div className={`${panel} space-y-3`}>
        <h2 className="text-lg font-semibold">Find a room</h2>
        <p className="text-sm text-slate-600">Choose a time in Asia/Yerevan to check availability.</p>
        {dateInputs}
        <div className="grid gap-3 sm:grid-cols-3">
          <label>Building <select className={input} value={building} onChange={(e) => setBuilding(e.target.value)}><option value="">All buildings</option>{buildings.map((name) => <option key={name}>{name}</option>)}</select></label>
          <label>Minimum seats <input className={input} type="number" min="1" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} /></label>
          <label>Equipment <select className={input} value={feature} onChange={(e) => setFeature(e.target.value)}><option value="">Any equipment</option>{[...new Set(resources.filter(({ kind }) => kind === "room").flatMap(({ features }) => features))].sort().map((name) => <option key={name}>{name}</option>)}</select></label>
        </div>
        <label className="block"><input type="checkbox" checked={accessible} onChange={(e) => setAccessible(e.target.checked)} /> Accessible rooms only</label>
        <button className={button} disabled={pending || !start || !end} onClick={() => void act()}>Check availability</button>
      </div>
      <div className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{mapBuilding} floor plan</h2>
          <label>Floor <select value={floor} onChange={(e) => setFloor(Number(e.target.value))}>{[...new Set(resources.filter((room) => room.building === mapBuilding).map((room) => room.floor))].sort().map((level) => <option key={level}>{level}</option>)}</select></label>
        </div>
        <svg role="img" aria-label={`${mapBuilding} floor ${floor} room availability`} className="mt-3 w-full max-w-xl" viewBox={`0 0 ${Math.max(330, ...mapRooms.map((item) => (item.position + 1) * 105 + 5))} 95`}>
          {mapRooms.map((item) => <g key={item.id} transform={`translate(${item.position * 105 + 5} 5)`}>
            <rect width="100" height="74" rx="8" fill={!slot ? "#e2e8f0" : free(item) ? "#bbf7d0" : "#fecaca"} />
            <text x="50" y="30" textAnchor="middle" fontSize="13">{item.id}</text>
            <text x="50" y="52" textAnchor="middle" fontSize="11">{!slot ? "Unchecked" : free(item) ? "Free" : "Unavailable"}</text>
          </g>)}
        </svg>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rooms.map((item) => <li key={item.id} className={panel}>
        <h3 className="font-semibold">{item.title}</h3><p className="text-sm">{item.building} · Floor {item.floor} · {item.capacity} seats</p>
        <p className="my-2 text-sm">{[...item.features, ...(item.accessible ? ["Accessible"] : [])].join(" · ")}</p>
        <button className={button} onClick={() => setSelected(item.id)}>Book room</button>
      </li>)}</ul>
      {!rooms.length && <p>No rooms match these filters.</p>}
      {reserveForm}
    </>}
    {data && tab === "Bookings" && <div className={`${panel} space-y-3`}>
      <h2 className="font-semibold">My bookings</h2>
      {!data.reservations.length && <p>You have no bookings yet.</p>}
      {data.reservations.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-t py-3">
        <div><h3 className="font-semibold">{title(item.resourceId)} · {item.status}</h3><p>{format.format(new Date(item.startAt))} – {clock.format(new Date(item.endAt))}</p><p>{item.purpose}{item.lateCancelAt && " · Late cancellation"}</p></div>
        {["pending", "confirmed"].includes(item.status) && <div className="flex gap-2">
          {item.status === "pending" && <button className={button} disabled={pending} onClick={() => void act({ action: "confirm", id: item.id })}>Confirm</button>}
          <button className="rounded-lg border px-4 py-2 text-sm" disabled={pending} onClick={() => void act({ action: "cancel", id: item.id })}>Cancel</button>
        </div>}
      </article>)}
      {data.invitations.length > 0 && <><h2 className="font-semibold">Team invitations</h2>{data.invitations.map((item) => <p key={item.id}>{title(item.resourceId)} · {format.format(new Date(item.startAt))} · {item.status}</p>)}</>}
    </div>}
    {data && tab === "Library & equipment" && <>
      <div className={`${panel} space-y-3`}><h2 className="font-semibold">Catalog</h2><label>Search by title <input className={input} type="search" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
        <p className="text-sm text-slate-600">Select dates to reserve equipment. Times are Asia/Yerevan.</p>{dateInputs}{reserveForm}
        <ul className="grid gap-3 sm:grid-cols-2">{resources.filter((item) => item.kind !== "room" && item.title.toLowerCase().includes(query.trim().toLowerCase())).map((item) => <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3" key={item.id}>
          <div><p className="font-medium">{item.title}</p><p className="text-sm text-slate-600">{item.kind === "book" ? "Library book" : "Equipment"} · {item.capacity} total</p></div>
          <button className={button} disabled={pending} onClick={() => item.kind === "book" ? void act({ action: "borrow", id: item.id }) : setSelected(item.id)}>{item.kind === "book" ? "Borrow" : "Reserve"}</button>
        </li>)}</ul>
      </div>
      {!data.staff && <div className={panel}><h2 className="mb-3 font-semibold">My loans</h2>{data.loans.map((item) => <article key={item.id} className="flex flex-wrap justify-between gap-3 border-t py-3">
        <div><strong>{title(item.resourceId)}</strong><p>{item.returnedAt ? "Returned" : `Due ${format.format(new Date(item.dueAt))}`} · {item.renewals}/2 renewals</p>{item.remindedAt && !item.returnedAt && <p className="font-medium text-amber-800">Library loan reminder</p>}</div>
        {!item.returnedAt && item.renewals < 2 && <button className={button} disabled={pending} onClick={() => void act({ action: "renew", id: item.id })}>Renew</button>}
      </article>)}</div>}
    </>}
    {data && tab === "Team booking" && <>
      <form className={`${panel} grid gap-3 sm:grid-cols-2`} onSubmit={(event) => submit(event, "team")}>
        <h2 className="font-semibold sm:col-span-2">Find a time for your team</h2>
        <label className="sm:col-span-2">Teammate account IDs (comma-separated) <input className={input} name="teammates" /></label>
        <label>Earliest start (Yerevan) <input required className={input} name="start" type="datetime-local" /></label>
        <label>Latest end (Yerevan) <input required className={input} name="end" type="datetime-local" /></label>
        <label>Duration in minutes <input required className={input} name="duration" type="number" min="15" defaultValue="60" /></label>
        <label>Team size, including you <input required className={input} name="size" type="number" min="1" defaultValue="2" /></label>
        <label>Room equipment (comma-separated) <input className={input} name="features" placeholder="projector, whiteboard" /></label>
        <button className={`${button} w-fit self-end`} disabled={pending}>Find times</button>
      </form>
      {team && <div className={`${panel} space-y-3`}>
        {team.missingSchedules > 0 && <p className="rounded-lg bg-amber-50 p-3 text-amber-900">{team.missingSchedules} team member(s) have no schedule data and were treated as available.</p>}
        {!team.options.length && <p>{team.reason}</p>}
        {team.options.map((item) => <article key={`${item.resourceId}-${item.start}`} className="flex flex-wrap items-center justify-between gap-3 border-t py-3">
          <div><h3 className="font-semibold">{title(item.resourceId)} · {format.format(new Date(item.start))}–{clock.format(new Date(item.end))}</h3>
            <p className="text-sm">Common free time · Fits {item.capacity} people · {resources.find(({ id }) => id === item.resourceId)?.features.join(", ")}{item.nextToClass && " · Next to a class"}</p></div>
          <button className={button} disabled={pending} onClick={() => {
            void act({ ...teamInput, action: "reserve-team", id: item.resourceId, start: new Date(item.start).toISOString(), end: new Date(item.end).toISOString(), purpose: "Team study session" });
          }}>Hold &amp; invite</button>
        </article>)}
      </div>}
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
