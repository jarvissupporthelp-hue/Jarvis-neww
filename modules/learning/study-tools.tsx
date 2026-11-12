"use client";

import { useEffect, useState } from "react";
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
    <div className="flex flex-wrap gap-2">
      {([["Quick review", 10, 3], ["Problem solving", 25, 5], ["Coding sprint", 50, 10]] as const).map(([label, work, rest]) => (
        <button key={label} className={field} disabled={!!running} onClick={() => {
          setSettings({ ...settings, work, rest }); setPhase("work"); setSeconds(null);
        }}>{label} · {work} min</button>
      ))}
    </div>
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

export function CoursePicker({ course, onChange }: { course: string; onChange: (value: string) => void }) {
  return <label>Course <select className={field} value={course} onChange={(event) => onChange(event.target.value)}>
    {learningCourses.map(({ code, title }) => <option key={code} value={code}>{title}</option>)}
  </select></label>;
}
