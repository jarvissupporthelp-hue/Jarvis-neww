"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/browser-supabase";

export type SignedInState = { status: "checking" } | { status: "out" } | { status: "in"; role: "student" | "lecturer" | "admin" };

// Resolves the signed-in role from the server (the same check every API route uses).
// Sessions live in the browser, so this gates what is shown, while the APIs enforce real access.
export function useSignedInRole(): SignedInState {
  const [state, setState] = useState<SignedInState>({ status: "checking" });
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) { if (active) setState({ status: "out" }); return; }
        const response = await fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } });
        const body = response.ok ? await response.json() : null;
        const role = body?.role;
        if (active) setState(role === "student" || role === "lecturer" || role === "admin" ? { status: "in", role } : { status: "out" });
      } catch {
        if (active) setState({ status: "out" });
      }
    })();
    return () => { active = false; };
  }, []);
  return state;
}
