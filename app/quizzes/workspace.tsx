"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { getAccessToken } from "@/lib/browser-supabase";
import { studyPlanHandoffKey, type QuizPlanHandoff } from "@/lib/study-plan-handoff";
import type { gradeQuiz, quizQuestions } from "@/lib/course-quizzes";

type Quiz = { id: string; name: string; semester: string; questions: NonNullable<ReturnType<typeof quizQuestions>> };
type Result = NonNullable<ReturnType<typeof gradeQuiz>>;

const card = "space-y-3 rounded-xl border border-[#afbeb3] bg-white p-4";
const button = "rounded jarvis-primary-button px-4 py-2 text-white disabled:opacity-50";

export function QuizWorkspace() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const quiz = quizzes?.find((item) => item.id === selected);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const token = await getAccessToken();
        if (controller.signal.aborted) return;
        if (!token) { setNeedsSignIn(true); return; }
        const response = await fetch("/api/quizzes", {
          headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
        });
        if (response.status === 401 || response.status === 403) { setNeedsSignIn(true); return; }
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (controller.signal.aborted) return;
        setQuizzes(data.quizzes);
        setSelected(data.quizzes.length === 1 ? data.quizzes[0].id : "");
      } catch {
        if (!controller.signal.aborted) setError("Could not load course quizzes. Reload to try again.");
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quiz || busy || result) return;
    const fields = new FormData(event.currentTarget);
    const answers = quiz.questions.map(({ id }) => ({ id, choice: Number(fields.get(id) ?? NaN) }));
    setBusy(true);
    setError("");
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/quizzes", {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
        body: JSON.stringify({ offeringId: quiz.id, answers }),
      });
      const data = await response.json();
      if (response.ok) setResult(data);
      else setError(data.error ?? "Could not check your answers.");
    } catch {
      setError("Could not check your answers. Try submitting again.");
    } finally {
      setBusy(false);
    }
  }

  function useFeedback() {
    if (!quiz || !result?.practiceTopics.length) return;
    const handoff: QuizPlanHandoff = { kind: "quiz", offeringId: quiz.id, topics: result.practiceTopics };
    try {
      sessionStorage.setItem(studyPlanHandoffKey, JSON.stringify(handoff));
      router.push("/study-plans");
    } catch {
      setError("Could not transfer the topics in this browser. You can enter them in Study Plans.");
    }
  }

  if (needsSignIn) return <p>Sign in with an active student account. <Link className="underline" href="/account">Sign in</Link></p>;
  if (!quizzes) return error ? <p role="alert">{error}</p> : <p role="status">Loading your course quizzes…</p>;
  if (!quizzes.length) return <p>No practice quizzes are available for your enrolled courses yet.</p>;

  return (
    <div className="space-y-4">
      <label className="block">Course
        <select value={selected} disabled={busy} onChange={(event) => {
          setSelected(event.target.value);
          setResult(null);
          setError("");
        }} className="block w-full rounded border border-[#789181] bg-white p-2">
          <option value="" disabled>Choose a course quiz</option>
          {quizzes.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.semester}</option>)}
        </select>
      </label>
      {quiz && !result && (
        <form className="space-y-3" key={`${quiz.id}-${attempt}`} onSubmit={submit}>
          {quiz.questions.map((question, index) => (
            <fieldset key={question.id} className={card} disabled={busy}>
              <legend className="px-1 font-semibold">Question {index + 1} · {question.topic}</legend>
              <p>{question.prompt}</p>
              {question.options.map((option, choice) => (
                <label key={option} className="flex items-start gap-2">
                  <input type="radio" name={question.id} value={choice} className="mt-1" required />{option}
                </label>
              ))}
            </fieldset>
          ))}
          <button className={button} disabled={busy}>{busy ? "Checking…" : "Check answers"}</button>
        </form>
      )}
      {result && (
        <section className={card} aria-label="Quiz feedback">
          <h2 className="text-xl font-semibold" role="status">Score {result.score} / {result.feedback.length}</h2>
          <ul className="space-y-3">
            {result.feedback.map((item) => (
              <li key={item.id}>
                <strong>{item.topic} · {item.correct ? "Correct" : "Needs practice"}</strong>
                <p>Answer: {item.correctAnswer}. {item.explanation}</p>
              </li>
            ))}
          </ul>
          {result.practiceTopics.length > 0 && <button type="button" className={button} onClick={useFeedback}>Use feedback in Study Plans</button>}
          <button type="button" className="ml-2 underline" onClick={() => {
            setResult(null);
            setError("");
            setAttempt((value) => value + 1);
          }}>Try again</button>
        </section>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
