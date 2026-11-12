// Ordered AI provider chain with automatic failover.
//
// Every provider speaks the OpenAI chat-completions format. A provider is only used when its
// credential is present in the server environment; keys are never logged or sent to another provider.
// Providers that just failed are put on a short cooldown so a dead provider does not slow every request.

type Env = Record<string, string | undefined>;

export type ProviderConfig = {
  id: string;
  name: string;
  endpoint: string;
  apiKey: string;
  model: string;
  tokenParameter: "max_tokens" | "max_completion_tokens";
  temperature: boolean;
};

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type CompletionResult =
  | { ok: true; provider: string; answer: string; inputTokens: number | null; outputTokens: number | null }
  | { ok: false; status: number | null };

const gatewayUrl = "https://ai-gateway.vercel.sh/v1/chat/completions";
const defaultOrder = ["gemini", "gemini-alt", "deepseek", "openai", "xai", "nvidia", "cloudflare", "huggingface", "gateway"];
const cloudflareAccountId = /^[A-Za-z0-9]{16,64}$/;

function value(env: Env, name: string) {
  return env[name]?.trim() || "";
}

export function hasPartialPrimary(env: Env = process.env) {
  const parts = [value(env, "FREE_LLM_BASE_URL"), value(env, "FREE_LLM_API_KEY"), value(env, "FREE_LLM_MODEL")];
  return parts.some(Boolean) && !parts.every(Boolean);
}

export function buildProviders(gatewayCredential = "", env: Env = process.env): ProviderConfig[] {
  const catalog: Record<string, ProviderConfig | null> = {};

  const primaryComplete = !hasPartialPrimary(env) && Boolean(value(env, "FREE_LLM_BASE_URL"));
  const geminiKey = value(env, "GEMINI_API_KEY");
  if (primaryComplete) {
    catalog.gemini = {
      id: "gemini", name: "Gemini", endpoint: value(env, "FREE_LLM_BASE_URL"), apiKey: value(env, "FREE_LLM_API_KEY"),
      model: value(env, "FREE_LLM_MODEL"), tokenParameter: "max_tokens", temperature: true,
    };
    // A separate GEMINI_API_KEY is kept as a second Gemini credential in case the primary key is rejected.
    if (geminiKey && geminiKey !== value(env, "FREE_LLM_API_KEY")) {
      catalog["gemini-alt"] = { ...catalog.gemini, id: "gemini-alt", name: "Gemini (second key)", apiKey: geminiKey };
    }
  } else if (geminiKey) {
    catalog.gemini = {
      id: "gemini", name: "Gemini", endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      apiKey: geminiKey, model: value(env, "GEMINI_MODEL") || "gemini-2.5-flash", tokenParameter: "max_tokens", temperature: true,
    };
  }

  const simple = (id: string, name: string, keyName: string, endpoint: string, model: string, modelEnv: string,
    tokenParameter: ProviderConfig["tokenParameter"] = "max_tokens", temperature = true) => {
    const apiKey = value(env, keyName);
    if (apiKey) catalog[id] = { id, name, endpoint, apiKey, model: value(env, modelEnv) || model, tokenParameter, temperature };
  };
  simple("deepseek", "DeepSeek", "DEEPSEEK_API_KEY", "https://api.deepseek.com/chat/completions", "deepseek-chat", "DEEPSEEK_MODEL");
  simple("openai", "OpenAI", "OPENAI_API_KEY", "https://api.openai.com/v1/chat/completions", "gpt-6-luna", "OPENAI_MODEL", "max_completion_tokens", false);
  simple("xai", "xAI", "XAI_API_KEY", "https://api.x.ai/v1/chat/completions", "grok-4", "XAI_MODEL");
  simple("nvidia", "NVIDIA", "NVIDIA_API_KEY", "https://integrate.api.nvidia.com/v1/chat/completions", "meta/llama-3.2-90b-vision-instruct", "NVIDIA_MODEL");
  simple("huggingface", "Hugging Face", "HUGGINGFACE_API_KEY", "https://router.huggingface.co/v1/chat/completions", "meta-llama/Llama-3.3-70B-Instruct", "HUGGINGFACE_MODEL");

  const account = value(env, "CLOUDFLARE_ACCOUNT_ID");
  if (value(env, "CLOUDFLARE_API_TOKEN") && cloudflareAccountId.test(account)) {
    simple("cloudflare", "Cloudflare Workers AI", "CLOUDFLARE_API_TOKEN",
      `https://api.cloudflare.com/client/v4/accounts/${account}/ai/v1/chat/completions`,
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast", "CLOUDFLARE_MODEL");
  }

  if (gatewayCredential) {
    catalog.gateway = {
      id: "gateway", name: "Vercel AI Gateway", endpoint: gatewayUrl, apiKey: gatewayCredential,
      model: value(env, "AI_GATEWAY_MODEL") || "nvidia/nemotron-3.5-lightning-free", tokenParameter: "max_tokens", temperature: true,
    };
  }

  const requested = value(env, "AI_PROVIDER_ORDER").toLowerCase().split(/[\s,]+/).filter(Boolean);
  const order = requested.length ? requested : defaultOrder;
  return order.flatMap((id) => (catalog[id] ? [catalog[id]] : []));
}

const cooldownUntil = new Map<string, number>();

export function resetProviderHealth() {
  cooldownUntil.clear();
}

function cooldownFor(status: number | null) {
  if (status === 401 || status === 402 || status === 403 || status === 404) return 5 * 60_000;
  if (status === 429) return 60_000;
  return 30_000;
}

export async function completeWithFailover(
  providers: ProviderConfig[],
  request: { messages: ChatMessage[]; maxTokens: number },
  options: { fetchImpl?: typeof fetch; now?: () => number; budgetMs?: number; attemptMs?: number } = {},
): Promise<CompletionResult> {
  const doFetch = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;
  const deadline = now() + (options.budgetMs ?? 40_000);
  const attemptMs = options.attemptMs ?? 15_000;
  const ready = providers.filter((provider) => (cooldownUntil.get(provider.id) ?? 0) <= now());
  // If everything is cooling down, try the full list anyway rather than refusing to answer.
  const queue = ready.length ? ready : providers;
  let lastStatus: number | null = null;

  for (const provider of queue) {
    const remaining = deadline - now();
    if (remaining <= 500) break;
    try {
      const response = await doFetch(provider.endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${provider.apiKey}`, "Content-Type": "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(Math.min(attemptMs, remaining)),
        body: JSON.stringify({
          model: provider.model,
          messages: request.messages,
          [provider.tokenParameter]: request.maxTokens,
          ...(provider.temperature ? { temperature: 0.35 } : {}),
        }),
      });
      if (!response.ok) {
        lastStatus = response.status;
        cooldownUntil.set(provider.id, now() + cooldownFor(response.status));
        console.error("JARVIS AI provider failed:", provider.name, response.status);
        continue;
      }
      const body = await response.json();
      const answer = body?.choices?.[0]?.message?.content;
      if (typeof answer !== "string" || !answer.trim()) {
        console.error("JARVIS AI provider returned no answer:", provider.name);
        continue;
      }
      const inputTokens = body?.usage?.prompt_tokens;
      const outputTokens = body?.usage?.completion_tokens;
      cooldownUntil.delete(provider.id);
      return {
        ok: true,
        provider: provider.name,
        answer: answer.trim(),
        inputTokens: Number.isSafeInteger(inputTokens) && inputTokens >= 0 ? inputTokens : null,
        outputTokens: Number.isSafeInteger(outputTokens) && outputTokens >= 0 ? outputTokens : null,
      };
    } catch (error) {
      cooldownUntil.set(provider.id, now() + cooldownFor(null));
      console.error("JARVIS AI provider request failed:", provider.name, error instanceof Error ? error.name : "unknown");
    }
  }
  return { ok: false, status: lastStatus };
}
