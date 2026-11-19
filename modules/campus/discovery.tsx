"use client";

import { useState } from "react";
import Link from "next/link";
import { digitalLibrary, type Locale } from "@/lib/locales";
import { bookCategories, bookLanguages, filterBooks, libraryFaculties } from "./books";

const input = "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2";
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
      <h2 className="text-xl font-semibold">Classroom occupancy</h2>
      <p className="mb-4 mt-1 text-sm text-slate-600">Simulated teaching timetable · Asia/Yerevan. Change the day or class period to see which rooms are busy.</p>
      <div className="grid gap-3 sm:grid-cols-4">
        <label>Building <select className={input} value={building} onChange={(e) => setBuilding(e.target.value)}><option value="A">Main Building</option><option value="B">Science Building</option></select></label>
        <label>Floor <select className={input} value={floor} onChange={(e) => setFloor(+e.target.value)}><option value={1}>First floor</option><option value={2}>Second floor</option></select></label>
        <label>Day <select className={input} value={weekday} onChange={(e) => setWeekday(+e.target.value)}>{["Monday","Tuesday","Wednesday","Thursday","Friday"].map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
        <label>Class period <select className={input} value={slot} onChange={(e) => setSlot(+e.target.value)}>{times.map((start, index) => <option key={start} value={index}>{time(start)}–{time(start + 80)}</option>)}</select></label>
      </div>
    </div>
    <div className={panel}>
      <h3 className="font-semibold">Floor plan</h3>
      <svg role="img" aria-label={rooms.map(({ id, busy }) => `${id} ${busy ? "busy" : "free"}`).join(", ")} className="mt-4 w-full max-w-2xl" viewBox="0 0 420 145">
        <rect x="1" y="1" width="418" height="143" rx="14" fill="#f1f5f9" />
        {rooms.map(({ id, busy }, index) => <g key={id} transform={`translate(${13 + index * 136} 12)`}>
          <rect width="122" height="88" rx="8" fill={busy ? "#fee2e2" : "#dcfce7"} stroke={busy ? "#b91c1c" : "#15803d"} />
          <text x="61" y="39" textAnchor="middle" fontSize="17" fontWeight="600">{id}</text>
          <text x="61" y="65" textAnchor="middle" fontSize="14">{busy ? "Busy" : "Free"}</text>
        </g>)}
        <text x="210" y="127" textAnchor="middle" fontSize="12">Corridor</text>
      </svg>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">{rooms.map(({ id, busy, seats, subject }) => <li className="rounded-xl border p-3" key={id}>
        <strong>{id}</strong> <span className={busy ? "text-red-800" : "text-green-800"}>{busy ? "Busy" : "Free"}</span>
        <p className="mt-1 text-sm">{busy ? subject : "No class scheduled"} · {seats} seats</p>
      </li>)}</ul>
    </div>
  </section>;
}

export function DigitalLibrary({ locale }: { locale: Locale }) {
  const copy = digitalLibrary[locale];
  const [faculty, setFaculty] = useState("");
  const [language, setLanguage] = useState("");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const matches = filterBooks({ query, faculty, language, category });

  function clearFilters() {
    setFaculty("");
    setLanguage("");
    setCategory("");
    setQuery("");
  }

  return <section aria-labelledby="digital-library-heading" className="space-y-4">
    <div className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="digital-library-heading" className="text-xl font-semibold">{copy.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{copy.description}</p>
        </div>
        <Link href={`/campus?tab=library&lang=${locale === "hy" ? "en" : "hy"}`} className="text-sm font-semibold text-[#426852] underline" lang={locale === "hy" ? "en" : "hy"}>
          {locale === "hy" ? "English" : "Հայերեն"}
        </Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="min-w-0">{copy.search}
          <input type="search" className={input} value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label className="min-w-0">{copy.faculty}
          <select className={input} value={faculty} onChange={(event) => setFaculty(event.target.value)}>
            <option value="">{copy.allFaculties}</option>
            {libraryFaculties.map((value) => <option key={value} value={value}>{copy.faculties[value]}</option>)}
          </select>
        </label>
        <label className="min-w-0">{copy.language}
          <select className={input} value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="">{copy.allLanguages}</option>
            {bookLanguages.map((value) => <option key={value} value={value}>{copy.languages[value]}</option>)}
          </select>
        </label>
        <label className="min-w-0">{copy.category}
          <select className={input} value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">{copy.allCategories}</option>
            {bookCategories.map((value) => <option key={value} value={value}>{copy.categories[value]}</option>)}
          </select>
        </label>
      </div>
    </div>
    <div className="flex items-center justify-between gap-3 text-sm">
      <p role="status" className="text-slate-600">{copy.books(matches.length)}</p>
      {(faculty || language || category || query) && <button type="button" onClick={clearFilters} className="font-semibold text-[#426852] underline">{copy.reset}</button>}
    </div>
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {matches.map(({ id, title, author, language, category, faculties, source, download }) => <li className={`${panel} min-w-0`} key={id}>
        <p className="text-xs font-semibold text-[#426852]">{copy.languages[language]} · {copy.categories[category]}</p>
        <h3 lang={language} className="mt-1 break-words font-semibold">{title}</h3>
        <p lang={language} className="text-sm text-slate-600">{author}</p>
        {faculties.length > 0 && <p className="mt-1 text-xs text-slate-600">{faculties.map((value) => copy.faculties[value]).join(" · ")}</p>}
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          {(!download || download.url !== source) && <a href={source} target="_blank" rel="noreferrer" className="font-semibold underline" aria-label={`${copy.read} — ${title}`}>{copy.read} ↗</a>}
          {download && <a href={download.url} download={download.hosted || undefined} target={download.hosted ? undefined : "_blank"} rel="noreferrer" className="underline" aria-label={`${copy.download} ${download.format} — ${title}`}>{copy.download} {download.format}{download.hosted ? "" : " ↗"}</a>}
        </div>
      </li>)}
    </ul>
    {!matches.length && <p>{copy.empty}</p>}
  </section>;
}
