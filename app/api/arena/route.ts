import { createClient } from "@supabase/supabase-js";
import { authorize } from "@/lib/authorization";
import { arenaGames } from "@/modules/arena/catalog";
import { gameDifficulties } from "@/modules/arena/game-types";
import { verifiesArenaClear } from "@/modules/arena/verify";

const roles = ["student", "lecturer", "admin"] as const;
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const maxBodyBytes = 8192;

function reply(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function arenaClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return null;
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(8000) }) },
  });
}

async function readBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = "";
  try {
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
      bytes += chunk.value.byteLength;
      if (bytes > maxBodyBytes) {
        await reader.cancel();
        return null;
      }
      body += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(body + decoder.decode());
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export async function GET(request: Request) {
  const caller = await authorize(request, roles);
  if (!caller.ok) return reply({ error: "access" }, caller.status);
  const db = arenaClient();
  if (!db) return reply({ error: "unavailable" }, 503);

  const query = new URL(request.url).searchParams;
  const game = query.get("game");
  if (game !== null && !arenaGames.some(({ id }) => id === game)) return reply({ error: "invalid" }, 400);
  const { data, error } = await db.rpc("arena_rankings", {
    p_user: caller.userId, p_weekly: query.get("period") === "week", p_game: game,
  });
  if (error) return reply({ error: "unavailable" }, error.code === "42501" ? 403 : 503);
  return reply({ ...data, canPlayRanked: caller.role === "student" });
}

export async function POST(request: Request) {
  const caller = await authorize(request, ["student"]);
  if (!caller.ok) return reply({ error: "access" }, caller.status);
  const db = arenaClient();
  if (!db) return reply({ error: "unavailable" }, 503);

  const input = await readBody(request);
  if (input?.action === "start") {
    const game = arenaGames.find(({ id }) => id === input.game);
    const difficulty = gameDifficulties.find((tier) => tier === input.difficulty);
    if (!game || !difficulty) return reply({ error: "invalid" }, 400);
    const { data, error } = await db.rpc("arena_start_ranked_run", {
      p_user: caller.userId, p_game: game.id, p_difficulty: difficulty,
    });
    if (error || !data) return reply({ error: "unavailable" }, error?.code === "42501" ? 403 : 503);
    return reply({ sessionId: data });
  }

  if (input?.action !== "finish" || typeof input.sessionId !== "string" || !uuid.test(input.sessionId)) {
    return reply({ error: "invalid" }, 400);
  }

  const { data: session, error: lookupError } = await db.from("arena_ranked_runs")
    .select("game_slug,difficulty,finished_at")
    .eq("student_id", caller.userId).eq("id", input.sessionId).maybeSingle();
  if (lookupError) return reply({ error: "unavailable" }, 503);
  if (!session) return reply({ error: "missing" }, 404);

  const game = arenaGames.find(({ id }) => id === session.game_slug);
  const difficulty = gameDifficulties.find((tier) => tier === session.difficulty);
  if (!game || !difficulty) return reply({ error: "unavailable" }, 503);
  if (!session.finished_at && !verifiesArenaClear(game.id, difficulty, input.proof)) {
    return reply({ error: "proof" }, 422);
  }

  const { data, error } = await db.rpc("arena_finish_ranked_run", { p_user: caller.userId, p_run: input.sessionId });
  if (error) return reply({ error: "unavailable" }, error.code === "42501" ? 403 : 503);
  if (!data) return reply({ error: "expired" }, 409);
  return reply(data);
}
