import assert from "node:assert/strict";
import test from "node:test";
import { findUfarReferences } from "../lib/ufar-reference.ts";

test("returns a citable campus address and relevant dated exam passages", () => {
  const [campus] = findUfarReferences("Where is the IMA campus?");
  assert.equal(campus.url, "/ufar-reference#section-2");
  assert.match(campus.excerpt, /Paruyr Sevak/);
  assert.ok(findUfarReferences("Can I arrive late for an exam?").some(hit => /15 minutes after the scheduled start/.test(hit.excerpt)));
});
test("personal recall and unknown topics get no institutional sources", () => {
  assert.deepEqual(findUfarReferences("What color do I like?"), []);
  assert.deepEqual(findUfarReferences("quasiparticle braiding"), []);
});
