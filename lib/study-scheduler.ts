type Topic = { position: number; name: string; confidence: number };
type BusySlot = { date: string; start: string; end: string };

export type ScheduleInput = {
  today: string;
  currentTime: string;
  examDate: string;
  minutes: number;
  start: string;
  end: string;
  studyDays: number[];
  topics: Topic[];
  busy: BusySlot[];
};

export type ProposedSession = {
  topicPosition: number | null;
  title: string;
  date: string;
  start: string;
  end: string;
};

export type StudySchedule = {
  sessions: ProposedSession[];
  unscheduled: Topic[];
};

const breakMinutes = 10;
const dayMilliseconds = 86_400_000;

function secondsAt(time: string) {
  const [hours, minutes, seconds = 0] = time.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

function clock(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function dayNumber(date: string) {
  return Date.parse(date + "T00:00:00Z");
}

export function proposeStudySchedule(input: ScheduleInput): StudySchedule {
  const topics = [...input.topics].sort((a, b) => a.confidence - b.confidence || a.position - b.position);
  const queue = [
    ...topics.map((topic) => ({ position: topic.position as number | null, title: topic.name })),
    ...(topics.length ? [{ position: null, title: "Mixed review" }] : []),
  ];

  const byDay = new Map<string, { start: number; end: number }[]>();
  for (const block of input.busy) {
    const items = byDay.get(block.date) ?? [];
    // Round outward so a minute-aligned session cannot overlap a second-aligned event.
    items.push({ start: Math.floor(secondsAt(block.start) / 60), end: Math.ceil(secondsAt(block.end) / 60) });
    byDay.set(block.date, items);
  }

  const allowed = new Set(input.studyDays);
  const windowStart = Math.ceil(secondsAt(input.start) / 60);
  const windowEnd = Math.floor(secondsAt(input.end) / 60);
  const today = dayNumber(input.today);
  const exam = dayNumber(input.examDate);
  const sessions: ProposedSession[] = [];

  if (!allowed.size || input.minutes <= 0 || windowEnd - windowStart < input.minutes) {
    return { sessions, unscheduled: topics };
  }

  for (let day = today; day < exam && sessions.length < queue.length; day += dayMilliseconds) {
    const date = new Date(day);
    if (!allowed.has(date.getUTCDay() || 7)) continue;
    const label = date.toISOString().slice(0, 10);
    let cursor = day === today
      ? Math.max(windowStart, Math.ceil(secondsAt(input.currentTime) / 60))
      : windowStart;

    const blocks = (byDay.get(label) ?? []).sort((a, b) => a.start - b.start);
    for (const block of [...blocks, { start: windowEnd, end: windowEnd }]) {
      const gapEnd = Math.min(windowEnd, block.start);
      while (cursor + input.minutes <= gapEnd && sessions.length < queue.length) {
        const next = queue[sessions.length];
        sessions.push({
          topicPosition: next.position, title: next.title, date: label,
          start: clock(cursor), end: clock(cursor + input.minutes),
        });
        cursor += input.minutes + breakMinutes;
      }
      cursor = Math.max(cursor, block.end);
      if (cursor + input.minutes > windowEnd || sessions.length === queue.length) break;
    }
  }

  return { sessions, unscheduled: topics.slice(Math.min(sessions.length, topics.length)) };
}
