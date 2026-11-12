import assert from "node:assert/strict";
import test from "node:test";

const origin = process.env.JARVIS_TEST_ORIGIN ?? "http://127.0.0.1:3000";
const paths = [
  "/", "/account", "/account/calendar", "/account/tasks",
  "/account/admin/users", "/account/admin/group", "/account/admin/timetable",
  "/dashboard", "/academics", "/learning",
  "/lecturer", "/resources", "/study-plans", "/focus", "/quizzes",
  "/hy", "/en",
];

test("UI and functionality routes respond successfully", async (t) => {
  for (const path of paths) {
    await t.test(path, async () => {
      const response = await fetch(new URL(path, origin), { redirect: "manual" });
      assert.equal(response.status, 200, path + ": " + response.status);
      const html = await response.text();
      assert.ok(html.includes("JARVIS") || html.includes("jarvis"), path + " did not render JARVIS");
    });
  }
});

test("merged landing offers both new academic modules and account login", async () => {
  const html = await (await fetch(origin)).text();
  for (const href of ['/account', '/academics', '/learning', '/dashboard']) {
    assert.ok(html.includes('href="' + href + '"'), "missing landing link " + href);
  }
});

test("account pages are server-routable (not hash-only navigation)", async () => {
  const cases = [
    ["/account", "workspace"],
    ["/account/calendar", "Calendar"],
    ["/account/tasks", "My tasks"],
    ["/account/admin/users", "Administration"],
  ];
  for (const [path, title] of cases) {
    const html = await (await fetch(origin + path)).text();
    assert.ok(html.includes(title), path + " lacks " + title);
  }
});

test("automatic invitations never accept anonymous requests", async () => {
  const response = await fetch(origin + "/api/invitations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "test@example.com", role: "lecturer" }),
  });
  assert.ok([401,403].includes(response.status), "Invitations must require an active admin.");
});

test("sensitive application endpoints reject unauthenticated clients", async () => {
  for (const path of ["/api/foundation", "/api/foundation/notifications", "/api/me", "/api/dashboard", "/api/admin"]) {
    const response = await fetch(origin + path);
    assert.ok([401, 403].includes(response.status), path + ": unexpected status " + response.status);
  }
});
