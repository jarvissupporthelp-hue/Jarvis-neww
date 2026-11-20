import assert from "node:assert/strict";
import test from "node:test";
import { gradeQuestions, publicQuizQuestions } from "../lib/course-quizzes.ts";
import { practiceQuizzes, practiceSubjects } from "../lib/practice-quiz-catalog.ts";
import { practiceQuestions } from "../lib/practice-quiz-questions.ts";

test("all 100 quizzes have 30 distinct, gradeable questions", () => {
  assert.equal(practiceQuizzes.length, 100);
  assert.equal(new Set(practiceQuizzes.map(quiz => quiz.id)).size, 100);
  const prompts = new Set();
  for (const subject of practiceSubjects) {
    assert.equal(practiceQuizzes.filter(quiz => quiz.subject === subject).length, 20);
  }
  for (const quiz of practiceQuizzes) {
    const questions = practiceQuestions(quiz.id);
    assert.equal(questions.length, 30);
    for (const question of questions) {
      assert.equal(new Set(question.options).size, 4);
      assert.ok(!prompts.has(question.prompt), question.prompt);
      prompts.add(question.prompt);
    }
    const answers = questions.map(({ id, answer }) => ({ id, choice: answer }));
    assert.equal(gradeQuestions(questions, answers).score, 30);
    assert.equal(gradeQuestions(questions, answers.slice(1)), null);
    answers[0].choice = (answers[0].choice + 1) % 4;
    assert.equal(gradeQuestions(questions, answers).score, 29);
    assert.ok(publicQuizQuestions(questions).every(question => !("answer" in question) && !("explanation" in question)));
  }
  assert.equal(prompts.size, 3000);
  assert.equal(practiceQuestions("missing"), undefined);
});
