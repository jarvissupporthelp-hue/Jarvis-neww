import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { loadEnvFile } from "node:process";

try { loadEnvFile(); } catch (error) { if (error.code !== "ENOENT") throw error; }

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || new URL(databaseUrl).searchParams.get("schema") !== "foundation") {
  throw new Error("Set DATABASE_URL to the intended database with schema=foundation.");
}
const require = createRequire(import.meta.url);
const result = spawnSync(process.execPath, [require.resolve("prisma"), "migrate", "deploy"], { stdio: "inherit" });
process.exitCode = result.status ?? 1;
