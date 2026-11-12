"use client";

import { useState } from "react";
import { books } from "./books";

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

export function DigitalLibrary() {
  const [genre, setGenre] = useState("");
  const [query, setQuery] = useState("");
  const genres = [...new Set(books.map((book) => book[3]))];
  const matches = books.filter(([, title, author, category]) => (!genre || category === genre)
    && `${title} ${author} ${category}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="space-y-4">
    <div className={panel}>
      <h2 className="text-xl font-semibold">International digital library</h2>
      <p className="mt-1 text-sm text-slate-600">Browse 20 classic books in English, including translations of international works.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label>Search by title or author <input type="search" className={input} value={query} onChange={(e) => setQuery(e.target.value)} /></label>
        <label>Category <select className={input} value={genre} onChange={(e) => setGenre(e.target.value)}><option value="">All categories</option>{genres.map((category) => <option key={category}>{category}</option>)}</select></label>
      </div>
    </div>
    <p role="status" className="text-sm text-slate-600">{matches.length} {matches.length === 1 ? "book" : "books"}</p>
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{matches.map(([id, title, author, category]) => <li className={panel} key={id}>
      <p className="text-xs font-semibold text-[#426852]">{category}</p>
      <h3 className="mt-1 font-semibold">{title}</h3><p className="text-sm text-slate-600">{author}</p>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <a href={`/api/campus/books/${id}`} target="_blank" rel="noreferrer" aria-label={`Read ${title} as PDF (opens in new tab)`} className="font-semibold underline">Read PDF ↗</a>
        <a href={`https://www.gutenberg.org/ebooks/${id}`} target="_blank" rel="noreferrer" className="underline">Source ↗</a>
      </div>
    </li>)}</ul>
    {!matches.length && <p>Try a different title, author, or category.</p>}
  </section>;
}
