// Minimal stand-in for Supabase Auth and PostgREST, used only by the role-matrix test.
// Tokens map to identities; the memberships endpoint answers like the real table would.
import { createServer } from "node:http";

export const identities = {
  "student-token": { id: "10000000-0000-4000-8000-000000000001", role: "student", active: true },
  "lecturer-token": { id: "10000000-0000-4000-8000-000000000002", role: "lecturer", active: true },
  "admin-token": { id: "10000000-0000-4000-8000-000000000003", role: "admin", active: true },
  "disabled-token": { id: "10000000-0000-4000-8000-000000000004", role: "student", active: false },
};

export function startMockSupabase(port) {
  const server = createServer((request, response) => {
    const url = new URL(request.url, "http://mock");
    const token = (request.headers.authorization ?? "").replace(/^Bearer /i, "");
    const identity = identities[token];
    const send = (status, body) => {
      response.writeHead(status, { "content-type": "application/json" });
      response.end(JSON.stringify(body));
    };
    if (url.pathname === "/auth/v1/user") return identity ? send(200, { id: identity.id }) : send(401, { message: "invalid JWT" });
    if (url.pathname === "/rest/v1/memberships") {
      const wanted = url.searchParams.get("user_id")?.replace(/^eq\./, "");
      const match = Object.values(identities).find((item) => item.id === wanted && item.active);
      return send(200, match ? [{ role: match.role }] : []);
    }
    if (url.pathname === "/rest/v1/profiles") return send(200, (request.headers.accept ?? "").includes("pgrst.object") ? { display_name: "Role Test" } : [{ display_name: "Role Test" }]);
    if (url.pathname.startsWith("/rest/v1/rpc/")) return send(200, null);
    return send(200, []);
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}
