import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const shell = readFileSync(new URL("../app/components/workspace-shell.tsx", import.meta.url), "utf8");

function links(name) {
  const block = shell.match(new RegExp(`const ${name}: NavItem\\[\\] = \\[([\\s\\S]*?)\\n\\];`))?.[1] ?? "";
  return [...block.matchAll(/href: "([^"]+)"/g)].map((match) => match[1]);
}

test("every signed-in role can reach the integrated modules from the menu", () => {
  for (const name of ["studentNav", "lecturerNav", "adminNav"]) {
    const hrefs = links(name);
    for (const required of ["/dashboard", "/academics", "/campus", "/career", "/chat/math-visualization"]) {
      assert.ok(hrefs.includes(required), `${name} is missing ${required}`);
    }
  }
});

test("students also get the learning tools and the AI agent", () => {
  const hrefs = links("studentNav");
  for (const required of ["/learning", "/chat", "/quizzes", "/study-plans", "/focus"]) {
    assert.ok(hrefs.includes(required), `studentNav is missing ${required}`);
  }
});

// Resolves a URL against the App Router folders, allowing dynamic ([x]) and catch-all ([[...x]]) segments.
function hasPage(directory, segments) {
  if (!existsSync(directory)) return false;
  if (!segments.length) {
    return readdirSync(directory, { withFileTypes: true }).some((entry) =>
      (entry.isFile() && entry.name === "page.tsx") || (entry.isDirectory() && /^\[\[\.\.\./.test(entry.name) && hasPage(join(directory, entry.name), [])));
  }
  const [head, ...rest] = segments;
  const children = readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  return children.some((entry) => (entry.name === head || entry.name.startsWith("[")) && hasPage(join(directory, entry.name), rest));
}

test("menu entries point at pages that exist", () => {
  const app = fileURLToPath(new URL("../app", import.meta.url));
  for (const name of ["studentNav", "lecturerNav", "adminNav"]) {
    for (const href of links(name)) {
      assert.ok(hasPage(app, href.split("/").filter(Boolean)), `${name} links to a missing page ${href}`);
    }
  }
});
