import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { bookingAllowed, canRenew, day, minute, teamOptions } from "../modules/campus/rules.ts";

const time = (hour, minutes = 0) => Date.UTC(2099, 0, 1, hour - 4, minutes);
const slot = (start, end) => ({ start: time(start), end: time(end) });
const hours = { opens: 480, closes: 1200 };
const rooms = [{ ...hours, id: "small", capacity: 6 }, { ...hours, id: "large", capacity: 12 }];

test("campus booking respects opening hours, future starts and configurable duration", () => {
  assert.equal(bookingAllowed(slot(8, 11), hours, time(7), 180), true);
  assert.equal(bookingAllowed(slot(7, 9), hours, time(6), 180), false);
  assert.equal(bookingAllowed(slot(18, 21), hours, time(7), 180), false);
  assert.equal(bookingAllowed(slot(8, 11), hours, time(8), 180), false);
  assert.equal(bookingAllowed(slot(8, 11), hours, time(7), 179), false);
});

test("loans can be renewed twice while outstanding", () => {
  assert.equal(canRenew(0, null), true);
  assert.equal(canRenew(1, null), true);
  assert.equal(canRenew(2, null), false);
  assert.equal(canRenew(0, new Date()), false);
});

test("team booking prefers adjacent classes, then start and room capacity", () => {
  const result = teamOptions(slot(8, 18), [[slot(9, 17)], [slot(10, 16)]], rooms, [], 60 * minute, [time(14)]);
  assert.deepEqual(result.options.slice(0, 2).map(({ resourceId, start }) => [resourceId, start]),
    [["small", time(13)], ["large", time(13)]]);
  assert.equal(result.options.length, 5);
});

test("team booking distinguishes schedule conflict from unavailable rooms", () => {
  const range = slot(8, 18);
  const conflict = teamOptions(range, [[slot(9, 11)], [slot(11, 13)]], rooms, [], 60 * minute, []);
  assert.equal(conflict.reason, "No common slot.");
  const busy = rooms.map(({ id }) => ({ ...range, resourceId: id }));
  const unavailable = teamOptions(range, [[slot(9, 11)], null], rooms, busy, 60 * minute, []);
  assert.equal(unavailable.reason, "No suitable room is available.");
  const missing = teamOptions(range, [[slot(9, 11)], null], rooms, [], 60 * minute, []);
  assert.equal(missing.missingSchedules, 1);
  assert.equal(missing.options[0].start, time(9));
});

test("PostgreSQL booking concurrency, active limits, renewals and reminder idempotency", {
  skip: !process.env.CAMPUS_TEST_DATABASE_URL && "Set CAMPUS_TEST_DATABASE_URL to a migrated test database.",
}, async () => {
  process.env.DATABASE_URL = process.env.CAMPUS_TEST_DATABASE_URL;
  const { foundationDb } = await import("../lib/foundation/db.ts");
  const { borrow, remind, renew, reserve } = await import("../modules/campus/service.ts");
  const db = foundationDb();
  const room = randomUUID(), book = randomUUID();
  const owners = Array.from({ length: 5 }, () => randomUUID());
  const range = slot(10, 11);
  try {
    await db.campusResource.createMany({ data: [
      { id: room, kind: "room", title: "Concurrency room", features: [] },
      { id: book, kind: "book", title: "Reminder test book", features: [] },
    ] });
    const races = await Promise.allSettled(owners.map((owner) => reserve(owner, room, range, "Study")));
    assert.equal(races.filter(({ status }) => status === "fulfilled").length, 1);
    await assert.rejects(db.campusReservation.create({ data: {
      ownerId: owners[0], resourceId: room, unit: 1, startAt: new Date(range.start), endAt: new Date(range.end),
      status: "confirmed", purpose: "Direct conflict",
    } }));
    await reserve(owners[0], room, slot(11, 12), "Study");
    const winner = await db.campusReservation.findFirstOrThrow({ where: { resourceId: room, startAt: new Date(range.start) } });
    if (winner.ownerId !== owners[0]) await reserve(owners[0], room, slot(12, 13), "Study");
    await assert.rejects(reserve(owners[0], room, slot(13, 14), "Study"), /active booking limit/);

    await db.user.create({ data: { id: owners[0], role: "student" } });
    const loan = await borrow(owners[0], book);
    await renew(owners[0], loan.id);
    await renew(owners[0], loan.id);
    await assert.rejects(renew(owners[0], loan.id), /cannot be renewed/);
    const now = new Date();
    await db.campusLoan.update({ where: { id: loan.id }, data: { dueAt: new Date(+now + day) } });
    await Promise.all([remind(owners[0], now), remind(owners[0], now)]);
    assert.equal(await db.notification.count({ where: { userId: owners[0], type: "campus_loan_due" } }), 1);
  } finally {
    await db.notification.deleteMany({ where: { userId: owners[0] } });
    await db.user.deleteMany({ where: { id: owners[0] } });
    await db.campusLoan.deleteMany({ where: { resourceId: book } });
    await db.campusReservation.deleteMany({ where: { resourceId: room } });
    await db.campusResource.deleteMany({ where: { id: { in: [room, book] } } });
    await db.$disconnect();
  }
});
