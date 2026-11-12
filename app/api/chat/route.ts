import { authorize } from "@/lib/authorization";
import { createStudyClient } from "@/lib/study-context";
import { formatCoursePdfSearch, type CoursePdfSearchResult } from "@/lib/course-pdf-search";
import { MAX_STUDY_PROMPT } from "@/lib/study-chat-limits";

function reply(body: object, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const caller = await authorize(request, ["student"]);
  if (!caller.ok) return reply({ error: "Active student access required." }, caller.status);

  const input = await request.json().catch(() => null);
  const prompt: string = typeof input?.prompt === "string" ? input.prompt.trim() : "";
  if (input?.mode !== "course-pdfs") return reply({ error: "This endpoint searches course PDFs only." }, 400);
  const conversationId = typeof input?.conversationId === "string" ? input.conversationId : "";
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(conversationId)) {
    return reply({ error: "Choose a conversation first." }, 400);
  }
  if (!prompt || prompt.length > MAX_STUDY_PROMPT) {
    return reply({ error: "Enter a PDF search query within the character limit." }, 400);
  }

  const token = request.headers.get("authorization");
  const supabase = token && createStudyClient(token);
  if (!supabase) return reply({ error: "Course PDF search is unavailable. Your draft is still here." }, 503);

  const thread = await supabase.from("study_conversations").select("id")
    .eq("id", conversationId).eq("student_id", caller.userId).maybeSingle();
  if (thread.error) return reply({ error: "Could not load the conversation. Your draft is still here." }, 503);
  if (!thread.data) return reply({ error: "Conversation not found." }, 404);

  const words = [...new Set(prompt.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])];
  const terms = words.filter((word) => word.length > 1);
  const { data, error } = await supabase.rpc("search_course_pdf_pages", { p_terms: terms });
  if (error || !data) return reply({ error: "Could not search course PDFs. Your draft is still here." }, 503);
  const answer = formatCoursePdfSearch(data as CoursePdfSearchResult);
  return reply({ turn: { id: crypto.randomUUID(), prompt, answer } });
}
