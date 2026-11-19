import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { indexCoursePdf } from "../lib/course-pdf-index.ts";

const id = "12345678-1234-4234-8234-123456789012";
const doubles = globalThis.recoveryTestDoubles = {};
const modules = {
  "@/lib/authorization": "export const authorize = () => ({ ok: true, userId: 'student', role: 'student' });",
  "@/lib/study-ai": "export const askStudyAI = (...args) => globalThis.recoveryTestDoubles.ai(...args); export const resolveProviderAccess = () => ({ credential: 'test' }); export const providerFailureMessage = (status) => 'Provider error ' + status;",
  "@/lib/study-context": "export const createStudyClient = () => globalThis.recoveryTestDoubles.chat; export const examDateClarification = () => null; export const loadStudyContext = () => ({ context: { courses: [] } });",
  "@supabase/supabase-js": "export const createClient = () => globalThis.recoveryTestDoubles.email;",
};
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.includes("/app/api/") && modules[specifier]) {
      return { url: "data:text/javascript," + encodeURIComponent(modules[specifier]), shortCircuit: true };
    }
    if (specifier.startsWith("@/")) {
      return next(new URL("../" + specifier.slice(2) + ".ts", import.meta.url).href, context);
    }
    return next(specifier, context);
  },
});

const { POST: invite } = await import("../app/api/invitations/route.ts");
const { POST: chat } = await import("../app/api/chat/route.ts");
const { GET: portal } = await import("../app/api/academic-portal/route.ts");
hooks.deregister();

function post(body) {
  return new Request("https://example.com", {
    method: "POST",
    headers: { Authorization: "Bearer test" },
    body: JSON.stringify(body),
  });
}

test("failed email delivery keeps one pending approval and the same invitation can be retried", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.com";
  process.env.SUPABASE_SECRET_KEY = "test";
  process.env.JARVIS_AUTH_ORIGIN = "https://example.com";
  const approvals = new Map();
  let attempts = 0;
  doubles.email = {
    from: () => ({
      upsert: (row) => {
        if (!approvals.has(row.email)) approvals.set(row.email, row);
        return {};
      },
      select: () => ({ eq: (_field, email) => ({ single: () => ({ data: approvals.get(email) }) }) }),
    }),
    auth: { admin: { inviteUserByEmail: () => ({ error: ++attempts === 1 ? new Error("SMTP unavailable") : null }) } },
  };
  const body = { email: "student@example.com", role: "student", groupId: id };
  const failure = await invite(post(body));
  assert.equal(failure.status, 502);
  assert.match((await failure.json()).message, /Approval saved.*Retry/);
  assert.equal((await invite(post(body))).status, 200);
  assert.equal(approvals.size, 1);
  assert.equal(attempts, 2);
});

test("an AI outage saves no partial turn and a retry saves one complete turn", async () => {
  process.env.AI_GATEWAY_API_KEY = "test";
  const turns = [];
  const rpcCalls = [];
  const query = {
    select: () => query, eq: () => query, order: () => query, gte: () => query, lte: () => query,
    maybeSingle: () => ({ data: { id } }), limit: () => ({ data: [], returns: () => ({ data: [] }) }),
    insert: (turn) => { turns.push(turn); return query; },
    single: () => ({ data: turns.at(-1) }),
  };
  doubles.chat = { from: () => query, rpc: (name) => { rpcCalls.push(name); return { data: true }; } };
  doubles.ai = () => null;
  const body = { prompt: "Explain routing", conversationId: id, consent: true };
  const failure = await chat(post(body));
  assert.equal(failure.status, 502);
  assert.match((await failure.json()).error, /draft is still here/);
  assert.deepEqual(turns, []);
  assert.deepEqual(rpcCalls, ["search_course_pdf_pages"]);
  doubles.ai = () => ({ answer: "Routers forward packets.", inputTokens: null, outputTokens: null });
  assert.equal((await chat(post(body))).status, 200);
  assert.deepEqual(turns, [{ conversation_id: id, prompt: body.prompt, answer: "Routers forward packets." }]);
  assert.deepEqual(rpcCalls, ["search_course_pdf_pages", "search_course_pdf_pages", "reserve_chat_attempt"]);
});

test("course pages return published assignments only for the requested visible offering", async () => {
  const unseen = "abcdef00-1234-4234-8234-123456789012";
  const calls = [];
  const offering = { id, course: { code: "CS101", name: "Computing" } };
  const assignment = { id: unseen, offering_id: id, title: "Week 1" };
  doubles.chat = {
    from: (table) => {
      let selected;
      const query = {
        select: () => query, order: () => query,
        eq: (column, value) => { selected = value; calls.push([table, column, value]); return query; },
        then: (resolve) => resolve({ data: selected === id ? table === "course_offerings" ? [offering] : [assignment] : [] }),
      };
      return query;
    },
  };
  const get = (offeringId) => new Request(`https://example.com/api/academic-portal?offering=${offeringId}`, {
    headers: { Authorization: "Bearer test" },
  });
  assert.equal((await portal(get(unseen))).status, 404);
  assert.deepEqual(calls, [["course_offerings", "id", unseen]]);
  const response = await portal(get(id));
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await response.json(), { role: "student", courses: [offering], assignments: [assignment] });
  assert.deepEqual(calls.slice(1), [["course_offerings", "id", id], ["course_assignments", "offering_id", id]]);
});

test("course PDF mode checks enrollment scope before searching and filters the fallback", async () => {
  const checks = [];
  const calls = [];
  const scope = "abcdef00-1234-4234-8234-123456789012";
  let assigned = false;
  doubles.chat = {
    from: (table) => {
      const query = {
        select: () => query,
        eq: (key, value) => { checks.push([table, key, value]); return query; },
        maybeSingle: () => ({ data: table === "study_conversations"
          ? { id } : assigned ? { course: { code: "NET101", name: "Networking" } } : null }),
      };
      return query;
    },
    rpc: (name, args) => { calls.push([name, args]); return { data: { matches: [], unavailable: 0 } }; },
  };
  const request = { prompt: "Explain routing", conversationId: id, offeringId: scope, mode: "course-pdfs" };
  assert.equal((await chat(post(request))).status, 404);
  assert.deepEqual(calls, []);
  assigned = true;
  assert.equal((await chat(post(request))).status, 200);
  assert.ok(checks.some(([table, field, value]) => table === "course_offerings" && field === "id" && value === scope));
  assert.deepEqual(calls, [["search_course_pdf_pages", { p_terms: ["explain", "routing"], p_offering: scope }]]);
});

test("a PDF processing failure can be recorded on retry against the same resource", async () => {
  const writes = [];
  const client = {
    rpc: (name, args) => {
      writes.push({ name, args });
      return writes.length === 1 ? { error: new Error("Database unavailable") } : { data: "unsearchable" };
    },
  };
  const bytes = new TextEncoder().encode("%PDF-1.7\n%%EOF");
  assert.equal(await indexCoursePdf(client, id, bytes), null);
  assert.equal(await indexCoursePdf(client, id, bytes), "unsearchable");
  assert.deepEqual(writes, Array(2).fill({ name: "save_course_pdf_index", args: { p_id: id, p_pages: [] } }));
});
