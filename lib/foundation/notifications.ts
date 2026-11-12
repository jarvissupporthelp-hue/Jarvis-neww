import type { Prisma } from "@/lib/generated/prisma/client";
import { foundationDb } from "./db";

type NewNotification = {
  userId: string;
  type: string;
  payload: Prisma.InputJsonValue;
};

type DeliveryChannel = {
  create(notification: NewNotification): Promise<unknown>;
};

const inApp: DeliveryChannel = {
  create: (notification) => foundationDb().notification.create({ data: notification }),
};

export function createNotification(notification: NewNotification, channel = inApp) {
  return channel.create(notification);
}

export function listNotifications(userId: string) {
  return foundationDb().notification.findMany({
    where: { userId, deletedAt: null },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, type: true, payload: true, readAt: true },
    take: 20,
  });
}

export function markNotificationRead(userId: string, id: string) {
  return foundationDb().notification.updateMany({
    where: { id, userId, deletedAt: null, readAt: null },
    data: { readAt: new Date() },
  });
}
