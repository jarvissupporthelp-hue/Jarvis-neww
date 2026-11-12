import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "node:process";

try { loadEnvFile(); } catch (error) { if (error.code !== "ENOENT") throw error; }

const origin = process.env.JARVIS_TEST_ORIGIN ?? "http://127.0.0.1:3000";
const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, JARVIS_DEMO_PASSWORD } = process.env;
const demoReady = Boolean(NEXT_PUBLIC_SUPABASE_URL && NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && JARVIS_DEMO_PASSWORD);

test("landing defaults to Armenian and both locale pages reach sign-in", async () => {
  const root = await fetch(origin, { redirect: "manual" });
  assert.equal(root.headers.get("location"), "/hy");
  for (const [locale, title] of [["hy", "Մուտք գործել JARVIS"], ["en", "Sign in to JARVIS"]]) {
    const page = await fetch(`${origin}/${locale}`);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.ok(html.includes(`<html lang="${locale}">`));
    assert.ok(html.includes(title));
    assert.ok(html.includes(`/account?lang=${locale}`));
  }
});

test("foundation and notifications deny anonymous access", async () => {
  for (const path of ["/api/foundation", "/api/foundation/notifications"]) {
    assert.equal((await fetch(origin + path)).status, 401);
  }
});

test("seeded roles authenticate, persist locale, and isolate notifications", {
  skip: demoReady ? false : "Configure the local Supabase demo seed to run authenticated checks",
}, async () => {
  let studentNotice;
  for (const role of ["student", "staff", "admin"]) {
    const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.signInWithPassword({
      email: `jarvis-${role}@example.com`, password: JARVIS_DEMO_PASSWORD,
    });
    assert.ok(!error && data.session, `Seeded ${role} sign-in failed`);
    const headers = { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" };
    const identity = await fetch(origin + "/api/foundation", { headers });
    assert.equal(identity.status, 200);
    const profile = await identity.json();
    assert.equal(profile.role, role);
    assert.equal(profile.preferencesAvailable, true);
    const locale = profile.locale === "en" ? "hy" : "en";
    const updated = await fetch(origin + "/api/foundation", { method: "PATCH", headers, body: JSON.stringify({ locale }) });
    assert.equal(updated.status, 200);
    assert.equal((await (await fetch(origin + "/api/foundation", { headers })).json()).locale, locale);
    const list = await fetch(origin + "/api/foundation/notifications", { headers });
    assert.equal(list.status, 200);
    const notices = await list.json();
    if (role === "student") {
      assert.equal(notices.length, 5);
      studentNotice = notices[0].id;
      const read = await fetch(origin + "/api/foundation/notifications", { method: "PATCH", headers, body: JSON.stringify({ id: studentNotice }) });
      assert.equal(read.status, 204);
      const refreshed = await (await fetch(origin + "/api/foundation/notifications", { headers })).json();
      assert.ok(refreshed.find((item) => item.id === studentNotice)?.readAt);
    } else {
      assert.ok(notices.every(({ id }) => id !== studentNotice));
    }
  }
});
