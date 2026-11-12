import { defineConfig } from "prisma/config";

// Prisma 7 no longer reads the datasource URL from schema.prisma or loads .env files.
// `prisma generate` does not need a database, so a missing URL must not fail it.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
