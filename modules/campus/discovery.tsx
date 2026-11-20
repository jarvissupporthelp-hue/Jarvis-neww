"use client";
import {UiText} from "@/app/components/interface-language";


import { BookOpen } from "lucide-react";
import { useState } from "react";
import { labels, useLibrary } from "./library-personal";
import { digitalLibrary, type Locale } from "@/lib/locales";
import { bookCategories, bookLanguages, filterBooks, libraryFaculties } from "./books";

const input = "block min-w-0 max-w-full w-full truncate rounded-lg border border-slate-300 bg-white px-3 py-2";
const panel = "rounded-2xl border border-slate-200 bg-white p-5";
const subjects = ["Computer Networks", "Applied Mathematics", "Algorithms", "French", "Computer Architecture", "English"];
const times = [540, 630, 720, 840, 930, 1020];
const time = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export function RoomSimulation() {
  const [building, setBuilding] = useState("A");
  const [floor, setFloor] = useState(1);
  const [weekday, setWeekday] = useState(0);
  const [slot, setSlot] = useState(1);
  const rooms = Array.from({ length: 3 }, (_, index) => {
    const rotation = weekday + index + floor + (building === "B" ? 1 : 0);
    const busy = (rotation + slot) % 3 !== 0;
    return { id: `${building}-${floor}0${index + 1}`, busy, subject: subjects[(rotation + slot) % subjects.length], seats: (index + 1) * 6 };
  });
  return <section className="space-y-5">
    <div className={panel}>
      <h2 className="text-xl font-semibold"><UiText value={"Classroom occupancy"}/></h2>
      <p className="mb-4 mt-1 text-sm text-slate-600">Simulated teaching timetable · Asia/Yerevan. Change the day or class period to see which rooms are busy.</p>
      <div className="grid gap-3 sm:grid-cols-4">
        <label><UiText value="Building"/> <select className={input} value={building} onChange={(e) => setBuilding(e.target.value)}><option value="A"><UiText value={"Main Building"}/></option><option value="B"><UiText value={"Science Building"}/></option></select></label>
        <label><UiText value={"Floor"}/> <select className={input} value={floor} onChange={(e) => setFloor(+e.target.value)}><option value={1}><UiText value={"First floor"}/></option><option value={2}><UiText value={"Second floor"}/></option></select></label>
        <label><UiText value="Day"/> <select className={input} value={weekday} onChange={(e) => setWeekday(+e.target.value)}>{["Monday","Tuesday","Wednesday","Thursday","Friday"].map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
        <label><UiText value={"Class period"}/> <select className={input} value={slot} onChange={(e) => setSlot(+e.target.value)}>{times.map((start, index) => <option key={start} value={index}>{time(start)}–{time(start + 80)}</option>)}</select></label>
      </div>
    </div>
    <div className={panel}>
      <h3 className="font-semibold"><UiText value={"Floor plan"}/></h3>
      <svg role="img" aria-label={rooms.map(({ id, busy }) => `${id} ${busy ? "busy" : "free"}`).join(", ")} className="mt-4 w-full max-w-2xl" viewBox="0 0 420 145">
        <rect x="1" y="1" width="418" height="143" rx="14" fill="#f1f5f9" />
        {rooms.map(({ id, busy }, index) => <g key={id} transform={`translate(${13 + index * 136} 12)`}>
          <rect width="122" height="88" rx="8" fill={busy ? "#fee2e2" : "#dcfce7"} stroke={busy ? "#b91c1c" : "#15803d"} />
          <text x="61" y="39" textAnchor="middle" fontSize="17" fontWeight="600">{id}</text>
          <text x="61" y="65" textAnchor="middle" fontSize="14"><UiText value={busy ? "Busy" : "Free"}/></text>
        </g>)}
        <text x="210" y="127" textAnchor="middle" fontSize="12">Corridor</text>
      </svg>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">{rooms.map(({ id, busy, seats, subject }) => <li className="rounded-xl border p-3" key={id}>
        <strong>{id}</strong> <span className={busy ? "text-red-800" : "text-green-800"}><UiText value={busy ? "Busy" : "Free"}/></span>
        <p className="mt-1 text-sm">{busy ? subject : "No class scheduled"} · {seats} {"seats"}</p>
      </li>)}</ul>
    </div>
  </section>;
}

export function DigitalLibrary({ locale }: { locale: Locale }) {
  const profile = useLibrary(locale);
  const copy = digitalLibrary[profile.language];
  const t = labels[profile.language];
  const [shelf,setShelf] = useState("");
  const saved = new Map(profile.entries.map(entry => [entry.book_id,entry]));
  const [faculty, setFaculty] = useState("");
  const [language, setLanguage] = useState("");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState("");
  const matches = filterBooks({ query, faculty, language, category, format }).filter(book => !shelf || (shelf === "liked" ? saved.get(book.id)?.liked : saved.get(book.id)?.status === shelf));

  function clearFilters() {
    setFaculty("");
    setLanguage("");
    setCategory("");
    setQuery("");
    setFormat("");
    setShelf("");
  }

  return <section aria-labelledby="digital-library-heading" className="space-y-4">
    <div className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="digital-library-heading" className="flex items-center gap-3 text-3xl font-semibold tracking-tight"><BookOpen className="size-7 text-emerald-700" aria-hidden="true"/><UiText value={copy.title}/></h2>
          <p className="mt-1 text-sm text-slate-600"><UiText value={copy.description}/></p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="min-w-0"><UiText value={copy.search}/>
          <input type="search" className={input} value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label className="min-w-0"><UiText value={copy.faculty}/>
          <select className={input} value={faculty} onChange={(event) => setFaculty(event.target.value)}>
            <option value=""><UiText value={copy.allFaculties}/></option>
            {libraryFaculties.map((value) => <option key={value} value={value}>{value === "informatics" ? "IMA" : copy.faculties[value]}</option>)}
          </select>
        </label>
        <label className="min-w-0"><UiText value={copy.language}/>
          <select className={input} value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value=""><UiText value={copy.allLanguages}/></option>
            {bookLanguages.map((value) => <option key={value} value={value}>{copy.languages[value]}</option>)}
          </select>
        </label>
        <label className="min-w-0"><UiText value={copy.category}/>
          <select className={input} value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value=""><UiText value={copy.allCategories}/></option>
            {bookCategories.map((value) => <option key={value} value={value}>{copy.categories[value]}</option>)}
          </select>
        </label>
        <label className="min-w-0"><UiText value={copy.format}/>
          <select className={input} value={format} onChange={(event) => setFormat(event.target.value)}>
            <option value=""><UiText value={copy.allFormats}/></option>
            <option value="PDF">PDF</option>
            <option value="EPUB">EPUB</option>
            <option value="online"><UiText value={copy.read}/></option>
          </select>
        </label>
      </div>
    </div>
    {profile.user && <nav aria-label={t[0]} className="jarvis-section-nav">{["","later","reading","read","liked"].map((v,i)=><button key={v} aria-pressed={shelf===v} onClick={()=>setShelf(v)}>{i?t[i]:t[5]}</button>)}</nav>}
    {profile.notice && <p role="status">{profile.notice}</p>}
    <div className="flex items-center justify-between gap-3 text-sm">
      <p role="status" className="text-slate-600">{copy.books(matches.length)}</p>
      {(faculty || language || category || query || format || shelf) && <button type="button" onClick={clearFilters} className="font-semibold text-[#426852] underline"><UiText value={copy.reset}/></button>}
    </div>
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {matches.map(({ id, title, author, language, category, faculties, source, download }) => <li className={`${panel} flex min-w-0 flex-col border-l-4 border-l-emerald-700 shadow-sm transition-shadow hover:shadow-md`} key={id}>
        <p className="text-xs font-semibold text-[#426852]">{copy.languages[language]} · {copy.categories[category]}</p>
        <h3 lang={language} className="mb-1 mt-2 break-words font-serif text-xl font-semibold leading-tight">{title}</h3>
        <p lang={language} className="text-sm text-slate-600">{author}</p>
        {faculties.length > 0 && <p className="mt-1 text-xs text-slate-600">{faculties.map((value) => copy.faculties[value]).join(" · ")}</p>}
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          {(!download || download.url !== source) && <a href={source} target="_blank" rel="noreferrer" className="font-semibold underline" aria-label={`${copy.read} — ${title}`}><UiText value={copy.read}/> ↗</a>}
          {download && <a href={download.url} download={download.hosted || undefined} target={download.hosted ? undefined : "_blank"} rel="noreferrer" className="underline" aria-label={`${copy.download} ${download.format} — ${title}`}><UiText value={copy.download}/> {download.format}<UiText value={download.hosted ? "" : " ↗"}/></a>}
        </div>
        {profile.user && <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <select aria-label={t[13]+" — "+title} disabled={profile.busy} value={saved.get(id)?.status??""} onChange={e=>void profile.saveBook(id,{status:e.target.value})}>
            {["","later","reading","read"].map((v,i)=><option key={v} value={v}>{i?t[i]:t[13]}</option>)}
          </select>
          <button disabled={profile.busy} aria-label={(saved.get(id)?.liked?t[15]:t[14])+" — "+title} aria-pressed={!!saved.get(id)?.liked} onClick={()=>void profile.saveBook(id,{liked:!saved.get(id)?.liked})} className="rounded-full border px-3 py-1 aria-pressed:text-rose-700"><UiText value={saved.get(id)?.liked?"♥":"♡"}/> {saved.get(id)?.liked?t[4]:t[14]}</button>
        </div>}
      </li>)}
    </ul>
    {!matches.length && <p><UiText value={copy.empty}/></p>}
  </section>;
}
