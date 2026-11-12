import Link from "next/link";
import { CampusWorkspace } from "@/modules/campus/workspace";

export default function CampusPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <Link href="/" className="text-sm font-semibold text-[#426852] underline underline-offset-4">JARVIS home</Link>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">Campus Resources</h1>
      <p className="mt-3 text-slate-600">Find a study room, borrow a book, or plan a team session.</p>
      <CampusWorkspace />
    </main>
  );
}
