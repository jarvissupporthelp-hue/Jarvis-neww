try {
  const url = new URL("/healthz", process.argv[2]);
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
  if ((await response.json())?.status !== "ok") throw new Error("unexpected health response");
  console.log(`JARVIS healthy at ${url.origin}`);
} catch (error) {
  console.error(`JARVIS health check failed: ${error.message}`);
  process.exitCode = 1;
}
