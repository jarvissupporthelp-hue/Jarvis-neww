export const minute = 60_000;
export const day = 1440 * minute;
const yerevan = 240 * minute;

export type Slot = { start: number; end: number };
export type Hours = { opens: number; closes: number };

export function overlaps(a: Slot, b: Slot) {
  return a.start < b.end && b.start < a.end;
}

export function openingSlots(range: Slot, hours: Hours): Slot[] {
  const result: Slot[] = [];
  for (let midnight = Math.floor((range.start + yerevan) / day) * day - yerevan; midnight < range.end; midnight += day) {
    const start = Math.max(range.start, midnight + hours.opens * minute);
    const end = Math.min(range.end, midnight + hours.closes * minute);
    if (start < end) result.push({ start, end });
  }
  return result;
}

export function bookingAllowed(slot: Slot, hours: Hours, now: number, maxMinutes: number) {
  return slot.start > now && slot.end > slot.start && slot.end - slot.start <= maxMinutes * minute
    && openingSlots(slot, hours).some(({ start, end }) => start === slot.start && end === slot.end);
}

export function canRenew(renewals: number, returnedAt: unknown) {
  return !returnedAt && renewals < 2;
}

export function teamOptions(
  range: Slot, schedules: (Slot[] | null)[], rooms: (Hours & { id: string; capacity: number })[],
  busy: (Slot & { resourceId: string })[], duration: number, classEdges: number[],
) {
  let common = [range];
  for (const schedule of schedules) {
    if (schedule === null) continue;
    common = common.flatMap((left) => schedule.map((right) => ({
      start: Math.max(left.start, right.start), end: Math.min(left.end, right.end),
    })).filter(({ start, end }) => end - start >= duration));
  }
  const candidates = rooms.flatMap((room) => common.flatMap((window) => openingSlots(window, room).flatMap((open) => {
    const conflicts = busy.filter((item) => item.resourceId === room.id && overlaps(item, open));
    const starts = new Set([open.start, ...conflicts.map(({ end }) => end),
      ...classEdges.flatMap((edge) => [edge, edge - duration])]);
    return [...starts].flatMap((start) => {
      const slot = { start, end: start + duration };
      if (start < open.start || slot.end > open.end || conflicts.some((item) => overlaps(slot, item))) return [];
      return [{ ...slot, resourceId: room.id, capacity: room.capacity,
        nextToClass: classEdges.includes(start) || classEdges.includes(slot.end) }];
    });
  })));
  return {
    reason: common.some(({ start, end }) => end - start >= duration) ? "No suitable room is available." : "No common slot.",
    missingSchedules: schedules.filter((schedule) => schedule === null).length,
    options: candidates.sort((a, b) => Number(b.nextToClass) - Number(a.nextToClass)
      || a.start - b.start || a.capacity - b.capacity || a.resourceId.localeCompare(b.resourceId)).slice(0, 5),
  };
}
