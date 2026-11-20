import { directoryAnswer } from "@/lib/directory-answer";
import { studySearchQuery } from "@/lib/study-follow-up";
import { studentIdentity, colorMemory, profileUpdate } from "@/lib/student-profile";
import { authorize } from "@/lib/authorization";
import { askStudyAI, providerFailureMessage, resolveProviderAccess } from "@/lib/study-ai";
import { createStudyClient, examDateClarification, loadStudyContext } from "@/lib/study-context";
import { courseSearchTerms, formatCoursePdfSearch, type CoursePdfSearchResult } from "@/lib/course-pdf-search";
import { getCourseProfessorGuides } from "@/lib/professor-guides";
import { searchChroma } from "@/lib/chroma-retrieval";
import { assignmentDeadlines, type AssignmentDeadline } from "@/lib/course-assignments";
import { offeringIdPattern } from "@/modules/academics/portal-types";
import { MAX_STUDY_PROMPT } from "@/lib/study-chat-limits";

function reply(body: object, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function findPassages(client: NonNullable<ReturnType<typeof createStudyClient>>, prompt: string, offeringId?: string): Promise<CoursePdfSearchResult | null> {
  const semantic = await searchChroma(client, prompt, offeringId).catch(() => null);
  if (semantic?.length) return { matches: semantic, unavailable: 0 };
  const terms = courseSearchTerms(prompt);
  if (!terms.length) return { matches: [], unavailable: 0 };
  const { data, error } = await client.rpc("search_course_pdf_pages", offeringId ? { p_terms: terms, p_offering: offeringId } : { p_terms: terms });
  return error || !data ? null : data as CoursePdfSearchResult;
}

export const maxDuration = 60; // allow the AI provider chain time to fail over

export async function POST(request: Request) {
  const caller = await authorize(request, ["student"]);
  if (!caller.ok) return reply({ error: "Active student access required." }, caller.status);

  const input = await request.json().catch(() => null);
  const prompt: string = typeof input?.prompt === "string" ? input.prompt.trim() : "";
  const offeringId = input?.offeringId;
  if (offeringId !== undefined && (typeof offeringId !== "string" || !offeringIdPattern.test(offeringId))) {
    return reply({ error: "Choose a valid course." }, 400);
  }
  const coursePdfSearch = input?.mode === "course-pdfs";
  const conversationId = typeof input?.conversationId === "string" ? input.conversationId : "";
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(conversationId)) {
    return reply({ error: "Choose a conversation first." }, 400);
  }
  if (!prompt || prompt.length > MAX_STUDY_PROMPT) {
    return reply({ error: "Enter a question within the character limit." }, 400);
  }

  const token = request.headers.get("authorization");
  const supabase = token && createStudyClient(token);
  if (!supabase) return reply({ error: "The study assistant is unavailable. Your draft is still here." }, 503);

  const thread = await supabase.from("study_conversations").select("id")
    .eq("id", conversationId).eq("student_id", caller.userId).maybeSingle();
  if (thread.error) return reply({ error: "Could not load the conversation. Your draft is still here." }, 503);
  if (!thread.data) return reply({ error: "Conversation not found." }, 404);

  let selectedCourse: { code: string; name: string } | undefined;
  if (offeringId) {
    const { data, error } = await supabase.from("course_offerings").select("course:courses!inner(code,name)")
      .eq("id", offeringId).maybeSingle<{ course: { code: string; name: string } }>();
    if (error) return reply({ error: "Could not verify course access. Your draft is still here." }, 503);
    if (!data) return reply({ error: "Course not found." }, 404);
    selectedCourse = data.course;
  }

  if (coursePdfSearch) {
    const passages = await findPassages(supabase, prompt, offeringId);
    if (!passages) return reply({ error: "Could not search course PDFs. Your draft is still here." }, 503);
    const answer = formatCoursePdfSearch(passages);
    return reply({ turn: { id: crypto.randomUUID(), prompt, answer } });
  }

  const { context, forbidden } = await loadStudyContext(supabase);
  if (!context) {
    return reply({ error: "Could not load your study context. Your draft is still here." }, forbidden ? 403 : 503);
  }

  context.selectedCourse = selectedCourse;
  const deadlines = assignmentDeadlines(supabase).gte("due_on", context.from).lte("due_on", context.through);
  const profilesQuery = supabase.from("professor_ai_profiles")
    .select("professor_name,course_plan,teaching_style,explanation_preferences,assessment_style,course_rules,offering:course_offerings!inner(course:courses!inner(code,name))");
  const [profileResult, memoryResult, deadlineResult, enrollment] = await Promise.all([
    offeringId ? profilesQuery.eq("offering_id", offeringId) : profilesQuery,
    supabase.from("student_ai_preferences")
      .select("learning_preferences,current_goal,topics_to_practice,preferred_color,interest").eq("student_id", caller.userId).maybeSingle(),
    (offeringId ? deadlines.eq("offering_id", offeringId) : deadlines).limit(12).returns<AssignmentDeadline[]>(),
    supabase.from("memberships")
      .select("profile:profiles!memberships_user_id_fkey(display_name),group:student_groups(code,academic_year,program:programs(faculty:faculties(name)))")
      .eq("user_id", caller.userId).maybeSingle<{
        profile: { display_name: string } | null;
        group: { code: string; academic_year: number; program: { faculty: { name: string } | null } | null } | null;
      }>(),
  ]);
  if (deadlineResult.data && !deadlineResult.error) {
    context.officialDeadlinesAvailable = true;
    context.courseDeadlines = deadlineResult.data.map((item) => ({
      course: item.offering.course.name, title: item.title, date: item.due_on, time: item.due_at,
    }));
  }
  const profiles = profileResult.data;
  if (memoryResult.error) return reply({ error: "Could not load your study preferences. Your draft is still here." }, 503);
  if (memoryResult.data) context.studentMemory = {
    learningPreferences: memoryResult.data.learning_preferences,
    currentGoal: memoryResult.data.current_goal,
    topicsToPractice: memoryResult.data.topics_to_practice,
  };
  context.professorProfiles = getCourseProfessorGuides(selectedCourse ? [selectedCourse] : context.courses);
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

  const savedMemory = memoryResult.data;
  const preferences: Record<string, string> = savedMemory ? {
    preferredColor: savedMemory.preferred_color, interest: savedMemory.interest,
    learningPreference: savedMemory.learning_preferences, currentGoal: savedMemory.current_goal,
  } : {};
  const update = profileUpdate(prompt);
  if (update) preferences[update.profile_field] = update.profile_value;
  const memory = colorMemory(prompt, preferences.preferredColor);
  const group = enrollment.data?.group;
  const inferred = studentIdentity(caller.email);
  context.studentProfile = {
    displayName: enrollment.data?.profile?.display_name,
    group: group?.code,
    academicYear: group?.academic_year,
    faculty: group?.program?.faculty?.name ?? inferred?.faculty,
    identity: inferred && { givenName: inferred.givenName, surname: inferred.surname },
    preferences,
  };
  let answer = memory.answer ?? examDateClarification(prompt, context) ?? directoryAnswer(prompt);
  if (!answer) {
    const provider = resolveProviderAccess(request);
    if ("error" in provider) return reply({ error: `${provider.error} Your draft is still here.` }, 503);

    const history = await supabase.from("study_turns").select("prompt,answer")
      .eq("conversation_id", conversationId).order("created_at", { ascending: false })
      .order("id", { ascending: false }).limit(8);
    if (history.error) return reply({ error: "Could not load chat history. Your draft is still here." }, 503);

    const searchQuery = studySearchQuery(prompt, history.data);
    const passages = await findPassages(supabase, searchQuery, offeringId).catch(() => null);
    const generated = await askStudyAI(prompt, provider.credential, history.data.reverse(), context, passages?.matches ?? [], searchQuery);
    if (generated && "errorStatus" in generated) return reply({ error: `${providerFailureMessage(generated.errorStatus)} Your draft is still here.` }, 502);
    if (!generated) return reply({ error: "The AI provider did not respond. Your draft is still here. Try again shortly." }, 502);

    // Only consume a student's daily message after the model produced a usable reply.
    // A provider outage must not reduce the student’s allowance.
    const { data: reserved, error } = await supabase.rpc("reserve_chat_attempt");
    if (error?.code === "42501") return reply({ error: "Active student access required." }, 403);
    if (error || reserved === null) return reply({ error: "The study assistant is unavailable. Your draft is still here." }, 503);
    if (reserved === false) return reply({ error: "You reached your daily AI message limit. Try again after midnight UTC." }, 429);

    answer = generated.answer;
    if (generated.inputTokens !== null && generated.outputTokens !== null) {
      await supabase.rpc("record_chat_tokens", {
        p_input: generated.inputTokens, p_output: generated.outputTokens,
      });
    }
  }

  const saved = await supabase.from("study_turns")
    .insert({ conversation_id: conversationId, prompt, answer, ...update })
    .select("id,prompt,answer").single();
  if (saved.error) return reply({ error: "Could not save the reply. Your draft is still here." }, 503);
  const fields: Record<string, string> = { preferredColor: "preferred_color", interest: "interest", currentGoal: "current_goal", learningPreference: "learning_preferences" };
  const memoryPatch = update ? { [fields[update.profile_field]]: update.profile_value } : undefined;
  return reply({ turn: saved.data, memoryPatch });
}
