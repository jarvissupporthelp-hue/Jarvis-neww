import { getAccessToken } from "@/lib/browser-supabase";

export class ArenaRequestError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

export async function arenaRequest<T>(path: string, input?: unknown): Promise<T> {
  const token = await getAccessToken().catch(() => undefined);
  if (!token) throw new ArenaRequestError("signin");

  const response = await fetch(path, {
    method: input ? "POST" : "GET",
    headers: {
      Authorization: "Bearer " + token,
      ...(input ? { "Content-Type": "application/json" } : {}),
    },
    body: input ? JSON.stringify(input) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new ArenaRequestError(data?.error ?? "unavailable");
  return data as T;
}

export function arenaErrorCode(error: unknown) {
  return error instanceof ArenaRequestError ? error.code : "unavailable";
}
