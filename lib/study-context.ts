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
  officialDeadlinesAvailable: boolean;
  officialExamDatesAvailable: boolean;
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
