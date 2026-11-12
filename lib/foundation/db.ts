import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalDatabase = globalThis as typeof globalThis & { foundationDatabase?: PrismaClient };

// Builds a client for the shared "foundation" schema. Prisma 7 talks to PostgreSQL through
// a driver adapter, so the Prisma-only `schema` URL parameter is passed to the adapter instead.
export function createFoundationClient(databaseUrl: string | undefined = process.env.DATABASE_URL) {
  if (!databaseUrl) throw new Error("Foundation database unavailable");
  const url = new URL(databaseUrl);
  if (url.searchParams.get("schema") !== "foundation") throw new Error("Foundation database unavailable");
  url.searchParams.delete("schema");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }, { schema: "foundation" }) });
}

export function foundationDb() {
  return globalDatabase.foundationDatabase ??= createFoundationClient();
}
