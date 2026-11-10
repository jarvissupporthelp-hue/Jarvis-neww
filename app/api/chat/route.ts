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
  const prompt: string = typeof input?.prompt === "string" ? input.prompt.trim() : "";
  const coursePdfSearch = input?.mode === "course-pdfs";
  const conversationId = typeof input?.conversationId === "string" ? input.conversationId : "";
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(conversationId)) {
    return reply({ error: "Choose a conversation first." }, 400);
  }
  if (!prompt || prompt.length > MAX_STUDY_PROMPT || (!coursePdfSearch && input?.consent !== true)) {
    return reply({ error: "Enter a question within the character limit and accept the AI data-use notice." }, 400);
  }

  const token = request.headers.get("authorization");
  const supabase = token && createStudyClient(token);
  if (!supabase) return reply({ error: "The study assistant is unavailable. Your draft is still here." }, 503);

  const thread = await supabase.from("study_conversations").select("id")
    .eq("id", conversationId).eq("student_id", caller.userId).maybeSingle();
  if (thread.error) return reply({ error: "Could not load the conversation. Your draft is still here." }, 503);
  if (!thread.data) return reply({ error: "Conversation not found." }, 404);

  if (coursePdfSearch) {
    const words = [...new Set(prompt.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])];
    const terms = words.filter((word) => word.length > 1);
    const { data, error } = await supabase.rpc("search_course_pdf_pages", { p_terms: terms });
    if (error || !data) return reply({ error: "Could not search course PDFs. Your draft is still here." }, 503);
    const results = data as { matches: { title: string; page: number; excerpt: string }[]; unavailable: number };
    const passages = results.matches.map(({ title, page, excerpt }) =>
      `${title} · Page ${page}\n“${excerpt.replaceAll("[[[", "").replaceAll("]]]", "")}”`);
    const sections = [passages.length ? "Relevant passages from your course PDFs." : "No matching passages in your searchable course PDFs."];
    sections.push(...passages);
    if (results.unavailable) sections.push(`JARVIS couldn’t search ${results.unavailable} course PDF(s) that haven’t been indexed. You can still open them in Course resources.`);
    return reply({ turn: { id: crypto.randomUUID(), prompt, answer: sections.join("\n\n") } });
  }

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
