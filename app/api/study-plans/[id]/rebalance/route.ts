import { authorize } from "@/lib/authorization";
import { createStudyClient } from "@/lib/study-context";
import { proposeRebalance, type RebalanceInput } from "@/lib/study-rebalance";

type Route = { params: Promise<{ id: string }> };

function reply(body: object, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function access(request: Request, { params }: Route) {
  const caller = await authorize(request, ["student"]);
  if (!caller.ok) return reply({ error: "Active student access required." }, caller.status);
  const { id } = await params;
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
    return reply({ error: "Study plan not found." }, 404);
  }
  const token = request.headers.get("authorization");
  const client = token && createStudyClient(token);
  if (!client) return reply({ error: "Rebalance unavailable." }, 503);
  return { client, id };
}

async function preview(result: Exclude<Awaited<ReturnType<typeof access>>, Response>, practiceTopics?: string[]) {
  const { data, error } = await result.client.rpc("study_rebalance_inputs", { p_plan_id: result.id });
  if (error?.code === "42501") return reply({ error: "Active student access required." }, 403);
  if (error) return reply({ error: "Could not load the latest availability." }, 503);
  if (!data) return reply({ error: "Study plan not found." }, 404);
  return reply(proposeRebalance(data as unknown as RebalanceInput, practiceTopics));
}

export async function GET(request: Request, route: Route) {
  const result = await access(request, route);
  return result instanceof Response ? result : preview(result);
}

export async function POST(request: Request, route: Route) {
  const result = await access(request, route);
  if (result instanceof Response) return result;
  const input = await request.json().catch(() => null);
  if (input?.confirmed !== true && Array.isArray(input?.practiceTopics)
    && input.practiceTopics.length > 0 && input.practiceTopics.length <= 10
    && input.practiceTopics.every((topic: unknown) => typeof topic === "string" && topic.length <= 120)) {
    return preview(result, input.practiceTopics);
  }
  if (input?.confirmed !== true || !Array.isArray(input.moves) || !input.moves.length || input.moves.length > 11) {
    return reply({ error: "Review and confirm a rebalance preview." }, 400);
  }
  const { data, error } = await result.client.rpc("apply_study_rebalance", {
    p_plan_id: result.id, p_moves: input.moves,
  });
  if (!error) return reply({ saved: data });
  if (error.code === "23P01" || error.code === "23505") {
    return reply({ error: "Availability or progress changed. Generate a fresh rebalance preview." }, 409);
  }
  if (error.code === "42501") return reply({ error: "Active student access required." }, 403);
  if (error.code === "P0002") return reply({ error: "Study plan not found." }, 404);
  if (error.code.startsWith("22")) return reply({ error: "Invalid rebalance preview." }, 400);
  return reply({ error: "Could not apply the rebalance. Try again shortly." }, 503);
}
