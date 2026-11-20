import test from "node:test";
import assert from "node:assert/strict";
import { examDateClarification } from "../lib/study-context.ts";

test("distinguishes a missing personal exam date from study advice", () => {
  const context = { officialExamDatesAvailable: false };
  assert.match(examDateClarification("When is my systems exam?", context), /verified exam date/);
  assert.equal(examDateClarification("When is exam preparation most effective?", context), null);
  assert.equal(examDateClarification("When is my exam?", { officialExamDatesAvailable: true }), null);
});
