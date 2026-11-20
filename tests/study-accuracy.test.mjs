import test from "node:test";
import assert from "node:assert/strict";
import { directoryAnswer } from "../lib/directory-answer.ts";
import { examDateClarification } from "../lib/study-context.ts";
import { findUfarReferences } from "../lib/ufar-reference.ts";

const subjects = ["Linear Algebra, Probability", "Statistics, Numerical Methods", "Algebra Modeling", "no confirmed teaching assignment"];
for (const [index, ordinal] of ["first", "second", "third", "fourth"].entries()) {
  for (const question of [
    `What does Aram Yesayan teach in Year ${index + 1}?`,
    `Which courses does Aram Yesayan teach in the ${ordinal} year?`,
    `What subjects does Aram Yesayan teach to ${ordinal}-year students?`,
  ]) test(question, () => assert.ok(directoryAnswer(question)?.includes(subjects[index])));
}
for (const question of ["Who is the IMA dean?", "Who is dean of IMA?", "Who is the dean of the IMA?"]) {
  test(question, () => assert.match(directoryAnswer(question), /Kristina Sargsyan, PhD/));
}
for (const question of ["What does Kristina Sargsyan teach?", "Which courses does Kristina Sargsyan teach in year 2?"]) {
  test(question, () => assert.match(directoryAnswer(question), /no confirmed teaching assignment/));
}
for (const question of ["What does my lecturer teach?", "Who teaches my section?", "Who teaches finance?", "What does he teach?", "Does Aram Yesayan teach me?", "What does Aram Yesayan teach in my group?", "Who is the dean of Law?", "Explain Numerical Methods from my PDF."]) {
  test(question, () => assert.equal(directoryAnswer(question), null));
}
for (const question of ["When is my exam?", "When is our Systems exam?", "What day is the final exam?", "What date is my probability exam?", "When are our exams scheduled?", "What is the date of the algebra exam?"]) {
  test(question, () => assert.match(examDateClarification(question, { officialExamDatesAvailable: false }), /verified exam date/));
}
for (const question of ["How should I prepare for my exam?", "When is exam preparation most effective?", "Explain Unix processes.", "Can you quiz me on algebra?", "How do I revise probability?", "Build a study plan for my exam."]) {
  test(question, () => assert.equal(examDateClarification(question, { officialExamDatesAvailable: false }), null));
}
for (const [question, evidence] of [
  ["Where is the IMA campus?", /Paruyr Sevak/],
  ["Can I arrive late for an exam?", /15 minutes after the scheduled start/],
  ["What is the campus address?", /Paruyr Sevak/],
]) test(question, () => assert.ok(findUfarReferences(question).some(hit => evidence.test(hit.excerpt))));
