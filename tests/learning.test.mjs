import assert from "node:assert/strict";
import test from "node:test";
import { buildExamPlan } from "../modules/learning/planner.ts";
import { reviewFlashcard } from "../modules/learning/practice.ts";

const minute = 60_000;
const at = (date, time) => Date.parse(`2026-11-${String(date).padStart(2, "0")}T${time}:00+04:00`);
const slots = Array.from({ length: 7 }, (_, index) => ({ start: at(12 + index, "09:00"), end: at(12 + index, "15:00") }));
const exam = (id, date, title = id) => ({ id, title, start: at(date, "17:00"),
  topics: [{ title: "Concepts", confidence: 0, weight: 5 }, { title: "Practice", confidence: 0, weight: 5 }] });
const dateFormat = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Yerevan", dateStyle: "short" });

function verify(plan, free, exams) {
  const totals = new Map();
  for (const [index, block] of plan.blocks.entries()) {
    assert.ok(free.some((slot) => slot.start <= block.start && slot.end >= block.end));
    assert.ok(block.end <= exams.find(({ id }) => id === block.examId).start);
    assert.ok(!index || plan.blocks[index - 1].end <= block.start);
    assert.equal((block.end - block.start) / minute, block.kind === "study" ? 50 : 90);
    assert.ok(block.why);
    const date = dateFormat.format(block.start);
    assert.equal(date, dateFormat.format(block.end - 1));
    totals.set(date, (totals.get(date) ?? 0) + (block.end - block.start) / minute);
  }
  let streak = 0;
  for (let date = 12; date <= 18; date++) {
    const total = totals.get(dateFormat.format(at(date, "12:00"))) ?? 0;
    assert.ok(total <= (streak >= 3 ? 90 : 240));
    streak = total > 90 ? streak + 1 : 0;
  }
}

test("three exams in seven days have deterministic blocks, caps and prior-day revision", () => {
  const exams = [exam("a", 15), exam("b", 17), exam("c", 19)];
  const plan = buildExamPlan(exams, slots);
  verify(plan, slots, exams);
  assert.deepEqual(plan, buildExamPlan(exams, slots));
  assert.deepEqual(plan.blocks.filter(({ kind }) => kind === "revision").map(({ start }) => dateFormat.format(start)),
    ["2026-11-14", "2026-11-16", "2026-11-18"]);
});

test("limited or absent capacity reports the shortage", () => {
  const exams = [exam("a", 15, "Databases")];
  const brief = [{ start: at(12, "09:00"), end: at(12, "09:50") }];
  const partial = buildExamPlan(exams, brief);
  verify(partial, brief, exams);
  assert.equal(partial.blocks.length, 1);
  assert.deepEqual(partial.warnings, [{ examId: "a", title: "Databases", minutes: 760 }]);
  const none = buildExamPlan(exams, []);
  assert.deepEqual(none.blocks, []);
  assert.equal(none.warnings[0].minutes, 810);
});

test("moving an exam moves its revision and never leaves late study blocks", () => {
  const before = buildExamPlan([exam("a", 19)], slots);
  const exams = [exam("a", 14)];
  const after = buildExamPlan(exams, slots);
  assert.notDeepEqual(before, after);
  verify(after, slots, exams);
  assert.equal(dateFormat.format(after.blocks.find(({ kind }) => kind === "revision").start), "2026-11-13");
});

test("two exams on the same day each get a non-overlapping revision", () => {
  const exams = [exam("a", 17), exam("b", 17)];
  const plan = buildExamPlan(exams, slots);
  verify(plan, slots, exams);
  assert.deepEqual(plan.blocks.filter(({ kind }) => kind === "revision").map(({ examId, start }) => [examId, dateFormat.format(start)]),
    [["a", "2026-11-16"], ["b", "2026-11-16"]]);
});

test("flashcards advance, reset, and stop at box five", () => {
  const day = 86_400_000;
  for (const [box, interval] of [[1, 2], [2, 4], [3, 8], [4, 16], [5, 16]]) {
    assert.deepEqual(reviewFlashcard(box, true, 100), { box: Math.min(5, box + 1), due: 100 + interval * day });
    assert.deepEqual(reviewFlashcard(box, false, 100), { box: 1, due: 100 + day });
  }
});

test("timetable subjects have distinct twelve-card topic decks", async () => {
  const { learningCourses } = await import("../modules/learning/seed.ts");
  for (const code of ["MATH-CS", "NET1", "FRE301", "ENG301", "ALG301", "ARC301"]) {
    const deck = learningCourses.find((course) => course.code === code);
    assert.equal(deck.questions.length, 12);
    assert.equal(new Set(deck.questions.map(({ id }) => id)).size, 12);
    assert.ok(deck.questions.every(({ choices, answer }) => new Set(choices).size === 3 && choices[answer]));
  }
});
