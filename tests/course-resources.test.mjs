import assert from "node:assert/strict";
import test from "node:test";
import { hasPdfMarkers } from "../lib/course-resources.ts";

test("requires both PDF markers, including the final EOF", () => {
  const encode = (value) => new TextEncoder().encode(value);
  assert.equal(hasPdfMarkers(encode("%PDF-1.7\r\nbody\r\n%%EOF\n")), true);
  for (const text of ["text", "%PDF-1.7\ntruncated", "text\n%%EOF", "%PDF-1.7\n%%EOF\n<script>"]) {
    assert.equal(hasPdfMarkers(encode(text)), false);
  }
});
