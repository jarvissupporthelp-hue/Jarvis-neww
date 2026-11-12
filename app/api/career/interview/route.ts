import { authorize } from "@/lib/authorization";
import { interviewPrompt, readInterview } from "@/modules/career/interview";

export const maxDuration = 45;
const fail = (error: string, status: number) => Response.json({ error }, { status });
const usage = new Map<string, { count: number; expires: number }>();

function consume(userId: string) {
  const now = Date.now();
  for (const [id, window] of usage) if (window.expires <= now) usage.delete(id);
  const window = usage.get(userId) ?? { count: 0, expires: now + 3600000 };
  if (window.count >= 24) return false;
  window.count++;
  usage.set(userId, window);
  return true;
}

export async function POST(request: Request) {
  const identity = await authorize(request, ["student"]);
  if (!identity.ok) return fail("Sign in as a student to practice with the AI interviewer.", identity.status);
  const input = readInterview(await request.json().catch(() => null));
  if (!input) return fail("Choose an interview domain and enter a message up to 2,000 characters.", 400);

  const { GEMINI_API_KEY, GEMINI_INTERVIEW_MODEL, OLLAMA_INTERVIEW_URL, OLLAMA_INTERVIEW_MODEL, OLLAMA_INTERVIEW_API_KEY } = process.env;
  const provider = process.env.CAREER_INTERVIEW_PROVIDER || (GEMINI_API_KEY ? "gemini" : "ollama");
  if (provider !== "gemini" && provider !== "ollama") return fail("The interview provider is unavailable.", 503);
  if (provider === "gemini" ? !GEMINI_API_KEY : !OLLAMA_INTERVIEW_URL || !OLLAMA_INTERVIEW_MODEL) {
    return fail("The AI interviewer is awaiting provider setup. Configure Gemini or Ollama for this deployment.", 503);
  }
  if (!consume(identity.userId)) return fail("You reached the interview practice limit. Try again later.", 429);

  const system = interviewPrompt(input.domain);
  try {
    let reply: string;
    const signal = AbortSignal.timeout(35000);
    if (provider === "gemini") {
      const model = encodeURIComponent(GEMINI_INTERVIEW_MODEL || "gemini-2.5-flash");
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST", signal, headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY! },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] },
          contents: input.turns.map(({ role, content }) => ({ role: role === "assistant" ? "model" : "user", parts: [{ text: content }] })),
          generationConfig: { maxOutputTokens: 900, temperature: 0.5, thinkingConfig: { thinkingBudget: 0 } } }),
      });
      if (!response.ok) throw new Error("Gemini unavailable");
      const result = await response.json();
      reply = (result.candidates?.[0]?.content?.parts ?? []).filter((part: { thought?: boolean }) => !part.thought)
        .map((part: { text?: string }) => part.text ?? "").join("\n").trim();
    } else {
      const endpoint = new URL(OLLAMA_INTERVIEW_URL!);
      const local = ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname);
      if (endpoint.protocol !== "https:" && !(local && endpoint.protocol === "http:")) throw new Error("Invalid Ollama endpoint");
      const response = await fetch(new URL("api/chat", endpoint.href.replace(/\/?$/, "/")), {
        method: "POST", signal, redirect: "error", headers: {
          "Content-Type": "application/json", ...(OLLAMA_INTERVIEW_API_KEY ? { Authorization: `Bearer ${OLLAMA_INTERVIEW_API_KEY}` } : {}),
        },
        body: JSON.stringify({ model: OLLAMA_INTERVIEW_MODEL, stream: false,
          messages: [{ role: "system", content: system }, ...input.turns], options: { num_predict: 850, temperature: 0.5 } }),
      });
      if (!response.ok) throw new Error("Ollama unavailable");
      const result = await response.json();
      reply = typeof result.message?.content === "string" ? result.message.content.trim() : "";
    }
    if (!reply) return fail("The interviewer returned no answer. Try rephrasing your message.", 502);
    return Response.json({ reply: reply.slice(0, 5000), provider });
  } catch {
    return fail("The AI interviewer could not respond. Try again in a moment.", 502);
  }
}
