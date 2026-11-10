import assert from "node:assert/strict";
import test from "node:test";
import { gradeQuiz, quizQuestions } from "../lib/course-quizzes.ts";

function answersFor(code, choices) {
  return quizQuestions(code).map(({ id }, index) => ({ id, choice: choices[index] }));
}

test("pilot questions omit grading keys and unsupported courses have no quiz", () => {
  for (const code of ["DEMO-NET", "DEMO-DB"]) {
    const questions = quizQuestions(code);
    assert.equal(questions.length, 3);
    assert.deepEqual(Object.keys(questions[0]).sort(), ["id", "options", "prompt", "topic"]);
  }
  assert.equal(quizQuestions("toString"), undefined);
});

test("returns explanations and practice topics only for missed questions", () => {
  const result = gradeQuiz("DEMO-NET", answersFor("DEMO-NET", [0, 0, 2]));
  assert.equal(result.score, 2);
  assert.deepEqual(result.practiceTopics, ["IPv4 subnetting"]);
  assert.equal(result.feedback[0].correctAnswer, "62");
  assert.deepEqual(gradeQuiz("DEMO-DB", answersFor("DEMO-DB", [2, 1, 0])).practiceTopics, []);
});

test("rejects missing, duplicate, and invalid answers", () => {
  const answers = answersFor("DEMO-NET", [1, 0, 2]);
  assert.equal(gradeQuiz("DEMO-NET", answers.slice(1)), null);
  assert.equal(gradeQuiz("DEMO-NET", [answers[0], answers[0], answers[2]]), null);
  assert.equal(gradeQuiz("DEMO-NET", [{ ...answers[0], choice: 4 }, ...answers.slice(1)]), null);
});
