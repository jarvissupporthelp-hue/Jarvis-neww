import { proposeStudySchedule, type ScheduleInput } from "./study-scheduler";

type SavedSession = {
  id: string; topicPosition: number | null; title: string;
  date: string; start: string; end: string; movable: boolean;
};

export type RebalanceInput = ScheduleInput & { saved: SavedSession[] };
export type RebalanceMove = {
  id: string; title: string; oldDate: string; oldStart: string; oldEnd: string;
  date: string; start: string; end: string;
};

function padTime(value: string, offset: number) {
  const [hours, minutes, seconds = 0] = value.split(":").map(Number);
  const total = Math.min(86_400, Math.max(0, hours * 3600 + minutes * 60 + seconds + offset * 60));
  return [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60]
    .map((part) => String(part).padStart(2, "0")).join(":");
}

export function proposeRebalance(input: RebalanceInput, practiceTopics: string[] = []) {
  const movable = new Map(input.saved.filter((item) => item.movable).map((item) => [item.topicPosition, item]));
  const fixed = input.saved.filter((item) => !item.movable).map((item) => ({
    date: item.date, start: padTime(item.start, -10), end: padTime(item.end, 10),
  }));
  const priority = new Set(practiceTopics.map((topic) => topic.trim().toLowerCase()));
  const proposal = proposeStudySchedule({
    ...input,
    topics: input.topics.filter((topic) => movable.has(topic.position)).map((topic) =>
      priority.has(topic.name.trim().toLowerCase()) ? { ...topic, confidence: 0 } : topic),
    includeReview: movable.has(null),
    busy: [...input.busy, ...fixed],
  });

  const moves: RebalanceMove[] = [];
  for (const item of proposal.sessions) {
    const previous = movable.get(item.topicPosition);
    if (!previous) continue;
    moves.push({
      id: previous.id, title: previous.title, oldDate: previous.date, oldStart: previous.start, oldEnd: previous.end,
      date: item.date, start: item.start, end: item.end,
    });
    movable.delete(item.topicPosition);
  }
  return { moves, unplaced: Array.from(movable.values(), (item) => item.title) };
}
