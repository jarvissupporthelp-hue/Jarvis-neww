import { createClient } from "@supabase/supabase-js";
import { authorize } from "@/lib/authorization";
import { askStudyAI } from "@/lib/study-ai";
import { MAX_STUDY_PROMPT } from "@/lib/study-chat-limits";

function reply(body: object, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const caller = await authorize(request, ["student"]);
  if (!caller.ok) return reply({ error: "Active student access required." }, caller.status);

  const input = await request.json().catch(() => null);
  const prompt = typeof input?.prompt === "string" ? input.prompt.trim() : "";
  if (!prompt || prompt.length > MAX_STUDY_PROMPT || input?.consent !== true) {
    return reply({ error: "Enter a question within the character limit and accept the AI data-use notice." }, 400);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const token = request.headers.get("authorization");
  const credential = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if (!url || !key || !token || !credential) {
    return reply({ error: "The study assistant is unavailable. Your draft is still here." }, 503);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: token },
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(5_000) }),
    },
  });
  const { data: reserved, error } = await supabase.rpc("reserve_chat_attempt");
  if (error?.code === "42501") return reply({ error: "Active student access required." }, 403);
  if (error) return reply({ error: "The study assistant is unavailable. Your draft is still here." }, 503);
  if (reserved === false) return reply({ error: "You reached 20 attempts today. Try again after midnight UTC." }, 429);
  if (reserved !== true) return reply({ error: "The study assistant is unavailable. Your draft is still here." }, 503);

  const answer = await askStudyAI(prompt, credential);
  if (!answer) return reply({ error: "The AI provider did not respond. Your draft is still here. Try again shortly." }, 502);
  return reply({ answer });
}
