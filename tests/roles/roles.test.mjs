import assert from "node:assert/strict";
import test from "node:test";

const origin = process.env.JARVIS_TEST_ORIGIN;
const id = "20000000-0000-4000-8000-000000000001";
const tokens = { student: "student-token", lecturer: "lecturer-token", admin: "admin-token" };
const all = ["student", "lecturer", "admin"];

// [method, path, roles allowed past the gate]. Mirrors the authorize() calls in app/api.
const routes = [
  ["GET", "/api/me", all],
  ["GET", "/api/foundation", all], ["PATCH", "/api/foundation", all],
  ["GET", "/api/foundation/notifications", all], ["PATCH", "/api/foundation/notifications", all],
  ["GET", "/api/dashboard", ["student"]],
  ["GET", "/api/chat/context", ["student"]], ["GET", "/api/chat/usage", ["student"]],
  ["GET", "/api/chat/memory", ["student"]], ["PUT", "/api/chat/memory", ["student"]], ["DELETE", "/api/chat/memory", ["student"]],
  ["POST", "/api/chat", ["student"]],
  ["GET", "/api/quizzes", ["student"]], ["POST", "/api/quizzes", ["student"]],
  ["GET", `/api/study-plans/${id}/schedule`, ["student"]], ["POST", `/api/study-plans/${id}/schedule`, ["student"]],
  ["GET", `/api/study-plans/${id}/rebalance`, ["student"]], ["POST", `/api/study-plans/${id}/rebalance`, ["student"]],
  ["GET", "/api/lecturer", ["lecturer"]], ["POST", "/api/lecturer", ["lecturer"]],
  ["GET", "/api/lecturer/profile", ["lecturer"]], ["PUT", "/api/lecturer/profile", ["lecturer"]],
  ["GET", "/api/lecturer/private", ["lecturer"]], ["POST", "/api/lecturer/private", ["lecturer"]], ["DELETE", "/api/lecturer/private", ["lecturer"]],
  ["POST", "/api/lecturer/assistant", ["lecturer"]],
  ["GET", "/api/resources", ["student", "lecturer"]], ["POST", "/api/resources", ["lecturer"]], ["PATCH", "/api/resources", ["lecturer"]],
  ["GET", "/api/timetable?week=2026-11-09", all], ["POST", "/api/timetable", ["admin"]],
  ["GET", "/api/admin", ["admin"]], ["POST", "/api/admin", ["admin"]],
  ["POST", "/api/invitations", ["admin"]],
];

function call(method, path, token) {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = "Bearer " + token;
  return fetch(origin + path, { method, headers, body: method === "GET" ? undefined : "{}" });
}

test("the app is wired to the mock identity provider", async () => {
  assert.ok(origin, "run through scripts/test-roles.mjs so the app points at the mock Supabase");
  assert.notEqual((await call("GET", "/api/me", tokens.student)).status, 503, "app cannot reach the mock Supabase");
});

for (const [method, path, allowed] of routes) {
  test(`${method} ${path.split("?")[0].replace(id, "[id]")}`, async (t) => {
    await t.test("signed-out visitor gets 401", async () => {
      assert.equal((await call(method, path)).status, 401);
    });
    await t.test("invalid token gets 401", async () => {
      assert.equal((await call(method, path, "forged-token")).status, 401);
    });
    await t.test("disabled account is denied with 403", async () => {
      assert.equal((await call(method, path, "disabled-token")).status, 403);
    });
    for (const role of all) {
      await t.test(`${role} is ${allowed.includes(role) ? "allowed past" : "stopped at"} the gate`, async () => {
        const status = (await call(method, path, tokens[role])).status;
        if (allowed.includes(role)) assert.ok(status !== 401 && status !== 403, `${role} was blocked with ${status}`);
        else assert.equal(status, 403, `${role} reached a route meant for ${allowed.join("/")} (status ${status})`);
      });
    }
  });
}
