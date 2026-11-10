const model = "google/gemini-2.5-flash-lite";

export async function askStudyAI(prompt: string, credential: string, history: { prompt: string; answer: string }[] = []): Promise<string | null> {
  try {
    const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${credential}`, "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        model,
        max_tokens: 400,
        messages: [
          { role: "system", content: "You are JARVIS, a university study tutor. Explain concepts clearly in the student's language. Be concise and acknowledge uncertainty. You do not have access to the student's university records, files, grades, or calendar. Never invent them." },
          ...history.flatMap((turn) => [
            { role: "user", content: turn.prompt },
            { role: "assistant", content: turn.answer.slice(0, 2_000) },
          ]),
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!response.ok) return null;
    const body = await response.json();
    const answer = body?.choices?.[0]?.message?.content;
    return typeof answer === "string" ? answer.trim() || null : null;
  } catch {
    return null;
  }
}
