export type Slot = { start: number; end: number };
export type StudyExam = { id: string; title: string; start: number; topics: { title: string; weight: number; confidence: number }[] };
export type StudyBlock = Slot & { examId: string; title: string; why: string; kind: "study" | "revision" };
const minute = 60_000;
const day = 1440 * minute;
const offset = 4 * 60 * minute;
const dayStart = (time: number) => Math.floor((time + offset) / day) * day - offset;
const duration = ({ start, end }: Slot) => (end - start) / minute;
const alphabetic = (left: string, right: string) => left.localeCompare(right, "en");

export function buildExamPlan(exams: StudyExam[], freeSlots: Slot[]) {
  const ordered = [...exams].sort((a, b) => a.start - b.start || alphabetic(a.title, b.title) || alphabetic(a.id, b.id));
  const topics = ordered.flatMap((exam) => exam.topics.map((topic) => {
    if (!Number.isInteger(topic.weight) || topic.weight < 1 || topic.weight > 5
      || !Number.isFinite(topic.confidence) || topic.confidence < 0 || topic.confidence > 1) throw new Error("Invalid topic settings.");
    return { exam, ...topic, remaining: Math.ceil((60 * topic.weight * (12 - 10 * topic.confidence)) / 100 - 1e-10) * 10 };
  }));

  const merged: Slot[] = [];
  const deadline = ordered.at(-1)?.start ?? 0;
  for (const slot of [...freeSlots].sort((a, b) => a.start - b.start)) {
    const start = Math.ceil(slot.start / minute) * minute;
    const end = Math.floor(Math.min(slot.end, deadline) / minute) * minute;
    if (end <= start) continue;
    const previous = merged.at(-1);
    if (previous && previous.end >= start) previous.end = Math.max(previous.end, end);
    else merged.push({ start, end });
  }
  const days = new Map<number, { slots: Slot[]; used: number }>();
  for (const slot of merged) {
    for (let start = slot.start; start < slot.end;) {
      const date = dayStart(start);
      const end = Math.min(slot.end, date + day);
      const entry = days.get(date) ?? { slots: [], used: 0 };
      entry.slots.push({ start, end });
      days.set(date, entry);
      start = end;
    }
  }
  const blocks: StudyBlock[] = [];
  const shortage = new Map(ordered.map((exam) => [exam.id, 0]));
  for (const exam of ordered) {
    const entry = days.get(dayStart(exam.start) - day);
    const slot = entry?.slots.find((value) => duration(value) >= 90);
    if (!entry || !slot || entry.used + 90 > 240) {
      shortage.set(exam.id, 90);
      continue;
    }
    blocks.push({ start: slot.start, end: slot.start + 90 * minute, examId: exam.id,
      title: exam.title, kind: "revision", why: "Final revision on the day before the exam." });
    slot.start += 90 * minute;
    entry.used += 90;
  }

  let heavyStreak = 0;
  let previousDate: number | undefined;
  for (const [date, entry] of days) {
    if (previousDate !== undefined && date - previousDate > day) heavyStreak = 0;
    const nextRevision = days.get(date + day)?.used ?? 0;
    const cap = heavyStreak >= 3 || (heavyStreak >= 2 && nextRevision > 90) ? 90 : 240;
    if (entry.used > cap) {
      for (let index = blocks.length - 1; index >= 0 && entry.used > cap; index--) {
        const block = blocks[index];
        if (block.kind !== "revision" || dayStart(block.start) !== date) continue;
        blocks.splice(index, 1);
        shortage.set(block.examId, shortage.get(block.examId)! + 90);
        entry.used -= 90;
      }
    }
    for (const slot of entry.slots) {
      while (duration(slot) >= 50 && entry.used + 50 <= cap) {
        const end = slot.start + 50 * minute;
        const capacity = new Map<string, number>();
        for (const exam of ordered) {
          if (exam.start < end) continue;
          let available = 0;
          for (const [future, window] of days) {
            if (future < date || future >= exam.start) continue;
            const count = window.slots.reduce((sum, gap) => sum + Math.max(0, Math.floor(
              (Math.min(gap.end, exam.start) - Math.max(gap.start, slot.start)) / (50 * minute),
            )), 0);
            available += 50 * Math.min(count, Math.floor(((future === date ? cap : 240) - window.used) / 50));
          }
          capacity.set(exam.id, available);
        }
        const eligible = topics.filter((topic) => topic.remaining > 0 && (capacity.get(topic.exam.id) ?? 0) > 0);
        eligible.sort((a, b) =>
          b.remaining * capacity.get(a.exam.id)! - a.remaining * capacity.get(b.exam.id)!
          || a.exam.start - b.exam.start || b.weight - a.weight || alphabetic(a.title, b.title));
        const next = eligible[0];
        if (!next) break;
        blocks.push({ start: slot.start, end, examId: next.exam.id, title: next.title, kind: "study",
          why: `Highest pressure: ${next.remaining} minutes needed, ${capacity.get(next.exam.id)} available before ${next.exam.title}.` });
        slot.start = end;
        entry.used += 50;
        next.remaining = Math.max(0, next.remaining - 50);
      }
    }
    heavyStreak = entry.used > 90 ? heavyStreak + 1 : 0;
    previousDate = date;
  }

  for (const topic of topics) shortage.set(topic.exam.id, shortage.get(topic.exam.id)! + topic.remaining);
  return { blocks: blocks.sort((a, b) => a.start - b.start),
    warnings: ordered.flatMap((exam) => {
      const minutes = shortage.get(exam.id)!;
      return minutes ? [{ examId: exam.id, title: exam.title, minutes }] : [];
    }) };
}
