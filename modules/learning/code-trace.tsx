"use client";

import { useState } from "react";
import { button, field, useLearningData } from "./storage";

const challenges = [
  { title: "Loop tracing", code: "let total = 0;\nfor (let i = 1; i <= 4; i++) {\n  if (i % 2 === 0) total += i;\n}\nconsole.log(total);", answer: "6", why: "Only 2 and 4 pass the even-number check." },
  { title: "Array updates", code: "const values = [3, 5, 8];\nvalues[1] += values[0];\nconsole.log(values[1]);", answer: "8", why: "Index 1 starts at 5 and index 0 contains 3." },
  { title: "Recursion", code: "function sum(n) {\n  if (n === 0) return 0;\n  return n + sum(n - 1);\n}\nconsole.log(sum(4));", answer: "10", why: "The calls add 4 + 3 + 2 + 1 before the base case returns zero." },
  { title: "Stack vs queue", code: "const pending = ['A', 'B'];\npending.push('C');\npending.shift();\nconsole.log(pending[0]);", answer: "B", why: "shift removes A from the front; B is now first." },
  { title: "Binary search", code: "const a = [2, 4, 8, 10, 12];\nconst mid = Math.floor((0 + 4) / 2);\nconsole.log(a[mid]);", answer: "8", why: "The midpoint index is 2, and the value at index 2 is 8." },
  { title: "Nested loops", code: "let count = 0;\nfor (let i = 0; i < 3; i++) {\n  for (let j = 0; j < i; j++) count++;\n}\nconsole.log(count);", answer: "3", why: "The inner loop runs 0, 1, then 2 times." },
];

export function CodeTrace() {
  const [solved, setSolved] = useLearningData<number[]>("trace-solved", []);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [correct, setCorrect] = useState<boolean | null>(null);
  const challenge = challenges[index];
  return <div className="space-y-4">
    <p>Predict the console output before running the code. {solved.length}/{challenges.length} solved.</p>
    <label>Challenge <select className={field} value={index} onChange={(event) => {
      setIndex(Number(event.target.value)); setAnswer(""); setCorrect(null);
    }}>{challenges.map(({ title }, position) => <option key={title} value={position}>{title}</option>)}</select></label>
    <pre className="overflow-x-auto rounded bg-[#1e3328] p-4 text-white"><code>{challenge.code}</code></pre>
    <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => {
      event.preventDefault();
      const matches = answer.trim() === challenge.answer;
      setCorrect(matches);
      if (matches && !solved.includes(index)) setSolved([...solved, index]);
    }}><label>Console output <input className={field} value={answer} onChange={(event) => setAnswer(event.target.value)} required /></label>
      <button className={button}>Check output</button>
    </form>
    {correct !== null && <p role="status">{correct ? `Correct. ${challenge.why}` : "Try again. Trace one line at a time."}</p>}
  </div>;
}
