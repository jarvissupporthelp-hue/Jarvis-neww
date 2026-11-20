"use client";

import { useInterfaceCopy } from "@/app/components/interface-language";
import { useEffect, useRef, useState } from "react";
import { practiceQuestionCount, practiceQuizzes, practiceSubjects } from "@/lib/practice-quiz-catalog";
import type { gradeQuestions, publicQuizQuestions } from "@/lib/course-quizzes";

type Quiz = (typeof practiceQuizzes)[number];
type Questions = NonNullable<ReturnType<typeof publicQuizQuestions>>;
type Result = NonNullable<ReturnType<typeof gradeQuestions>>;

const primary = "inline-flex min-h-11 items-center justify-center rounded-xl bg-[#5338b2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#49319e] disabled:opacity-50";
const secondary = "ui-action-secondary min-h-11";

export function PracticeCatalog() {
  const t = useInterfaceCopy();
  const [subject, setSubject] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Quiz | null>(null);
  const [limit, setLimit] = useState(12);
  const header = useRef<HTMLHeadingElement>(null);
  const filter = search.trim().toLowerCase();
  const matches = practiceQuizzes.filter(quiz =>
    (!subject || quiz.subject === subject) && `${quiz.title} ${t(quiz.subject)}`.toLowerCase().includes(filter));

  if (selected) return <PracticeAttempt key={selected.id} quiz={selected} onBack={() => {
    setSelected(null);
    requestAnimationFrame(() => header.current?.focus());
  }} />;

  return (
    <section aria-labelledby="catalog-heading" className="space-y-5">
      <header className="jarvis-panel space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 ref={header} id="catalog-heading" tabIndex={-1} className="text-2xl font-semibold">{t("Practice catalog")}</h2>
          <p className="text-sm text-[var(--muted)]">{practiceQuizzes.length} {t("quizzes")} · {practiceQuestionCount} {t("questions each")}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <label className="grid gap-2 text-sm">Search quizzes
            <input type="search" placeholder={t("Search by title or topic")} value={search}
              onChange={event => { setSearch(event.target.value); setLimit(12); }} />
          </label>
          <label className="grid gap-2 text-sm">Subject
            <select value={subject} onChange={event => { setSubject(event.target.value); setLimit(12); }}>
              <option value="">{t("All subjects")}</option>
              {practiceSubjects.map(name => <option key={name} value={name}>{t(name)}</option>)}
            </select>
          </label>
        </div>
      </header>
      <p role="status" className="text-sm text-[var(--muted)]">{matches.length} {t("quizzes found")} · {t("Quizzes are in English.")}</p>
      {matches.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {matches.slice(0, limit).map(quiz => (
            <li key={quiz.id} className="jarvis-panel flex flex-col items-start gap-3">
              <p className="text-xs font-semibold text-[var(--muted)]">{t(quiz.subject)} · Set {quiz.set}</p>
              <h3 className="text-lg font-semibold">{quiz.topic}</h3>
              <button type="button" className={secondary + " mt-auto"} aria-label={`Start ${quiz.title}`}
                onClick={() => setSelected(quiz)}>{t("Start quiz")} <span aria-hidden="true">→</span></button>
            </li>
          ))}
        </ul>
      ) : <p className="jarvis-panel">{t("No quizzes match your filters.")}</p>}
      {matches.length > limit && <button type="button" className={secondary} onClick={() => setLimit(value => value + 12)}>{t("Show more quizzes")}</button>}
    </section>
  );
}

function PracticeAttempt({ quiz, onBack }: { quiz: Quiz; onBack: () => void }) {
  const t = useInterfaceCopy();
  const [questions, setQuestions] = useState<Questions>();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<Result>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const question = questions?.[index];
  const answered = Object.keys(answers).length;

  useEffect(() => {
    heading.current?.focus();
  }, [index, result]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/quizzes?practice=${encodeURIComponent(quiz.id)}`, { signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!controller.signal.aborted) setQuestions(data.questions);
      } catch {
        if (!controller.signal.aborted) setError("Could not load this quiz. Return to the catalog and try again.");
      }
    }
    void load();
    return () => controller.abort();
  }, [quiz.id]);

  async function finish() {
    if (!questions || answered !== questions.length || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practiceId: quiz.id, answers: questions.map(({ id }) => ({ id, choice: answers[id] })) }),
      });
      if (!response.ok) throw new Error();
      setResult(await response.json());
    } catch {
      setError("Could not score your quiz. Your answers are still here.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-4" aria-labelledby="attempt-heading">
      <button type="button" className={secondary} onClick={onBack}>← {t("Quiz catalog")}</button>
      <article className="jarvis-panel space-y-5">
        <header>
          <p className="text-sm text-[var(--muted)]">{t(quiz.subject)}</p>
          <h2 id="attempt-heading" ref={heading} tabIndex={-1} className="text-2xl font-semibold">{quiz.title}</h2>
        </header>
        {error && <p role="alert">{error}</p>}
        {!question && !error && <p role="status">{t("Loading quiz…")}</p>}
        {result && (
          <div className="space-y-4">
            <p className="text-3xl font-semibold" role="status">{t("Score")} {result.score} / {result.feedback.length}</p>
            <ol className="space-y-3">
              {result.feedback.map((item, position) => (
                <li key={item.id} className="rounded-xl border border-[var(--stroke)] bg-[var(--panel-raised)] p-4">
                  <p className="text-sm font-semibold">{t(item.correct ? "Correct" : "Needs practice")} · {position + 1}</p>
                  <p>{questions?.[position].prompt}</p>
                  {!item.correct && <p className="text-sm">{t("Your answer")}: {questions?.[position].options[answers[item.id]]}</p>}
                  <p className="text-sm">{t("Correct answer")}: {item.correctAnswer}</p>
                  <p className="text-sm text-[var(--muted)]">{item.explanation}</p>
                </li>
              ))}
            </ol>
            <button type="button" className={secondary} onClick={() => { setAnswers({}); setIndex(0); setResult(undefined); }}>{t("Try again")}</button>
          </div>
        )}
        {question && !result && (
          <>
            <div className="space-y-1">
              <div className="flex flex-wrap justify-between gap-2 text-sm text-[var(--muted)]">
                <span>{t("Question")} {index + 1} / {practiceQuestionCount}</span>
                <span>{t("Questions answered")} · {answered}</span>
              </div>
              <progress aria-label={t("Questions answered")} className="block h-2 w-full accent-[var(--violet)]" value={answered} max={practiceQuestionCount} />
            </div>
            <fieldset key={question.id} disabled={busy} className="grid gap-2">
              <legend className="mb-3 text-lg font-semibold">{question.prompt}</legend>
              {question.options.map((option, choice) => (
                <label key={option} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[var(--stroke)] bg-[var(--panel-raised)] px-4 py-2 !text-[var(--text)] has-checked:border-[var(--violet)] has-checked:bg-[var(--highlight)]">
                  <input type="radio" name={question.id} checked={answers[question.id] === choice}
                    onChange={() => setAnswers(values => ({ ...values, [question.id]: choice }))} />
                  {option}
                </label>
              ))}
            </fieldset>
            <div className="flex flex-wrap justify-between gap-3">
              <button type="button" className={secondary} disabled={!index || busy} onClick={() => setIndex(value => value - 1)}>{t("Previous")}</button>
              {index < practiceQuestionCount - 1
                ? <button type="button" className={primary} disabled={answers[question.id] === undefined}
                    onClick={() => setIndex(value => value + 1)}>{t("Next question")}</button>
                : <button type="button" className={primary} disabled={answered !== practiceQuestionCount || busy}
                    onClick={() => void finish()}>{t(busy ? "Checking…" : "Check answers")}</button>}
            </div>
          </>
        )}
      </article>
    </section>
  );
}
