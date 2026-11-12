import { foundationDb } from "@/lib/foundation/db";
import { requireRole } from "@/lib/foundation/roles";
import { borrow, CampusError, changeBooking, interval, reject, remind, renew, reserve, suggest } from "@/modules/campus/service";
import { minute } from "@/modules/campus/rules";

const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const strings = (value: unknown) => typeof value === "string" ? [...new Set(value.split(",").map((part) => part.trim()).filter(Boolean))] : [];
const failure = (error: unknown) => error instanceof CampusError
  ? Response.json({ error: error.message }, { status: 400 })
  : Response.json({ error: "Campus data is unavailable or the record no longer exists." }, { status: 503 });

export async function GET(request: Request) {
  const identity = await requireRole(request);
  if (!identity.ok) return Response.json({ error: "Sign in to access Campus Resources." }, { status: identity.status });
  try {
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const slot = params.start && params.end ? interval(params) : null;
    const db = foundationDb();
    const staff = identity.role !== "student";
    await remind(identity.userId);
    const [resources, reservations, loans, occupied, invites] = await Promise.all([
      db.campusResource.findMany({ orderBy: { title: "asc" } }),
      db.campusReservation.findMany({ where: { ownerId: identity.userId }, orderBy: { startAt: "desc" }, take: 100 }),
      db.campusLoan.findMany({ where: staff ? {} : { ownerId: identity.userId }, orderBy: { dueAt: "desc" }, take: 100 }),
      slot ? db.campusReservation.findMany({ distinct: ["resourceId", "unit"], where: {
        status: { in: ["pending", "confirmed"] }, startAt: { lt: new Date(slot.end) }, endAt: { gt: new Date(slot.start) },
      }, select: { resourceId: true, unit: true } }) : [],
      db.campusInvite.findMany({ where: { recipientId: identity.userId } }),
    ]);
    const invitations = await db.campusReservation.findMany({ where: {
      id: { in: invites.map(({ reservationId }) => reservationId) },
      status: { in: ["pending", "confirmed"] }, endAt: { gt: new Date() },
    }, select: { id: true, resourceId: true, startAt: true, endAt: true, status: true } });
    return Response.json({ resources, reservations, loans, occupied, invitations, staff });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  const identity = await requireRole(request);
  if (!identity.ok) return Response.json({ error: "Sign in to access Campus Resources." }, { status: identity.status });
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = String(body.id ?? "");
    const owner = identity.userId;
    const db = foundationDb();
    const teammates = strings(body.teammates).filter((member) => member !== owner);
    if (teammates.length > 20 || teammates.some((member) => !uuid.test(member))) reject("Enter up to 20 valid teammate account IDs.");
    if (["reserve-team", "team"].includes(String(body.action)) && teammates.length) {
      const count = await db.student.count({ where: { userId: { in: teammates }, deletedAt: null } });
      if (count !== teammates.length) reject("One or more teammates have no active student profile.");
    }
    switch (body.action) {
      case "reserve": case "reserve-team": {
        const slot = interval(body);
        if (body.action === "reserve-team") {
          const options = await suggest({ start: slot.start, end: slot.end }, teammates, (slot.end - slot.start) / minute,
            Number(body.size), strings(body.features), owner, id);
          if (!options.options.some((item) => item.resourceId === id && item.start === slot.start)) reject("This team option is no longer available.");
        }
        await reserve(owner, id, slot, String(body.purpose ?? ""), body.action === "reserve-team" ? teammates : []);
        break;
      }
      case "confirm": case "cancel": await changeBooking(owner, id, body.action === "cancel"); break;
      case "borrow": await borrow(owner, id); break;
      case "renew": await renew(owner, id); break;
      case "team": {
        const range = interval(body);
        range.start = Math.max(range.start, Date.now() + minute);
        const result = await suggest(range, teammates, Number(body.duration), Number(body.size), strings(body.features),
          owner);
        return Response.json(result);
      }
      case "return": case "staff-borrow": case "resource": {
        if (identity.role === "student") return Response.json({ error: "Staff access required." }, { status: 403 });
        if (body.action === "return") {
          await db.campusLoan.updateMany({ where: { id, returnedAt: null }, data: { returnedAt: new Date() } });
        } else if (body.action === "staff-borrow") {
          const borrower = String(body.borrower ?? "");
          if (!uuid.test(borrower) || !await db.student.findFirst({ where: { userId: borrower, deletedAt: null } })) reject("Enter an active student account ID.");
          await borrow(borrower, id);
        } else {
          const kind = String(body.kind);
          const title = String(body.title ?? "").trim();
          const building = String(body.building ?? "").trim();
          const [capacity, floor, position, opens, closes] = ["capacity", "floor", "position", "opens", "closes"].map((key) => Number(body[key]));
          if (!/^[a-z0-9-]{1,48}$/i.test(id) || !["room", "book", "equipment"].includes(kind)
            || !title || title.length > 120 || building.length > 80 || (kind === "room" && !building)
            || ![capacity, floor, position, opens, closes].every(Number.isInteger)
            || capacity < 1 || capacity > 500 || floor < 1 || floor > 20 || position < 0 || position > 30
            || opens < 0 || closes > 1440 || opens >= closes) reject("Check the resource details and opening hours.");
          const fields = { title, building, capacity, floor, position, opens, closes, features: strings(body.features), accessible: body.accessible === "on" };
          const previous = await db.campusResource.findUnique({ where: { id } });
          if (previous && previous.kind !== kind) reject("A resource’s type cannot be changed.");
          await db.campusResource.upsert({ where: { id }, create: { id, kind, ...fields }, update: fields });
        }
        break;
      }
      default: reject("Unknown campus action.");
    }
    return Response.json({ ok: true });
  } catch (error) { return failure(error); }
}
