"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { buildExamPlan, type Slot } from "./planner";
import { reviewFlashcard } from "./practice";
import { learningCourses } from "./seed";
import { button, field, useLearningData } from "./storage";
import { CoursePicker, Pomodoro, VisualMind } from "./study-tools";

const pages = [
  ["materials", "Materials"], ["quizzes", "Quizzes"], ["flashcards", "Flashcards"],
  ["pomodoro", "Pomodoro"], ["visual-mind", "Visual Mind"], ["self-test", "Self-test"],
  ["exam-plan", "Exam Plan"], ["language-bridge", "Language Bridge"],
];
const languages = ["English", "French", "Armenian", "Russian"];
type Course = (typeof learningCourses)[number];
type Exam = { id: string; title: string; course: string; start: number };
type Material = { id: string; title: string; type: string; content: string; tags: string[]; fileName?: string };

function Smart() {
  return <span className="rounded-full bg-[#eee2fa] px-2 py-1 text-xs font-semibold text-[#653695]">Smart</span>;
}

function Materials({ course }: { course: Course }) {
  const [items, setItems] = useLearningData<Material[]>(`materials:${course.code}`, [
    { id: "seed", title: course.material, type: "note", content: course.questions.map((question) => question.why).join("\n"), tags: ["revision"] },
  ]);
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
    } catch (error) {
      setMessage(error instanceof Error && ["Choose a file up to 1 MB.", "Use an HTTP or HTTPS link.", "Add material content."].includes(error.message)
        ? error.message : "Could not save. Check the link or available browser storage.");
    } finally { setBusy(false); }
  }
  const tags = [...new Set(items.flatMap((item) => item.tags))].sort();
  const found = items.filter((item) => (filter === "all" || item.type === filter)
    && (tag === "all" || item.tags.includes(tag))
    && [item.title, item.type === "note" ? item.content : "", ...item.tags].join(" ").toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-5">
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={add}>
      <label>Title <input className={`block w-full ${field}`} name="title" required maxLength={100} /></label>
      <label>Type <select className={`block w-full ${field}`} value={kind} onChange={(event) => setKind(event.target.value)}>
        <option value="note">Note</option><option value="link">Link</option><option value="file">File</option>
      </select></label>
      {kind === "file" ? <label>File <input name="file" type="file" required /></label> : <label>{kind === "link" ? "URL" : "Note"}
        <textarea className={`block w-full ${field}`} name="content" required maxLength={10000} /></label>}
      <label>Tags (comma-separated) <input className={`block w-full ${field}`} name="tags" maxLength={250} /></label>
      <button className={`w-fit ${button}`} disabled={busy}>Add material</button>
      {message && <p role="alert">{message}</p>}
    </form>
    <div className="flex flex-wrap gap-3">
      <label>Search <input className={field} type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <label>Type <select className={field} value={filter} onChange={(event) => setFilter(event.target.value)}>
        <option value="all">All</option><option value="note">Note</option><option value="link">Link</option><option value="file">File</option>
      </select></label>
      <label>Tag <select className={field} value={tag} onChange={(event) => setTag(event.target.value)}>
        <option value="all">All tags</option>{tags.map((item) => <option key={item}>{item}</option>)}
      </select></label>
    </div>
    {found.length ? <ul className="space-y-2">{found.map((item) => <li key={item.id} className="rounded border p-3">
      <strong>{item.title}</strong><p className="text-sm">{item.tags.join(" · ")}</p>
      {item.type === "note" ? <p className="whitespace-pre-wrap break-words">{item.content}</p>
        : item.type === "link" ? <a className="underline" href={item.content} target="_blank" rel="noreferrer">Open link</a>
          : <a className="underline" href={item.content} download={item.fileName}>Download {item.fileName}</a>}
    </li>)}</ul> : <p>No matching materials.</p>}
  </div>;
}

function Quiz({ course, weighted }: { course: Course; weighted: boolean }) {
  const [misses, setMisses] = useLearningData<Record<string, number>>(`weak:${course.code}`, {});
  const [order, setOrder] = useState<number[] | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [choice, setChoice] = useState<number | null>(null);
  const current = order?.[answers.length];
  const question = current === undefined ? undefined : course.questions[current];

  function start() {
    const queue = course.questions.map((_, index) => index);
    const picked = [];
    while (queue.length) {
      if (!weighted) { picked.push(...queue); break; }
      const weights = queue.map((index) => 1 + (misses[course.questions[index].topic] ?? 0));
      let draw = Math.random() * weights.reduce((sum, weight) => sum + weight, 0);
      const index = weights.findIndex((weight) => (draw -= weight) < 0);
      picked.push(queue.splice(index, 1)[0]);
    }
    setOrder(weighted ? picked.slice(0, 2) : picked);
    setAnswers([]);
    setChoice(null);
  }
  if (!order) return <button className={button} onClick={start}>{weighted ? "Start self-test" : "Start quiz"}</button>;
  if (question && current !== undefined) return <div className="space-y-3">
    <p>Question {answers.length + 1} of {order.length} · {question.topic}</p>
    <fieldset className="space-y-2"><legend className="font-semibold">{question.text}</legend>{question.choices.map((option, index) => (
      <label className="block" key={option}><input type="radio" name="answer" checked={choice === index} onChange={() => setChoice(index)} /> {option}</label>
    ))}</fieldset>
    <button className={button} disabled={choice === null} onClick={() => {
      if (choice === null) return;
      if (choice !== question.answer) setMisses({ ...misses, [question.topic]: (misses[question.topic] ?? 0) + 1 });
      setAnswers([...answers, choice]); setChoice(null);
    }}>{answers.length + 1 === order.length ? "See results" : "Next question"}</button>
  </div>;
  const score = order.filter((index, position) => course.questions[index].answer === answers[position]).length;
  return <div className="space-y-4"><p className="text-lg font-semibold">Result · {score}/{order.length}</p>
    {order.map((index, position) => {
      const entry = course.questions[index];
      return <article className="rounded border p-3" key={index}><h3 className="font-semibold">{entry.text}</h3>
        <p>Your answer: {entry.choices[answers[position]]} · {answers[position] === entry.answer ? "Correct" : "Incorrect"}</p>
        <p>Correct answer: {entry.choices[entry.answer]}. {entry.why}</p><p className="text-sm">Source: {entry.source}</p>
      </article>;
    })}<button className={button} onClick={start}>Try again</button>
  </div>;
}

function Flashcards({ course }: { course: Course }) {
  const [reviews, setReviews] = useLearningData<Record<number, { box: number; due: number }>>(`cards:${course.code}`, {});
  const [revealed, setRevealed] = useState(false);
  const [now] = useState(Date.now);
  const next = course.questions.findIndex((_, index) => (reviews[index]?.due ?? 0) <= now);
  const card = course.questions[next];
  return <div className="space-y-3">
    <p>{course.questions.filter((_, index) => (reviews[index]?.due ?? 0) <= now).length} cards due</p>
    {card ? <><p className="font-semibold">{card.text}</p><p>Box {reviews[next]?.box ?? 1} of 5</p>
      {revealed ? <><p>{card.choices[card.answer]} · {card.why}</p><div className="flex gap-3">{[false, true].map((correct) => (
        <button className={correct ? button : field} key={String(correct)} onClick={() => {
          setReviews({ ...reviews, [next]: reviewFlashcard(reviews[next]?.box ?? 1, correct, Date.now()) }); setRevealed(false);
        }}>{correct ? "Correct" : "Wrong"}</button>
      ))}</div></> : <button className={button} onClick={() => setRevealed(true)}>Reveal answer</button>}</>
      : <p>You’re caught up. Come back when more cards are due.</p>}
  </div>;
}

function LanguageBridge({ course }: { course: Course }) {
  const [terms, setTerms] = useLearningData(`terms:${course.code}`, course.terms);
  const [explanations, setExplanations] = useLearningData<string[]>(`explanations:${course.code}`, ["", "", "", ""]);
  const [prompts, setPrompts] = useLearningData(`oral:${course.code}`, `Explain how ${course.terms[0][0].toLowerCase()} is used in ${course.title}. Give an example.`);
  const [language, setLanguage] = useState(1);
  const [term, setTerm] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const usableTerms = terms.filter((row) => row[0]?.trim() && row[language]?.trim());
  const active = usableTerms[term % (usableTerms.length || 1)];
  function normalize(value: string) { return value.normalize("NFC").trim().toLowerCase().replace(/\s+/g, " "); }
  return <div className="space-y-5">
    <div className="overflow-x-auto"><table className="min-w-[620px] w-full text-left">
      <thead><tr>{languages.map((name) => <th className="p-2" key={name}>{name}</th>)}</tr></thead>
      <tbody>{terms.map((row, index) => <tr key={index}>{languages.map((name, column) => (
        <td key={name} className="p-1"><input className={`w-full ${field}`} aria-label={`${name} term ${index + 1}`} value={row[column] ?? ""} maxLength={150}
          onChange={(event) => setTerms(terms.map((entry, i) => i === index ? languages.map((_, j) => j === column ? event.target.value : entry[j] ?? "") : entry))} /></td>
      ))}</tr>)}</tbody>
    </table></div>
    <button className={field} onClick={() => setTerms([...terms, ["", "", "", ""]])}>Add term</button>
    <div className="grid gap-3 sm:grid-cols-2">{languages.map((name, index) => <label key={name}>{name} explanation
      <textarea className={`block w-full ${field}`} value={explanations[index]} maxLength={5000}
        onChange={(event) => setExplanations(explanations.map((value, i) => i === index ? event.target.value : value))} />
    </label>)}</div>
    <label>Oral practice prompts <textarea className={`block w-full ${field}`} value={prompts} maxLength={5000}
      onChange={(event) => setPrompts(event.target.value)} /></label>
    <form className="space-y-3 border-t pt-3" onSubmit={(event) => {
      event.preventDefault();
      if (active) setFeedback(normalize(answer) === normalize(active[language]) ? "Correct." : `Expected: ${active[language]}`);
    }}>
      <h3 className="font-semibold">Translation practice</h3>
      <label>Translate into <select className={field} value={language} onChange={(event) => { setLanguage(Number(event.target.value)); setTerm(0); setAnswer(""); setFeedback(""); }}>
        {languages.slice(1).map((name, index) => <option value={index + 1} key={name}>{name}</option>)}
      </select></label>
      {active ? <><p className="font-semibold">{active[0]}</p><label>Translation <input className={field} value={answer} required onChange={(event) => setAnswer(event.target.value)} /></label>
        <div className="flex gap-2"><button className={button}>Check translation</button><button type="button" className={field} onClick={() => { setTerm(term + 1); setAnswer(""); setFeedback(""); }}>Next term</button></div></>
        : <p>Add a term with a translation in this language.</p>}
      <p role="status">{feedback}</p>
    </form>
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

export function Learning({ page, exams, slots }: { page: string; exams: Exam[]; slots: Slot[] }) {
  const [code, setCode] = useLearningData("course", learningCourses[0].code);
  const course = learningCourses.find((entry) => entry.code === code) ?? learningCourses[0];
  const title = pages.find(([key]) => key === page)?.[1];
  const smart = page === "exam-plan" || page === "language-bridge";
  const content = {
    materials: <Materials course={course} />,
    quizzes: <Quiz course={course} weighted={false} />,
    flashcards: <Flashcards course={course} />,
    pomodoro: <Pomodoro course={course.code} />,
    "visual-mind": <VisualMind course={course.code} />,
    "self-test": <Quiz course={course} weighted />,
    "exam-plan": <ExamPlan exams={exams} slots={slots} />,
    "language-bridge": <LanguageBridge course={course} />,
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
        {page !== "exam-plan" && <CoursePicker course={course.code} onChange={setCode} />}
      </div>
      <div key={`${page}:${course.code}`}>{content}</div>
    </section> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{pages.map(([key, label]) => (
      <Link key={key} href={`/learning/${key}`} className="flex items-center justify-between gap-2 rounded-xl border border-[#c5d0c6] bg-white p-5 font-semibold">
        {label}{(key === "exam-plan" || key === "language-bridge") && <Smart />}
      </Link>
    ))}</div>}
  </main>;
}
