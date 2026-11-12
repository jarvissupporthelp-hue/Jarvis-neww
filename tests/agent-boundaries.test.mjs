import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { getCourseProfessorGuides } from "../lib/professor-guides.ts";

const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "chromadb") return {
      url: "data:text/javascript," + encodeURIComponent(`export class CloudClient {
        getOrCreateCollection() { return { query: async () => ({
          ids: [["allowed-1", "forbidden-1", "other-course-1"]],
          metadatas: [[
            { resourceId: "allowed", offeringId: "course-a", page: 2 },
            { resourceId: "forbidden", offeringId: "course-a", page: 3 },
            { resourceId: "other", offeringId: "course-b", page: 4 },
          ]],
          documents: [["Authorized page", "Private page", "Wrong course page"]],
        }) }; }
      }`), shortCircuit: true,
    };
    if (specifier.startsWith("@/")) return next(new URL("../" + specifier.slice(2) + ".ts", import.meta.url).href, context);
    return next(specifier, context);
  },
});
const { searchChroma } = await import("../lib/chroma-retrieval.ts");
hooks.deregister();

test("professor guides attach only to enrolled course names", () => {
  const guides = getCourseProfessorGuides([{ code: "SYS1", name: "Systèmes 1" }, { code: "OTHER", name: "Biology" }]);
  assert.equal(guides.length, 1);
  assert.match(guides[0].professorName, /Crouzil/);
  assert.match(guides[0].coursePlan, /2025–2026/);
});

test("Chroma results are rechecked against Supabase authorized resources", async () => {
  const env = ["CHROMA_API_KEY", "CHROMA_TENANT", "CHROMA_DATABASE", "EMBEDDING_BASE_URL", "EMBEDDING_API_KEY", "EMBEDDING_MODEL"];
  for (const key of env) process.env[key] = "test";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ data: [{ index: 0, embedding: [0.1, 0.2] }] }), { status: 200 });
  try {
    const client = { from: () => ({ select: async () => ({ data: [{ id: "allowed", offering_id: "course-a", title: "Course PDF" }] }) }) };
    const matches = await searchChroma(client, "Explain the topic");
    assert.deepEqual(matches, [{ title: "Course PDF", page: 2, excerpt: "Authorized page" }]);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of env) delete process.env[key];
  }
});
