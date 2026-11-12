import type { Prisma } from "@prisma/client";
import { foundationDb } from "../../lib/foundation/db.ts";
import { demoStudentId, getFreeTimeSlots, getTimetable } from "../academics/services.ts";
import { bookingAllowed, canRenew, day, minute, teamOptions, type Slot } from "./rules.ts";

const active = ["pending", "confirmed"];
const limit = (key: string, fallback: number) => {
  const value = Number(process.env[key]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
};
const maxMinutes = () => limit("CAMPUS_MAX_BOOKING_MINUTES", 180);
export class CampusError extends Error {}
export const reject = (message: string): never => { throw new CampusError(message); };

export function interval(input: Record<string, unknown>): Slot {
  const start = Date.parse(String(input.start ?? ""));
  const end = Date.parse(String(input.end ?? ""));
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end || end - start > 31 * day) {
    reject("Choose a valid date range of up to 31 days.");
  }
  return { start, end };
}

const overlapWhere = (slot: Slot) => ({
  status: { in: active }, startAt: { lt: new Date(slot.end) }, endAt: { gt: new Date(slot.start) },
});

async function lock(tx: Prisma.TransactionClient, key: string) {
  await tx.$queryRaw`SELECT 1::int AS locked FROM pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
}

export async function reserve(ownerId: string, resourceId: string, slot: Slot, purpose: string, teammates: string[] = []) {
  return foundationDb().$transaction(async (tx) => {
    await lock(tx, `campus-owner:${ownerId}`);
    await lock(tx, `campus-resource:${resourceId}`);
    const resource = await tx.campusResource.findUniqueOrThrow({ where: { id: resourceId } });
    if (resource.kind === "book" || !purpose.trim() || purpose.length > 250) reject("Enter a valid purpose and resource.");
    const now = Date.now();
    if (!bookingAllowed(slot, resource, now, maxMinutes())) reject("Choose a future time inside opening hours and within the booking length limit.");
    const count = await tx.campusReservation.count({ where: { ownerId, status: { in: active }, endAt: { gt: new Date(now) } } });
    if (count >= limit("CAMPUS_MAX_ACTIVE_BOOKINGS", 2)) reject("You have reached the active booking limit.");
    const conflicts = await tx.campusReservation.findMany({ where: { resourceId, ...overlapWhere(slot) }, select: { unit: true } });
    const used = new Set(conflicts.map(({ unit }) => unit));
    const units = resource.kind === "room" ? 1 : resource.capacity;
    const unit = Array.from({ length: units }, (_, index) => index + 1).find((index) => !used.has(index))
      ?? reject("This resource is already booked for that time.");
    const booking = await tx.campusReservation.create({ data: {
      ownerId, resourceId, unit, startAt: new Date(slot.start), endAt: new Date(slot.end), purpose,
      status: "pending",
    } });
    if (teammates.length) await tx.campusInvite.createMany({
      data: teammates.map((recipientId) => ({ reservationId: booking.id, recipientId })),
    });
    return booking;
  });
}

export async function changeBooking(ownerId: string, id: string, cancel: boolean) {
  const now = new Date();
  const result = await foundationDb().campusReservation.updateMany({
    where: { id, ownerId, status: { in: cancel ? active : ["pending"] }, startAt: { gt: now } },
    data: { status: cancel ? "cancelled" : "confirmed" },
  });
  if (!result.count) reject("This booking can no longer be changed.");
}

export async function borrow(ownerId: string, resourceId: string) {
  return foundationDb().$transaction(async (tx) => {
    await lock(tx, `campus-resource:${resourceId}`);
    const book = await tx.campusResource.findUniqueOrThrow({ where: { id: resourceId } });
    const outstanding = await tx.campusLoan.count({ where: { resourceId, returnedAt: null } });
    if (book.kind !== "book" || outstanding >= book.capacity) reject("No copies are currently available.");
    return tx.campusLoan.create({ data: { ownerId, resourceId, dueAt: new Date(Date.now() + 14 * day) } });
  });
}

export async function renew(ownerId: string, id: string) {
  return foundationDb().$transaction(async (tx) => {
    const loan = await tx.campusLoan.findFirstOrThrow({ where: { id, ownerId } });
    if (!canRenew(loan.renewals, loan.returnedAt)) reject("This loan cannot be renewed again.");
    const result = await tx.campusLoan.updateMany({ where: { id, ownerId, renewals: loan.renewals, returnedAt: null },
      data: { renewals: { increment: 1 }, dueAt: new Date(Math.max(loan.dueAt.getTime(), Date.now()) + 14 * day) },
    });
    if (!result.count) reject("The loan changed. Refresh and try again.");
  });
}

export async function remind(ownerId: string, now = new Date()) {
  return foundationDb().$queryRaw<{ count: number }[]>`SELECT foundation.campus_send_loan_reminders(${now}, ${ownerId}::uuid) AS count`;
}

export async function suggest(range: Slot, ids: string[], duration: number, size: number, features: string[], ownerId: string, roomId?: string) {
  if (!Number.isInteger(duration) || duration < 15 || duration > maxMinutes() || !Number.isInteger(size) || size < ids.length + 1 || size > 100) {
    reject("Check the duration and team size.");
  }
  const from = new Date(range.start), to = new Date(range.end);
  const members = [ownerId, ...ids];
  const hasSchedule = (id: string) => id === process.env.CAMPUS_DEMO_STUDENT_USER_ID;
  const schedules = members.map((id) => hasSchedule(id) ? getFreeTimeSlots(demoStudentId, from, to, duration)
    .map(({ start, end }) => ({ start: +start, end: +end })) : null);
  const classEdges = members.filter(hasSchedule).flatMap(() => getTimetable(demoStudentId, from, to)
    .filter(({ status }) => status !== "Cancelled").flatMap(({ start, end }) => [Date.parse(start), Date.parse(end)]));
  const db = foundationDb();
  const rooms = await db.campusResource.findMany({ where: { id: roomId, kind: "room", capacity: { gte: size }, features: { hasEvery: features } } });
  const reservations = await db.campusReservation.findMany({ where: { ...overlapWhere(range), resourceId: { in: rooms.map(({ id }) => id) } } });
  return teamOptions(range, schedules, rooms, reservations.map(({ resourceId, startAt, endAt }) => ({
    resourceId, start: +startAt, end: +endAt,
  })), duration * minute, classEdges);
}
