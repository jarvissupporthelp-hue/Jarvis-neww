import Link from "next/link";
import { StudyPlanWorkspace } from "./workspace";

export default function StudyPlansPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-8 sm:px-6">
      <Link className="font-semibold underline" href="/account">Back to dashboard</Link>
      <h1 className="text-3xl font-semibold">Study Plans</h1>
      <p>Set an exam goal, rate your topics, and save your availability for scheduling.</p>
      <StudyPlanWorkspace />
    </main>
  );
}
