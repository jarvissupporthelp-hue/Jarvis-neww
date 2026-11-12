import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { indexCoursePdf } from "../lib/course-pdf-index.ts";

const id = "12345678-1234-4234-8234-123456789012";
const doubles = globalThis.recoveryTestDoubles = {};
const modules = {
  "@/lib/authorization": "export const authorize = () => ({ ok: true, userId: 'student' });",
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
  const query = {
    select: () => query, eq: () => query, order: () => query,
    maybeSingle: () => ({ data: { id } }), limit: () => ({ data: [] }),
    insert: (turn) => { turns.push(turn); return query; },
    single: () => ({ data: turns.at(-1) }),
  };
  doubles.chat = { from: () => query, rpc: () => ({ data: true }) };
  doubles.ai = () => null;
  const body = { prompt: "Explain routing", conversationId: id, consent: true };
  const failure = await chat(post(body));
  assert.equal(failure.status, 502);
  assert.match((await failure.json()).error, /draft is still here/);
  assert.deepEqual(turns, []);
  doubles.ai = () => ({ answer: "Routers forward packets.", inputTokens: null, outputTokens: null });
  assert.equal((await chat(post(body))).status, 200);
  assert.deepEqual(turns, [{ conversation_id: id, prompt: body.prompt, answer: "Routers forward packets." }]);
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
