"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState, type FormEvent } from "react";

export type PersonalEvent = {
  id: string; title: string; event_date: string; starts_at: string; ends_at: string;
};

type Task = { id: string; title: string; due_on: string | null; completed: boolean };

const field = "w-full rounded border border-[#789181] bg-white p-2";
const button = "rounded bg-[#1e3328] px-4 py-2 text-white disabled:opacity-50";

export function PersonalTasks({ client }: { client: SupabaseClient }) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [selected, setSelected] = useState<Task | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const result = await client.from("personal_tasks").select("id,title,due_on,completed")
          .order("completed").order("due_on", { nullsFirst: false }).order("created_at")
          .abortSignal(controller.signal);
        if (controller.signal.aborted) return;
        if (result.error) throw result.error;
        setTasks(result.data);
      } catch {
        if (!controller.signal.aborted) setMessage("Could not load your tasks. Reload to try again.");
      }
    })();
    return () => controller.abort();
  }, [client, revision]);

  async function save(changes: Partial<Omit<Task, "id">>, id?: string, remove = false) {
    setBusy(true);
    setMessage("");
    try {
      const table = client.from("personal_tasks");
      const query = id
        ? remove ? table.delete().eq("id", id) : table.update(changes).eq("id", id)
        : table.insert(changes);
      const { error } = await query.select("id").single();
      if (error) throw error;
      setSelected(null);
      setRevision((value) => value + 1);
      setMessage(remove ? "Task deleted." : "Task saved.");
    } catch {
      setMessage("Could not save the task change.");
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    void save({ title: String(values.get("title")).trim(), due_on: String(values.get("due") || "") || null }, selected?.id);
  }

  return (
    <section id="student-tasks" className="space-y-3 rounded-xl border border-[#afbeb3] bg-white p-4">
      <h2 className="text-xl font-semibold">My tasks</h2>
      {!tasks && !message && <p>Loading tasks…</p>}
      {tasks?.length === 0 && <p>No tasks yet.</p>}
      <ul className="space-y-2">
        {tasks?.map((task) => (
          <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 rounded bg-[#eef3ee] p-2">
            <label className="flex min-w-0 items-center gap-2">
              <input type="checkbox" checked={task.completed} disabled={busy}
                onChange={(event) => void save({ completed: event.target.checked }, task.id)} />
              <span className="break-all">{task.title}{task.due_on && <small className="block">Due {task.due_on}</small>}</span>
            </label>
            <div className="flex gap-3">
              <button type="button" disabled={busy} className="underline" onClick={() => setSelected(task)}>Edit task</button>
              <button type="button" disabled={busy} className="underline" onClick={() => {
                if (window.confirm("Delete this task?")) void save({}, task.id, true);
              }}>Delete task</button>
            </div>
          </li>
        ))}
      </ul>
      <form key={selected?.id ?? revision} onSubmit={submit} className="space-y-2">
        <fieldset className="space-y-2" disabled={busy}>
          <h3 className="font-semibold">{selected ? "Edit task" : "Add task"}</h3>
          <label className="block">Task title<input className={field} name="title" defaultValue={selected?.title} maxLength={120} required /></label>
          <label className="block">Due date (optional)<input className={field} name="due" type="date" defaultValue={selected?.due_on ?? ""} /></label>
          <div className="flex gap-3">
            <button className={button}>Save task</button>
            {selected && <button type="button" className="underline" onClick={() => setSelected(null)}>Cancel</button>}
          </div>
        </fieldset>
      </form>
      {message && <p role="status">{message}</p>}
    </section>
  );
}

export function PersonalEventEditor({ client, event, from, to, onSaved, onCancel }: {
  client: SupabaseClient; event?: PersonalEvent; from: string; to: string;
  onSaved: () => void; onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function change(values: Omit<PersonalEvent, "id"> | null) {
    setBusy(true);
    setMessage("");
    try {
      const table = client.from("personal_events");
      const query = values
        ? event ? table.update(values).eq("id", event.id) : table.insert(values)
        : table.delete().eq("id", event?.id ?? "");
      const { error } = await query.select("id").single();
      if (error) throw error;
      onSaved();
    } catch {
      setMessage("Could not save the event. Check the title, date and time.");
      setBusy(false);
    }
  }

  function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const values = new FormData(formEvent.currentTarget);
    const starts_at = String(values.get("start"));
    const ends_at = String(values.get("end"));
    if (starts_at >= ends_at) {
      setMessage("End time must be after start time.");
      return;
    }
    void change({ title: String(values.get("title")).trim(), event_date: String(values.get("date")), starts_at, ends_at });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <fieldset disabled={busy} className="space-y-2">
        <h3 className="font-semibold">{event ? "Edit personal event" : "Add personal event"}</h3>
        <label className="block">Event title<input className={field} name="title" maxLength={120} defaultValue={event?.title} required /></label>
        <label className="block">Date<input className={field} name="date" type="date" min={from} max={to} defaultValue={event?.event_date ?? from} required /></label>
        <label className="block">Starts<input className={field} name="start" type="time" defaultValue={event?.starts_at.slice(0, 5)} required /></label>
        <label className="block">Ends<input className={field} name="end" type="time" defaultValue={event?.ends_at.slice(0, 5)} required /></label>
        <div className="flex flex-wrap gap-3">
          <button className={button}>Save event</button>
          {event && <>
            <button type="button" className="underline" onClick={onCancel}>Cancel edit</button>
            <button type="button" className="underline" onClick={() => {
              if (window.confirm("Delete this personal event?")) void change(null);
            }}>Delete event</button>
          </>}
        </div>
      </fieldset>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
