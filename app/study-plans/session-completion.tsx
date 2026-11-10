"use client";

import { useState, type FormEvent } from "react";
import { getClient } from "@/lib/browser-supabase";

export function SessionCompletion({ sessionId, topic, onCompleted }: {
  sessionId: string; topic: string | null; onCompleted: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function complete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rating = new FormData(event.currentTarget).get("confidence");
    setBusy(true);
    setError("");
    try {
      const { error } = await getClient().rpc("complete_study_session", {
        p_session_id: sessionId, p_confidence: rating ? Number(rating) : null,
      });
      if (error) throw error;
      await onCompleted();
    } catch {
      setError("Could not update this session. Try again or reload to check its status.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={complete} className="mt-2 flex flex-wrap items-end gap-2">
      {topic && (
        <label className="text-sm">Confidence after {topic}
          <select name="confidence" defaultValue="" disabled={busy}
            className="block rounded border border-[#789181] bg-white p-1.5">
            <option value="">Skip rating</option>
            {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}/5</option>)}
          </select>
        </label>
      )}
      <button type="submit" disabled={busy} className="rounded bg-[#1e3328] px-3 py-1.5 text-sm text-white disabled:opacity-50">
        {busy ? "Saving…" : "Mark complete"}
      </button>
      {error && <p role="alert" className="w-full text-sm">{error}</p>}
    </form>
  );
}
