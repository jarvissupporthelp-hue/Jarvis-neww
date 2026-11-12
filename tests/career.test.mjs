import assert from "node:assert/strict";
import test from "node:test";
import { extractText, getDocumentProxy } from "unpdf";
import { mentors, postings, questions, skills } from "../modules/career/catalog.ts";
import { applicationStage, canVerify, jobMatch, portfolioScore, sampleCv } from "../modules/career/rules.ts";
import { buildCvPdf } from "../modules/career/pdf.ts";

test("job match handles aliases, recommends a project for a gap, and excludes unknowns", () => {
  const requirements = ["JS", "SQL", "Uncatalogued Technology"];
  const result = jobMatch(requirements, { JavaScript: 2, SQL: 1 });
  assert.deepEqual(result.rows.map(({ status }) => status), ["MATCHED", "GAP", "UNKNOWN"]);
  assert.match(result.rows[1].suggestion, /queries/);
  assert.equal(result.score, 50);
  assert.deepEqual(result, jobMatch(requirements, { JavaScript: 2, SQL: 1 }));
});

test("portfolio course and project evidence score 70 and a verified sample adds 30", () => {
  const project = { id: "demo", skill: "Algorithms", title: "Sort benchmark", level: 2, link: "https://example.com/work", verified: false };
  assert.equal(portfolioScore("Algorithms", ["ALG301"], [project]).score, 70);
  assert.equal(portfolioScore("Algorithms", ["ALG301"], [{ ...project, verified: true }]).score, 100);
  assert.equal(portfolioScore("Algorithms", ["ALG301"], [{ ...project, verified: true, link: "" }]).score, 70);
});

test("verification requires an eligible reviewer and a real sample", () => {
  const sample = { link: "https://example.com/work" };
  assert.equal(canVerify("student", sample, true), false);
  assert.equal(canVerify("staff", sample, false), true);
  assert.equal(canVerify("mentor", sample, true), true);
  assert.equal(canVerify("mentor", sample, false), false);
  assert.equal(canVerify("staff", { link: "" }, true), false);
});

test("application notes preserve history and transitions append it", () => {
  const first = applicationStage(undefined, "saved", "", "2026-11-12T10:00:00Z");
  const applied = applicationStage(first, "applied", "", "2026-11-13T10:00:00Z");
  const note = applicationStage(applied, "applied", "Follow up", "2026-11-14T10:00:00Z");
  assert.deepEqual(note.history.map(({ stage }) => stage), ["saved", "applied"]);
  assert.equal(note.notes, "Follow up");
});

test("seed includes the requested opportunities, skills, questions and mentors", () => {
  assert.equal(postings.filter(({ type }) => type === "Job").length, 12);
  assert.equal(postings.filter(({ type }) => type === "Internship").length, 8);
  assert.equal(skills.length, 30);
  assert.equal(questions.length, 10);
  assert.equal(mentors.length, 5);
});

test("CV PDF embeds Armenian, French and Russian text", async () => {
  const pdf = await getDocumentProxy(await buildCvPdf(sampleCv));
  const { text } = await extractText(pdf, { mergePages: true });
  for (const word of ["Հայերեն", "Français", "Русский"]) assert.ok(text.includes(word), `PDF is missing ${word}: ${text}`);
});

test("student Career requests are private between two authenticated accounts", {
  skip: !(process.env.CAREER_TEST_URL && process.env.CAREER_TEST_STUDENT_A_TOKEN && process.env.CAREER_TEST_STUDENT_B_TOKEN)
    && "Requires a migrated test deployment and two student tokens.",
}, async () => {
  const url = new URL("/api/career", process.env.CAREER_TEST_URL);
  const a = process.env.CAREER_TEST_STUDENT_A_TOKEN;
  const b = process.env.CAREER_TEST_STUDENT_B_TOKEN;
  const headers = (token) => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" });
  const original = await fetch(url, { headers: headers(a) });
  assert.equal(original.status, 200);
  const originalCv = (await original.json()).profile.cv;
  const marker = crypto.randomUUID();
  const save = (token, cv) => fetch(url, { method: "POST", headers: headers(token), body: JSON.stringify({ action: "cv", cv }) });
  try {
    const update = await save(a, { ...originalCv, summary: marker });
    assert.equal(update.status, 200);
    const owner = await fetch(url, { headers: headers(a) });
    const other = await fetch(url, { headers: headers(b) });
    assert.equal(owner.status, 200);
    assert.equal(other.status, 200);
    assert.equal((await owner.json()).profile.cv.summary, marker);
    assert.notEqual((await other.json()).profile.cv.summary, marker);
  } finally { await save(a, originalCv); }
});
