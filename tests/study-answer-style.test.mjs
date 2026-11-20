import assert from "node:assert/strict";
import test from "node:test";
import { directStudyAnswer } from "../lib/study-ai.ts";

test("answers an ordinary admissions question directly while preserving qualifications", () => {
  const text = "According to the ADMISSIONS section, applications for 2026 close in June.";
  assert.equal(directStudyAnswer(text, "When do applications close?"), "Applications for 2026 close in June.");
  assert.equal(directStudyAnswer(text, "Which source says this?"), text);
  assert.equal(directStudyAnswer("The available records disagree.", "When?"), "The available records disagree.");
});
