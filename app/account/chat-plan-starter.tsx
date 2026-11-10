"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { studyPlanHandoffKey, type StudyPlanHandoff } from "@/lib/study-plan-handoff";

export function ChatPlanStarter() {
  const router = useRouter();
  const [error, setError] = useState("");

  function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const draft: StudyPlanHandoff = {
      topic: String(values.get("topic") ?? "").trim(),
      examDate: String(values.get("examDate") ?? ""),
      minutes: Number(values.get("minutes")),
    };
    if (!draft.topic) {
      setError("Enter a study topic.");
      return;
    }
    try {
      sessionStorage.setItem(studyPlanHandoffKey, JSON.stringify(draft));
      router.push("/study-plans");
    } catch {
      setError("Could not transfer the draft in this browser. Open Study Plans from the dashboard.");
    }
  }

  return (
    <details className="rounded bg-[#eef3ee] p-3">
      <summary className="cursor-pointer font-semibold">Plan for an exam</summary>
      <p className="mt-2 text-sm">Use a topic or session length suggested in chat, or enter your own. Review the full plan on the next page.</p>
      <form className="mt-2 space-y-2" onSubmit={start}>
        <label className="block">First topic<input name="topic" className="w-full rounded border p-2" maxLength={120} required /></label>
        <label className="block">Exam date<input name="examDate" type="date" className="w-full rounded border p-2" /></label>
        <label className="block">Minutes per session<input name="minutes" type="number" min={15} max={180} defaultValue={45} className="w-full rounded border p-2" required /></label>
        <button className="rounded bg-[#1e3328] px-4 py-2 text-white">Continue to Study Plans</button>
        {error && <p role="alert">{error}</p>}
      </form>
    </details>
  );
}
