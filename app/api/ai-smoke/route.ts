export const dynamic = "force-dynamic";

type Provider = { name: string; endpoint: string; key?: string; model: string };

function configuredProviders(): Provider[] {
  const cloudflareAccount = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  return [
    { name: "Gemini", endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", key: process.env.GEMINI_API_KEY, model: "gemini-3.5-flash-lite" },
    { name: "xAI", endpoint: "https://api.x.ai/v1/chat/completions", key: process.env.XAI_API_KEY, model: "grok-4.3" },
    { name: "DeepSeek", endpoint: "https://api.deepseek.com/chat/completions", key: process.env.DEEPSEEK_API_KEY, model: "deepseek-flash" },
    { name: "OpenAI", endpoint: "https://api.openai.com/v1/chat/completions", key: process.env.OPENAI_API_KEY, model: "gpt-6-luna" },
    { name: "Hugging Face", endpoint: "https://router.huggingface.co/v1/chat/completions", key: process.env.HUGGINGFACE_API_KEY, model: "openai/gpt-oss-120b:fastest" },
    { name: "Cloudflare", endpoint: cloudflareAccount ? `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccount}/ai/v1/chat/completions` : "", key: process.env.CLOUDFLARE_API_TOKEN, model: "@cf/meta/llama-3.1-8b-instruct" },
    { name: "NVIDIA", endpoint: "https://integrate.api.nvidia.com/v1/chat/completions", key: process.env.NVIDIA_API_KEY, model: "openai/gpt-oss-20b" },
  ];
}

async function check(provider: Provider) {
  if (!provider.endpoint || !provider.key?.trim()) {
    return { name: provider.name, model: provider.model, ok: false, status: 0, error: "Not configured" };
  }
  const started = Date.now();
  try {
    if (provider.name === "NVIDIA") {
      const catalog = await fetch("https://integrate.api.nvidia.com/v1/models", {
        headers: { Authorization: `Bearer ${provider.key.trim()}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      const catalogBody = await catalog.json().catch(() => null);
      const available = Array.isArray(catalogBody?.data)
        ? catalogBody.data.map((item: { id?: unknown }) => item.id).filter((id: unknown): id is string => typeof id === "string")
        : [];
      const preferred = available.find((id: string) => /gpt-oss-20b|instruct|chat/i.test(id));
      if (!catalog.ok || !preferred) {
        return { name: provider.name, model: provider.model, ok: false, status: catalog.status, latencyMs: Date.now() - started, error: "No compatible chat model found", available: available.slice(0, 8) };
      }
      provider = { ...provider, model: preferred };
    }
    const response = await fetch(provider.endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${provider.key.trim()}`, "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        model: provider.model,
        temperature: 0.2,
        messages: [{ role: "user", content: "In one short sentence, explain what an absolute Unix path is." }],
        ...(provider.name === "OpenAI" ? { max_completion_tokens: 80 }
          : provider.name === "xAI" ? { reasoning_effort: "none" }
          : { max_tokens: 80 }),
      }),
    });
    const body = await response.json().catch(() => null);
    const answer = body?.choices?.[0]?.message?.content;
    return {
      name: provider.name,
      model: provider.model,
      ok: response.ok && typeof answer === "string" && Boolean(answer.trim()),
      status: response.status,
      latencyMs: Date.now() - started,
      answer: typeof answer === "string" ? answer.trim().slice(0, 240) : undefined,
      error: response.ok ? undefined : String(body?.error?.message || body?.error || body?.errors?.[0]?.message || body?.message || "Provider rejected the request").slice(0, 320),
    };
  } catch (error) {
    return { name: provider.name, model: provider.model, ok: false, status: 0, latencyMs: Date.now() - started, error: error instanceof Error ? error.name : "Request failed" };
  }
}

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return Response.json({ ok: false, error: "Preview only." }, { status: 404 });
  }
  const providers = await Promise.all(configuredProviders().map(check));
  return Response.json({ ok: providers.some((provider) => provider.ok), providers }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
