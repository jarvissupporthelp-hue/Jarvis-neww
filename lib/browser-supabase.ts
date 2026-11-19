import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;
let callback: { flow: "invite" | "recovery"; validFragment: boolean } | undefined;

export function readPasswordCallback(href: string) {
  const location = new URL(href);
  const flow = location.searchParams.get("flow");
  if (location.pathname !== "/account" || (flow !== "invite" && flow !== "recovery")) return undefined;
  const fragment = new URLSearchParams(location.hash.slice(1));
  return {
    flow,
    validFragment: fragment.get("type") === flow && Boolean(fragment.get("access_token") && fragment.get("refresh_token"))
      && !fragment.has("error") && !fragment.has("error_code") && !fragment.has("error_description"),
  } as const;
}

export function passwordCallback() {
  return callback;
}

export function clearPasswordCallback() {
  callback = undefined;
}

export function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Authentication is not configured.");
  if (!client) {
    if (typeof window !== "undefined") callback = readPasswordCallback(window.location.href);
    client = createClient(url, key);
  }
  return client;
}

export async function getAccessToken() {
  const { data } = await getClient().auth.getSession();
  return data.session?.access_token;
}
