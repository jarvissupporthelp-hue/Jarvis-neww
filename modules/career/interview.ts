export const interviewDomains = ["DevOps", "Software Engineering", "Data Engineering", "QA Engineering", "Network Engineering"] as const;
export type InterviewDomain = typeof interviewDomains[number];
export type InterviewTurn = { role: "user" | "assistant"; content: string };

export function readInterview(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const { domain, messages } = value as { domain?: InterviewDomain; messages?: unknown };
  if (!domain || !interviewDomains.includes(domain) || !Array.isArray(messages) || !messages.length || messages.length > 13) return null;
  const turns: InterviewTurn[] = [];
  for (const [index, message] of messages.entries()) {
    const role = index % 2 === 0 ? "user" : "assistant";
    if (message?.role !== role || typeof message.content !== "string") return null;
    const content = message.content.trim();
    if (!content || content.length > (role === "user" ? 2000 : 5000)) return null;
    turns.push({ role, content });
  }
  return turns.at(-1)?.role === "user" ? { domain, turns } : null;
}

export function interviewPrompt(domain: InterviewDomain) {
  return `You are a friendly junior-level ${domain} interview coach for university students. Ask one interview question at a time. When the student answers, give short, specific feedback and one follow-up question. When they ask a technical question, answer it directly with a concise example. If they ask to start, ask the first question. Stay in the selected domain and explain unfamiliar terminology. Use plain text with short paragraphs. Keep security examples defensive and conceptual. Do not ask for private personal details or credentials.`;
}
