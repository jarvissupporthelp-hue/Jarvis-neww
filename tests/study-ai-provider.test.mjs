import assert from "node:assert/strict";
import test from "node:test";
import { askStudyAI } from "../lib/study-ai.ts";

test("free gateway model returns a concise answer and reported token usage", async () => {
  const originalFetch = globalThis.fetch;
  const originalModel = process.env.AI_GATEWAY_MODEL;
  const originalEndpoint = process.env.FREE_LLM_BASE_URL;
  delete process.env.AI_GATEWAY_MODEL;
  delete process.env.FREE_LLM_BASE_URL;
  let sent;
  globalThis.fetch = async (url, options) => {
    sent = { url, options, body: JSON.parse(options.body) };
    return Response.json({ choices: [{ message: { content: "  A short answer.  " } }], usage: { prompt_tokens: 41, completion_tokens: 8 } });
  };
  try {
    const context = { courses: [], professorProfiles: [] };
    const result = await askStudyAI("Explain this", "test-token", [], context);
    assert.deepEqual(result, { answer: "A short answer.", inputTokens: 41, outputTokens: 8 });
    assert.equal(sent.url, "https://ai-gateway.vercel.sh/v1/chat/completions");
    assert.equal(sent.body.model, "nvidia/nemotron-3.5-lightning-free");
    assert.equal(sent.options.headers.Authorization, "Bearer test-token");
    assert.equal(sent.body.messages.at(-1).content, "Explain this");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalModel === undefined) delete process.env.AI_GATEWAY_MODEL;
    else process.env.AI_GATEWAY_MODEL = originalModel;
    if (originalEndpoint === undefined) delete process.env.FREE_LLM_BASE_URL;
    else process.env.FREE_LLM_BASE_URL = originalEndpoint;
  }
});

test("provider failure returns no answer or invented usage", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("unavailable", { status: 503 });
  try {
    assert.equal(await askStudyAI("Help", "test-token", [], { courses: [], professorProfiles: [] }), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
