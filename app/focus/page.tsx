import Link from "next/link";
import { FocusWorkspace } from "./workspace";

export default function FocusPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-8 sm:px-6">
      <Link href="/account" className="font-semibold underline">Back to dashboard</Link>
      <h1 className="text-3xl font-semibold">Pomodoro focus timer</h1>
      <p>Set a focus block or take a short break. Completed focus blocks are saved to your account.</p>
      <FocusWorkspace />
    </main>
  );
}
