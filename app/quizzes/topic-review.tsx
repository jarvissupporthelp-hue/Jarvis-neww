"use client";

import { useState } from "react";
import { UiText } from "@/app/components/interface-language";
import { learningCourses } from "@/modules/learning/seed";
import { button, field, useLearningData } from "@/modules/learning/storage";
import { CoursePicker } from "@/modules/learning/study-tools";

type Course = (typeof learningCourses)[number];

export function TopicReview({ initialCourse }: { initialCourse?: string }) {
  const [selected, setSelected] = useState(initialCourse);
  const course = learningCourses.find(entry => entry.code === selected) ?? learningCourses[0];

  return <div className="space-y-4">
    <CoursePicker course={course.code} onChange={setSelected} />
    <TopicQuiz key={course.code} course={course} />
  </div>;
}

function TopicQuiz({ course }: { course: Course }) {
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
    <label><UiText value="Quiz topic"/> <select className={field} value={topic} onChange={(event) => setTopic(event.target.value)}>
      <option value=""><UiText value="All topics · weak topics first"/></option>
      {[...new Set(course.questions.map(({ topic }) => topic))].map((name) => <option key={name}>{name}</option>)}
    </select></label>
    <button className={button} onClick={() => start()}><UiText value="Start quiz"/></button>
    <button className={field} disabled={!mistakes.length} onClick={() => start(true)}><UiText value="Retry mistakes"/> ({mistakes.length})</button>
  </div>;
  if (question && current !== undefined) return <div className="space-y-3">
    <p>{"Question"} {answers.length + 1} {"of"} {order.length} · {question.topic}</p>
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
    }}><UiText value={answers.length + 1 === order.length ? "See results" : "Next question"}/></button>
  </div>;
  const score = order.filter((index, position) => course.questions[index].answer === answers[position]).length;
  return <div className="space-y-4"><p className="text-lg font-semibold">{"Result ·"} {score}/{order.length}</p>
    {order.map((index, position) => {
      const entry = course.questions[index];
      return <article className="rounded border p-3" key={index}><h3 className="font-semibold">{entry.text}</h3>
        <p>{"Your answer:"} {entry.choices[answers[position]]} · <UiText value={answers[position] === entry.answer ? "Correct" : "Incorrect"}/></p>
        <p>{"Correct answer:"} {entry.choices[entry.answer]}</p><p className="text-sm">{"Source:"} {entry.source}</p>
      </article>;
    })}<button className={button} onClick={() => start()}><UiText value="Try again"/></button> <button className={field} onClick={() => setOrder(null)}><UiText value="Choose another topic"/></button>
  </div>;
}
