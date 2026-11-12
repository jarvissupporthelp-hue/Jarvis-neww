import { PrismaClient } from "@prisma/client";

const globalDatabase = globalThis as typeof globalThis & { foundationDatabase?: PrismaClient };

export function foundationDb() {
  const url = process.env.DATABASE_URL;
  if (!url || new URL(url).searchParams.get("schema") !== "foundation") {
    throw new Error("Foundation database unavailable");
  }
  return globalDatabase.foundationDatabase ??= new PrismaClient();
}
