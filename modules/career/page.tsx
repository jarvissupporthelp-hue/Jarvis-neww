import Link from "next/link";
import { CareerWorkspace } from "./workspace";

export function CareerPage({ initialJob }: { initialJob?: string }) {
  return <main className="mx-auto max-w-7xl px-5 pb-16 pt-8 sm:px-8">
    <Link href="/" className="text-sm font-semibold text-[#305f4a] underline underline-offset-4">JARVIS home</Link>
    <header className="mb-6 mt-4 rounded-3xl bg-[#183b30] p-7 text-white sm:p-12">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Career</h1>
      <p className="mt-3 max-w-xl text-base text-emerald-50 sm:text-lg">Explore opportunities, prepare your applications, and show what you can do.</p>
    </header>
    <CareerWorkspace initialJob={initialJob} />
  </main>;
}
