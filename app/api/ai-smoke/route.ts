import { askLecturerAI, resolveProviderAccess } from "@/lib/study-ai";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== "preview") {
    return Response.json({ ok: false, error: "Preview only." }, { status: 404 });
  }

  const provider = resolveProviderAccess(request);
  if ("error" in provider) {
    return Response.json({ ok: false, error: provider.error }, { status: 503 });
  }

  const result = await askLecturerAI(
    "Explain the difference between an absolute path and a relative path in Unix in two short sentences, then give one example.",
    provider.credential,
    "Systèmes 1",
    "",
  );

  if (!result) {
    return Response.json({ ok: false, error: "The provider did not return an answer." }, { status: 502 });
  }
  if (typeof result !== "string") {
    return Response.json({ ok: false, providerStatus: result.errorStatus }, { status: 502 });
  }

  return Response.json({ ok: true, model: process.env.FREE_LLM_MODEL, answer: result });
}
