import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("every selectable avatar is accepted by the profile database", () => {
  const picker = readFileSync(new URL("../app/account/profile/avatar-picker.tsx", import.meta.url), "utf8");
  const migration = readFileSync(new URL("../supabase/migrations/20261215000100_avatar_gallery.sql", import.meta.url), "utf8");
  const icons = [...picker.matchAll(/icons: "([^"]+)"/g)].flatMap(match => match[1].split(" "));
  assert.ok(new Set(icons).size > 100);
  for (const icon of icons) assert.ok(migration.includes("'" + icon + "'"), icon);
});
