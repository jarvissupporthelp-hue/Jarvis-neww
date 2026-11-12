import assert from "node:assert/strict";
import test from "node:test";
import { authorize } from "../lib/authorization.ts";

const userId = "00000000-0000-4000-8000-000000000001";
const request = new Request("https://example.test/api/chat", {
  headers: { authorization: "Bearer test-token" },
});

async function withIdentity(role, status, run) {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const calls = [];
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith("/auth/v1/user")) return Response.json({ id: userId });
    if (String(url).includes("/rest/v1/memberships")) {
      return Response.json(status === "active" ? [{ role }] : []);
    }
    throw new Error("Unexpected endpoint");
  };
  try { await run(calls); } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
  }
}

test("student token cannot enter lecturer-only route and lecturer token cannot enter student-only route", async () => {
  await withIdentity("student", "active", async (calls) => {
    assert.deepEqual(await authorize(request, ["lecturer"]), { ok: false, status: 403 });
    assert.deepEqual(await authorize(request, ["student"]), { ok: true, role: "student", userId });
    assert.ok(calls.every(({ options }) => options.headers.authorization === "Bearer test-token"));
  });
  await withIdentity("lecturer", "active", async () => {
    assert.deepEqual(await authorize(request, ["student"]), { ok: false, status: 403 });
    assert.deepEqual(await authorize(request, ["lecturer"]), { ok: true, role: "lecturer", userId });
  });
});

test("inactive membership and missing token are denied", async () => {
  await withIdentity("student", "inactive", async () => {
    assert.deepEqual(await authorize(request, ["student"]), { ok: false, status: 403 });
  });
  assert.deepEqual(await authorize(new Request("https://example.test/api/chat"), ["student"]), { ok: false, status: 401 });
});
