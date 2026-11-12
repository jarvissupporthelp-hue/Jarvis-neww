import assert from "node:assert/strict";
import test from "node:test";
import { exampleModules, demoSchedule } from "../modules/academics/demo.ts";
import { annualGrade, displayCourseGrade, gradeModule, requiredScore, semesterGrade } from "../modules/academics/grading.ts";
import { demoStudentId, getCompletedCourses, getCurrentGpa, getExamSchedule, getFreeTimeSlots, getRemainingCourses, getTimetable, getUpcomingDeadlines } from "../modules/academics/services.ts";

test("the requested semester and annual GPA example passes exactly", () => {
  const result = semesterGrade(exampleModules);
  assert.deepEqual(result.results.map(({ grade }) => grade), ["11.2", "11.85", "17.475", "16.12", "10.48", "14.2"]);
  assert.deepEqual(result.results[0].courses.map(({ points }) => displayCourseGrade(points)), ["16.4", "6"]);
  assert.ok(result.results.every(({ validated }) => validated));
  assert.equal(result.gpa, "13.673");
  assert.equal(result.earned, "30");
  assert.equal(annualGrade(semesterGrade([], "zero"), result), "6.8365");
});

function one(score, weight = "1", attempts) {
  return { name: "Module", courses: [{ code: "A", title: "A", ects: "30", components: [{ name: "Exam", weight, score, attempts }] }] };
}

test("thresholds, malformed grading data, retakes, and missing grades", () => {
  assert.equal(gradeModule(one("10")).validated, true);
  assert.equal(gradeModule(one("9.99")).validated, false);
  assert.throws(() => gradeModule(one("10", "0.9")), /Weights/);
  assert.throws(() => gradeModule(one("20.01")), /between 0 and 20/);
  assert.throws(() => gradeModule(one("-1")));
  assert.equal(semesterGrade([one("18", "1", ["10"])]).gpa, "10");
  assert.equal(semesterGrade([one("18", "1", ["10"])], "official", "best").gpa, "18");
  assert.equal(semesterGrade([one("18", "1", ["10"])]).earned, "30");
  assert.equal(semesterGrade([one(null)]).gpa, null);
  assert.equal(semesterGrade([one(null)], "zero").gpa, "0");
  assert.equal(semesterGrade([one(null)], "ignore").gpa, null);
  assert.equal(requiredScore(one(null), 0, 0), "10");
  const impossible = one(null);
  impossible.courses[0].components = [{ name: "Fixed", weight: "0.6", score: "0" }, { name: "Missing", weight: "0.4", score: null }];
  assert.equal(requiredScore(impossible, 0, 1), null);
});

test("Computer Science timetable keeps the eight sessions on their source dates", () => {
  const { timetable, exams } = demoSchedule();
  const times = ["10:30", "12:00", "14:00", "15:30"];
  assert.equal(timetable.length, 8);
  for (const day of ["2026-11-09", "2026-11-10"]) {
    const at = (time) => new Date(`${day}T${time}:00+04:00`);
    const events = getTimetable(demoStudentId, at("00:00"), at("23:59"));
    assert.deepEqual(events.map(({ start }) => start.slice(11, 16)), times);
    assert.ok(events.every(({ lecturer, course }) => lecturer === "Armelle Bonenfant" && course === "ARC301"));
    assert.deepEqual(getFreeTimeSlots(demoStudentId, at("10:00"), at("12:00"), 30),
      [{ start: at("10:00"), end: at("10:30") }]);
  }
  assert.equal(getExamSchedule(demoStudentId, new Date(exams[0].start), new Date(exams[0].end)).length, 1);
  assert.ok(getUpcomingDeadlines(demoStudentId, 2).length > 0);
  assert.equal(getCurrentGpa(demoStudentId).gpa, null);
  assert.ok(getCompletedCourses(demoStudentId).length > 0);
  assert.ok(getRemainingCourses(demoStudentId).some(({ code }) => code === "PRO301"));
  assert.throws(() => getCurrentGpa("unknown"));
});
