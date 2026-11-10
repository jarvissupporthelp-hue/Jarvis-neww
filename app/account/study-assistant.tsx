"use client";

import { useState, type FormEvent } from "react";
import { MAX_STUDY_PROMPT } from "@/lib/study-chat-limits";

export function StudyAssistant({ getToken }: { getToken: () => Promise<string | undefined> }) {
  const [draft, setDraft] = useState("");
  const [consent, setConsent] = useState(false);
  const [answer, setAnswer] = useState("");
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !draft.trim() || !consent) return;
    setBusy(true);
    setError("");
    const prompt = draft.trim();

    try {
      const token = await getToken();
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, consent }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Could not get a reply. Your draft is still here.");
        return;
      }
      setQuestion(prompt);
      setAnswer(result.answer);
      setDraft("");
    } catch {
      setError("Could not get a reply. Your draft is still here.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="study-assistant" className="space-y-3 rounded-xl border border-[#afbeb3] bg-white p-4">
      <h2 className="text-xl font-semibold">Ask JARVIS</h2>
      <p className="text-sm">Your question is sent through Vercel AI Gateway to an external model provider. JARVIS does not attach your profile, courses, tasks, or calendar. Leave out personal or confidential information.</p>
      <form className="space-y-3" onSubmit={submit}>
        <label className="block">Study question
          <textarea className="w-full rounded border border-[#789181] p-2" rows={4}
            maxLength={MAX_STUDY_PROMPT} required disabled={busy} value={draft}
            onChange={(event) => setDraft(event.target.value)} />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={consent} disabled={busy}
            onChange={(event) => setConsent(event.target.checked)} />
          I agree to send the question to the AI provider.
        </label>
        <button className="rounded bg-[#1e3328] px-4 py-2 text-white disabled:opacity-50"
          disabled={busy || !consent || !draft.trim()}>{busy ? "Asking…" : "Ask JARVIS"}</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {answer && (
        <div aria-live="polite" className="space-y-2 rounded bg-[#eef3ee] p-3">
          <h3 className="font-semibold">JARVIS reply</h3>
          <p className="break-words text-sm">You asked: {question}</p>
          <p className="whitespace-pre-wrap break-words">{answer}</p>
        </div>
      )}
    </section>
  );
}
