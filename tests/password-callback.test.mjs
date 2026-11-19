import assert from "node:assert/strict";
import test from "node:test";
import { readPasswordCallback } from "../lib/browser-supabase.ts";

test("password callbacks require the intended account URL and a complete, matching Auth fragment", () => {
  const account = "https://example.test/account";
  const invite = "type=invite&access_token=fixture-access&refresh_token=fixture-refresh";
  assert.deepEqual(readPasswordCallback(account + "?flow=invite#" + invite), { flow: "invite", validFragment: true });
  assert.deepEqual(readPasswordCallback(account + "?flow=recovery#" + invite), { flow: "recovery", validFragment: false });
  assert.deepEqual(readPasswordCallback(account + "?flow=invite#type=invite&access_token=fixture"), { flow: "invite", validFragment: false });
  assert.deepEqual(readPasswordCallback(account + "?flow=invite#" + invite + "&error_code=otp_expired"), { flow: "invite", validFragment: false });
  assert.equal(readPasswordCallback("https://example.test/chat?flow=invite#" + invite), undefined);
  assert.equal(readPasswordCallback(account + "#" + invite), undefined);
});
