"use client";
import {UiText} from "@/app/components/interface-language";



import { useEffect, useState, type FormEvent } from "react";
import { getAccessToken } from "@/lib/browser-supabase";
import { RoomSimulation } from "./discovery";
import { MeetingPanel } from "./meeting-panel";

const input = "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
const button = "rounded-lg bg-[#1e3328] px-4 py-2 text-sm font-semibold text-white";
const panel = "rounded-2xl border border-slate-200 bg-white p-5";
const tabs = ["Rooms & map", "Team booking"] as const;
type Tab = typeof tabs[number] | "Staff";
type Resource = { id: string; title: string; kind: string; capacity: number; building: string; floor: number; position: number; accessible: boolean; features: string[]; opens: number; closes: number };
type Booking = { id: string; resourceId: string; startAt: string; endAt: string; status: string; purpose?: string; lateCancelAt?: string };
type Loan = { id: string; resourceId: string; dueAt: string; renewals: number; returnedAt?: string; remindedAt?: string };
type Data = { resources: Resource[]; reservations: Booking[]; loans: Loan[]; occupied: { resourceId: string; unit: number }[]; invitations: Booking[]; staff: boolean };
const format = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Yerevan", dateStyle: "medium", timeStyle: "short" });
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
  const [editing, setEditing] = useState<Resource>();
  useEffect(() => {
    let active = true;
    request(new URLSearchParams()).then((value) => { if (active) setData(value); },
      (error: Error) => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, []);
  const resources = data?.resources ?? [];
  const title = (id: string) => resources.find((item) => item.id === id)?.title ?? id;
  async function act(payload?: Record<string, unknown>) {
    setPending(true);
    setMessage("");
    try {
      if (payload) await request(new URLSearchParams(), payload);
      setData(await request(new URLSearchParams()));
      if (payload) setMessage("Saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Campus request failed."); }
    finally { setPending(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>, action: string) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    void act({ ...values, action });
  }
  return <div className="mt-7 space-y-5">
    <nav aria-label="Campus tools" className="jarvis-section-nav">
      {[...tabs, ...(data?.staff ? ["Staff" as const] : [])].map((item) => <button type="button" key={item}
        aria-pressed={tab === item} onClick={() => { setTab(item); setMessage(""); }}>
        <UiText value={item}/>
      </button>)}
    </nav>
    {tab === "Rooms & map" && <RoomSimulation />}
    {tab === "Team booking" && <MeetingPanel />}
    {tab === "Staff" && message && <p role="status">{message}</p>}
    {data?.staff && tab === "Staff" && <>
      <div className={panel}>
        <h2 className="font-semibold">Manage catalog and room hours</h2>
        <label>Edit existing resource <select className={input} value={editing?.id ?? ""} onChange={(e) => setEditing(resources.find(({ id }) => id === e.target.value))}>
          <option value="">New resource</option>{resources.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}
        </select></label>
        <form key={editing?.id ?? "new"} className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={(event) => submit(event, "resource")}>
          <label>ID <input className={input} required name="id" defaultValue={editing?.id} readOnly={!!editing} /></label>
          <label><UiText value="Title"/> <input className={input} required name="title" defaultValue={editing?.title} /></label>
          <label><UiText value="Type"/> <select className={input} name="kind" defaultValue={editing?.kind ?? "room"}><option value="room"><UiText value="Room"/></option><option value="book"><UiText value="Book"/></option><option value="equipment">Equipment</option></select></label>
          <label><UiText value="Building"/> <input className={input} name="building" defaultValue={editing?.building} /></label>
          {(["capacity", "floor", "position", "opens", "closes"] as const).map((name, index) => <label key={name}>{["Seats / copies / units", "Floor", "Map position", "Opens (minutes after midnight)", "Closes (minutes after midnight)"][index]} <input required type="number" className={input} name={name} defaultValue={editing?.[name] ?? [1, 1, 0, 480, 1200][index]} /></label>)}
          <label>Features <input className={input} name="features" defaultValue={editing?.features.join(", ")} /></label>
          <label><input type="checkbox" name="accessible" defaultChecked={editing?.accessible} /> Accessible</label>
          <button className={`${button} w-fit`} disabled={pending}>Save resource</button>
        </form>
      </div>
      <div className={panel}><h2 className="font-semibold">Manage loans</h2>
        <form className="my-3 grid gap-3 sm:grid-cols-2" onSubmit={(event) => submit(event, "staff-borrow")}>
          <label><UiText value="Book"/> <select className={input} name="id">{resources.filter(({ kind }) => kind === "book").map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
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
