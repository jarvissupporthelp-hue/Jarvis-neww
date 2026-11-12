import assert from "node:assert/strict";
import test from "node:test";
import { buildProviders, completeWithFailover, resetProviderHealth } from "../lib/ai-providers.ts";

const messages = [{ role: "user", content: "Hi" }];
const ok = (text) => Response.json({ choices: [{ message: { content: text } }], usage: { prompt_tokens: 3, completion_tokens: 2 } });

test("providers are built only from credentials that exist, in the documented order", () => {
  assert.deepEqual(buildProviders("", {}), []);
  const env = {
    GEMINI_API_KEY: "g", DEEPSEEK_API_KEY: "d", OPENAI_API_KEY: "o", XAI_API_KEY: "x", NVIDIA_API_KEY: "n",
    HUGGINGFACE_API_KEY: "h", CLOUDFLARE_API_TOKEN: "c", CLOUDFLARE_ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
  };
  assert.deepEqual(buildProviders("gw", env).map((p) => p.id),
    ["gemini", "deepseek", "openai", "xai", "nvidia", "cloudflare", "huggingface", "gateway"]);
  assert.deepEqual(buildProviders("", { ...env, AI_PROVIDER_ORDER: "openai, gemini" }).map((p) => p.id), ["openai", "gemini"]);
});

test("Cloudflare is skipped without a valid account id and never builds a URL from unsafe input", () => {
  assert.deepEqual(buildProviders("", { CLOUDFLARE_API_TOKEN: "c" }), []);
  assert.deepEqual(buildProviders("", { CLOUDFLARE_API_TOKEN: "c", CLOUDFLARE_ACCOUNT_ID: "../evil?x=1" }), []);
  const [cloudflare] = buildProviders("", { CLOUDFLARE_API_TOKEN: "c", CLOUDFLARE_ACCOUNT_ID: "0DHBGs11n8JaKo7V2GRoJzHymMSCr91xoLk8I9Nq" });
  assert.equal(cloudflare.endpoint, "https://api.cloudflare.com/client/v4/accounts/0DHBGs11n8JaKo7V2GRoJzHymMSCr91xoLk8I9Nq/ai/v1/chat/completions");
});

test("the explicit FREE_LLM settings drive Gemini and a half-set primary is ignored", () => {
  const full = { FREE_LLM_BASE_URL: "https://p.example/v1/chat/completions", FREE_LLM_API_KEY: "k", FREE_LLM_MODEL: "m" };
  assert.deepEqual(buildProviders("", full).map((p) => [p.id, p.endpoint, p.model]), [["gemini", full.FREE_LLM_BASE_URL, "m"]]);
  assert.deepEqual(buildProviders("", { FREE_LLM_API_KEY: "k" }), []);
});

test("a failing provider falls through to the next one and each provider only gets its own key", async () => {
  resetProviderHealth();
  const providers = buildProviders("", { GEMINI_API_KEY: "gem-key", DEEPSEEK_API_KEY: "ds-key", OPENAI_API_KEY: "oa-key" });
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), auth: options.headers.Authorization, body: JSON.parse(options.body) });
    if (String(url).includes("googleapis")) return new Response("down", { status: 503 });
    return ok("  From DeepSeek  ");
  };
  const result = await completeWithFailover(providers, { messages, maxTokens: 100 }, { fetchImpl });
  assert.deepEqual(result, { ok: true, provider: "DeepSeek", answer: "From DeepSeek", inputTokens: 3, outputTokens: 2 });
  assert.deepEqual(calls.map((c) => c.auth), ["Bearer gem-key", "Bearer ds-key"]);
  assert.equal(calls[1].body.max_tokens, 100);
});

test("OpenAI requests use max_completion_tokens and no temperature", async () => {
  resetProviderHealth();
  let body;
  await completeWithFailover(buildProviders("", { OPENAI_API_KEY: "k" }), { messages, maxTokens: 50 }, {
    fetchImpl: async (_url, options) => { body = JSON.parse(options.body); return ok("fine"); },
  });
  assert.equal(body.max_completion_tokens, 50);
  assert.ok(!("max_tokens" in body) && !("temperature" in body));
});

test("an empty answer, a network error and an HTTP error all fall through", async () => {
  resetProviderHealth();
  const providers = buildProviders("", { GEMINI_API_KEY: "a", DEEPSEEK_API_KEY: "b", XAI_API_KEY: "c", NVIDIA_API_KEY: "d" });
  const seen = [];
  const fetchImpl = async (url) => {
    seen.push(String(url));
    if (seen.length === 1) return Response.json({ choices: [{ message: { content: "   " } }] });
    if (seen.length === 2) throw new TypeError("network down");
    if (seen.length === 3) return new Response("nope", { status: 429 });
    return ok("Last one standing");
  };
  const result = await completeWithFailover(providers, { messages, maxTokens: 10 }, { fetchImpl });
  assert.equal(result.provider, "NVIDIA");
  assert.equal(seen.length, 4);
});

test("when every provider fails the last HTTP status is reported, or null for network failures", async () => {
  resetProviderHealth();
  const providers = buildProviders("", { GEMINI_API_KEY: "a", DEEPSEEK_API_KEY: "b" });
  const statuses = [402, 503];
  assert.deepEqual(await completeWithFailover(providers, { messages, maxTokens: 10 }, {
    fetchImpl: async () => new Response("x", { status: statuses.shift() }),
  }), { ok: false, status: 503 });
  resetProviderHealth();
  assert.deepEqual(await completeWithFailover(providers, { messages, maxTokens: 10 }, {
    fetchImpl: async () => { throw new Error("offline"); },
  }), { ok: false, status: null });
});

test("a provider that just failed is skipped on the next request, then retried after its cooldown", async () => {
  resetProviderHealth();
  const providers = buildProviders("", { GEMINI_API_KEY: "a", DEEPSEEK_API_KEY: "b" });
  let clock = 1_000_000;
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(String(url));
    return String(url).includes("googleapis") ? new Response("bad key", { status: 401 }) : ok("deepseek");
  };
  const run = () => completeWithFailover(providers, { messages, maxTokens: 10 }, { fetchImpl, now: () => clock });
  await run();
  urls.length = 0;
  await run();
  assert.equal(urls.length, 1);
  assert.match(urls[0], /deepseek/);
  clock += 6 * 60_000;
  urls.length = 0;
  await run();
  assert.equal(urls.length, 2);
  assert.match(urls[0], /googleapis/);
});

test("if every provider is cooling down the request still tries them instead of failing outright", async () => {
  resetProviderHealth();
  const providers = buildProviders("", { GEMINI_API_KEY: "a" });
  let healthy = false;
  const fetchImpl = async () => (healthy ? ok("back") : new Response("x", { status: 500 }));
  await completeWithFailover(providers, { messages, maxTokens: 10 }, { fetchImpl });
  healthy = true;
  const result = await completeWithFailover(providers, { messages, maxTokens: 10 }, { fetchImpl });
  assert.equal(result.ok, true);
});

test("the total time budget stops the chain", async () => {
  resetProviderHealth();
  const providers = buildProviders("", { GEMINI_API_KEY: "a", DEEPSEEK_API_KEY: "b", XAI_API_KEY: "c" });
  let clock = 0;
  const urls = [];
  const fetchImpl = async (url) => { urls.push(String(url)); clock += 30_000; return new Response("slow", { status: 504 }); };
  const result = await completeWithFailover(providers, { messages, maxTokens: 10 }, { fetchImpl, now: () => clock, budgetMs: 40_000 });
  assert.deepEqual(result, { ok: false, status: 504 });
  assert.equal(urls.length, 2);
});

test("a separate GEMINI_API_KEY is a second Gemini credential behind the primary one", () => {
  const env = { FREE_LLM_BASE_URL: "https://p.example/v1/chat/completions", FREE_LLM_API_KEY: "primary", FREE_LLM_MODEL: "m", GEMINI_API_KEY: "second" };
  assert.deepEqual(buildProviders("", env).map((p) => [p.id, p.apiKey]), [["gemini", "primary"], ["gemini-alt", "second"]]);
  assert.deepEqual(buildProviders("", { ...env, GEMINI_API_KEY: "primary" }).map((p) => p.id), ["gemini"]);
});
