"use client";

import Link from "next/link";
import { CodeTrace } from "./code-trace";
import { useState, type FormEvent } from "react";
import { buildExamPlan, type Slot } from "./planner";
import { reviewFlashcard } from "./practice";
import { courseResources } from "./resources";
import { learningCourses } from "./seed";
import { button, field, useLearningData } from "./storage";
import { CoursePicker, Pomodoro } from "./study-tools";

const pages = [
  ["materials", "Materials"], ["quizzes", "Quizzes"], ["flashcards", "Flashcards"],
  ["pomodoro", "Pomodoro"], ["code-trace", "Code Trace"], ["exam-plan", "Exam Plan"],
];
type Course = (typeof learningCourses)[number];
type Exam = { id: string; title: string; course: string; start: number };
type Material = { id: string; title: string; type: string; content: string; tags: string[]; fileName?: string; description?: string };

function Smart() {
  return <span className="rounded-full bg-[#eee2fa] px-2 py-1 text-xs font-semibold text-[#653695]">Smart</span>;
}

function Materials({ course }: { course: Course }) {
  const [items, setItems] = useLearningData<Material[]>(`materials:${course.code}`, [
    { id: "seed", title: course.material, type: "note", content: course.questions.map((question) => question.why).join("\n"), tags: ["revision"] },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState("note");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [tag, setTag] = useState("all");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title")).trim();
    let content = String(data.get("content") ?? "").trim();
    let fileName: string | undefined;
    if (!title) return;
    setBusy(true);
    setMessage("");
    try {
      if (kind === "link" && !["https:", "http:"].includes(new URL(content).protocol)) throw new Error("Use an HTTP or HTTPS link.");
      if (kind === "file") {
        const file = data.get("file");
        if (!(file instanceof File) || !file.size || file.size > 1_000_000) throw new Error("Choose a file up to 1 MB.");
        fileName = file.name;
        content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Could not read the file."));
          reader.readAsDataURL(file);
        });
      }
      if (!content) throw new Error("Add material content.");
      const tags = String(data.get("tags") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
      setItems([...items, { id: crypto.randomUUID(), title, type: kind, content, tags, fileName }]);
      form.reset();
      setShowForm(false);
    } catch (error) {
      setMessage(error instanceof Error && ["Choose a file up to 1 MB.", "Use an HTTP or HTTPS link.", "Add material content."].includes(error.message)
        ? error.message : "Could not save. Check the link or available browser storage.");
    } finally { setBusy(false); }
  }
  const materials: Material[] = [...(courseResources[course.code] ?? []), ...items];
  const tags = [...new Set(materials.flatMap((item) => item.tags))].sort();
  const found = materials.filter((item) => (filter === "all" || item.type === filter)
    && (tag === "all" || item.tags.includes(tag))
    && [item.title, item.description ?? "", item.type === "note" ? item.content : "", ...item.tags].join(" ").toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="text-lg font-semibold">Course materials</h3>
        <p className="text-sm text-slate-600">Study resources and your saved materials.</p>
      </div>
      <button type="button" className={button} aria-expanded={showForm} aria-controls={showForm ? "add-learning-material" : undefined} onClick={() => setShowForm(!showForm)}>
        {showForm ? "Close form" : "Add material"}
      </button>
    </div>
    {showForm && <form id="add-learning-material" className="grid gap-3 rounded-xl border bg-slate-50 p-4 sm:grid-cols-2" onSubmit={add}>
      <label>Title <input className={`block w-full ${field}`} name="title" required maxLength={100} /></label>
      <label>Type <select className={`block w-full ${field}`} value={kind} onChange={(event) => setKind(event.target.value)}>
        <option value="note">Note</option><option value="link">Link</option><option value="file">File</option>
      </select></label>
      {kind === "file" ? <label>File <input name="file" type="file" required /></label> : <label>{kind === "link" ? "URL" : "Note"}
        <textarea className={`block w-full ${field}`} name="content" required maxLength={10000} /></label>}
      <label>Tags (comma-separated) <input className={`block w-full ${field}`} name="tags" maxLength={250} /></label>
      <button className={`w-fit ${button}`} disabled={busy}>Add material</button>
      {message && <p role="alert">{message}</p>}
    </form>}
    <div className="flex flex-wrap gap-3">
      <label>Search <input className={field} type="search" placeholder="Find a resource or topic" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <label>Type <select className={field} value={filter} onChange={(event) => setFilter(event.target.value)}>
        <option value="all">All</option><option value="note">Note</option><option value="link">Link</option><option value="file">File</option>
      </select></label>
      <label>Tag <select className={field} value={tag} onChange={(event) => setTag(event.target.value)}>
        <option value="all">All tags</option>{tags.map((item) => <option key={item}>{item}</option>)}
      </select></label>
    </div>
    <p className="text-sm text-slate-600" aria-live="polite">{found.length} {found.length === 1 ? "material" : "materials"}</p>
    {found.length ? <ul className="grid gap-3 lg:grid-cols-2">{found.map((item) => <li key={item.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-1 text-xs font-medium text-slate-600">{item.description ? "Recommended resource" : item.type === "note" ? "Note" : item.type === "file" ? "File" : "Link"}</p>
      <h4 className="font-semibold text-slate-900">{item.title}</h4>
      {item.description && <p className="mt-1 text-sm text-slate-700">{item.description}</p>}
      <div className="my-2 flex flex-wrap gap-1.5">{item.tags.map((label, index) => <span key={index} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{label}</span>)}</div>
      {item.type === "note" ? <p className="whitespace-pre-wrap break-words">{item.content}</p>
        : item.type === "link" ? <a className="inline-block font-medium text-blue-700 underline underline-offset-4" href={item.content} target="_blank" rel="noreferrer" aria-label={`Open ${item.title} (new tab)`}>Open resource ↗</a>
          : <a className="underline" href={item.content} download={item.fileName}>Download {item.fileName}</a>}
    </li>)}</ul> : <p className="rounded-xl border border-dashed p-4 text-sm text-slate-600">No materials match. Try a different search or clear the filters.</p>}
  </div>;
}

function Quiz({ course }: { course: Course }) {
  const [misses, setMisses] = useLearningData<Record<string, number>>(`weak:${course.code}`, {});
  const [topic, setTopic] = useState("");
  const [mistakes, setMistakes] = useLearningData<string[]>(`mistakes:${course.code}`, []);
  const [order, setOrder] = useState<number[] | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [choice, setChoice] = useState<number | null>(null);
  const current = order?.[answers.length];
  const question = current === undefined ? undefined : course.questions[current];

  function start(mistakesOnly = false) {
    const picked = course.questions.map((question, index) => ({ question, index }))
      .filter(({ question }) => mistakesOnly ? mistakes.includes(question.id) : !topic || question.topic === topic)
      .sort((a, b) => (misses[b.question.topic] ?? 0) - (misses[a.question.topic] ?? 0) || a.index - b.index);
    setOrder(picked.map(({ index }) => index));
    setAnswers([]);
    setChoice(null);
  }
  if (!order) return <div className="flex flex-wrap items-center gap-3">
    <label>Quiz topic <select className={field} value={topic} onChange={(event) => setTopic(event.target.value)}>
      <option value="">All topics · weak topics first</option>
      {[...new Set(course.questions.map(({ topic }) => topic))].map((name) => <option key={name}>{name}</option>)}
    </select></label>
    <button className={button} onClick={() => start()}>Start quiz</button>
    <button className={field} disabled={!mistakes.length} onClick={() => start(true)}>Retry mistakes ({mistakes.length})</button>
  </div>;
  if (question && current !== undefined) return <div className="space-y-3">
    <p>Question {answers.length + 1} of {order.length} · {question.topic}</p>
    <fieldset className="space-y-2"><legend className="font-semibold">{question.text}</legend>{question.choices.map((option, index) => (
      <label className="block" key={option}><input type="radio" name="answer" checked={choice === index} onChange={() => setChoice(index)} /> {option}</label>
    ))}</fieldset>
    <button className={button} disabled={choice === null} onClick={() => {
      if (choice === null) return;
      if (choice !== question.answer) {
        setMisses({ ...misses, [question.topic]: (misses[question.topic] ?? 0) + 1 });
        if (!mistakes.includes(question.id)) setMistakes([...mistakes, question.id]);
      } else if (mistakes.includes(question.id)) setMistakes(mistakes.filter((id) => id !== question.id));
      setAnswers([...answers, choice]); setChoice(null);
    }}>{answers.length + 1 === order.length ? "See results" : "Next question"}</button>
  </div>;
  const score = order.filter((index, position) => course.questions[index].answer === answers[position]).length;
  return <div className="space-y-4"><p className="text-lg font-semibold">Result · {score}/{order.length}</p>
    {order.map((index, position) => {
      const entry = course.questions[index];
      return <article className="rounded border p-3" key={index}><h3 className="font-semibold">{entry.text}</h3>
        <p>Your answer: {entry.choices[answers[position]]} · {answers[position] === entry.answer ? "Correct" : "Incorrect"}</p>
        <p>Correct answer: {entry.choices[entry.answer]}</p><p className="text-sm">Source: {entry.source}</p>
      </article>;
    })}<button className={button} onClick={() => start()}>Try again</button> <button className={field} onClick={() => setOrder(null)}>Choose another topic</button>
  </div>;
}

function Flashcards({ course }: { course: Course }) {
  const [reviews, setReviews] = useLearningData<Record<string, { box: number; due: number }>>(`deck-v2:${course.code}`, {});
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<"due" | "browse">("due");
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [now] = useState(Date.now);
  const deck = course.questions.filter((card) => !topic || card.topic === topic);
  const due = deck.filter((card) => (reviews[card.id]?.due ?? 0) <= now);
  const card = mode === "due" ? due[0] : deck[index % deck.length];
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-3">
      <label>Topic <select className={field} value={topic} onChange={(event) => { setTopic(event.target.value); setIndex(0); setRevealed(false); }}>
        <option value="">All topics</option>{[...new Set(course.questions.map(({ topic }) => topic))].map((name) => <option key={name}>{name}</option>)}
      </select></label>
      <button className={mode === "due" ? button : field} onClick={() => { setMode("due"); setRevealed(false); }}>Due review</button>
      <button className={mode === "browse" ? button : field} onClick={() => { setMode("browse"); setRevealed(false); }}>Browse deck</button>
    </div>
    <p>{deck.length} cards · {due.length} due</p>
    {card ? <div className="space-y-3 rounded-xl border bg-[#f6f9f5] p-5">
      <p className="text-sm">{card.topic} · Box {reviews[card.id]?.box ?? 1} of 5{mode === "browse" ? ` · ${index % deck.length + 1}/${deck.length}` : ""}</p>
      <p className="text-lg font-semibold">{card.text}</p>
      {revealed ? <><p>{card.choices[card.answer]}</p>
        {mode === "due" && <div className="flex gap-3">{[false, true].map((correct) => (
          <button className={correct ? button : field} key={String(correct)} onClick={() => {
            setReviews({ ...reviews, [card.id]: reviewFlashcard(reviews[card.id]?.box ?? 1, correct, Date.now()) }); setRevealed(false);
          }}>{correct ? "Got it" : "Review again"}</button>
        ))}</div>}
      </> : <button className={button} onClick={() => setRevealed(true)}>Flip card</button>}
      {mode === "browse" && <button className={field} onClick={() => { setIndex(index + 1); setRevealed(false); }}>Next card</button>}
    </div> : <p>No cards are due for this topic. Browse the deck to keep practicing.</p>}
  </div>;
}

const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Yerevan", dateStyle: "medium", timeStyle: "short" });
const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Yerevan", dateStyle: "full" });
const duration = (minutes: number) => [Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)}h` : "", minutes % 60 ? `${minutes % 60}m` : ""].filter(Boolean).join(" ");

function ExamPlan({ exams, slots }: { exams: Exam[]; slots: Slot[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, { confidence: number; weight: number }>>({});
  const [plan, setPlan] = useState<ReturnType<typeof buildExamPlan> | null>(null);
  const inputs = exams.filter((exam) => selected.includes(exam.id)).map((exam) => {
    const topics = [...new Set(learningCourses.find(({ code }) => code === exam.course)?.questions.map(({ topic }) => topic) ?? ["Core concepts", "Practice problems"])];
    return { ...exam, topics: topics.map((title) => ({ title, ...(values[`${exam.id}:${title}`] ?? { confidence: 0.5, weight: 3 }) })) };
  });
  const dates = [...new Set(plan?.blocks.map((block) => day.format(block.start)) ?? [])];
  return <div className="space-y-4">
    <p>Choose exams and set topic confidence and weight. Times use Asia/Yerevan and free slots from Academics.</p>
    {exams.length ? exams.map((exam) => <label className="block" key={exam.id}>
      <input type="checkbox" checked={selected.includes(exam.id)} onChange={(event) => {
        setSelected(event.target.checked ? [...selected, exam.id] : selected.filter((id) => id !== exam.id)); setPlan(null);
      }} /> {exam.title} · {time.format(exam.start)}
    </label>) : <p>No upcoming exams in Academics.</p>}
    {inputs.map((exam) => <fieldset className="space-y-3 rounded border p-3" key={exam.id}><legend className="font-semibold">{exam.title}</legend>
      {exam.topics.map((topic) => <div className="flex flex-wrap items-center gap-3" key={topic.title}>
        <span className="font-medium">{topic.title}</span>
        <label>Confidence <input className={field} type="range" min="0" max="1" step="0.05" value={topic.confidence}
          onChange={(event) => { setValues({ ...values, [`${exam.id}:${topic.title}`]: { weight: topic.weight, confidence: Number(event.target.value) } }); setPlan(null); }} /> {topic.confidence}</label>
        <label>Weight <select className={field} value={topic.weight} onChange={(event) => {
          setValues({ ...values, [`${exam.id}:${topic.title}`]: { confidence: topic.confidence, weight: Number(event.target.value) } }); setPlan(null);
        }}>{[1, 2, 3, 4, 5].map((weight) => <option key={weight}>{weight}</option>)}</select></label>
      </div>)}
    </fieldset>)}
    <button className={button} disabled={!inputs.length} onClick={() => setPlan(buildExamPlan(inputs, slots))}>Build study plan</button>
    {plan && <div className="space-y-3" aria-live="polite">
      {plan.warnings.map((warning) => <p className="rounded bg-[#fce6ce] p-2" key={warning.examId}>Short by {duration(warning.minutes)} for {warning.title}.</p>)}
      {!dates.length && <p>No study blocks fit the available time.</p>}
      {dates.map((date) => <section key={date} className="rounded border p-3"><h3 className="font-semibold">{date}</h3>
        <ul>{plan.blocks.filter((block) => day.format(block.start) === date).map((block) => <li key={block.start} className="mt-2">
          <strong>{block.kind === "revision" ? "Revision · " : ""}{block.title}</strong>
          <p>{time.format(block.start)} – {time.format(block.end)}</p><p className="text-sm">{block.why}</p>
        </li>)}</ul>
      </section>)}
    </div>}
  </div>;
}

type TimetableLesson = { course: string; title: string; start: string; status: string };

function DailyStudy({ lessons, date }: { lessons: TimetableLesson[]; date: string }) {
  const [day, setDay] = useState(date);
  const scheduled = [...new Set(lessons.filter((lesson) => lesson.start.startsWith(day) && lesson.status !== "Cancelled").map(({ course }) => course))];
  const available = learningCourses.filter(({ code }) => scheduled.includes(code));
  return <section className="space-y-3 rounded-xl border bg-white p-5">
    <h2 className="text-xl font-semibold">Study from your timetable</h2>
    <label>Class date <input className={field} type="date" value={day} onChange={(event) => setDay(event.target.value)} /></label>
    {available.length ? <ul className="space-y-2">{available.map(({ code, title }) => (
      <li key={code} className="flex flex-wrap items-center gap-3">
        <strong>{title}</strong>
        <Link className="underline" href={`/learning/quizzes?course=${code}`}>Topic quizzes</Link>
        <Link className="underline" href={`/learning/flashcards?course=${code}`}>Flashcards</Link>
        <Link className="underline" href={`/learning/pomodoro?course=${code}`}>Focus session</Link>
      </li>
    ))}</ul> : <p>No subjects with practice decks on this date. Choose a course below to practice anytime.</p>}
  </section>;
}

export function Learning({ page, exams, slots, lessons, date, initialCourse }: {
  page: string; exams: Exam[]; slots: Slot[]; lessons: TimetableLesson[]; date: string; initialCourse?: string;
}) {
  const [preferred, setPreferred] = useLearningData("course", learningCourses[0].code);
  const [selection, setSelection] = useState(initialCourse);
  const code = selection ?? preferred;
  const setCode = (value: string) => { setSelection(value); setPreferred(value); };
  const course = learningCourses.find((entry) => entry.code === code) ?? learningCourses[0];
  const title = pages.find(([key]) => key === page)?.[1];
  const smart = page === "exam-plan";
  const content = {
    materials: <Materials course={course} />,
    quizzes: <Quiz course={course} />,
    flashcards: <Flashcards course={course} />,
    pomodoro: <Pomodoro course={course.code} />,
    "code-trace": <CodeTrace />,
    "exam-plan": <ExamPlan exams={exams} slots={slots} />,
  }[page];
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-8">
    <header><Link href="/" className="text-sm font-semibold underline">JARVIS home</Link>
      <h1 className="mt-2 text-4xl font-semibold">Learning</h1>
    </header>
    <nav aria-label="Learning" className="flex flex-wrap gap-2">
      {pages.map(([key, label]) => <Link key={key} href={`/learning/${key}`} aria-current={page === key ? "page" : undefined}
        className={`rounded-md px-3 py-2 text-sm font-semibold ${page === key ? "bg-[#234c3c] text-white" : "bg-[#e6eee6]"}`}>{label}</Link>)}
    </nav>
    {title ? <section className="space-y-4 rounded-xl border border-[#c5d0c6] bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-2xl font-semibold">{title}{smart && <Smart />}</h2>
        {page !== "exam-plan" && page !== "code-trace" && <CoursePicker course={course.code} onChange={setCode} />}
      </div>
      <div key={`${page}:${course.code}`}>{content}</div>
    </section> : <><DailyStudy lessons={lessons} date={date} /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{pages.map(([key, label]) => (
      <Link key={key} href={`/learning/${key}`} className="flex items-center justify-between gap-2 rounded-xl border border-[#c5d0c6] bg-white p-5 font-semibold">
        {label}{key === "exam-plan" && <Smart />}
      </Link>
    ))}</div></>}
  </main>;
}
