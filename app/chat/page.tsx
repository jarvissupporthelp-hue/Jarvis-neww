import Link from "next/link";
import { StudyAssistant } from "../account/study-assistant";

export default function ChatPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-8 sm:px-6">
      <Link className="font-semibold underline" href="/account">Back to dashboard</Link>
      <h1 className="text-3xl font-semibold">Ask JARVIS</h1>
      <StudyAssistant />
    </main>
  );
}
