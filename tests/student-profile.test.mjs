import test from "node:test";
import assert from "node:assert/strict";
import { colorMemory, studentIdentity } from "../lib/student-profile.ts";

test("color recall survives a new thread and accepts a correction", () => {
  let saved = colorMemory("I like red").stated;
  assert.equal(colorMemory("What color do I like?", saved).answer, "You told me you like red.");
  saved = colorMemory("My favourite colour is blue.", saved).stated;
  assert.equal(colorMemory("What's my favorite color?", saved).answer, "You told me you like blue.");
  assert.match(colorMemory("What color do I like?").answer, /yet/);
  assert.equal(colorMemory("I like red flags").stated, undefined);
});
test("UFAR identity preserves names and leaves unknown faculties unresolved", () => {
  const email = "I24.Tonoyan.Ara@etud.ufar.am";
  assert.equal(studentIdentity(email).givenName, "Ara");
  assert.equal(studentIdentity(email).surname, "Tonoyan");
  assert.equal(studentIdentity(email.replace("I24", "MG24")).faculty, undefined);
  assert.equal(studentIdentity(email + ".example"), undefined);
});
