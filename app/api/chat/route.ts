import { authorize } from "@/lib/authorization";
import { askStudyAI, resolveProviderAccess } from "@/lib/study-ai";
import { createStudyClient, examDateClarification, loadStudyContext } from "@/lib/study-context";
import { formatCoursePdfSearch, type CoursePdfSearchResult } from "@/lib/course-pdf-search";
import { getCourseProfessorGuides } from "@/lib/professor-guides";
import { searchChroma } from "@/lib/chroma-retrieval";
import { MAX_STUDY_PROMPT } from "@/lib/study-chat-limits";

function reply(body: object, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function findPassages(client: NonNullable<ReturnType<typeof createStudyClient>>, prompt: string): Promise<CoursePdfSearchResult | null> {
  const semantic = await searchChroma(client, prompt).catch(() => null);
  if (semantic?.length) return { matches: semantic, unavailable: 0 };
  const words = [...new Set(prompt.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])];
  const terms = words.filter((word) => word.length > 1);
  const { data, error } = await client.rpc("search_course_pdf_pages", { p_terms: terms });
  return error || !data ? null : data as CoursePdfSearchResult;
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
    const passages = await findPassages(supabase, prompt);
    if (!passages) return reply({ error: "Could not search course PDFs. Your draft is still here." }, 503);
    const answer = formatCoursePdfSearch(passages);
    return reply({ turn: { id: crypto.randomUUID(), prompt, answer } });
  }

  const { context, forbidden } = await loadStudyContext(supabase);
  if (!context) {
    return reply({ error: "Could not load your study context. Your draft is still here." }, forbidden ? 403 : 503);
  }

  const [profileResult, memoryResult] = await Promise.all([
    supabase.from("professor_ai_profiles")
      .select("professor_name,course_plan,teaching_style,explanation_preferences,assessment_style,course_rules,offering:course_offerings!inner(course:courses!inner(code,name))"),
    supabase.from("student_ai_preferences")
      .select("learning_preferences,current_goal,topics_to_practice").eq("student_id", caller.userId).maybeSingle(),
  ]);
  const profiles = profileResult.data;
  if (memoryResult.error) return reply({ error: "Could not load your study preferences. Your draft is still here." }, 503);
  if (memoryResult.data) context.studentMemory = {
    learningPreferences: memoryResult.data.learning_preferences,
    currentGoal: memoryResult.data.current_goal,
    topicsToPractice: memoryResult.data.topics_to_practice,
  };
  context.professorProfiles = getCourseProfessorGuides(context.courses);
  if (profiles) {
    type ProfileRow = {
      professor_name: string; course_plan: string;
      teaching_style: string; explanation_preferences: string; assessment_style: string; course_rules: string;
      offering: { course: { code: string; name: string } | { code: string; name: string }[] } | { course: { code: string; name: string } | { code: string; name: string }[] }[];
    };
    const savedProfiles = (profiles as unknown as ProfileRow[]).map((row) => {
      const offering = Array.isArray(row.offering) ? row.offering[0] : row.offering;
      const course = Array.isArray(offering?.course) ? offering.course[0] : offering?.course;
      return {
        professorName: row.professor_name,
        course: course ? `${course.code}: ${course.name}` : "Course",
        coursePlan: row.course_plan,
        teachingStyle: row.teaching_style,
        explanationPreferences: row.explanation_preferences,
        assessmentStyle: row.assessment_style,
        courseRules: row.course_rules,
      };
    });
    for (const saved of savedProfiles) {
      const index = context.professorProfiles.findIndex((guide) => guide.course === saved.course);
      if (index >= 0) context.professorProfiles[index] = saved;
      else context.professorProfiles.push(saved);
    }
  }

  let answer = examDateClarification(prompt, context);
  if (!answer) {
    const provider = resolveProviderAccess(request);
    if ("error" in provider) return reply({ error: `${provider.error} Your draft is still here.` }, 503);

    const history = await supabase.from("study_turns").select("prompt,answer")
      .eq("conversation_id", conversationId).order("created_at", { ascending: false })
      .order("id", { ascending: false }).limit(4);
    if (history.error) return reply({ error: "Could not load chat history. Your draft is still here." }, 503);

    const { data: reserved, error } = await supabase.rpc("reserve_chat_attempt");
    if (error?.code === "42501") return reply({ error: "Active student access required." }, 403);
    if (error || reserved === null) return reply({ error: "The study assistant is unavailable. Your draft is still here." }, 503);
    if (reserved === false) return reply({ error: "You reached 20 attempts today. Try again after midnight UTC." }, 429);

    const passages = await findPassages(supabase, prompt).catch(() => null);
    const generated = await askStudyAI(prompt, provider.credential, history.data.reverse(), context, passages?.matches ?? []);
    if (!generated) return reply({ error: "The AI provider did not respond. Your draft is still here. Try again shortly." }, 502);
    answer = generated.answer;
    if (generated.inputTokens !== null && generated.outputTokens !== null) {
      await supabase.rpc("record_chat_tokens", {
        p_input: generated.inputTokens, p_output: generated.outputTokens,
      });
    }
  }

  const saved = await supabase.from("study_turns")
    .insert({ conversation_id: conversationId, prompt, answer })
    .select("id,prompt,answer").single();
  if (saved.error) return reply({ error: "Could not save the reply. Your draft is still here." }, 503);
  return reply({ turn: saved.data });
}
