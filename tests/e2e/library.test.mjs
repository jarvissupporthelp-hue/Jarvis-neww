import assert from "node:assert/strict";
import test from "node:test";
import { books } from "../../modules/campus/books.ts";

const origin = process.env.JARVIS_TEST_ORIGIN ?? "http://127.0.0.1:3000";

test("public library opens directly in Armenian and English", async () => {
  for (const [suffix, heading] of [["", "Թվային գրադարան"], ["&lang=en", "Digital library"]]) {
    const response = await fetch(`${origin}/campus?tab=library${suffix}`);
    assert.equal(response.status, 200);
    assert.ok((await response.text()).includes(heading));
  }
});

test("every hosted edition returns a complete EPUB, and unknown PDF IDs return 404", async () => {
  const hosted = books.filter(({ download }) => download?.hosted);
  await Promise.all(hosted.map(async ({ download }) => {
    const response = await fetch(origin + download.url);
    assert.equal(response.status, 200, download.url);
    assert.match(response.headers.get("content-type"), /application\/epub\+zip/, download.url);
    const contents = Buffer.from(await response.arrayBuffer());
    assert.equal(contents.subarray(0, 4).toString("hex"), "504b0304", download.url);
    assert.ok(contents.includes(Buffer.from([0x50, 0x4b, 0x05, 0x06])), download.url);
  }));
  assert.equal((await fetch(`${origin}/api/campus/books/unknown`)).status, 404);
});
