import Link from "next/link";
import { StudyAssistant } from "../account/study-assistant";

export default function ChatPage() {
  return (
    <main className="jarvis-chat-page mx-auto max-w-7xl space-y-5 px-3 py-5 sm:px-6 sm:py-7">
      <header className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6c826d]">UFAR · Academic workspace</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#1e3328] sm:text-4xl">AI Agent</h1>
          <p className="mt-1 text-sm text-[#607565]">Ask JARVIS about your courses or explore interactive study tools.</p>
        </div>
        <Link className="rounded-xl border border-[#bdd0bd] bg-white px-4 py-2 text-sm font-semibold text-[#315841] shadow-sm hover:bg-[#edf5e9]" href="/account">← Dashboard</Link>
      </header>
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--stroke)] bg-[var(--panel)] p-5" aria-labelledby="math-tool-heading">
        <div>
          <h2 id="math-tool-heading" className="text-lg font-semibold">Math visualizations</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Explore functions, integrals, matrices, vectors, and more in an interactive lab.</p>
        </div>
        <Link className="jarvis-primary-button inline-flex min-h-10 items-center px-4 py-2 no-underline" href="/chat/math-visualization">Open math lab →</Link>
      </section>
      <StudyAssistant />
    </main>
  );
}
