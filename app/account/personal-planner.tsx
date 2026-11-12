"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState, type FormEvent } from "react";

export type PersonalEvent = {
  id: string; title: string; event_date: string; starts_at: string; ends_at: string;
};

type Task = { id: string; title: string; due_on: string | null; completed: boolean };

const field = "w-full rounded border border-[#789181] bg-white p-2";
const button = "rounded jarvis-primary-button px-4 py-2 text-white disabled:opacity-50";

export function PersonalTasks({ client }: { client: SupabaseClient }) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [selected, setSelected] = useState<Task | null>(null);
  const [editing, setEditing] = useState(false);
  const [filter, setFilter] = useState<"open" | "all" | "done">("open");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
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
        setLoadError("");
      } catch {
        if (!controller.signal.aborted) setLoadError("Could not load your tasks. Please try again.");
      }
    })();
    return () => controller.abort();
  }, [client, revision]);

  async function save(changes: Partial<Omit<Task, "id">>, id?: string, remove = false) {
    setBusy(true);
    setMessage("");
    try {
      const table = client.from("personal_tasks");
      const mutation = id
        ? remove ? table.delete().eq("id", id) : table.update(changes).eq("id", id)
        : table.insert(changes);
      const { error } = await mutation.select("id").single();
      if (error) throw error;
      setSelected(null);
      setEditing(false);
      setRevision((value) => value + 1);
      setMessage(remove ? "Task deleted." : "Task saved.");
    } catch {
      setMessage("Could not save your change. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const title = String(values.get("title") ?? "").trim();
    if (!title) { setMessage("Enter a task title."); return; }
    void save({ title, due_on: String(values.get("due") || "") || null }, selected?.id);
  }

  const allTasks = tasks ?? [];
  const open = allTasks.filter((task) => !task.completed).length;
  const completed = allTasks.length - open;
  const today = new Intl.DateTimeFormat("sv-SE", {timeZone: "Asia/Yerevan", year: "numeric", month: "2-digit", day: "2-digit"}).format(new Date());
  const visible = allTasks.filter((task) => (
    (filter === "all" || (filter === "open" ? !task.completed : task.completed))
    && task.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  ));
  const completePercent = allTasks.length ? Math.round(completed * 100 / allTasks.length) : 0;

  function beginEdit(task: Task) {
    setSelected(task);
    setEditing(true);
    setMessage("");
  }

  return (
    <section id="student-tasks" className="ui-task-workspace" aria-labelledby="ui-task-title">
      <div className="ui-task-heading">
        <div>
          <span className="ui-kicker">YOUR PRODUCTIVITY</span>
          <h2 id="ui-task-title">My tasks</h2>
          <p>Plan what matters, then check it off as you go.</p>
        </div>
        <button className="ui-action-primary" type="button" onClick={() => { setSelected(null); setEditing(true); setMessage(""); }}>
          <span aria-hidden="true">＋</span> New task
        </button>
      </div>

      <div className="ui-task-summary" aria-label="Task progress">
        <div className="ui-task-summary-copy"><strong>{open}</strong><span>tasks remaining</span></div>
        <div className="ui-task-summary-progress">
          <div className="ui-task-summary-line"><span>Completed</span><strong>{completePercent}%</strong></div>
          <div className="ui-progress-meter" role="progressbar" aria-label="Tasks completed" aria-valuenow={completePercent} aria-valuemin={0} aria-valuemax={100}>
            <span style={{width: completePercent + "%"}} />
          </div>
        </div>
        <div className="ui-task-summary-done"><strong>{completed}</strong><span>finished</span></div>
      </div>

      <div className="ui-task-board">
        <div className="ui-task-toolbar">
          <div className="ui-segments" role="group" aria-label="Filter tasks by status">
            {([
              ["open", "To do", open],
              ["all", "All", allTasks.length],
              ["done", "Done", completed],
            ] as const).map(([key, label, count]) => (
              <button type="button" key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>
                {label} <span>{count}</span>
              </button>
            ))}
          </div>
          <label className="ui-search">
            <span className="sr-only">Search your tasks</span>
            <span aria-hidden="true">⌕</span>
            <input type="search" placeholder="Search tasks" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
        </div>

        {loadError && <div className="ui-task-notice" role="alert">{loadError}
          <button type="button" className="ui-text-action" onClick={() => { setLoadError(""); setRevision((value) => value + 1); }}>Retry</button>
        </div>}
        {!tasks && !loadError && <div className="ui-task-loading" role="status">Loading your tasks…</div>}
        {tasks && visible.length === 0 && <div className="ui-task-empty">
          <span className="ui-empty-symbol" aria-hidden="true">✓</span>
          <strong>{query ? "No matching tasks" : filter === "done" ? "Nothing completed yet" : filter === "open" ? "You're all caught up" : "No tasks yet"}</strong>
          <p>{query ? "Try a different search." : "Add a task to get started or choose another filter."}</p>
          {query && <button type="button" className="ui-text-action" onClick={() => setQuery("")}>Clear search</button>}
        </div>}
        {tasks && visible.length > 0 && <ul className="ui-task-items">
          {visible.map((task) => {
            const overdue = !task.completed && !!task.due_on && task.due_on < today;
            return <li key={task.id} className={"ui-task-item" + (task.completed ? " is-complete" : "")}>
              <label className="ui-task-check">
                <input type="checkbox" checked={task.completed} disabled={busy} onChange={(event) => void save({ completed: event.target.checked }, task.id)} />
                <span className="sr-only">{task.completed ? "Mark incomplete: " : "Mark complete: "}{task.title}</span>
              </label>
              <div className="ui-task-item-main">
                <strong>{task.title}</strong>
                <div className="ui-task-meta">
                  <span className={"ui-task-tag" + (overdue ? " is-overdue" : "")}>{task.completed ? "Completed" : overdue ? "Overdue" : "To do"}</span>
                  {task.due_on && <time dateTime={task.due_on}>Due {new Intl.DateTimeFormat("en-GB", {day: "numeric", month: "short", timeZone: "UTC"}).format(new Date(task.due_on + "T00:00:00Z"))}</time>}
                </div>
              </div>
              <div className="ui-task-item-actions">
                <button type="button" disabled={busy} onClick={() => beginEdit(task)}>Edit</button>
                <button type="button" disabled={busy} onClick={() => { if (window.confirm("Delete this task?")) void save({}, task.id, true); }}>Delete</button>
              </div>
            </li>;
          })}
        </ul>}
      </div>

      {editing && <form key={selected?.id ?? "new"} onSubmit={submit} className="ui-task-editor">
        <div className="ui-task-editor-head">
          <div><span className="ui-kicker">TASK DETAILS</span><h3>{selected ? "Edit task" : "Create task"}</h3></div>
          <button type="button" className="ui-icon-close" aria-label="Close task editor" disabled={busy} onClick={() => {setEditing(false); setSelected(null);}}>×</button>
        </div>
        <fieldset disabled={busy} className="ui-task-fields">
          <label>Title <input className={field} name="title" defaultValue={selected?.title ?? ""} maxLength={120} placeholder="What needs to get done?" required /></label>
          <label>Due date <span className="ui-optional">(optional)</span><input className={field} name="due" type="date" defaultValue={selected?.due_on ?? ""} /></label>
          <div className="ui-task-editor-buttons">
            <button type="submit" className="ui-action-primary">{busy ? "Saving…" : selected ? "Save changes" : "Add task"}</button>
            <button type="button" className="ui-action-secondary" disabled={busy} onClick={() => {setEditing(false); setSelected(null);}}>Cancel</button>
          </div>
        </fieldset>
      </form>}
      {message && <p role="status" className="ui-feedback" aria-live="polite">{message}</p>}
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
