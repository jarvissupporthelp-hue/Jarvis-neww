import assert from "node:assert/strict";
import test from "node:test";
import { askStudyAI, providerFailureMessage, resolveProviderAccess } from "../lib/study-ai.ts";

test("Vercel OIDC works without a personal model API key", () => {
  const keys = ["FREE_LLM_BASE_URL", "FREE_LLM_API_KEY", "FREE_LLM_MODEL", "AI_GATEWAY_API_KEY", "VERCEL", "VERCEL_OIDC_TOKEN"];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    for (const key of keys) delete process.env[key];
    assert.match(resolveProviderAccess(new Request("https://example.test")).error, /No AI provider/);
    process.env.VERCEL = "1";
    const request = new Request("https://example.test", { headers: { "x-vercel-oidc-token": "platform-token" } });
    assert.deepEqual(resolveProviderAccess(request), { credential: "platform-token" });
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
});

test("partial direct provider setup never sends its key to the gateway", () => {
  const keys = ["FREE_LLM_BASE_URL", "FREE_LLM_API_KEY", "FREE_LLM_MODEL", "VERCEL_OIDC_TOKEN"];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    for (const key of keys) delete process.env[key];
    process.env.FREE_LLM_API_KEY = "direct-provider-secret";
    process.env.VERCEL_OIDC_TOKEN = "gateway-token";
    assert.match(resolveProviderAccess(new Request("https://example.test")).error, /setup is incomplete/);
    process.env.FREE_LLM_BASE_URL = "https://provider.example/v1/chat/completions";
    process.env.FREE_LLM_MODEL = "example-model";
    assert.deepEqual(resolveProviderAccess(new Request("https://example.test")), { credential: "direct-provider-secret" });
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
});

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

test("provider failure returns a safe, actionable status without inventing an answer", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("unavailable", { status: 503 });
  try {
    assert.deepEqual(await askStudyAI("Help", "test-token", [], { courses: [], professorProfiles: [] }), { errorStatus: 503 });
    assert.match(providerFailureMessage(401), /authentication/);
    assert.match(providerFailureMessage(402), /credits/);
    assert.match(providerFailureMessage(429), /rate limited/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
