"use client";

import { useEffect, useState, type PointerEvent } from "react";
import { exportMindMap, importMindMap, type MindMap, type MindNode } from "./practice";
import { button, field, useLearningData } from "./storage";
import { learningCourses } from "./seed";

type Session = { course: string; minutes: number; finished: number };
type Settings = { work: number; rest: number; long: number };

export function Pomodoro({ course }: { course: string }) {
  const [settings, setSettings] = useLearningData<Settings>("timer-settings", { work: 25, rest: 5, long: 15 });
  const [sessions, setSessions] = useLearningData<Session[]>("timer-sessions", []);
  const [phase, setPhase] = useState<keyof Settings>("work");
  const [rounds, setRounds] = useState(0);
  const [running, setRunning] = useState<{ end: number; minutes: number; course: string } | null>(null);
  const [seconds, setSeconds] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [chartDate, setChartDate] = useState(Date.now);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((running.end - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining) return;
      setRunning(null);
      setSeconds(null);
      if (phase === "work") {
        try { setSessions([...sessions, { course: running.course, minutes: running.minutes, finished: running.end }]); }
        catch { setNotice("Could not save the completed session."); }
        setChartDate(running.end);
        setRounds(rounds + 1);
        setPhase((rounds + 1) % 4 === 0 ? "long" : "rest");
      } else setPhase("work");
    }, 250);
    return () => window.clearInterval(timer);
  }, [running, phase, rounds, sessions, setSessions]);

  const remaining = seconds ?? settings[phase] * 60;
  const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Yerevan", dateStyle: "short" });
  const week = Array.from({ length: 7 }, (_, index) => {
    const day = date.format(new Date(chartDate - (6 - index) * 86_400_000));
    return { day, minutes: sessions.filter((item) => item.course === course && date.format(item.finished) === day)
      .reduce((sum, item) => sum + item.minutes, 0) };
  });
  const max = Math.max(1, ...week.map(({ minutes }) => minutes));
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-3">{([["work", "Work"], ["rest", "Break"], ["long", "Long break"]] as const).map(([key, label]) => (
      <label key={key}>{label} (min) <input className={`w-20 ${field}`} type="number" min="1" max="120" value={settings[key]} disabled={!!running}
        onChange={(event) => { const value = Number(event.target.value); if (Number.isInteger(value) && value >= 1 && value <= 120) { setSettings({ ...settings, [key]: value }); setSeconds(null); } }} /></label>
    ))}</div>
    <p className="text-sm">{phase === "work" ? "Focus" : phase === "rest" ? "Short break" : "Long break"} · {rounds} completed rounds</p>
    <p className="text-5xl font-semibold tabular-nums">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</p>
    <div className="flex gap-3">
      <button className={button} onClick={() => {
        if (running) {
          setSeconds(Math.max(1, Math.ceil((running.end - Date.now()) / 1000)));
          setRunning(null);
        } else setRunning({ end: Date.now() + remaining * 1000, minutes: settings[phase], course });
      }}>{running ? "Pause" : seconds === null ? "Start" : "Resume"}</button>
      <button className={field} onClick={() => { setRunning(null); setSeconds(null); }}>Reset</button>
    </div>
    {notice && <p role="alert">{notice}</p>}
    <h3 className="font-semibold">Focus minutes over the last seven days</h3>
    <div className="space-y-2">{week.map(({ day, minutes }) => <div key={day} className="grid grid-cols-[7rem_1fr_4rem] items-center gap-2 text-sm">
      <time dateTime={day}>{day}</time><meter min={0} max={max} value={minutes} className="w-full" aria-label={`Focus minutes on ${day}`} /><span>{minutes} min</span>
    </div>)}</div>
  </div>;
}

const emptyMap: MindMap = { nodes: [{ id: "root", label: "Main idea", color: "#d4e5dc", x: 120, y: 80 }], links: [] };
const width = 720;
const height = 360;

export function VisualMind({ course }: { course: string }) {
  const [versions, setVersions] = useLearningData<MindMap[]>(`mind:${course}`, [emptyMap]);
  const [selected, setSelected] = useState("");
  const [target, setTarget] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [drag, setDrag] = useState<MindNode | null>(null);
  const map = versions.at(-1) ?? emptyMap;
  const nodes = map.nodes.map((node) => node.id === drag?.id ? drag : node);
  const active = map.nodes.find((node) => node.id === selected);
  function save(next: MindMap) { setVersions([...versions, next].slice(-10)); }
  function editNode(node: MindNode) {
    save({ ...map, nodes: map.nodes.map((item) => item.id === node.id ? node : item) });
  }
  function position(event: PointerEvent<SVGGElement>, node: MindNode) {
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!bounds) return node;
    return { ...node, x: Math.max(65, Math.min(width - 65, (event.clientX - bounds.left) * width / bounds.width)),
      y: Math.max(22, Math.min(height - 22, (event.clientY - bounds.top) * height / bounds.height)) };
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2">
      <button className={button} onClick={() => {
        const id = crypto.randomUUID();
        save({ ...map, nodes: [...map.nodes, { id, label: "New idea", color: "#d4e5dc", x: 210, y: 150 }] });
        setSelected(id); setLabel("New idea");
      }} disabled={map.nodes.length >= 200}>Add node</button>
      <button className={field} disabled={versions.length < 2} onClick={() => setVersions(versions.slice(0, -1))}>Undo</button>
      <button className={field} onClick={() => {
        const url = URL.createObjectURL(new Blob([exportMindMap(map)], { type: "application/json" }));
        const link = document.createElement("a"); link.href = url; link.download = `${course}-mind-map.json`; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}>Export JSON</button>
      <label className="block">Import JSON <input type="file" accept=".json,application/json" onChange={async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
          if (file.size > 256_000) throw new Error();
          save(importMindMap(await file.text())); setSelected(""); setError("");
        } catch { setError("The file is not a valid JARVIS mind map."); }
        event.target.value = "";
      }} /></label>
    </div>
    {error && <p role="alert">{error}</p>}
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full touch-none rounded-lg border bg-[#f6f9f5]" aria-label="Mind-map canvas">
      {map.links.map(([a, b]) => {
        const left = nodes.find(({ id }) => id === a);
        const right = nodes.find(({ id }) => id === b);
        return left && right && <line key={`${a}:${b}`} x1={left.x} y1={left.y} x2={right.x} y2={right.y} stroke="#527761" strokeWidth="2" />;
      })}
      {nodes.map((node) => <g key={node.id} className="cursor-grab" transform={`translate(${node.x}, ${node.y})`}
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setSelected(node.id); setLabel(node.label); }}
        onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) setDrag(position(event, node)); }}
        onPointerUp={() => { if (drag?.id === node.id) editNode(drag); setDrag(null); }}
        onPointerCancel={() => setDrag(null)}>
        <rect x="-62" y="-19" width="124" height="38" rx="8" fill={node.color} stroke={selected === node.id ? "#24533d" : "#a6b8aa"} strokeWidth="2" />
        <text textAnchor="middle" dominantBaseline="middle" fontSize="13">{node.label.length > 17 ? `${node.label.slice(0, 16)}…` : node.label}</text>
      </g>)}
    </svg>
    <div className="flex flex-wrap gap-3">
      <label>Node <select className={field} value={selected} onChange={(event) => { setSelected(event.target.value); setLabel(map.nodes.find(({ id }) => id === event.target.value)?.label ?? ""); }}>
        <option value="">Select a node</option>{map.nodes.map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}
      </select></label>
      {active && <>
        <label>Name <input className={field} value={label} maxLength={80} onChange={(event) => setLabel(event.target.value)} /></label>
        <button className={field} disabled={!label.trim()} onClick={() => editNode({ ...active, label: label.trim() })}>Rename</button>
        <label>Color <input type="color" value={active.color} onChange={(event) => editNode({ ...active, color: event.target.value })} /></label>
        <label>Connect to <select className={field} value={target} onChange={(event) => setTarget(event.target.value)}>
          <option value="">Select a node</option>{map.nodes.filter(({ id }) => id !== active.id).map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}
        </select></label>
        <button className={field} disabled={!target || target === active.id} onClick={() => {
          if (map.nodes.some(({ id }) => id === target) && !map.links.some(([a, b]) => (a === active.id && b === target) || (b === active.id && a === target))) {
            save({ ...map, links: [...map.links, [active.id, target]] });
          }
          setTarget("");
        }}>Connect</button>
      </>}
    </div>
    <p className="text-sm">Autosaved in this browser · {versions.length} of 10 versions</p>
  </div>;
}

export function CoursePicker({ course, onChange }: { course: string; onChange: (value: string) => void }) {
  return <label>Course <select className={field} value={course} onChange={(event) => onChange(event.target.value)}>
    {learningCourses.map(({ code, title }) => <option key={code} value={code}>{title}</option>)}
  </select></label>;
}
