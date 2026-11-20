import assert from "node:assert/strict";
import test from "node:test";
import { studySearchQuery } from "../lib/study-follow-up.ts";

test("follow-ups reuse the last topic across successive questions", () => {
  const history = [{ prompt: "Why?" }, { prompt: "Explain eigenvectors" }];
  for (const prompt of ["Give me an example", "Un autre exemple", "Почему?", "Ինչո՞ւ"]) {
    assert.equal(studySearchQuery(prompt, history), history[1].prompt);
  }
  assert.equal(studySearchQuery("Why is inflation rising?", history), "Why is inflation rising?");
  assert.equal(studySearchQuery("Why?", []), "Why?");
});
