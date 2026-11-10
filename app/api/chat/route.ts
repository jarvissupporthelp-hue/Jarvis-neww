import { authorize } from "@/lib/authorization";
import { askStudyAI } from "@/lib/study-ai";
import { createStudyClient, examDateClarification, loadStudyContext } from "@/lib/study-context";
import { MAX_STUDY_PROMPT } from "@/lib/study-chat-limits";

function reply(body: object, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const caller = await authorize(request, ["student"]);
  if (!caller.ok) return reply({ error: "Active student access required." }, caller.status);

  const input = await request.json().catch(() => null);
  const prompt = typeof input?.prompt === "string" ? input.prompt.trim() : "";
  const conversationId = typeof input?.conversationId === "string" ? input.conversationId : "";
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(conversationId)) {
    return reply({ error: "Choose a conversation first." }, 400);
  }
  if (!prompt || prompt.length > MAX_STUDY_PROMPT || input?.consent !== true) {
    return reply({ error: "Enter a question within the character limit and accept the AI data-use notice." }, 400);
  }

  const token = request.headers.get("authorization");
  const supabase = token && createStudyClient(token);
  if (!supabase) return reply({ error: "The study assistant is unavailable. Your draft is still here." }, 503);

  const thread = await supabase.from("study_conversations").select("id")
    .eq("id", conversationId).eq("student_id", caller.userId).maybeSingle();
  if (thread.error) return reply({ error: "Could not load the conversation. Your draft is still here." }, 503);
  if (!thread.data) return reply({ error: "Conversation not found." }, 404);

  const { context, forbidden } = await loadStudyContext(supabase);
  if (!context) {
    return reply({ error: "Could not load your study context. Your draft is still here." }, forbidden ? 403 : 503);
  }

  let answer = examDateClarification(prompt, context);
  if (!answer) {
    // Vercel Functions receive a fresh platform token on the request.
    const runtimeToken = process.env.VERCEL === "1" ? request.headers.get("x-vercel-oidc-token") : null;
    const credential = process.env.AI_GATEWAY_API_KEY || runtimeToken || process.env.VERCEL_OIDC_TOKEN;
    if (!credential) return reply({ error: "The study assistant is unavailable. Your draft is still here." }, 503);

    const history = await supabase.from("study_turns").select("prompt,answer")
      .eq("conversation_id", conversationId).order("created_at", { ascending: false })
      .order("id", { ascending: false }).limit(4);
    if (history.error) return reply({ error: "Could not load chat history. Your draft is still here." }, 503);

    const { data: reserved, error } = await supabase.rpc("reserve_chat_attempt");
    if (error?.code === "42501") return reply({ error: "Active student access required." }, 403);
    if (error || reserved === null) return reply({ error: "The study assistant is unavailable. Your draft is still here." }, 503);
    if (reserved === false) return reply({ error: "You reached 20 attempts today. Try again after midnight UTC." }, 429);

    answer = await askStudyAI(prompt, credential, history.data.reverse(), context);
    if (!answer) return reply({ error: "The AI provider did not respond. Your draft is still here. Try again shortly." }, 502);
  }

  const saved = await supabase.from("study_turns")
    .insert({ conversation_id: conversationId, prompt, answer })
    .select("id,prompt,answer").single();
  if (saved.error) return reply({ error: "Could not save the reply. Your draft is still here." }, 503);
  return reply({ turn: saved.data });
}
