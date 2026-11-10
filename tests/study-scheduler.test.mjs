import assert from "node:assert/strict";
import { test } from "node:test";
import { proposeStudySchedule } from "../lib/study-scheduler.ts";

const input = {
  today: "2026-11-10",
  currentTime: "16:30:00",
  examDate: "2026-11-13",
  minutes: 45,
  start: "17:00",
  end: "20:00",
  studyDays: [2, 4],
  topics: [
    { position: 1, name: "Routing", confidence: 4 },
    { position: 2, name: "CIDR", confidence: 1 },
  ],
  busy: [
    { date: "2026-11-10", start: "17:15:00", end: "18:00:00" },
    { date: "2026-11-10", start: "17:45:00", end: "18:10:30" },
    { date: "2026-11-10", start: "19:05:00", end: "20:00:00" },
  ],
};

test("avoids overlapping commitments and prioritizes weaker topics", () => {
  const result = proposeStudySchedule(input);
  assert.deepEqual(result.sessions.map(({ title, date, start, end }) => [title, date, start, end]), [
    ["CIDR", "2026-11-10", "18:11", "18:56"],
    ["Routing", "2026-11-12", "17:00", "17:45"],
    ["Mixed review", "2026-11-12", "17:55", "18:40"],
  ]);
  assert.deepEqual(result.unscheduled, []);
});

test("returns a feasible partial schedule without using the exam day", () => {
  const result = proposeStudySchedule({ ...input, examDate: "2026-11-12" });
  assert.equal(result.sessions.length, 1);
  assert.deepEqual(result.unscheduled.map((topic) => topic.name), ["Routing"]);
});

test("reports insufficient time if the exam is today or all windows are blocked", () => {
  for (const changes of [
    { examDate: input.today },
    { examDate: "2026-11-11", busy: [{ date: input.today, start: "16:00", end: "20:00" }] },
  ]) {
    const result = proposeStudySchedule({ ...input, ...changes });
    assert.deepEqual(result.sessions, []);
    assert.equal(result.unscheduled.length, 2);
  }
});

test("does not propose a past minute and permits adjacent calendar entries", () => {
  const result = proposeStudySchedule({
    ...input, currentTime: "17:00:00.100000",
    busy: [{ date: input.today, start: "17:46", end: "18:00" }],
  });
  assert.equal(result.sessions[0].start, "17:01");
  assert.equal(result.sessions[0].end, "17:46");
  assert.equal(result.sessions[1].start, "18:00");
});
