import { createClient } from "@supabase/supabase-js";

type TimeSlot = { date: string; start: string; end: string };

export type StudyContext = {
  timeZone: string;
  from: string;
  through: string;
  courses: { code: string; name: string }[];
  classes: (TimeSlot & { course: string })[];
  busyTimes: TimeSlot[];
  taskDueDates: { date: string; count: number }[];
  selectedCourse?: { code: string; name: string };
  courseDeadlines?: { course: string; title: string; date: string; time: string }[];
  officialDeadlinesAvailable: boolean;
  officialExamDatesAvailable: boolean;
  studentProfile?: {
    displayName?: string;
    identity?: { givenName: string; surname: string };
    faculty?: string;
    academicYear?: number;
    group?: string;
    preferences: Record<string, string>;
  };
  studentMemory?: { learningPreferences: string; currentGoal: string; topicsToPractice: string };
  professorProfiles?: {
    professorName: string;
    course: string;
    coursePlan: string;
    teachingStyle: string;
    explanationPreferences: string;
    assessmentStyle: string;
    courseRules: string;
  }[];
};

export function createStudyClient(authorization: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: authorization },
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(5_000) }),
    },
  });
}

export async function loadStudyContext(client: NonNullable<ReturnType<typeof createStudyClient>>) {
  const { data, error } = await client.rpc("study_context");
  if (error || !data) return { context: null, forbidden: error?.code === "42501" } as const;
  return { context: data as unknown as StudyContext, forbidden: false } as const;
}

export function examDateClarification(prompt: string, context: StudyContext) {
  if (context.officialExamDatesAvailable) return null;

  const dateQuestion = /^(?:when (?:is|are)|what (?:date|day) (?:is|are)|what is the date of)\s+(?:(?:my|our|the|next|final)\s+)*(?:[\p{L}\d-]+\s+){0,4}exams?(?:\s+scheduled)?\s*[?.!]?$/iu;
  const question = prompt.trim().replace(/[՞։?!.,]/gu, "").trim();
  if (/^quand (?:est|a lieu|aura lieu) (?:mon|notre|le|l’)\s*examen(?: de [\p{L} -]+)?$/iu.test(question))
    return "Je n’ai pas de date confirmée pour cet examen. Consulte l’annonce officielle du cours.";
  if (/^когда (?:будет )?(?:(?:мой|наш) )?экзамен(?: по [\p{L} -]+)?$/iu.test(question))
    return "У меня нет подтверждённой даты этого экзамена. Проверь объявление по курсу.";
  if (/^երբ է (?:իմ |մեր )?(?:[\p{L}-]+ ){0,3}քննություն[ըսն]?$/iu.test(question))
    return "Այս քննության հաստատված ամսաթիվը չունեմ։ Ստուգիր դասընթացի պաշտոնական հայտարարությունը։";
  if (dateQuestion.test(prompt.trim())) {
    return "I don’t have a verified exam date for you. Check your official course announcement or ask your lecturer. If you share the date, I can help you plan your revision.";
  }
  return null;
}
