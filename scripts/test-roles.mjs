// Starts a mock Supabase and the app, then runs the per-role API matrix against them.
import { spawn } from "node:child_process";
import { startMockSupabase } from "../tests/roles/mock-supabase.mjs";

const mockPort = 54329;
const appPort = Number(process.env.JARVIS_ROLE_TEST_PORT ?? 3107);
const mock = await startMockSupabase(mockPort);
const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${mockPort}`,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "role-test-key",
  NEXT_TELEMETRY_DISABLED: "1",
};
const app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", String(appPort)], { env, stdio: "ignore" });
const origin = `http://127.0.0.1:${appPort}`;
let code = 1;
try {
  for (let i = 0; i < 60; i++) {
    if (await fetch(origin + "/healthz").then((r) => r.ok, () => false)) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const run = spawn(process.execPath, ["--test", "tests/roles/roles.test.mjs"], { env: { ...env, JARVIS_TEST_ORIGIN: origin }, stdio: "inherit" });
  code = await new Promise((resolve) => run.on("exit", resolve));
} finally {
  app.kill();
  mock.close();
}
process.exit(code ?? 1);
