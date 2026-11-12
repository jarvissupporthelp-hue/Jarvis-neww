import Link from "next/link";
import { StudyAssistant } from "../account/study-assistant";

export default function ChatPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-5 px-3 py-5 sm:px-6 sm:py-7">
      <header className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6c826d]">UFAR · Academic workspace</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#1e3328] sm:text-4xl">Ask JARVIS</h1>
          <p className="mt-1 text-sm text-[#607565]">A calm space to understand your courses and prepare for exams.</p>
        </div>
        <Link className="rounded-xl border border-[#bdd0bd] bg-white px-4 py-2 text-sm font-semibold text-[#315841] shadow-sm hover:bg-[#edf5e9]" href="/account">← Dashboard</Link>
      </header>
      <StudyAssistant />
    </main>
  );
}
